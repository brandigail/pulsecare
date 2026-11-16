import { createContext, useContext } from 'react'
import type { NewSet, Result } from '../db/repo'
import type { Meal } from '../lib/nutrition'
import type { DailyLog, DateKey, Exercise, Routine, SetLog, Settings, WorkoutSession } from '../types'

export interface PulseData {
  /** False until the saved data has been read from this device. */
  ready: boolean
  /** True while the demo history is being added on the very first launch. */
  seeding: boolean
  today: DateKey
  exercises: Exercise[]
  routines: Routine[]
  sessions: WorkoutSession[]
  sets: SetLog[]
  logs: DailyLog[]
  settings: Settings
  /** The workout in progress, if any. */
  active: WorkoutSession | null
  saveError: string | null

  addExercise: (name: string, muscleGroup: string) => Promise<Result<Exercise>>
  saveRoutine: (routine: Routine) => Promise<Result<Routine>>
  deleteRoutine: (id: string) => Promise<void>
  startWorkout: (routineId: string | null) => Promise<WorkoutSession | null>
  finishWorkout: (id: string) => Promise<void>
  discardWorkout: (id: string) => Promise<void>
  logSet: (input: NewSet) => Promise<Result<SetLog>>
  deleteSet: (id: string) => Promise<void>
  addWater: (date: DateKey, ml: number) => Promise<void>
  addMeal: (date: DateKey, meal: Meal) => Promise<Result<DailyLog>>
  /** Replaces a day's totals and vitals with exactly these values. */
  saveLog: (log: DailyLog) => Promise<Result<DailyLog>>
  saveSettings: (settings: Settings) => Promise<Result<Settings>>
  loadDemo: () => Promise<void>
  clearHistory: () => Promise<void>
}

export const PulseDataContext = createContext<PulseData | null>(null)

export function usePulse(): PulseData {
  const ctx = useContext(PulseDataContext)
  if (!ctx) throw new Error('usePulse must be used within PulseDataProvider')
  return ctx
}
