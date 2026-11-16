import { describe, expect, it } from 'vitest'
import { estimateOneRepMax, lastPerformance, MAX_RELIABLE_REPS, newRecordsIn, personalRecords, progression, setVolume, totalVolume, weeklyVolume } from './strength'
import { session, set } from './testing'

describe('estimateOneRepMax (Epley)', () => {
  it('is the weight itself for a single rep', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100)
  })

  it('adds a thirtieth of the weight for every extra rep', () => {
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.667, 3)
    expect(estimateOneRepMax(80, 10)).toBeCloseTo(106.667, 3)
    expect(estimateOneRepMax(60, 3)).toBeCloseTo(66, 6)
  })

  it('gives a heavier estimate for more reps at the same weight', () => {
    expect((estimateOneRepMax(70, 8) ?? 0) > (estimateOneRepMax(70, 5) ?? 0)).toBe(true)
  })

  it('refuses sets it cannot estimate honestly', () => {
    expect(estimateOneRepMax(0, 10)).toBeNull() // bodyweight set
    expect(estimateOneRepMax(-5, 10)).toBeNull()
    expect(estimateOneRepMax(80, 0)).toBeNull()
    expect(estimateOneRepMax(80, MAX_RELIABLE_REPS + 1)).toBeNull()
    expect(estimateOneRepMax(80, MAX_RELIABLE_REPS)).not.toBeNull()
    expect(estimateOneRepMax(Number.NaN, 5)).toBeNull()
  })
})

describe('volume', () => {
  it('is reps times weight, and never negative', () => {
    expect(setVolume({ reps: 5, weightKg: 100 })).toBe(500)
    expect(setVolume({ reps: -5, weightKg: 100 })).toBe(0)
    expect(totalVolume([{ reps: 5, weightKg: 100 }, { reps: 8, weightKg: 60 }])).toBe(980)
    expect(totalVolume([])).toBe(0)
  })
})

describe('weeklyVolume', () => {
  // 18 November 2026 is a Wednesday, so its week starts on Monday the 16th.
  const today = '2026-11-18'
  const sessions = [
    session('thisWeek', 2026, 11, 16, 0), // Monday just after midnight
    session('lastWeekSunday', 2026, 11, 15, 23), // Sunday night belongs to the week before
    session('lastWeekMonday', 2026, 11, 9),
    session('tooOld', 2026, 10, 20),
  ]
  const sets = [set('thisWeek', 'a', 100, 5), set('thisWeek', 'a', 100, 5), set('lastWeekSunday', 'a', 50, 10), set('lastWeekMonday', 'a', 40, 10), set('tooOld', 'a', 100, 10), set('ghost', 'a', 1000, 10)]
  const weeks = weeklyVolume(sessions, sets, today, 3)

  it('has the requested number of weeks, Monday starts, oldest first', () => {
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-11-02', '2026-11-09', '2026-11-16'])
  })

  it('puts Sunday night in the week that is ending and Monday just after midnight in the new week', () => {
    expect(weeks[2]?.volumeKg).toBe(1000)
    expect(weeks[1]?.volumeKg).toBe(500 + 400)
  })

  it('counts workouts per week, leaves out workouts older than the window and sets from unknown workouts', () => {
    expect(weeks.map((w) => w.workouts)).toEqual([0, 2, 1])
    expect(weeks[0]?.volumeKg).toBe(0)
  })

  it('works across a year boundary', () => {
    const result = weeklyVolume([session('s', 2026, 1, 1)], [set('s', 'a', 100, 1)], '2026-01-03', 2)
    expect(result.map((w) => w.weekStart)).toEqual(['2025-12-22', '2025-12-29'])
    expect(result[1]?.volumeKg).toBe(100)
  })
})

describe('personalRecords', () => {
  const sessions = [session('s1', 2026, 11, 2), session('s2', 2026, 11, 4), session('s3', 2026, 11, 6)]

  it('is the best estimated one-rep max, not the heaviest weight', () => {
    const sets = [set('s1', 'bench', 60, 8), set('s2', 'bench', 70, 5), set('s3', 'bench', 65, 10)]
    const [record] = personalRecords(sets, sessions)
    expect(record).toMatchObject({ exerciseId: 'bench', weightKg: 65, reps: 10, date: '2026-11-06', sessionId: 's3' })
    expect(record?.e1rmKg).toBeCloseTo(86.667, 3)
    expect(record?.heaviestKg).toBe(70)
  })

  it('lets the earlier set keep a tied record', () => {
    const first = set('s1', 'squat', 100, 5)
    const sets = [first, set('s3', 'squat', 100, 5)]
    expect(personalRecords(sets, sessions)[0]?.setId).toBe(first.id)
  })

  it('ignores sets with too many reps and bodyweight sets for the record, but still counts heavy weight', () => {
    const sets = [set('s1', 'row', 40, 20), set('s2', 'pullup', 0, 10)]
    const records = personalRecords(sets, sessions)
    expect(records).toEqual([])
    const withReal = personalRecords([...sets, set('s3', 'row', 50, 5)], sessions)
    expect(withReal).toHaveLength(1)
    expect(withReal[0]?.heaviestKg).toBe(50)
  })

  it('works in time order even when the sets are given shuffled', () => {
    const sets = [set('s3', 'bench', 80, 5), set('s1', 'bench', 60, 5), set('s2', 'bench', 70, 5)]
    expect(personalRecords(sets, sessions)[0]).toMatchObject({ sessionId: 's3', weightKg: 80 })
  })

  it('ranks exercises by their record and is empty with no sets', () => {
    const sets = [set('s1', 'curl', 20, 10), set('s1', 'deadlift', 140, 5)]
    expect(personalRecords(sets, sessions).map((r) => r.exerciseId)).toEqual(['deadlift', 'curl'])
    expect(personalRecords([], sessions)).toEqual([])
  })

  it('is derived each time, so deleting the record set moves the record back', () => {
    const best = set('s3', 'bench', 90, 5)
    const sets = [set('s1', 'bench', 60, 5), best]
    expect(personalRecords(sets, sessions)[0]?.weightKg).toBe(90)
    expect(personalRecords(sets.filter((s) => s.id !== best.id), sessions)[0]?.weightKg).toBe(60)
  })
})

describe('newRecordsIn', () => {
  const sessions = [session('s1', 2026, 11, 2), session('s2', 2026, 11, 4), session('s3', 2026, 11, 6)]

  it('does not call the first time an exercise is logged a record', () => {
    expect(newRecordsIn('s1', [set('s1', 'bench', 60, 5)], sessions)).toEqual([])
  })

  it('finds a set that beats everything before it', () => {
    const sets = [set('s1', 'bench', 60, 5), set('s2', 'bench', 70, 5)]
    const records = newRecordsIn('s2', sets, sessions)
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({ exerciseId: 'bench', weightKg: 70 })
  })

  it('does not count a set that only equals or falls short of the best', () => {
    const sets = [set('s1', 'bench', 70, 5), set('s2', 'bench', 70, 5), set('s2', 'bench', 60, 5)]
    expect(newRecordsIn('s2', sets, sessions)).toEqual([])
  })

  it('returns only the best improvement per exercise when a workout improves twice', () => {
    const sets = [set('s1', 'bench', 60, 5), set('s2', 'bench', 65, 5), set('s2', 'bench', 70, 5)]
    expect(newRecordsIn('s2', sets, sessions).map((r) => r.weightKg)).toEqual([70])
  })

  it('reports several exercises separately and ignores later workouts', () => {
    const sets = [set('s1', 'bench', 60, 5), set('s1', 'squat', 80, 5), set('s2', 'bench', 65, 5), set('s2', 'squat', 90, 5), set('s3', 'bench', 100, 5)]
    expect(newRecordsIn('s2', sets, sessions).map((r) => r.exerciseId).sort()).toEqual(['bench', 'squat'])
  })

  it('ignores sets that cannot be estimated', () => {
    const sets = [set('s1', 'bench', 60, 5), set('s2', 'bench', 200, 30)]
    expect(newRecordsIn('s2', sets, sessions)).toEqual([])
  })
})

describe('progression', () => {
  const sessions = [session('s1', 2026, 11, 2), session('s2', 2026, 11, 4)]

  it('gives one point per workout with the top weight and best estimate', () => {
    const sets = [set('s1', 'bench', 60, 5), set('s1', 'bench', 62.5, 5), set('s2', 'bench', 65, 5), set('s2', 'squat', 100, 5)]
    const points = progression('bench', sets, sessions)
    expect(points.map((p) => [p.date, p.topWeightKg])).toEqual([['2026-11-02', 62.5], ['2026-11-04', 65]])
    expect(points[0]?.e1rmKg).toBeCloseTo(62.5 * (1 + 5 / 30), 6)
  })

  it('keeps the weight but has no estimate when only high-rep or bodyweight sets exist', () => {
    const [point] = progression('row', [set('s1', 'row', 30, 20)], sessions)
    expect(point).toMatchObject({ topWeightKg: 30, e1rmKg: null })
  })

  it('is empty for an exercise never logged', () => {
    expect(progression('nothing', [set('s1', 'bench', 60, 5)], sessions)).toEqual([])
  })
})

describe('lastPerformance', () => {
  const sessions = [session('s1', 2026, 11, 2), session('s2', 2026, 11, 4), session('s3', 2026, 11, 6)]
  const sets = [set('s1', 'bench', 60, 8), set('s2', 'bench', 62.5, 8), set('s2', 'bench', 62.5, 7), set('s3', 'bench', 65, 6)]

  it('returns the sets of the latest earlier workout, in order', () => {
    const before = sessions[2]?.startedAt ?? ''
    expect(lastPerformance('bench', before, sets, sessions)).toEqual({ date: '2026-11-04', sets: [{ reps: 8, weightKg: 62.5 }, { reps: 7, weightKg: 62.5 }] })
  })

  it('is null when there was no earlier workout with that exercise', () => {
    expect(lastPerformance('bench', sessions[0]?.startedAt ?? '', sets, sessions)).toBeNull()
    expect(lastPerformance('squat', sessions[2]?.startedAt ?? '', sets, sessions)).toBeNull()
  })
})
