import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

export interface OddsProviderState {
  provider: 'the-odds-api'
  configured: boolean
  available: boolean
  reason?: string
}

export interface NewsProviderState {
  provider: 'espn-rss'
  configured: boolean
  available: boolean
  reason?: string
}

export interface AnalysisOddsItem {
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
  spread: {
    home_line: number | null
    home_odds: number | null
    away_line: number | null
    away_odds: number | null
  }
  total: {
    points: number | null
    over_odds: number | null
    under_odds: number | null
  }
}

export interface AnalysisNewsItem {
  id: string
  title: string
  summary: string | null
  link: string
  published_at: string | null
  source: string
}

interface AnalysisInsightsResponse {
  ok: boolean
  generatedAt: string
  providers: {
    odds: OddsProviderState
    news: NewsProviderState
  }
  odds: AnalysisOddsItem[]
  news: AnalysisNewsItem[]
}

export function useAnalysisInsights() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [odds, setOdds] = useState<AnalysisOddsItem[]>([])
  const [news, setNews] = useState<AnalysisNewsItem[]>([])
  const [providers, setProviders] = useState<AnalysisInsightsResponse['providers']>({
    odds: { provider: 'the-odds-api', configured: false, available: false, reason: 'Ainda não carregado.' },
    news: { provider: 'espn-rss', configured: false, available: false, reason: 'Ainda não carregado.' },
  })

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${backendUrl}/analysis/insights`)
        const payload = await response.json().catch(() => null) as AnalysisInsightsResponse | null

        if (!response.ok || !payload?.ok) {
          throw new Error(payload && 'error' in payload ? String((payload as { error?: string }).error ?? '') : 'Falha ao carregar análise.')
        }

        if (!active) return

        setGeneratedAt(payload.generatedAt)
        setProviders(payload.providers)
        setOdds(payload.odds)
        setNews(payload.news)
      } catch (loadError: unknown) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar análise.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    const channel = supabase
      .channel('analysis-insights-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'series' }, load)
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [])

  return useMemo(() => ({
    loading,
    error,
    generatedAt,
    odds,
    news,
    providers,
  }), [loading, error, generatedAt, odds, news, providers])
}
