import { Router } from 'express'
import { supabase } from '../lib/supabase'
import { fetchPostseasonGames } from '../lib/nba'

const router = Router()

const ABBREV_MAP: Record<string, string> = {
  OKC: 'OKC', HOU: 'HOU', GSW: 'GSW', DEN: 'DEN',
  LAC: 'LAC', LAL: 'LAL', MIN: 'MIN', MEM: 'MEM',
  CLE: 'CLE', BOS: 'BOS', NYK: 'NYK', IND: 'IND',
  MIL: 'MIL', DET: 'DET', MIA: 'MIA', ORL: 'ORL',
  ATL: 'ATL', TOR: 'TOR', GS: 'GSW',
}

function mapAbbr(abbr: string): string {
  return ABBREV_MAP[abbr] ?? abbr
}

function isFinalStatus(status: string): boolean {
  return /^final/i.test(status.trim())
}

function inferGameState(status: string, period: number): 'scheduled' | 'live' | 'halftime' | 'final' {
  const normalized = status.trim().toLowerCase()
  if (isFinalStatus(status)) return 'final'
  if (normalized.includes('half')) return 'halftime'
  if (normalized.startsWith('q') || normalized.includes('ot') || period > 0) return 'live'
  return 'scheduled'
}

function extractClock(status: string): string | null {
  const match = status.trim().match(/(\d{1,2}:\d{2})/)
  return match ? match[1] : null
}

function parseTipOffAt(date: string, status: string, datetime?: string | null): string | null {
  if (datetime && !Number.isNaN(Date.parse(datetime))) return new Date(datetime).toISOString()
  if (!Number.isNaN(Date.parse(status))) return new Date(status).toISOString()

  const trimmed = status.trim()
  if (isFinalStatus(trimmed)) {
    return `${date}T00:00:00Z`
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)\s*ET$/i)
  if (!match) return null

  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const isPm = match[3].toLowerCase() === 'pm'

  if (isPm && hours !== 12) hours += 12
  if (!isPm && hours === 12) hours = 0

  const utcHours = hours + 4
  const h = String(utcHours % 24).padStart(2, '0')
  const m = String(minutes).padStart(2, '0')

  if (utcHours < 24) {
    return `${date}T${h}:${m}:00Z`
  }

  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  const nextDate = d.toISOString().slice(0, 10)
  return `${nextDate}T${h}:${m}:00Z`
}

function getDefaultSeason(): number {
  const now = new Date()
  return now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
}

router.get('/rail', async (_req, res) => {
  try {
    const season = Number(process.env.BALLDONTLIE_SEASON ?? getDefaultSeason())
    const [providerGames, localGamesResult] = await Promise.all([
      fetchPostseasonGames(season),
      supabase.from('games').select('nba_game_id'),
    ])

    if (localGamesResult.error) throw localGamesResult.error

    const localIds = new Set(
      (localGamesResult.data ?? [])
        .map((game) => game.nba_game_id)
        .filter((value): value is number => typeof value === 'number')
    )

    const unmatchedGames = providerGames
      .filter((game) => !localIds.has(game.id))
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
      .map((game) => {
        const homeTeamId = mapAbbr(game.home_team.abbreviation)
        const awayTeamId = mapAbbr(game.visitor_team.abbreviation)
        const played = isFinalStatus(game.status)
        const winnerId = played
          ? (
              game.home_team_score > game.visitor_team_score
                ? homeTeamId
                : game.visitor_team_score > game.home_team_score
                ? awayTeamId
                : null
            )
          : null

        return {
          id: `external-${game.id}`,
          nba_game_id: game.id,
          tip_off_at: parseTipOffAt(game.date, game.status, game.datetime),
          played,
          game_state: inferGameState(game.status, game.period),
          status_text: game.status.trim(),
          current_period: Number.isFinite(game.period) && game.period > 0 ? game.period : null,
          clock: extractClock(game.status),
          home_score: game.home_team_score,
          away_score: game.visitor_team_score,
          winner_id: winnerId,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          home_team_abbr: homeTeamId,
          away_team_abbr: awayTeamId,
          game_number: 0,
          stage_label: 'Play-In',
          source: 'external',
        }
      })

    res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      games: unmatchedGames,
    })
  } catch (error: unknown) {
    console.error('[games/rail] Failed:', error)
    res.status(500).json({
      ok: false,
      error: 'Não foi possível carregar a trilha complementar de jogos.',
    })
  }
})

export default router
