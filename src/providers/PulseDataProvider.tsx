import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { addExercise, activeSession, deleteRoutine, deleteSet, discardSession, DEFAULT_SETTINGS, ensureExercises, finishSession, getLog, listExercises, listLogs, listRoutines, listSessions, listSets, loadSettings, logSet, replaceHistory, saveLog, saveRoutine, saveSettings, seedIfEmpty, startSession, type Result } from '../db/repo'
import { db } from '../db/schema'
import { toDateKey } from '../lib/date'
import { buildDemo } from '../lib/demo'
import { addMeal, addWater, type Meal } from '../lib/nutrition'
import type { DailyLog, DateKey, Exercise, Routine, SetLog, WorkoutSession } from '../types'
import { PulseDataContext, type PulseData } from './data'

const SEEDED_KEY = 'pulsecare-seeded'
const SETTLE_MS = 2500
const NO_EXERCISES: Exercise[] = []
const NO_ROUTINES: Routine[] = []
const NO_SESSIONS: WorkoutSession[] = []
const NO_SETS: SetLog[] = []
const NO_LOGS: DailyLog[] = []

// A flag records that the demo history was added once, so deleting it later does not bring it back.
function wasSeeded(): boolean {
  try {
    return localStorage.getItem(SEEDED_KEY) === '1'
  } catch {
    return false
  }
}

function markSeeded(): void {
  try {
    localStorage.setItem(SEEDED_KEY, '1')
  } catch {
    // ignore: worst case the demo is offered again on an empty database
  }
}

/**
 * Resolves once the page has fully loaded, a short grace period has passed and the browser is idle. The demo history
 * is a few hundred records, so it must never compete with the app's own first load.
 */
async function whenIdle(): Promise<void> {
  if (document.readyState !== 'complete') await new Promise<void>((resolve) => window.addEventListener('load', () => resolve(), { once: true }))
  await new Promise<void>((resolve) => window.setTimeout(resolve, SETTLE_MS))
  const requestIdle: ((callback: () => void, options?: { timeout: number }) => number) | undefined = window.requestIdleCallback?.bind(window)
  if (requestIdle) await new Promise<void>((resolve) => requestIdle(() => resolve(), { timeout: 2000 }))
}

/** Reads everything live from IndexedDB and exposes the actions the screens need, all going through the db layer. */
export function PulseDataProvider({ children }: { children: ReactNode }) {
  const [initialised, setInitialised] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [today, setToday] = useState<DateKey>(() => toDateKey(new Date()))
  // Changes to a day's log are applied one after another, so tapping "+250 ml" quickly never loses an update.
  const logQueue = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await ensureExercises(db)
        const needsDemo = !wasSeeded() && (await db.routines.count()) + (await db.sessions.count()) + (await db.logs.count()) === 0
        if (needsDemo && !cancelled) setSeeding(true)
        if (!cancelled) setInitialised(true)
        if (needsDemo) {
          await whenIdle()
          // Adds only if still empty: the user may have logged something while the demo was being prepared.
          await seedIfEmpty(db, buildDemo(toDateKey(new Date())))
          markSeeded()
        }
      } catch {
        setSaveError('Your browser is blocking storage, so nothing can be saved on this device.')
        if (!cancelled) setInitialised(true)
      } finally {
        if (!cancelled) setSeeding(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // "Today" moves on at midnight and is re-checked when the app comes back to the front.
  useEffect(() => {
    const refresh = () => setToday(toDateKey(new Date()))
    const untilMidnight = () => {
      const now = new Date()
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime() + 1000
    }
    let timer = window.setTimeout(function tick() {
      refresh()
      timer = window.setTimeout(tick, untilMidnight())
    }, untilMidnight())
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const exercises = useLiveQuery(() => listExercises(db), [])
  const routines = useLiveQuery(() => listRoutines(db), [])
  const sessions = useLiveQuery(() => listSessions(db), [])
  const sets = useLiveQuery(() => listSets(db), [])
  const logs = useLiveQuery(() => listLogs(db), [])
  const settings = useLiveQuery(() => loadSettings(db), [])
  const active = useLiveQuery(async () => (await activeSession(db)) ?? null, [])

  const guard = useCallback(async <T,>(work: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      const result = await work()
      setSaveError(null)
      return result
    } catch {
      setSaveError('Your last change could not be saved on this device. Storage may be full.')
      return fallback
    }
  }, [])

  const changeLog = useCallback(
    (date: DateKey, change: (log: DailyLog) => DailyLog): Promise<Result<DailyLog>> => {
      const run = logQueue.current.then(() => guard(async () => saveLog(db, change(await getLog(db, date))), { ok: false, error: 'Could not save.' } as Result<DailyLog>))
      logQueue.current = run
      return run
    },
    [guard],
  )

  const value = useMemo<PulseData>(
    () => ({
      ready: initialised && exercises !== undefined && routines !== undefined && sessions !== undefined && sets !== undefined && logs !== undefined && settings !== undefined && active !== undefined,
      seeding,
      today,
      exercises: exercises ?? NO_EXERCISES,
      routines: routines ?? NO_ROUTINES,
      sessions: sessions ?? NO_SESSIONS,
      sets: sets ?? NO_SETS,
      logs: logs ?? NO_LOGS,
      settings: settings ?? DEFAULT_SETTINGS,
      active: active ?? null,
      saveError,
      addExercise: (name, group) => guard(() => addExercise(db, name, group), { ok: false, error: 'Could not save.' } as Result<Exercise>),
      saveRoutine: (routine) => guard(() => saveRoutine(db, routine), { ok: false, error: 'Could not save.' } as Result<Routine>),
      deleteRoutine: (id) => guard(() => deleteRoutine(db, id), undefined),
      startWorkout: (routineId) => guard(() => startSession(db, routineId), null),
      finishWorkout: (id) => guard(() => finishSession(db, id), undefined),
      discardWorkout: (id) => guard(() => discardSession(db, id), undefined),
      logSet: (input) => guard(() => logSet(db, input), { ok: false, error: 'Could not save.' } as Result<SetLog>),
      deleteSet: (id) => guard(() => deleteSet(db, id), undefined),
      addWater: async (date, ml) => void (await changeLog(date, (log) => addWater(log, ml))),
      addMeal: (date, meal: Meal) => changeLog(date, (log) => addMeal(log, meal)),
      saveLog: (log) => changeLog(log.date, () => log),
      saveSettings: (next) => guard(() => saveSettings(db, next), { ok: false, error: 'Could not save.' } as Result<typeof next>),
      loadDemo: () => guard(() => replaceHistory(db, buildDemo(toDateKey(new Date()))), undefined),
      clearHistory: () => guard(() => replaceHistory(db, { routines: [], sessions: [], sets: [], logs: [] }), undefined),
    }),
    [initialised, seeding, today, exercises, routines, sessions, sets, logs, settings, active, saveError, guard, changeLog],
  )

  return <PulseDataContext.Provider value={value}>{children}</PulseDataContext.Provider>
}
