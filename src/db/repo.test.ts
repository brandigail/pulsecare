import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { EXERCISE_LIBRARY } from '../data/exercises'
import { buildDemo } from '../lib/demo'
import { emptyLog } from '../lib/nutrition'
import { activeSession, addExercise, DEFAULT_SETTINGS, deleteRoutine, deleteSet, discardSession, ensureExercises, finishSession, getLog, listExercises, listLogs, listRoutines, listSessions, listSets, loadSettings, logSet, replaceHistory, saveLog, saveRoutine, saveSettings, seedIfEmpty, startSession } from './repo'
import { PulseCareDb } from './schema'

let database: PulseCareDb
let counter = 0

beforeEach(async () => {
  database = new PulseCareDb(`test-${counter++}`)
  await ensureExercises(database)
})

describe('exercises', () => {
  it('starts with the library, once', async () => {
    await ensureExercises(database)
    expect(await database.exercises.count()).toBe(EXERCISE_LIBRARY.length)
  })

  it('adds a custom exercise, refuses duplicates in any case and refuses a missing name', async () => {
    const added = await addExercise(database, '  Zercher   squat ', 'Legs')
    expect(added.ok && added.value).toMatchObject({ name: 'Zercher squat', muscleGroup: 'Legs' })
    expect(await addExercise(database, 'zercher SQUAT', 'Legs')).toMatchObject({ ok: false })
    expect(await addExercise(database, 'Bench press', 'Chest')).toMatchObject({ ok: false })
    expect(await addExercise(database, 'x', 'Legs')).toMatchObject({ ok: false })
    expect((await listExercises(database)).some((e) => e.name === 'Zercher squat')).toBe(true)
  })
})

describe('routines', () => {
  it('saves, renames and sorts routines, and removes repeated exercises', async () => {
    await saveRoutine(database, { id: 'r2', name: 'Zed', exerciseIds: ['squat'] })
    await saveRoutine(database, { id: 'r1', name: '  Push   day ', exerciseIds: ['bench-press', 'bench-press', 'overhead-press'] })
    const routines = await listRoutines(database)
    expect(routines.map((r) => r.name)).toEqual(['Push day', 'Zed'])
    expect(routines[0]?.exerciseIds).toEqual(['bench-press', 'overhead-press'])
    await saveRoutine(database, { id: 'r1', name: 'Push', exerciseIds: ['bench-press'] })
    expect((await listRoutines(database)).find((r) => r.id === 'r1')?.name).toBe('Push')
  })

  it('refuses a nameless routine, an empty one and one with an unknown exercise', async () => {
    expect(await saveRoutine(database, { id: 'a', name: ' ', exerciseIds: ['squat'] })).toMatchObject({ ok: false })
    expect(await saveRoutine(database, { id: 'a', name: 'X', exerciseIds: [] })).toMatchObject({ ok: false })
    expect(await saveRoutine(database, { id: 'a', name: 'X', exerciseIds: ['ghost'] })).toMatchObject({ ok: false })
    expect(await database.routines.count()).toBe(0)
  })

  it('keeps past workouts when their routine is deleted, turning them into quick workouts', async () => {
    await saveRoutine(database, { id: 'r1', name: 'Push', exerciseIds: ['bench-press'] })
    const session = await startSession(database, 'r1')
    await finishSession(database, session.id)
    await deleteRoutine(database, 'r1')
    expect(await database.routines.count()).toBe(0)
    expect((await listSessions(database))[0]?.routineId).toBeNull()
  })
})

describe('workouts', () => {
  it('allows only one workout in progress and hands back the open one', async () => {
    const first = await startSession(database, null)
    const second = await startSession(database, 'r1')
    expect(second.id).toBe(first.id)
    expect(await database.sessions.count()).toBe(1)
    expect((await activeSession(database))?.id).toBe(first.id)
  })

  it('finishing a workout ends it and allows the next one', async () => {
    const first = await startSession(database, null)
    await finishSession(database, first.id, new Date(2026, 10, 18, 19, 0))
    expect(await activeSession(database)).toBeNull()
    expect((await startSession(database, null)).id).not.toBe(first.id)
  })

  it('logs valid sets with a time, rounds the weight and keeps bodyweight sets', async () => {
    const session = await startSession(database, null)
    const result = await logSet(database, { sessionId: session.id, exerciseId: 'bench-press', reps: 8, weightKg: 62.504, rpe: 8 })
    expect(result.ok && result.value).toMatchObject({ reps: 8, weightKg: 62.5, rpe: 8 })
    expect(await logSet(database, { sessionId: session.id, exerciseId: 'pull-up', reps: 10, weightKg: 0, rpe: null })).toMatchObject({ ok: true })
    expect(await database.sets.count()).toBe(2)
  })

  it.each([
    [{ reps: 0, weightKg: 50, rpe: null }, 'zero reps'],
    [{ reps: 2.5, weightKg: 50, rpe: null }, 'fractional reps'],
    [{ reps: 101, weightKg: 50, rpe: null }, 'too many reps'],
    [{ reps: 5, weightKg: -1, rpe: null }, 'negative weight'],
    [{ reps: 5, weightKg: 1001, rpe: null }, 'impossible weight'],
    [{ reps: 5, weightKg: Number.NaN, rpe: null }, 'not-a-number weight'],
    [{ reps: 5, weightKg: 50, rpe: 11 }, 'effort above 10'],
    [{ reps: 5, weightKg: 50, rpe: 0 }, 'effort below 1'],
  ])('refuses %j (%s)', async (values, _label) => {
    const session = await startSession(database, null)
    expect(await logSet(database, { sessionId: session.id, exerciseId: 'squat', ...values })).toMatchObject({ ok: false })
    expect(await database.sets.count()).toBe(0)
  })

  it('refuses a set for a workout that does not exist', async () => {
    expect(await logSet(database, { sessionId: 'ghost', exerciseId: 'squat', reps: 5, weightKg: 50, rpe: null })).toMatchObject({ ok: false })
  })

  it('deletes one set, and discarding a workout deletes all its sets but no one else\'s', async () => {
    const a = await startSession(database, null)
    const first = await logSet(database, { sessionId: a.id, exerciseId: 'squat', reps: 5, weightKg: 100, rpe: null })
    await logSet(database, { sessionId: a.id, exerciseId: 'squat', reps: 5, weightKg: 100, rpe: null })
    await finishSession(database, a.id)
    const b = await startSession(database, null)
    await logSet(database, { sessionId: b.id, exerciseId: 'squat', reps: 5, weightKg: 100, rpe: null })
    if (first.ok) await deleteSet(database, first.value.id)
    expect(await database.sets.count()).toBe(2)
    await discardSession(database, b.id)
    expect((await listSets(database)).every((s) => s.sessionId === a.id)).toBe(true)
    expect(await database.sessions.count()).toBe(1)
  })
})

describe('daily logs', () => {
  it('returns an empty log for a day with nothing yet, then the saved one', async () => {
    expect(await getLog(database, '2026-11-18')).toEqual(emptyLog('2026-11-18'))
    await saveLog(database, { ...emptyLog('2026-11-18'), waterMl: 1500, weightKg: 81.2 })
    expect(await getLog(database, '2026-11-18')).toMatchObject({ waterMl: 1500, weightKg: 81.2 })
  })

  it('updates a day instead of adding a second one, and lists days oldest first', async () => {
    await saveLog(database, { ...emptyLog('2026-11-18'), waterMl: 500 })
    await saveLog(database, { ...emptyLog('2026-11-17'), waterMl: 900 })
    await saveLog(database, { ...emptyLog('2026-11-18'), waterMl: 750 })
    expect((await listLogs(database)).map((l) => [l.date, l.waterMl])).toEqual([['2026-11-17', 900], ['2026-11-18', 750]])
  })

  it.each([
    [{ weightKg: 5 }, 'a weight of 5 kg'],
    [{ weightKg: 500 }, 'a weight of 500 kg'],
    [{ restingHr: 10 }, 'a resting heart rate of 10'],
    [{ restingHr: 300 }, 'a resting heart rate of 300'],
    [{ waterMl: -5 }, 'negative water'],
    [{ waterMl: 99_999 }, 'too much water'],
    [{ proteinG: 5000 }, 'impossible protein'],
    [{ kcal: Number.NaN }, 'not-a-number calories'],
    [{ date: '2026-02-30' }, 'an impossible day'],
  ])('refuses %j (%s)', async (patch, _label) => {
    expect(await saveLog(database, { ...emptyLog('2026-11-18'), ...patch })).toMatchObject({ ok: false })
    expect(await database.logs.count()).toBe(0)
  })
})

describe('settings', () => {
  it('has defaults, remembers changes and keeps targets the user did not change', async () => {
    expect(await loadSettings(database)).toEqual(DEFAULT_SETTINGS)
    await saveSettings(database, { ...DEFAULT_SETTINGS, restSeconds: 120, targets: { ...DEFAULT_SETTINGS.targets, waterMl: 3000 } })
    expect(await loadSettings(database)).toMatchObject({ restSeconds: 120, targets: { waterMl: 3000, kcal: 2300 } })
  })

  it('refuses targets that make no sense', async () => {
    expect(await saveSettings(database, { ...DEFAULT_SETTINGS, restSeconds: 5 })).toMatchObject({ ok: false })
    expect(await saveSettings(database, { ...DEFAULT_SETTINGS, targets: { ...DEFAULT_SETTINGS.targets, waterMl: 50 } })).toMatchObject({ ok: false })
    expect(await saveSettings(database, { ...DEFAULT_SETTINGS, targets: { ...DEFAULT_SETTINGS.targets, kcal: 200 } })).toMatchObject({ ok: false })
    expect(await loadSettings(database)).toEqual(DEFAULT_SETTINGS)
  })
})

describe('demo data', () => {
  const demo = () => buildDemo('2026-11-18')

  it('is added to an empty database', async () => {
    expect(await seedIfEmpty(database, demo())).toBe(true)
    expect(await database.sessions.count()).toBe(demo().sessions.length)
    expect(await database.logs.count()).toBe(42)
  })

  it('never touches a database that already has anything, such as water logged while the demo was being built', async () => {
    await saveLog(database, { ...emptyLog('2026-11-18'), waterMl: 250 })
    expect(await seedIfEmpty(database, demo())).toBe(false)
    expect(await database.logs.count()).toBe(1)
    expect(await database.sessions.count()).toBe(0)
  })

  it('does not run over a workout started in the meantime', async () => {
    const live = await startSession(database, null)
    expect(await seedIfEmpty(database, demo())).toBe(false)
    expect((await listSessions(database)).map((s) => s.id)).toEqual([live.id])
  })

  it('cannot be raced into adding the demo twice', async () => {
    const results = await Promise.all([seedIfEmpty(database, demo()), seedIfEmpty(database, demo())])
    expect(results.filter(Boolean)).toHaveLength(1)
    expect(await database.logs.count()).toBe(42)
  })

  it('can be replaced or cleared on purpose', async () => {
    await seedIfEmpty(database, demo())
    await replaceHistory(database, { routines: [], sessions: [], sets: [], logs: [] })
    expect((await database.sessions.count()) + (await database.sets.count()) + (await database.logs.count()) + (await database.routines.count())).toBe(0)
    await replaceHistory(database, demo())
    expect(await database.logs.count()).toBe(42)
  })
})
