import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Game, Series, Team } from '../types'
import { isGameLive } from '../utils/gameStatus'

export interface EnrichedGameFeedItem extends Game {
  home_team: Team | null
  away_team: Team | null
  series: Series | null
}

function enrichGames(games: Game[], teams: Team[], series: Series[]): EnrichedGameFeedItem[] {
  const teamMap = new Map(teams.map((team) => [team.id, team]))
  const seriesMap = new Map(series.map((item) => [item.id, item]))

  return games.map((game) => ({
    ...game,
    home_team: teamMap.get(game.home_team_id) ?? null,
    away_team: teamMap.get(game.away_team_id) ?? null,
    series: seriesMap.get(game.series_id) ?? null,
  }))
}

export function useGameFeed() {
  const [games, setGames] = useState<EnrichedGameFeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function fetchFeed() {
      const [{ data: gamesData }, { data: teamsData }, { data: seriesData }] = await Promise.all([
        supabase.from('games').select('*').order('tip_off_at', { ascending: true }).order('game_number', { ascending: true }),
        supabase.from('teams').select('*'),
        supabase.from('series').select('*'),
      ])

      if (!active) return

      const enriched = enrichGames(
        (gamesData as Game[] | null) ?? [],
        (teamsData as Team[] | null) ?? [],
        (seriesData as Series[] | null) ?? []
      )
      setGames(enriched)
      setLoading(false)
    }

    fetchFeed()

    const channel = supabase
      .channel('game-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, fetchFeed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'series' }, fetchFeed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, fetchFeed)
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [])

  const recentCompletedGames = useMemo(
    () =>
      games
        .filter((game) => game.played)
        .sort((left, right) => new Date(right.tip_off_at ?? 0).getTime() - new Date(left.tip_off_at ?? 0).getTime())
        .slice(0, 6),
    [games]
  )

  const liveGames = useMemo(
    () =>
      games
        .filter((game) => isGameLive(game))
        .sort((left, right) => new Date(left.tip_off_at ?? 0).getTime() - new Date(right.tip_off_at ?? 0).getTime()),
    [games]
  )

  const upcomingGames = useMemo(
    () =>
      games
        .filter((game) => !game.played && !isGameLive(game) && !!game.tip_off_at && new Date(game.tip_off_at).getTime() > Date.now())
        .sort((left, right) => new Date(left.tip_off_at ?? 0).getTime() - new Date(right.tip_off_at ?? 0).getTime())
        .slice(0, 6),
    [games]
  )

  return {
    games,
    recentCompletedGames,
    liveGames,
    upcomingGames,
    loading,
    hasRealGames: games.length > 0,
  }
}
