import { describe, expect, it } from 'vitest'
import { addMeal, addWater, DEFAULT_TARGETS, emptyLog, macroKcal, parseNumber, progress } from './nutrition'

describe('daily log', () => {
  it('starts empty for a day', () => {
    expect(emptyLog('2026-11-18')).toEqual({ date: '2026-11-18', waterMl: 0, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, weightKg: null, restingHr: null })
  })

  it('adds water and can take it away, but never below zero or beyond a sane limit', () => {
    const log = addWater(addWater(emptyLog('d'), 250), 500)
    expect(log.waterMl).toBe(750)
    expect(addWater(log, -250).waterMl).toBe(500)
    expect(addWater(log, -5000).waterMl).toBe(0)
    expect(addWater(log, 999_999).waterMl).toBe(20_000)
  })

  it('adds meals to the totals and keeps the vitals', () => {
    const start = { ...emptyLog('d'), weightKg: 80.5, restingHr: 60 }
    const log = addMeal(addMeal(start, { kcal: 600, proteinG: 40, carbsG: 70, fatG: 15 }), { kcal: 250, proteinG: 10.4, carbsG: 30, fatG: 8 })
    expect(log).toMatchObject({ kcal: 850, proteinG: 50, carbsG: 100, fatG: 23, weightKg: 80.5, restingHr: 60 })
  })

  it('ignores negative amounts in a meal so a typo cannot subtract from the day', () => {
    const log = addMeal({ ...emptyLog('d'), kcal: 500, proteinG: 30 }, { kcal: -100, proteinG: -5, carbsG: 20, fatG: 0 })
    expect(log).toMatchObject({ kcal: 500, proteinG: 30, carbsG: 20 })
  })

  it('does not change the log it was given', () => {
    const log = emptyLog('d')
    addWater(log, 250)
    addMeal(log, { kcal: 100, proteinG: 1, carbsG: 1, fatG: 1 })
    expect(log.waterMl).toBe(0)
    expect(log.kcal).toBe(0)
  })
})

describe('macroKcal', () => {
  it('uses 4, 4 and 9 calories per gram', () => {
    expect(macroKcal(140, 260, 70)).toBe(2230)
    expect(macroKcal(0, 0, 0)).toBe(0)
    expect(macroKcal(10, 0, 0)).toBe(40)
    expect(macroKcal(0, 0, 10)).toBe(90)
  })

  it('has default targets that roughly agree with themselves', () => {
    const { kcal, proteinG, carbsG, fatG } = DEFAULT_TARGETS
    expect(Math.abs(macroKcal(proteinG, carbsG, fatG) - kcal) / kcal).toBeLessThan(0.05)
  })
})

describe('progress', () => {
  it('shows how far along a target is', () => {
    expect(progress(1250, 2500)).toEqual({ ratio: 0.5, percent: 50, remaining: 1250, over: false })
  })

  it('caps the bar at full but reports the honest percentage when over', () => {
    expect(progress(3000, 2500)).toEqual({ ratio: 1, percent: 120, remaining: 0, over: true })
  })

  it('copes with a missing target and an empty day', () => {
    expect(progress(100, 0)).toEqual({ ratio: 0, percent: 0, remaining: 0, over: false })
    expect(progress(0, 2500).ratio).toBe(0)
  })
})

describe('parseNumber', () => {
  it.each([
    ['82.5', 82.5],
    ['82,5', 82.5],
    ['  60 ', 60],
    ['0', 0],
    ['82.46', 82.5],
  ])('reads %j as %d', (text, value) => {
    expect(parseNumber(text, 0, 500)).toBe(value)
  })

  it.each(['', 'abc', '-5', '1e3', '80kg', '1.2.3', '501'])('rejects %j', (text) => {
    expect(parseNumber(text, 0, 500)).toBeNull()
  })

  it('applies the minimum and the number of decimals asked for', () => {
    expect(parseNumber('29', 30, 250, 0)).toBeNull()
    expect(parseNumber('62.7', 30, 250, 0)).toBe(63)
  })
})
