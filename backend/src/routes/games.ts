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

const ROUND_LABEL: Record<number, string> = {
  1: 'R1',
  2: 'R2',
  3: 'CF',
  4: 'Finals',
}

function mapAbbr(abbr: string): string {
  return ABBREV_MAP[abbr] ?? abbr
}

function buildPairKey(teamA: string | null | undefined, teamB: string | null | undefined): string | null {
  if (!teamA || !teamB) return null
  return [teamA, teamB].sort().join('::')
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
    const [providerGames, localGamesResult, localSeriesResult] = await Promise.all([
      fetchPostseasonGames(season),
      supabase.from('games').select('id, nba_game_id, series_id, game_number, home_team_id, away_team_id, tip_off_at'),
      supabase.from('series').select('id, round, home_team_id, away_team_id'),
    ])

    if (localGamesResult.error) throw localGamesResult.error
    if (localSeriesResult.error) throw localSeriesResult.error

    const localGames = localGamesResult.data ?? []
    const localSeries = localSeriesResult.data ?? []

    const localIds = new Set(
      localGames
        .map((game) => game.nba_game_id)
        .filter((value): value is number => typeof value === 'number')
    )

    const seriesByPair = new Map(
      localSeries
        .map((series) => {
          const pairKey = buildPairKey(series.home_team_id, series.away_team_id)
          return pairKey ? [pairKey, series] as const : null
        })
        .filter((entry): entry is readonly [string, (typeof localSeries)[number]] => !!entry)
    )

    const localGamesBySeriesId = new Map<string, typeof localGames>()
    for (const game of localGames) {
      const bucket = localGamesBySeriesId.get(game.series_id) ?? []
      bucket.push(game)
      localGamesBySeriesId.set(game.series_id, bucket)
    }

    // Compute series standings from ALL provider games (both synced and unsynced)
    // This is the source of truth — the NBA API has the real results.
    const seriesStandings: Record<string, {
      homeTeamId: string
      awayTeamId: string
      homeWins: number
      awayWins: number
    }> = {}

    for (const game of providerGames) {
      if (!isFinalStatus(game.status)) continue
      const homeTeamId = mapAbbr(game.home_team.abbreviation)
      const awayTeamId = mapAbbr(game.visitor_team.abbreviation)
      const pairKey = buildPairKey(homeTeamId, awayTeamId)
      if (!pairKey) continue
      const matchedSeries = seriesByPair.get(pairKey)
      if (!matchedSeries?.home_team_id || !matchedSeries?.away_team_id) continue

      const winnerId = game.home_team_score > game.visitor_team_score
        ? homeTeamId
        : game.visitor_team_score > game.home_team_score
        ? awayTeamId
        : null
      if (!winnerId) continue

      if (!seriesStandings[matchedSeries.id]) {
        seriesStandings[matchedSeries.id] = {
          homeTeamId: matchedSeries.home_team_id,
          awayTeamId: matchedSeries.away_team_id,
          homeWins: 0,
          awayWins: 0,
        }
      }

      const standing = seriesStandings[matchedSeries.id]
      if (winnerId === standing.homeTeamId) standing.homeWins += 1
      else if (winnerId === standing.awayTeamId) standing.awayWins += 1
    }

    const unmatchedGames = providerGames
      .filter((game) => !localIds.has(game.id))
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
      .map((game) => {
        const homeTeamId = mapAbbr(game.home_team.abbreviation)
        const awayTeamId = mapAbbr(game.visitor_team.abbreviation)
        const pairKey = buildPairKey(homeTeamId, awayTeamId)
        const matchedSeries = pairKey ? seriesByPair.get(pairKey) ?? null : null
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
        const tipOffAt = parseTipOffAt(game.date, game.status, game.datetime)

        return {
          id: `external-${game.id}`,
          nba_game_id: game.id,
          tip_off_at: tipOffAt,
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
          series_id: matchedSeries?.id ?? null,
          round: matchedSeries?.round ?? null,
          game_number: 0,
          stage_label: matchedSeries ? ROUND_LABEL[matchedSeries.round] ?? 'NBA' : 'Play-In',
          source: 'external',
        }
      })

    const unmatchedSeriesGames = unmatchedGames.filter((game) => !!game.series_id)
    const unmatchedBySeriesId = new Map<string, typeof unmatchedSeriesGames>()
    for (const game of unmatchedSeriesGames) {
      if (!game.series_id) continue
      const bucket = unmatchedBySeriesId.get(game.series_id) ?? []
      bucket.push(game)
      unmatchedBySeriesId.set(game.series_id, bucket)
    }

    for (const [seriesId, extraGames] of unmatchedBySeriesId.entries()) {
      const localSeriesGames = [...(localGamesBySeriesId.get(seriesId) ?? [])]
      const orderedLocalGames = localSeriesGames.sort((left, right) => {
        const leftTime = left.tip_off_at ? new Date(left.tip_off_at).getTime() : Number.MAX_SAFE_INTEGER
        const rightTime = right.tip_off_at ? new Date(right.tip_off_at).getTime() : Number.MAX_SAFE_INTEGER
        if (leftTime !== rightTime) return leftTime - rightTime
        return left.game_number - right.game_number
      })
      const orderedExtraGames = [...extraGames].sort((left, right) => {
        const leftTime = left.tip_off_at ? new Date(left.tip_off_at).getTime() : Number.MAX_SAFE_INTEGER
        const rightTime = right.tip_off_at ? new Date(right.tip_off_at).getTime() : Number.MAX_SAFE_INTEGER
        return leftTime - rightTime
      })

      const merged = [
        ...orderedLocalGames.map((game) => ({
          kind: 'local' as const,
          tipOffAt: game.tip_off_at,
          gameNumber: game.game_number,
        })),
        ...orderedExtraGames.map((game) => ({
          kind: 'extra' as const,
          tipOffAt: game.tip_off_at,
          ref: game,
        })),
      ].sort((left, right) => {
        const leftTime = left.tipOffAt ? new Date(left.tipOffAt).getTime() : Number.MAX_SAFE_INTEGER
        const rightTime = right.tipOffAt ? new Date(right.tipOffAt).getTime() : Number.MAX_SAFE_INTEGER
        if (leftTime !== rightTime) return leftTime - rightTime
        if (left.kind === right.kind) return 0
        return left.kind === 'local' ? -1 : 1
      })

      let lastGameNumber = 0
      for (const entry of merged) {
        if (entry.kind === 'local') {
          lastGameNumber = Math.max(lastGameNumber, entry.gameNumber)
          continue
        }
        lastGameNumber += 1
        entry.ref.game_number = lastGameNumber
      }
    }

    res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      games: unmatchedGames,
      seriesStandings,
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
