import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ProgressPoint, WeekVolume } from '../../lib/strength'
import { formatKg, formatShortDay } from '../../lib/format'

const GRID = { stroke: '#94a3b8', strokeOpacity: 0.35 }

export function WeeklyVolumeChart({ weeks }: { weeks: readonly WeekVolume[] }) {
  const data = weeks.map((w) => ({ week: formatShortDay(w.weekStart), kg: w.volumeKg }))
  const summary = `Weekly volume for the last ${weeks.length} weeks, from ${formatKg(Math.min(...weeks.map((w) => w.volumeKg)))} to ${formatKg(Math.max(...weeks.map((w) => w.volumeKg)))} kg.`
  return (
    <div className="h-56 w-full" role="img" aria-label={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" {...GRID} />
          <XAxis dataKey="week" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} width={52} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))} />
          <Tooltip formatter={(value) => [`${formatKg(Number(value))} kg`, 'Volume']} labelFormatter={(label) => `Week of ${label}`} />
          <Bar dataKey="kg" fill="#be123c" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ExerciseProgressChart({ points, name }: { points: readonly ProgressPoint[]; name: string }) {
  const data = points.map((p) => ({ day: formatShortDay(p.date), top: p.topWeightKg, e1rm: p.e1rmKg === null ? null : Math.round(p.e1rmKg * 10) / 10 }))
  const first = points[0]
  const last = points.at(-1)
  const summary = first && last ? `${name}: top weight went from ${formatKg(first.topWeightKg)} to ${formatKg(last.topWeightKg)} kg over ${points.length} workouts.` : `${name}: no data yet.`
  return (
    <div className="h-56 w-full" role="img" aria-label={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" {...GRID} />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fontSize: 12 }} width={44} tickFormatter={(v: number) => String(Math.round(v))} />
          <Tooltip formatter={(value, series) => [`${formatKg(Number(value))} kg`, series === 'top' ? 'Top weight' : 'Estimated 1RM']} />
          <Legend formatter={(value) => (value === 'top' ? 'Top weight' : 'Estimated 1RM')} />
          <Line type="monotone" dataKey="top" stroke="#be123c" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
          <Line type="monotone" dataKey="e1rm" stroke="#0369a1" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2 }} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export interface VitalPoint {
  day: string
  value: number | null
}

export function VitalsChart({ points, label, unit, color }: { points: readonly VitalPoint[]; label: string; unit: string; color: string }) {
  const data = points.map((p) => ({ day: formatShortDay(p.day), value: p.value }))
  const values = points.flatMap((p) => (p.value === null ? [] : [p.value]))
  const summary = values.length > 0 ? `${label} over ${points.length} days, from ${values[0]} to ${values.at(-1)} ${unit}.` : `${label}: no readings yet.`
  return (
    <div className="h-56 w-full" role="img" aria-label={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" {...GRID} />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={28} />
          <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 12 }} width={44} tickFormatter={(v: number) => String(Math.round(v * 10) / 10)} />
          <Tooltip formatter={(value) => [`${value} ${unit}`, label]} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 2.5 }} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
