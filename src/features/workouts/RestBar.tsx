import { Minus, Plus, SkipForward, Timer } from 'lucide-react'
import { formatClock } from '../../lib/restTimer'
import { secondaryButton } from '../../components/ui'

interface Props {
  finished: boolean
  remaining: number
  total: number
  onAdjust: (delta: number) => void
  onDismiss: () => void
}

/** The rest timer, fixed above the bottom bar while it runs and for a moment after, so it is always in reach. */
export function RestBar({ finished, remaining, total, onAdjust, onDismiss }: Props) {
  const ratio = total > 0 ? Math.min(1, remaining / total) : 0
  return (
    <div className="fixed inset-x-3 bottom-[4.5rem] z-30 mx-auto max-w-md rounded-2xl border border-rose-300 bg-white p-3 shadow-xl md:bottom-4 dark:border-rose-800 dark:bg-slate-900" role="timer" aria-label="Rest timer" data-testid="rest-bar">
      <div className="flex items-center gap-3">
        <Timer className="size-6 shrink-0 text-rose-700 dark:text-rose-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-2xl font-bold tabular-nums" data-testid="rest-clock" aria-live="off">
            {finished ? 'Go!' : formatClock(remaining)}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400" role="status">
            {finished ? 'Rest is over. Start your next set.' : 'Resting between sets'}
          </p>
        </div>
        {!finished && (
          <>
            <button type="button" className={`${secondaryButton} px-3`} onClick={() => onAdjust(-15)} aria-label="Shorten the rest by 15 seconds">
              <Minus className="size-4" aria-hidden /> 15
            </button>
            <button type="button" className={`${secondaryButton} px-3`} onClick={() => onAdjust(15)} aria-label="Lengthen the rest by 15 seconds">
              <Plus className="size-4" aria-hidden /> 15
            </button>
          </>
        )}
        <button type="button" className={`${secondaryButton} px-3`} onClick={onDismiss} aria-label={finished ? 'Dismiss the rest timer' : 'Skip the rest'} data-testid="rest-skip">
          <SkipForward className="size-4" aria-hidden /> {finished ? 'Done' : 'Skip'}
        </button>
      </div>
      {!finished && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden>
          <div className="h-full rounded-full bg-rose-600 transition-[width] duration-200" style={{ width: `${ratio * 100}%` }} />
        </div>
      )}
    </div>
  )
}
