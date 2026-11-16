import { progress } from '../lib/nutrition'
import { mutedText } from './ui'

interface Props {
  label: string
  value: number
  target: number
  unit: string
  color?: string
  testId?: string
}

/** A labelled bar showing how far a day is towards a target, and saying so honestly when it goes over. */
export function Meter({ label, value, target, unit, color = 'bg-rose-600', testId }: Props) {
  const p = progress(value, target)
  return (
    <div data-testid={testId}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">
          {Math.round(value).toLocaleString('en-GB').replace(/,/g, ' ')} / {Math.round(target).toLocaleString('en-GB').replace(/,/g, ' ')} {unit}
        </span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.round(value)}>
        <div className={`h-full rounded-full transition-[width] ${p.over ? 'bg-amber-500' : color}`} style={{ width: `${p.ratio * 100}%` }} />
      </div>
      <p className={`mt-0.5 text-xs ${mutedText}`}>{p.over ? `${p.percent}% of the target` : `${p.remaining.toLocaleString('en-GB').replace(/,/g, ' ')} ${unit} to go`}</p>
    </div>
  )
}
