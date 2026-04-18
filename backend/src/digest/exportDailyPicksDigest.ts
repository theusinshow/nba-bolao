import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { supabase } from '../lib/supabase'
import {
  describeArtifact,
  describeArtifacts,
  formatTimestampParts,
  getRepoRoot,
  validateArtifacts,
  writeJsonFile,
} from '../lib/operationalArtifacts'
import type { ArtifactDescriptor, ArtifactValidation } from '../lib/operationalArtifacts'
import { BRT_TIMEZONE } from '../lib/constants'
import { enrichArtifactsWithStorage } from '../admin/operationalStorage'

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

export type DailyDigestVariant = 'full' | 'compact'

interface DailyDigestGameSummary {
  gameId: string
  gameNumber: number
  matchup: string
  tipOff: string
  totalPicks: number
  missingCount: number
  picks: string[]
}

interface DailyDigestSeriesSummary {
  seriesId: string
  roundLabel: string
  matchup: string
  totalPicks: number
  missingCount: number
  picks: string[]
}

interface DailyDigestSummary {
  todayGames: number
  activeSeries: number
  totalParticipants: number
  totalGamePicksToday: number
  totalSeriesPicksOpen: number
  gamesWithoutPicks: number
  activeSeriesWithoutPicks: number
}

export interface DailyDigestPreview {
  targetDate: string
  generatedAt: string
  variant: DailyDigestVariant
  whatsappText: string
  summary: DailyDigestSummary
  games: DailyDigestGameSummary[]
  series: DailyDigestSeriesSummary[]
}

export interface DailyDigestResult extends DailyDigestPreview {
  outputDir: string
  validation: ArtifactValidation
  artifacts: ArtifactDescriptor[]
  files: {
    whatsappTxt: string
    summaryMd: string
    payloadJson: string
    manifestJson: string
  }
}

function getBrtFormatter() {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRT_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getBrtDateKey(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: BRT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  )

  return `${parts.year}-${parts.month}-${parts.day}`
}

function roundLabel(round: number | null | undefined): string {
  switch (round) {
    case 1: return 'R1'
    case 2: return 'R2'
    case 3: return 'Final de Conferencia'
    case 4: return 'Final da NBA'
    default: return 'Playoffs'
  }
}

function teamLabel(teamId: string | null | undefined, teamsById: Record<string, TeamRow | undefined>): string {
  if (!teamId) return 'A definir'
  return teamsById[teamId]?.abbreviation ?? teamId
}

function formatTipOff(value: string | null): string {
  if (!value) return 'Sem horario'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRT_TIMEZONE,
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
    throw new Error('Nao foi possivel carregar os dados para gerar o resumo diario.')
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

function pct(votes: number, total: number): string {
  return `${Math.round((votes / total) * 100)}%`
}

function buildGameInsight(
  gameId: string,
  homeTeamId: string,
  awayTeamId: string,
  gamePicks: GamePickRow[],
  teamsById: Record<string, TeamRow | undefined>
): string | null {
  const picks = gamePicks.filter((p) => p.game_id === gameId)
  if (picks.length === 0) return null

  const homeVotes = picks.filter((p) => p.winner_id === homeTeamId).length
  const awayVotes = picks.filter((p) => p.winner_id === awayTeamId).length
  const homeAbbr = teamLabel(homeTeamId, teamsById)
  const awayAbbr = teamLabel(awayTeamId, teamsById)
  const total = picks.length

  if (homeVotes === total) return `✅ Consenso total: todos no ${homeAbbr} (${total} votos)`
  if (awayVotes === total) return `✅ Consenso total: todos no ${awayAbbr} (${total} votos)`

  const diff = Math.abs(homeVotes - awayVotes)
  const majorityAbbr = homeVotes >= awayVotes ? homeAbbr : awayAbbr
  const majorityVotes = Math.max(homeVotes, awayVotes)
  const base = `📊 ${homeAbbr} ${homeVotes} (${pct(homeVotes, total)}) x ${awayAbbr} ${awayVotes} (${pct(awayVotes, total)})`

  if (diff <= 1) return `${base} — ⚔️ Duelo acirrado no grupo`
  return `${base} — maioria no ${majorityAbbr} (${majorityVotes}/${total})`
}

function buildSeriesInsight(
  seriesId: string,
  homeTeamId: string | null,
  awayTeamId: string | null,
  seriesPicks: SeriesPickRow[],
  teamsById: Record<string, TeamRow | undefined>
): string[] {
  const picks = seriesPicks.filter((p) => p.series_id === seriesId)
  if (picks.length === 0) return []

  const homeVotes = picks.filter((p) => p.winner_id === homeTeamId).length
  const awayVotes = picks.filter((p) => p.winner_id === awayTeamId).length
  const homeAbbr = teamLabel(homeTeamId, teamsById)
  const awayAbbr = teamLabel(awayTeamId, teamsById)
  const total = picks.length
  const lines: string[] = []

  if (homeVotes === total) {
    lines.push(`✅ Consenso: todos no ${homeAbbr} (${total} votos)`)
  } else if (awayVotes === total) {
    lines.push(`✅ Consenso: todos no ${awayAbbr} (${total} votos)`)
  } else {
    const diff = Math.abs(homeVotes - awayVotes)
    lines.push(
      `📊 ${homeAbbr} ${homeVotes} (${pct(homeVotes, total)}) x ${awayAbbr} ${awayVotes} (${pct(awayVotes, total)})` +
      (diff <= 1 ? ' — ⚔️ Racha no grupo' : '')
    )
  }

  // Distribuição de duração para o time com maioria
  const majorityTeamId = homeVotes >= awayVotes ? homeTeamId : awayTeamId
  const majorityPicks = picks.filter((p) => p.winner_id === majorityTeamId)
  const gcDist = [4, 5, 6, 7]
    .map((n) => ({ n, count: majorityPicks.filter((p) => p.games_count === n).length }))
    .filter((x) => x.count > 0)
    .map((x) => `${x.n}j×${x.count}`)
    .join(', ')

  if (gcDist) lines.push(`   Duração (maioria): ${gcDist}`)

  return lines
}

function buildContraCorrenteLines(
  gamesOfDay: GameRow[],
  gamePicks: GamePickRow[],
  participantsById: Record<string, ParticipantRow | undefined>,
  teamsById: Record<string, TeamRow | undefined>
): string[] {
  const lines: string[] = []

  for (const game of gamesOfDay) {
    const picks = gamePicks.filter((p) => p.game_id === game.id)
    if (picks.length < 3) continue

    const homeVotes = picks.filter((p) => p.winner_id === game.home_team_id).length
    const awayVotes = picks.filter((p) => p.winner_id === game.away_team_id).length
    if (homeVotes === 0 || awayVotes === 0) continue

    const minorityTeamId = homeVotes < awayVotes ? game.home_team_id : game.away_team_id
    const minorityPicks = picks.filter((p) => p.winner_id === minorityTeamId)
    if (minorityPicks.length / picks.length > 0.4) continue

    const matchup = `${teamLabel(game.home_team_id, teamsById)} x ${teamLabel(game.away_team_id, teamsById)}`
    for (const pick of minorityPicks) {
      const participant = participantsById[pick.participant_id]
      if (participant) {
        lines.push(`- ${participant.name}: ${teamLabel(pick.winner_id, teamsById)} (J${game.game_number} ${matchup})`)
      }
    }
  }

  return lines
}

function buildDigestSections(
  targetDate: string,
  variant: DailyDigestVariant,
  generatedAt: string,
  data: Awaited<ReturnType<typeof fetchDigestData>>
): DailyDigestPreview {
  const teamsById = Object.fromEntries(data.teams.map((team) => [team.id, team]))
  const participantsById = Object.fromEntries(data.participants.map((participant) => [participant.id, participant]))

  const gamesOfDay = data.games.filter((game) => game.tip_off_at && getBrtDateKey(new Date(game.tip_off_at)) === targetDate)
  const activeSeries = data.series.filter((series) => !series.is_complete && series.home_team_id && series.away_team_id)

  const games = gamesOfDay.map((game) => {
    const picks = data.gamePicks
      .filter((pick) => pick.game_id === game.id)
      .map((pick) => {
        const participant = participantsById[pick.participant_id]
        return participant ? `${participant.name}: ${teamLabel(pick.winner_id, teamsById)}` : null
      })
      .filter((item): item is string => item != null)

    return {
      gameId: game.id,
      gameNumber: game.game_number,
      matchup: `${teamLabel(game.home_team_id, teamsById)} x ${teamLabel(game.away_team_id, teamsById)}`,
      tipOff: formatTipOff(game.tip_off_at),
      totalPicks: picks.length,
      missingCount: Math.max(0, data.participants.length - picks.length),
      picks,
    }
  })

  const series = activeSeries.map((item) => {
    const picks = data.seriesPicks
      .filter((pick) => pick.series_id === item.id)
      .map((pick) => {
        const participant = participantsById[pick.participant_id]
        return participant ? `${participant.name}: ${teamLabel(pick.winner_id, teamsById)} em ${pick.games_count}` : null
      })
      .filter((entry): entry is string => entry != null)

    return {
      seriesId: item.id,
      roundLabel: roundLabel(item.round),
      matchup: `${teamLabel(item.home_team_id, teamsById)} x ${teamLabel(item.away_team_id, teamsById)}`,
      totalPicks: picks.length,
      missingCount: Math.max(0, data.participants.length - picks.length),
      picks,
    }
  })

  const humanDate = getBrtFormatter().format(new Date(`${targetDate}T12:00:00Z`))
  const summary: DailyDigestSummary = {
    todayGames: games.length,
    activeSeries: series.length,
    totalParticipants: data.participants.length,
    totalGamePicksToday: games.reduce((sum, item) => sum + item.totalPicks, 0),
    totalSeriesPicksOpen: series.reduce((sum, item) => sum + item.totalPicks, 0),
    gamesWithoutPicks: games.filter((item) => item.totalPicks === 0).length,
    activeSeriesWithoutPicks: series.filter((item) => item.totalPicks === 0).length,
  }

  const parts: string[] = [
    `🏀 *Resumo do Bolao NBA - ${humanDate}*`,
    `_Gerado em ${generatedAt}_`,
    '',
    `Participantes no radar: ${summary.totalParticipants}`,
    `Jogos do dia: ${summary.todayGames} | Series abertas: ${summary.activeSeries}`,
    '',
    '*Palpites jogo a jogo do dia*',
  ]

  if (games.length === 0) {
    parts.push('- Nenhum jogo programado para esta data')
  } else {
    for (const game of gamesOfDay) {
      const summary_game = games.find((g) => g.gameId === game.id)!
      const header = `*Jogo ${summary_game.gameNumber} - ${summary_game.matchup}* (${summary_game.tipOff})`

      if (variant === 'compact') {
        parts.push(header)
        const insight = buildGameInsight(game.id, game.home_team_id, game.away_team_id, data.gamePicks, teamsById)
        if (insight) parts.push(insight)
        parts.push(`- Cobertura: ${summary_game.totalPicks}/${summary.totalParticipants}`)
      } else if (summary_game.picks.length > 0) {
        parts.push(header)
        const insight = buildGameInsight(game.id, game.home_team_id, game.away_team_id, data.gamePicks, teamsById)
        if (insight) parts.push(insight)
        parts.push(...summary_game.picks.map((pick) => `- ${pick}`))
        parts.push(`- Cobertura: ${summary_game.totalPicks}/${summary.totalParticipants}`)
      } else {
        parts.push(`${header}\n- Nenhum palpite salvo ainda`)
      }
    }
  }

  parts.push('')
  parts.push('*Palpites de series em aberto*')

  if (series.length === 0) {
    parts.push('- Nenhuma serie aberta com confronto definido')
  } else {
    for (const item of activeSeries) {
      const summary_series = series.find((s) => s.seriesId === item.id)!
      const header = `*${summary_series.roundLabel} - ${summary_series.matchup}*`

      if (variant === 'compact') {
        parts.push(header)
        const insightLines = buildSeriesInsight(item.id, item.home_team_id, item.away_team_id, data.seriesPicks, teamsById)
        parts.push(...insightLines)
        parts.push(`- Cobertura: ${summary_series.totalPicks}/${summary.totalParticipants}`)
      } else if (summary_series.picks.length > 0) {
        parts.push(header)
        const insightLines = buildSeriesInsight(item.id, item.home_team_id, item.away_team_id, data.seriesPicks, teamsById)
        parts.push(...insightLines)
        parts.push(...summary_series.picks.map((pick) => `- ${pick}`))
        parts.push(`- Cobertura: ${summary_series.totalPicks}/${summary.totalParticipants}`)
      } else {
        parts.push(`${header}\n- Nenhum palpite de serie salvo ainda`)
      }
    }
  }

  // Apostas contra a corrente
  const contraCorrenteLines = buildContraCorrenteLines(gamesOfDay, data.gamePicks, participantsById, teamsById)
  if (contraCorrenteLines.length > 0) {
    parts.push('')
    parts.push('*🔀 Apostas contra a corrente*')
    parts.push(...contraCorrenteLines)
  }

  return {
    targetDate,
    generatedAt,
    variant,
    whatsappText: parts.join('\n'),
    summary,
    games,
    series,
  }
}

function buildMarkdownSummary(preview: DailyDigestPreview, validation?: ArtifactValidation) {
  return [
    '# Resumo diario para WhatsApp',
    '',
    `Data-alvo: ${preview.targetDate}`,
    `Variante: ${preview.variant}`,
    `Gerado em: ${preview.generatedAt}`,
    '',
    '## Painel rapido',
    '',
    `- Participantes monitorados: ${preview.summary.totalParticipants}`,
    `- Jogos do dia: ${preview.summary.todayGames}`,
    `- Series abertas: ${preview.summary.activeSeries}`,
    `- Picks de jogos hoje: ${preview.summary.totalGamePicksToday}`,
    `- Picks de series abertas: ${preview.summary.totalSeriesPicksOpen}`,
    `- Jogos sem pick: ${preview.summary.gamesWithoutPicks}`,
    `- Series sem pick: ${preview.summary.activeSeriesWithoutPicks}`,
    ...(validation
      ? [
          `- Verificacao: ${validation.ok ? 'OK' : 'falhou'}`,
          `- Artefatos conferidos: ${validation.fileCount}`,
          `- Volume total: ${validation.totalBytes} bytes`,
        ]
      : []),
    '',
    '```text',
    preview.whatsappText,
    '```',
    '',
  ].join('\n')
}

export async function buildDailyPicksDigestPreview(
  targetDate = getBrtDateKey(new Date()),
  variant: DailyDigestVariant = 'full'
): Promise<DailyDigestPreview> {
  const data = await fetchDigestData()
  const { human } = formatTimestampParts(new Date())
  return buildDigestSections(targetDate, variant, human, data)
}

export async function exportDailyPicksDigest(
  targetDate = getBrtDateKey(new Date()),
  variant: DailyDigestVariant = 'full'
): Promise<DailyDigestResult> {
  const preview = await buildDailyPicksDigestPreview(targetDate, variant)
  const { dateStamp, timeStamp } = formatTimestampParts(new Date())
  const outputDir = path.join(getRepoRoot(), 'backups', 'daily-digests', `${dateStamp}_${timeStamp}`)
  await mkdir(outputDir, { recursive: true })

  const files = {
    whatsappTxt: path.join(outputDir, `whatsapp-resumo-${targetDate}.txt`),
    summaryMd: path.join(outputDir, `whatsapp-resumo-${targetDate}.md`),
    payloadJson: path.join(outputDir, `whatsapp-resumo-${targetDate}.json`),
    manifestJson: path.join(outputDir, `manifesto-resumo-${targetDate}.json`),
  }

  await Promise.all([
    writeFile(files.whatsappTxt, preview.whatsappText, 'utf8'),
    writeJsonFile(files.payloadJson, preview),
  ])

  const describedPrimaryArtifacts = await describeArtifacts([
    { key: 'whatsappTxt', label: 'Mensagem do WhatsApp (.txt)', path: files.whatsappTxt, kind: 'txt' },
    { key: 'payloadJson', label: 'Payload do resumo (.json)', path: files.payloadJson, kind: 'json' },
  ])
  const primaryArtifacts = await enrichArtifactsWithStorage(`daily-digests/${dateStamp}_${timeStamp}`, describedPrimaryArtifacts)

  const primaryValidation = validateArtifacts(primaryArtifacts)
  await writeFile(files.summaryMd, buildMarkdownSummary(preview, primaryValidation), 'utf8')

  const describedSummaryArtifact = await describeArtifact({
    key: 'summaryMd',
    label: 'Resumo markdown (.md)',
    path: files.summaryMd,
    kind: 'md',
  })
  const [summaryArtifact] = await enrichArtifactsWithStorage(`daily-digests/${dateStamp}_${timeStamp}`, [describedSummaryArtifact])

  const dataArtifacts = [...primaryArtifacts, summaryArtifact]
  const validation = validateArtifacts(dataArtifacts)

  await writeJsonFile(files.manifestJson, {
    kind: 'daily-digest',
    targetDate,
    variant,
    generatedAt: preview.generatedAt,
    outputDir,
    summary: preview.summary,
    validation,
    artifacts: dataArtifacts,
  })

  const describedManifestArtifact = await describeArtifact({
    key: 'manifestJson',
    label: 'Manifesto do resumo (.json)',
    path: files.manifestJson,
    kind: 'json',
  })
  const [manifestArtifact] = await enrichArtifactsWithStorage(`daily-digests/${dateStamp}_${timeStamp}`, [describedManifestArtifact])

  return {
    ...preview,
    outputDir,
    validation,
    artifacts: [...dataArtifacts, manifestArtifact],
    files,
  }
}
