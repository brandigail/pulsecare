import type { SetLog, WorkoutSession } from '../types'

/** Small builders shared by the tests. Not used by the app. */
export function session(id: string, year: number, month: number, day: number, hour = 18): WorkoutSession {
  return { id, routineId: null, startedAt: new Date(year, month - 1, day, hour, 0).toISOString(), endedAt: new Date(year, month - 1, day, hour + 1, 0).toISOString() }
}

let counter = 0

export function set(sessionId: string, exerciseId: string, weightKg: number, reps: number, loggedAt?: string, rpe: number | null = null): SetLog {
  counter += 1
  return { id: `set-${counter}`, sessionId, exerciseId, reps, weightKg, rpe, loggedAt: loggedAt ?? new Date(2026, 0, 1, 0, counter).toISOString() }
}
