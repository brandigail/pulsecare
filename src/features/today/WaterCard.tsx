import { Droplets, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Meter } from '../../components/Meter'
import { NumberField } from '../../components/NumberField'
import { cardClass, errorText, primaryButton, secondaryButton } from '../../components/ui'
import { parseNumber } from '../../lib/nutrition'
import { usePulse } from '../../providers/data'
import type { DailyLog, DateKey } from '../../types'

export function WaterCard({ date, log }: { date: DateKey; log: DailyLog }) {
  const { addWater, settings } = usePulse()
  const [custom, setCustom] = useState('')
  const [error, setError] = useState<string | null>(null)

  function addCustom() {
    const ml = parseNumber(custom, 1, 5000, 0)
    if (ml === null) {
      setError('Enter an amount from 1 to 5000 ml.')
      return
    }
    setError(null)
    setCustom('')
    void addWater(date, ml)
  }

  return (
    <section className={`${cardClass} space-y-3 p-4`} aria-labelledby="water-heading">
      <h2 id="water-heading" className="flex items-center gap-2 text-lg font-semibold">
        <Droplets className="size-5 text-sky-600" aria-hidden /> Water
      </h2>
      <Meter label="Water" value={log.waterMl} target={settings.targets.waterMl} unit="ml" color="bg-sky-600" testId="water-meter" />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryButton} onClick={() => void addWater(date, 250)}>
          <Plus className="size-4" aria-hidden /> 250 ml
        </button>
        <button type="button" className={primaryButton} onClick={() => void addWater(date, 500)}>
          <Plus className="size-4" aria-hidden /> 500 ml
        </button>
        <button type="button" className={secondaryButton} onClick={() => void addWater(date, -250)} disabled={log.waterMl <= 0} aria-label="Remove 250 ml">
          <Minus className="size-4" aria-hidden /> 250 ml
        </button>
      </div>
      <div className="flex items-end gap-2">
        <NumberField label="Other amount" unit="ml" decimal={false} value={custom} onChange={setCustom} placeholder="330" className="max-w-40 flex-1" />
        <button type="button" className={secondaryButton} onClick={addCustom}>
          Add
        </button>
      </div>
      {error && (
        <p role="alert" className={`text-sm ${errorText}`}>
          {error}
        </p>
      )}
    </section>
  )
}
