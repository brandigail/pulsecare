/**
 * Whole seconds left until `endsAt`, rounded up so the clock shows 0:01 until the very last moment and 0:00 only when
 * it is truly over. The timer is built on an end time rather than counting ticks, so a phone that pauses the page
 * while the screen is off still shows the right time when it wakes.
 */
export function remainingSeconds(endsAt: number | null, now: number): number {
  if (endsAt === null) return 0
  return Math.max(0, Math.ceil((endsAt - now) / 1000))
}

/** `1:30`, `0:05`. */
export function formatClock(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export const MIN_REST_SECONDS = 15
export const MAX_REST_SECONDS = 600

/** Moves a rest by a number of seconds, never below 15 seconds or above 10 minutes. */
export function adjustRest(seconds: number, delta: number): number {
  return Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, Math.round(seconds + delta)))
}
