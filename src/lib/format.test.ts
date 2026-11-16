import { describe, expect, it } from 'vitest'
import { formatDay, formatKg, formatMinutes, formatShortDay } from './format'

describe('formatKg', () => {
  it.each([
    [80, '80'],
    [82.5, '82.5'],
    [82.54, '82.5'],
    [1240, '1 240'],
    [1234567, '1 234 567'],
    [0, '0'],
    [Number.NaN, '0'],
  ])('shows %d as %j', (kg, text) => {
    expect(formatKg(kg)).toBe(text)
  })
})

describe('formatMinutes', () => {
  it('shows minutes under an hour and hours with padded minutes after that', () => {
    expect(formatMinutes(45 * 60)).toBe('45 min')
    expect(formatMinutes(65 * 60)).toBe('1 h 05 min')
    expect(formatMinutes(0)).toBe('0 min')
  })
})

describe('days', () => {
  it('formats a day with and without the weekday', () => {
    expect(formatDay('2026-11-16')).toBe('Mon 16 Nov')
    expect(formatShortDay('2026-11-16')).toBe('16 Nov')
    expect(formatDay('nonsense')).toBe('')
  })
})
