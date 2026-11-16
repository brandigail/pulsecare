import { HeartPulse } from 'lucide-react'
import { useState } from 'react'
import { NumberField } from '../../components/NumberField'
import { cardClass, errorText, mutedText, secondaryButton } from '../../components/ui'
import { parseNumber } from '../../lib/nutrition'
import { usePulse } from '../../providers/data'
import type { DailyLog } from '../../types'

export function VitalsCard({ log }: { log: DailyLog }) {
  const { saveLog } = usePulse()
  const [weight, setWeight] = useState(log.weightKg === null ? '' : String(log.weightKg))
  const [hr, setHr] = useState(log.restingHr === null ? '' : String(log.restingHr))
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  async function save() {
    const weightKg = weight.trim() === '' ? null : parseNumber(weight, 20, 400, 1)
    const restingHr = hr.trim() === '' ? null : parseNumber(hr, 25, 250, 0)
    if ((weight.trim() !== '' && weightKg === null) || (hr.trim() !== '' && restingHr === null)) {
      setMessage({ text: 'Weight must be 20 to 400 kg and resting heart rate 25 to 250 beats a minute.', error: true })
      return
    }
    const result = await saveLog({ ...log, weightKg, restingHr })
    setMessage(result.ok ? { text: 'Saved.', error: false } : { text: result.error, error: true })
  }

  return (
    <section className={`${cardClass} space-y-3 p-4`} aria-labelledby="vitals-heading">
      <h2 id="vitals-heading" className="flex items-center gap-2 text-lg font-semibold">
        <HeartPulse className="size-5 text-rose-600" aria-hidden /> Vitals
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Weight" unit="kg" value={weight} onChange={setWeight} placeholder="80.5" />
        <NumberField label="Resting heart rate" unit="bpm" decimal={false} value={hr} onChange={setHr} placeholder="60" />
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className={secondaryButton} onClick={() => void save()} data-testid="save-vitals">
          Save vitals
        </button>
        {message && (
          <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? errorText : mutedText}`}>
            {message.text}
          </p>
        )}
      </div>
    </section>
  )
}
