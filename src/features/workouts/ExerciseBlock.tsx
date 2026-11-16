import { Trash2, Trophy } from 'lucide-react'
import { cardClass, iconButton, mutedText } from '../../components/ui'
import { formatKg } from '../../lib/format'
import type { LastPerformance } from '../../lib/strength'
import { usePulse } from '../../providers/data'
import type { Exercise, SetLog } from '../../types'
import { SetForm } from './SetForm'

interface Props {
  exercise: Exercise
  /** This workout's sets for the exercise, in order. */
  sets: SetLog[]
  last: LastPerformance | null
  sessionId: string
  readOnly: boolean
  /** Exercise ids that set a new record in this workout (shown with a trophy). */
  recordSetIds: ReadonlySet<string>
  onLogged: () => void
}

export function ExerciseBlock({ exercise, sets, last, sessionId, readOnly, recordSetIds, onLogged }: Props) {
  const { deleteSet } = usePulse()
  const lastSet = sets.at(-1)
  const reference = lastSet ?? last?.sets[0]
  const hint = last ? last.sets.map((s) => `${s.reps} × ${formatKg(s.weightKg)}`).join(', ') : null

  return (
    <section className={`${cardClass} space-y-3 p-4`} aria-labelledby={`ex-${exercise.id}`} data-testid={`exercise-${exercise.id}`}>
      <div>
        <h2 id={`ex-${exercise.id}`} className="text-lg font-semibold">
          {exercise.name}
        </h2>
        <p className={`text-xs ${mutedText}`}>
          {exercise.muscleGroup}
          {hint && ` · Last time: ${hint} kg`}
        </p>
      </div>

      {sets.length > 0 && (
        <ol className="space-y-1" aria-label={`Sets of ${exercise.name}`}>
          {sets.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2 rounded-lg bg-slate-50 py-1 pr-1 pl-3 dark:bg-slate-950" data-testid="set-row">
              <span className="w-12 shrink-0 text-sm text-slate-500">Set {i + 1}</span>
              <span className="flex-1 font-medium tabular-nums">
                {s.reps} × {formatKg(s.weightKg)} kg
                {s.rpe !== null && <span className={`ml-2 text-sm font-normal ${mutedText}`}>RPE {s.rpe}</span>}
              </span>
              {recordSetIds.has(s.id) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200" data-testid="record-badge">
                  <Trophy className="size-3.5" aria-hidden /> New record
                </span>
              )}
              {!readOnly && (
                <button type="button" className={iconButton} onClick={() => void deleteSet(s.id)} aria-label={`Delete set ${i + 1} of ${exercise.name}`}>
                  <Trash2 className="size-5" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      {!readOnly && <SetForm key={`${exercise.id}-${sets.length === 0 ? 'first' : 'next'}`} sessionId={sessionId} exercise={exercise} initialReps={reference?.reps ?? 8} initialWeight={reference?.weightKg ?? 20} onLogged={onLogged} />}
    </section>
  )
}
