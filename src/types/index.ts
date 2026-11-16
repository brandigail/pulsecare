/** A calendar day as YYYY-MM-DD in the user's local time. */
export type DateKey = string

export interface Exercise {
  id: string
  name: string
  muscleGroup: string
}

export interface Routine {
  id: string
  name: string
  /** In the order they are done. */
  exerciseIds: string[]
}

export interface WorkoutSession {
  id: string
  /** The routine it was started from, or null for a quick workout (or when that routine was later deleted). */
  routineId: string | null
  startedAt: string
  /** Null while the workout is still in progress. */
  endedAt: string | null
}

export interface SetLog {
  id: string
  sessionId: string
  exerciseId: string
  reps: number
  weightKg: number
  /** Rate of perceived exertion from 1 to 10, if the user gave one. */
  rpe: number | null
  /** When the set was logged, which is what orders sets within a workout. */
  loggedAt: string
}

export interface DailyLog {
  date: DateKey
  waterMl: number
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  weightKg: number | null
  restingHr: number | null
}

export interface Targets {
  waterMl: number
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

export interface Settings {
  targets: Targets
  /** The rest timer starts at this many seconds after each logged set. */
  restSeconds: number
}
