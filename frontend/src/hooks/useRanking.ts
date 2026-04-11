import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Game, GamePick, Participant, ParticipantScoreBreakdown, RankingEntry, Series, SeriesPick, Team } from '../types'
import { buildRankingState } from '../utils/ranking'

export function useRanking() {
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [breakdowns, setBreakdowns] = useState<Record<string, ParticipantScoreBreakdown>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const previousRankingRef = useRef<RankingEntry[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    computeRanking()

    function scheduleCompute() {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(computeRanking, 1500)
    }

    const sub = supabase
      .channel('ranking-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, scheduleCompute)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'series' }, scheduleCompute)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'series_picks' }, scheduleCompute)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_picks' }, scheduleCompute)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, scheduleCompute)
      .subscribe()

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(sub)
    }
  }, [])

  async function computeRanking() {
    setLoading(true)
    setError(null)
    try {
      const [
        { data: participants, error: e1 },
        { data: allSeries, error: e2 },
        { data: allSeriesPicks, error: e3 },
        { data: allGames, error: e4 },
        { data: allGamePicks, error: e5 },
        { data: teams, error: e6 },
      ] = await Promise.all([
        supabase.from('participants').select('*'),
        supabase.from('series').select('*'),
        supabase.from('series_picks').select('*'),
        supabase.from('games').select('*'),
        supabase.from('game_picks').select('*'),
        supabase.from('teams').select('*'),
      ])

      const fetchError = e1 ?? e2 ?? e3 ?? e4 ?? e5 ?? e6
      if (fetchError) {
        console.error('[useRanking] DB error:', fetchError.message)
        setError('Erro ao carregar ranking. Tente novamente.')
        return
      }

      if (!participants || !allSeries || !allSeriesPicks || !allGames || !allGamePicks || !teams) {
        setError('Dados incompletos ao carregar ranking.')
        return
      }

      const { ranking: nextRanking, breakdowns: nextBreakdowns } = buildRankingState({
        participants: participants as Participant[],
        series: allSeries as Series[],
        games: allGames as Game[],
        seriesPicks: allSeriesPicks as SeriesPick[],
        gamePicks: allGamePicks as GamePick[],
        teams: teams as Team[],
        previousRanking: previousRankingRef.current,
      })
      previousRankingRef.current = nextRanking
      setRanking(nextRanking)
      setBreakdowns(nextBreakdowns)
    } catch (err) {
      console.error('[useRanking] Unexpected error:', err)
      setError('Erro inesperado ao calcular ranking.')
    } finally {
      setLoading(false)
    }
  }

  function getBreakdownForParticipant(participantId: string) {
    return breakdowns[participantId]
  }

  return { ranking, breakdowns, loading, error, refetch: computeRanking, getBreakdownForParticipant }
}
