import { useEffect, useState } from 'react'

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

export interface PostseasonRailExtraGame {
  id: string
  nba_game_id: number
  series_id: string | null
  tip_off_at: string | null
  played: boolean
  game_state: 'scheduled' | 'live' | 'halftime' | 'final'
  status_text: string | null
  current_period: number | null
  clock: string | null
  home_score: number | null
  away_score: number | null
  winner_id: string | null
  home_team_id: string
  away_team_id: string
  home_team_abbr: string
  away_team_abbr: string
  game_number: number
  stage_label: string
  round: number | null
  source: 'external'
}

interface PostseasonRailExtrasResponse {
  ok: boolean
  games: PostseasonRailExtraGame[]
}

export function usePostseasonRailExtras() {
  const [games, setGames] = useState<PostseasonRailExtraGame[]>([])

  useEffect(() => {
    let active = true

    async function fetchExtras() {
      try {
        const response = await fetch(`${backendUrl}/games/rail`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const payload = await response.json() as PostseasonRailExtrasResponse
        if (!active) return
        setGames(payload.games ?? [])
      } catch (error) {
        console.error('[usePostseasonRailExtras] Failed:', error)
        if (!active) return
        setGames([])
      }
    }

    fetchExtras()
    const id = window.setInterval(fetchExtras, 60_000)

    return () => {
      active = false
      window.clearInterval(id)
    }
  }, [])

  return { games }
}
