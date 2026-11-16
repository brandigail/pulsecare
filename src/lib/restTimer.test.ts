import { describe, expect, it } from 'vitest'
import { adjustRest, formatClock, MAX_REST_SECONDS, MIN_REST_SECONDS, remainingSeconds } from './restTimer'

describe('remainingSeconds', () => {
  it('rounds up so the clock only reads 0:00 when it is truly over', () => {
    expect(remainingSeconds(10_000, 0)).toBe(10)
    expect(remainingSeconds(10_000, 9_001)).toBe(1)
    expect(remainingSeconds(10_000, 9_999)).toBe(1)
    expect(remainingSeconds(10_000, 10_000)).toBe(0)
  })

  it('never goes negative and is zero when no timer is running', () => {
    expect(remainingSeconds(10_000, 20_000)).toBe(0)
    expect(remainingSeconds(null, 5)).toBe(0)
  })

  it('is right after a long gap, as when a phone pauses the page with the screen off', () => {
    expect(remainingSeconds(120_000, 100_000)).toBe(20)
  })
})

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [5, '0:05'],
    [90, '1:30'],
    [600, '10:00'],
    [-3, '0:00'],
    [Number.NaN, '0:00'],
  ])('shows %d s as %s', (seconds, text) => {
    expect(formatClock(seconds)).toBe(text)
  })
})

describe('adjustRest', () => {
  it('moves the rest and keeps it between 15 seconds and 10 minutes', () => {
    expect(adjustRest(90, 15)).toBe(105)
    expect(adjustRest(90, -15)).toBe(75)
    expect(adjustRest(20, -15)).toBe(MIN_REST_SECONDS)
    expect(adjustRest(595, 15)).toBe(MAX_REST_SECONDS)
  })
})
