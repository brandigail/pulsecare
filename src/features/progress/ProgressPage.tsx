import { Trophy } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { cardClass, chipClass, inputClass, mutedText } from '../../components/ui'
import { addDays } from '../../lib/date'
import { formatKg, formatShortDay } from '../../lib/format'
import { personalRecords, progression, totalVolume, weeklyVolume } from '../../lib/strength'
import { usePulse } from '../../providers/data'

// The charting library is the biggest part of the app, so the charts load only when this screen is opened.
const WeeklyVolumeChart = lazy(() => import('./ProgressCharts').then((m) => ({ default: m.WeeklyVolumeChart })))
const ExerciseProgressChart = lazy(() => import('./ProgressCharts').then((m) => ({ default: m.ExerciseProgressChart })))
const VitalsChart = lazy(() => import('./ProgressCharts').then((m) => ({ default: m.VitalsChart })))

const WEEKS = 8
const VITAL_DAYS = 42

function Tile({ label, value, note, id }: { label: string; value: string; note?: string; id: string }) {
  return (
    <div className={`${cardClass} p-3`}>
      <dt className={`text-xs ${mutedText}`}>{label}</dt>
      <dd className="text-xl font-bold tabular-nums" data-testid={id}>
        {value}
      </dd>
      {note && <dd className={`text-xs ${mutedText}`}>{note}</dd>}
    </div>
  )
}

export function ProgressPage() {
  const { sessions, sets, exercises, logs, today } = usePulse()
  const [exerciseId, setExerciseId] = useState<string | null>(null)
  const [vital, setVital] = useState<'weight' | 'hr'>('weight')
  const names = useMemo(() => new Map(exercises.map((e) => [e.id, e.name])), [exercises])

  const weeks = useMemo(() => weeklyVolume(sessions, sets, today, WEEKS), [sessions, sets, today])
  const records = useMemo(() => personalRecords(sets, sessions), [sets, sessions])
  const logged = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of sets) counts.set(s.exerciseId, (counts.get(s.exerciseId) ?? 0) + 1)
    return [...counts].sort((a, b) => b[1] - a[1]).map(([id]) => id).filter((id) => names.has(id))
  }, [sets, names])
  const chosen = exerciseId !== null && logged.includes(exerciseId) ? exerciseId : (logged[0] ?? null)
  const points = useMemo(() => (chosen ? progression(chosen, sets, sessions) : []), [chosen, sets, sessions])

  const vitals = useMemo(() => {
    const from = addDays(today, -(VITAL_DAYS - 1))
    return logs.filter((l) => l.date >= from).map((l) => ({ day: l.date, value: vital === 'weight' ? l.weightKg : l.restingHr }))
  }, [logs, today, vital])
  const withValue = vitals.filter((p) => p.value !== null)

  const thisWeek = weeks.at(-1)
  const lastWeek = weeks.at(-2)
  const change = thisWeek && lastWeek && lastWeek.volumeKg > 0 ? Math.round(((thisWeek.volumeKg - lastWeek.volumeKg) / lastWeek.volumeKg) * 100) : null
  const latestWeight = [...logs].reverse().find((l) => l.weightKg !== null)?.weightKg ?? null
  const firstWeight = logs.find((l) => l.weightKg !== null)?.weightKg ?? null

  if (sessions.length === 0 && logs.length === 0) {
    return (
      <section className={`${cardClass} p-6 text-center`}>
        <h1 className="text-xl font-bold">Progress</h1>
        <p className={`mt-2 ${mutedText}`}>Log a workout or a day of food and vitals and your charts appear here.</p>
      </section>
    )
  }

  return (
    <section className="space-y-5" aria-labelledby="progress-heading">
      <h1 id="progress-heading" className="text-2xl font-bold">
        Progress
      </h1>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile id="tile-workouts" label="Workouts this week" value={String(thisWeek?.workouts ?? 0)} note={`${sessions.filter((s) => s.endedAt !== null).length} in total`} />
        <Tile id="tile-volume" label="Volume this week" value={`${formatKg(thisWeek?.volumeKg ?? 0)} kg`} note={change === null ? 'No week to compare with' : `${change >= 0 ? '+' : ''}${change}% on last week`} />
        <Tile id="tile-records" label="Exercises with a record" value={String(records.length)} note={`${formatKg(totalVolume(sets))} kg lifted overall`} />
        <Tile id="tile-weight" label="Body weight" value={latestWeight === null ? '–' : `${formatKg(latestWeight)} kg`} note={latestWeight !== null && firstWeight !== null ? `${latestWeight - firstWeight >= 0 ? '+' : ''}${formatKg(Math.round((latestWeight - firstWeight) * 10) / 10)} kg since the first reading` : undefined} />
      </dl>

      <section className={`${cardClass} space-y-2 p-4`} aria-labelledby="volume-heading">
        <h2 id="volume-heading" className="text-lg font-semibold">
          Weekly volume
        </h2>
        <p className={`text-sm ${mutedText}`}>Total weight lifted (reps × kg) each week, Monday to Sunday.</p>
        <Suspense fallback={<p className={`text-sm ${mutedText}`}>Loading the chart…</p>}>
          <WeeklyVolumeChart weeks={weeks} />
        </Suspense>
      </section>

      <section className={`${cardClass} space-y-3 p-4`} aria-labelledby="progression-heading">
        <h2 id="progression-heading" className="text-lg font-semibold">
          Exercise progression
        </h2>
        {chosen ? (
          <>
            <div>
              <label htmlFor="progress-exercise" className="text-sm font-medium">
                Exercise
              </label>
              <select id="progress-exercise" className={`${inputClass} max-w-xs`} value={chosen} onChange={(e) => setExerciseId(e.target.value)}>
                {logged.map((id) => (
                  <option key={id} value={id}>
                    {names.get(id)}
                  </option>
                ))}
              </select>
            </div>
            <Suspense fallback={<p className={`text-sm ${mutedText}`}>Loading the chart…</p>}>
              <ExerciseProgressChart points={points} name={names.get(chosen) ?? ''} />
            </Suspense>
          </>
        ) : (
          <p className={`text-sm ${mutedText}`}>Log some sets and the weight you lift will be charted here.</p>
        )}
      </section>

      <section className={`${cardClass} space-y-3 p-4`} aria-labelledby="records-heading">
        <h2 id="records-heading" className="flex items-center gap-2 text-lg font-semibold">
          <Trophy className="size-5 text-amber-600" aria-hidden /> Personal records
        </h2>
        <p className={`text-sm ${mutedText}`}>Worked out from your logged sets as an estimated one-rep max (weight × (1 + reps ÷ 30)), using sets of up to 12 reps.</p>
        {records.length === 0 ? (
          <p className={`text-sm ${mutedText}`}>No records yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800" aria-label="Personal records">
            {records.map((r) => (
              <li key={r.exerciseId} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2" data-testid="record-row">
                <span className="font-medium">{names.get(r.exerciseId) ?? 'Exercise'}</span>
                <span className="tabular-nums">
                  <strong>{formatKg(r.e1rmKg)} kg</strong> <span className={`text-sm ${mutedText}`}>from {r.reps} × {formatKg(r.weightKg)} kg, {formatShortDay(r.date)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${cardClass} space-y-3 p-4`} aria-labelledby="vitals-chart-heading">
        <h2 id="vitals-chart-heading" className="text-lg font-semibold">
          Vitals trend
        </h2>
        <div className="flex gap-2" role="group" aria-label="Which vital to chart">
          <button type="button" className={chipClass(vital === 'weight')} aria-pressed={vital === 'weight'} onClick={() => setVital('weight')}>
            Weight
          </button>
          <button type="button" className={chipClass(vital === 'hr')} aria-pressed={vital === 'hr'} onClick={() => setVital('hr')}>
            Resting heart rate
          </button>
        </div>
        {withValue.length >= 2 ? (
          <Suspense fallback={<p className={`text-sm ${mutedText}`}>Loading the chart…</p>}>
            <VitalsChart points={vitals} label={vital === 'weight' ? 'Weight' : 'Resting heart rate'} unit={vital === 'weight' ? 'kg' : 'bpm'} color={vital === 'weight' ? '#be123c' : '#0369a1'} />
          </Suspense>
        ) : (
          <p className={`text-sm ${mutedText}`}>Log your {vital === 'weight' ? 'weight' : 'resting heart rate'} on at least two days to see a trend.</p>
        )}
      </section>
    </section>
  )
}
