import { lazy, Suspense } from 'react'
import { Header } from './components/Header'
import { TabBar } from './components/TabBar'
import { UpdatePrompt } from './components/UpdatePrompt'
import { mutedText } from './components/ui'
import { TodayPage } from './features/today/TodayPage'
import { useRoute } from './hooks/useRoute'
import { usePulse } from './providers/data'

// Everything except the daily screen loads on demand, which keeps the first load small.
const WorkoutsPage = lazy(() => import('./features/workouts/WorkoutsPage').then((m) => ({ default: m.WorkoutsPage })))
const RoutinePage = lazy(() => import('./features/workouts/RoutinePage').then((m) => ({ default: m.RoutinePage })))
const SessionPage = lazy(() => import('./features/workouts/SessionPage').then((m) => ({ default: m.SessionPage })))
const ProgressPage = lazy(() => import('./features/progress/ProgressPage').then((m) => ({ default: m.ProgressPage })))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))

export function App() {
  const { ready, saveError } = usePulse()
  const [route, go] = useRoute()

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <UpdatePrompt />
      <Header route={route} onGo={go} />
      {saveError && (
        <p role="alert" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          {saveError}
        </p>
      )}
      <main className="mx-auto max-w-4xl px-4 pt-4 pb-28 md:pb-10">
        {!ready ? (
          <p className={mutedText}>Loading…</p>
        ) : (
          <Suspense fallback={<p className={mutedText}>Loading…</p>}>
            {route.name === 'today' && <TodayPage onGo={go} />}
            {route.name === 'workouts' && <WorkoutsPage onGo={go} />}
            {route.name === 'routine' && <RoutinePage id={route.id} onGo={go} />}
            {route.name === 'workout' && <SessionPage id={route.id} onGo={go} />}
            {route.name === 'progress' && <ProgressPage />}
            {route.name === 'settings' && <SettingsPage />}
          </Suspense>
        )}
      </main>
      <TabBar route={route} onGo={go} />
    </div>
  )
}
