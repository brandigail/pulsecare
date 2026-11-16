import { Plus, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cardClass, errorText, iconButton, inputClass, mutedText, primaryButton, secondaryButton } from '../../components/ui'
import { MUSCLE_GROUPS } from '../../data/exercises'
import { usePulse } from '../../providers/data'
import type { Exercise } from '../../types'

interface Props {
  open: boolean
  /** Exercises to leave out, for example ones already in the routine. */
  exclude?: readonly string[]
  onPick: (exercise: Exercise) => void
  onClose: () => void
}

/** A window to find an exercise by name or muscle group, or add one of your own. */
export function ExercisePicker({ open, exclude = [], onPick, onClose }: Props) {
  const { exercises, addExercise } = usePulse()
  const ref = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('all')
  const [name, setName] = useState('')
  const [newGroup, setNewGroup] = useState<string>(MUSCLE_GROUPS[0])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const shown = useMemo(() => {
    const text = query.trim().toLowerCase()
    return exercises.filter((e) => !exclude.includes(e.id) && (group === 'all' || e.muscleGroup === group) && (!text || e.name.toLowerCase().includes(text)))
  }, [exercises, exclude, group, query])

  async function create() {
    const result = await addExercise(name, newGroup)
    if (result.ok) {
      setName('')
      setError(null)
      onPick(result.value)
    } else setError(result.error)
  }

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="picker-title" className={`${cardClass} m-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-1.5rem))] overflow-y-auto p-0 text-slate-900 backdrop:bg-black/50 dark:text-slate-100`}>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 id="picker-title" className="text-lg font-semibold">
            Choose an exercise
          </h2>
          <button type="button" className={iconButton} onClick={() => ref.current?.close()} aria-label="Close">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div>
            <label htmlFor="picker-search" className="sr-only">
              Search exercises
            </label>
            <input id="picker-search" type="search" className={`${inputClass} mt-0`} placeholder="Search exercises" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div>
            <label htmlFor="picker-group" className="sr-only">
              Muscle group
            </label>
            <select id="picker-group" className={`${inputClass} mt-0 w-auto`} value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="all">All groups</option>
              {MUSCLE_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
        {shown.length === 0 ? (
          <p className={`text-sm ${mutedText}`}>No exercise matches. You can add it below.</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto" aria-label="Exercises">
            {shown.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => onPick(e)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800">
                  <span className="font-medium">{e.name}</span>
                  <span className={`text-xs ${mutedText}`}>{e.muscleGroup}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          <p className="text-sm font-medium">Not in the list? Add your own</p>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div>
              <label htmlFor="custom-name" className="sr-only">
                New exercise name
              </label>
              <input id="custom-name" className={`${inputClass} mt-0`} placeholder="Exercise name" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="custom-group" className="sr-only">
                Muscle group for the new exercise
              </label>
              <select id="custom-group" className={`${inputClass} mt-0 w-auto`} value={newGroup} onChange={(e) => setNewGroup(e.target.value)}>
                {MUSCLE_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" className={primaryButton} onClick={() => void create()}>
              <Plus className="size-4" aria-hidden /> Add exercise
            </button>
            <button type="button" className={secondaryButton} onClick={() => ref.current?.close()}>
              Cancel
            </button>
          </div>
          {error && (
            <p role="alert" className={`text-sm ${errorText}`}>
              {error}
            </p>
          )}
        </div>
      </div>
    </dialog>
  )
}
