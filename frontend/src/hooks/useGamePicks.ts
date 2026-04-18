import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Game, GamePick } from '../types'
import { normalizeGame } from '../utils/bracket'

export function useGamePicks(participantId?: string, seriesId?: string) {
  const [games, setGames] = useState<Game[]>([])
  const [picks, setPicks] = useState<GamePick[]>([])
  const [seriesLockTipOff, setSeriesLockTipOff] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function getSeriesLockTipOff(nextGames: Game[]) {
    return nextGames
      .filter((game) => !!game.tip_off_at)
      .sort((left, right) => new Date(left.tip_off_at!).getTime() - new Date(right.tip_off_at!).getTime())[0]?.tip_off_at ?? null
  }

  useEffect(() => {
    if (!seriesId) return
    setLoading(true)
    fetchGames().finally(() => setLoading(false))
  }, [seriesId])

  useEffect(() => {
    if (participantId && games.length > 0) fetchPicks()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId, games.length])

  async function fetchGames() {
    if (!seriesId) return
    const [{ data: gamesData }, { data: seriesData }] = await Promise.all([
      supabase
        .from('games')
        .select('*')
        .eq('series_id', seriesId)
        .order('game_number'),
      supabase
        .from('series')
        .select('round')
        .eq('id', seriesId)
        .single(),
    ])

    if (gamesData) {
      const round = seriesData?.round
      const normalizedGames = (gamesData as Game[]).map((game) => normalizeGame(game, round))
      setGames(normalizedGames)
      setSeriesLockTipOff(getSeriesLockTipOff(normalizedGames))
    }
  }

  async function fetchPicks() {
    if (!participantId || games.length === 0) return
    const gameIds = games.map((g) => g.id)
    const { data } = await supabase
      .from('game_picks')
      .select('*')
      .eq('participant_id', participantId)
      .in('game_id', gameIds)
    if (data) setPicks(data as GamePick[])
  }

  async function saveGamePick(gameId: string, winnerId: string) {
    if (!participantId) return { error: 'Participante não identificado' }

    const game = games.find((g) => g.id === gameId)
    if (!game) return { error: 'Jogo não encontrado' }

    // Check if game is already finished
    if (game.played) return { error: 'Jogo já finalizado' }

    // Check if game has started (tip_off_at is a proper datetime when parsed from API status)
    if (seriesLockTipOff && new Date(seriesLockTipOff) <= new Date()) {
      return { error: 'A série já começou' }
    }

    try {
      const { data: existing, error: existingError } = await supabase
        .from('game_picks')
        .select('*')
        .eq('participant_id', participantId)
        .eq('game_id', gameId)
        .limit(1)
        .maybeSingle()

      if (existingError) {
        return { error: existingError.message }
      }

      if (existing) {
        const { data, error } = await supabase
          .from('game_picks')
          .update({ winner_id: winnerId })
          .eq('id', existing.id)
          .select()
          .single()

        if (error || !data) {
          return { error: error?.message ?? 'Não foi possível atualizar o palpite do jogo' }
        }

        setPicks((prev) => prev.map((pick) => (
          pick.game_id === gameId || pick.id === existing.id ? data as GamePick : pick
        )))
      } else {
        const { data, error } = await supabase
          .from('game_picks')
          .insert({ participant_id: participantId, game_id: gameId, winner_id: winnerId })
          .select()
          .single()

        if (error || !data) {
          return { error: error?.message ?? 'Não foi possível salvar o palpite do jogo' }
        }

        setPicks((prev) => {
          const alreadyExists = prev.some((pick) => pick.game_id === gameId)
          if (alreadyExists) {
            return prev.map((pick) => (pick.game_id === gameId ? data as GamePick : pick))
          }
          return [...prev, data as GamePick]
        })
      }
    } catch (error) {
      console.error('[useGamePicks.saveGamePick] unexpected error:', error)
      return {
        error: error instanceof Error ? error.message : 'Erro inesperado ao salvar o palpite do jogo',
      }
    }

    return { error: null }
  }

  function getPickForGame(gameId: string): GamePick | undefined {
    return picks.find((p) => p.game_id === gameId)
  }

  function isGameLocked(game: Game): boolean {
    if (game.played) return true
    if (!seriesLockTipOff) return false
    return new Date(seriesLockTipOff) <= new Date()
  }

  return { games, picks, loading, saveGamePick, getPickForGame, isGameLocked }
}
