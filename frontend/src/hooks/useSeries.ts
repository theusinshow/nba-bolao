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
    const { data } = await supabase
      .from('series')
      .select(`
        *,
        home_team:home_team_id(id, name, abbreviation, conference, seed, primary_color),
        away_team:away_team_id(id, name, abbreviation, conference, seed, primary_color),
        winner:winner_id(id, name, abbreviation)
      `)
      .order('round')
      .order('slot')
    if (data) setSeries(data as Series[])
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

  function getSeriesBySlot(slot: string): Series | undefined {
    return series.find((s) => s.slot === slot)
  }

  return { series, picks, loading, savePick, getPickForSeries, getSeriesBySlot }
}
