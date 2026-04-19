import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { timingSafeEqual } from 'crypto'
import { syncNBA } from '../jobs/syncNBA'
import { recalculateAllScores } from '../scoring/engine'
import { supabase } from '../lib/supabase'
import { removeParticipantCompletely } from '../admin/removeParticipant'
import { exportOperationalSnapshot } from '../backup/exportOperationalSnapshot'
import { verifyOperationalSnapshot } from '../backup/verifyOperationalSnapshot'
import { buildDailyPicksDigestPreview, exportDailyPicksDigest } from '../digest/exportDailyPicksDigest'
import { buildDailyReminderPreview, exportDailyReminder } from '../digest/exportDailyReminder'
import { restoreRows } from '../lib/rollback'
import { getDailyDigestSchedulerSnapshot } from '../scheduler/dailyDigestScheduler'
import { getNBASyncSchedulerSnapshot } from '../scheduler/nbaSyncScheduler'
import { listAdminOperationRuns, recordAdminOperation } from '../admin/adminOperationLog'
import type { AdminOperationName } from '../admin/adminOperationLog'
import type { ArtifactDescriptor } from '../lib/operationalArtifacts'
import { BRT_TIMEZONE } from '../lib/constants'
import { getLiveGameColumnsSnapshot } from '../lib/liveGameColumns'
import { computeAndSaveBadges } from '../badges/engine'
import { BADGE_DEFINITIONS } from '../badges/definitions'

const router = Router()

interface AllowedEmailRow {
  email: string
}

interface ParticipantRow {
  id: string
  user_id: string
  name: string
  email: string
  is_admin: boolean | null
}

interface PickRow {
  id: string
  participant_id: string
}

interface ParticipantNameRow {
  id: string
  name: string
}

interface TeamAbbreviationRow {
  id: string
  abbreviation: string
}

interface AdminCoverageGameRow {
  id: string
  series_id: string
  game_number: number
  home_team_id: string
  away_team_id: string
  tip_off_at: string | null
  played: boolean
}

interface AdminCoverageSeriesRow {
  id: string
  round: number
  home_team_id: string | null
  away_team_id: string | null
  is_complete: boolean
}

interface AdminCoverageGamePickRow {
  participant_id: string
  game_id: string
}

interface AdminCoverageSeriesPickRow {
  participant_id: string
  series_id: string
}

interface AdminIntegrityGamePickRow extends PickRow {
  game_id: string
  winner_id: string
}

interface AdminIntegritySeriesPickRow extends PickRow {
  series_id: string
  winner_id: string
}

interface AdminRequest extends Request {
  adminUserId?: string
  adminParticipantId?: string
}

type AsyncValue<T> = T | Promise<T>

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function getAdminActor(req: Request) {
  const adminRequest = req as AdminRequest
  return {
    adminUserId: adminRequest.adminUserId ?? null,
    adminParticipantId: adminRequest.adminParticipantId ?? null,
  }
}

function hasValidBackupCronSecret(req: Request) {
  const expectedSecret = process.env.BACKUP_CRON_SECRET?.trim() ?? ''
  const providedSecret = typeof req.headers['x-backup-cron-secret'] === 'string'
    ? req.headers['x-backup-cron-secret'].trim()
    : ''

  if (!expectedSecret || !providedSecret) return false

  const expectedBuffer = Buffer.from(expectedSecret)
  const providedBuffer = Buffer.from(providedSecret)
  if (expectedBuffer.length !== providedBuffer.length) return false

  return timingSafeEqual(expectedBuffer, providedBuffer)
}

interface TrackedOperationOptions<TResult> {
  req: Request
  operation: AdminOperationName
  summary: string | ((result: TResult) => AsyncValue<string>)
  errorSummary?: string
  targetDate?: string | null
  variant?: string | null
  metadata?: Record<string, unknown> | ((result: TResult) => AsyncValue<Record<string, unknown>>)
  artifacts?: (result: TResult) => AsyncValue<ArtifactDescriptor[]>
  outputDir?: string | ((result: TResult) => AsyncValue<string | null>) | null
}

async function executeTrackedOperation<TResult>(
  options: TrackedOperationOptions<TResult>,
  task: () => Promise<TResult>
) {
  const startedAt = new Date().toISOString()

  try {
    const result = await task()
    const summary = typeof options.summary === 'function' ? await options.summary(result) : options.summary
    const metadata = typeof options.metadata === 'function'
      ? await options.metadata(result)
      : (options.metadata ?? {})
    const artifacts = options.artifacts ? await options.artifacts(result) : []
    const outputDir = typeof options.outputDir === 'function'
      ? await options.outputDir(result)
      : (options.outputDir ?? null)

    await recordAdminOperation({
      operation: options.operation,
      status: 'success',
      summary,
      startedAt,
      finishedAt: new Date().toISOString(),
      actor: getAdminActor(options.req),
      targetDate: options.targetDate,
      variant: options.variant,
      artifacts,
      outputDir,
      metadata,
    })

    return result
  } catch (error) {
    await recordAdminOperation({
      operation: options.operation,
      status: 'error',
      summary: options.errorSummary ?? `Falha em ${options.operation}`,
      startedAt,
      finishedAt: new Date().toISOString(),
      actor: getAdminActor(options.req),
      targetDate: options.targetDate,
      variant: options.variant,
      metadata: typeof options.metadata === 'function' ? {} : (options.metadata ?? {}),
      error: getErrorMessage(error),
    })

    throw error
  }
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ ok: false, error: 'Missing bearer token' })
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)

  if (userError || !user) {
    return res.status(401).json({ ok: false, error: 'Invalid session' })
  }

  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('id, is_admin')
    .eq('user_id', user.id)
    .single()

  if (participantError || !participant?.is_admin) {
    return res.status(403).json({ ok: false, error: 'Admin access required' })
  }

  ;(req as AdminRequest).adminUserId = user.id
  ;(req as AdminRequest).adminParticipantId = participant.id
  next()
}

function countDuplicateValues(values: string[]): number {
  const counts = new Map<string, number>()

  for (const value of values) {
    const normalized = value.trim().toLocaleLowerCase('pt-BR')
    if (!normalized) continue
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  }

  // Soma as entradas extras (count - 1) por grupo — ex: "João" aparecendo 3x = 2 duplicatas
  return Array.from(counts.values()).reduce((sum, count) => sum + Math.max(0, count - 1), 0)
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

function formatTipOffForCoverage(value: string | null): string {
  if (!value) return 'Sem horário'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function isLockedByTipOff(tipOffAt: string | null): boolean {
  return !!tipOffAt && new Date(tipOffAt).getTime() <= Date.now()
}

function getCoverageState(isClosed: boolean, tipOffAt: string | null) {
  if (isClosed) return 'closed' as const
  if (isLockedByTipOff(tipOffAt)) return 'locked' as const
  return 'open' as const
}

function getCoverageStateWeight(state: 'open' | 'locked' | 'closed') {
  if (state === 'open') return 0
  if (state === 'locked') return 1
  return 2
}

function getSeriesLockTipOff(seriesId: string, games: AdminCoverageGameRow[]): string | null {
  const datedGames = games
    .filter((game) => game.series_id === seriesId && !!game.tip_off_at)
    .sort((left, right) => new Date(left.tip_off_at!).getTime() - new Date(right.tip_off_at!).getTime())

  return datedGames[0]?.tip_off_at ?? null
}

function buildDuplicateGroups<T extends { id: string }>(rows: T[], keyFn: (row: T) => string) {
  const groups = new Map<string, { count: number; rows: T[] }>()

  for (const row of rows) {
    const key = keyFn(row)
    const current = groups.get(key)
    if (current) {
      current.count += 1
      current.rows.push(row)
    } else {
      groups.set(key, { count: 1, rows: [row] })
    }
  }

  return Array.from(groups.entries())
    .filter(([, group]) => group.count > 1)
    .map(([key, group]) => ({ key, count: group.count, rows: group.rows }))
}

function takeSamples<T>(items: T[], format: (item: T) => string, limit = 6) {
  return items.slice(0, limit).map(format)
}

async function buildAdminPickCoverage() {
  const [
    { data: participants, error: participantsError },
    { data: teams, error: teamsError },
    { data: games, error: gamesError },
    { data: gamePicks, error: gamePicksError },
    { data: series, error: seriesError },
    { data: seriesPicks, error: seriesPicksError },
  ] = await Promise.all([
    supabase.from('participants').select('id, name').order('name', { ascending: true }),
    supabase.from('teams').select('id, abbreviation'),
    supabase.from('games').select('id, series_id, game_number, home_team_id, away_team_id, tip_off_at, played').order('tip_off_at', { ascending: true }),
    supabase.from('game_picks').select('participant_id, game_id'),
    supabase.from('series').select('id, round, home_team_id, away_team_id, is_complete').eq('round', 1).order('position', { ascending: true }),
    supabase.from('series_picks').select('participant_id, series_id'),
  ])

  const fetchError =
    participantsError ??
    teamsError ??
    gamesError ??
    gamePicksError ??
    seriesError ??
    seriesPicksError

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  const participantRows = (participants ?? []) as ParticipantNameRow[]
  const teamRows = (teams ?? []) as TeamAbbreviationRow[]
  const gameRows = (games ?? []) as AdminCoverageGameRow[]
  const seriesRows = (series ?? []) as AdminCoverageSeriesRow[]
  const gamePickRows = (gamePicks ?? []) as AdminCoverageGamePickRow[]
  const seriesPickRows = (seriesPicks ?? []) as AdminCoverageSeriesPickRow[]
  const teamsById = new Map(teamRows.map((team) => [team.id, team.abbreviation]))
  const participantNamesById = new Map(participantRows.map((participant) => [participant.id, participant.name]))
  const gamePickSet = new Set(gamePickRows.map((pick) => `${pick.participant_id}:${pick.game_id}`))
  const seriesPickSet = new Set(seriesPickRows.map((pick) => `${pick.participant_id}:${pick.series_id}`))
  const todayKey = getBrtDateKey(new Date())
  const participantTotal = participantRows.length
  const abbr = (teamId: string | null | undefined) => (teamId ? teamsById.get(teamId) ?? teamId : '?')

  const todayGames = gameRows
    .filter((game) => game.tip_off_at && getBrtDateKey(new Date(game.tip_off_at)) === todayKey)
    .map((game) => {
      const pickedParticipants = participantRows
        .filter((participant) => gamePickSet.has(`${participant.id}:${game.id}`))
        .map((participant) => participant.name)
      const missingParticipants = participantRows
        .filter((participant) => !gamePickSet.has(`${participant.id}:${game.id}`))
        .map((participant) => participant.name)
      const status = getCoverageState(game.played, game.tip_off_at)

      return {
        gameId: game.id,
        matchup: `${abbr(game.home_team_id)} x ${abbr(game.away_team_id)}`,
        tipOffAt: game.tip_off_at,
        tipOffLabel: formatTipOffForCoverage(game.tip_off_at),
        locked: status !== 'open',
        status,
        gameNumber: game.game_number,
        pickedCount: pickedParticipants.length,
        missingCount: missingParticipants.length,
        pickedParticipants,
        missingParticipants,
      }
    })
    .sort((left, right) => (
      getCoverageStateWeight(left.status) - getCoverageStateWeight(right.status) ||
      new Date(left.tipOffAt!).getTime() - new Date(right.tipOffAt!).getTime()
    ))

  const roundOneSeries = seriesRows
    .map((seriesItem) => {
      const tipOffAt = getSeriesLockTipOff(seriesItem.id, gameRows)
      const pickedParticipants = participantRows
        .filter((participant) => seriesPickSet.has(`${participant.id}:${seriesItem.id}`))
        .map((participant) => participant.name)
      const missingParticipants = participantRows
        .filter((participant) => !seriesPickSet.has(`${participant.id}:${seriesItem.id}`))
        .map((participant) => participant.name)
      const status = getCoverageState(seriesItem.is_complete, tipOffAt)

      return {
        seriesId: seriesItem.id,
        matchup: `${abbr(seriesItem.home_team_id)} x ${abbr(seriesItem.away_team_id)}`,
        tipOffAt,
        tipOffLabel: formatTipOffForCoverage(tipOffAt),
        locked: status !== 'open',
        status,
        pickedCount: pickedParticipants.length,
        missingCount: missingParticipants.length,
        pickedParticipants,
        missingParticipants,
      }
    })
    .filter((seriesItem) => !!seriesItem.tipOffAt)
    .sort((left, right) => (
      getCoverageStateWeight(left.status) - getCoverageStateWeight(right.status) ||
      new Date(left.tipOffAt!).getTime() - new Date(right.tipOffAt!).getTime()
    ))

  const openTodayGames = todayGames.filter((game) => game.status === 'open')
  const openRoundOneSeries = roundOneSeries.filter((seriesItem) => seriesItem.status === 'open')
  const pendingParticipantsToday = new Set(openTodayGames.flatMap((game) => game.missingParticipants))
  const pendingParticipantsRoundOne = new Set(openRoundOneSeries.flatMap((seriesItem) => seriesItem.missingParticipants))

  return {
    summary: {
      todayGames: todayGames.length,
      todayGamesPending: openTodayGames.filter((game) => game.missingCount > 0).length,
      roundOneSeriesOpen: openRoundOneSeries.length,
      roundOneSeriesPending: openRoundOneSeries.filter((seriesItem) => seriesItem.missingCount > 0).length,
      totalParticipants: participantTotal,
      participantsPendingToday: pendingParticipantsToday.size,
      participantsPendingRoundOne: pendingParticipantsRoundOne.size,
      lastSyncAt: getNBASyncSchedulerSnapshot().lastSyncAt ?? null,
      sourceLabel: 'API da NBA + base local',
    },
    todayGames,
    roundOneSeries,
    participants: participantRows.map((participant) => ({
      id: participant.id,
      name: participantNamesById.get(participant.id) ?? participant.id,
    })),
  }
}

async function buildAdminPickIntegrity() {
  const [
    { data: participants, error: participantsError },
    { data: teams, error: teamsError },
    { data: games, error: gamesError },
    { data: series, error: seriesError },
    { data: gamePicks, error: gamePicksError },
    { data: seriesPicks, error: seriesPicksError },
  ] = await Promise.all([
    supabase.from('participants').select('id, name').order('name', { ascending: true }),
    supabase.from('teams').select('id, abbreviation'),
    supabase.from('games').select('id, series_id, game_number, home_team_id, away_team_id, tip_off_at, played').order('tip_off_at', { ascending: true }),
    supabase.from('series').select('id, round, home_team_id, away_team_id, is_complete').order('round', { ascending: true }),
    supabase.from('game_picks').select('id, participant_id, game_id, winner_id'),
    supabase.from('series_picks').select('id, participant_id, series_id, winner_id'),
  ])

  const fetchError =
    participantsError ??
    teamsError ??
    gamesError ??
    seriesError ??
    gamePicksError ??
    seriesPicksError

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  const participantRows = (participants ?? []) as ParticipantNameRow[]
  const teamRows = (teams ?? []) as TeamAbbreviationRow[]
  const gameRows = (games ?? []) as AdminCoverageGameRow[]
  const seriesRows = (series ?? []) as AdminCoverageSeriesRow[]
  const gamePickRows = (gamePicks ?? []) as AdminIntegrityGamePickRow[]
  const seriesPickRows = (seriesPicks ?? []) as AdminIntegritySeriesPickRow[]

  const participantNamesById = new Map(participantRows.map((participant) => [participant.id, participant.name]))
  const teamsById = new Map(teamRows.map((team) => [team.id, team.abbreviation]))
  const gamesById = new Map(gameRows.map((game) => [game.id, game]))
  const seriesById = new Map(seriesRows.map((seriesItem) => [seriesItem.id, seriesItem]))
  const abbr = (teamId: string | null | undefined) => (teamId ? teamsById.get(teamId) ?? teamId : '?')
  const participantName = (participantId: string) => participantNamesById.get(participantId) ?? participantId
  const gameMatchup = (game: AdminCoverageGameRow | undefined) => (
    game ? `${abbr(game.home_team_id)} x ${abbr(game.away_team_id)} · Jogo ${game.game_number}` : 'Jogo ausente'
  )
  const seriesMatchup = (seriesItem: AdminCoverageSeriesRow | undefined) => (
    seriesItem ? `${abbr(seriesItem.home_team_id)} x ${abbr(seriesItem.away_team_id)} · R${seriesItem.round}` : 'Série ausente'
  )

  const duplicateGamePickGroups = buildDuplicateGroups(gamePickRows, (pick) => `${pick.participant_id}:${pick.game_id}`)
  const duplicateSeriesPickGroups = buildDuplicateGroups(seriesPickRows, (pick) => `${pick.participant_id}:${pick.series_id}`)

  const orphanedGamePicks = gamePickRows.filter((pick) => (
    !participantNamesById.has(pick.participant_id) || !gamesById.has(pick.game_id)
  ))
  const orphanedSeriesPicks = seriesPickRows.filter((pick) => (
    !participantNamesById.has(pick.participant_id) || !seriesById.has(pick.series_id)
  ))
  const invalidGameWinners = gamePickRows.filter((pick) => {
    const game = gamesById.get(pick.game_id)
    if (!game) return false
    return pick.winner_id !== game.home_team_id && pick.winner_id !== game.away_team_id
  })
  const invalidSeriesWinners = seriesPickRows.filter((pick) => {
    const seriesItem = seriesById.get(pick.series_id)
    if (!seriesItem) return false
    if (!seriesItem.home_team_id || !seriesItem.away_team_id) return false
    return pick.winner_id !== seriesItem.home_team_id && pick.winner_id !== seriesItem.away_team_id
  })
  const openGamesWithoutTipOff = gameRows.filter((game) => !game.played && !game.tip_off_at)
  const readySeriesWithoutTipOff = seriesRows.filter((seriesItem) => (
    !seriesItem.is_complete &&
    !!seriesItem.home_team_id &&
    !!seriesItem.away_team_id &&
    !getSeriesLockTipOff(seriesItem.id, gameRows)
  ))

  const issues = [
    duplicateGamePickGroups.length > 0 ? {
      key: 'duplicate-game-picks',
      severity: 'high',
      label: 'Duplicidade em palpites de jogo',
      count: duplicateGamePickGroups.length,
      description: 'Há participantes com mais de um registro para o mesmo jogo, o que pode distorcer save, leitura e pontuação.',
      recommendation: 'Aplicar UNIQUE em (participant_id, game_id) e manter save via upsert/servidor.',
      samples: takeSamples(duplicateGamePickGroups, (group) => {
        const reference = group.rows[0]
        return `${participantName(reference.participant_id)} aparece ${group.count}x em ${gameMatchup(gamesById.get(reference.game_id))}.`
      }),
    } : null,
    duplicateSeriesPickGroups.length > 0 ? {
      key: 'duplicate-series-picks',
      severity: 'high',
      label: 'Duplicidade em palpites de série',
      count: duplicateSeriesPickGroups.length,
      description: 'Há participantes com mais de um registro para a mesma série, abrindo margem para conflitos de update e ranking.',
      recommendation: 'Aplicar UNIQUE em (participant_id, series_id) e centralizar o save oficial no backend.',
      samples: takeSamples(duplicateSeriesPickGroups, (group) => {
        const reference = group.rows[0]
        return `${participantName(reference.participant_id)} aparece ${group.count}x em ${seriesMatchup(seriesById.get(reference.series_id))}.`
      }),
    } : null,
    orphanedGamePicks.length > 0 ? {
      key: 'orphaned-game-picks',
      severity: 'high',
      label: 'Game picks órfãos',
      count: orphanedGamePicks.length,
      description: 'Existem palpites de jogo apontando para participante ou jogo inexistente no estado atual da base.',
      recommendation: 'Revisar remoções, resets e chaves estrangeiras; limpar órfãos antes do próximo recálculo.',
      samples: takeSamples(orphanedGamePicks, (pick) => (
        `${participantName(pick.participant_id)} · game_id=${pick.game_id} · pick_id=${pick.id}.`
      )),
    } : null,
    orphanedSeriesPicks.length > 0 ? {
      key: 'orphaned-series-picks',
      severity: 'high',
      label: 'Series picks órfãos',
      count: orphanedSeriesPicks.length,
      description: 'Existem palpites de série apontando para participante ou série inexistente no estado atual da base.',
      recommendation: 'Revisar integridade referencial e limpar resíduos de resets/remoções antigas.',
      samples: takeSamples(orphanedSeriesPicks, (pick) => (
        `${participantName(pick.participant_id)} · series_id=${pick.series_id} · pick_id=${pick.id}.`
      )),
    } : null,
    invalidGameWinners.length > 0 ? {
      key: 'invalid-game-winners',
      severity: 'high',
      label: 'Winner inválido em jogo',
      count: invalidGameWinners.length,
      description: 'Há palpites de jogo com `winner_id` fora das duas equipes realmente ligadas ao confronto.',
      recommendation: 'Salvar apenas via backend validado e revisar registros corrompidos antes do próximo fechamento.',
      samples: takeSamples(invalidGameWinners, (pick) => {
        const game = gamesById.get(pick.game_id)
        return `${participantName(pick.participant_id)} salvou ${pick.winner_id} em ${gameMatchup(game)}.`
      }),
    } : null,
    invalidSeriesWinners.length > 0 ? {
      key: 'invalid-series-winners',
      severity: 'high',
      label: 'Winner inválido em série',
      count: invalidSeriesWinners.length,
      description: 'Há palpites de série com `winner_id` incompatível com os dois times cadastrados na série.',
      recommendation: 'Bloquear gravações fora do servidor e revisar os registros inconsistentes.',
      samples: takeSamples(invalidSeriesWinners, (pick) => {
        const seriesItem = seriesById.get(pick.series_id)
        return `${participantName(pick.participant_id)} salvou ${pick.winner_id} em ${seriesMatchup(seriesItem)}.`
      }),
    } : null,
    openGamesWithoutTipOff.length > 0 ? {
      key: 'open-games-without-tipoff',
      severity: 'medium',
      label: 'Jogos abertos sem tip-off',
      count: openGamesWithoutTipOff.length,
      description: 'Jogos sem horário oficial enfraquecem a trava de lock e podem confundir countdown, lembretes e regra de fechamento.',
      recommendation: 'Verificar sync da NBA e evitar liberar rodada crítica com jogo aberto sem `tip_off_at`.',
      samples: takeSamples(openGamesWithoutTipOff, (game) => gameMatchup(game)),
    } : null,
    readySeriesWithoutTipOff.length > 0 ? {
      key: 'ready-series-without-tipoff',
      severity: 'medium',
      label: 'Séries prontas sem horário-base',
      count: readySeriesWithoutTipOff.length,
      description: 'Séries com confronto definido mas sem primeiro tip-off comprometem a trava de palpites de série.',
      recommendation: 'Conferir se os jogos da série já foram criados e sincronizados com horário antes de abrir a janela.',
      samples: takeSamples(readySeriesWithoutTipOff, (seriesItem) => seriesMatchup(seriesItem)),
    } : null,
  ].filter((issue): issue is {
    key: string
    severity: 'medium' | 'high'
    label: string
    count: number
    description: string
    recommendation: string
    samples: string[]
  } => !!issue)

  const summary = {
    duplicateGamePickGroups: duplicateGamePickGroups.length,
    duplicateSeriesPickGroups: duplicateSeriesPickGroups.length,
    orphanedGamePicks: orphanedGamePicks.length,
    orphanedSeriesPicks: orphanedSeriesPicks.length,
    invalidGameWinners: invalidGameWinners.length,
    invalidSeriesWinners: invalidSeriesWinners.length,
    openGamesWithoutTipOff: openGamesWithoutTipOff.length,
    readySeriesWithoutTipOff: readySeriesWithoutTipOff.length,
    totalIssues: issues.reduce((sum, issue) => sum + issue.count, 0),
  }

  return {
    summary,
    issues,
    hardening: {
      sqlPath: 'supabase/pick-integrity-hardening.sql',
      recommendations: [
        'Aplicar índices/constraints UNIQUE para series_picks e game_picks.',
        'Endurecer RLS para permitir gravação só do próprio participante e antes do lock.',
        'Usar o backend oficial de save como caminho principal de escrita em produção.',
      ],
    },
  }
}

async function buildAdminOverview() {
  const [
    { data: participants, error: participantsError },
    { data: allowedEmails, error: allowedEmailsError },
    { data: seriesPicks, error: seriesPicksError },
    { data: gamePicks, error: gamePicksError },
    { data: simulationSeriesPicks, error: simulationSeriesPicksError },
    { data: simulationGamePicks, error: simulationGamePicksError },
    { data: series, error: seriesError },
    { data: games, error: gamesError },
  ] = await Promise.all([
    supabase.from('participants').select('id, user_id, name, email, is_admin'),
    supabase.from('allowed_emails').select('email'),
    supabase.from('series_picks').select('id, participant_id'),
    supabase.from('game_picks').select('id, participant_id'),
    supabase.from('simulation_series_picks').select('id, participant_id'),
    supabase.from('simulation_game_picks').select('id, participant_id'),
    supabase.from('series').select('id, is_complete'),
    supabase.from('games').select('id, played'),
  ])

  const fetchError =
    participantsError ??
    allowedEmailsError ??
    seriesPicksError ??
    gamePicksError ??
    simulationSeriesPicksError ??
    simulationGamePicksError ??
    seriesError ??
    gamesError

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  const participantRows = (participants ?? []) as ParticipantRow[]
  const allowedEmailRows = (allowedEmails ?? []) as AllowedEmailRow[]
  const seriesPickRows = (seriesPicks ?? []) as PickRow[]
  const gamePickRows = (gamePicks ?? []) as PickRow[]
  const simulationSeriesPickRows = (simulationSeriesPicks ?? []) as PickRow[]
  const simulationGamePickRows = (simulationGamePicks ?? []) as PickRow[]
  const participantIds = new Set(participantRows.map((participant) => participant.id))
  const participantEmails = new Set(participantRows.map((participant) => participant.email.toLocaleLowerCase('pt-BR')))
  const allowedEmailSet = new Set(allowedEmailRows.map((row) => row.email.toLocaleLowerCase('pt-BR')))

  const participantsWithoutAccess = participantRows.filter(
    (participant) => !allowedEmailSet.has(participant.email.toLocaleLowerCase('pt-BR'))
  )
  const allowedWithoutParticipant = allowedEmailRows.filter(
    (row) => !participantEmails.has(row.email.toLocaleLowerCase('pt-BR'))
  )

  return {
    stats: {
      participants: participantRows.length,
      admins: participantRows.filter((participant) => participant.is_admin).length,
      allowed_emails: allowedEmailRows.length,
      series_picks: seriesPickRows.length,
      game_picks: gamePickRows.length,
      simulation_series_picks: simulationSeriesPickRows.length,
      simulation_game_picks: simulationGamePickRows.length,
      series_total: (series ?? []).length,
      series_completed: ((series ?? []) as Array<{ is_complete: boolean }>).filter((item) => item.is_complete).length,
      games_total: (games ?? []).length,
      games_played: ((games ?? []) as Array<{ played: boolean }>).filter((item) => item.played).length,
      mode: process.env.APP_MODE ?? process.env.BOLAO_MODE ?? 'ficticio',
    },
    inconsistencies: {
      duplicate_names: countDuplicateValues(participantRows.map((participant) => participant.name)),
      duplicate_emails: countDuplicateValues(participantRows.map((participant) => participant.email)),
      participants_without_access: participantsWithoutAccess.length,
      allowed_without_participant: allowedWithoutParticipant.length,
      orphaned_series_picks: seriesPickRows.filter((pick) => !participantIds.has(pick.participant_id)).length,
      orphaned_game_picks: gamePickRows.filter((pick) => !participantIds.has(pick.participant_id)).length,
    },
    details: {
      participants_without_access: participantsWithoutAccess.map((participant) => ({
        id: participant.id,
        name: participant.name,
        email: participant.email,
      })),
      allowed_without_participant: allowedWithoutParticipant.map((row) => row.email),
    },
  }
}

async function deleteAllRows(table: string): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .delete()
    .not('id', 'is', null)
    .select('id')

  if (error) {
    throw new Error(`Failed deleting ${table}: ${error.message}`)
  }

  return (data ?? []).length
}

async function snapshotTable(table: 'series_picks' | 'game_picks' | 'simulation_series_picks' | 'simulation_game_picks') {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw new Error(`Failed snapshotting ${table}: ${error.message}`)
  return (data ?? []) as Record<string, unknown>[]
}

// POST /admin/internal/backup/run — internal automation entrypoint for scheduled backups
router.post('/internal/backup/run', async (req, res) => {
  if (!process.env.BACKUP_CRON_SECRET?.trim()) {
    return res.status(503).json({
      ok: false,
      error: 'BACKUP_CRON_SECRET não configurado no backend.',
    })
  }

  if (!hasValidBackupCronSecret(req)) {
    return res.status(401).json({
      ok: false,
      error: 'Invalid internal backup secret.',
    })
  }

  try {
    const shouldVerify = req.body?.verify !== false

    const backup = await executeTrackedOperation(
      {
        req,
        operation: 'backup',
        summary: (result) => `Backup operacional automático ${result.backupId} gerado com ${result.validation.fileCount} artefatos validados.`,
        errorSummary: 'Falha ao gerar backup operacional automático',
        outputDir: (result) => result.outputDir,
        artifacts: (result) => result.artifacts,
        metadata: (result) => ({
          backupId: result.backupId,
          automated: true,
          trigger: 'github-actions',
          metrics: result.metrics,
          validation: result.validation,
        }),
      },
      () => exportOperationalSnapshot()
    )

    const verification = shouldVerify
      ? await executeTrackedOperation(
          {
            req,
            operation: 'verify-backup',
            summary: (result) => (
              result.ok
                ? `Backup automático ${result.backupId} verificado sem alertas.`
                : `Backup automático ${result.backupId} verificado com ${result.problems.length} alerta(s).`
            ),
            errorSummary: 'Falha ao verificar backup operacional automático',
            outputDir: (result) => result.outputDir,
            artifacts: (result) => result.artifacts,
            metadata: (result) => ({
              backupId: result.backupId,
              automated: true,
              trigger: 'github-actions',
              manifestPath: result.manifestPath,
              problems: result.problems,
              ok: result.ok,
              artifactsChecked: result.artifactsChecked,
              storageArtifactsChecked: result.storageArtifactsChecked,
            }),
          },
          () => verifyOperationalSnapshot({
            backupId: backup.backupId,
            outputDir: backup.outputDir,
          })
        )
      : null

    res.json({
      ok: true,
      message: shouldVerify
        ? 'Backup automático e verificação concluídos.'
        : 'Backup automático concluído.',
      result: {
        backup,
        verification,
      },
    })
  } catch (err: unknown) {
    console.error('[admin/internal/backup/run] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

router.use(requireAdmin)

// POST /admin/sync — trigger manual NBA sync
router.post('/sync', async (req, res) => {
  try {
    await executeTrackedOperation(
      {
        req,
        operation: 'sync',
        summary: 'Sync manual da NBA concluido.',
        errorSummary: 'Falha no sync manual da NBA',
      },
      () => syncNBA()
    )

    res.json({ ok: true, message: 'Sync completed successfully' })
  } catch (err: unknown) {
    console.error('[admin/sync] Sync failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/rescore — recalculate scores only
router.post('/rescore', async (req, res) => {
  try {
    await executeTrackedOperation(
      {
        req,
        operation: 'rescore',
        summary: 'Recalculo manual do ranking concluido.',
        errorSummary: 'Falha ao recalcular ranking',
      },
      () => recalculateAllScores()
    )

    res.json({ ok: true, message: 'Rescoring completed successfully' })
  } catch (err: unknown) {
    console.error('[admin/rescore] Rescore failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// GET /admin/live-games — debug: raw live fields from DB for today's games
router.get('/live-games', async (_req, res) => {
  try {
    const today = new Date()
    const start = new Date(today)
    start.setHours(0, 0, 0, 0)
    const end = new Date(today)
    end.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from('games')
      .select('id, home_team_id, away_team_id, tip_off_at, played, game_state, status_text, current_period, clock, home_score, away_score')
      .gte('tip_off_at', start.toISOString())
      .lte('tip_off_at', end.toISOString())
      .order('tip_off_at')

    if (error) throw error
    res.json({ ok: true, timestamp: new Date().toISOString(), games: data ?? [] })
  } catch (err: unknown) {
    console.error('[admin/live-games] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// GET /admin/health
router.get('/health', async (_req, res) => {
  const operations = await listAdminOperationRuns(12)
  const liveGameColumns = await getLiveGameColumnsSnapshot()
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    scheduler: {
      nbaSync: getNBASyncSchedulerSnapshot(),
      dailyDigest: getDailyDigestSchedulerSnapshot(),
    },
    liveGameColumns,
    operations: {
      updatedAt: operations.updatedAt,
      summary: operations.summary,
      recentCount: operations.runs.length,
    },
  })
})

// GET /admin/operations
router.get('/operations', async (req, res) => {
  try {
    const rawLimit = Number(req.query.limit ?? 24)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 60) : 24
    const operations = await listAdminOperationRuns(limit)

    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      operations,
    })
  } catch (err: unknown) {
    console.error('[admin/operations] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// GET /admin/overview
router.get('/overview', async (_req, res) => {
  try {
    const overview = await buildAdminOverview()
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      overview,
    })
  } catch (err: unknown) {
    console.error('[admin/overview] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// GET /admin/pick-coverage
router.get('/pick-coverage', async (_req, res) => {
  try {
    const coverage = await buildAdminPickCoverage()
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      coverage,
    })
  } catch (err: unknown) {
    console.error('[admin/pick-coverage] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// GET /admin/pick-integrity
router.get('/pick-integrity', async (_req, res) => {
  try {
    const integrity = await buildAdminPickIntegrity()
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      integrity,
    })
  } catch (err: unknown) {
    console.error('[admin/pick-integrity] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// GET /admin/allowed-emails
router.get('/allowed-emails', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('allowed_emails')
      .select('email')
      .order('email', { ascending: true })

    if (error) {
      return res.status(500).json({ ok: false, error: error.message })
    }

    res.json({ ok: true, emails: (data ?? []) as AllowedEmailRow[] })
  } catch (err: unknown) {
    console.error('[admin/allowed-emails] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/backup — generate operational backup snapshot
router.post('/backup', async (req, res) => {
  try {
    const result = await executeTrackedOperation(
      {
        req,
        operation: 'backup',
        summary: (backup) => `Backup operacional gerado com ${backup.validation.fileCount} artefatos validados.`,
        errorSummary: 'Falha ao gerar backup operacional',
        outputDir: (backup) => backup.outputDir,
        artifacts: (backup) => backup.artifacts,
        metadata: (backup) => ({
          backupId: backup.backupId,
          metrics: backup.metrics,
          validation: backup.validation,
        }),
      },
      () => exportOperationalSnapshot()
    )

    res.json({
      ok: true,
      message: 'Operational backup generated successfully',
      result,
    })
  } catch (err: unknown) {
    console.error('[admin/backup] Backup failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// GET /admin/daily-digest/preview
router.get('/daily-digest/preview', async (req, res) => {
  try {
    const targetDate = typeof req.query.targetDate === 'string' ? req.query.targetDate.trim() : ''
    const variant = req.query.variant === 'compact' ? 'compact' : 'full'
    const result = await buildDailyPicksDigestPreview(targetDate || undefined, variant)

    res.json({
      ok: true,
      result,
    })
  } catch (err: unknown) {
    console.error('[admin/daily-digest/preview] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/backup/verify — validate an existing operational backup
router.post('/backup/verify', async (req, res) => {
  try {
    const backupId = typeof req.body?.backupId === 'string' ? req.body.backupId.trim() : ''
    const outputDir = typeof req.body?.outputDir === 'string' ? req.body.outputDir.trim() : ''

    if (!backupId && !outputDir) {
      return res.status(400).json({
        ok: false,
        error: 'backupId ou outputDir é obrigatório para validar um backup.',
      })
    }

    const result = await executeTrackedOperation(
      {
        req,
        operation: 'verify-backup',
        summary: (verification) => (
          verification.ok
            ? `Backup ${verification.backupId} verificado com ${verification.artifactsChecked} artefato(s).`
            : `Backup ${verification.backupId} verificado com ${verification.problems.length} alerta(s).`
        ),
        errorSummary: 'Falha ao verificar backup operacional',
        outputDir: (verification) => verification.outputDir,
        artifacts: (verification) => verification.artifacts,
        metadata: (verification) => ({
          backupId: verification.backupId,
          manifestPath: verification.manifestPath,
          problems: verification.problems,
          ok: verification.ok,
          artifactsChecked: verification.artifactsChecked,
          storageArtifactsChecked: verification.storageArtifactsChecked,
        }),
      },
      () => verifyOperationalSnapshot({
        backupId: backupId || null,
        outputDir: outputDir || null,
      })
    )

    res.json({
      ok: true,
      message: result.ok
        ? 'Backup verificado com sucesso.'
        : 'Backup verificado com alertas.',
      result,
    })
  } catch (err: unknown) {
    console.error('[admin/backup/verify] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/daily-digest — generate WhatsApp-ready daily picks summary
router.post('/daily-digest', async (req, res) => {
  try {
    const targetDate = typeof req.body?.targetDate === 'string' ? req.body.targetDate.trim() : ''
    const variant = req.body?.variant === 'compact' ? 'compact' : 'full'
    const result = await executeTrackedOperation(
      {
        req,
        operation: 'daily-digest',
        summary: (digest) => `Resumo do dia ${digest.targetDate} gerado na variante ${digest.variant}.`,
        errorSummary: 'Falha ao gerar resumo diario',
        targetDate: targetDate || null,
        variant,
        outputDir: (digest) => digest.outputDir,
        artifacts: (digest) => digest.artifacts,
        metadata: (digest) => ({
          summary: digest.summary,
          validation: digest.validation,
        }),
      },
      () => exportDailyPicksDigest(targetDate || undefined, variant)
    )

    res.json({
      ok: true,
      message: 'Resumo diário gerado com sucesso',
      result,
    })
  } catch (err: unknown) {
    console.error('[admin/daily-digest] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// GET /admin/daily-reminder/preview
router.get('/daily-reminder/preview', async (req, res) => {
  try {
    const targetDate = typeof req.query.targetDate === 'string' ? req.query.targetDate.trim() : ''
    const variant = req.query.variant === 'pending-only' ? 'pending-only' : 'full'
    const result = await buildDailyReminderPreview(targetDate || undefined, variant)

    res.json({ ok: true, result })
  } catch (err: unknown) {
    console.error('[admin/daily-reminder/preview] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/daily-reminder — generate WhatsApp-ready reminder of who hasn't picked today
router.post('/daily-reminder', async (req, res) => {
  try {
    const targetDate = typeof req.body?.targetDate === 'string' ? req.body.targetDate.trim() : ''
    const variant = req.body?.variant === 'pending-only' ? 'pending-only' : 'full'
    const result = await executeTrackedOperation(
      {
        req,
        operation: 'daily-reminder',
        summary: (reminder) => `Lembrete de ${reminder.targetDate} gerado com ${reminder.summary.gamesNeedingAttention} jogo(s) em aberto.`,
        errorSummary: 'Falha ao gerar lembrete diario',
        targetDate: targetDate || null,
        variant,
        outputDir: (reminder) => reminder.outputDir,
        artifacts: (reminder) => reminder.artifacts,
        metadata: (reminder) => ({
          summary: reminder.summary,
          validation: reminder.validation,
        }),
      },
      () => exportDailyReminder(targetDate || undefined, variant)
    )

    res.json({ ok: true, result })
  } catch (err: unknown) {
    console.error('[admin/daily-reminder] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/reset-picks — reset all saved picks before opening the bolao
router.post('/reset-picks', async (req, res) => {
  let snapshots: {
    series_picks: Record<string, unknown>[]
    game_picks: Record<string, unknown>[]
    simulation_series_picks: Record<string, unknown>[]
    simulation_game_picks: Record<string, unknown>[]
  } | null = null
  const startedAt = new Date().toISOString()

  try {
    const confirmation = typeof req.body?.confirmation === 'string' ? req.body.confirmation.trim() : ''
    if (confirmation !== 'ZERAR PALPITES') {
      return res.status(400).json({
        ok: false,
        error: 'Confirmação inválida. Digite exatamente: ZERAR PALPITES',
      })
    }

    // Gera backup antes de qualquer deleção
    const backup = await exportOperationalSnapshot()
    snapshots = {
      series_picks: await snapshotTable('series_picks'),
      game_picks: await snapshotTable('game_picks'),
      simulation_series_picks: await snapshotTable('simulation_series_picks'),
      simulation_game_picks: await snapshotTable('simulation_game_picks'),
    }

    // Executa deleções em sequência — se qualquer uma falhar, lança exceção
    // e o catch externo retorna erro sem continuar as demais tabelas
    const tables = ['series_picks', 'game_picks', 'simulation_series_picks', 'simulation_game_picks']
    const deleted: Record<string, number> = {}
    for (const table of tables) {
      deleted[table] = await deleteAllRows(table)
    }

    await recalculateAllScores()

    await recordAdminOperation({
      operation: 'reset-picks',
      status: 'success',
      summary: 'Reset pre-largada executado com backup previo validado.',
      startedAt,
      finishedAt: new Date().toISOString(),
      actor: getAdminActor(req),
      outputDir: backup.outputDir,
      artifacts: backup.artifacts,
      metadata: {
        deleted,
        backupId: backup.backupId,
        validation: backup.validation,
      },
    })

    res.json({
      ok: true,
      message: 'Todos os palpites foram zerados com backup prévio gerado.',
      backup,
      deleted,
    })
  } catch (err: unknown) {
    try {
      await restoreRows('series_picks', snapshots?.series_picks ?? [])
      await restoreRows('game_picks', snapshots?.game_picks ?? [])
      await restoreRows('simulation_series_picks', snapshots?.simulation_series_picks ?? [])
      await restoreRows('simulation_game_picks', snapshots?.simulation_game_picks ?? [])
    } catch (rollbackErr) {
      console.error('[admin/reset-picks] Rollback failed:', rollbackErr)
    }
    await recordAdminOperation({
      operation: 'reset-picks',
      status: 'error',
      summary: 'Falha ao executar reset pre-largada.',
      startedAt,
      finishedAt: new Date().toISOString(),
      actor: getAdminActor(req),
      metadata: {
        rollbackAttempted: true,
      },
      error: getErrorMessage(err),
    })
    console.error('[admin/reset-picks] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/allowed-emails/add
router.post('/allowed-emails/add', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email is required.' })
    }

    const data = await executeTrackedOperation(
      {
        req,
        operation: 'add-allowed-email',
        summary: `Email liberado: ${email}`,
        errorSummary: `Falha ao liberar email ${email}`,
        metadata: { email },
      },
      async () => {
        const response = await supabase
          .from('allowed_emails')
          .upsert({ email }, { onConflict: 'email' })
          .select('email')
          .single()

        if (response.error) {
          throw new Error(response.error.message)
        }

        return response.data
      }
    )

    res.json({ ok: true, email: data.email, message: 'Email liberado com sucesso.' })
  } catch (err: unknown) {
    console.error('[admin/allowed-emails/add] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/allowed-emails/remove
router.post('/allowed-emails/remove', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email is required.' })
    }

    const data = await executeTrackedOperation(
      {
        req,
        operation: 'remove-allowed-email',
        summary: `Email removido da whitelist: ${email}`,
        errorSummary: `Falha ao remover email ${email}`,
        metadata: { email },
      },
      async () => {
        const response = await supabase
          .from('allowed_emails')
          .delete()
          .eq('email', email)
          .select('email')

        if (response.error) {
          throw new Error(response.error.message)
        }

        return response.data ?? []
      }
    )

    res.json({ ok: true, removed: data.length, message: 'Email removido da lista de acesso.' })
  } catch (err: unknown) {
    console.error('[admin/allowed-emails/remove] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/participants/set-admin
router.post('/participants/set-admin', async (req, res) => {
  try {
    const participantId = typeof req.body?.participantId === 'string' ? req.body.participantId.trim() : ''
    const isAdmin = typeof req.body?.isAdmin === 'boolean' ? req.body.isAdmin : null
    const currentAdminParticipantId = (req as AdminRequest).adminParticipantId ?? ''

    if (!participantId || isAdmin == null) {
      return res.status(400).json({ ok: false, error: 'participantId and isAdmin are required.' })
    }

    if (!isAdmin && participantId === currentAdminParticipantId) {
      return res.status(400).json({ ok: false, error: 'Você não pode remover seu próprio acesso de admin por esta rota.' })
    }

    const data = await executeTrackedOperation(
      {
        req,
        operation: 'toggle-admin',
        summary: () => isAdmin ? 'Participante promovido a admin.' : 'Privilegio de admin removido.',
        errorSummary: 'Falha ao alterar privilegio admin',
        metadata: { participantId, isAdmin },
      },
      async () => {
        const response = await supabase
          .from('participants')
          .update({ is_admin: isAdmin })
          .eq('id', participantId)
          .select('id, name, email, is_admin')
          .single()

        if (response.error || !response.data) {
          throw new Error(response.error?.message ?? 'Participant not found.')
        }

        return response.data
      }
    )

    res.json({
      ok: true,
      participant: data,
      message: isAdmin ? 'Participante promovido a admin.' : 'Privilégio de admin removido.',
    })
  } catch (err: unknown) {
    console.error('[admin/participants/set-admin] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/participants/remove — fully remove one participant and related data
// GET /admin/picks/options — lista participantes, jogos abertos e séries abertas para o formulário de inserção manual
router.get('/picks/options', async (_req, res) => {
  try {
    const [
      { data: participantRows, error: participantsError },
      { data: gameRows, error: gamesError },
      { data: seriesRows, error: seriesError },
    ] = await Promise.all([
      supabase.from('participants').select('id, name').order('name', { ascending: true }),
      supabase
        .from('games')
        .select('id, game_number, home_team_id, away_team_id, tip_off_at, played')
        .eq('played', false)
        .not('home_team_id', 'is', null)
        .not('away_team_id', 'is', null)
        .order('tip_off_at', { ascending: true }),
      supabase
        .from('series')
        .select('id, round, home_team_id, away_team_id, is_complete')
        .eq('is_complete', false)
        .not('home_team_id', 'is', null)
        .not('away_team_id', 'is', null)
        .order('round', { ascending: true }),
    ])

    if (participantsError) throw new Error(participantsError.message)
    if (gamesError) throw new Error(gamesError.message)
    if (seriesError) throw new Error(seriesError.message)

    const roundLabels: Record<number, string> = { 1: 'R1', 2: 'R2', 3: 'Conf Finals', 4: 'Finals' }

    res.json({
      ok: true,
      participants: (participantRows ?? []).map((p) => ({ id: p.id, name: p.name })),
      games: (gameRows ?? []).map((g) => ({
        id: g.id,
        matchup: `${g.home_team_id} x ${g.away_team_id} — Jogo ${g.game_number}`,
        homeTeamId: g.home_team_id,
        awayTeamId: g.away_team_id,
        tipOffAt: g.tip_off_at ?? null,
      })),
      series: (seriesRows ?? []).map((s) => ({
        id: s.id,
        matchup: `${s.home_team_id} x ${s.away_team_id} (${roundLabels[s.round] ?? `R${s.round}`})`,
        homeTeamId: s.home_team_id,
        awayTeamId: s.away_team_id,
        round: s.round,
      })),
    })
  } catch (err: unknown) {
    console.error('[admin/picks/options] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/picks/insert — insere palpite manualmente; nunca sobrescreve pick existente
router.post('/picks/insert', async (req, res) => {
  try {
    const participantId = typeof req.body?.participantId === 'string' ? req.body.participantId.trim() : ''
    const type = req.body?.type === 'game' ? 'game' : req.body?.type === 'series' ? 'series' : ''
    const targetId = typeof req.body?.targetId === 'string' ? req.body.targetId.trim() : ''
    const winnerId = typeof req.body?.winnerId === 'string' ? req.body.winnerId.trim() : ''
    const gamesCount = type === 'series' ? Number(req.body?.gamesCount) : undefined

    if (!participantId || !type || !targetId || !winnerId) {
      return res.status(400).json({ ok: false, error: 'participantId, type, targetId e winnerId são obrigatórios.' })
    }
    if (type === 'series' && (!Number.isInteger(gamesCount) || (gamesCount as number) < 4 || (gamesCount as number) > 7)) {
      return res.status(400).json({ ok: false, error: 'gamesCount deve estar entre 4 e 7 para palpites de série.' })
    }

    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, name')
      .eq('id', participantId)
      .maybeSingle()

    if (participantError) return res.status(500).json({ ok: false, error: participantError.message })
    if (!participant) return res.status(404).json({ ok: false, error: 'Participante não encontrado.' })

    if (type === 'game') {
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('id, home_team_id, away_team_id, played')
        .eq('id', targetId)
        .maybeSingle()

      if (gameError) return res.status(500).json({ ok: false, error: gameError.message })
      if (!game) return res.status(404).json({ ok: false, error: 'Jogo não encontrado.' })
      if (winnerId !== game.home_team_id && winnerId !== game.away_team_id) {
        return res.status(400).json({ ok: false, error: 'winnerId inválido para este jogo.' })
      }

      const { data: existing } = await supabase
        .from('game_picks')
        .select('id, winner_id')
        .eq('participant_id', participantId)
        .eq('game_id', targetId)
        .maybeSingle()

      if (existing) {
        return res.json({
          ok: true,
          inserted: false,
          message: `${(participant as ParticipantNameRow).name} já tem palpite neste jogo (${existing.winner_id}). Nenhuma alteração feita.`,
        })
      }

      const { data: pick, error: insertError } = await supabase
        .from('game_picks')
        .insert({ participant_id: participantId, game_id: targetId, winner_id: winnerId })
        .select('*')
        .single()

      if (insertError) return res.status(500).json({ ok: false, error: insertError.message })

      console.log(`[admin/picks/insert] game pick: ${(participant as ParticipantNameRow).name} → ${targetId} → ${winnerId}`)
      return res.json({ ok: true, inserted: true, pick, message: `Palpite de jogo inserido para ${(participant as ParticipantNameRow).name}.` })
    } else {
      const { data: seriesItem, error: seriesError } = await supabase
        .from('series')
        .select('id, home_team_id, away_team_id, is_complete')
        .eq('id', targetId)
        .maybeSingle()

      if (seriesError) return res.status(500).json({ ok: false, error: seriesError.message })
      if (!seriesItem) return res.status(404).json({ ok: false, error: 'Série não encontrada.' })
      if (winnerId !== seriesItem.home_team_id && winnerId !== seriesItem.away_team_id) {
        return res.status(400).json({ ok: false, error: 'winnerId inválido para esta série.' })
      }

      const { data: existing } = await supabase
        .from('series_picks')
        .select('id, winner_id, games_count')
        .eq('participant_id', participantId)
        .eq('series_id', targetId)
        .maybeSingle()

      if (existing) {
        return res.json({
          ok: true,
          inserted: false,
          message: `${(participant as ParticipantNameRow).name} já tem palpite nesta série (${existing.winner_id} em ${existing.games_count}). Nenhuma alteração feita.`,
        })
      }

      const { data: pick, error: insertError } = await supabase
        .from('series_picks')
        .insert({ participant_id: participantId, series_id: targetId, winner_id: winnerId, games_count: gamesCount })
        .select('*')
        .single()

      if (insertError) return res.status(500).json({ ok: false, error: insertError.message })

      console.log(`[admin/picks/insert] series pick: ${(participant as ParticipantNameRow).name} → ${targetId} → ${winnerId} em ${gamesCount}`)
      return res.json({ ok: true, inserted: true, pick, message: `Palpite de série inserido para ${(participant as ParticipantNameRow).name} (${winnerId} em ${gamesCount} jogos).` })
    }
  } catch (err: unknown) {
    console.error('[admin/picks/insert] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

router.post('/participants/remove', async (req, res) => {
  try {
    const participantId = typeof req.body?.participantId === 'string' ? req.body.participantId.trim() : ''
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : ''

    const provided = [participantId, email, userId].filter(Boolean)
    if (provided.length !== 1) {
      return res.status(400).json({
        ok: false,
        error: 'Provide exactly one identifier: participantId, email, or userId.',
      })
    }

    const result = await executeTrackedOperation(
      {
        req,
        operation: 'remove-participant',
        summary: (payload) => `Participante removido completamente: ${payload.participant.name}.`,
        errorSummary: 'Falha ao remover participante',
        metadata: { participantId, email, userId },
      },
      () => (
        participantId
          ? removeParticipantCompletely({ participantId })
          : email
          ? removeParticipantCompletely({ email })
          : removeParticipantCompletely({ userId })
      )
    )

    res.json({
      ok: true,
      message: `Participant ${result.participant.name} removed completely from the bolao.`,
      result,
    })
  } catch (err: unknown) {
    console.error('[admin/participants/remove] Removal failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// GET /admin/badges — list all earned badges
router.get('/badges', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('participant_badges')
      .select('participant_id, badge_id, earned_at')
      .order('earned_at', { ascending: false })
    if (error) throw error
    res.json({ ok: true, definitions: BADGE_DEFINITIONS, badges: data ?? [] })
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/badges/recompute — force badge recalculation
router.post('/badges/recompute', async (_req, res) => {
  try {
    const result = await computeAndSaveBadges()
    res.json({ ok: true, ...result })
  } catch (err: unknown) {
    console.error('[admin/badges/recompute] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

export default router
