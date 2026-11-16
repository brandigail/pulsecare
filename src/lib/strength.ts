import type { DateKey, SetLog, WorkoutSession } from '../types'
import { addDays, startOfWeek, toDateKey } from './date'

/** Above this many reps an estimated one-rep max is too unreliable to use, so such sets are not counted for records. */
export const MAX_RELIABLE_REPS = 12

/**
 * Estimated one-rep max with the Epley formula: weight x (1 + reps / 30). One rep is the weight itself. Returns null
 * when there is nothing to estimate from (no weight, as in a bodyweight set, or no reps) and when the set has more
 * than 12 reps, where the formula stops being trustworthy.
 */
export function estimateOneRepMax(weightKg: number, reps: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps) || weightKg <= 0 || reps < 1 || reps > MAX_RELIABLE_REPS) return null
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30)
}

/** Weight lifted in a set: reps times weight. */
export function setVolume(set: Pick<SetLog, 'reps' | 'weightKg'>): number {
  return Math.max(0, set.reps) * Math.max(0, set.weightKg)
}

export function totalVolume(sets: readonly Pick<SetLog, 'reps' | 'weightKg'>[]): number {
  return sets.reduce((sum, s) => sum + setVolume(s), 0)
}

/** The local calendar day a workout started on. */
export function dayOf(session: Pick<WorkoutSession, 'startedAt'>): DateKey {
  return toDateKey(new Date(session.startedAt))
}

export interface WeekVolume {
  /** The Monday that starts the week. */
  weekStart: DateKey
  volumeKg: number
  workouts: number
}

/** Volume per week for the last `weeks` weeks (Monday to Sunday) ending with the week that contains `today`, oldest first. */
export function weeklyVolume(sessions: readonly WorkoutSession[], sets: readonly SetLog[], today: DateKey, weeks: number): WeekVolume[] {
  const lastWeek = startOfWeek(today)
  const starts = Array.from({ length: weeks }, (_, i) => addDays(lastWeek, (i - (weeks - 1)) * 7))
  const weekOf = new Map(sessions.map((s) => [s.id, startOfWeek(dayOf(s))]))
  const volume = new Map(starts.map((w) => [w, 0]))
  const counted = new Map<string, Set<string>>(starts.map((w) => [w, new Set<string>()]))
  for (const set of sets) {
    const week = weekOf.get(set.sessionId)
    if (week === undefined || !volume.has(week)) continue
    volume.set(week, (volume.get(week) ?? 0) + setVolume(set))
    counted.get(week)?.add(set.sessionId)
  }
  return starts.map((weekStart) => ({ weekStart, volumeKg: Math.round(volume.get(weekStart) ?? 0), workouts: counted.get(weekStart)?.size ?? 0 }))
}

/** Every set in the order it happened: by when its workout started, then by when it was logged. */
export function chronological(sets: readonly SetLog[], sessions: readonly WorkoutSession[]): SetLog[] {
  const started = new Map(sessions.map((s) => [s.id, s.startedAt]))
  return [...sets]
    .filter((s) => started.has(s.sessionId))
    .sort((a, b) => (started.get(a.sessionId) ?? '').localeCompare(started.get(b.sessionId) ?? '') || a.loggedAt.localeCompare(b.loggedAt))
}

export interface PersonalRecord {
  exerciseId: string
  /** The best estimated one-rep max. */
  e1rmKg: number
  /** The set that produced it. */
  weightKg: number
  reps: number
  date: DateKey
  sessionId: string
  setId: string
  /** The heaviest weight ever lifted for at least one rep, whatever the reps. */
  heaviestKg: number
}

/**
 * Each exercise's personal record, worked out from the logged sets every time rather than stored, so editing or
 * deleting a set can never leave a stale record behind. The record is the best estimated one-rep max; on a tie the
 * earlier set keeps it.
 */
export function personalRecords(sets: readonly SetLog[], sessions: readonly WorkoutSession[]): PersonalRecord[] {
  const dates = new Map(sessions.map((s) => [s.id, dayOf(s)]))
  const best = new Map<string, PersonalRecord>()
  for (const set of chronological(sets, sessions)) {
    const heaviest = Math.max(best.get(set.exerciseId)?.heaviestKg ?? 0, set.reps >= 1 ? set.weightKg : 0)
    const e1rm = estimateOneRepMax(set.weightKg, set.reps)
    const current = best.get(set.exerciseId)
    if (e1rm !== null && (!current || e1rm > current.e1rmKg)) {
      best.set(set.exerciseId, { exerciseId: set.exerciseId, e1rmKg: e1rm, weightKg: set.weightKg, reps: set.reps, date: dates.get(set.sessionId) ?? '', sessionId: set.sessionId, setId: set.id, heaviestKg: heaviest })
    } else if (current) {
      best.set(set.exerciseId, { ...current, heaviestKg: heaviest })
    }
  }
  return [...best.values()].sort((a, b) => b.e1rmKg - a.e1rmKg)
}

/**
 * The records a workout set. A set counts only if it beats every earlier set of that exercise (including earlier in the
 * same workout) and there was an earlier set to beat, so the first time you ever log an exercise is not called a record.
 * Returns the best such set per exercise.
 */
export function newRecordsIn(sessionId: string, sets: readonly SetLog[], sessions: readonly WorkoutSession[]): PersonalRecord[] {
  const dates = new Map(sessions.map((s) => [s.id, dayOf(s)]))
  const bestSoFar = new Map<string, number>()
  const found = new Map<string, PersonalRecord>()
  for (const set of chronological(sets, sessions)) {
    const e1rm = estimateOneRepMax(set.weightKg, set.reps)
    if (e1rm === null) continue
    const before = bestSoFar.get(set.exerciseId)
    if (set.sessionId === sessionId && before !== undefined && e1rm > before && e1rm > (found.get(set.exerciseId)?.e1rmKg ?? 0)) {
      found.set(set.exerciseId, { exerciseId: set.exerciseId, e1rmKg: e1rm, weightKg: set.weightKg, reps: set.reps, date: dates.get(set.sessionId) ?? '', sessionId, setId: set.id, heaviestKg: set.weightKg })
    }
    if (before === undefined || e1rm > before) bestSoFar.set(set.exerciseId, e1rm)
  }
  return [...found.values()]
}

export interface ProgressPoint {
  date: DateKey
  sessionId: string
  /** The heaviest set that workout. */
  topWeightKg: number
  /** The best estimated one-rep max that workout, or null if none of its sets could be estimated. */
  e1rmKg: number | null
}

/** One point per workout for an exercise, oldest first, for the progression chart. */
export function progression(exerciseId: string, sets: readonly SetLog[], sessions: readonly WorkoutSession[]): ProgressPoint[] {
  const dates = new Map(sessions.map((s) => [s.id, dayOf(s)]))
  const byWorkout = new Map<string, ProgressPoint>()
  for (const set of chronological(sets, sessions)) {
    if (set.exerciseId !== exerciseId || set.reps < 1) continue
    const e1rm = estimateOneRepMax(set.weightKg, set.reps)
    const point = byWorkout.get(set.sessionId) ?? { date: dates.get(set.sessionId) ?? '', sessionId: set.sessionId, topWeightKg: 0, e1rmKg: null }
    point.topWeightKg = Math.max(point.topWeightKg, set.weightKg)
    if (e1rm !== null) point.e1rmKg = Math.max(point.e1rmKg ?? 0, e1rm)
    byWorkout.set(set.sessionId, point)
  }
  return [...byWorkout.values()]
}

export interface LastPerformance {
  date: DateKey
  sets: { reps: number; weightKg: number }[]
}

/** What you did for an exercise the last time before a given moment, to show as a hint and to prefill the next set. */
export function lastPerformance(exerciseId: string, before: string, sets: readonly SetLog[], sessions: readonly WorkoutSession[]): LastPerformance | null {
  const earlier = new Map(sessions.filter((s) => s.startedAt < before).map((s) => [s.id, s]))
  const mine = chronological(sets, sessions).filter((s) => s.exerciseId === exerciseId && earlier.has(s.sessionId))
  const last = mine.at(-1)
  if (!last) return null
  const session = earlier.get(last.sessionId)
  return { date: session ? dayOf(session) : '', sets: mine.filter((s) => s.sessionId === last.sessionId).map((s) => ({ reps: s.reps, weightKg: s.weightKg })) }
}
