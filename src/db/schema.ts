import Dexie, { type Table } from 'dexie'
import type { DailyLog, Exercise, Routine, SetLog, Settings, WorkoutSession } from '../types'

interface SettingsRow {
  key: string
  value: Settings
}

/** Everything lives in IndexedDB on this device. All reading and writing goes through the functions in this folder. */
export class PulseCareDb extends Dexie {
  exercises!: Table<Exercise, string>
  routines!: Table<Routine, string>
  sessions!: Table<WorkoutSession, string>
  sets!: Table<SetLog, string>
  logs!: Table<DailyLog, string>
  settings!: Table<SettingsRow, string>

  constructor(name = 'pulsecare') {
    super(name)
    this.version(1).stores({
      exercises: 'id, muscleGroup',
      routines: 'id',
      sessions: 'id, startedAt',
      sets: 'id, sessionId, exerciseId',
      logs: 'date',
      settings: 'key',
    })
  }
}

export const db = new PulseCareDb()
