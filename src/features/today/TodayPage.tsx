import { ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react'
import { useState } from 'react'
import { cardClass, iconButton, mutedText, primaryButton, secondaryButton } from '../../components/ui'
import type { Destination } from '../../hooks/useRoute'
import { addDays, daysBetween } from '../../lib/date'
import { formatDay } from '../../lib/format'
import { emptyLog } from '../../lib/nutrition'
import { usePulse } from '../../providers/data'
import { FoodCard } from './FoodCard'
import { VitalsCard } from './VitalsCard'
import { WaterCard } from './WaterCard'

export function TodayPage({ onGo }: { onGo: (to: Destination) => void }) {
  const { today, logs, routines, active, startWorkout } = usePulse()
  const [picked, setPicked] = useState<string | null>(null)
  const date = picked !== null && picked < today ? picked : today
  const log = logs.find((l) => l.date === date) ?? emptyLog(date)
  const heading = date === today ? 'Today' : daysBetween(date, today) === 1 ? 'Yesterday' : formatDay(date)

  async function start(routineId: string | null) {
    const session = await startWorkout(routineId)
    if (session) onGo({ workout: session.id })
  }

  return (
    <section className="space-y-4" aria-labelledby="today-heading">
      <div className="flex items-center gap-2">
        <button type="button" className={iconButton} onClick={() => setPicked(addDays(date, -1))} aria-label="Previous day" disabled={daysBetween(date, today) >= 365}>
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <h1 id="today-heading" className="text-2xl font-bold">
            {heading}
          </h1>
          <p className={`text-sm ${mutedText}`}>{formatDay(date)}</p>
        </div>
        <button type="button" className={iconButton} onClick={() => setPicked(date >= addDays(today, -1) ? null : addDays(date, 1))} aria-label="Next day" disabled={date >= today}>
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>

      {date === today && (
        <section className={`${cardClass} space-y-3 p-4`} aria-labelledby="train-heading">
          <h2 id="train-heading" className="flex items-center gap-2 text-lg font-semibold">
            <Dumbbell className="size-5 text-rose-600" aria-hidden /> Training
          </h2>
          {active ? (
            <button type="button" className={primaryButton} onClick={() => onGo({ workout: active.id })}>
              Continue your workout
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              {routines.map((r) => (
                <button key={r.id} type="button" className={secondaryButton} onClick={() => void start(r.id)}>
                  Start {r.name}
                </button>
              ))}
              <button type="button" className={secondaryButton} onClick={() => void start(null)}>
                Quick workout
              </button>
            </div>
          )}
        </section>
      )}

      <WaterCard key={`water-${date}`} date={date} log={log} />
      <FoodCard key={`food-${date}`} date={date} log={log} />
      <VitalsCard key={`vitals-${date}`} log={log} />
    </section>
  )
}
