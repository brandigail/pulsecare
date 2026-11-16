import { useEffect, useState } from 'react'

/** Seconds since an ISO time, refreshed every second while `running` is true. */
export function useElapsed(startedAt: string | null, running: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [running])
  if (startedAt === null) return 0
  return Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000))
}
