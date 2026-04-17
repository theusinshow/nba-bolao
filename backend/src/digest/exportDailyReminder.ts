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
  abbreviation: string
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
}

export type DailyReminderVariant = 'full' | 'pending-only'

export interface DailyReminderGameSummary {
  gameId: string
  gameNumber: number
  matchup: string
  tipOff: string
  missing: string[]
  picked: number
}

export interface DailyReminderSummary {
  todayGames: number
  totalParticipants: number
  fullyPickedGames: number
  gamesNeedingAttention: number
  participantsPendingToday: number
  totalMissingEntries: number
}

export interface DailyReminderPreview {
  targetDate: string
  generatedAt: string
  variant: DailyReminderVariant
  whatsappText: string
  summary: DailyReminderSummary
  gamesWithMissingPicks: DailyReminderGameSummary[]
}

export interface DailyReminderResult extends DailyReminderPreview {
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

function formatTipOff(value: string | null): string {
  if (!value) return 'Sem horario'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatHumanDate(isoDate: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRT_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${isoDate}T12:00:00Z`))
}

function buildMarkdownSummary(preview: DailyReminderPreview, validation?: ArtifactValidation) {
  return [
    '# Lembrete diario de palpites',
    '',
    `Data-alvo: ${preview.targetDate}`,
    `Variante: ${preview.variant}`,
    `Gerado em: ${preview.generatedAt}`,
    '',
    '## Painel rapido',
    '',
    `- Jogos monitorados: ${preview.summary.todayGames}`,
    `- Participantes: ${preview.summary.totalParticipants}`,
    `- Jogos completos: ${preview.summary.fullyPickedGames}`,
    `- Jogos pedindo atencao: ${preview.summary.gamesNeedingAttention}`,
    `- Participantes pendentes hoje: ${preview.summary.participantsPendingToday}`,
    `- Lacunas totais de picks: ${preview.summary.totalMissingEntries}`,
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

export async function buildDailyReminderPreview(
  targetDate = getBrtDateKey(new Date()),
  variant: DailyReminderVariant = 'full'
): Promise<DailyReminderPreview> {
  const [
    { data: participants },
    { data: teams },
    { data: games },
    { data: gamePicks },
  ] = await Promise.all([
    supabase.from('participants').select('id, name').order('name', { ascending: true }),
    supabase.from('teams').select('id, abbreviation'),
    supabase.from('games').select('id, series_id, game_number, home_team_id, away_team_id, tip_off_at, played').order('tip_off_at', { ascending: true }),
    supabase.from('game_picks').select('participant_id, game_id'),
  ])

  if (!participants || !teams || !games || !gamePicks) {
    throw new Error('Nao foi possivel carregar os dados para gerar o lembrete.')
  }

  const teamsById = Object.fromEntries((teams as TeamRow[]).map((team) => [team.id, team]))
  const participantList = participants as ParticipantRow[]
  const pickSet = new Set((gamePicks as GamePickRow[]).map((pick) => `${pick.participant_id}:${pick.game_id}`))
  const abbr = (id: string | null) => (id ? teamsById[id]?.abbreviation ?? id : '?')

  const todayGames = (games as GameRow[]).filter(
    (game) => game.tip_off_at && getBrtDateKey(new Date(game.tip_off_at)) === targetDate && !game.played
  )

  const gamesWithMissingPicks = todayGames.map((game) => {
    const missing = participantList
      .filter((participant) => !pickSet.has(`${participant.id}:${game.id}`))
      .map((participant) => participant.name)

    return {
      gameId: game.id,
      gameNumber: game.game_number,
      matchup: `${abbr(game.home_team_id)} x ${abbr(game.away_team_id)}`,
      tipOff: formatTipOff(game.tip_off_at),
      missing,
      picked: participantList.length - missing.length,
    }
  })

  const pendingNames = new Set(gamesWithMissingPicks.flatMap((game) => game.missing))
  const summary: DailyReminderSummary = {
    todayGames: todayGames.length,
    totalParticipants: participantList.length,
    fullyPickedGames: gamesWithMissingPicks.filter((game) => game.missing.length === 0).length,
    gamesNeedingAttention: gamesWithMissingPicks.filter((game) => game.missing.length > 0).length,
    participantsPendingToday: pendingNames.size,
    totalMissingEntries: gamesWithMissingPicks.reduce((sum, game) => sum + game.missing.length, 0),
  }

  const humanDate = formatHumanDate(targetDate)
  const generatedAt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date())

  const lines: string[] = [
    `⏰ *Lembrete do Bolao NBA - ${humanDate}*`,
    `_Gerado as ${generatedAt} BRT_`,
    '',
  ]

  if (todayGames.length === 0) {
    lines.push('Nenhum jogo pendente para hoje.')
  } else {
    const visibleGames = variant === 'pending-only'
      ? gamesWithMissingPicks.filter((game) => game.missing.length > 0)
      : gamesWithMissingPicks

    if (visibleGames.length === 0) {
      lines.push('✅ Todos ja palpitaram nos jogos de hoje.')
    } else {
      for (const game of visibleGames) {
        lines.push(`*Jogo ${game.gameNumber} - ${game.matchup}* (${game.tipOff})`)
        lines.push(`Palpites: ${game.picked}/${participantList.length}`)

        if (game.missing.length === 0) {
          lines.push('✅ Todos palpitaram!')
        } else {
          lines.push(`⚠️ Faltam: ${game.missing.join(', ')}`)
        }
        lines.push('')
      }
    }
  }

  return {
    targetDate,
    generatedAt,
    variant,
    whatsappText: lines.join('\n').trimEnd(),
    summary,
    gamesWithMissingPicks,
  }
}

export async function exportDailyReminder(
  targetDate = getBrtDateKey(new Date()),
  variant: DailyReminderVariant = 'full'
): Promise<DailyReminderResult> {
  const preview = await buildDailyReminderPreview(targetDate, variant)
  const { dateStamp, timeStamp } = formatTimestampParts(new Date())
  const outputDir = path.join(getRepoRoot(), 'backups', 'daily-reminders', `${dateStamp}_${timeStamp}`)
  await mkdir(outputDir, { recursive: true })

  const files = {
    whatsappTxt: path.join(outputDir, `whatsapp-lembrete-${targetDate}.txt`),
    summaryMd: path.join(outputDir, `whatsapp-lembrete-${targetDate}.md`),
    payloadJson: path.join(outputDir, `whatsapp-lembrete-${targetDate}.json`),
    manifestJson: path.join(outputDir, `manifesto-lembrete-${targetDate}.json`),
  }

  await Promise.all([
    writeFile(files.whatsappTxt, preview.whatsappText, 'utf8'),
    writeJsonFile(files.payloadJson, preview),
  ])

  const describedPrimaryArtifacts = await describeArtifacts([
    { key: 'whatsappTxt', label: 'Mensagem do lembrete (.txt)', path: files.whatsappTxt, kind: 'txt' },
    { key: 'payloadJson', label: 'Payload do lembrete (.json)', path: files.payloadJson, kind: 'json' },
  ])
  const primaryArtifacts = await enrichArtifactsWithStorage(`daily-reminders/${dateStamp}_${timeStamp}`, describedPrimaryArtifacts)

  const primaryValidation = validateArtifacts(primaryArtifacts)
  await writeFile(files.summaryMd, buildMarkdownSummary(preview, primaryValidation), 'utf8')

  const describedSummaryArtifact = await describeArtifact({
    key: 'summaryMd',
    label: 'Resumo markdown (.md)',
    path: files.summaryMd,
    kind: 'md',
  })
  const [summaryArtifact] = await enrichArtifactsWithStorage(`daily-reminders/${dateStamp}_${timeStamp}`, [describedSummaryArtifact])

  const dataArtifacts = [...primaryArtifacts, summaryArtifact]
  const validation = validateArtifacts(dataArtifacts)

  await writeJsonFile(files.manifestJson, {
    kind: 'daily-reminder',
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
    label: 'Manifesto do lembrete (.json)',
    path: files.manifestJson,
    kind: 'json',
  })
  const [manifestArtifact] = await enrichArtifactsWithStorage(`daily-reminders/${dateStamp}_${timeStamp}`, [describedManifestArtifact])

  return {
    ...preview,
    outputDir,
    validation,
    artifacts: [...dataArtifacts, manifestArtifact],
    files,
  }
}
