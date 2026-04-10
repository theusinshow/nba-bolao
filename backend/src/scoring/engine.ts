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
    const mySeriesPicks = (allSeriesPicks as SeriesPickRow[]).filter((pick) => pick.participant_id === participantId)
    const myGamePicks = (allGamePicks as GamePickRow[]).filter((pick) => pick.participant_id === participantId)

    let total = 0

    for (const pick of mySeriesPicks) {
      const series = seriesMap[pick.series_id]
      if (!series) continue

      total += calculateSeriesPickPoints(
        { winnerId: pick.winner_id, gamesCount: pick.games_count },
        { winnerId: series.winner_id, gamesPlayed: series.games_played, isComplete: series.is_complete, round: series.round }
      )
    }

    for (const pick of myGamePicks) {
      const game = gameMap[pick.game_id]
      if (!game) continue

      total += calculateGamePickPoints(
        { winnerId: pick.winner_id },
        {
          winnerId: game.winner_id,
          played: game.played,
          round: seriesMap[game.series_id]?.round ?? inferRoundFromSeriesId(game.series_id),
        }
      )
    }

    ranking.push({
      participant_id: participantId,
      participant_name: participantName,
      total_points: total,
    })
  }

  ranking.sort((a, b) => compareRankingEntries(
    { participantName: a.participant_name, totalPoints: a.total_points },
    { participantName: b.participant_name, totalPoints: b.total_points }
  ))

  return ranking
}

export async function recalculateAllScores(): Promise<void> {
  console.log('[scoring] Starting full recalculation...')
  try {
    const ranking = await computeRankingSnapshot()

    for (let i = 0; i < ranking.length; i++) {
      await supabase
        .from('participants')
        .update({ total_points: ranking[i].total_points, rank: i + 1 })
        .eq('id', ranking[i].participant_id)
    }

    console.log('[scoring] Done. Ranked', ranking.length, 'participants.')
    console.table(ranking.slice(0, 10))
  } catch (error) {
    console.error('[scoring] Failed to recalculate scores:', error)
  }
}
