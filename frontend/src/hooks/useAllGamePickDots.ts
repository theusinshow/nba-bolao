import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TEAM_MAP } from '../data/teams2025'
import type { DotData, DotStatus } from '../components/GamePickDots'

interface RawPick {
  participant_id: string
  winner_id: string
  game_id: string
  games: {
    id: string
    winner_id: string | null
    played: boolean
    tip_off_at: string | null
    round: number | null
    home_team_id: string
    away_team_id: string
    series_id: string
    game_number: number
  } | null
}

function getDotStatus(pickWinnerId: string, game: RawPick['games']): DotStatus {
  if (!game) return 'no-pick'
  if (!game.played) return 'pending'
  if (!game.winner_id) return 'pending'
  return pickWinnerId === game.winner_id ? 'correct' : 'wrong'
}

/** Single query — fetches all game_picks + joined game data for all participants. */
export function useAllGamePickDots(): {
  dotsById: Map<string, DotData[]>
  loading: boolean
} {
  const [dotsById, setDotsById] = useState<Map<string, DotData[]>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('game_picks')
      .select(`
        participant_id,
        winner_id,
        game_id,
        games (
          id, winner_id, played, tip_off_at, round,
          home_team_id, away_team_id, series_id, game_number
        )
      `)
      .then(({ data }) => {
        const map = new Map<string, DotData[]>()

        for (const raw of (data ?? []) as RawPick[]) {
          const game = raw.games
          if (!game) continue

          const status = getDotStatus(raw.winner_id, game)
          const homeAbbr = TEAM_MAP[game.home_team_id]?.abbreviation ?? game.home_team_id
          const awayAbbr = TEAM_MAP[game.away_team_id]?.abbreviation ?? game.away_team_id

          const dot: DotData = {
            gameId: raw.game_id,
            status,
            round: game.round ?? 1,
            seriesId: game.series_id,
            homeTeamId: game.home_team_id,
            awayTeamId: game.away_team_id,
            homeAbbr,
            awayAbbr,
            gameNumber: game.game_number,
            tipOffAt: game.tip_off_at,
          }

          const existing = map.get(raw.participant_id) ?? []
          existing.push(dot)
          map.set(raw.participant_id, existing)
        }

        // Sort each participant's dots by tip_off_at ascending
        map.forEach((dots, id) => {
          map.set(
            id,
            dots.sort((a, b) => {
              if (!a.tipOffAt) return 1
              if (!b.tipOffAt) return -1
              return new Date(a.tipOffAt).getTime() - new Date(b.tipOffAt).getTime()
            }),
          )
        })

        setDotsById(map)
      })
      .finally(() => setLoading(false))
  }, [])

  return { dotsById, loading }
}
