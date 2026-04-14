import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Game, Series, SeriesPick } from '../types'
import { getSeriesSlot } from '../utils/bracket'
import { TEAM_MAP } from '../data/teams2025'

function getSeriesLockTipOff(seriesId: string, games: Game[]): string | null {
  const datedGames = games
    .filter((game) => game.series_id === seriesId && !!game.tip_off_at)
    .sort((left, right) => new Date(left.tip_off_at!).getTime() - new Date(right.tip_off_at!).getTime())

  return datedGames[0]?.tip_off_at ?? null
}

export function useSeries(participantId?: string) {
  const [series, setSeries] = useState<Series[]>([])
  const [picks, setPicks] = useState<SeriesPick[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()

    const seriesSub = supabase
      .channel('series-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'series' }, () => {
        fetchSeries()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
        fetchSeries()
      })
      .subscribe()

    return () => { supabase.removeChannel(seriesSub) }
  }, [])

  useEffect(() => {
    if (participantId) fetchPicks()
  }, [participantId])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchSeries(), participantId ? fetchPicks() : Promise.resolve()])
    setLoading(false)
  }

  async function fetchSeries() {
    const [{ data: seriesData }, { data: teamsData }, { data: gamesData }] = await Promise.all([
      supabase.from('series').select('*').order('round', { ascending: true }).order('position', { ascending: true }),
      supabase.from('teams').select('*'),
      supabase.from('games').select('series_id, tip_off_at'),
    ])
    if (!seriesData) return
    const teamMap = Object.fromEntries(
      (teamsData ?? []).map((t) => [t.id, { ...t, ...TEAM_MAP[t.id] }])
    )
    const games = (gamesData ?? []) as Pick<Game, 'series_id' | 'tip_off_at'>[] as Game[]
    const merged = seriesData.map((s) => ({
      ...s,
      slot: getSeriesSlot({ id: s.id, slot: (s as Series).slot ?? null }),
      tip_off_at: getSeriesLockTipOff(s.id, games),
      home_team: teamMap[s.home_team_id] ?? null,
      away_team: teamMap[s.away_team_id] ?? null,
      winner: s.winner_id ? (teamMap[s.winner_id] ?? null) : null,
    }))
    setSeries(merged as Series[])
  }

  async function fetchPicks() {
    if (!participantId) return
    const { data } = await supabase
      .from('series_picks')
      .select('*')
      .eq('participant_id', participantId)
    if (data) setPicks(data as SeriesPick[])
  }

  async function savePick(seriesId: string, winnerId: string, gamesCount: number) {
    if (!participantId) throw new Error('Participante não identificado')

    const currentSeries = getSeriesById(seriesId)
    if (!currentSeries) throw new Error('Série não encontrada')
    if (currentSeries.is_complete) throw new Error('Série já encerrada')
    if (currentSeries.tip_off_at && new Date(currentSeries.tip_off_at) <= new Date()) {
      throw new Error('Os palpites desta série já foram travados')
    }

    const existing = picks.find((p) => p.series_id === seriesId)

    if (existing) {
      const { data } = await supabase
        .from('series_picks')
        .update({ winner_id: winnerId, games_count: gamesCount })
        .eq('id', existing.id)
        .select()
        .single()
      if (!data) throw new Error('Não foi possível atualizar o palpite da série')
      setPicks((prev) => prev.map((p) => (p.id === existing.id ? (data as SeriesPick) : p)))
    } else {
      const { data } = await supabase
        .from('series_picks')
        .insert({ participant_id: participantId, series_id: seriesId, winner_id: winnerId, games_count: gamesCount })
        .select()
        .single()
      if (!data) throw new Error('Não foi possível salvar o palpite da série')
      setPicks((prev) => [...prev, data as SeriesPick])
    }
  }

  function getPickForSeries(seriesId: string): SeriesPick | undefined {
    return picks.find((p) => p.series_id === seriesId)
  }

  function getSeriesById(id: string): Series | undefined {
    return series.find((s) => s.id === id)
  }

  return { series, picks, loading, savePick, getPickForSeries, getSeriesById }
}
