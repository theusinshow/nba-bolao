import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { RankingEntry, Series, SeriesPick, GamePick, Participant } from '../types'
import { calculateSeriesPickPoints, calculateGamePickPoints } from '../utils/scoring'
import { normalizeGame } from '../utils/bracket'

function compareRankingEntries(a: RankingEntry, b: RankingEntry): number {
  if (b.total_points !== a.total_points) {
    return b.total_points - a.total_points
  }

  return a.participant_name.localeCompare(b.participant_name, 'pt-BR', { sensitivity: 'base' })
}

export function useRanking() {
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    computeRanking()

    const sub = supabase
      .channel('ranking-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'series' }, computeRanking)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'series_picks' }, computeRanking)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_picks' }, computeRanking)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, computeRanking)
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [])

  async function computeRanking() {
    setLoading(true)
    try {
      const [
        { data: participants },
        { data: allSeries },
        { data: allSeriesPicks },
        { data: allGames },
        { data: allGamePicks },
      ] = await Promise.all([
        supabase.from('participants').select('*'),
        supabase.from('series').select('*'),
        supabase.from('series_picks').select('*'),
        supabase.from('games').select('*'),
        supabase.from('game_picks').select('*'),
      ])

      if (!participants || !allSeries || !allSeriesPicks || !allGames || !allGamePicks) return

      const seriesMap: Record<string, Series> = Object.fromEntries(
        (allSeries as Series[]).map((s) => [s.id, s])
      )
      const gameMap = Object.fromEntries(
        (allGames as any[]).map((g) => {
          const series = seriesMap[g.series_id]
          return [g.id, normalizeGame(g, series?.round)]
        })
      )

      const entries: RankingEntry[] = (participants as Participant[]).map((p) => {
        const mySeriesPicks = (allSeriesPicks as SeriesPick[]).filter((sp) => sp.participant_id === p.id)
        const myGamePicks = (allGamePicks as GamePick[]).filter((gp) => gp.participant_id === p.id)

        const roundPoints = [0, 0, 0, 0]
        let cravadas = 0
        let seriesCorrect = 0
        let seriesTotal = 0
        let gamesCorrect = 0
        let gamesTotal = 0

        for (const sp of mySeriesPicks) {
          const s = seriesMap[sp.series_id]
          if (!s) continue
          seriesTotal++
          const pts = calculateSeriesPickPoints(
            { winnerId: sp.winner_id, gamesCount: sp.games_count },
            { winnerId: s.winner_id ?? undefined, gamesPlayed: s.games_played, isComplete: s.is_complete, round: s.round }
          )
          if (pts > 0) {
            seriesCorrect++
            roundPoints[s.round - 1] += pts
            if (s.is_complete && sp.winner_id === s.winner_id && sp.games_count === s.games_played) {
              cravadas++
            }
          }
        }

        for (const gp of myGamePicks) {
          const g = gameMap[gp.game_id]
          if (!g) continue
          gamesTotal++
          const pts = calculateGamePickPoints(
            { winnerId: gp.winner_id },
            { winnerId: g.winner_id ?? undefined, played: g.played, round: g.round ?? seriesMap[g.series_id]?.round ?? 1 }
          )
          if (pts > 0) {
            gamesCorrect++
            roundPoints[(g.round ?? seriesMap[g.series_id]?.round ?? 1) - 1] += pts
          }
        }

        const totalPoints = roundPoints.reduce((a, b) => a + b, 0)

        return {
          participant_id: p.id,
          participant_name: p.name,
          total_points: totalPoints,
          round1_points: roundPoints[0],
          round2_points: roundPoints[1],
          round3_points: roundPoints[2],
          round4_points: roundPoints[3],
          cravadas,
          series_correct: seriesCorrect,
          series_total: seriesTotal,
          games_correct: gamesCorrect,
          games_total: gamesTotal,
          rank: 0,
          prev_rank: null,
        }
      })

      entries.sort(compareRankingEntries)
      entries.forEach((entry, index) => { entry.rank = index + 1 })

      setRanking((prev) => {
        const prevByParticipant = Object.fromEntries(prev.map((entry) => [entry.participant_id, entry]))
        return entries.map((entry) => ({
          ...entry,
          prev_rank: prevByParticipant[entry.participant_id]?.rank ?? null,
        }))
      })
    } finally {
      setLoading(false)
    }
  }

  return { ranking, loading, refetch: computeRanking }
}
