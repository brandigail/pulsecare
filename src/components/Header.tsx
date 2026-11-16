import { Dumbbell, Moon, Sun } from 'lucide-react'
import { useElapsed } from '../hooks/useElapsed'
import type { Destination, Route } from '../hooks/useRoute'
import { activeTab, TABS } from '../hooks/tabs'
import { formatClock } from '../lib/restTimer'
import { usePulse } from '../providers/data'
import { useTheme } from '../providers/theme'
import { iconButton } from './ui'

interface Props {
  route: Route
  onGo: (to: Destination) => void
}

export function Header({ route, onGo }: Props) {
  const { theme, toggleTheme } = useTheme()
  const { active } = usePulse()
  const elapsed = useElapsed(active?.startedAt ?? null, active !== null)
  const current = activeTab(route)

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2">
        <button type="button" className="flex min-h-11 items-center gap-2 text-lg font-bold" onClick={() => onGo('today')} aria-label="PulseCare, go to Today">
          <img src="/favicon.svg" alt="" width={28} height={28} className="size-7" />
          <span>PulseCare</span>
        </button>
        <nav aria-label="Main" className="ml-4 hidden flex-1 gap-1 md:flex">
          {TABS.map((t) => (
            <button
              key={t.to}
              type="button"
              aria-current={current === t.to ? 'page' : undefined}
              onClick={() => onGo(t.to)}
              className={`min-h-11 rounded-lg px-3 text-sm font-medium transition-colors ${
                current === t.to ? 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        {active && (
          <button type="button" onClick={() => onGo({ workout: active.id })} className="ml-auto flex min-h-11 items-center gap-2 rounded-full bg-rose-50 px-3 text-sm font-semibold text-rose-800 md:ml-0 dark:bg-rose-950 dark:text-rose-200" data-testid="active-pill">
            <Dumbbell className="size-4" aria-hidden />
            <span>Workout</span>
            <span className="font-mono tabular-nums">{formatClock(elapsed)}</span>
          </button>
        )}
        <button type="button" className={`${iconButton} ${active ? '' : 'ml-auto'}`} onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          {theme === 'dark' ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
        </button>
      </div>
    </header>
  )
}
