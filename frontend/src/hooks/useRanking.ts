import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Game, GamePick, Participant, ParticipantScoreBreakdown, RankingEntry, Series, SeriesPick, Team } from '../types'
import { buildRankingState } from '../utils/ranking'

export function useRanking() {
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [breakdowns, setBreakdowns] = useState<Record<string, ParticipantScoreBreakdown>>({})
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
        { data: teams },
      ] = await Promise.all([
        supabase.from('participants').select('*'),
        supabase.from('series').select('*'),
        supabase.from('series_picks').select('*'),
        supabase.from('games').select('*'),
        supabase.from('game_picks').select('*'),
        supabase.from('teams').select('*'),
      ])

      if (!participants || !allSeries || !allSeriesPicks || !allGames || !allGamePicks || !teams) return

      setRanking((previousRanking) => {
        const { ranking: nextRanking, breakdowns: nextBreakdowns } = buildRankingState({
          participants: participants as Participant[],
          series: allSeries as Series[],
          games: allGames as Game[],
          seriesPicks: allSeriesPicks as SeriesPick[],
          gamePicks: allGamePicks as GamePick[],
          teams: teams as Team[],
          previousRanking,
        })
        setBreakdowns(nextBreakdowns)
        return nextRanking
      })
    } finally {
      setLoading(false)
    }
  }

  function getBreakdownForParticipant(participantId: string) {
    return breakdowns[participantId]
  }

  return { ranking, breakdowns, loading, refetch: computeRanking, getBreakdownForParticipant }
}
