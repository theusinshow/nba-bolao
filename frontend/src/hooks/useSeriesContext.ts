import { useEffect, useState } from 'react'

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

export interface TeamContextData {
  abbreviation: string
  wins: number
  losses: number
  homeWins: number
  homeLosses: number
  awayWins: number
  awayLosses: number
}

export interface SeriesContextData {
  home: TeamContextData
  away: TeamContextData
  headToHead: { homeWins: number; awayWins: number }
}

// Module-level cache so repeated opens of the same modal don't re-fetch
const cache = new Map<string, SeriesContextData>()

export function useSeriesContext(
  homeTeamId: string | null | undefined,
  awayTeamId: string | null | undefined,
) {
  const [data, setData] = useState<SeriesContextData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!homeTeamId || !awayTeamId) return

    const key = [homeTeamId, awayTeamId].sort().join('-')

    if (cache.has(key)) {
      setData(cache.get(key)!)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch(`${backendUrl}/api/series-context/${homeTeamId}/${awayTeamId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((json) => {
        if (cancelled || !json.ok) return
        const result: SeriesContextData = {
          home: json.home,
          away: json.away,
          headToHead: json.headToHead,
        }
        cache.set(key, result)
        setData(result)
      })
      .catch(() => {
        // Silent degradation — modal works normally without context data
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [homeTeamId, awayTeamId])

  return { data, loading }
}
