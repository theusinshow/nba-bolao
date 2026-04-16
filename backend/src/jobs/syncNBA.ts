import { supabase } from '../lib/supabase'
import { type BDLGame, fetchPostseasonGames } from '../lib/nba'
import { recalculateAllScores } from '../scoring/engine'

const ABBREV_MAP: Record<string, string> = {
  OKC: 'OKC', HOU: 'HOU', GSW: 'GSW', DEN: 'DEN',
  LAC: 'LAC', LAL: 'LAL', MIN: 'MIN', MEM: 'MEM',
  CLE: 'CLE', BOS: 'BOS', NYK: 'NYK', IND: 'IND',
  MIL: 'MIL', DET: 'DET', MIA: 'MIA', ORL: 'ORL',
  ATL: 'ATL', TOR: 'TOR', GS: 'GSW',
}

const ROUND_ONE_SLOTS: Record<'West' | 'East', string[]> = {
  West: ['W1-1', 'W1-2', 'W1-3', 'W1-4'],
  East: ['E1-1', 'E1-2', 'E1-3', 'E1-4'],
}

const FEEDERS: Record<string, { home: string; away: string }> = {
  'W2-1': { home: 'W1-1', away: 'W1-2' },
  'W2-2': { home: 'W1-3', away: 'W1-4' },
  'E2-1': { home: 'E1-1', away: 'E1-2' },
  'E2-2': { home: 'E1-3', away: 'E1-4' },
  WCF: { home: 'W2-1', away: 'W2-2' },
  ECF: { home: 'E2-1', away: 'E2-2' },
  FIN: { home: 'WCF', away: 'ECF' },
}

interface SeriesRow {
  id: string
  round: number
  conference: 'East' | 'West' | null
  position: number | null
  home_team_id: string | null
  away_team_id: string | null
  winner_id: string | null
  games_played: number
  is_complete: boolean
}

interface GameRow {
  id: string
  series_id: string
  game_number: number
  nba_game_id: number | null
  winner_id: string | null
  played: boolean
}

interface MatchupGroup {
  pairKey: string
  conference: 'East' | 'West'
  homeTeamId: string
  awayTeamId: string
  firstTipOffAt: string | null
  games: BDLGame[]
}

interface TeamSeedRow {
  id: string
  abbreviation: string
  name: string
  conference: 'East' | 'West' | null
  seed?: number
  primary_color?: string
}

function mapAbbr(abbr: string): string {
  return ABBREV_MAP[abbr] ?? abbr
}

function getDefaultSeason(): number {
  const now = new Date()
  return now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
}

function isFinalStatus(status: string): boolean {
  return /^final/i.test(status.trim())
}

function isIsoDateTime(value?: string | null): boolean {
  if (!value) return false
  return !Number.isNaN(Date.parse(value))
}

function parseTipOffAt(date: string, status: string, datetime?: string | null): string | null {
  if (isIsoDateTime(datetime)) return new Date(datetime!).toISOString()
  if (isIsoDateTime(status)) return new Date(status).toISOString()

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

function getPairKey(teamA: string, teamB: string): string {
  return [teamA, teamB].sort().join('-')
}

function getConferenceFromGame(game: BDLGame): 'East' | 'West' | null {
  const conference = game.home_team.conference ?? game.visitor_team.conference ?? null
  return conference === 'East' || conference === 'West' ? conference : null
}

function sortMatchups(left: MatchupGroup, right: MatchupGroup): number {
  const leftTime = left.firstTipOffAt ? new Date(left.firstTipOffAt).getTime() : Number.MAX_SAFE_INTEGER
  const rightTime = right.firstTipOffAt ? new Date(right.firstTipOffAt).getTime() : Number.MAX_SAFE_INTEGER

  if (leftTime !== rightTime) return leftTime - rightTime
  if (left.homeTeamId !== right.homeTeamId) return left.homeTeamId.localeCompare(right.homeTeamId)
  return left.awayTeamId.localeCompare(right.awayTeamId)
}

function buildMatchups(games: BDLGame[]): MatchupGroup[] {
  const byPair = new Map<string, MatchupGroup>()

  for (const game of games) {
    const conference = getConferenceFromGame(game)
    if (!conference) continue

    const homeTeamId = mapAbbr(game.home_team.abbreviation)
    const awayTeamId = mapAbbr(game.visitor_team.abbreviation)
    const pairKey = getPairKey(homeTeamId, awayTeamId)
    const tipOffAt = parseTipOffAt(game.date, game.status, game.datetime)

    const existing = byPair.get(pairKey)
    if (!existing) {
      byPair.set(pairKey, {
        pairKey,
        conference,
        homeTeamId,
        awayTeamId,
        firstTipOffAt: tipOffAt,
        games: [game],
      })
      continue
    }

    existing.games.push(game)

    if (!existing.firstTipOffAt || (tipOffAt && new Date(tipOffAt).getTime() < new Date(existing.firstTipOffAt).getTime())) {
      existing.firstTipOffAt = tipOffAt
      existing.homeTeamId = homeTeamId
      existing.awayTeamId = awayTeamId
    }
  }

  return Array.from(byPair.values()).sort(sortMatchups)
}

async function ensureTeamsExist(games: BDLGame[]) {
  const teams = new Map<string, TeamSeedRow>()

  for (const game of games) {
    const homeTeamId = mapAbbr(game.home_team.abbreviation)
    const awayTeamId = mapAbbr(game.visitor_team.abbreviation)
    const homeConference = game.home_team.conference === 'East' || game.home_team.conference === 'West'
      ? game.home_team.conference
      : null
    const awayConference = game.visitor_team.conference === 'East' || game.visitor_team.conference === 'West'
      ? game.visitor_team.conference
      : null

    teams.set(homeTeamId, {
      id: homeTeamId,
      abbreviation: homeTeamId,
      name: (game.home_team.full_name ?? `${game.home_team.city ?? ''} ${game.home_team.name ?? ''}`.trim()) || homeTeamId,
      conference: homeConference,
    })
    teams.set(awayTeamId, {
      id: awayTeamId,
      abbreviation: awayTeamId,
      name: (game.visitor_team.full_name ?? `${game.visitor_team.city ?? ''} ${game.visitor_team.name ?? ''}`.trim()) || awayTeamId,
      conference: awayConference,
    })
  }

  if (!teams.size) return

  const { data: existingTeams, error: existingTeamsError } = await supabase
    .from('teams')
    .select('id')

  if (existingTeamsError) throw existingTeamsError

  const existingIds = new Set((existingTeams ?? []).map((team) => team.id))
  const missingTeams = Array.from(teams.values())
    .filter((team) => !existingIds.has(team.id))
    .map((team) => ({
      ...team,
      seed: team.seed ?? 99,
      primary_color: team.primary_color ?? '#888899',
    }))

  if (!missingTeams.length) return

  const { error } = await supabase
    .from('teams')
    .insert(missingTeams)

  if (error) throw error
}

function findSeriesByPair(series: SeriesRow[], teamA: string, teamB: string): SeriesRow | null {
  const pairKey = getPairKey(teamA, teamB)
  return series.find((item) => (
    item.home_team_id &&
    item.away_team_id &&
    getPairKey(item.home_team_id, item.away_team_id) === pairKey
  )) ?? null
}

async function deleteGameRows(gameIds: string[]) {
  if (!gameIds.length) return

  const chunkSize = 100
  for (let start = 0; start < gameIds.length; start += chunkSize) {
    const chunk = gameIds.slice(start, start + chunkSize)
    await supabase.from('game_picks').delete().in('game_id', chunk)
    await supabase.from('games').delete().in('id', chunk)
  }
}

async function assignRoundOneSeries(series: SeriesRow[], matchups: MatchupGroup[], games: GameRow[]) {
  const matchedSeriesIds = new Set<string>()

  for (const matchup of matchups) {
    const existing = findSeriesByPair(series, matchup.homeTeamId, matchup.awayTeamId)
    if (existing) matchedSeriesIds.add(existing.id)
  }

  for (const conference of ['West', 'East'] as const) {
    const conferenceMatchups = matchups.filter((matchup) => matchup.conference === conference)
    const roundOneSeries = series
      .filter((item) => item.round === 1 && item.conference === conference)
      .sort((left, right) => (left.position ?? 999) - (right.position ?? 999))

    const unmatchedMatchups = conferenceMatchups.filter((matchup) => !findSeriesByPair(series, matchup.homeTeamId, matchup.awayTeamId))
    if (!unmatchedMatchups.length) continue

    const availableSeries = roundOneSeries.filter((item) => {
      const hasGames = games.some((game) => game.series_id === item.id)
      return !matchedSeriesIds.has(item.id) && !hasGames
    })

    let targetSeries = availableSeries
    if (availableSeries.length === 4 && unmatchedMatchups.length <= 2) {
      targetSeries = availableSeries.slice(-unmatchedMatchups.length)
    } else {
      targetSeries = availableSeries.slice(0, unmatchedMatchups.length)
    }

    const sortedMatchups = [...unmatchedMatchups].sort(sortMatchups)
    sortedMatchups.forEach((matchup, index) => {
      const target = targetSeries[index]
      if (!target) return
      target.home_team_id = matchup.homeTeamId
      target.away_team_id = matchup.awayTeamId
      target.winner_id = null
      target.games_played = 0
      target.is_complete = false
      matchedSeriesIds.add(target.id)
    })
  }

  for (const seriesRow of series.filter((item) => item.round === 1)) {
    const pairKey = seriesRow.home_team_id && seriesRow.away_team_id
      ? getPairKey(seriesRow.home_team_id, seriesRow.away_team_id)
      : null
    const stillExists = pairKey ? matchups.some((matchup) => matchup.pairKey === pairKey) : false

    if (!stillExists && !matchedSeriesIds.has(seriesRow.id)) {
      seriesRow.home_team_id = null
      seriesRow.away_team_id = null
      seriesRow.winner_id = null
      seriesRow.games_played = 0
      seriesRow.is_complete = false
    }
  }
}

function propagateBracket(series: SeriesRow[]) {
  const byId = Object.fromEntries(series.map((item) => [item.id, item])) as Record<string, SeriesRow | undefined>

  for (const [targetId, feeder] of Object.entries(FEEDERS)) {
    const target = byId[targetId]
    const homeSource = byId[feeder.home]
    const awaySource = byId[feeder.away]
    if (!target) continue

    target.home_team_id = homeSource?.winner_id ?? null
    target.away_team_id = awaySource?.winner_id ?? null
  }
}

function recomputeSeriesResults(series: SeriesRow[], games: GameRow[]) {
  const gamesBySeries = new Map<string, GameRow[]>()

  for (const game of games) {
    const existing = gamesBySeries.get(game.series_id) ?? []
    existing.push(game)
    gamesBySeries.set(game.series_id, existing)
  }

  for (const seriesRow of series) {
    const seriesGames = (gamesBySeries.get(seriesRow.id) ?? []).sort((left, right) => left.game_number - right.game_number)
    const homeWins = seriesRow.home_team_id
      ? seriesGames.filter((game) => game.winner_id === seriesRow.home_team_id).length
      : 0
    const awayWins = seriesRow.away_team_id
      ? seriesGames.filter((game) => game.winner_id === seriesRow.away_team_id).length
      : 0
    const teamsKnown = !!seriesRow.home_team_id && !!seriesRow.away_team_id
    const isComplete = teamsKnown && (homeWins >= 4 || awayWins >= 4)

    seriesRow.games_played = seriesGames.filter((game) => game.played).length
    seriesRow.is_complete = isComplete
    seriesRow.winner_id = isComplete
      ? (homeWins >= 4 ? seriesRow.home_team_id : seriesRow.away_team_id)
      : null
  }
}

async function persistSeries(original: SeriesRow[], next: SeriesRow[]) {
  const originalById = Object.fromEntries(original.map((item) => [item.id, item])) as Record<string, SeriesRow | undefined>

  for (const item of next) {
    const before = originalById[item.id]
    if (!before) continue

    const changed =
      before.home_team_id !== item.home_team_id ||
      before.away_team_id !== item.away_team_id ||
      before.winner_id !== item.winner_id ||
      before.games_played !== item.games_played ||
      before.is_complete !== item.is_complete

    if (!changed) continue

    await supabase
      .from('series')
      .update({
        home_team_id: item.home_team_id,
        away_team_id: item.away_team_id,
        winner_id: item.winner_id,
        games_played: item.games_played,
        is_complete: item.is_complete,
      })
      .eq('id', item.id)
  }
}

export async function syncNBA(): Promise<void> {
  console.log('[syncNBA] Starting sync...')

  try {
    const season = Number(process.env.BALLDONTLIE_SEASON ?? getDefaultSeason())
    console.log('[syncNBA] Using season', season)

    const bdlGames = [...await fetchPostseasonGames(season)].sort(
      (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()
    )

    await ensureTeamsExist(bdlGames)

    const [
      { data: seriesRows, error: seriesError },
      { data: localGameRows, error: localGamesError },
    ] = await Promise.all([
      supabase
        .from('series')
        .select('id, round, conference, position, home_team_id, away_team_id, winner_id, games_played, is_complete')
        .order('round', { ascending: true })
        .order('position', { ascending: true }),
      supabase
        .from('games')
        .select('id, series_id, game_number, nba_game_id, winner_id, played'),
    ])

    if (seriesError) throw seriesError
    if (localGamesError) throw localGamesError

    const currentGameIds = new Set(bdlGames.map((game) => game.id))
    const staleGameIds = (localGameRows ?? [])
      .filter((game) => game.nba_game_id != null && !currentGameIds.has(game.nba_game_id))
      .map((game) => game.id)

    if (staleGameIds.length) {
      console.log('[syncNBA] Removing stale local games:', staleGameIds.length)
      await deleteGameRows(staleGameIds)
    }

    const series = ((seriesRows ?? []) as SeriesRow[]).map((item) => ({ ...item }))
    const originalSeries = ((seriesRows ?? []) as SeriesRow[]).map((item) => ({ ...item }))
    const activeLocalGames = ((localGameRows ?? []) as GameRow[]).filter((game) => !staleGameIds.includes(game.id))
    const matchups = buildMatchups(bdlGames)

    await assignRoundOneSeries(series, matchups, activeLocalGames)

    for (const bdlGame of bdlGames) {
      const homeTeamId = mapAbbr(bdlGame.home_team.abbreviation)
      const awayTeamId = mapAbbr(bdlGame.visitor_team.abbreviation)
      const targetSeries = findSeriesByPair(series, homeTeamId, awayTeamId)

      if (!targetSeries) {
        console.warn('[syncNBA] Could not resolve series for matchup:', homeTeamId, awayTeamId, bdlGame.id)
        continue
      }

      const played = isFinalStatus(bdlGame.status)
      const winnerId = played
        ? (
            bdlGame.home_team_score > bdlGame.visitor_team_score
              ? homeTeamId
              : bdlGame.visitor_team_score > bdlGame.home_team_score
              ? awayTeamId
              : null
          )
        : null

      const { data: existingGames, error: existingGamesError } = await supabase
        .from('games')
        .select('id, game_number, nba_game_id')
        .eq('series_id', targetSeries.id)
        .order('game_number', { ascending: true })

      if (existingGamesError) throw existingGamesError

      const existingGame = existingGames?.find((game) => game.nba_game_id === bdlGame.id) ?? null
      const maxGameNumber = (existingGames ?? []).reduce((max, game) => Math.max(max, game.game_number), 0)

      const payload = {
        series_id: targetSeries.id,
        game_number: existingGame?.game_number ?? maxGameNumber + 1,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        winner_id: winnerId,
        home_score: bdlGame.home_team_score,
        away_score: bdlGame.visitor_team_score,
        played,
        tip_off_at: parseTipOffAt(bdlGame.date, bdlGame.status, bdlGame.datetime),
        nba_game_id: bdlGame.id,
      }

      if (existingGame) {
        const { error } = await supabase.from('games').update(payload).eq('id', existingGame.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('games').insert(payload)
        if (error) throw error
      }
    }

    const { data: syncedGamesRows, error: syncedGamesError } = await supabase
      .from('games')
      .select('id, series_id, game_number, nba_game_id, winner_id, played')

    if (syncedGamesError) throw syncedGamesError

    const syncedGames = (syncedGamesRows ?? []) as GameRow[]

    for (let iteration = 0; iteration < 4; iteration += 1) {
      recomputeSeriesResults(series, syncedGames)
      propagateBracket(series)
    }

    recomputeSeriesResults(series, syncedGames)
    await persistSeries(originalSeries, series)

    await recalculateAllScores()
    console.log('[syncNBA] Sync complete.')
  } catch (err) {
    console.error('[syncNBA] Error:', err)
    throw err
  }
}
