import { useEffect, useMemo, useState } from 'react'

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

export interface OddsSummaryItem {
  id: string
  home_team_name: string
  away_team_name: string
  commence_time: string
  bookmaker: string
  updated_at: string | null
  moneyline: {
    home: number | null
    away: number | null
  }
}

interface OddsSummaryResponse {
  ok: boolean
  generatedAt: string
  provider: {
    provider: 'the-odds-api'
    configured: boolean
    available: boolean
    reason?: string
  }
  odds: OddsSummaryItem[]
}

export function useOddsSummary() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [odds, setOdds] = useState<OddsSummaryItem[]>([])

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${backendUrl}/analysis/odds-summary`)
        const payload = await response.json().catch(() => null) as OddsSummaryResponse | null

        if (!response.ok || !payload?.ok) {
          throw new Error(payload && 'error' in payload ? String((payload as { error?: string }).error ?? '') : 'Falha ao carregar odds resumidas.')
        }

        if (!active) return
        setGeneratedAt(payload.generatedAt)
        setOdds(payload.odds)
      } catch (loadError: unknown) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar odds resumidas.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  return useMemo(() => ({
    loading,
    error,
    generatedAt,
    odds,
  }), [loading, error, generatedAt, odds])
}
