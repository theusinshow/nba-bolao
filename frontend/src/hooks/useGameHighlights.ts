import { useEffect, useMemo, useState } from 'react'

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

export interface GameHighlightsProviderState {
  provider: 'balldontlie-game-player-stats'
  configured: boolean
  available: boolean
  reason?: string
}

export interface GameHighlightLeader {
  player_name: string
  team: string | null
  value: number
}

export interface GameHighlightItem {
  game_id: number
  headline: string | null
  best_line: string | null
  leaders: {
    points: GameHighlightLeader | null
    rebounds: GameHighlightLeader | null
    assists: GameHighlightLeader | null
  }
}

interface GameHighlightsResponse {
  ok: boolean
  generatedAt: string
  provider: GameHighlightsProviderState
  highlights: GameHighlightItem[]
}

export function useGameHighlights(gameIds: number[]) {
  const stableIds = useMemo(
    () => Array.from(new Set(gameIds.filter((id) => Number.isFinite(id) && id > 0))).sort((a, b) => a - b),
    [gameIds]
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [highlights, setHighlights] = useState<GameHighlightItem[]>([])
  const [provider, setProvider] = useState<GameHighlightsProviderState>({
    provider: 'balldontlie-game-player-stats',
    configured: false,
    available: false,
    reason: 'Ainda não carregado.',
  })

  useEffect(() => {
    let active = true

    async function load() {
      if (stableIds.length === 0) {
        setHighlights([])
        setProvider({
          provider: 'balldontlie-game-player-stats',
          configured: true,
          available: true,
        })
        setError(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        stableIds.forEach((id) => params.append('gameIds[]', String(id)))

        const response = await fetch(`${backendUrl}/analysis/game-highlights?${params.toString()}`)
        const payload = await response.json().catch(() => null) as GameHighlightsResponse | null

        if (!response.ok || !payload?.ok) {
          throw new Error(
            payload && 'error' in payload
              ? String((payload as { error?: string }).error ?? '')
              : 'Falha ao carregar destaques dos jogos.'
          )
        }

        if (!active) return

        setProvider(payload.provider)
        setHighlights(payload.highlights)
      } catch (loadError: unknown) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar destaques dos jogos.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [stableIds])

  return { loading, error, highlights, provider }
}
