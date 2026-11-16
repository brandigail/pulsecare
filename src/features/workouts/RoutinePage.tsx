import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { cardClass, dangerButton, errorText, inputClass, mutedText, primaryButton, secondaryButton } from '../../components/ui'
import type { Destination } from '../../hooks/useRoute'
import { usePulse } from '../../providers/data'
import type { Routine } from '../../types'
import { ExercisePicker } from './ExercisePicker'

interface Props {
  /** The id of an existing routine, or "new". */
  id: string
  onGo: (to: Destination) => void
}

function Builder({ initial, isNew, onGo }: { initial: Routine; isNew: boolean; onGo: (to: Destination) => void }) {
  const { exercises, saveRoutine, deleteRoutine } = usePulse()
  const [name, setName] = useState(initial.name)
  const [ids, setIds] = useState(initial.exerciseIds)
  const [picking, setPicking] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const byId = new Map(exercises.map((e) => [e.id, e]))

  const move = (index: number, delta: number) =>
    setIds((list) => {
      const next = [...list]
      const target = index + delta
      if (target < 0 || target >= next.length) return list
      ;[next[index], next[target]] = [next[target] as string, next[index] as string]
      return next
    })

  async function save() {
    const result = await saveRoutine({ id: initial.id, name, exerciseIds: ids })
    if (result.ok) onGo('workouts')
    else setError(result.error)
  }

  return (
    <div className="space-y-4">
      <button type="button" className={secondaryButton} onClick={() => onGo('workouts')}>
        <ArrowLeft className="size-4" aria-hidden /> Workouts
      </button>
      <h1 className="text-2xl font-bold">{isNew ? 'New routine' : 'Edit routine'}</h1>

      <div>
        <label htmlFor="routine-name" className="text-sm font-medium">
          Name
        </label>
        <input id="routine-name" className={inputClass} value={name} maxLength={40} placeholder="Push day" onChange={(e) => setName(e.target.value)} />
      </div>

      <section className={`${cardClass} space-y-3 p-4`} aria-labelledby="routine-exercises">
        <h2 id="routine-exercises" className="text-lg font-semibold">
          Exercises
        </h2>
        {ids.length === 0 ? (
          <p className={`text-sm ${mutedText}`}>No exercises yet. Add the first one.</p>
        ) : (
          <ol className="space-y-2" aria-label="Exercises in this routine">
            {ids.map((id, i) => (
              <li key={id} className="flex items-center gap-1 rounded-xl border border-slate-200 p-2 pl-3 dark:border-slate-800">
                <span className="w-6 shrink-0 text-sm text-slate-500">{i + 1}.</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{byId.get(id)?.name ?? 'Unknown exercise'}</span>
                  <span className={`text-xs ${mutedText}`}>{byId.get(id)?.muscleGroup}</span>
                </span>
                <button type="button" className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${byId.get(id)?.name ?? 'exercise'} up`}>
                  <ArrowUp className="size-5" aria-hidden />
                </button>
                <button type="button" className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800" onClick={() => move(i, 1)} disabled={i === ids.length - 1} aria-label={`Move ${byId.get(id)?.name ?? 'exercise'} down`}>
                  <ArrowDown className="size-5" aria-hidden />
                </button>
                <button type="button" className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setIds((list) => list.filter((x) => x !== id))} aria-label={`Remove ${byId.get(id)?.name ?? 'exercise'}`}>
                  <Trash2 className="size-5" aria-hidden />
                </button>
              </li>
            ))}
          </ol>
        )}
        <button type="button" className={secondaryButton} onClick={() => setPicking(true)} data-testid="add-exercise">
          <Plus className="size-4" aria-hidden /> Add exercise
        </button>
      </section>

      {error && (
        <p role="alert" className={`text-sm ${errorText}`}>
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryButton} onClick={() => void save()} data-testid="save-routine">
          Save routine
        </button>
        {!isNew &&
          (confirming ? (
            <button
              type="button"
              className={dangerButton}
              onClick={() => {
                void deleteRoutine(initial.id)
                onGo('workouts')
              }}
              onBlur={() => setConfirming(false)}
              autoFocus
            >
              Confirm delete
            </button>
          ) : (
            <button type="button" className={secondaryButton} onClick={() => setConfirming(true)}>
              <Trash2 className="size-4" aria-hidden /> Delete routine
            </button>
          ))}
      </div>
      {!isNew && <p className={`text-sm ${mutedText}`}>Deleting a routine keeps the workouts you did with it.</p>}

      <ExercisePicker
        open={picking}
        exclude={ids}
        onPick={(exercise) => {
          setIds((list) => (list.includes(exercise.id) ? list : [...list, exercise.id]))
          setPicking(false)
        }}
        onClose={() => setPicking(false)}
      />
    </div>
  )
}

export function RoutinePage({ id, onGo }: Props) {
  const { routines } = usePulse()
  const existing = routines.find((r) => r.id === id)
  const [fresh] = useState<Routine>(() => ({ id: crypto.randomUUID(), name: '', exerciseIds: [] }))

  if (id !== 'new' && !existing) {
    return (
      <section className={`${cardClass} space-y-3 p-6 text-center`}>
        <h1 className="text-xl font-bold">Routine not found</h1>
        <p className={mutedText}>It may have been deleted.</p>
        <button type="button" className={secondaryButton} onClick={() => onGo('workouts')}>
          Back to workouts
        </button>
      </section>
    )
  }
  return <Builder key={existing?.id ?? 'new'} initial={existing ?? fresh} isNew={id === 'new'} onGo={onGo} />
}
