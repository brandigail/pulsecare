import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, formatDate, isDateKey, lastDays, startOfWeek, toDateKey, weekdayIndex } from './date'

describe('toDateKey', () => {
  it('uses the local calendar day, zero padded', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(toDateKey(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31')
  })
})

describe('isDateKey', () => {
  it('accepts real days and rejects impossible ones', () => {
    expect(isDateKey('2026-02-28')).toBe(true)
    expect(isDateKey('2028-02-29')).toBe(true)
    expect(isDateKey('2026-02-29')).toBe(false)
    expect(isDateKey('2026-13-01')).toBe(false)
    expect(isDateKey('2026-1-1')).toBe(false)
    expect(isDateKey('not a date')).toBe(false)
  })
})

describe('addDays', () => {
  it('rolls over months, years and leap days', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('is exact across daylight saving changes in any zone', () => {
    // US spring forward is 8 March 2026 and fall back is 1 November 2026; Europe changes on 29 March and 25 October.
    for (const [start, days] of [['2026-03-07', 3], ['2026-10-31', 3], ['2026-03-28', 3], ['2026-10-24', 3]] as const) {
      const keys = Array.from({ length: days + 1 }, (_, i) => addDays(start, i))
      expect(new Set(keys).size).toBe(days + 1)
      expect(daysBetween(start, keys[days] ?? start)).toBe(days)
    }
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
  })
})

describe('daysBetween', () => {
  it('counts whole days in both directions', () => {
    expect(daysBetween('2026-03-01', '2026-03-01')).toBe(0)
    expect(daysBetween('2026-03-01', '2026-03-31')).toBe(30)
    expect(daysBetween('2026-03-31', '2026-03-01')).toBe(-30)
    expect(daysBetween('2025-12-31', '2026-12-31')).toBe(365)
  })
})

describe('weekdays', () => {
  it('starts the week on Monday', () => {
    expect(weekdayIndex('2026-11-16')).toBe(0) // a Monday
    expect(weekdayIndex('2026-11-22')).toBe(6) // a Sunday
    expect(startOfWeek('2026-11-19')).toBe('2026-11-16')
    expect(startOfWeek('2026-11-16')).toBe('2026-11-16')
    expect(startOfWeek('2026-11-22')).toBe('2026-11-16')
  })
})

describe('lastDays and formatDate', () => {
  it('lists days oldest first, ending on the given day', () => {
    expect(lastDays('2026-03-02', 4)).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02'])
  })

  it('formats a day for display', () => {
    expect(formatDate('2026-11-16')).toBe('Mon 16 Nov 2026')
  })
})
