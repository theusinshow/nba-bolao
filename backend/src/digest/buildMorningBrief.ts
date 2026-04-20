import { supabase } from '../lib/supabase'
import { fetchESPNGameOddsSummary } from '../lib/odds'
import { fetchNBANews } from '../lib/news'
import { computeRankingSnapshot } from '../scoring/engine'
import { BRT_TIMEZONE } from '../lib/constants'
import type { GameOddsSummaryItem } from '../lib/odds'
import type { AnalysisNewsItem } from '../lib/news'

interface GameRow {
  id: string
  series_id: string
  game_number: number
  home_team_id: string
  away_team_id: string
  tip_off_at: string | null
  played: boolean
}

interface SeriesRow {
  id: string
  round: number
  home_team_id: string | null
  away_team_id: string | null
  winner_id: string | null
  games_played: number
  is_complete: boolean
}

interface TeamRow {
  id: string
  name: string
  abbreviation: string
}

export interface MorningBriefGame {
  gameId: string
  gameNumber: number
  homeTeamId: string
  awayTeamId: string
  homeTeamName: string
  awayTeamName: string
  homeAbbr: string
  awayAbbr: string
  tipOffAt: string | null
  tipOffBRT: string | null
  seriesContext: string
  homeMoneyline: number | null
  awayMoneyline: number | null
  oddsBookmaker: string | null
}

export interface MorningBriefRankingEntry {
  rank: number
  name: string
  points: number
}

export interface MorningBriefPreview {
  targetDate: string
  generatedAt: string
  whatsappText: string
  games: MorningBriefGame[]
  top3: MorningBriefRankingEntry[]
  news: AnalysisNewsItem[]
  oddsAvailable: boolean
  newsAvailable: boolean
}

function getBrtDateKey(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: BRT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

function formatTipOffBRT(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function formatFullDateBRT(isoDate: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRT_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${isoDate}T12:00:00`))
}

function roundLabel(round: number): string {
  if (round === 1) return 'R1'
  if (round === 2) return 'R2'
  if (round === 3) return 'Finais de Conferência'
  return 'NBA Finals'
}

function buildSeriesContext(
  game: GameRow,
  series: SeriesRow | undefined,
  homeAbbr: string,
  awayAbbr: string,
): string {
  if (!series) return `Jogo ${game.game_number}`

  const { games_played, is_complete, winner_id, home_team_id, away_team_id, round } = series
  if (is_complete && winner_id) {
    const winnerAbbr = winner_id === home_team_id ? homeAbbr : awayAbbr
    return `${roundLabel(round)} — ${winnerAbbr} venceu a série`
  }

  // Count wins per team from games_played in series (we only have games_played total, not per team here)
  // Use game_number as indicator of the current state
  return `${roundLabel(round)} | Jogo ${game.game_number} de 7`
}

function normalizeTeamName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
}

function findOddsForGame(
  homeTeamName: string,
  awayTeamName: string,
  oddsList: GameOddsSummaryItem[],
): GameOddsSummaryItem | null {
  const homeNorm = normalizeTeamName(homeTeamName)
  const awayNorm = normalizeTeamName(awayTeamName)

  for (const odds of oddsList) {
    const oddsHomeNorm = normalizeTeamName(odds.home_team_name)
    const oddsAwayNorm = normalizeTeamName(odds.away_team_name)

    const homeWords = homeNorm.split(' ')
    const awayWords = awayNorm.split(' ')

    const homeMatch = homeWords.some((w) => w.length > 3 && oddsHomeNorm.includes(w))
    const awayMatch = awayWords.some((w) => w.length > 3 && oddsAwayNorm.includes(w))

    if (homeMatch && awayMatch) return odds
  }
  return null
}

function formatMoneyline(value: number | null): string {
  if (value === null) return '—'
  return value >= 0 ? `+${value}` : String(value)
}

function medalEmoji(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `${rank}º`
}

function buildGameNumber(n: number): string {
  const numbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣']
  return numbers[n - 1] ?? `${n}.`
}

async function fetchTodayGamesWithContext(
  targetDate: string,
): Promise<{ games: MorningBriefGame[]; oddsList: GameOddsSummaryItem[] }> {
  const [
    { data: gamesData },
    { data: seriesData },
    { data: teamsData },
    oddsResult,
  ] = await Promise.all([
    supabase
      .from('games')
      .select('id, series_id, game_number, home_team_id, away_team_id, tip_off_at, played')
      .order('tip_off_at', { ascending: true }),
    supabase
      .from('series')
      .select('id, round, home_team_id, away_team_id, winner_id, games_played, is_complete'),
    supabase.from('teams').select('id, name, abbreviation'),
    fetchESPNGameOddsSummary(),
  ])

  const allGames = (gamesData ?? []) as GameRow[]
  const allSeries = (seriesData ?? []) as SeriesRow[]
  const allTeams = (teamsData ?? []) as TeamRow[]

  const seriesById = new Map(allSeries.map((s) => [s.id, s]))
  const teamsById = new Map(allTeams.map((t) => [t.id, t]))

  const todayGames = allGames.filter((g) => {
    if (!g.tip_off_at || g.played) return false
    return getBrtDateKey(new Date(g.tip_off_at)) === targetDate
  })

  const games: MorningBriefGame[] = todayGames.map((game) => {
    const homeTeam = teamsById.get(game.home_team_id)
    const awayTeam = teamsById.get(game.away_team_id)
    const series = seriesById.get(game.series_id)

    const homeTeamName = homeTeam?.name ?? game.home_team_id
    const awayTeamName = awayTeam?.name ?? game.away_team_id
    const homeAbbr = homeTeam?.abbreviation ?? game.home_team_id
    const awayAbbr = awayTeam?.abbreviation ?? game.away_team_id

    const oddsMatch = findOddsForGame(homeTeamName, awayTeamName, oddsResult.odds)

    const seriesContext = buildSeriesContext(game, series, homeAbbr, awayAbbr)

    return {
      gameId: game.id,
      gameNumber: game.game_number,
      homeTeamId: game.home_team_id,
      awayTeamId: game.away_team_id,
      homeTeamName,
      awayTeamName,
      homeAbbr,
      awayAbbr,
      tipOffAt: game.tip_off_at,
      tipOffBRT: game.tip_off_at ? formatTipOffBRT(game.tip_off_at) : null,
      seriesContext,
      homeMoneyline: oddsMatch?.moneyline.home ?? null,
      awayMoneyline: oddsMatch?.moneyline.away ?? null,
      oddsBookmaker: oddsMatch?.bookmaker ?? null,
    }
  })

  return { games, oddsList: oddsResult.odds }
}

function buildWhatsAppText(
  targetDate: string,
  games: MorningBriefGame[],
  top3: MorningBriefRankingEntry[],
  news: AnalysisNewsItem[],
): string {
  const lines: string[] = []

  lines.push(`🌅 *Bolão NBA — Abertura do Dia*`)
  lines.push(`📅 ${formatFullDateBRT(targetDate)}`)

  if (games.length === 0) {
    lines.push('')
    lines.push('🏀 *JOGOS DE HOJE*')
    lines.push('')
    lines.push('Nenhum jogo agendado para hoje.')
  } else {
    lines.push('')
    lines.push(`🏀 *JOGOS DE HOJE (${games.length})*`)

    for (const game of games) {
      lines.push('')
      lines.push(`${buildGameNumber(game.gameNumber)} *${game.homeAbbr} vs ${game.awayAbbr}*`)
      if (game.tipOffBRT) {
        lines.push(`   🕐 ${game.tipOffBRT}h (BRT)`)
      }
      lines.push(`   📊 ${game.seriesContext}`)

      const hasOdds = game.homeMoneyline !== null || game.awayMoneyline !== null
      if (hasOdds) {
        const bookmaker = game.oddsBookmaker ? ` _${game.oddsBookmaker}_` : ''
        lines.push(`   💰 ${game.homeAbbr} ${formatMoneyline(game.homeMoneyline)} · ${game.awayAbbr} ${formatMoneyline(game.awayMoneyline)}${bookmaker}`)
      }
    }
  }

  lines.push('')
  lines.push('─────────────────')
  lines.push('')
  lines.push('🏆 *TOP 3 DO RANKING*')
  lines.push('')

  if (top3.length === 0) {
    lines.push('Ranking ainda não disponível.')
  } else {
    for (const entry of top3) {
      lines.push(`${medalEmoji(entry.rank)} *${entry.name}* — ${entry.points} pts`)
    }
  }

  if (news.length > 0) {
    lines.push('')
    lines.push('─────────────────')
    lines.push('')
    lines.push('📰 *NOTÍCIAS DA NBA*')
    lines.push('')
    for (const item of news) {
      lines.push(`• ${item.title}`)
    }
  }

  lines.push('')
  lines.push('─────────────────')
  lines.push('Bom jogo a todos! 🏀🔥')

  return lines.join('\n')
}

export async function buildMorningBriefPreview(targetDate?: string): Promise<MorningBriefPreview> {
  const date = targetDate?.trim() || getBrtDateKey(new Date())

  const [{ games, oddsList }, rankingSnapshot, newsResult] = await Promise.all([
    fetchTodayGamesWithContext(date),
    computeRankingSnapshot(),
    fetchNBANews(),
  ])

  // Sort ranking and take top 3
  const sortedRanking = [...rankingSnapshot].sort((a, b) => b.total_points - a.total_points)
  const top3: MorningBriefRankingEntry[] = sortedRanking.slice(0, 3).map((entry, i) => ({
    rank: i + 1,
    name: entry.participant_name,
    points: entry.total_points,
  }))

  const top3News = newsResult.news.slice(0, 3)
  const whatsappText = buildWhatsAppText(date, games, top3, top3News)

  return {
    targetDate: date,
    generatedAt: new Date().toISOString(),
    whatsappText,
    games,
    top3,
    news: top3News,
    oddsAvailable: oddsList.length > 0,
    newsAvailable: newsResult.status.available,
  }
}
