import { useId, useState } from 'react'
import { NumberField } from '../../components/NumberField'
import { errorText, inputClass, primaryButton } from '../../components/ui'
import { parseNumber } from '../../lib/nutrition'
import { usePulse } from '../../providers/data'
import type { Exercise } from '../../types'

interface Props {
  sessionId: string
  exercise: Exercise
  /** What the boxes start with: the previous set, or what was done last time. */
  initialReps: number
  initialWeight: number
  onLogged: () => void
}

/** Logs one set. The boxes keep their values after logging, because the next set is usually the same. */
export function SetForm({ sessionId, exercise, initialReps, initialWeight, onLogged }: Props) {
  const { logSet } = usePulse()
  const rpeId = useId()
  const [reps, setReps] = useState(String(initialReps))
  const [weight, setWeight] = useState(String(initialWeight))
  const [rpe, setRpe] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const repsValue = parseNumber(reps, 1, 100, 0)
    const weightValue = parseNumber(weight === '' ? '0' : weight, 0, 1000, 2)
    if (repsValue === null) return setError('Reps must be a whole number from 1 to 100.')
    if (weightValue === null) return setError('Weight must be from 0 to 1000 kg. Use 0 for bodyweight.')
    const result = await logSet({ sessionId, exerciseId: exercise.id, reps: repsValue, weightKg: weightValue, rpe: rpe === '' ? null : Number(rpe) })
    if (result.ok) {
      setError(null)
      onLogged()
    } else setError(result.error)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      className="space-y-3"
      aria-label={`Log a set of ${exercise.name}`}
    >
      <div className="grid grid-cols-3 gap-2">
        <NumberField label="Reps" decimal={false} value={reps} onChange={setReps} />
        <NumberField label="Weight" unit="kg" value={weight} onChange={setWeight} />
        <div>
          <label htmlFor={rpeId} className="text-sm font-medium">
            Effort
          </label>
          <select id={rpeId} className={inputClass} value={rpe} onChange={(e) => setRpe(e.target.value)}>
            <option value="">RPE –</option>
            {[6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                RPE {n}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button type="submit" className={primaryButton} data-testid={`log-${exercise.id}`}>
        Log set
      </button>
      {error && (
        <p role="alert" className={`text-sm ${errorText}`}>
          {error}
        </p>
      )}
    </form>
  )
}
