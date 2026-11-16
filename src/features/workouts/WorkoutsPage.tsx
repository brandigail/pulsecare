import { Clock, Pencil, Play, Plus } from 'lucide-react'
import { cardClass, mutedText, primaryButton, secondaryButton } from '../../components/ui'
import type { Destination } from '../../hooks/useRoute'
import { dayOf, totalVolume } from '../../lib/strength'
import { formatDay, formatKg, formatMinutes } from '../../lib/format'
import { usePulse } from '../../providers/data'

export function WorkoutsPage({ onGo }: { onGo: (to: Destination) => void }) {
  const { routines, exercises, sessions, sets, active, seeding, startWorkout } = usePulse()
  const names = new Map(exercises.map((e) => [e.id, e.name]))
  const routineName = new Map(routines.map((r) => [r.id, r.name]))
  const finished = sessions.filter((s) => s.endedAt !== null).slice(0, 30)

  async function start(routineId: string | null) {
    const session = await startWorkout(routineId)
    if (session) onGo({ workout: session.id })
  }

  return (
    <section className="space-y-5" aria-labelledby="workouts-heading">
      <h1 id="workouts-heading" className="text-2xl font-bold">
        Workouts
      </h1>

      {active && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-3 dark:border-rose-800 dark:bg-rose-950/40" data-testid="active-banner">
          <p className="min-w-0 flex-1 font-medium">A workout is in progress.</p>
          <button type="button" className={primaryButton} onClick={() => onGo({ workout: active.id })}>
            Continue
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondaryButton} onClick={() => onGo({ routine: 'new' })} data-testid="new-routine">
          <Plus className="size-4" aria-hidden /> New routine
        </button>
        {!active && (
          <button type="button" className={secondaryButton} onClick={() => void start(null)} data-testid="quick-workout">
            <Play className="size-4" aria-hidden /> Quick workout
          </button>
        )}
      </div>

      <section aria-labelledby="routines-heading" className="space-y-2">
        <h2 id="routines-heading" className="text-lg font-semibold">
          Routines
        </h2>
        {routines.length === 0 ? (
          <p className={mutedText}>{seeding ? 'Adding the demo routines…' : 'No routines yet. Create one to start a workout in one tap.'}</p>
        ) : (
          <ul className="space-y-2" aria-label="Routines">
            {routines.map((r) => (
              <li key={r.id} className={`${cardClass} flex flex-wrap items-center gap-3 p-4`}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.name}</p>
                  <p className={`truncate text-sm ${mutedText}`}>{r.exerciseIds.map((id) => names.get(id) ?? '?').join(', ')}</p>
                </div>
                <button type="button" className={primaryButton} onClick={() => void start(r.id)} disabled={active !== null} aria-label={`Start ${r.name}`}>
                  <Play className="size-4 fill-current" aria-hidden /> Start
                </button>
                <button type="button" className={secondaryButton} onClick={() => onGo({ routine: r.id })} aria-label={`Edit ${r.name}`}>
                  <Pencil className="size-4" aria-hidden /> Edit
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="history-heading" className="space-y-2">
        <h2 id="history-heading" className="text-lg font-semibold">
          History
        </h2>
        {finished.length === 0 ? (
          <p className={mutedText}>{seeding ? 'Adding the demo history…' : 'Finished workouts appear here.'}</p>
        ) : (
          <ul className="space-y-2" aria-label="Workout history">
            {finished.map((s) => {
              const mine = sets.filter((x) => x.sessionId === s.id)
              const minutes = (Date.parse(s.endedAt ?? s.startedAt) - Date.parse(s.startedAt)) / 1000
              return (
                <li key={s.id}>
                  <a href={`#/workout/${s.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60">
                    <span className="block font-semibold">{s.routineId ? (routineName.get(s.routineId) ?? 'Workout') : 'Quick workout'}</span>
                    <span className={`mt-0.5 flex flex-wrap gap-x-3 text-sm ${mutedText}`}>
                      <span>{formatDay(dayOf(s))}</span>
                      <span>{mine.length} sets</span>
                      <span>{formatKg(totalVolume(mine))} kg lifted</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" aria-hidden /> {formatMinutes(minutes)}
                      </span>
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </section>
  )
}
