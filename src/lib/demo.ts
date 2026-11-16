import type { DailyLog, DateKey, Routine, SetLog, WorkoutSession } from '../types'
import { addDays, daysBetween, weekdayIndex } from './date'
import { macroKcal } from './nutrition'

export interface DemoData {
  routines: Routine[]
  sessions: WorkoutSession[]
  sets: SetLog[]
  logs: DailyLog[]
}

/** The days of history the demo covers, ending today. */
export const DEMO_DAYS = 42

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const ROUTINES: readonly Routine[] = [
  { id: 'routine-push', name: 'Push day', exerciseIds: ['bench-press', 'overhead-press', 'incline-db-press', 'lateral-raise', 'triceps-pushdown'] },
  { id: 'routine-pull', name: 'Pull day', exerciseIds: ['barbell-row', 'lat-pulldown', 'seated-row', 'face-pull', 'biceps-curl'] },
  { id: 'routine-legs', name: 'Leg day', exerciseIds: ['squat', 'romanian-deadlift', 'leg-press', 'leg-curl', 'calf-raise'] },
]

/** Starting weights in kilograms and the reps aimed for, per exercise. */
const PLAN: Readonly<Record<string, { kg: number; reps: number; sets: number }>> = {
  'bench-press': { kg: 70, reps: 8, sets: 4 },
  'overhead-press': { kg: 42.5, reps: 8, sets: 3 },
  'incline-db-press': { kg: 24, reps: 10, sets: 3 },
  'lateral-raise': { kg: 10, reps: 12, sets: 3 },
  'triceps-pushdown': { kg: 30, reps: 12, sets: 3 },
  'barbell-row': { kg: 67.5, reps: 8, sets: 4 },
  'lat-pulldown': { kg: 55, reps: 10, sets: 3 },
  'seated-row': { kg: 50, reps: 10, sets: 3 },
  'face-pull': { kg: 25, reps: 12, sets: 3 },
  'biceps-curl': { kg: 27.5, reps: 10, sets: 3 },
  squat: { kg: 90, reps: 6, sets: 4 },
  'romanian-deadlift': { kg: 80, reps: 8, sets: 3 },
  'leg-press': { kg: 160, reps: 10, sets: 3 },
  'leg-curl': { kg: 40, reps: 12, sets: 3 },
  'calf-raise': { kg: 80, reps: 12, sets: 3 },
}

const round125 = (kg: number) => Math.round(kg / 1.25) * 1.25
const RPE = [7, 8, 8, 9]

function at(day: DateKey, hour: number, minutes: number): Date {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d, hour, minutes)
}

function scheduledRoutine(day: DateKey, weekIndex: number): string | null {
  switch (weekdayIndex(day)) {
    case 0:
      return 'routine-push'
    case 2:
      return 'routine-pull'
    case 4:
      return 'routine-legs'
    case 5:
      return weekIndex % 2 === 1 ? 'routine-push' : null
    default:
      return null
  }
}

/**
 * Six weeks of believable history ending today: three or four workouts a week with the weights creeping up, the odd
 * missed session, and a daily log with water, food, weight and resting heart rate for every day. Today's workout is left
 * to do and today's log is only partly filled, so the app looks alive and there is something to tick off. It is built
 * from a fixed seed, so it is identical every time.
 */
export function buildDemo(today: DateKey, seed = 11): DemoData {
  const random = mulberry32(seed)
  const start = addDays(today, -(DEMO_DAYS - 1))
  const sessions: WorkoutSession[] = []
  const sets: SetLog[] = []
  const logs: DailyLog[] = []

  for (let i = 0; i < DEMO_DAYS; i++) {
    const day = addDays(start, i)
    const weekIndex = Math.floor(daysBetween(start, day) / 7)
    const routineId = day < today ? scheduledRoutine(day, weekIndex) : null
    const routine = ROUTINES.find((r) => r.id === routineId)
    if (routine && random() > 0.1) {
      const startedAt = at(day, 18, Math.floor(random() * 20))
      const id = `demo-${day}`
      let clock = startedAt.getTime()
      let n = 0
      for (const exerciseId of routine.exerciseIds) {
        const plan = PLAN[exerciseId]
        if (!plan) continue
        const weight = round125(plan.kg * (1 + 0.012 * weekIndex))
        for (let s = 0; s < plan.sets; s++) {
          clock += Math.round((2 + random() * 1.5) * 60_000)
          const drop = s === 0 ? 0 : Math.floor(random() * 2) + (s >= 3 ? 1 : 0)
          sets.push({ id: `${id}-${n++}`, sessionId: id, exerciseId, reps: Math.max(3, plan.reps - drop), weightKg: weight, rpe: RPE[Math.min(s, RPE.length - 1)] ?? null, loggedAt: new Date(clock).toISOString() })
        }
        clock += 3 * 60_000
      }
      sessions.push({ id, routineId: routine.id, startedAt: startedAt.toISOString(), endedAt: new Date(clock).toISOString() })
    }

    const isToday = day === today
    const weekend = weekdayIndex(day) >= 5
    const proteinG = Math.round(120 + random() * 45)
    const fatG = Math.round(55 + random() * 30)
    const targetKcal = 2000 + random() * 600 + (weekend ? 150 : 0)
    const carbsG = Math.max(100, Math.round((targetKcal - proteinG * 4 - fatG * 9) / 4))
    const progress = i / (DEMO_DAYS - 1)
    const hasWeight = random() > 0.25
    const hasHr = random() > 0.3
    const weight = Math.round((82.4 - 1.4 * progress + (random() - 0.5) * 0.7) * 10) / 10
    const hr = Math.round(62 - 4 * progress + (random() - 0.5) * 3)
    logs.push(
      isToday
        ? { date: day, waterMl: 750, kcal: macroKcal(35, 80, 18), proteinG: 35, carbsG: 80, fatG: 18, weightKg: null, restingHr: null }
        : { date: day, waterMl: Math.round((1800 + random() * 1300) / 50) * 50, kcal: macroKcal(proteinG, carbsG, fatG), proteinG, carbsG, fatG, weightKg: hasWeight ? weight : null, restingHr: hasHr ? hr : null },
    )
  }
  return { routines: ROUTINES.map((r) => ({ ...r, exerciseIds: [...r.exerciseIds] })), sessions, sets, logs }
}
