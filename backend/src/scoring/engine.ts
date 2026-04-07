import { supabase } from '../lib/supabase'

const SCORING = {
  pointsPerGame:    { 1: 1, 2: 2, 3: 3, 4: 4 } as Record<number, number>,
  pointsPerSeries:  { 1: 3, 2: 6, 3: 9, 4: 12 } as Record<number, number>,
  pointsPerCravada: { 1: 6, 2: 12, 3: 20, 4: 25 } as Record<number, number>,
}

export async function recalculateAllScores(): Promise<void> {
  console.log('[scoring] Starting full recalculation...')

  const [
    { data: participants },
    { data: allSeries },
    { data: allSeriesPicks },
    { data: allGames },
    { data: allGamePicks },
  ] = await Promise.all([
    supabase.from('participants').select('id'),
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

  const rankData: Array<{ participant_id: string; total_points: number }> = []

  for (const { id: participantId } of participants) {
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
      if (sp.winner_id !== s.winner_id) {
        await supabase.from('series_picks').update({ points: 0 }).eq('id', sp.id)
        continue
      }
      const cravada = sp.games_count === s.games_played
      const pts = cravada
        ? SCORING.pointsPerCravada[s.round]
        : SCORING.pointsPerSeries[s.round]
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
      if (gp.winner_id !== g.winner_id) {
        await supabase.from('game_picks').update({ points: 0 }).eq('id', gp.id)
        continue
      }
      const pts = SCORING.pointsPerGame[g.round]
      await supabase.from('game_picks').update({ points: pts }).eq('id', gp.id)
      total += pts
    }

    rankData.push({ participant_id: participantId, total_points: total })
  }

  // Sort and update ranks
  rankData.sort((a, b) => b.total_points - a.total_points)
  for (let i = 0; i < rankData.length; i++) {
    await supabase
      .from('participants')
      .update({ total_points: rankData[i].total_points, rank: i + 1 })
      .eq('id', rankData[i].participant_id)
  }

  console.log('[scoring] Done. Ranked', rankData.length, 'participants.')
}
