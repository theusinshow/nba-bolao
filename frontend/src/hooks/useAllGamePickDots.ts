import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TEAM_MAP } from '../data/teams2025'
import type { DotData, DotStatus } from '../components/GamePickDots'

interface GameRow {
  id: string
  series_id: string
  game_number: number
  home_team_id: string
  away_team_id: string
  tip_off_at: string | null
  played: boolean
  winner_id: string | null
}

interface PickRow {
  participant_id: string
  game_id: string
  winner_id: string
}

interface ParticipantRow {
  id: string
}

function getDotStatus(pickWinnerId: string, game: GameRow): DotStatus {
  if (!game.played) return 'pending'
  if (!game.winner_id) return 'pending'
  return pickWinnerId === game.winner_id ? 'correct' : 'wrong'
}

/** Fetches games, picks and participants in parallel.
 *  Returns a dot entry for EVERY game per participant — including no-pick ones. */
export function useAllGamePickDots(): {
  dotsById: Map<string, DotData[]>
  loading: boolean
} {
  const [dotsById, setDotsById] = useState<Map<string, DotData[]>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [
          { data: participants },
          { data: games },
          { data: picks },
        ] = await Promise.all([
          supabase.from('participants').select('id'),
          supabase.from('games').select('id, series_id, game_number, home_team_id, away_team_id, tip_off_at, played, winner_id').order('tip_off_at', { ascending: true }),
          supabase.from('game_picks').select('participant_id, game_id, winner_id'),
        ])

        if (!participants || !games) return

        const gamesById = new Map((games as GameRow[]).map((g) => [g.id, g]))

        // pick lookup: `participantId:gameId` → winnerId
        const pickMap = new Map<string, string>()
        for (const pick of (picks ?? []) as PickRow[]) {
          pickMap.set(`${pick.participant_id}:${pick.game_id}`, pick.winner_id)
        }

        const map = new Map<string, DotData[]>()

        for (const { id: participantId } of participants as ParticipantRow[]) {
          const dots: DotData[] = []

          for (const game of games as GameRow[]) {
            const pickKey = `${participantId}:${game.id}`
            const pickedWinner = pickMap.get(pickKey)
            const homeAbbr = TEAM_MAP[game.home_team_id]?.abbreviation ?? game.home_team_id
            const awayAbbr = TEAM_MAP[game.away_team_id]?.abbreviation ?? game.away_team_id

            const status: DotStatus = pickedWinner
              ? getDotStatus(pickedWinner, game)
              : 'no-pick'

            dots.push({
              gameId: game.id,
              status,
              played: game.played,
              round: 1,
              seriesId: game.series_id,
              homeTeamId: game.home_team_id,
              awayTeamId: game.away_team_id,
              homeAbbr,
              awayAbbr,
              gameNumber: game.game_number,
              tipOffAt: game.tip_off_at,
            })
          }

          map.set(participantId, dots)
        }

        setDotsById(map)
      } finally {
        setLoading(false)
      }
    }

    load()

    const channel = supabase
      .channel('game-pick-dots-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_picks' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { dotsById, loading }
}
