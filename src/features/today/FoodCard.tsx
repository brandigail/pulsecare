import { Apple } from 'lucide-react'
import { useState } from 'react'
import { Meter } from '../../components/Meter'
import { NumberField } from '../../components/NumberField'
import { cardClass, errorText, mutedText, primaryButton, secondaryButton } from '../../components/ui'
import { macroKcal, parseNumber } from '../../lib/nutrition'
import { usePulse } from '../../providers/data'
import type { DailyLog, DateKey } from '../../types'

interface Draft {
  kcal: string
  proteinG: string
  carbsG: string
  fatG: string
}

const BLANK: Draft = { kcal: '', proteinG: '', carbsG: '', fatG: '' }

/** Reads the four boxes; blank counts as zero, anything else must be a real number in range. */
function read(draft: Draft): { kcal: number; proteinG: number; carbsG: number; fatG: number } | null {
  const value = (text: string, max: number) => (text.trim() === '' ? 0 : parseNumber(text, 0, max, 0))
  const kcal = value(draft.kcal, 5000)
  const proteinG = value(draft.proteinG, 500)
  const carbsG = value(draft.carbsG, 800)
  const fatG = value(draft.fatG, 400)
  return kcal === null || proteinG === null || carbsG === null || fatG === null ? null : { kcal, proteinG, carbsG, fatG }
}

function Fields({ draft, onChange }: { draft: Draft; onChange: (draft: Draft) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <NumberField label="Calories" unit="kcal" decimal={false} value={draft.kcal} onChange={(kcal) => onChange({ ...draft, kcal })} />
      <NumberField label="Protein" unit="g" decimal={false} value={draft.proteinG} onChange={(proteinG) => onChange({ ...draft, proteinG })} />
      <NumberField label="Carbs" unit="g" decimal={false} value={draft.carbsG} onChange={(carbsG) => onChange({ ...draft, carbsG })} />
      <NumberField label="Fat" unit="g" decimal={false} value={draft.fatG} onChange={(fatG) => onChange({ ...draft, fatG })} />
    </div>
  )
}

export function FoodCard({ date, log }: { date: DateKey; log: DailyLog }) {
  const { addMeal, saveLog, settings } = usePulse()
  const t = settings.targets
  const [meal, setMeal] = useState<Draft>(BLANK)
  const [totals, setTotals] = useState<Draft>({ kcal: String(log.kcal), proteinG: String(log.proteinG), carbsG: String(log.carbsG), fatG: String(log.fatG) })
  const [error, setError] = useState<string | null>(null)

  async function addFood() {
    const parsed = read(meal)
    if (!parsed) return setError('Use whole numbers: calories up to 5000 and grams up to a few hundred.')
    if (parsed.kcal + parsed.proteinG + parsed.carbsG + parsed.fatG === 0) return setError('Enter at least one amount.')
    const result = await addMeal(date, parsed)
    if (result.ok) {
      setError(null)
      setMeal(BLANK)
      setTotals({ kcal: String(result.value.kcal), proteinG: String(result.value.proteinG), carbsG: String(result.value.carbsG), fatG: String(result.value.fatG) })
    } else setError(result.error)
  }

  async function correctTotals() {
    const parsed = read(totals)
    if (!parsed) return setError('Use whole numbers for the totals.')
    const result = await saveLog({ ...log, ...parsed })
    setError(result.ok ? null : result.error)
  }

  const fillFromMacros = () => {
    const parsed = read(meal)
    if (parsed) setMeal({ ...meal, kcal: String(macroKcal(parsed.proteinG, parsed.carbsG, parsed.fatG)) })
  }

  return (
    <section className={`${cardClass} space-y-4 p-4`} aria-labelledby="food-heading">
      <h2 id="food-heading" className="flex items-center gap-2 text-lg font-semibold">
        <Apple className="size-5 text-emerald-600" aria-hidden /> Food and macros
      </h2>
      <div className="space-y-3">
        <Meter label="Calories" value={log.kcal} target={t.kcal} unit="kcal" testId="kcal-meter" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Meter label="Protein" value={log.proteinG} target={t.proteinG} unit="g" color="bg-emerald-600" testId="protein-meter" />
          <Meter label="Carbs" value={log.carbsG} target={t.carbsG} unit="g" color="bg-amber-600" testId="carbs-meter" />
          <Meter label="Fat" value={log.fatG} target={t.fatG} unit="g" color="bg-violet-600" testId="fat-meter" />
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-800">
        <h3 className="font-medium">Add a meal or snack</h3>
        <Fields draft={meal} onChange={setMeal} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primaryButton} onClick={() => void addFood()} data-testid="add-food">
            Add to today
          </button>
          <button type="button" className={secondaryButton} onClick={fillFromMacros}>
            Calories from macros
          </button>
        </div>
        <p className={`text-xs ${mutedText}`}>Protein and carbs count 4 calories a gram, fat 9. Blank boxes count as zero.</p>
      </div>

      <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
        <summary className="min-h-9 text-sm font-medium">Correct the day's totals</summary>
        <div className="mt-3 space-y-3">
          <Fields draft={totals} onChange={setTotals} />
          <button type="button" className={secondaryButton} onClick={() => void correctTotals()}>
            Save totals
          </button>
        </div>
      </details>

      {error && (
        <p role="alert" className={`text-sm ${errorText}`}>
          {error}
        </p>
      )}
    </section>
  )
}
