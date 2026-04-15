import { useEffect, useState } from 'react'

// Singleton interval shared across all CountdownTimer instances.
// Instead of each component creating its own setInterval, they all
// subscribe to this one tick and recompute their own derived state.
const listeners = new Set<() => void>()
let intervalId: ReturnType<typeof setInterval> | null = null

function subscribe(fn: () => void) {
  listeners.add(fn)
  if (intervalId === null) {
    intervalId = setInterval(() => listeners.forEach((cb) => cb()), 1000)
  }
}

function unsubscribe(fn: () => void) {
  listeners.delete(fn)
  if (listeners.size === 0 && intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}

/** Returns the current timestamp (ms), updated every second via a shared interval. */
export function useNowTick(): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const tick = () => setNow(Date.now())
    subscribe(tick)
    return () => unsubscribe(tick)
  }, [])

  return now
}
