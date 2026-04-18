import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { saveOfficialGamePick } from '../lib/picksApi'
import type { Game, GamePick } from '../types'
import { normalizeGame } from '../utils/bracket'

const PICK_GRACE_MS = 5 * 60_000

export function useGamePicks(participantId?: string, seriesId?: string) {
  const [games, setGames] = useState<Game[]>([])
  const [picks, setPicks] = useState<GamePick[]>([])
  const [loading, setLoading] = useState(false)

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

    if (isGameLocked(game)) {
      return { error: 'A janela deste jogo já foi travada' }
    }

    try {
      const savedPick = await saveOfficialGamePick(gameId, winnerId)

      setPicks((prev) => {
        const alreadyExists = prev.some((pick) => pick.game_id === gameId || pick.id === savedPick.id)
        if (alreadyExists) {
          return prev.map((pick) => (
            pick.game_id === gameId || pick.id === savedPick.id ? savedPick : pick
          ))
        }
        return [...prev, savedPick]
      })
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
    if (!game.tip_off_at) return false
    return new Date(game.tip_off_at).getTime() - PICK_GRACE_MS <= Date.now()
  }

  return { games, picks, loading, saveGamePick, getPickForGame, isGameLocked }
}
