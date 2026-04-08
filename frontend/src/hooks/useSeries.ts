import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Series, SeriesPick } from '../types'

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
    const [{ data: seriesData }, { data: teamsData }] = await Promise.all([
      supabase.from('series').select('*').order('round', { ascending: true }).order('position', { ascending: true }),
      supabase.from('teams').select('*'),
    ])
    if (!seriesData) return
    const teamMap = Object.fromEntries((teamsData ?? []).map((t) => [t.id, t]))
    const merged = seriesData.map((s) => ({
      ...s,
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
    if (!participantId) return

    const existing = picks.find((p) => p.series_id === seriesId)

    if (existing) {
      const { data } = await supabase
        .from('series_picks')
        .update({ winner_id: winnerId, games_count: gamesCount })
        .eq('id', existing.id)
        .select()
        .single()
      if (data) setPicks((prev) => prev.map((p) => (p.id === existing.id ? (data as SeriesPick) : p)))
    } else {
      const { data } = await supabase
        .from('series_picks')
        .insert({ participant_id: participantId, series_id: seriesId, winner_id: winnerId, games_count: gamesCount })
        .select()
        .single()
      if (data) setPicks((prev) => [...prev, data as SeriesPick])
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
