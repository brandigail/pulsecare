import { EXERCISE_LIBRARY } from '../data/exercises'
import type { DailyLog, DateKey, Exercise, Routine, SetLog, Settings, WorkoutSession } from '../types'
import type { DemoData } from '../lib/demo'
import { isDateKey } from '../lib/date'
import { DEFAULT_TARGETS, emptyLog } from '../lib/nutrition'
import { MAX_REST_SECONDS, MIN_REST_SECONDS } from '../lib/restTimer'
import type { PulseCareDb } from './schema'

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })

// ---------- Exercises ----------

/** Makes sure the exercise library exists. It only adds missing library entries, so custom exercises are never touched. */
export async function ensureExercises(database: PulseCareDb): Promise<void> {
  if ((await database.exercises.count()) === 0) await database.exercises.bulkPut([...EXERCISE_LIBRARY])
}

export async function listExercises(database: PulseCareDb): Promise<Exercise[]> {
  return (await database.exercises.toArray()).sort((a, b) => a.name.localeCompare(b.name))
}

export async function addExercise(database: PulseCareDb, name: string, muscleGroup: string): Promise<Result<Exercise>> {
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, 50)
  if (clean.length < 2) return fail('Give the exercise a name of at least two letters.')
  const existing = (await database.exercises.toArray()).find((e) => e.name.toLowerCase() === clean.toLowerCase())
  if (existing) return fail(`"${existing.name}" is already in the library.`)
  const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'exercise'
  const exercise: Exercise = { id: `${slug}-${crypto.randomUUID().slice(0, 6)}`, name: clean, muscleGroup: muscleGroup.trim() || 'Other' }
  await database.exercises.add(exercise)
  return { ok: true, value: exercise }
}

// ---------- Routines ----------

export async function listRoutines(database: PulseCareDb): Promise<Routine[]> {
  return (await database.routines.toArray()).sort((a, b) => a.name.localeCompare(b.name))
}

/** Creates or updates a routine. A routine needs a name and at least one exercise, and the same exercise is not listed twice. */
export async function saveRoutine(database: PulseCareDb, routine: Routine): Promise<Result<Routine>> {
  const name = routine.name.replace(/\s+/g, ' ').trim().slice(0, 40)
  if (!name) return fail('Give the routine a name.')
  const exerciseIds = [...new Set(routine.exerciseIds)]
  if (exerciseIds.length === 0) return fail('Add at least one exercise.')
  const known = new Set((await database.exercises.toArray()).map((e) => e.id))
  if (exerciseIds.some((id) => !known.has(id))) return fail('One of the exercises no longer exists.')
  const saved: Routine = { id: routine.id, name, exerciseIds }
  await database.routines.put(saved)
  return { ok: true, value: saved }
}

/** Deleting a routine keeps the workouts that were done from it; they simply become quick workouts. */
export async function deleteRoutine(database: PulseCareDb, id: string): Promise<void> {
  await database.transaction('rw', database.routines, database.sessions, async () => {
    await database.sessions.where('id').notEqual('').filter((s) => s.routineId === id).modify({ routineId: null })
    await database.routines.delete(id)
  })
}

// ---------- Workouts and sets ----------

export async function listSessions(database: PulseCareDb): Promise<WorkoutSession[]> {
  return (await database.sessions.toArray()).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

/** The workout that is in progress, if any. */
export async function activeSession(database: PulseCareDb): Promise<WorkoutSession | null> {
  const open = (await database.sessions.toArray()).filter((s) => s.endedAt === null).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  return open[0] ?? null
}

/** Starts a workout. Only one can be in progress at a time, so if one already is, that one is returned instead of starting another. */
export async function startSession(database: PulseCareDb, routineId: string | null, now: Date = new Date()): Promise<WorkoutSession> {
  return database.transaction('rw', database.sessions, async () => {
    const open = (await database.sessions.toArray()).find((s) => s.endedAt === null)
    if (open) return open
    const session: WorkoutSession = { id: crypto.randomUUID(), routineId, startedAt: now.toISOString(), endedAt: null }
    await database.sessions.add(session)
    return session
  })
}

export async function finishSession(database: PulseCareDb, id: string, now: Date = new Date()): Promise<void> {
  await database.sessions.update(id, { endedAt: now.toISOString() })
}

/** Throws a workout away together with every set in it. */
export async function discardSession(database: PulseCareDb, id: string): Promise<void> {
  await database.transaction('rw', database.sessions, database.sets, async () => {
    await database.sets.where('sessionId').equals(id).delete()
    await database.sessions.delete(id)
  })
}

export async function listSets(database: PulseCareDb): Promise<SetLog[]> {
  return database.sets.toArray()
}

export interface NewSet {
  sessionId: string
  exerciseId: string
  reps: number
  weightKg: number
  rpe: number | null
}

/** Logs a set after checking the numbers: 1 to 100 reps, 0 to 1000 kg (0 is bodyweight) and an effort rating of 1 to 10 if given. */
export async function logSet(database: PulseCareDb, input: NewSet, now: Date = new Date()): Promise<Result<SetLog>> {
  if (!Number.isInteger(input.reps) || input.reps < 1 || input.reps > 100) return fail('Reps must be a whole number from 1 to 100.')
  if (!Number.isFinite(input.weightKg) || input.weightKg < 0 || input.weightKg > 1000) return fail('Weight must be from 0 to 1000 kg.')
  if (input.rpe !== null && (!Number.isFinite(input.rpe) || input.rpe < 1 || input.rpe > 10)) return fail('Effort (RPE) must be from 1 to 10.')
  if (!(await database.sessions.get(input.sessionId))) return fail('That workout no longer exists.')
  const set: SetLog = { id: crypto.randomUUID(), ...input, weightKg: Math.round(input.weightKg * 100) / 100, loggedAt: now.toISOString() }
  await database.sets.add(set)
  return { ok: true, value: set }
}

export async function deleteSet(database: PulseCareDb, id: string): Promise<void> {
  await database.sets.delete(id)
}

// ---------- Daily logs ----------

/** The log for a day, or an empty one if nothing was logged yet. */
export async function getLog(database: PulseCareDb, date: DateKey): Promise<DailyLog> {
  return (await database.logs.get(date)) ?? emptyLog(date)
}

export async function listLogs(database: PulseCareDb): Promise<DailyLog[]> {
  return (await database.logs.toArray()).sort((a, b) => a.date.localeCompare(b.date))
}

const inRange = (value: number | null, min: number, max: number) => value === null || (Number.isFinite(value) && value >= min && value <= max)

/** Saves a day's log after checking every number is believable (weight 20-400 kg, resting heart rate 25-250, and so on). */
export async function saveLog(database: PulseCareDb, log: DailyLog): Promise<Result<DailyLog>> {
  if (!isDateKey(log.date)) return fail('That is not a valid day.')
  if (!inRange(log.waterMl, 0, 20_000)) return fail('Water must be between 0 and 20 000 ml.')
  if (!inRange(log.kcal, 0, 20_000)) return fail('Calories must be between 0 and 20 000.')
  if (![log.proteinG, log.carbsG, log.fatG].every((g) => inRange(g, 0, 2000))) return fail('Macros must be between 0 and 2000 g.')
  if (!inRange(log.weightKg, 20, 400)) return fail('Weight must be between 20 and 400 kg.')
  if (!inRange(log.restingHr, 25, 250)) return fail('Resting heart rate must be between 25 and 250.')
  await database.logs.put(log)
  return { ok: true, value: log }
}

// ---------- Settings ----------

export const DEFAULT_SETTINGS: Settings = { targets: DEFAULT_TARGETS, restSeconds: 90 }

export async function loadSettings(database: PulseCareDb): Promise<Settings> {
  const row = await database.settings.get('app')
  return { ...DEFAULT_SETTINGS, ...row?.value, targets: { ...DEFAULT_TARGETS, ...row?.value?.targets } }
}

export async function saveSettings(database: PulseCareDb, settings: Settings): Promise<Result<Settings>> {
  const t = settings.targets
  if (!(t.waterMl >= 500 && t.waterMl <= 10_000)) return fail('The water target must be between 500 and 10 000 ml.')
  if (!(t.kcal >= 800 && t.kcal <= 10_000)) return fail('The calorie target must be between 800 and 10 000.')
  if (![t.proteinG, t.carbsG, t.fatG].every((g) => g >= 10 && g <= 1500)) return fail('Macro targets must be between 10 and 1500 g.')
  if (!(settings.restSeconds >= MIN_REST_SECONDS && settings.restSeconds <= MAX_REST_SECONDS)) return fail('The rest time must be between 15 seconds and 10 minutes.')
  await database.settings.put({ key: 'app', value: settings })
  return { ok: true, value: settings }
}

// ---------- Demo data ----------

/**
 * Adds the demo history only if there is no history at all, and decides that inside the same transaction that writes
 * it. The demo is built in the background shortly after launch, so by the time it is ready the user may already have
 * started a workout or logged water; it must never overwrite or remove anything. Returns whether it added the demo.
 */
export async function seedIfEmpty(database: PulseCareDb, demo: DemoData): Promise<boolean> {
  return database.transaction('rw', [database.routines, database.sessions, database.sets, database.logs], async () => {
    const existing = (await database.routines.count()) + (await database.sessions.count()) + (await database.logs.count())
    if (existing > 0) return false
    await database.routines.bulkPut(demo.routines)
    await database.sessions.bulkPut(demo.sessions)
    await database.sets.bulkPut(demo.sets)
    await database.logs.bulkPut(demo.logs)
    return true
  })
}

/** Replaces all history in one transaction: all of it is swapped or none of it is. Only for the explicit "load demo" and "delete all" actions. */
export async function replaceHistory(database: PulseCareDb, data: DemoData): Promise<void> {
  await database.transaction('rw', [database.routines, database.sessions, database.sets, database.logs], async () => {
    await Promise.all([database.routines.clear(), database.sessions.clear(), database.sets.clear(), database.logs.clear()])
    await database.routines.bulkPut(data.routines)
    await database.sessions.bulkPut(data.sessions)
    await database.sets.bulkPut(data.sets)
    await database.logs.bulkPut(data.logs)
  })
}
