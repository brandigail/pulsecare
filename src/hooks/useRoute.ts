import { useCallback, useMemo, useSyncExternalStore } from 'react'

export type Route =
  | { name: 'today' }
  | { name: 'workouts' }
  | { name: 'progress' }
  | { name: 'settings' }
  | { name: 'workout'; id: string }
  | { name: 'routine'; id: string }

export type Destination = 'today' | 'workouts' | 'progress' | 'settings' | { workout: string } | { routine: string }

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

const read = () => window.location.hash

export function parseRoute(hash: string): Route {
  const detail = /^#\/(workout|routine)\/([A-Za-z0-9-]{1,64})$/.exec(hash)
  if (detail?.[1] && detail[2]) return detail[1] === 'workout' ? { name: 'workout', id: detail[2] } : { name: 'routine', id: detail[2] }
  const page = hash.replace(/^#\/?/, '')
  return page === 'workouts' || page === 'progress' || page === 'settings' ? { name: page } : { name: 'today' }
}

export function hashFor(to: Destination): string {
  if (typeof to === 'string') return `/${to}`
  return 'workout' in to ? `/workout/${to.workout}` : `/routine/${to.routine}`
}

/** The current screen, kept in the URL hash so the back button, a refresh and a shared link all behave. */
export function useRoute(): [Route, (to: Destination) => void] {
  const hash = useSyncExternalStore(subscribe, read, () => '')
  const route = useMemo(() => parseRoute(hash), [hash])
  const go = useCallback((to: Destination) => {
    window.location.hash = hashFor(to)
    window.scrollTo({ top: 0 })
  }, [])
  return [route, go]
}
