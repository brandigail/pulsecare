import { ArrowLeft, CheckCircle2, Plus, Trash2, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cardClass, dangerButton, mutedText, primaryButton, secondaryButton } from '../../components/ui'
import { useElapsed } from '../../hooks/useElapsed'
import { useRestTimer } from '../../hooks/useRestTimer'
import type { Destination } from '../../hooks/useRoute'
import { formatDay, formatKg, formatMinutes } from '../../lib/format'
import { formatClock } from '../../lib/restTimer'
import { dayOf, lastPerformance, newRecordsIn, totalVolume } from '../../lib/strength'
import { usePulse } from '../../providers/data'
import { ExerciseBlock } from './ExerciseBlock'
import { ExercisePicker } from './ExercisePicker'
import { RestBar } from './RestBar'

export function SessionPage({ id, onGo }: { id: string; onGo: (to: Destination) => void }) {
  const { sessions, sets, exercises, routines, settings, finishWorkout, discardWorkout } = usePulse()
  const timer = useRestTimer()
  const [extra, setExtra] = useState<string[]>([])
  const [picking, setPicking] = useState(false)
  const [confirm, setConfirm] = useState<'finish' | 'discard' | 'delete' | null>(null)
  const session = sessions.find((s) => s.id === id)
  const readOnly = session?.endedAt !== null
  const elapsed = useElapsed(session?.startedAt ?? null, session !== undefined && !readOnly)

  const mine = useMemo(() => sets.filter((s) => s.sessionId === id).sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)), [sets, id])
  const records = useMemo(() => (readOnly ? newRecordsIn(id, sets, sessions) : []), [readOnly, id, sets, sessions])

  if (!session) {
    return (
      <section className={`${cardClass} space-y-3 p-6 text-center`}>
        <h1 className="text-xl font-bold">Workout not found</h1>
        <p className={mutedText}>It may have been deleted.</p>
        <button type="button" className={secondaryButton} onClick={() => onGo('workouts')}>
          Back to workouts
        </button>
      </section>
    )
  }

  const routine = routines.find((r) => r.id === session.routineId)
  const byId = new Map(exercises.map((e) => [e.id, e]))
  // The routine's exercises first, then anything else that was logged or added in this workout.
  const order = [...new Set([...(routine?.exerciseIds ?? []), ...mine.map((s) => s.exerciseId), ...extra])].filter((exerciseId) => byId.has(exerciseId))
  const recordSetIds = new Set(records.map((r) => r.setId))
  const duration = readOnly ? (Date.parse(session.endedAt ?? session.startedAt) - Date.parse(session.startedAt)) / 1000 : elapsed
  const title = routine?.name ?? 'Quick workout'

  return (
    <div className="space-y-4 pb-24">
      <button type="button" className={secondaryButton} onClick={() => onGo('workouts')}>
        <ArrowLeft className="size-4" aria-hidden /> Workouts
      </button>
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className={`text-sm ${mutedText}`} data-testid="session-summary">
          {formatDay(dayOf(session))} · {readOnly ? formatMinutes(duration) : formatClock(duration)} · {mine.length} sets · {formatKg(totalVolume(mine))} kg lifted
        </p>
      </div>

      {readOnly && records.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40" aria-labelledby="records-heading" data-testid="records-panel">
          <h2 id="records-heading" className="flex items-center gap-2 text-lg font-semibold">
            <Trophy className="size-5 text-amber-600" aria-hidden /> New personal records
          </h2>
          <ul className="mt-2 space-y-1">
            {records.map((r) => (
              <li key={r.setId} className="text-sm">
                <strong>{byId.get(r.exerciseId)?.name}</strong>: {r.reps} × {formatKg(r.weightKg)} kg, an estimated one-rep max of {formatKg(r.e1rmKg)} kg
              </li>
            ))}
          </ul>
        </section>
      )}

      {order.length === 0 && <p className={mutedText}>No exercises yet. Add one to start logging sets.</p>}
      {order.map((exerciseId) => {
        const exercise = byId.get(exerciseId)
        if (!exercise) return null
        return (
          <ExerciseBlock
            key={exerciseId}
            exercise={exercise}
            sets={mine.filter((s) => s.exerciseId === exerciseId)}
            last={lastPerformance(exerciseId, session.startedAt, sets, sessions)}
            sessionId={session.id}
            readOnly={readOnly}
            recordSetIds={recordSetIds}
            onLogged={() => timer.start(settings.restSeconds)}
          />
        )
      })}

      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryButton} onClick={() => setPicking(true)} data-testid="add-exercise">
            <Plus className="size-4" aria-hidden /> Add exercise
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        {!readOnly &&
          (confirm === 'finish' ? (
            <>
              <button
                type="button"
                className={primaryButton}
                onClick={() => {
                  timer.dismiss()
                  void finishWorkout(session.id)
                  setConfirm(null)
                }}
                data-testid="confirm-finish"
              >
                <CheckCircle2 className="size-4" aria-hidden /> Yes, finish
              </button>
              <button type="button" className={secondaryButton} onClick={() => setConfirm(null)}>
                Keep going
              </button>
            </>
          ) : (
            <button type="button" className={primaryButton} onClick={() => setConfirm('finish')} data-testid="finish-workout" disabled={mine.length === 0}>
              <CheckCircle2 className="size-4" aria-hidden /> Finish workout
            </button>
          ))}
        {confirm === 'discard' || confirm === 'delete' ? (
          <button
            type="button"
            className={dangerButton}
            onClick={() => {
              timer.dismiss()
              void discardWorkout(session.id)
              onGo('workouts')
            }}
            onBlur={() => setConfirm(null)}
            autoFocus
            data-testid="confirm-discard"
          >
            Confirm {confirm === 'delete' ? 'delete' : 'discard'}
          </button>
        ) : (
          <button type="button" className={secondaryButton} onClick={() => setConfirm(readOnly ? 'delete' : 'discard')} data-testid="discard-workout">
            <Trash2 className="size-4" aria-hidden /> {readOnly ? 'Delete workout' : 'Discard workout'}
          </button>
        )}
      </div>
      {!readOnly && mine.length === 0 && <p className={`text-sm ${mutedText}`}>Log at least one set to finish the workout, or discard it.</p>}

      {(timer.running || timer.finished) && <RestBar finished={timer.finished} remaining={timer.remaining} total={timer.total} onAdjust={timer.adjust} onDismiss={timer.dismiss} />}

      <ExercisePicker
        open={picking}
        exclude={order}
        onPick={(exercise) => {
          setExtra((list) => (list.includes(exercise.id) ? list : [...list, exercise.id]))
          setPicking(false)
        }}
        onClose={() => setPicking(false)}
      />
    </div>
  )
}
