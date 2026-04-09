import { supabase } from '../lib/supabase'
import { fetchPostseasonGames } from '../lib/nba'
import { recalculateAllScores } from '../scoring/engine'

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
const SLOT_BY_TEAMS: Record<string, string> = {
  'OKC-MEM': 'W-R1-1', 'MEM-OKC': 'W-R1-1',
  'GSW-HOU': 'W-R1-2', 'HOU-GSW': 'W-R1-2',
  'DEN-LAC': 'W-R1-3', 'LAC-DEN': 'W-R1-3',
  'MIN-LAL': 'W-R1-4', 'LAL-MIN': 'W-R1-4',
  'CLE-ORL': 'E-R1-1', 'ORL-CLE': 'E-R1-1',
  'BOS-MIA': 'E-R1-2', 'MIA-BOS': 'E-R1-2',
  'NYK-DET': 'E-R1-3', 'DET-NYK': 'E-R1-3',
  'IND-MIL': 'E-R1-4', 'MIL-IND': 'E-R1-4',
  'OKC-GSW': 'W-R2-1', 'GSW-OKC': 'W-R2-1',
  'DEN-MIN': 'W-R2-2', 'MIN-DEN': 'W-R2-2',
  'CLE-BOS': 'E-R2-1', 'BOS-CLE': 'E-R2-1',
  'IND-NYK': 'E-R2-2', 'NYK-IND': 'E-R2-2',
  'OKC-DEN': 'W-CF',   'DEN-OKC': 'W-CF',
  'IND-CLE': 'E-CF',   'CLE-IND': 'E-CF',
  'OKC-IND': 'FINALS', 'IND-OKC': 'FINALS',
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
      const slot = SLOT_BY_TEAMS[pairKey]
      if (!slot) {
        console.warn('[syncNBA] Unknown matchup:', pairKey)
        continue
      }

      // Get series
      const { data: series } = await supabase
        .from('series')
        .select('id, games_played, is_complete, round')
        .eq('slot', slot)
        .single()

      if (!series || series.is_complete) continue

      // Determine winner
      const homeWon = bdlGame.home_team_score > bdlGame.visitor_team_score
      const winnerId = homeWon ? homeAbbr : awayAbbr

      // Upsert game
      const { data: existingGame } = await supabase
        .from('games')
        .select('id')
        .eq('balldontlie_id', bdlGame.id)
        .single()

      if (!existingGame) {
        // Count wins per team in this series to determine game number
        const { data: existingGames } = await supabase
          .from('games')
          .select('id, winner_id')
          .eq('series_id', series.id)

        const gameNumber = (existingGames?.length ?? 0) + 1
        const homeWins = existingGames?.filter((g: any) => g.winner_id === homeAbbr).length ?? 0
        const awayWins = existingGames?.filter((g: any) => g.winner_id === awayAbbr).length ?? 0
        const newHomeWins = homeWon ? homeWins + 1 : homeWins
        const newAwayWins = homeWon ? awayWins : awayWins + 1

        await supabase.from('games').insert({
          series_id: series.id,
          game_number: gameNumber,
          round: series.round,
          team_a_id: homeAbbr,
          team_b_id: awayAbbr,
          home_team_id: homeAbbr,
          winner_id: winnerId,
          score_a: bdlGame.home_team_score,
          score_b: bdlGame.visitor_team_score,
          played: true,
          balldontlie_id: bdlGame.id,
        })

        // Check if series is over (4 wins)
        if (newHomeWins === 4 || newAwayWins === 4) {
          const seriesWinner = newHomeWins === 4 ? homeAbbr : awayAbbr
          await supabase.from('series').update({
            winner_id: seriesWinner,
            games_played: gameNumber,
            is_complete: true,
          }).eq('id', series.id)
        }
      }
    }

    await recalculateAllScores()
    console.log('[syncNBA] Sync complete.')
  } catch (err) {
    console.error('[syncNBA] Error:', err)
  }
}
