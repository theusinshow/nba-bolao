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

function isFinalStatus(status: string): boolean {
  return /^final/i.test(status.trim())
}

/**
 * Converts a BDL game date + status into a proper ISO datetime for tip_off_at.
 *
 * For upcoming games the BDL status is a time string like "7:30 pm ET".
 * For played/in-progress games it is "Final", "Final/OT", "Qtr X ...", etc.
 *
 * NBA games in April–June fall in EDT (UTC-4).
 * Returns null for unplayed games whose time cannot be parsed, so those
 * games remain unlocked until played=true is set by the next sync.
 */
function parseTipOffAt(date: string, status: string): string | null {
  const trimmed = status.trim()

  // Game already finished — any past datetime is fine for lock purposes
  if (isFinalStatus(trimmed)) {
    return `${date}T00:00:00Z`
  }

  // Try to parse time like "7:30 pm ET" or "7:30 PM ET"
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)\s*ET$/i)
  if (!match) return null

  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const isPm = match[3].toLowerCase() === 'pm'

  if (isPm && hours !== 12) hours += 12
  if (!isPm && hours === 12) hours = 0

  // EDT = UTC-4 (playoffs run April–June)
  const utcHours = hours + 4

  const h = String(utcHours % 24).padStart(2, '0')
  const m = String(minutes).padStart(2, '0')

  if (utcHours < 24) {
    return `${date}T${h}:${m}:00Z`
  }

  // Tip-off crosses midnight UTC — advance to next calendar day
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  const nextDate = d.toISOString().slice(0, 10)
  return `${nextDate}T${h}:${m}:00Z`
}

export async function syncNBA(): Promise<void> {
  console.log('[syncNBA] Starting sync...')
  try {
    const season = Number(process.env.BALLDONTLIE_SEASON ?? getDefaultSeason())
    console.log('[syncNBA] Using season', season)

    const bdlGames = [...await fetchPostseasonGames(season)].sort(
      (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()
    )

    for (const bdlGame of bdlGames) {
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

      if (!series) continue

      const played = isFinalStatus(bdlGame.status)
      const homeWon = bdlGame.home_team_score > bdlGame.visitor_team_score
      const awayWon = bdlGame.visitor_team_score > bdlGame.home_team_score
      const winnerId = played ? (homeWon ? homeAbbr : awayWon ? awayAbbr : null) : null

      // Load existing games for this series (used for series completion check)
      const { data: existingGames } = await supabase
        .from('games')
        .select('id, nba_game_id, winner_id, game_number, played')
        .eq('series_id', series.id)
        .order('game_number')

      const existingGame = existingGames?.find((g) => g.nba_game_id === bdlGame.id) ?? null

      // Use MAX(game_number) + 1 to avoid collisions when games are deleted or
      // when multiple syncs run in quick succession
      const maxGameNumber = (existingGames ?? []).reduce(
        (max, g) => Math.max(max, g.game_number), 0
      )
      const gameNumber = existingGame
        ? existingGame.game_number
        : maxGameNumber + 1

      const payload = {
        series_id: series.id,
        game_number: gameNumber,
        home_team_id: homeAbbr,
        away_team_id: awayAbbr,
        winner_id: winnerId,
        home_score: bdlGame.home_team_score,
        away_score: bdlGame.visitor_team_score,
        played,
        tip_off_at: parseTipOffAt(bdlGame.date, bdlGame.status),
        nba_game_id: bdlGame.id,
      }

      if (existingGame) {
        await supabase.from('games').update(payload).eq('id', existingGame.id)
      } else {
        await supabase.from('games').insert(payload)
      }

      const gamesAfterSync = existingGame
        ? (existingGames ?? []).map((game) =>
            game.id === existingGame.id ? { ...game, winner_id: winnerId, played } : game
          )
        : [...(existingGames ?? []), { id: `new-${bdlGame.id}`, winner_id: winnerId, game_number: gameNumber, played }]

      // Guard against null team IDs (series not yet fully seeded)
      // Without this, winner_id === null would match unplayed games and
      // could falsely mark a series as complete
      const homeWins = series.home_team_id
        ? gamesAfterSync.filter((game) => game.winner_id === series.home_team_id).length
        : 0
      const awayWins = series.away_team_id
        ? gamesAfterSync.filter((game) => game.winner_id === series.away_team_id).length
        : 0
      const teamsKnown = !!series.home_team_id && !!series.away_team_id
      const isComplete = teamsKnown && (homeWins === 4 || awayWins === 4)

      await supabase.from('series').update({
        games_played: gamesAfterSync.filter((game) => game.played).length,
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
