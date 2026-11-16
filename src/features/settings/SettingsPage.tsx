import { useState } from 'react'
import { NumberField } from '../../components/NumberField'
import { cardClass, dangerButton, errorText, mutedText, primaryButton, secondaryButton } from '../../components/ui'
import { macroKcal, parseNumber } from '../../lib/nutrition'
import { usePulse } from '../../providers/data'

export function SettingsPage() {
  const { settings, saveSettings, loadDemo, clearHistory, sessions, logs } = usePulse()
  const t = settings.targets
  const [draft, setDraft] = useState({ water: String(t.waterMl), kcal: String(t.kcal), protein: String(t.proteinG), carbs: String(t.carbsG), fat: String(t.fatG), rest: String(settings.restSeconds) })
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [pending, setPending] = useState<'demo' | 'clear' | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function save() {
    const next = {
      waterMl: parseNumber(draft.water, 500, 10_000, 0),
      kcal: parseNumber(draft.kcal, 800, 10_000, 0),
      proteinG: parseNumber(draft.protein, 10, 1500, 0),
      carbsG: parseNumber(draft.carbs, 10, 1500, 0),
      fatG: parseNumber(draft.fat, 10, 1500, 0),
      rest: parseNumber(draft.rest, 15, 600, 0),
    }
    if (Object.values(next).some((v) => v === null)) {
      setMessage({ text: 'Check the numbers: water 500 to 10 000 ml, calories 800 to 10 000, macros 10 to 1500 g and rest 15 to 600 seconds.', error: true })
      return
    }
    const result = await saveSettings({
      targets: { waterMl: next.waterMl ?? 0, kcal: next.kcal ?? 0, proteinG: next.proteinG ?? 0, carbsG: next.carbsG ?? 0, fatG: next.fatG ?? 0 },
      restSeconds: next.rest ?? 90,
    })
    setMessage(result.ok ? { text: 'Saved.', error: false } : { text: result.error, error: true })
  }

  async function confirm() {
    if (pending === 'demo') {
      await loadDemo()
      setDone('Loaded six weeks of demo history.')
    } else {
      await clearHistory()
      setDone('All workouts, routines and daily logs were deleted.')
    }
    setPending(null)
  }

  const macros = macroKcal(Number(draft.protein) || 0, Number(draft.carbs) || 0, Number(draft.fat) || 0)

  return (
    <section className="space-y-4" aria-labelledby="settings-heading">
      <h1 id="settings-heading" className="text-2xl font-bold">
        Settings
      </h1>

      <section className={`${cardClass} space-y-4 p-4`} aria-labelledby="targets-heading">
        <h2 id="targets-heading" className="text-lg font-semibold">
          Daily targets
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumberField label="Water" unit="ml" decimal={false} value={draft.water} onChange={(water) => setDraft({ ...draft, water })} />
          <NumberField label="Calories" unit="kcal" decimal={false} value={draft.kcal} onChange={(kcal) => setDraft({ ...draft, kcal })} />
          <NumberField label="Protein" unit="g" decimal={false} value={draft.protein} onChange={(protein) => setDraft({ ...draft, protein })} />
          <NumberField label="Carbs" unit="g" decimal={false} value={draft.carbs} onChange={(carbs) => setDraft({ ...draft, carbs })} />
          <NumberField label="Fat" unit="g" decimal={false} value={draft.fat} onChange={(fat) => setDraft({ ...draft, fat })} />
          <NumberField label="Rest between sets" unit="seconds" decimal={false} value={draft.rest} onChange={(rest) => setDraft({ ...draft, rest })} />
        </div>
        <p className={`text-sm ${mutedText}`}>These macros add up to about {macros.toLocaleString('en-GB').replace(/,/g, ' ')} kcal.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={primaryButton} onClick={() => void save()} data-testid="save-settings">
            Save settings
          </button>
          {message && (
            <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? errorText : mutedText}`}>
              {message.text}
            </p>
          )}
        </div>
      </section>

      <section className={`${cardClass} space-y-3 p-4`} aria-labelledby="data-heading">
        <h2 id="data-heading" className="text-lg font-semibold">
          Your data
        </h2>
        <p className={`text-sm ${mutedText}`}>
          Everything is stored only in this browser, on this device ({sessions.length} workouts and {logs.length} daily logs). PulseCare is a personal tracker, not medical advice.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryButton} onClick={() => setPending('demo')}>
            Load demo history
          </button>
          <button type="button" className={secondaryButton} onClick={() => setPending('clear')}>
            Delete all history
          </button>
        </div>
        {pending && (
          <div role="alertdialog" aria-label="Confirm" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
            <p className="text-sm">{pending === 'demo' ? 'This replaces your workouts, routines and daily logs with six weeks of demo data.' : 'This deletes every workout, routine and daily log on this device. The exercise library stays. This cannot be undone.'}</p>
            <div className="flex gap-2">
              <button type="button" className={pending === 'clear' ? dangerButton : primaryButton} onClick={() => void confirm()} autoFocus>
                {pending === 'demo' ? 'Load demo' : 'Delete everything'}
              </button>
              <button type="button" className={secondaryButton} onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
        {done && (
          <p role="status" className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            {done}
          </p>
        )}
      </section>
    </section>
  )
}
