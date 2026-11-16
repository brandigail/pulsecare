import type { DailyLog, DateKey, Targets } from '../types'

export const DEFAULT_TARGETS: Targets = { waterMl: 2500, kcal: 2300, proteinG: 140, carbsG: 260, fatG: 70 }

const MAX_WATER_ML = 20_000
const MAX_KCAL = 20_000
const MAX_GRAMS = 2_000

export function emptyLog(date: DateKey): DailyLog {
  return { date, waterMl: 0, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, weightKg: null, restingHr: null }
}

const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value))

/** Adds (or, with a negative number, takes away) water. It never goes below zero or above a sane limit. */
export function addWater(log: DailyLog, ml: number): DailyLog {
  return { ...log, waterMl: Math.round(clamp(log.waterMl + ml, MAX_WATER_ML)) }
}

export interface Meal {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

/** Adds a meal or snack to the day's totals. Negative amounts are ignored so a typo cannot subtract from the day. */
export function addMeal(log: DailyLog, meal: Meal): DailyLog {
  const add = (current: number, extra: number, max: number) => Math.round(clamp(current + Math.max(0, extra), max))
  return { ...log, kcal: add(log.kcal, meal.kcal, MAX_KCAL), proteinG: add(log.proteinG, meal.proteinG, MAX_GRAMS), carbsG: add(log.carbsG, meal.carbsG, MAX_GRAMS), fatG: add(log.fatG, meal.fatG, MAX_GRAMS) }
}

/** Calories in the macros: 4 per gram of protein or carbohydrate, 9 per gram of fat. */
export function macroKcal(proteinG: number, carbsG: number, fatG: number): number {
  return Math.round(proteinG * 4 + carbsG * 4 + fatG * 9)
}

export interface Progress {
  /** For drawing a bar: 0 to 1, never more. */
  ratio: number
  /** The honest figure, which can pass 100. */
  percent: number
  remaining: number
  over: boolean
}

export function progress(value: number, target: number): Progress {
  if (!(target > 0)) return { ratio: 0, percent: 0, remaining: 0, over: false }
  return { ratio: Math.min(1, Math.max(0, value / target)), percent: Math.round((value / target) * 100), remaining: Math.max(0, Math.round(target - value)), over: value > target }
}

/**
 * Reads a number someone typed, allowing a comma as the decimal mark. Returns null for blank, non-numeric or out of
 * range text, so a typo can never be saved as a value.
 */
export function parseNumber(text: string, min: number, max: number, decimals = 1): number | null {
  const cleaned = text.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < min || value > max) return null
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
