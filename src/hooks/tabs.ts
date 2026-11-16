import type { Route } from './useRoute'

export type TabId = 'today' | 'workouts' | 'progress' | 'settings'

export const TABS: readonly { to: TabId; label: string }[] = [
  { to: 'today', label: 'Today' },
  { to: 'workouts', label: 'Workouts' },
  { to: 'progress', label: 'Progress' },
  { to: 'settings', label: 'Settings' },
]

/** Which tab a screen belongs to: a workout or a routine counts as part of Workouts. */
export function activeTab(route: Route): TabId {
  return route.name === 'workout' || route.name === 'routine' ? 'workouts' : route.name
}
