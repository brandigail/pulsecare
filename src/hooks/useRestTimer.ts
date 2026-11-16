import { useCallback, useEffect, useRef, useState } from 'react'
import { adjustRest, remainingSeconds } from '../lib/restTimer'

/** Two short beeps and a buzz when the rest is over. Best effort: browsers only allow sound after the user has tapped something. */
function playAlert(): void {
  try {
    navigator.vibrate?.([200, 100, 200])
    const context = new AudioContext()
    for (const [i, start] of [0, 0.28].entries()) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.frequency.value = i === 0 ? 880 : 1175
      gain.gain.value = 0.15
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(context.currentTime + start)
      oscillator.stop(context.currentTime + start + 0.2)
    }
    window.setTimeout(() => void context.close().catch(() => undefined), 900)
  } catch {
    // ignore: the clock and the message still show that the rest is over
  }
}

/**
 * A rest timer between sets. It is built on an end time, so it stays right when the page is paused (a locked phone)
 * and catches up when it wakes. `onDone` is called once, when the time runs out.
 */
export function useRestTimer() {
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [total, setTotal] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [finished, setFinished] = useState(false)
  const alerted = useRef(false)

  const running = endsAt !== null && !finished
  const remaining = remainingSeconds(endsAt, now)

  useEffect(() => {
    if (endsAt === null || finished) return
    const tick = () => {
      const current = Date.now()
      setNow(current)
      if (current >= endsAt && !alerted.current) {
        alerted.current = true
        setFinished(true)
        playAlert()
      }
    }
    const timer = window.setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [endsAt, finished])

  // The clock is read once and used for both values. Reading it twice put "now" a millisecond or two behind the end
  // time, and because the display rounds up, a 15 second rest showed as 0:16.
  const start = useCallback((seconds: number) => {
    const current = Date.now()
    alerted.current = false
    setFinished(false)
    setTotal(seconds)
    setNow(current)
    setEndsAt(current + seconds * 1000)
  }, [])

  const adjust = useCallback(
    (delta: number) => {
      if (endsAt === null || finished) return
      const current = Date.now()
      const next = adjustRest(Math.max(0, Math.round((endsAt - current) / 1000)), delta)
      setTotal((t) => Math.max(t, next))
      setNow(current)
      setEndsAt(current + next * 1000)
    },
    [endsAt, finished],
  )

  const dismiss = useCallback(() => {
    setEndsAt(null)
    setFinished(false)
    alerted.current = false
  }, [])

  return { running, finished, remaining, total, start, adjust, dismiss }
}
