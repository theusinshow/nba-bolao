import { supabase } from '../lib/supabase'
import {
  calculateSeriesPickPoints,
  calculateGamePickPoints,
  compareRankingEntries,
} from './rules'
import { inferRoundFromSeriesId } from '../utils/bracket'

export interface RankingSnapshotEntry {
  participant_id: string
  participant_name: string
  total_points: number
  cravadas: number
  series_correct: number
  games_correct: number
}

export async function computeRankingSnapshot(): Promise<RankingSnapshotEntry[]> {
  const [
    { data: participants },
    { data: allSeries },
    { data: allSeriesPicks },
    { data: allGames },
    { data: allGamePicks },
  ] = await Promise.all([
    supabase.from('participants').select('id, name'),
    supabase.from('series').select('*'),
    supabase.from('series_picks').select('*'),
    supabase.from('games').select('*'),
    supabase.from('game_picks').select('*'),
  ])

  if (!participants || !allSeries || !allSeriesPicks || !allGames || !allGamePicks) {
    throw new Error('Failed to fetch data for ranking snapshot')
  }

  type SeriesRow = { id: string; winner_id: string | null; games_played: number; is_complete: boolean; round: number }
  type GameRow = { id: string; series_id: string; winner_id: string | null; played: boolean }
  type SeriesPickRow = { participant_id: string; series_id: string; winner_id: string; games_count: number }
  type GamePickRow = { participant_id: string; game_id: string; winner_id: string }

  const seriesMap = Object.fromEntries((allSeries as SeriesRow[]).map((series) => [series.id, series]))
  const gameMap = Object.fromEntries((allGames as GameRow[]).map((game) => [game.id, game]))

  const ranking: RankingSnapshotEntry[] = []

  for (const { id: participantId, name: participantName } of participants) {
    // Deduplicate: keep only the last pick per series/game in case unique constraint
    // is missing or was bypassed. Without this, duplicate rows would inflate scores.
    const rawSeriesPicks = (allSeriesPicks as SeriesPickRow[]).filter((pick) => pick.participant_id === participantId)
    const seenSeriesIds = new Set<string>()
    const mySeriesPicks = rawSeriesPicks.filter((pick) => {
      if (seenSeriesIds.has(pick.series_id)) return false
      seenSeriesIds.add(pick.series_id)
      return true
    })

    const rawGamePicks = (allGamePicks as GamePickRow[]).filter((pick) => pick.participant_id === participantId)
    const seenGameIds = new Set<string>()
    const myGamePicks = rawGamePicks.filter((pick) => {
      if (seenGameIds.has(pick.game_id)) return false
      seenGameIds.add(pick.game_id)
      return true
    })

    let total = 0
    let cravadas = 0
    let seriesCorrect = 0
    let gamesCorrect = 0

    for (const pick of mySeriesPicks) {
      const series = seriesMap[pick.series_id]
      if (!series) continue

      const points = calculateSeriesPickPoints(
        { winnerId: pick.winner_id, gamesCount: pick.games_count },
        { winnerId: series.winner_id, gamesPlayed: series.games_played, isComplete: series.is_complete, round: series.round }
      )
      total += points

      if (points > 0) {
        seriesCorrect += 1
        if (pick.winner_id === series.winner_id && pick.games_count === series.games_played) {
          cravadas += 1
        }
      }
    }

    for (const pick of myGamePicks) {
      const game = gameMap[pick.game_id]
      if (!game) continue

      const points = calculateGamePickPoints(
        { winnerId: pick.winner_id },
        {
          winnerId: game.winner_id,
          played: game.played,
          round: seriesMap[game.series_id]?.round ?? inferRoundFromSeriesId(game.series_id),
        }
      )
      total += points
      if (points > 0) gamesCorrect += 1
    }

    ranking.push({
      participant_id: participantId,
      participant_name: participantName,
      total_points: total,
      cravadas,
      series_correct: seriesCorrect,
      games_correct: gamesCorrect,
    })
  }

  ranking.sort((a, b) => compareRankingEntries(
    {
      participantName: a.participant_name,
      totalPoints: a.total_points,
      cravadas: a.cravadas,
      seriesCorrect: a.series_correct,
      gamesCorrect: a.games_correct,
    },
    {
      participantName: b.participant_name,
      totalPoints: b.total_points,
      cravadas: b.cravadas,
      seriesCorrect: b.series_correct,
      gamesCorrect: b.games_correct,
    }
  ))

  return ranking
}

export async function recalculateAllScores(): Promise<void> {
  console.log('[scoring] Starting full recalculation...')
  try {
    const ranking = await computeRankingSnapshot()

    // The live schema does not persist rank/points on participants, so the
    // backend publishes a computed snapshot through logs while the frontend
    // remains the source of truth for live ranking display.
    console.log('[scoring] Done. Computed ranking snapshot for', ranking.length, 'participants.')
    ranking.slice(0, 10).forEach((entry, i) => {
      console.log(`  ${i + 1}. ${entry.participant_name} — ${entry.total_points} pts`)
    })
  } catch (error) {
    console.error('[scoring] Failed to recalculate scores:', error)
    throw error
  }
}
