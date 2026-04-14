import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { supabase } from '../lib/supabase'

interface ParticipantRow {
  id: string
  name: string
}

interface TeamRow {
  id: string
  name: string
  abbreviation: string
}

interface SeriesRow {
  id: string
  round: number | null
  conference: string | null
  home_team_id: string | null
  away_team_id: string | null
  is_complete: boolean
}

interface SeriesPickRow {
  participant_id: string
  series_id: string
  winner_id: string
  games_count: number
}

interface GameRow {
  id: string
  series_id: string
  game_number: number
  home_team_id: string
  away_team_id: string
  tip_off_at: string | null
  played: boolean
}

interface GamePickRow {
  participant_id: string
  game_id: string
  winner_id: string
}

interface DailyDigestResult {
  outputDir: string
  targetDate: string
  whatsappText: string
  files: {
    whatsappTxt: string
    summaryMd: string
    payloadJson: string
  }
}

function getBrtFormatter() {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getBrtDateKey(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  )

  return `${parts.year}-${parts.month}-${parts.day}`
}

function formatTimestampParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  )

  const dateStamp = `${parts.year}-${parts.month}-${parts.day}`
  const timeStamp = `${parts.hour}-${parts.minute}-${parts.second}`
  const human = `${dateStamp} ${parts.hour}:${parts.minute}:${parts.second} BRT`

  return { dateStamp, timeStamp, human }
}

function roundLabel(round: number | null | undefined): string {
  switch (round) {
    case 1: return 'R1'
    case 2: return 'R2'
    case 3: return 'Final de Conferência'
    case 4: return 'Final da NBA'
    default: return 'Playoffs'
  }
}

function teamLabel(teamId: string | null | undefined, teamsById: Record<string, TeamRow | undefined>): string {
  if (!teamId) return 'A definir'
  return teamsById[teamId]?.abbreviation ?? teamId
}

function formatTipOff(value: string | null): string {
  if (!value) return 'Sem horário'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

async function fetchDigestData() {
  const [
    { data: participants },
    { data: teams },
    { data: series },
    { data: seriesPicks },
    { data: games },
    { data: gamePicks },
  ] = await Promise.all([
    supabase.from('participants').select('id, name').order('name', { ascending: true }),
    supabase.from('teams').select('id, name, abbreviation'),
    supabase.from('series').select('id, round, conference, home_team_id, away_team_id, is_complete').order('round', { ascending: true }),
    supabase.from('series_picks').select('participant_id, series_id, winner_id, games_count'),
    supabase.from('games').select('id, series_id, game_number, home_team_id, away_team_id, tip_off_at, played').order('tip_off_at', { ascending: true }).order('game_number', { ascending: true }),
    supabase.from('game_picks').select('participant_id, game_id, winner_id'),
  ])

  if (!participants || !teams || !series || !seriesPicks || !games || !gamePicks) {
    throw new Error('Não foi possível carregar os dados para gerar o resumo diário.')
  }

  return {
    participants: participants as ParticipantRow[],
    teams: teams as TeamRow[],
    series: series as SeriesRow[],
    seriesPicks: seriesPicks as SeriesPickRow[],
    games: games as GameRow[],
    gamePicks: gamePicks as GamePickRow[],
  }
}

function buildWhatsappSummary(targetDate: string, generatedAt: string, data: Awaited<ReturnType<typeof fetchDigestData>>) {
  const teamsById = Object.fromEntries(data.teams.map((team) => [team.id, team]))
  const participantsById = Object.fromEntries(data.participants.map((participant) => [participant.id, participant]))
  const seriesById = Object.fromEntries(data.series.map((series) => [series.id, series]))

  const gamesOfDay = data.games.filter((game) => game.tip_off_at && getBrtDateKey(new Date(game.tip_off_at)) === targetDate)
  const activeSeries = data.series.filter((series) => !series.is_complete && series.home_team_id && series.away_team_id)

  const gameSections = gamesOfDay.map((game) => {
    const picks = data.gamePicks
      .filter((pick) => pick.game_id === game.id)
      .map((pick) => {
        const participant = participantsById[pick.participant_id]
        return participant
          ? `- ${participant.name}: ${teamLabel(pick.winner_id, teamsById)}`
          : null
      })
      .filter((item): item is string => item != null)

    const matchup = `${teamLabel(game.home_team_id, teamsById)} x ${teamLabel(game.away_team_id, teamsById)}`
    const header = `*Jogo ${game.game_number} - ${matchup}* (${formatTipOff(game.tip_off_at)})`
    return picks.length > 0
      ? [header, ...picks].join('\n')
      : `${header}\n- Nenhum palpite salvo ainda`
  })

  const seriesSections = activeSeries.map((series) => {
    const picks = data.seriesPicks
      .filter((pick) => pick.series_id === series.id)
      .map((pick) => {
        const participant = participantsById[pick.participant_id]
        return participant
          ? `- ${participant.name}: ${teamLabel(pick.winner_id, teamsById)} em ${pick.games_count}`
          : null
      })
      .filter((item): item is string => item != null)

    const matchup = `${teamLabel(series.home_team_id, teamsById)} x ${teamLabel(series.away_team_id, teamsById)}`
    const header = `*${roundLabel(series.round)} - ${matchup}*`
    return picks.length > 0
      ? [header, ...picks].join('\n')
      : `${header}\n- Nenhum palpite de série salvo ainda`
  })

  const humanDate = getBrtFormatter().format(new Date(`${targetDate}T12:00:00Z`))

  const parts = [
    `🏀 *Resumo do Bolão NBA - ${humanDate}*`,
    `_Gerado em ${generatedAt}_`,
    '',
    '*Palpites jogo a jogo do dia*',
    ...(gameSections.length > 0 ? gameSections : ['- Nenhum jogo programado para esta data']),
    '',
    '*Palpites de séries em aberto*',
    ...(seriesSections.length > 0 ? seriesSections : ['- Nenhuma série aberta com confronto definido']),
  ]

  return parts.join('\n')
}

function buildMarkdownSummary(targetDate: string, whatsappText: string) {
  return [
    '# Resumo diário para WhatsApp',
    '',
    `Data-alvo: ${targetDate}`,
    '',
    '```text',
    whatsappText,
    '```',
    '',
  ].join('\n')
}

export async function exportDailyPicksDigest(targetDate = getBrtDateKey(new Date())): Promise<DailyDigestResult> {
  const data = await fetchDigestData()
  const now = new Date()
  const { dateStamp, timeStamp, human } = formatTimestampParts(now)

  const repoRoot = path.resolve(__dirname, '../../..')
  const outputDir = path.join(repoRoot, 'backups', 'daily-digests', `${dateStamp}_${timeStamp}`)
  await mkdir(outputDir, { recursive: true })

  const whatsappText = buildWhatsappSummary(targetDate, human, data)
  const payload = {
    generatedAt: human,
    targetDate,
    whatsappText,
  }

  const files = {
    whatsappTxt: path.join(outputDir, `whatsapp-resumo-${targetDate}.txt`),
    summaryMd: path.join(outputDir, `whatsapp-resumo-${targetDate}.md`),
    payloadJson: path.join(outputDir, `whatsapp-resumo-${targetDate}.json`),
  }

  await Promise.all([
    writeFile(files.whatsappTxt, whatsappText, 'utf8'),
    writeFile(files.summaryMd, buildMarkdownSummary(targetDate, whatsappText), 'utf8'),
    writeFile(files.payloadJson, JSON.stringify(payload, null, 2), 'utf8'),
  ])

  return {
    outputDir,
    targetDate,
    whatsappText,
    files,
  }
}
