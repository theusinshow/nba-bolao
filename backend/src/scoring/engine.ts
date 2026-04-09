import { supabase } from '../lib/supabase'
import {
  calculateSeriesPickPoints,
  calculateGamePickPoints,
  compareRankingEntries,
} from './rules'

export async function recalculateAllScores(): Promise<void> {
  console.log('[scoring] Starting full recalculation...')

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
    console.error('[scoring] Failed to fetch data')
    return
  }

  type SeriesRow = { id: string; winner_id: string | null; games_played: number; is_complete: boolean; round: number }
  type GameRow = { id: string; winner_id: string | null; played: boolean; round: number }
  type SeriesPickRow = { id: string; participant_id: string; series_id: string; winner_id: string; games_count: number }
  type GamePickRow = { id: string; participant_id: string; game_id: string; winner_id: string }

  const seriesMap = Object.fromEntries((allSeries as SeriesRow[]).map((s) => [s.id, s]))
  const gameMap = Object.fromEntries((allGames as GameRow[]).map((g) => [g.id, g]))

  const rankData: Array<{ participant_id: string; participant_name: string; total_points: number }> = []

  for (const { id: participantId, name: participantName } of participants) {
    const mySeriesPicks = (allSeriesPicks as SeriesPickRow[]).filter((p) => p.participant_id === participantId)
    const myGamePicks = (allGamePicks as GamePickRow[]).filter((p) => p.participant_id === participantId)

    let total = 0

    // Update series_picks points
    for (const sp of mySeriesPicks) {
      const s = seriesMap[sp.series_id]
      if (!s || !s.is_complete || !s.winner_id) {
        await supabase.from('series_picks').update({ points: 0 }).eq('id', sp.id)
        continue
      }

      const pts = calculateSeriesPickPoints(
        { winnerId: sp.winner_id, gamesCount: sp.games_count },
        { winnerId: s.winner_id, gamesPlayed: s.games_played, isComplete: s.is_complete, round: s.round }
      )

      await supabase.from('series_picks').update({ points: pts }).eq('id', sp.id)
      total += pts
    }

    // Update game_picks points
    for (const gp of myGamePicks) {
      const g = gameMap[gp.game_id]
      if (!g || !g.played || !g.winner_id) {
        await supabase.from('game_picks').update({ points: 0 }).eq('id', gp.id)
        continue
      }

      const pts = calculateGamePickPoints(
        { winnerId: gp.winner_id },
        { winnerId: g.winner_id, played: g.played, round: g.round }
      )

      await supabase.from('game_picks').update({ points: pts }).eq('id', gp.id)
      total += pts
    }

    rankData.push({ participant_id: participantId, participant_name: participantName, total_points: total })
  }

  // Sort and update ranks
  rankData.sort((a, b) => compareRankingEntries(
    { participantName: a.participant_name, totalPoints: a.total_points },
    { participantName: b.participant_name, totalPoints: b.total_points }
  ))

  for (let i = 0; i < rankData.length; i++) {
    await supabase
      .from('participants')
      .update({ total_points: rankData[i].total_points, rank: i + 1 })
      .eq('id', rankData[i].participant_id)
  }

  console.log('[scoring] Done. Ranked', rankData.length, 'participants.')
}
