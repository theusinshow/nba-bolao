import { supabase } from '../lib/supabase'
import { fetchPostseasonGames } from '../lib/nba'
import { recalculateAllScores } from '../scoring/engine'
import { normalizeSeriesSlot } from '../utils/bracket'

// Team abbreviation map: balldontlie abbrev → our team IDs
// BDL uses same abbreviations as our system in most cases
const ABBREV_MAP: Record<string, string> = {
  OKC: 'OKC', HOU: 'HOU', GSW: 'GSW', DEN: 'DEN',
  LAC: 'LAC', LAL: 'LAL', MIN: 'MIN', MEM: 'MEM',
  CLE: 'CLE', BOS: 'BOS', NYK: 'NYK', IND: 'IND',
  MIL: 'MIL', DET: 'DET', MIA: 'MIA', ORL: 'ORL',
  GS: 'GSW', // alternate
}

function mapAbbr(abbr: string): string {
  return ABBREV_MAP[abbr] ?? abbr
}

// Determine slot from two team IDs
// This mapping is static for 2025 playoffs
const SERIES_ID_BY_TEAMS: Record<string, string> = {
  'OKC-MEM': 'W1-1', 'MEM-OKC': 'W1-1',
  'GSW-HOU': 'W1-2', 'HOU-GSW': 'W1-2',
  'DEN-LAC': 'W1-3', 'LAC-DEN': 'W1-3',
  'MIN-LAL': 'W1-4', 'LAL-MIN': 'W1-4',
  'CLE-ORL': 'E1-1', 'ORL-CLE': 'E1-1',
  'BOS-MIA': 'E1-2', 'MIA-BOS': 'E1-2',
  'NYK-DET': 'E1-3', 'DET-NYK': 'E1-3',
  'IND-MIL': 'E1-4', 'MIL-IND': 'E1-4',
  'OKC-GSW': 'W2-1', 'GSW-OKC': 'W2-1',
  'DEN-MIN': 'W2-2', 'MIN-DEN': 'W2-2',
  'CLE-BOS': 'E2-1', 'BOS-CLE': 'E2-1',
  'IND-NYK': 'E2-2', 'NYK-IND': 'E2-2',
  'OKC-DEN': 'WCF',  'DEN-OKC': 'WCF',
  'IND-CLE': 'ECF',  'CLE-IND': 'ECF',
  'OKC-IND': 'FIN',  'IND-OKC': 'FIN',
}

function getDefaultSeason(): number {
  const now = new Date()
  return now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
}

export async function syncNBA(): Promise<void> {
  console.log('[syncNBA] Starting sync...')
  try {
    const season = Number(process.env.BALLDONTLIE_SEASON ?? getDefaultSeason())
    console.log('[syncNBA] Using season', season)

    const bdlGames = await fetchPostseasonGames(season)
    const finished = bdlGames.filter((g) => g.status === 'Final')

    for (const bdlGame of finished) {
      const homeAbbr = mapAbbr(bdlGame.home_team.abbreviation)
      const awayAbbr = mapAbbr(bdlGame.visitor_team.abbreviation)
      const pairKey = `${homeAbbr}-${awayAbbr}`
      const seriesId = normalizeSeriesSlot(SERIES_ID_BY_TEAMS[pairKey])
      if (!seriesId) {
        console.warn('[syncNBA] Unknown matchup:', pairKey)
        continue
      }

      // Get series
      const { data: series } = await supabase
        .from('series')
        .select('id, games_played, is_complete, round, home_team_id, away_team_id')
        .eq('id', seriesId)
        .single()

      if (!series || series.is_complete) continue

      // Determine winner
      const homeWon = bdlGame.home_team_score > bdlGame.visitor_team_score
      const winnerId = homeWon ? homeAbbr : awayAbbr

      // Upsert game
      const { data: existingGame } = await supabase
        .from('games')
        .select('id')
        .eq('nba_game_id', bdlGame.id)
        .single()

      const { data: existingGames } = await supabase
        .from('games')
        .select('id, winner_id, game_number')
        .eq('series_id', series.id)
        .order('game_number')

      const gameNumber = existingGame
        ? existingGames?.find((game) => game.id === existingGame.id)?.game_number ?? (existingGames?.length ?? 0)
        : (existingGames?.length ?? 0) + 1

      const payload = {
        series_id: series.id,
        game_number: gameNumber,
        home_team_id: homeAbbr,
        away_team_id: awayAbbr,
        winner_id: winnerId,
        home_score: bdlGame.home_team_score,
        away_score: bdlGame.visitor_team_score,
        played: true,
        tip_off_at: bdlGame.date,
        nba_game_id: bdlGame.id,
      }

      if (existingGame) {
        await supabase.from('games').update(payload).eq('id', existingGame.id)
      } else {
        await supabase.from('games').insert(payload)
      }

      const gamesAfterSync = existingGame
        ? (existingGames ?? []).map((game) => game.id === existingGame.id ? { ...game, winner_id: winnerId } : game)
        : [...(existingGames ?? []), { id: `new-${bdlGame.id}`, winner_id: winnerId, game_number: gameNumber }]

      const homeWins = gamesAfterSync.filter((game) => game.winner_id === series.home_team_id).length
      const awayWins = gamesAfterSync.filter((game) => game.winner_id === series.away_team_id).length
      const isComplete = homeWins === 4 || awayWins === 4

      await supabase.from('series').update({
        games_played: Math.max(series.games_played ?? 0, gamesAfterSync.length),
        winner_id: isComplete ? (homeWins === 4 ? series.home_team_id : series.away_team_id) : null,
        is_complete: isComplete,
      }).eq('id', series.id)
    }

    await recalculateAllScores()
    console.log('[syncNBA] Sync complete.')
  } catch (err) {
    console.error('[syncNBA] Error:', err)
  }
}
