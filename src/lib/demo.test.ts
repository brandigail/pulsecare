import { describe, expect, it } from 'vitest'
import { EXERCISE_LIBRARY } from '../data/exercises'
import { addDays, daysBetween, toDateKey } from './date'
import { buildDemo, DEMO_DAYS } from './demo'
import { macroKcal } from './nutrition'
import { personalRecords, progression, weeklyVolume } from './strength'

const today = '2026-11-18' // a Wednesday
const demo = buildDemo(today)
const known = new Set(EXERCISE_LIBRARY.map((e) => e.id))

describe('buildDemo', () => {
  it('is identical every time', () => {
    expect(buildDemo(today)).toEqual(demo)
  })

  it('has a daily log for each of the last 42 days, one per day, none in the future', () => {
    expect(demo.logs).toHaveLength(DEMO_DAYS)
    expect(new Set(demo.logs.map((l) => l.date)).size).toBe(DEMO_DAYS)
    expect(demo.logs.every((l) => l.date <= today && daysBetween(l.date, today) < DEMO_DAYS)).toBe(true)
  })

  it('has about three workouts a week for six weeks, all finished, none today or later', () => {
    expect(demo.sessions.length).toBeGreaterThanOrEqual(15)
    expect(demo.sessions.length).toBeLessThanOrEqual(24)
    expect(demo.sessions.every((s) => s.endedAt !== null && toDateKey(new Date(s.startedAt)) < today)).toBe(true)
    expect(new Set(demo.sessions.map((s) => s.id)).size).toBe(demo.sessions.length)
  })

  it('only uses real exercises, routines and workouts, with sensible sets', () => {
    const sessionIds = new Set(demo.sessions.map((s) => s.id))
    const routineIds = new Set(demo.routines.map((r) => r.id))
    expect(demo.routines.flatMap((r) => r.exerciseIds).every((id) => known.has(id))).toBe(true)
    expect(demo.sessions.every((s) => s.routineId !== null && routineIds.has(s.routineId))).toBe(true)
    for (const set of demo.sets) {
      expect(known.has(set.exerciseId)).toBe(true)
      expect(sessionIds.has(set.sessionId)).toBe(true)
      expect(set.reps).toBeGreaterThanOrEqual(3)
      expect(set.weightKg).toBeGreaterThan(0)
      expect(set.rpe === null || (set.rpe >= 1 && set.rpe <= 10)).toBe(true)
    }
    expect(new Set(demo.sets.map((s) => s.id)).size).toBe(demo.sets.length)
  })

  it('logs sets in order within each workout, finishing after the last set', () => {
    for (const session of demo.sessions) {
      const times = demo.sets.filter((s) => s.sessionId === session.id).map((s) => Date.parse(s.loggedAt))
      expect(times).toEqual([...times].sort((a, b) => a - b))
      expect(Math.min(...times)).toBeGreaterThan(Date.parse(session.startedAt))
      expect(Date.parse(session.endedAt ?? '')).toBeGreaterThan(Math.max(...times))
    }
  })

  it('has food logs where the calories match the macros, apart from today which is partly filled', () => {
    for (const log of demo.logs.filter((l) => l.date !== today)) {
      expect(log.kcal).toBe(macroKcal(log.proteinG, log.carbsG, log.fatG))
      expect(log.kcal).toBeGreaterThan(1700)
      expect(log.kcal).toBeLessThan(3200)
      expect(log.waterMl).toBeGreaterThanOrEqual(1800)
    }
    const current = demo.logs.find((l) => l.date === today)
    expect(current?.waterMl).toBe(750)
    expect(current?.weightKg).toBeNull()
  })

  it('has weight drifting down and resting heart rate drifting down, with some days missing', () => {
    const weights = demo.logs.filter((l) => l.weightKg !== null).map((l) => l.weightKg as number)
    const first = weights.slice(0, 6).reduce((a, b) => a + b, 0) / 6
    const last = weights.slice(-6).reduce((a, b) => a + b, 0) / 6
    expect(last).toBeLessThan(first)
    expect(weights.length).toBeLessThan(DEMO_DAYS - 3)
    const rates = demo.logs.filter((l) => l.restingHr !== null).map((l) => l.restingHr as number)
    expect(rates.length).toBeGreaterThan(15)
    expect(rates.every((r) => r >= 52 && r <= 68)).toBe(true)
  })

  it('shows progressive overload and produces real records and weekly volume for the charts', () => {
    const bench = progression('bench-press', demo.sets, demo.sessions)
    expect(bench.length).toBeGreaterThanOrEqual(5)
    expect(bench.at(-1)?.topWeightKg ?? 0).toBeGreaterThan(bench[0]?.topWeightKg ?? 0)
    const records = personalRecords(demo.sets, demo.sessions)
    expect(records.length).toBeGreaterThanOrEqual(10)
    expect(records.every((r) => known.has(r.exerciseId) && r.e1rmKg > r.weightKg - 0.001)).toBe(true)
    const weeks = weeklyVolume(demo.sessions, demo.sets, today, 6)
    expect(weeks).toHaveLength(6)
    expect(weeks.filter((w) => w.volumeKg > 0).length).toBeGreaterThanOrEqual(5)
    expect(weeks[5]?.weekStart).toBe(addDays('2026-11-16', 0))
  })
})
