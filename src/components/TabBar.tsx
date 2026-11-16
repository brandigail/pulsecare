import { Activity, Dumbbell, LineChart, Settings, type LucideIcon } from 'lucide-react'
import type { Destination, Route } from '../hooks/useRoute'
import { activeTab, TABS, type TabId } from '../hooks/tabs'

const ICONS: Record<TabId, LucideIcon> = { today: Activity, workouts: Dumbbell, progress: LineChart, settings: Settings }

interface Props {
  route: Route
  onGo: (to: Destination) => void
}

/** The phone navigation: fixed to the bottom of the screen, hidden from tablet width up where the header holds the tabs. */
export function TabBar({ route, onGo }: Props) {
  const current = activeTab(route)
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-slate-800 dark:bg-slate-950">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map((t) => {
          const Icon = ICONS[t.to]
          return (
            <li key={t.to}>
              <button
                type="button"
                aria-current={current === t.to ? 'page' : undefined}
                onClick={() => onGo(t.to)}
                className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-medium ${current === t.to ? 'text-rose-800 dark:text-rose-300' : 'text-slate-600 dark:text-slate-400'}`}
              >
                <Icon className="size-5" aria-hidden />
                {t.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
