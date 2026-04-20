import { useEffect, useMemo, useState } from 'react'
import {
  Shield,
  Users,
  UserX,
  RefreshCw,
  DatabaseBackup,
  Activity,
  Search,
  Crown,
  AlertTriangle,
  KeyRound,
  ShieldCheck,
  Link2,
  Plus,
  Trash2,
  HeartPulse,
  Clock3,
  MessageSquareShare,
  RotateCcw,
  BellRing,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { adminGet, adminPost } from '../lib/adminApi'
import { useUIStore } from '../store/useUIStore'
import type { Participant } from '../types'
import { LoadingBasketball } from '../components/LoadingBasketball'
import { BRT_TIMEZONE } from '../utils/constants'

interface Props {
  participantId: string
}

interface ArtifactDescriptor {
  key: string
  label: string
  path: string
  kind: 'csv' | 'json' | 'md' | 'txt'
  sizeBytes: number
  checksumSha256: string
  storageBucket?: string | null
  storagePath?: string | null
  storageStatus?: 'uploaded' | 'skipped' | 'failed'
  storageError?: string | null
  downloadUrl?: string | null
}

interface ArtifactValidation {
  ok: boolean
  fileCount: number
  totalBytes: number
  verifiedAt: string
  missingFiles: string[]
}

interface SchedulerSnapshot {
  lastError?: string | null
  lastRunAt?: string | null
  lastSuccessAt?: string | null
  lastAttemptAt?: string | null
  isRunning: boolean
}

interface NBASyncSchedulerSnapshot extends SchedulerSnapshot {
  mode: string
  intervalSeconds?: number
  intervalMinutes: number
  reason: string
  lastSyncAt: string | null
}

interface DailyDigestSchedulerSnapshot extends SchedulerSnapshot {
  cron: string
  timezone: string
  lastOutputDir: string | null
}

interface LiveGameColumnsHealth {
  ready: boolean
  available: Array<'game_state' | 'status_text' | 'current_period' | 'clock'>
  missing: Array<'game_state' | 'status_text' | 'current_period' | 'clock'>
  checkedAt: string
  migrationPath: string
  message: string
}

interface OperationSummaryEntry {
  operation: string
  category: 'routine' | 'messaging' | 'protection' | 'access'
  label: string
  lastRunAt: string | null
  lastSuccessAt: string | null
  lastError: string | null
  lastStatus: 'success' | 'error' | null
  totalRuns: number
}

interface AdminOperationRun {
  id: string
  operation: string
  category: 'routine' | 'messaging' | 'protection' | 'access'
  status: 'success' | 'error'
  summary: string
  startedAt: string
  finishedAt: string
  durationMs: number
  targetDate: string | null
  variant: string | null
  outputDir: string | null
  actor: {
    adminUserId: string | null
    adminParticipantId: string | null
  }
  artifacts: ArtifactDescriptor[]
  metadata: Record<string, unknown>
  error: string | null
}

interface HealthResponse {
  ok: boolean
  timestamp: string
  uptime: number
  scheduler: {
    nbaSync: NBASyncSchedulerSnapshot
    dailyDigest: DailyDigestSchedulerSnapshot
  }
  liveGameColumns: LiveGameColumnsHealth
  operations: {
    updatedAt: string
    summary: OperationSummaryEntry[]
    recentCount: number
  }
}

interface DailyReminderGame {
  gameId: string
  gameNumber: number
  matchup: string
  tipOff: string
  missing: string[]
  picked: number
}

interface DailyReminderResult {
  targetDate: string
  generatedAt: string
  variant: 'full' | 'pending-only'
  whatsappText: string
  summary: {
    todayGames: number
    totalParticipants: number
    fullyPickedGames: number
    gamesNeedingAttention: number
    participantsPendingToday: number
    totalMissingEntries: number
  }
  gamesWithMissingPicks: DailyReminderGame[]
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

type DailyReminderPreviewResult = Omit<DailyReminderResult, 'outputDir' | 'validation' | 'artifacts' | 'files'>

interface DailyReminderResponse {
  ok: boolean
  result: DailyReminderResult
}

interface DailyReminderPreviewResponse {
  ok: boolean
  result: DailyReminderPreviewResult
}

interface DailyDigestGame {
  gameId: string
  gameNumber: number
  matchup: string
  tipOff: string
  totalPicks: number
  missingCount: number
  picks: string[]
}

interface DailyDigestSeries {
  seriesId: string
  roundLabel: string
  matchup: string
  totalPicks: number
  missingCount: number
  picks: string[]
}

interface DailyDigestResult {
  outputDir: string
  targetDate: string
  generatedAt: string
  variant: 'full' | 'compact'
  whatsappText: string
  summary: {
    todayGames: number
    activeSeries: number
    totalParticipants: number
    totalGamePicksToday: number
    totalSeriesPicksOpen: number
    gamesWithoutPicks: number
    activeSeriesWithoutPicks: number
  }
  games: DailyDigestGame[]
  series: DailyDigestSeries[]
  validation: ArtifactValidation
  artifacts: ArtifactDescriptor[]
  files: {
    whatsappTxt: string
    summaryMd: string
    payloadJson: string
    manifestJson: string
  }
}

type DailyDigestPreviewResult = Omit<DailyDigestResult, 'outputDir' | 'validation' | 'artifacts' | 'files'>

interface DailyDigestResponse {
  ok: boolean
  message: string
  result: DailyDigestResult
}

interface DailyDigestPreviewResponse {
  ok: boolean
  result: DailyDigestPreviewResult
}

interface PickInsertTarget {
  id: string
  matchup: string
  homeTeamId: string
  awayTeamId: string
  tipOffAt?: string | null
  round?: number
}

interface PickInsertOptionsResponse {
  ok: boolean
  participants: Array<{ id: string; name: string }>
  games: PickInsertTarget[]
  series: PickInsertTarget[]
}

interface PickInsertResponse {
  ok: boolean
  inserted: boolean
  message: string
}

interface BackupResult {
  backupId: string
  generatedAt: string
  outputDir: string
  metrics: {
    participants: number
    admins: number
    teams: number
    seriesTotal: number
    seriesCompleted: number
    gamesTotal: number
    gamesOpen: number
    seriesPicks: number
    gamePicks: number
  }
  validation: ArtifactValidation
  artifacts: ArtifactDescriptor[]
  files: {
    seriesPicksCsv: string
    gamePicksCsv: string
    rankingCsv: string
    summaryMd: string
    payloadJson: string
    manifestJson: string
  }
}

interface BackupResponse {
  ok: boolean
  message: string
  result: BackupResult
}

interface VerifiedArtifact extends ArtifactDescriptor {
  localExists: boolean
  sizeMatches: boolean
  checksumMatches: boolean
  storageOk: boolean | null
  problems: string[]
}

interface BackupVerificationResult {
  ok: boolean
  backupId: string
  outputDir: string
  verifiedAt: string
  manifestPath: string
  artifactsChecked: number
  storageArtifactsChecked: number
  problems: string[]
  artifacts: VerifiedArtifact[]
}

interface BackupVerificationResponse {
  ok: boolean
  message: string
  result: BackupVerificationResult
}

interface ResetPicksResponse {
  ok: boolean
  message: string
  backup: BackupResponse['result']
  deleted: {
    series_picks: number
    game_picks: number
    simulation_series_picks: number
    simulation_game_picks: number
  }
}

interface RemoveParticipantResponse {
  ok: boolean
  message: string
  result: {
    participant: {
      id: string
      name: string
      email: string
      user_id: string
    }
    deleted: {
      series_picks: number
      game_picks: number
      simulation_series_picks: number
      simulation_game_picks: number
      participants: number
      allowed_emails: number
    }
  }
}

interface AllowedEmailsResponse {
  ok: boolean
  emails: Array<{ email: string }>
}

interface OverviewResponse {
  ok: boolean
  timestamp: string
  overview: {
    stats: {
      participants: number
      admins: number
      allowed_emails: number
      series_picks: number
      game_picks: number
      simulation_series_picks: number
      simulation_game_picks: number
      series_total: number
      series_completed: number
      games_total: number
      games_played: number
      mode: string
    }
    inconsistencies: {
      duplicate_names: number
      duplicate_emails: number
      participants_without_access: number
      allowed_without_participant: number
      orphaned_series_picks: number
      orphaned_game_picks: number
    }
    details: {
      participants_without_access: Array<{ id: string; name: string; email: string }>
      allowed_without_participant: string[]
    }
  }
}

interface ToggleAdminResponse {
  ok: boolean
  participant: {
    id: string
    name: string
    email: string
    is_admin: boolean
  }
  message: string
}

interface OperationsResponse {
  ok: boolean
  timestamp: string
  operations: {
    updatedAt: string
    runs: AdminOperationRun[]
    summary: OperationSummaryEntry[]
  }
}

interface PickCoverageEntry {
  matchup: string
  tipOffAt: string | null
  tipOffLabel: string
  locked: boolean
  status: 'open' | 'locked' | 'closed'
  pickedCount: number
  missingCount: number
  pickedParticipants: string[]
  missingParticipants: string[]
}

interface PickCoverageGameEntry extends PickCoverageEntry {
  gameId: string
  gameNumber: number
}

interface PickCoverageSeriesEntry extends PickCoverageEntry {
  seriesId: string
}

interface PickCoverageResponse {
  ok: boolean
  timestamp: string
  coverage: {
    summary: {
      todayGames: number
      todayGamesPending: number
      roundOneSeriesOpen: number
      roundOneSeriesPending: number
      totalParticipants: number
      participantsPendingToday: number
      participantsPendingRoundOne: number
      activeRound: number
      lastSyncAt: string | null
      sourceLabel: string
    }
    todayGames: PickCoverageGameEntry[]
    roundOneSeries: PickCoverageSeriesEntry[]
  }
}

type PickIntegritySeverity = 'medium' | 'high'

interface PickIntegrityIssue {
  key: string
  severity: PickIntegritySeverity
  label: string
  count: number
  description: string
  recommendation: string
  samples: string[]
}

interface PickIntegrityResponse {
  ok: boolean
  timestamp: string
  integrity: {
    summary: {
      duplicateGamePickGroups: number
      duplicateSeriesPickGroups: number
      orphanedGamePicks: number
      orphanedSeriesPicks: number
      invalidGameWinners: number
      invalidSeriesWinners: number
      openGamesWithoutTipOff: number
      readySeriesWithoutTipOff: number
      totalIssues: number
    }
    issues: PickIntegrityIssue[]
    hardening: {
      sqlPath: string
      recommendations: string[]
    }
  }
}

interface ConfirmDialogState {
  title: string
  description: string
  confirmLabel: string
  tone: 'default' | 'danger'
  confirmationText?: string
  onConfirm: (typedConfirmation: string) => Promise<void>
}

const card: React.CSSProperties = {
  background: 'var(--nba-surface)',
  border: '1px solid var(--nba-border)',
  borderRadius: 10,
  padding: '1rem',
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{ color: 'var(--nba-gold)', display: 'flex' }}>{icon}</span>
      <h2 className="title" style={{ color: 'var(--nba-gold)', fontSize: '1rem', letterSpacing: '0.08em', margin: 0 }}>
        {children}
      </h2>
    </div>
  )
}

function formatTimestamp(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: BRT_TIMEZONE,
  }).format(new Date(value))
}

function getTodayInputDate() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: BRT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  )

  return `${parts.year}-${parts.month}-${parts.day}`
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) return `${durationMs} ms`
  if (durationMs < 60_000) return `${(durationMs / 1000).toFixed(1)} s`
  return `${(durationMs / 60_000).toFixed(1)} min`
}

function formatSchedulerCadence(snapshot: NBASyncSchedulerSnapshot | null | undefined) {
  if (!snapshot) return '—'

  if (typeof snapshot.intervalSeconds === 'number' && Number.isFinite(snapshot.intervalSeconds)) {
    if (snapshot.intervalSeconds < 60) return `${snapshot.intervalSeconds}s`
    const minutes = snapshot.intervalSeconds / 60
    return Number.isInteger(minutes) ? `${minutes} min` : `${minutes.toFixed(1)} min`
  }

  return `${snapshot.intervalMinutes} min`
}

function operationTone(status: 'success' | 'error' | null | undefined) {
  if (status === 'error') return 'var(--nba-danger)'
  if (status === 'success') return 'var(--nba-success)'
  return 'var(--nba-gold)'
}

function artifactBadgeTone(validation: ArtifactValidation | null | undefined) {
  return validation?.ok ? 'var(--nba-success)' : 'var(--nba-danger)'
}

function artifactStorageTone(status: ArtifactDescriptor['storageStatus']) {
  if (status === 'uploaded') return 'var(--nba-success)'
  if (status === 'failed') return 'var(--nba-danger)'
  return 'var(--nba-text-muted)'
}

function artifactStorageLabel(status: ArtifactDescriptor['storageStatus']) {
  if (status === 'uploaded') return 'Espelhado no Storage'
  if (status === 'failed') return 'Falha no Storage'
  if (status === 'skipped') return 'Storage não disponível'
  return 'Sem Storage'
}

function findOperationSummary(entries: OperationSummaryEntry[], operation: string) {
  return entries.find((entry) => entry.operation === operation) ?? null
}

function findLatestOperationRun(runs: AdminOperationRun[] | null | undefined, operation: string, status?: 'success' | 'error') {
  return (runs ?? []).find((entry) => entry.operation === operation && (!status || entry.status === status)) ?? null
}

function getMetadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim() ? value : null
}

function getMetadataStringArray(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key]
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0) : []
}

function formatBytes(totalBytes: number) {
  if (totalBytes < 1024) return `${totalBytes} B`
  if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`
  return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`
}

function getOperationHelperText(run: AdminOperationRun | null) {
  if (!run) return 'Ainda sem execuções registradas.'
  return `${run.summary} • ${formatTimestamp(run.finishedAt)}`
}

function modeLabel(mode: string) {
  const normalized = mode.trim().toLocaleLowerCase('pt-BR')
  if (normalized === 'real') return 'Operação real'
  if (normalized === 'ficticio' || normalized === 'fictício') return 'Simulação'
  return mode
}

function roundShortLabel(round: number | undefined): string {
  if (round === 1) return 'R1'
  if (round === 2) return 'R2'
  if (round === 3) return 'CF'
  if (round === 4) return 'Finals'
  return `R${round ?? 1}`
}

function coverageStatusLabel(entry: PickCoverageEntry) {
  if (entry.status === 'closed') return 'Encerrado'
  if (entry.status === 'locked') return 'Travou'
  if (entry.missingCount === 0) return 'Completo'
  return `Faltam ${entry.missingCount}`
}

function coverageStatusTone(entry: PickCoverageEntry) {
  if (entry.status === 'closed') {
    return entry.missingCount > 0 ? 'var(--nba-danger)' : 'var(--nba-success)'
  }
  if (entry.status === 'locked') {
    return entry.missingCount > 0 ? 'var(--nba-danger)' : 'var(--nba-text-muted)'
  }
  if (entry.missingCount === 0) return 'var(--nba-success)'
  return 'var(--nba-gold)'
}

function pickIntegrityTone(severity: PickIntegritySeverity) {
  return severity === 'high' ? 'var(--nba-danger)' : 'var(--nba-gold)'
}

export function Admin({ participantId }: Props) {
  const { addToast } = useUIStore()
  const todayInputDate = useMemo(() => getTodayInputDate(), [])
  const [activeView, setActiveView] = useState<'operations' | 'coverage'>('operations')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [allowedEmails, setAllowedEmails] = useState<string[]>([])
  const [overview, setOverview] = useState<OverviewResponse['overview'] | null>(null)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [operationsSnapshot, setOperationsSnapshot] = useState<OperationsResponse['operations'] | null>(null)
  const [pickCoverage, setPickCoverage] = useState<PickCoverageResponse['coverage'] | null>(null)
  const [pickIntegrity, setPickIntegrity] = useState<PickIntegrityResponse['integrity'] | null>(null)
  const [participantsQuery, setParticipantsQuery] = useState('')
  const [allowedEmailInput, setAllowedEmailInput] = useState('')
  const [showOnlyCoveragePending, setShowOnlyCoveragePending] = useState(true)
  const [loadingParticipants, setLoadingParticipants] = useState(true)
  const [loadingAllowedEmails, setLoadingAllowedEmails] = useState(true)
  const [loadingOverview, setLoadingOverview] = useState(true)
  const [loadingOperations, setLoadingOperations] = useState(true)
  const [loadingPickCoverage, setLoadingPickCoverage] = useState(true)
  const [loadingPickIntegrity, setLoadingPickIntegrity] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [digestTargetDate, setDigestTargetDate] = useState(todayInputDate)
  const [digestVariant, setDigestVariant] = useState<'full' | 'compact'>('full')
  const [digestPreview, setDigestPreview] = useState<DailyDigestPreviewResult | null>(null)
  const [loadingDigestPreview, setLoadingDigestPreview] = useState(false)
  const [digestModalOpen, setDigestModalOpen] = useState(false)
  const [latestDigest, setLatestDigest] = useState<DailyDigestResponse['result'] | null>(null)
  const [reminderTargetDate, setReminderTargetDate] = useState(todayInputDate)
  const [reminderVariant, setReminderVariant] = useState<'full' | 'pending-only'>('full')
  const [reminderPreview, setReminderPreview] = useState<DailyReminderPreviewResult | null>(null)
  const [loadingReminderPreview, setLoadingReminderPreview] = useState(false)
  const [reminderModalOpen, setReminderModalOpen] = useState(false)
  const [latestReminder, setLatestReminder] = useState<DailyReminderResponse['result'] | null>(null)
  const [backupModalOpen, setBackupModalOpen] = useState(false)
  const [latestBackup, setLatestBackup] = useState<BackupResponse['result'] | null>(null)
  const [backupVerificationModalOpen, setBackupVerificationModalOpen] = useState(false)
  const [latestBackupVerification, setLatestBackupVerification] = useState<BackupVerificationResult | null>(null)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [latestReset, setLatestReset] = useState<ResetPicksResponse['deleted'] | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [confirmInput, setConfirmInput] = useState('')
  const [pickInsertOptions, setPickInsertOptions] = useState<PickInsertOptionsResponse | null>(null)
  const [loadingPickOptions, setLoadingPickOptions] = useState(false)
  const [pickInsertType, setPickInsertType] = useState<'game' | 'series'>('game')
  const [pickInsertParticipant, setPickInsertParticipant] = useState('')
  const [pickInsertTarget, setPickInsertTarget] = useState('')
  const [pickInsertWinner, setPickInsertWinner] = useState('')
  const [pickInsertGamesCount, setPickInsertGamesCount] = useState(4)
  const [pickInsertResult, setPickInsertResult] = useState<{ ok: boolean; inserted: boolean; message: string } | null>(null)
  const [pickInsertBusy, setPickInsertBusy] = useState(false)

  async function loadParticipants() {
    setLoadingParticipants(true)
    const { data, error } = await supabase
      .from('participants')
      .select('id, user_id, name, email, is_admin')
      .order('name', { ascending: true })

    if (error) {
      addToast('Não foi possível carregar os participantes.', 'error')
      setLoadingParticipants(false)
      return
    }

    setParticipants((data ?? []) as Participant[])
    setLoadingParticipants(false)
  }

  async function loadAllowedEmails() {
    setLoadingAllowedEmails(true)
    try {
      const payload = await adminGet<AllowedEmailsResponse>('/admin/allowed-emails')
      setAllowedEmails(payload.emails.map((item) => item.email))
    } catch (error) {
      addToast((error as Error).message, 'error')
    } finally {
      setLoadingAllowedEmails(false)
    }
  }

  async function loadOverview() {
    setLoadingOverview(true)
    try {
      const payload = await adminGet<OverviewResponse>('/admin/overview')
      setOverview(payload.overview)
    } catch (error) {
      addToast((error as Error).message, 'error')
    } finally {
      setLoadingOverview(false)
    }
  }

  async function loadHealth() {
    try {
      const payload = await adminGet<HealthResponse>('/admin/health')
      setHealth(payload)
    } catch {
      setHealth(null)
    }
  }

  async function loadOperations() {
    setLoadingOperations(true)
    try {
      const payload = await adminGet<OperationsResponse>('/admin/operations?limit=24')
      setOperationsSnapshot(payload.operations)
    } catch (error) {
      addToast((error as Error).message, 'error')
    } finally {
      setLoadingOperations(false)
    }
  }

  async function loadPickCoverage() {
    setLoadingPickCoverage(true)
    try {
      const payload = await adminGet<PickCoverageResponse>('/admin/pick-coverage')
      setPickCoverage(payload.coverage)
    } catch (error) {
      addToast((error as Error).message, 'error')
    } finally {
      setLoadingPickCoverage(false)
    }
  }

  async function loadPickIntegrity() {
    setLoadingPickIntegrity(true)
    try {
      const payload = await adminGet<PickIntegrityResponse>('/admin/pick-integrity')
      setPickIntegrity(payload.integrity)
    } catch (error) {
      addToast((error as Error).message, 'error')
    } finally {
      setLoadingPickIntegrity(false)
    }
  }

  async function loadPickOptions() {
    setLoadingPickOptions(true)
    try {
      const payload = await adminGet<PickInsertOptionsResponse>('/admin/picks/options')
      setPickInsertOptions(payload)
      setPickInsertTarget('')
      setPickInsertWinner('')
      setPickInsertResult(null)
    } catch (error) {
      addToast((error as Error).message, 'error')
    } finally {
      setLoadingPickOptions(false)
    }
  }

  async function submitPickInsert() {
    if (!pickInsertParticipant || !pickInsertTarget || !pickInsertWinner) return
    setPickInsertBusy(true)
    setPickInsertResult(null)
    try {
      const body: Record<string, unknown> = {
        participantId: pickInsertParticipant,
        type: pickInsertType,
        targetId: pickInsertTarget,
        winnerId: pickInsertWinner,
      }
      if (pickInsertType === 'series') body.gamesCount = pickInsertGamesCount
      const payload = await adminPost<PickInsertResponse>('/admin/picks/insert', body)
      setPickInsertResult({ ok: true, inserted: payload.inserted, message: payload.message })
      if (payload.inserted) {
        loadPickCoverage()
        setPickInsertTarget('')
        setPickInsertWinner('')
      }
    } catch (error) {
      setPickInsertResult({ ok: false, inserted: false, message: (error as Error).message })
    } finally {
      setPickInsertBusy(false)
    }
  }

  async function loadDigestPreview(targetDate = digestTargetDate, variant = digestVariant) {
    setLoadingDigestPreview(true)
    try {
      const payload = await adminGet<DailyDigestPreviewResponse>(
        `/admin/daily-digest/preview?targetDate=${encodeURIComponent(targetDate)}&variant=${encodeURIComponent(variant)}`
      )
      setDigestPreview(payload.result)
    } catch (error) {
      addToast((error as Error).message, 'error')
      setDigestPreview(null)
    } finally {
      setLoadingDigestPreview(false)
    }
  }

  async function loadReminderPreview(targetDate = reminderTargetDate, variant = reminderVariant) {
    setLoadingReminderPreview(true)
    try {
      const payload = await adminGet<DailyReminderPreviewResponse>(
        `/admin/daily-reminder/preview?targetDate=${encodeURIComponent(targetDate)}&variant=${encodeURIComponent(variant)}`
      )
      setReminderPreview(payload.result)
    } catch (error) {
      addToast((error as Error).message, 'error')
      setReminderPreview(null)
    } finally {
      setLoadingReminderPreview(false)
    }
  }

  async function refreshOperationalData() {
    await Promise.all([loadHealth(), loadOperations(), loadPickCoverage(), loadPickIntegrity()])
  }

  function closeConfirmDialog() {
    setConfirmDialog(null)
    setConfirmInput('')
  }

  function openConfirmDialog(dialog: ConfirmDialogState) {
    setConfirmInput('')
    setConfirmDialog(dialog)
  }

  async function submitConfirmDialog() {
    if (!confirmDialog) return

    try {
      await confirmDialog.onConfirm(confirmInput)
    } finally {
      closeConfirmDialog()
    }
  }

  useEffect(() => {
    loadParticipants()
    loadAllowedEmails()
    loadOverview()
    loadHealth()
    loadOperations()
    loadPickCoverage()
    loadPickIntegrity()

    const sub = supabase
      .channel('admin-participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => {
        loadParticipants()
        loadOverview()
        loadPickCoverage()
        loadPickIntegrity()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'allowed_emails' }, () => {
        loadAllowedEmails()
        loadOverview()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_picks' }, () => {
        loadPickCoverage()
        loadPickIntegrity()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'series_picks' }, () => {
        loadPickCoverage()
        loadPickIntegrity()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
        loadPickCoverage()
        loadPickIntegrity()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'series' }, () => {
        loadPickCoverage()
        loadPickIntegrity()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
    }
  }, [])

  useEffect(() => {
    loadDigestPreview(digestTargetDate, digestVariant)
  }, [digestTargetDate, digestVariant])

  useEffect(() => {
    loadReminderPreview(reminderTargetDate, reminderVariant)
  }, [reminderTargetDate, reminderVariant])

  const duplicateNameSet = useMemo(() => {
    const counts = new Map<string, number>()

    for (const participant of participants) {
      const key = participant.name.trim().toLocaleLowerCase('pt-BR')
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    return new Set(
      Array.from(counts.entries())
        .filter(([, total]) => total > 1)
        .map(([name]) => name)
    )
  }, [participants])

  const selectedPickTarget = useMemo(() => {
    if (!pickInsertOptions || !pickInsertTarget) return null
    const list = pickInsertType === 'game' ? pickInsertOptions.games : pickInsertOptions.series
    return list.find((item) => item.id === pickInsertTarget) ?? null
  }, [pickInsertOptions, pickInsertType, pickInsertTarget])

  const filteredParticipants = useMemo(() => {
    const normalizedQuery = participantsQuery.trim().toLocaleLowerCase('pt-BR')
    if (!normalizedQuery) return participants

    return participants.filter((participant) =>
      participant.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
      participant.email.toLocaleLowerCase('pt-BR').includes(normalizedQuery)
    )
  }, [participants, participantsQuery])

  async function runAdminAction<TResponse>(actionKey: string, action: () => Promise<TResponse>) {
    setBusyAction(actionKey)
    try {
      return await action()
    } finally {
      setBusyAction(null)
    }
  }

  async function handleRescore() {
    try {
      await runAdminAction('rescore', () => adminPost('/admin/rescore'))
      addToast('Recalculo do ranking concluído.', 'success')
      await Promise.all([loadOverview(), refreshOperationalData()])
    } catch (error) {
      addToast((error as Error).message, 'error')
      await refreshOperationalData()
    }
  }

  async function handleBackup() {
    try {
      const payload = await runAdminAction('backup', () => adminPost<BackupResponse>('/admin/backup'))
      setLatestBackup(payload.result)
      setLatestBackupVerification(null)
      setBackupModalOpen(true)
      addToast('Backup operacional gerado com sucesso.', 'success')
      await refreshOperationalData()
    } catch (error) {
      addToast((error as Error).message, 'error')
      await refreshOperationalData()
    }
  }

  async function handleVerifyBackup(source?: { backupId?: string | null; outputDir?: string | null }) {
    const fallbackRun = findLatestOperationRun(operationsSnapshot?.runs, 'backup', 'success')
    const backupId = source?.backupId ?? latestBackup?.backupId ?? getMetadataString(fallbackRun?.metadata, 'backupId')
    const outputDir = source?.outputDir ?? latestBackup?.outputDir ?? fallbackRun?.outputDir ?? null

    if (!backupId && !outputDir) {
      addToast('Nenhum backup recente encontrado para validar.', 'info')
      return
    }

    try {
      const payload = await runAdminAction('verify-backup', () =>
        adminPost<BackupVerificationResponse>('/admin/backup/verify', {
          backupId,
          outputDir,
        })
      )

      setLatestBackupVerification(payload.result)
      setBackupVerificationModalOpen(true)
      addToast(
        payload.result.ok
          ? 'Backup verificado com sucesso.'
          : 'Backup verificado com alertas. Confira o relatório.',
        payload.result.ok ? 'success' : 'info'
      )
      await refreshOperationalData()
    } catch (error) {
      addToast((error as Error).message, 'error')
      await refreshOperationalData()
    }
  }

  async function handleDailyDigest() {
    try {
      const payload = await runAdminAction('daily-digest', () =>
        adminPost<DailyDigestResponse>('/admin/daily-digest', {
          targetDate: digestTargetDate,
          variant: digestVariant,
        })
      )

      setLatestDigest(payload.result)
      setDigestModalOpen(true)
      addToast('Resumo do grupo gerado com sucesso.', 'success')
      await refreshOperationalData()
    } catch (error) {
      addToast((error as Error).message, 'error')
      await refreshOperationalData()
    }
  }

  async function handleDailyReminder() {
    try {
      const payload = await runAdminAction('daily-reminder', () =>
        adminPost<DailyReminderResponse>('/admin/daily-reminder', {
          targetDate: reminderTargetDate,
          variant: reminderVariant,
        })
      )
      setLatestReminder(payload.result)
      setReminderModalOpen(true)
      addToast('Lembrete do dia gerado com sucesso.', 'success')
      await refreshOperationalData()
    } catch (error) {
      addToast((error as Error).message, 'error')
      await refreshOperationalData()
    }
  }

  async function handleResetPicks() {
    const totalOfficial = (overview?.stats.series_picks ?? 0) + (overview?.stats.game_picks ?? 0)
    const totalSimulation = (overview?.stats.simulation_series_picks ?? 0) + (overview?.stats.simulation_game_picks ?? 0)
    openConfirmDialog({
      title: 'Confirmar reset pré-largada',
      description: `Essa ação vai zerar todos os palpites salvos antes da largada.\n\nOficiais: ${totalOfficial}\nSimulação: ${totalSimulation}\n\nUm backup operacional validado será gerado antes.\n\nDigite exatamente ZERAR PALPITES para continuar.`,
      confirmLabel: 'Executar reset',
      tone: 'danger',
      confirmationText: 'ZERAR PALPITES',
      onConfirm: async (typedConfirmation) => {
        try {
          const payload = await runAdminAction('reset-picks', () =>
            adminPost<ResetPicksResponse>('/admin/reset-picks', {
              confirmation: typedConfirmation,
            })
          )

          setLatestBackup(payload.backup)
          setLatestBackupVerification(null)
          setLatestReset(payload.deleted)
          setBackupModalOpen(true)
          setResetModalOpen(true)
          addToast('Palpites zerados com sucesso.', 'success')
          await Promise.all([loadOverview(), refreshOperationalData()])
        } catch (error) {
          addToast((error as Error).message, 'error')
          await refreshOperationalData()
        }
      },
    })
  }

  async function handleCopyDigest() {
    if (!latestDigest?.whatsappText) return

    try {
      await navigator.clipboard.writeText(latestDigest.whatsappText)
      addToast('Mensagem copiada para a área de transferência.', 'success')
    } catch {
      addToast('Não foi possível copiar automaticamente a mensagem.', 'error')
    }
  }

  async function handleSync() {
    try {
      await runAdminAction('sync', () => adminPost('/admin/sync'))
      addToast('Sync manual disparado com sucesso.', 'success')
      await refreshOperationalData()
    } catch (error) {
      addToast((error as Error).message, 'error')
      await refreshOperationalData()
    }
  }

  async function handleAddAllowedEmail() {
    const email = allowedEmailInput.trim().toLowerCase()
    if (!email) {
      addToast('Digite um email para liberar acesso.', 'info')
      return
    }

    try {
      await runAdminAction('add-allowed-email', () =>
        adminPost('/admin/allowed-emails/add', { email })
      )
      setAllowedEmailInput('')
      addToast('Email liberado com sucesso.', 'success')
      await Promise.all([loadAllowedEmails(), loadOverview(), refreshOperationalData()])
    } catch (error) {
      addToast((error as Error).message, 'error')
      await refreshOperationalData()
    }
  }

  async function handleRemoveAllowedEmail(email: string) {
    openConfirmDialog({
      title: 'Remover email da lista de acesso',
      description: `Remover ${email} da whitelist do bolão?`,
      confirmLabel: 'Remover email',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await runAdminAction(`remove-email:${email}`, () =>
            adminPost('/admin/allowed-emails/remove', { email })
          )
          addToast('Email removido da lista de acesso.', 'success')
          await Promise.all([loadAllowedEmails(), loadOverview(), refreshOperationalData()])
        } catch (error) {
          addToast((error as Error).message, 'error')
          await refreshOperationalData()
        }
      },
    })
  }

  async function handleToggleAdmin(participant: Participant) {
    const nextIsAdmin = !participant.is_admin
    openConfirmDialog({
      title: nextIsAdmin ? 'Promover participante' : 'Remover privilégio admin',
      description: nextIsAdmin
        ? `Promover ${participant.name} para admin?`
        : `Remover privilégio de admin de ${participant.name}?`,
      confirmLabel: nextIsAdmin ? 'Promover admin' : 'Remover admin',
      tone: nextIsAdmin ? 'default' : 'danger',
      onConfirm: async () => {
        try {
          const payload = await runAdminAction(
            `toggle-admin:${participant.id}`,
            () =>
              adminPost<ToggleAdminResponse>('/admin/participants/set-admin', {
                participantId: participant.id,
                isAdmin: nextIsAdmin,
              })
          )

          addToast(payload.message, 'success')
          await Promise.all([loadParticipants(), loadOverview(), refreshOperationalData()])
        } catch (error) {
          addToast((error as Error).message, 'error')
          await refreshOperationalData()
        }
      },
    })
  }

  async function handleRemoveParticipant(participant: Participant) {
    openConfirmDialog({
      title: 'Remover participante do bolão',
      description: `Remover ${participant.name} do bolão por completo?\n\nIsso vai apagar palpites, vínculo em participants e acesso em allowed_emails.`,
      confirmLabel: 'Remover participante',
      tone: 'danger',
      onConfirm: async () => {
        try {
          const payload = await runAdminAction(
            `remove:${participant.id}`,
            () =>
              adminPost<RemoveParticipantResponse>('/admin/participants/remove', {
                participantId: participant.id,
              })
          )

          addToast(
            `${payload.result.participant.name} removido. ${payload.result.deleted.series_picks} séries e ${payload.result.deleted.game_picks} jogos apagados.`,
            'success'
          )
          await Promise.all([loadParticipants(), loadAllowedEmails(), loadOverview(), refreshOperationalData()])
        } catch (error) {
          addToast((error as Error).message, 'error')
          await refreshOperationalData()
        }
      },
    })
  }

  const stats = overview?.stats
  const inconsistencies = overview?.inconsistencies
  const liveGameColumns = health?.liveGameColumns ?? null
  const liveColumnsReady = liveGameColumns?.ready ?? false
  const missingLiveColumnsLabel = liveGameColumns?.missing.join(', ') ?? ''
  const totalIssues = inconsistencies
    ? inconsistencies.duplicate_names +
      inconsistencies.duplicate_emails +
      inconsistencies.participants_without_access +
      inconsistencies.allowed_without_participant +
      inconsistencies.orphaned_series_picks +
      inconsistencies.orphaned_game_picks
    : 0
  const healthTimestamp = health?.timestamp ?? null
  const operationSummary = operationsSnapshot?.summary ?? health?.operations.summary ?? []
  const latestRun = operationsSnapshot?.runs[0] ?? null
  const backupSummary = findOperationSummary(operationSummary, 'backup')
  const verifyBackupSummary = findOperationSummary(operationSummary, 'verify-backup')
  const digestSummary = findOperationSummary(operationSummary, 'daily-digest')
  const reminderSummary = findOperationSummary(operationSummary, 'daily-reminder')
  const syncSummary = findOperationSummary(operationSummary, 'sync')
  const rescoreSummary = findOperationSummary(operationSummary, 'rescore')
  const resetSummary = findOperationSummary(operationSummary, 'reset-picks')
  const latestBackupRun = findLatestOperationRun(operationsSnapshot?.runs, 'backup', 'success')
  const latestBackupVerificationRun = findLatestOperationRun(operationsSnapshot?.runs, 'verify-backup')
  const pickIntegritySummary = pickIntegrity?.summary ?? null
  const pickIntegrityIssues = pickIntegrity?.issues ?? []
  const pickIntegrityCriticalCount = (pickIntegritySummary?.duplicateGamePickGroups ?? 0) + (pickIntegritySummary?.duplicateSeriesPickGroups ?? 0)
  const pickIntegrityWinnerIssues = (pickIntegritySummary?.invalidGameWinners ?? 0) + (pickIntegritySummary?.invalidSeriesWinners ?? 0)
  const pickIntegrityLockRisk = (pickIntegritySummary?.openGamesWithoutTipOff ?? 0) + (pickIntegritySummary?.readySeriesWithoutTipOff ?? 0)
  const filteredCoverageGames = useMemo(
    () =>
      (pickCoverage?.todayGames ?? []).filter((item) => !showOnlyCoveragePending || item.missingCount > 0),
    [pickCoverage, showOnlyCoveragePending]
  )
  const filteredCoverageSeries = useMemo(
    () =>
      (pickCoverage?.roundOneSeries ?? []).filter((item) => !showOnlyCoveragePending || item.missingCount > 0),
    [pickCoverage, showOnlyCoveragePending]
  )
  const playbookCards = [
    {
      key: 'pre-game',
      title: 'Pré-jogo',
      icon: <ShieldCheck size={14} />,
      tone: 'var(--nba-success)',
      status: backupSummary?.lastRunAt
        ? `Último backup: ${formatTimestamp(backupSummary.lastRunAt)}`
        : 'Comece sempre garantindo um backup recente.',
      steps: [
        '1. Conferir Saúde do Bolão e inconsistências abertas.',
        '2. Gerar Backup operacional.',
        '3. Rodar Verificar último antes de qualquer ação crítica.',
        '4. Gerar Lembrete de palpites se houver jogo aberto no dia.',
      ],
    },
    {
      key: 'live-round',
      title: 'Durante rodada',
      icon: <Activity size={14} />,
      tone: 'var(--nba-east)',
      status: syncSummary?.lastRunAt
        ? `Último sync: ${formatTimestamp(syncSummary.lastRunAt)}`
        : 'Use sync manual só quando os dados da rodada pedirem intervenção.',
      steps: [
        '1. Rodar Sincronizar dados reais da NBA se o feed atrasar ou houver defasagem.',
        '2. Recalcular ranking depois de sync ou correção operacional.',
        '3. Acompanhar Atividade Recente para validar status e alertas.',
        '4. Evitar ações destrutivas no meio da rodada.',
      ],
    },
    {
      key: 'post-game',
      title: 'Pós-jogo',
      icon: <MessageSquareShare size={14} />,
      tone: 'var(--nba-gold)',
      status: digestSummary?.lastRunAt
        ? `Último resumo: ${formatTimestamp(digestSummary.lastRunAt)}`
        : 'Fechou o dia? Resumo e ranking são o próximo passo.',
      steps: [
        '1. Rodar sync se os jogos do dia já encerraram.',
        '2. Recalcular ranking para congelar a leitura da rodada.',
        '3. Gerar Resumo do dia e revisar o preview antes de copiar.',
        '4. Usar o histórico operacional como trilha do que foi executado.',
      ],
    },
    {
      key: 'emergency',
      title: 'Emergência',
      icon: <AlertTriangle size={14} />,
      tone: 'var(--nba-danger)',
      status: latestBackupVerificationRun?.finishedAt
        ? `Última verificação: ${formatTimestamp(latestBackupVerificationRun.finishedAt)}`
        : 'Em dúvida, preserve o estado atual antes de mexer.',
      steps: [
        '1. Gerar Backup operacional imediatamente.',
        '2. Rodar Verificar último e conferir alertas por artefato.',
        '3. Só então executar reset, remoção ou correção estrutural.',
        '4. Se algo falhar, use Atividade Recente e o backup validado como trilha de recuperação.',
      ],
    },
  ]

  return (
    <>
      {confirmDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 8, 16, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 90,
          }}
          onClick={closeConfirmDialog}
        >
          <div
            style={{
              width: 'min(620px, 100%)',
              borderRadius: 16,
              border: `1px solid ${confirmDialog.tone === 'danger' ? 'rgba(231,76,60,0.22)' : 'rgba(200,150,60,0.18)'}`,
              background: 'linear-gradient(180deg, rgba(18,23,34,0.98), rgba(10,13,20,0.98))',
              boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
              overflow: 'hidden',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(200,150,60,0.10)' }}>
              <div className="font-condensed" style={{ color: confirmDialog.tone === 'danger' ? 'var(--nba-danger)' : 'var(--nba-gold)', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Confirmação operacional
              </div>
              <div style={{ color: 'var(--nba-text)', fontSize: '1rem', fontWeight: 700, marginTop: 4 }}>
                {confirmDialog.title}
              </div>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ color: 'var(--nba-text)', fontSize: '0.84rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {confirmDialog.description}
              </div>

              {confirmDialog.confirmationText && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginBottom: 8 }}>
                    Digite <strong>{confirmDialog.confirmationText}</strong> para liberar a ação.
                  </div>
                  <input
                    value={confirmInput}
                    onChange={(event) => setConfirmInput(event.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      borderRadius: 10,
                      border: '1px solid rgba(200,150,60,0.14)',
                      background: 'rgba(255,255,255,0.03)',
                      color: 'var(--nba-text)',
                      padding: '10px 12px',
                      fontSize: '0.82rem',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                <button
                  onClick={closeConfirmDialog}
                  style={{
                    borderRadius: 10,
                    border: '1px solid rgba(200,150,60,0.14)',
                    background: 'rgba(255,255,255,0.03)',
                    color: 'var(--nba-text)',
                    padding: '10px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={submitConfirmDialog}
                  disabled={Boolean(confirmDialog.confirmationText && confirmInput !== confirmDialog.confirmationText)}
                  style={{
                    borderRadius: 10,
                    border: `1px solid ${confirmDialog.tone === 'danger' ? 'rgba(231,76,60,0.22)' : 'rgba(200,150,60,0.18)'}`,
                    background: confirmDialog.tone === 'danger' ? 'rgba(231,76,60,0.10)' : 'rgba(200,150,60,0.10)',
                    color: confirmDialog.tone === 'danger' ? 'var(--nba-danger)' : 'var(--nba-gold)',
                    padding: '10px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: confirmDialog.confirmationText && confirmInput !== confirmDialog.confirmationText ? 0.6 : 1,
                  }}
                >
                  {confirmDialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {backupModalOpen && latestBackup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 8, 16, 0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 81,
          }}
          onClick={() => setBackupModalOpen(false)}
        >
          <div
            style={{
              width: 'min(760px, 100%)',
              maxHeight: '88vh',
              overflow: 'hidden',
              borderRadius: 16,
              border: '1px solid rgba(200,150,60,0.22)',
              background: 'linear-gradient(180deg, rgba(18,23,34,0.98), rgba(10,13,20,0.98))',
              boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
                padding: '18px 20px 14px',
                borderBottom: '1px solid rgba(200,150,60,0.12)',
              }}
            >
              <div>
                <div
                  className="font-condensed"
                  style={{ color: 'var(--nba-gold)', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                >
                  Backup operacional
                </div>
                <div style={{ color: 'var(--nba-text)', fontSize: '1rem', fontWeight: 700, marginTop: 4 }}>
                  Arquivos gerados com sucesso
                </div>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginTop: 6 }}>
                  Backup #{latestBackup.backupId} · {latestBackup.generatedAt}
                </div>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginTop: 4 }}>
                  Pasta de saída: {latestBackup.outputDir}
                </div>
              </div>

              <button
                onClick={() => setBackupModalOpen(false)}
                style={{
                  border: '1px solid rgba(200,150,60,0.18)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--nba-text)',
                  borderRadius: 10,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                Fechar
              </button>
            </div>

            <div style={{ padding: 20, overflow: 'auto', maxHeight: 'calc(88vh - 92px)' }}>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(200,150,60,0.08)',
                  border: '1px solid rgba(200,150,60,0.12)',
                  color: 'var(--nba-text)',
                  fontSize: '0.82rem',
                  marginBottom: 14,
                  lineHeight: 1.55,
                }}
              >
                O backup não baixa automaticamente no navegador. Esses arquivos foram salvos no disco do backend, e agora também tentam espelhar no Supabase Storage para auditoria, conferência e contingência operacional.
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                <button
                  onClick={() => handleVerifyBackup({ backupId: latestBackup.backupId, outputDir: latestBackup.outputDir })}
                  disabled={busyAction === 'verify-backup'}
                  style={{
                    borderRadius: 10,
                    border: '1px solid rgba(200,150,60,0.18)',
                    background: 'rgba(200,150,60,0.10)',
                    color: 'var(--nba-gold)',
                    padding: '10px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {busyAction === 'verify-backup' ? 'Verificando...' : 'Verificar este backup'}
                </button>
                {latestBackupVerification?.backupId === latestBackup.backupId && (
                  <button
                    onClick={() => setBackupVerificationModalOpen(true)}
                    style={{
                      borderRadius: 10,
                      border: `1px solid ${latestBackupVerification.ok ? 'rgba(46,204,113,0.18)' : 'rgba(231,76,60,0.18)'}`,
                      background: latestBackupVerification.ok ? 'rgba(46,204,113,0.10)' : 'rgba(231,76,60,0.10)',
                      color: latestBackupVerification.ok ? 'var(--nba-success)' : 'var(--nba-danger)',
                      padding: '10px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {latestBackupVerification.ok ? 'Última verificação OK' : 'Última verificação com alertas'}
                  </button>
                )}
              </div>

              {latestBackupVerification?.backupId === latestBackup.backupId && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: latestBackupVerification.ok ? 'rgba(46,204,113,0.08)' : 'rgba(231,76,60,0.08)',
                    border: `1px solid ${latestBackupVerification.ok ? 'rgba(46,204,113,0.18)' : 'rgba(231,76,60,0.18)'}`,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ color: latestBackupVerification.ok ? 'var(--nba-success)' : 'var(--nba-danger)', fontSize: '0.78rem', fontWeight: 700 }}>
                    {latestBackupVerification.ok ? 'Verificação formal concluída sem alertas' : 'Verificação formal encontrou alertas'}
                  </div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', marginTop: 6, lineHeight: 1.5 }}>
                    {latestBackupVerification.artifactsChecked} artefato(s) conferido(s) em {formatTimestamp(latestBackupVerification.verifiedAt)}
                    {latestBackupVerification.storageArtifactsChecked > 0 ? ` · ${latestBackupVerification.storageArtifactsChecked} arquivo(s) também validados no Storage` : ''}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gap: 10, marginBottom: 14 }} className="md:grid-cols-3">
                {[
                  { label: 'Artefatos', value: String(latestBackup.validation.fileCount), tone: artifactBadgeTone(latestBackup.validation) },
                  { label: 'Tamanho total', value: formatBytes(latestBackup.validation.totalBytes), tone: 'var(--nba-text)' },
                  { label: 'Validação', value: latestBackup.validation.ok ? 'OK' : 'Falhou', tone: artifactBadgeTone(latestBackup.validation) },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(200,150,60,0.10)',
                    }}
                  >
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginBottom: 6 }}>{item.label}</div>
                    <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.05rem' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gap: 10, marginBottom: 14 }} className="md:grid-cols-3">
                {[
                  { label: 'Participantes', value: String(latestBackup.metrics.participants) },
                  { label: 'Séries', value: `${latestBackup.metrics.seriesCompleted}/${latestBackup.metrics.seriesTotal}` },
                  { label: 'Jogos abertos', value: String(latestBackup.metrics.gamesOpen) },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(200,150,60,0.10)',
                    }}
                  >
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginBottom: 6 }}>{item.label}</div>
                    <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1.05rem' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {latestBackup.artifacts.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(200,150,60,0.10)',
                    }}
                  >
                    <div style={{ color: 'var(--nba-gold)', fontSize: '0.75rem', fontWeight: 700, marginBottom: 6 }}>
                      {item.label}
                    </div>
                    <div
                      style={{
                        color: 'var(--nba-text)',
                        fontSize: '0.78rem',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      }}
                    >
                      {item.path}
                    </div>
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem', marginTop: 8 }}>
                      {item.kind.toUpperCase()} · {formatBytes(item.sizeBytes)} · sha256 {item.checksumSha256.slice(0, 12)}…
                    </div>
                    <div style={{ color: artifactStorageTone(item.storageStatus), fontSize: '0.7rem', marginTop: 6 }}>
                      {artifactStorageLabel(item.storageStatus)}
                      {item.storagePath ? ` · ${item.storagePath}` : ''}
                    </div>
                    {item.storageError && (
                      <div style={{ color: 'var(--nba-danger)', fontSize: '0.7rem', marginTop: 4 }}>
                        {item.storageError}
                      </div>
                    )}
                    {item.downloadUrl && (
                      <a
                        href={item.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: 'var(--nba-gold)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          marginTop: 8,
                          textDecoration: 'none',
                        }}
                      >
                        <Link2 size={12} />
                        Abrir cópia do Storage
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {backupVerificationModalOpen && latestBackupVerification && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 8, 16, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 82,
          }}
          onClick={() => setBackupVerificationModalOpen(false)}
        >
          <div
            style={{
              width: 'min(760px, 100%)',
              maxHeight: '88vh',
              overflow: 'hidden',
              borderRadius: 16,
              border: `1px solid ${latestBackupVerification.ok ? 'rgba(46,204,113,0.22)' : 'rgba(231,76,60,0.22)'}`,
              background: 'linear-gradient(180deg, rgba(18,23,34,0.98), rgba(10,13,20,0.98))',
              boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
                padding: '18px 20px 14px',
                borderBottom: '1px solid rgba(200,150,60,0.12)',
              }}
            >
              <div>
                <div
                  className="font-condensed"
                  style={{
                    color: latestBackupVerification.ok ? 'var(--nba-success)' : 'var(--nba-danger)',
                    fontSize: '0.82rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Verificação operacional
                </div>
                <div style={{ color: 'var(--nba-text)', fontSize: '1rem', fontWeight: 700, marginTop: 4 }}>
                  Backup #{latestBackupVerification.backupId}
                </div>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginTop: 6 }}>
                  Conferido em {formatTimestamp(latestBackupVerification.verifiedAt)}
                </div>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginTop: 4 }}>
                  Manifesto: {latestBackupVerification.manifestPath}
                </div>
              </div>

              <button
                onClick={() => setBackupVerificationModalOpen(false)}
                style={{
                  border: '1px solid rgba(200,150,60,0.18)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--nba-text)',
                  borderRadius: 10,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                Fechar
              </button>
            </div>

            <div style={{ padding: 20, overflow: 'auto', maxHeight: 'calc(88vh - 92px)' }}>
              <div style={{ display: 'grid', gap: 10, marginBottom: 14 }} className="md:grid-cols-4">
                {[
                  { label: 'Status', value: latestBackupVerification.ok ? 'OK' : 'Alertas', tone: latestBackupVerification.ok ? 'var(--nba-success)' : 'var(--nba-danger)' },
                  { label: 'Artefatos', value: String(latestBackupVerification.artifactsChecked), tone: 'var(--nba-text)' },
                  { label: 'Storage checado', value: String(latestBackupVerification.storageArtifactsChecked), tone: 'var(--nba-text)' },
                  { label: 'Problemas', value: String(latestBackupVerification.problems.length), tone: latestBackupVerification.problems.length > 0 ? 'var(--nba-danger)' : 'var(--nba-success)' },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(200,150,60,0.10)',
                    }}
                  >
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginBottom: 6 }}>{item.label}</div>
                    <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.05rem' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(200,150,60,0.10)',
                  marginBottom: 14,
                  color: 'var(--nba-text-muted)',
                  fontSize: '0.76rem',
                  lineHeight: 1.55,
                }}
              >
                Diretório conferido: {latestBackupVerification.outputDir}
              </div>

              {latestBackupVerification.problems.length > 0 && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'rgba(231,76,60,0.08)',
                    border: '1px solid rgba(231,76,60,0.18)',
                    marginBottom: 14,
                  }}
                >
                  <div style={{ color: 'var(--nba-danger)', fontSize: '0.78rem', fontWeight: 700, marginBottom: 8 }}>
                    Alertas encontrados
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {latestBackupVerification.problems.map((problem, index) => (
                      <div key={`${problem}-${index}`} style={{ color: 'var(--nba-text)', fontSize: '0.76rem', lineHeight: 1.45 }}>
                        {problem}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gap: 10 }}>
                {latestBackupVerification.artifacts.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${item.problems.length > 0 ? 'rgba(231,76,60,0.18)' : 'rgba(200,150,60,0.10)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ color: 'var(--nba-gold)', fontSize: '0.75rem', fontWeight: 700 }}>{item.label}</div>
                      <div style={{ color: item.problems.length > 0 ? 'var(--nba-danger)' : 'var(--nba-success)', fontSize: '0.72rem', fontWeight: 700 }}>
                        {item.problems.length > 0 ? 'Com alerta' : 'Conferido'}
                      </div>
                    </div>
                    <div
                      style={{
                        color: 'var(--nba-text)',
                        fontSize: '0.78rem',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        marginTop: 6,
                      }}
                    >
                      {item.path}
                    </div>
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem', marginTop: 8, lineHeight: 1.5 }}>
                      Local: {item.localExists ? 'arquivo presente' : 'arquivo ausente'} · tamanho {item.sizeMatches ? 'ok' : 'divergente'} · checksum {item.checksumMatches ? 'ok' : 'divergente'}
                    </div>
                    <div style={{ color: artifactStorageTone(item.storageStatus), fontSize: '0.7rem', marginTop: 4, lineHeight: 1.5 }}>
                      {artifactStorageLabel(item.storageStatus)}
                      {item.storageStatus === 'uploaded' ? ` · ${item.storageOk ? 'download validado' : 'falha ao baixar do Storage'}` : ''}
                    </div>
                    {item.problems.length > 0 && (
                      <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
                        {item.problems.map((problem, index) => (
                          <div key={`${item.key}-${index}`} style={{ color: 'var(--nba-danger)', fontSize: '0.72rem' }}>
                            {problem}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {resetModalOpen && latestReset && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 8, 16, 0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 82,
          }}
          onClick={() => setResetModalOpen(false)}
        >
          <div
            style={{
              width: 'min(700px, 100%)',
              maxHeight: '88vh',
              overflow: 'hidden',
              borderRadius: 16,
              border: '1px solid rgba(231,76,60,0.22)',
              background: 'linear-gradient(180deg, rgba(28,18,18,0.98), rgba(12,10,12,0.98))',
              boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
                padding: '18px 20px 14px',
                borderBottom: '1px solid rgba(231,76,60,0.12)',
              }}
            >
              <div>
                <div
                  className="font-condensed"
                  style={{ color: 'var(--nba-danger)', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                >
                  Reset pré-largada
                </div>
                <div style={{ color: 'var(--nba-text)', fontSize: '1rem', fontWeight: 700, marginTop: 4 }}>
                  Palpites antigos apagados com backup prévio
                </div>
              </div>

              <button
                onClick={() => setResetModalOpen(false)}
                style={{
                  border: '1px solid rgba(231,76,60,0.18)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--nba-text)',
                  borderRadius: 10,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                Fechar
              </button>
            </div>

            <div style={{ padding: 20, overflow: 'auto', maxHeight: 'calc(88vh - 92px)' }}>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(231,76,60,0.10)',
                  border: '1px solid rgba(231,76,60,0.14)',
                  color: 'var(--nba-text)',
                  fontSize: '0.82rem',
                  marginBottom: 14,
                  lineHeight: 1.55,
                }}
              >
                Use esse reset só antes da abertura oficial do bolão. Como proteção, o sistema gerou backup antes da limpeza e recalculou o estado após a exclusão.
              </div>

              <div style={{ display: 'grid', gap: 10 }} className="md:grid-cols-2">
                {[
                  { label: 'Séries oficiais removidas', value: String(latestReset.series_picks) },
                  { label: 'Jogos oficiais removidos', value: String(latestReset.game_picks) },
                  { label: 'Séries de simulação removidas', value: String(latestReset.simulation_series_picks) },
                  { label: 'Jogos de simulação removidos', value: String(latestReset.simulation_game_picks) },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(231,76,60,0.10)',
                    }}
                  >
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', marginBottom: 6 }}>{item.label}</div>
                    <div className="font-condensed font-bold" style={{ color: 'var(--nba-danger)', fontSize: '1.3rem' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginTop: 14 }}>
                O caminho do backup gerado foi aberto no modal de backup logo após o reset.
              </div>
            </div>
          </div>
        </div>
      )}

      {reminderModalOpen && latestReminder && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(5,8,16,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 83 }}
          onClick={() => setReminderModalOpen(false)}
        >
          <div
            style={{ width: 'min(680px,100%)', maxHeight: '88vh', overflow: 'hidden', borderRadius: 16, border: '1px solid rgba(200,150,60,0.22)', background: 'linear-gradient(180deg,rgba(18,23,34,0.98),rgba(10,13,20,0.98))', boxShadow: '0 30px 80px rgba(0,0,0,0.45)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '18px 20px 14px', borderBottom: '1px solid rgba(200,150,60,0.12)' }}>
              <div>
                <div className="font-condensed" style={{ color: 'var(--nba-gold)', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Lembrete do dia
                </div>
                <div style={{ color: 'var(--nba-text)', fontSize: '1rem', fontWeight: 700, marginTop: 4 }}>
                  Quem ainda não palpitou hoje
                </div>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginTop: 6 }}>
                  {latestReminder.summary.todayGames} jogo(s) hoje · {latestReminder.summary.totalParticipants} participantes · gerado às {latestReminder.generatedAt}
                </div>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginTop: 4 }}>
                  Variante: {latestReminder.variant} · atenção em {latestReminder.summary.gamesNeedingAttention} jogo(s)
                </div>
              </div>
              <button
                onClick={() => setReminderModalOpen(false)}
                style={{ border: '1px solid rgba(200,150,60,0.18)', background: 'rgba(255,255,255,0.04)', color: 'var(--nba-text)', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}
              >
                Fechar
              </button>
            </div>

            <div style={{ padding: 20, overflow: 'auto', maxHeight: 'calc(88vh - 92px)', display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gap: 10 }} className="md:grid-cols-3">
                {[
                  { label: 'Pendências totais', value: String(latestReminder.summary.totalMissingEntries) },
                  { label: 'Participantes pendentes', value: String(latestReminder.summary.participantsPendingToday) },
                  { label: 'Validação', value: latestReminder.validation.ok ? 'OK' : 'Falhou' },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(200,150,60,0.10)',
                    }}
                  >
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginBottom: 6 }}>{item.label}</div>
                    <div className="font-condensed font-bold" style={{ color: item.label === 'Validação' ? artifactBadgeTone(latestReminder.validation) : 'var(--nba-text)', fontSize: '1.05rem' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {latestReminder.summary.todayGames === 0 ? (
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.84rem', padding: '12px 0' }}>
                  Nenhum jogo pendente para hoje.
                </div>
              ) : (
                latestReminder.gamesWithMissingPicks.map((game) => (
                  <div key={game.gameId} style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(12,12,18,0.5)', border: `1px solid ${game.missing.length === 0 ? 'rgba(46,204,113,0.2)' : 'rgba(200,150,60,0.14)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                      <div>
                        <span className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1rem' }}>
                          Jogo {game.gameNumber} — {game.matchup}
                        </span>
                        <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginLeft: 10 }}>{game.tipOff}</span>
                      </div>
                      <span className="font-condensed" style={{ color: game.missing.length === 0 ? 'var(--nba-success)' : 'var(--nba-gold)', fontSize: '0.84rem', fontWeight: 700, flexShrink: 0 }}>
                        {game.picked}/{latestReminder.summary.totalParticipants}
                      </span>
                    </div>

                    {game.missing.length === 0 ? (
                      <div style={{ color: 'var(--nba-success)', fontSize: '0.8rem' }}>✅ Todos palpitaram!</div>
                    ) : (
                      <div>
                        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginBottom: 6 }}>Faltam palpitar:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {game.missing.map((name) => (
                            <span key={name} style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.22)', color: 'var(--nba-danger)', fontSize: '0.76rem', fontWeight: 600 }}>
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}

              <div style={{ borderTop: '1px solid rgba(200,150,60,0.1)', paddingTop: 14 }}>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginBottom: 8 }}>Mensagem para WhatsApp</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(latestReminder.whatsappText)
                        addToast('Mensagem copiada!', 'success')
                      } catch {
                        addToast('Não foi possível copiar.', 'error')
                      }
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(200,150,60,0.18)', background: 'rgba(200,150,60,0.10)', color: 'var(--nba-gold)', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}
                  >
                    <MessageSquareShare size={14} />
                    Copiar mensagem
                  </button>
                </div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace,monospace', fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--nba-text)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(200,150,60,0.10)', borderRadius: 12, padding: '14px 16px' }}>
                  {latestReminder.whatsappText}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {digestModalOpen && latestDigest && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(5,8,16,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 80 }}
          onClick={() => setDigestModalOpen(false)}
        >
          <div
            style={{ width: 'min(520px, 100%)', borderRadius: 14, border: '1px solid rgba(200,150,60,0.22)', background: 'linear-gradient(180deg, rgba(18,23,34,0.98), rgba(10,13,20,0.98))', boxShadow: '0 30px 80px rgba(0,0,0,0.45)', padding: '20px 22px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div className="font-condensed" style={{ color: 'var(--nba-gold)', fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Exportação concluída</div>
                <div style={{ color: 'var(--nba-text)', fontSize: '0.94rem', fontWeight: 700, marginTop: 4 }}>Arquivo salvo com sucesso</div>
              </div>
              <button onClick={() => setDigestModalOpen(false)} style={{ border: '1px solid rgba(200,150,60,0.18)', background: 'rgba(255,255,255,0.04)', color: 'var(--nba-text)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>Fechar</button>
            </div>
            <div style={{ display: 'grid', gap: 8 }} className="md:grid-cols-2">
              {[
                { label: 'Data alvo', value: latestDigest.targetDate },
                { label: 'Variante', value: latestDigest.variant },
                { label: 'Validação', value: latestDigest.validation.ok ? '✅ OK' : '❌ Falhou' },
                { label: 'Picks hoje', value: String(latestDigest.summary.totalGamePicksToday) },
              ].map((item) => (
                <div key={item.label} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(200,150,60,0.10)' }}>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 4 }}>{item.label}</div>
                  <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.96rem' }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, color: 'var(--nba-text-muted)', fontSize: '0.72rem', wordBreak: 'break-all' }}>
              📁 {latestDigest.files.whatsappTxt}
            </div>
          </div>
        </div>
      )}

      <div className="pb-24 pt-4 px-4 mx-auto" style={{ maxWidth: 1460 }}>
        <section
        style={{
          background: 'linear-gradient(135deg, rgba(74,144,217,0.14), rgba(200,150,60,0.12) 50%, rgba(19,19,26,1) 100%)',
          border: '1px solid rgba(200,150,60,0.2)',
          borderRadius: 12,
          padding: '1rem',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nba-gold)', marginBottom: 10 }}>
          <Shield size={16} />
          <span className="font-condensed" style={{ fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Painel administrativo
          </span>
        </div>

        <div style={{ display: 'grid', gap: 14 }} className="md:grid-cols-[1.4fr_1fr]">
          <div>
            <h1 className="title" style={{ color: 'var(--nba-gold)', fontSize: '2.4rem', margin: 0, lineHeight: 0.95 }}>
              Admin do Bolão
            </h1>
            <p style={{ color: 'var(--nba-text)', fontSize: '0.92rem', margin: '10px 0 0' }}>
              Gestão de participantes, acesso, operações críticas, sync e saúde do sistema em um único lugar.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 10 }} className="grid-cols-2">
            {[
              { label: 'Participantes', value: stats?.participants ?? participants.length, tone: 'var(--nba-text)' },
              { label: 'Admins', value: stats?.admins ?? participants.filter((item) => item.is_admin).length, tone: 'var(--nba-gold)' },
              { label: 'Operação', value: 'Sync real da NBA', tone: 'var(--nba-east)' },
              {
                label: 'Health backend',
                value: !healthTimestamp
                  ? 'Sem resposta'
                  : !liveColumnsReady
                  ? 'Ajuste pendente'
                  : health?.scheduler.nbaSync.isRunning
                  ? 'Sincronizando'
                  : 'Online',
                tone: !healthTimestamp
                  ? 'var(--nba-danger)'
                  : !liveColumnsReady
                  ? '#ff8c72'
                  : health?.scheduler.nbaSync.isRunning
                  ? 'var(--nba-gold)'
                  : 'var(--nba-success)',
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(12,12,18,0.34)',
                  border: '1px solid rgba(200,150,60,0.14)',
                }}
              >
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>{item.label}</div>
                <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.25rem', lineHeight: 1.05 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 12 }}>
          Último health check: {formatTimestamp(healthTimestamp)} · Operações atualizadas em {formatTimestamp(operationsSnapshot?.updatedAt ?? health?.operations.updatedAt ?? null)}
        </div>
      </section>

      {liveGameColumns && !liveGameColumns.ready && (
        <section
          style={{
            ...card,
            marginBottom: 16,
            border: '1px solid rgba(255,140,114,0.28)',
            background: 'linear-gradient(135deg, rgba(255,140,114,0.12), rgba(19,19,26,0.96))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ff8c72', marginBottom: 10 }}>
            <AlertTriangle size={16} />
            <span className="font-condensed" style={{ fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Banco sem colunas live
            </span>
          </div>
          <div style={{ color: 'var(--nba-text)', fontSize: '0.86rem', lineHeight: 1.55 }}>
            O backend já suporta placar ao vivo, mas o Supabase atual ainda não recebeu a migração necessária.
            Faltam: <strong>{missingLiveColumnsLabel}</strong>.
          </div>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', lineHeight: 1.5, marginTop: 8 }}>
            Aplique <strong>{liveGameColumns.migrationPath}</strong> no SQL Editor do Supabase para liberar `LIVE`, período e relógio na Home.
            Última checagem: {formatTimestamp(liveGameColumns.checkedAt)}.
          </div>
        </section>
      )}

      <section
        style={{
          ...card,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="font-condensed" style={{ color: 'var(--nba-gold)', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Navegação administrativa
          </div>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.78rem', marginTop: 4 }}>
            Alterne entre a operação completa do comissário e a conferência rápida de cobertura dos palpites.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { key: 'operations', label: 'Centro operacional' },
            { key: 'coverage', label: 'Cobertura de palpites' },
          ].map((item) => {
            const active = activeView === item.key
            return (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key as 'operations' | 'coverage')}
                style={{
                  borderRadius: 999,
                  border: `1px solid ${active ? 'rgba(200,150,60,0.28)' : 'rgba(200,150,60,0.12)'}`,
                  background: active ? 'rgba(200,150,60,0.12)' : 'rgba(255,255,255,0.03)',
                  color: active ? 'var(--nba-gold)' : 'var(--nba-text)',
                  padding: '10px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </section>

      {activeView === 'operations' ? (
      <div style={{ display: 'grid', gap: 16 }}>
      <section
        style={{
          ...card,
          marginBottom: 16,
          background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(74,144,217,0.07) 42%, rgba(200,150,60,0.08) 100%)',
          borderRadius: 12,
        }}
      >
        <SectionTitle icon={<BellRing size={14} />}>Pulso do Comissário</SectionTitle>
        <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 md:grid-cols-3">
          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.14)' }}>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Estado operacional</div>
            <div className="font-condensed font-bold" style={{ color: totalIssues === 0 ? 'var(--nba-success)' : 'var(--nba-danger)', fontSize: '1rem', lineHeight: 1.05, marginBottom: 6 }}>
              {totalIssues === 0 ? 'Operação limpa' : `${totalIssues} ponto${totalIssues !== 1 ? 's' : ''} pedem atenção`}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem', lineHeight: 1.45 }}>
              {totalIssues === 0 ? 'Sem inconsistência estrutural aberta no recorte atual do sistema.' : 'Vale revisar acesso, órfãos e duplicidades antes da próxima janela crítica.'}
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.14)' }}>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Última movimentação</div>
            <div className="font-condensed font-bold" style={{ color: 'var(--nba-east)', fontSize: '1rem', lineHeight: 1.05, marginBottom: 6 }}>
              {latestRun ? latestRun.summary : 'Sem atividade registrada'}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem', lineHeight: 1.45 }}>
              {latestRun ? `Atualizado em ${formatTimestamp(latestRun.finishedAt)} · ${formatDuration(latestRun.durationMs)}.` : 'Ações administrativas recentes vão aparecer aqui como trilha operacional.'}
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.14)' }}>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Fonte operacional</div>
            <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '1rem', lineHeight: 1.05, marginBottom: 6 }}>
              {pickCoverage ? `${pickCoverage.summary.sourceLabel} · ${pickCoverage.summary.totalParticipants} no jogo` : 'API da NBA + base local'}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem', lineHeight: 1.45 }}>
              {health
                ? `Sync real: ${health.scheduler.nbaSync.mode} a cada ${formatSchedulerCadence(health.scheduler.nbaSync)}.`
                : 'Sem health check recente; vale conferir antes de uma ação crítica.'}
            </div>
            {liveGameColumns && !liveGameColumns.ready && (
              <div style={{ color: '#ff8c72', fontSize: '0.72rem', lineHeight: 1.45, marginTop: 8 }}>
                Schema live pendente no banco: {missingLiveColumnsLabel}.
              </div>
            )}
          </div>
        </div>
      </section>

      <section style={card}>
        <SectionTitle icon={<Shield size={14} />}>Playbook Operacional</SectionTitle>
        <div style={{ display: 'grid', gap: 12 }} className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          {playbookCards.map((cardItem) => (
            <div
              key={cardItem.key}
              style={{
                padding: '14px 15px',
                borderRadius: 14,
                background: 'linear-gradient(180deg, rgba(12,12,18,0.40), rgba(12,12,18,0.26))',
                border: `1px solid ${cardItem.tone === 'var(--nba-danger)' ? 'rgba(231,76,60,0.18)' : 'rgba(200,150,60,0.14)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ color: cardItem.tone, display: 'flex' }}>{cardItem.icon}</span>
                <div className="font-condensed font-bold" style={{ color: cardItem.tone, fontSize: '0.96rem', lineHeight: 1 }}>
                  {cardItem.title}
                </div>
              </div>
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', lineHeight: 1.5, marginBottom: 10 }}>
                {cardItem.status}
              </div>
              <div style={{ display: 'grid', gap: 7 }}>
                {cardItem.steps.map((step) => (
                  <div key={step} style={{ color: 'var(--nba-text)', fontSize: '0.76rem', lineHeight: 1.5 }}>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={card}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <SectionTitle icon={<AlertTriangle size={14} />}>Integridade dos Palpites</SectionTitle>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.78rem', lineHeight: 1.5, marginTop: -6 }}>
              Radar de duplicidade, winner inválido e risco de lock para antecipar problema antes da reclamação chegar.
            </div>
          </div>
          <button
            onClick={() => loadPickIntegrity()}
            disabled={loadingPickIntegrity}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 10,
              border: '1px solid rgba(200,150,60,0.18)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--nba-text)',
              padding: '10px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
            {loadingPickIntegrity ? 'Atualizando...' : 'Rodar varredura'}
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10, marginTop: 14 }} className="grid-cols-2 md:grid-cols-4">
          {[
            {
              label: 'Issues totais',
              value: pickIntegritySummary?.totalIssues ?? '—',
              tone: (pickIntegritySummary?.totalIssues ?? 0) > 0 ? 'var(--nba-danger)' : 'var(--nba-success)',
            },
            {
              label: 'Grupos duplicados',
              value: pickIntegrityCriticalCount,
              tone: pickIntegrityCriticalCount > 0 ? 'var(--nba-danger)' : 'var(--nba-success)',
            },
            {
              label: 'Winner inválido',
              value: pickIntegrityWinnerIssues,
              tone: pickIntegrityWinnerIssues > 0 ? 'var(--nba-danger)' : 'var(--nba-success)',
            },
            {
              label: 'Risco de lock',
              value: pickIntegrityLockRisk,
              tone: pickIntegrityLockRisk > 0 ? 'var(--nba-gold)' : 'var(--nba-success)',
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'rgba(12,12,18,0.34)',
                border: '1px solid rgba(200,150,60,0.14)',
              }}
            >
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>{item.label}</div>
              <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.18rem', lineHeight: 1.05 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {loadingPickIntegrity ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '22px 0 8px' }}>
            <LoadingBasketball size={24} />
          </div>
        ) : pickIntegrityIssues.length === 0 ? (
          <div
            style={{
              marginTop: 14,
              padding: '14px 15px',
              borderRadius: 12,
              background: 'rgba(46,204,113,0.08)',
              border: '1px solid rgba(46,204,113,0.18)',
              color: 'var(--nba-success)',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            Nenhuma anomalia crítica encontrada agora.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
            {pickIntegrityIssues.map((issue) => {
              const tone = pickIntegrityTone(issue.severity)
              return (
                <div
                  key={issue.key}
                  style={{
                    padding: '14px 15px',
                    borderRadius: 12,
                    background: 'rgba(12,12,18,0.34)',
                    border: `1px solid ${tone}26`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div className="font-condensed font-bold" style={{ color: tone, fontSize: '0.96rem', lineHeight: 1 }}>
                        {issue.label}
                      </div>
                      <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', marginTop: 6 }}>
                        {issue.description}
                      </div>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: tone, border: `1px solid ${tone}33`, background: `${tone}14`, borderRadius: 999, padding: '4px 10px', fontSize: '0.7rem', fontWeight: 800 }}>
                      {issue.severity === 'high' ? 'Alta prioridade' : 'Atenção'}
                      <span>•</span>
                      <span>{issue.count}</span>
                    </div>
                  </div>

                  <div style={{ color: 'var(--nba-text)', fontSize: '0.78rem', lineHeight: 1.55, marginTop: 10 }}>
                    {issue.recommendation}
                  </div>

                  {issue.samples.length > 0 && (
                    <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                      {issue.samples.map((sample) => (
                        <div
                          key={sample}
                          style={{
                            color: 'var(--nba-text-muted)',
                            fontSize: '0.72rem',
                            lineHeight: 1.5,
                            padding: '8px 10px',
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(200,150,60,0.08)',
                          }}
                        >
                          {sample}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {pickIntegrity?.hardening && (
          <div
            style={{
              marginTop: 14,
              padding: '14px 15px',
              borderRadius: 12,
              background: 'rgba(74,144,217,0.08)',
              border: '1px solid rgba(74,144,217,0.16)',
            }}
          >
            <div className="font-condensed font-bold" style={{ color: 'var(--nba-east)', fontSize: '0.9rem', lineHeight: 1 }}>
              Hardening recomendado
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', marginTop: 6 }}>
              Script sugerido: {pickIntegrity.hardening.sqlPath}
            </div>
            <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
              {pickIntegrity.hardening.recommendations.map((item) => (
                <div key={item} style={{ color: 'var(--nba-text)', fontSize: '0.76rem', lineHeight: 1.5 }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div style={{ display: 'grid', gap: 16 }} className="xl:grid-cols-[1.3fr_0.9fr]">
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <section style={card}>
            <SectionTitle icon={<HeartPulse size={14} />}>Saúde do Bolão</SectionTitle>

            <div style={{ display: 'grid', gap: 10 }} className="grid-cols-2 md:grid-cols-4">
              {[
                { label: 'Series picks', value: stats?.series_picks ?? '—', tone: 'var(--nba-text)' },
                { label: 'Game picks', value: stats?.game_picks ?? '—', tone: 'var(--nba-text)' },
                { label: 'Séries concluídas', value: stats ? `${stats.series_completed}/${stats.series_total}` : '—', tone: 'var(--nba-success)' },
                { label: 'Jogos jogados', value: stats ? `${stats.games_played}/${stats.games_total}` : '—', tone: 'var(--nba-east)' },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(12,12,18,0.34)',
                    border: '1px solid rgba(200,150,60,0.14)',
                  }}
                >
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>{item.label}</div>
                  <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.18rem', lineHeight: 1.05 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 12 }} className="grid-cols-2 md:grid-cols-3">
              {[
                { label: 'Nomes duplicados', value: inconsistencies?.duplicate_names ?? '—', tone: (inconsistencies?.duplicate_names ?? 0) > 0 ? 'var(--nba-danger)' : 'var(--nba-success)' },
                { label: 'Emails duplicados', value: inconsistencies?.duplicate_emails ?? '—', tone: (inconsistencies?.duplicate_emails ?? 0) > 0 ? 'var(--nba-danger)' : 'var(--nba-success)' },
                { label: 'Sem acesso liberado', value: inconsistencies?.participants_without_access ?? '—', tone: (inconsistencies?.participants_without_access ?? 0) > 0 ? 'var(--nba-gold)' : 'var(--nba-success)' },
                { label: 'Whitelist sem participante', value: inconsistencies?.allowed_without_participant ?? '—', tone: (inconsistencies?.allowed_without_participant ?? 0) > 0 ? 'var(--nba-gold)' : 'var(--nba-success)' },
                { label: 'Series picks órfãos', value: inconsistencies?.orphaned_series_picks ?? '—', tone: (inconsistencies?.orphaned_series_picks ?? 0) > 0 ? 'var(--nba-danger)' : 'var(--nba-success)' },
                { label: 'Game picks órfãos', value: inconsistencies?.orphaned_game_picks ?? '—', tone: (inconsistencies?.orphaned_game_picks ?? 0) > 0 ? 'var(--nba-danger)' : 'var(--nba-success)' },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(12,12,18,0.34)',
                    border: '1px solid rgba(200,150,60,0.14)',
                  }}
                >
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>{item.label}</div>
                  <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.18rem', lineHeight: 1.05 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {overview && (
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }} className="md:grid-cols-2">
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(12,12,18,0.34)',
                    border: '1px solid rgba(200,150,60,0.14)',
                  }}
                >
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 8 }}>Participantes sem acesso</div>
                  {overview.details.participants_without_access.length === 0 ? (
                    <div style={{ color: 'var(--nba-success)', fontSize: '0.76rem' }}>Nenhum caso encontrado.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 6 }}>
                      {overview.details.participants_without_access.slice(0, 4).map((participant) => (
                        <div key={participant.id} style={{ color: 'var(--nba-text)', fontSize: '0.76rem' }}>
                          {participant.name} <span style={{ color: 'var(--nba-text-muted)' }}>• {participant.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(12,12,18,0.34)',
                    border: '1px solid rgba(200,150,60,0.14)',
                  }}
                >
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 8 }}>Emails liberados sem participante</div>
                  {overview.details.allowed_without_participant.length === 0 ? (
                    <div style={{ color: 'var(--nba-success)', fontSize: '0.76rem' }}>Nenhum caso encontrado.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 6 }}>
                      {overview.details.allowed_without_participant.slice(0, 4).map((email) => (
                        <div key={email} style={{ color: 'var(--nba-text)', fontSize: '0.76rem' }}>
                          {email}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section style={card}>
            <SectionTitle icon={<Users size={14} />}>Participantes</SectionTitle>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                border: '1px solid rgba(200,150,60,0.14)',
                borderRadius: 10,
                padding: '10px 12px',
                background: 'rgba(12,12,18,0.34)',
                marginBottom: 12,
              }}
            >
              <Search size={15} style={{ color: 'var(--nba-text-muted)', flexShrink: 0 }} />
              <input
                value={participantsQuery}
                onChange={(event) => setParticipantsQuery(event.target.value)}
                placeholder="Buscar por nome ou email"
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: 'var(--nba-text)',
                  fontSize: '0.86rem',
                }}
              />
            </div>

            {loadingParticipants ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                <LoadingBasketball size={24} />
              </div>
            ) : filteredParticipants.length === 0 ? (
              <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.84rem' }}>Nenhum participante encontrado para esse filtro.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {filteredParticipants.map((participant) => {
                  const isCurrentUser = participant.id === participantId
                  const hasDuplicateName = duplicateNameSet.has(participant.name.trim().toLocaleLowerCase('pt-BR'))
                  const removing = busyAction === `remove:${participant.id}`
                  const togglingAdmin = busyAction === `toggle-admin:${participant.id}`

                  return (
                    <div
                      key={participant.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: 'rgba(12,12,18,0.34)',
                        border: `1px solid ${hasDuplicateName ? 'rgba(231,76,60,0.22)' : 'rgba(200,150,60,0.12)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1rem', lineHeight: 1 }}>
                              {participant.name}
                            </div>
                            {participant.is_admin && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--nba-gold)', fontSize: '0.68rem', fontWeight: 700 }}>
                                <Crown size={12} />
                                Admin
                              </span>
                            )}
                            {isCurrentUser && (
                              <span style={{ color: 'var(--nba-east)', fontSize: '0.68rem', fontWeight: 700 }}>
                                Você
                              </span>
                            )}
                            {hasDuplicateName && (
                              <span style={{ color: 'var(--nba-danger)', fontSize: '0.68rem', fontWeight: 700 }}>
                                Nome duplicado
                              </span>
                            )}
                          </div>
                          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', marginTop: 6 }}>
                            {participant.email}
                          </div>
                          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginTop: 4 }}>
                            ID: {participant.id}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            disabled={isCurrentUser || togglingAdmin}
                            onClick={() => handleToggleAdmin(participant)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '10px 12px',
                              borderRadius: 10,
                              border: '1px solid rgba(200,150,60,0.18)',
                              background: 'rgba(200,150,60,0.08)',
                              color: isCurrentUser ? 'var(--nba-text-muted)' : 'var(--nba-gold)',
                              cursor: isCurrentUser ? 'not-allowed' : 'pointer',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                            }}
                            title={isCurrentUser ? 'Não é permitido remover o seu próprio acesso de admin por esta tela.' : 'Alterar privilégio de admin'}
                          >
                            <ShieldCheck size={14} />
                            {togglingAdmin ? 'Salvando...' : participant.is_admin ? 'Remover admin' : 'Tornar admin'}
                          </button>

                          <button
                            disabled={isCurrentUser || removing}
                            onClick={() => handleRemoveParticipant(participant)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '10px 12px',
                              borderRadius: 10,
                              border: '1px solid rgba(231,76,60,0.2)',
                              background: 'rgba(231,76,60,0.08)',
                              color: isCurrentUser ? 'var(--nba-text-muted)' : 'var(--nba-danger)',
                              cursor: isCurrentUser ? 'not-allowed' : 'pointer',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              opacity: removing ? 0.7 : 1,
                            }}
                            title={isCurrentUser ? 'Não é permitido remover o seu próprio acesso por esta tela.' : 'Remover participante completamente'}
                          >
                            <UserX size={14} />
                            {removing ? 'Removendo...' : 'Remover completo'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <section style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <div style={card}>
            <SectionTitle icon={<Activity size={14} />}>Centro Operacional</SectionTitle>

            <div style={{ display: 'grid', gap: 12 }}>
              {/* ── Resumo do dia ── */}
              <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(200,150,60,0.14)', background: 'rgba(12,12,18,0.34)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <div style={{ color: 'var(--nba-gold)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em' }}>📋 Resumo do dia</div>
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 3 }}>
                      {digestPreview
                        ? `${digestPreview.summary.todayGames} jogos · ${digestPreview.summary.activeSeries} séries · ${digestPreview.summary.totalGamePicksToday} picks hoje`
                        : (loadingDigestPreview ? 'Carregando...' : 'Nenhum preview disponível')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="date"
                      value={digestTargetDate}
                      onChange={(event) => setDigestTargetDate(event.target.value)}
                      style={{ borderRadius: 8, border: '1px solid rgba(200,150,60,0.14)', background: 'rgba(255,255,255,0.03)', color: 'var(--nba-text)', padding: '7px 10px', fontSize: '0.8rem' }}
                    />
                    <select
                      value={digestVariant}
                      onChange={(event) => setDigestVariant(event.target.value as 'full' | 'compact')}
                      style={{ borderRadius: 8, border: '1px solid rgba(200,150,60,0.14)', background: 'rgba(12,12,18,0.8)', color: 'var(--nba-text)', padding: '7px 10px', fontSize: '0.8rem' }}
                    >
                      <option value="full">Completo</option>
                      <option value="compact">Compacto</option>
                    </select>
                  </div>
                </div>

                {loadingDigestPreview ? (
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem', padding: '12px 0', textAlign: 'center' }}>Carregando mensagem...</div>
                ) : digestPreview?.whatsappText ? (
                  <>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace,monospace', fontSize: '0.82rem', lineHeight: 1.58, color: 'var(--nba-text)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(200,150,60,0.10)', borderRadius: 10, padding: '14px 16px', maxHeight: 320, overflowY: 'auto' }}>
                      {digestPreview.whatsappText}
                    </pre>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(digestPreview.whatsappText)
                            addToast('Mensagem copiada para a área de transferência.', 'success')
                          } catch {
                            addToast('Não foi possível copiar automaticamente.', 'error')
                          }
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(200,150,60,0.24)', background: 'rgba(200,150,60,0.12)', color: 'var(--nba-gold)', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                      >
                        <MessageSquareShare size={14} />
                        Copiar mensagem
                      </button>
                      <button
                        onClick={handleDailyDigest}
                        disabled={busyAction === 'daily-digest'}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'var(--nba-text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}
                      >
                        {busyAction === 'daily-digest' ? 'Exportando...' : '💾 Exportar arquivo'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem', padding: '12px 0' }}>Nenhuma mensagem para exibir.</div>
                )}
              </div>

              {/* ── Lembrete de palpites ── */}
              <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(200,150,60,0.14)', background: 'rgba(12,12,18,0.34)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <div style={{ color: 'var(--nba-gold)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em' }}>⏰ Lembrete de palpites</div>
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 3 }}>
                      {reminderPreview
                        ? `${reminderPreview.summary.gamesNeedingAttention} jogo(s) pendente(s) · ${reminderPreview.summary.participantsPendingToday} participante(s) faltando`
                        : (loadingReminderPreview ? 'Carregando...' : 'Nenhum preview disponível')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      type="date"
                      value={reminderTargetDate}
                      onChange={(event) => setReminderTargetDate(event.target.value)}
                      style={{ borderRadius: 8, border: '1px solid rgba(200,150,60,0.14)', background: 'rgba(255,255,255,0.03)', color: 'var(--nba-text)', padding: '7px 10px', fontSize: '0.8rem' }}
                    />
                    <select
                      value={reminderVariant}
                      onChange={(event) => setReminderVariant(event.target.value as 'full' | 'pending-only')}
                      style={{ borderRadius: 8, border: '1px solid rgba(200,150,60,0.14)', background: 'rgba(12,12,18,0.8)', color: 'var(--nba-text)', padding: '7px 10px', fontSize: '0.8rem' }}
                    >
                      <option value="full">Completo</option>
                      <option value="pending-only">Só pendentes</option>
                    </select>
                  </div>
                </div>

                {loadingReminderPreview ? (
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem', padding: '12px 0', textAlign: 'center' }}>Carregando mensagem...</div>
                ) : reminderPreview?.whatsappText ? (
                  <>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace,monospace', fontSize: '0.82rem', lineHeight: 1.58, color: 'var(--nba-text)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(200,150,60,0.10)', borderRadius: 10, padding: '14px 16px', maxHeight: 320, overflowY: 'auto' }}>
                      {reminderPreview.whatsappText}
                    </pre>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(reminderPreview.whatsappText)
                            addToast('Lembrete copiado para a área de transferência.', 'success')
                          } catch {
                            addToast('Não foi possível copiar automaticamente.', 'error')
                          }
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(200,150,60,0.24)', background: 'rgba(200,150,60,0.12)', color: 'var(--nba-gold)', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                      >
                        <MessageSquareShare size={14} />
                        Copiar lembrete
                      </button>
                      <button
                        onClick={handleDailyReminder}
                        disabled={busyAction === 'daily-reminder'}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'var(--nba-text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}
                      >
                        {busyAction === 'daily-reminder' ? 'Exportando...' : '💾 Exportar arquivo'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem', padding: '12px 0' }}>Nenhum jogo pendente hoje ou preview indisponível.</div>
                )}
              </div>

              <div style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(200,150,60,0.14)', background: 'rgba(12,12,18,0.34)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div>
                    <div style={{ color: 'var(--nba-gold)', fontSize: '0.78rem', fontWeight: 700 }}>Backup operacional</div>
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', marginTop: 4 }}>
                      {backupSummary?.lastRunAt ? `Última execução: ${formatTimestamp(backupSummary.lastRunAt)}` : 'Nenhum backup manual recente'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleVerifyBackup({
                        backupId: latestBackup?.backupId ?? getMetadataString(latestBackupRun?.metadata, 'backupId'),
                        outputDir: latestBackup?.outputDir ?? latestBackupRun?.outputDir ?? null,
                      })}
                      disabled={busyAction === 'verify-backup' || (!latestBackup && !latestBackupRun)}
                      style={{
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.03)',
                        color: 'var(--nba-text)',
                        padding: '10px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {busyAction === 'verify-backup' ? 'Verificando...' : 'Verificar último'}
                    </button>
                    <button
                      onClick={handleBackup}
                      disabled={busyAction === 'backup'}
                      style={{
                        borderRadius: 10,
                        border: '1px solid rgba(200,150,60,0.18)',
                        background: 'rgba(200,150,60,0.10)',
                        color: 'var(--nba-gold)',
                        padding: '10px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {busyAction === 'backup' ? 'Gerando...' : 'Gerar backup'}
                    </button>
                  </div>
                </div>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', lineHeight: 1.5 }}>
                  {backupSummary?.lastError
                    ? `Último erro: ${backupSummary.lastError}`
                    : latestBackupVerification
                    ? `Última verificação: ${latestBackupVerification.ok ? 'ok' : 'com alertas'} em ${formatTimestamp(latestBackupVerification.verifiedAt)}.`
                    : verifyBackupSummary?.lastError
                    ? `Última verificação falhou: ${verifyBackupSummary.lastError}`
                    : 'Gera CSVs, payload bruto, resumo em Markdown, manifesto validado e tenta espelhar os artefatos no Storage.'}
                </div>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', lineHeight: 1.5, marginTop: 8 }}>
                  {latestBackupVerificationRun?.finishedAt
                    ? `Última checagem rastreada: ${formatTimestamp(latestBackupVerificationRun.finishedAt)}.`
                    : latestBackupRun
                    ? `Último backup rastreado: ${getMetadataString(latestBackupRun.metadata, 'backupId') ?? 'sem id'}`
                    : 'Quando houver um backup concluído, este bloco também libera verificação formal do manifesto e da cópia no Storage.'}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10 }} className="md:grid-cols-3">
                {[
                  {
                    key: 'sync',
                    label: 'Sincronizar dados reais',
                    helper: syncSummary?.lastRunAt ? `Última: ${formatTimestamp(syncSummary.lastRunAt)}` : getOperationHelperText(null),
                    busy: busyAction === 'sync',
                    onClick: handleSync,
                    icon: <Link2 size={15} />,
                    tone: 'rgba(200,150,60,0.14)',
                  },
                  {
                    key: 'rescore',
                    label: 'Recalcular ranking',
                    helper: rescoreSummary?.lastRunAt ? `Última: ${formatTimestamp(rescoreSummary.lastRunAt)}` : getOperationHelperText(null),
                    busy: busyAction === 'rescore',
                    onClick: handleRescore,
                    icon: <RefreshCw size={15} className={busyAction === 'rescore' ? 'animate-spin' : ''} />,
                    tone: 'rgba(200,150,60,0.14)',
                  },
                  {
                    key: 'reset',
                    label: 'Reset pré-largada',
                    helper: resetSummary?.lastRunAt ? `Última: ${formatTimestamp(resetSummary.lastRunAt)}` : 'Uso excepcional antes da abertura.',
                    busy: busyAction === 'reset-picks',
                    onClick: handleResetPicks,
                    icon: <RotateCcw size={15} />,
                    tone: 'rgba(231,76,60,0.18)',
                  },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={item.onClick}
                    disabled={item.busy}
                    style={{
                      textAlign: 'left',
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: `1px solid ${item.tone}`,
                      background: item.key === 'reset' ? 'rgba(231,76,60,0.08)' : 'rgba(12,12,18,0.34)',
                      color: 'var(--nba-text)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontWeight: 700 }}>
                      {item.icon}
                      {item.busy ? 'Executando...' : item.label}
                    </div>
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem' }}>{item.helper}</div>
                  </button>
                ))}
              </div>

              <div style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(200,150,60,0.14)', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginBottom: 8 }}>Scheduler e observabilidade</div>
                <div style={{ display: 'grid', gap: 8 }} className="md:grid-cols-2">
                  <div style={{ color: 'var(--nba-text)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                    NBA sync em <strong>{health?.scheduler.nbaSync.mode ?? '—'}</strong> · {formatSchedulerCadence(health?.scheduler.nbaSync)}
                    <div style={{ color: 'var(--nba-text-muted)' }}>{health?.scheduler.nbaSync.reason ?? 'Sem snapshot do scheduler.'}</div>
                  </div>
                  <div style={{ color: 'var(--nba-text)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                    Resumo automático: {health?.scheduler.dailyDigest.cron ?? '—'}
                    <div style={{ color: 'var(--nba-text-muted)' }}>
                      Último sucesso: {formatTimestamp(health?.scheduler.dailyDigest.lastSuccessAt ?? null)}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 10, color: liveColumnsReady ? 'var(--nba-success)' : '#ff8c72', fontSize: '0.76rem', lineHeight: 1.5 }}>
                  {liveGameColumns
                    ? liveGameColumns.ready
                      ? 'Schema live conferido: banco pronto para game_state, período e relógio.'
                      : `Schema live pendente: ${missingLiveColumnsLabel}. Aplicar ${liveGameColumns.migrationPath}.`
                    : 'Sem diagnóstico recente do schema live.'}
                </div>
              </div>
            </div>
          </div>

          <div style={card}>
            <SectionTitle icon={<KeyRound size={14} />}>Acesso</SectionTitle>

            <div
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 12,
                flexWrap: 'wrap',
              }}
            >
              <input
                value={allowedEmailInput}
                onChange={(event) => setAllowedEmailInput(event.target.value)}
                placeholder="novo@email.com"
                style={{
                  flex: 1,
                  minWidth: 220,
                  borderRadius: 10,
                  border: '1px solid rgba(200,150,60,0.14)',
                  background: 'rgba(12,12,18,0.34)',
                  color: 'var(--nba-text)',
                  padding: '10px 12px',
                  fontSize: '0.84rem',
                }}
              />

              <button
                onClick={handleAddAllowedEmail}
                disabled={busyAction === 'add-allowed-email'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(200,150,60,0.18)',
                  background: 'rgba(200,150,60,0.08)',
                  color: 'var(--nba-gold)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                }}
              >
                <Plus size={14} />
                {busyAction === 'add-allowed-email' ? 'Salvando...' : 'Liberar email'}
              </button>
            </div>

            {loadingAllowedEmails ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                <LoadingBasketball size={24} />
              </div>
            ) : allowedEmails.length === 0 ? (
              <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.84rem' }}>Nenhum email liberado no momento.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {allowedEmails.map((email) => (
                  <div
                    key={email}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: 'rgba(12,12,18,0.34)',
                      border: '1px solid rgba(200,150,60,0.12)',
                    }}
                  >
                    <span style={{ color: 'var(--nba-text)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {email}
                    </span>
                    <button
                      onClick={() => handleRemoveAllowedEmail(email)}
                      disabled={busyAction === `remove-email:${email}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid rgba(231,76,60,0.18)',
                        background: 'rgba(231,76,60,0.08)',
                        color: 'var(--nba-danger)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        flexShrink: 0,
                      }}
                    >
                      <Trash2 size={13} />
                      {busyAction === `remove-email:${email}` ? 'Removendo...' : 'Remover'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={card}>
            <SectionTitle icon={<Clock3 size={14} />}>Atividade Recente</SectionTitle>
            {loadingOperations ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                <LoadingBasketball size={24} />
              </div>
            ) : (operationsSnapshot?.runs.length ?? 0) === 0 ? (
              <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem' }}>As próximas execuções administrativas aparecerão aqui com duração, data e status real.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {operationsSnapshot?.runs.map((item) => {
                  const backupId = getMetadataString(item.metadata, 'backupId')
                  const problemCount = getMetadataStringArray(item.metadata, 'problems').length

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: 'rgba(12,12,18,0.34)',
                        border: '1px solid rgba(200,150,60,0.12)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ color: operationTone(item.status), fontSize: '0.78rem', fontWeight: 700 }}>
                          {item.summary}
                        </div>
                        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {item.category}
                        </div>
                      </div>
                      <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem', marginTop: 4 }}>
                        {formatTimestamp(item.finishedAt)} · {formatDuration(item.durationMs)}{item.targetDate ? ` · ${item.targetDate}` : ''}{item.variant ? ` · ${item.variant}` : ''}{backupId ? ` · ${backupId}` : ''}
                      </div>
                      {(item.artifacts.length > 0 || item.outputDir || item.error || problemCount > 0) && (
                        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginTop: 6, lineHeight: 1.5 }}>
                          {item.artifacts.length > 0 ? `${item.artifacts.length} artefato(s)` : 'Sem artefatos anexados'}
                          {problemCount > 0 ? ` · ${problemCount} alerta(s)` : ''}
                          {item.outputDir ? ` · ${item.outputDir}` : ''}
                          {item.error ? ` · ${item.error}` : ''}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div
            style={{
              ...card,
              background: 'linear-gradient(135deg, rgba(231,76,60,0.10), rgba(200,150,60,0.08) 65%, rgba(19,19,26,1) 100%)',
              border: '1px solid rgba(231,76,60,0.18)',
            }}
          >
            <SectionTitle icon={<AlertTriangle size={14} />}>Cuidados</SectionTitle>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.78rem', lineHeight: 1.5 }}>
              A remoção completa apaga os palpites do participante no bolão inteiro e remove o email de `allowed_emails` quando existir.
              A conta do usuário no Supabase Auth continua existindo. O sync manual deve ser usado com cuidado quando houver divergência entre
              a base local e o feed real da NBA.
            </div>
          </div>
        </section>
        </div>
      </div>
      ) : (
      <div style={{ display: 'grid', gap: 16 }}>

        {/* ── Inserir Palpite Manual ── */}
        <section style={{ ...card, background: 'linear-gradient(135deg, rgba(200,150,60,0.10), rgba(19,19,26,1) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <SectionTitle icon={<Plus size={14} />}>Inserir Palpite Manual</SectionTitle>
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.78rem', lineHeight: 1.5, marginTop: -6 }}>
                Registra um palpite por qualquer participante. Nunca sobrescreve pick já existente.
              </div>
            </div>
            <button
              onClick={loadPickOptions}
              disabled={loadingPickOptions}
              style={{
                borderRadius: 10,
                border: '1px solid rgba(200,150,60,0.28)',
                background: pickInsertOptions ? 'rgba(200,150,60,0.08)' : 'rgba(255,255,255,0.03)',
                color: 'var(--nba-gold)',
                padding: '10px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: loadingPickOptions ? 'default' : 'pointer',
              }}
            >
              {loadingPickOptions ? 'Carregando...' : pickInsertOptions ? 'Recarregar opções' : 'Carregar opções'}
            </button>
          </div>

          {pickInsertOptions && (
            <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>

              {/* Participante + Tipo */}
              <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 md:grid-cols-2">
                <div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Participante</div>
                  <select
                    value={pickInsertParticipant}
                    onChange={(e) => { setPickInsertParticipant(e.target.value); setPickInsertTarget(''); setPickInsertWinner(''); setPickInsertResult(null) }}
                    style={{ width: '100%', background: 'rgba(12,12,18,0.6)', border: '1px solid rgba(200,150,60,0.18)', borderRadius: 8, color: 'var(--nba-text)', padding: '10px 12px', fontSize: '0.82rem' }}
                  >
                    <option value="">Selecione um participante…</option>
                    {pickInsertOptions.participants.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['game', 'series'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => { setPickInsertType(t); setPickInsertTarget(''); setPickInsertWinner(''); setPickInsertResult(null) }}
                        style={{
                          flex: 1,
                          borderRadius: 8,
                          border: `1px solid ${pickInsertType === t ? 'rgba(200,150,60,0.5)' : 'rgba(200,150,60,0.14)'}`,
                          background: pickInsertType === t ? 'rgba(200,150,60,0.12)' : 'rgba(255,255,255,0.03)',
                          color: pickInsertType === t ? 'var(--nba-gold)' : 'var(--nba-text)',
                          padding: '10px 12px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {t === 'game' ? 'Jogo' : 'Série'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Jogo/Série + Vencedor */}
              <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 md:grid-cols-2">
                <div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {pickInsertType === 'game' ? 'Jogo' : 'Série'}
                  </div>
                  <select
                    value={pickInsertTarget}
                    onChange={(e) => { setPickInsertTarget(e.target.value); setPickInsertWinner(''); setPickInsertResult(null) }}
                    style={{ width: '100%', background: 'rgba(12,12,18,0.6)', border: '1px solid rgba(200,150,60,0.18)', borderRadius: 8, color: 'var(--nba-text)', padding: '10px 12px', fontSize: '0.82rem' }}
                  >
                    <option value="">Selecione…</option>
                    {(pickInsertType === 'game' ? pickInsertOptions.games : pickInsertOptions.series).map((item) => (
                      <option key={item.id} value={item.id}>{item.matchup}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vencedor</div>
                  <select
                    value={pickInsertWinner}
                    onChange={(e) => { setPickInsertWinner(e.target.value); setPickInsertResult(null) }}
                    disabled={!selectedPickTarget}
                    style={{ width: '100%', background: 'rgba(12,12,18,0.6)', border: '1px solid rgba(200,150,60,0.18)', borderRadius: 8, color: selectedPickTarget ? 'var(--nba-text)' : 'var(--nba-text-muted)', padding: '10px 12px', fontSize: '0.82rem', cursor: selectedPickTarget ? 'pointer' : 'default' }}
                  >
                    <option value="">Selecione o vencedor…</option>
                    {selectedPickTarget && (
                      <>
                        <option value={selectedPickTarget.homeTeamId}>{selectedPickTarget.homeTeamId}</option>
                        <option value={selectedPickTarget.awayTeamId}>{selectedPickTarget.awayTeamId}</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Número de jogos (só para série) */}
              {pickInsertType === 'series' && (
                <div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nº de jogos</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[4, 5, 6, 7].map((n) => (
                      <button
                        key={n}
                        onClick={() => setPickInsertGamesCount(n)}
                        style={{
                          borderRadius: 8,
                          border: `1px solid ${pickInsertGamesCount === n ? 'rgba(200,150,60,0.5)' : 'rgba(200,150,60,0.14)'}`,
                          background: pickInsertGamesCount === n ? 'rgba(200,150,60,0.12)' : 'rgba(255,255,255,0.03)',
                          color: pickInsertGamesCount === n ? 'var(--nba-gold)' : 'var(--nba-text)',
                          padding: '10px 16px',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Resultado */}
              {pickInsertResult && (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: pickInsertResult.ok && pickInsertResult.inserted
                    ? 'rgba(46,204,113,0.10)'
                    : pickInsertResult.ok
                    ? 'rgba(200,150,60,0.10)'
                    : 'rgba(231,76,60,0.10)',
                  border: `1px solid ${pickInsertResult.ok && pickInsertResult.inserted ? 'rgba(46,204,113,0.25)' : pickInsertResult.ok ? 'rgba(200,150,60,0.25)' : 'rgba(231,76,60,0.25)'}`,
                  color: pickInsertResult.ok && pickInsertResult.inserted
                    ? 'var(--nba-success)'
                    : pickInsertResult.ok
                    ? 'var(--nba-gold)'
                    : 'var(--nba-danger)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}>
                  {pickInsertResult.message}
                </div>
              )}

              {/* Botão submeter */}
              <button
                onClick={submitPickInsert}
                disabled={pickInsertBusy || !pickInsertParticipant || !pickInsertTarget || !pickInsertWinner}
                style={{
                  borderRadius: 10,
                  border: '1px solid rgba(200,150,60,0.30)',
                  background: (!pickInsertParticipant || !pickInsertTarget || !pickInsertWinner) ? 'rgba(255,255,255,0.03)' : 'rgba(200,150,60,0.18)',
                  color: (!pickInsertParticipant || !pickInsertTarget || !pickInsertWinner) ? 'var(--nba-text-muted)' : 'var(--nba-gold)',
                  padding: '12px 18px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: (pickInsertBusy || !pickInsertParticipant || !pickInsertTarget || !pickInsertWinner) ? 'default' : 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                {pickInsertBusy ? 'Inserindo...' : 'Inserir palpite'}
              </button>
            </div>
          )}
        </section>

        <section
          style={{
            ...card,
            background: 'linear-gradient(135deg, rgba(74,144,217,0.08), rgba(200,150,60,0.08) 60%, rgba(19,19,26,1) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <SectionTitle icon={<Users size={14} />}>Cobertura de Palpites</SectionTitle>
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.78rem', lineHeight: 1.5, marginTop: -6 }}>
                Painel operacional sem revelar escolhas: quem já enviou, quem falta enviar e qual janela fecha primeiro.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => loadPickCoverage()}
                disabled={loadingPickCoverage}
                style={{
                  borderRadius: 10,
                  border: '1px solid rgba(200,150,60,0.18)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'var(--nba-text)',
                  padding: '10px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {loadingPickCoverage ? 'Atualizando...' : 'Atualizar painel'}
              </button>
              <button
                onClick={() => setShowOnlyCoveragePending((current) => !current)}
                style={{
                  borderRadius: 10,
                  border: '1px solid rgba(200,150,60,0.18)',
                  background: showOnlyCoveragePending ? 'rgba(200,150,60,0.10)' : 'rgba(255,255,255,0.03)',
                  color: showOnlyCoveragePending ? 'var(--nba-gold)' : 'var(--nba-text)',
                  padding: '10px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {showOnlyCoveragePending ? 'Mostrando só pendentes' : 'Mostrar todos'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10, marginTop: 14 }} className="grid-cols-2 md:grid-cols-4">
            {[
              { label: 'Jogos hoje', value: pickCoverage?.summary.todayGames ?? '—', tone: 'var(--nba-text)' },
              { label: 'Jogos pendentes', value: pickCoverage?.summary.todayGamesPending ?? '—', tone: 'var(--nba-gold)' },
              { label: `${roundShortLabel(pickCoverage?.summary.activeRound)} abertas`, value: pickCoverage?.summary.roundOneSeriesOpen ?? '—', tone: 'var(--nba-east)' },
              { label: `Pendentes na ${roundShortLabel(pickCoverage?.summary.activeRound)}`, value: pickCoverage?.summary.participantsPendingRoundOne ?? '—', tone: 'var(--nba-danger)' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(12,12,18,0.34)',
                  border: '1px solid rgba(200,150,60,0.14)',
                }}
              >
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>{item.label}</div>
                <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.18rem', lineHeight: 1.05 }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', marginTop: 12 }}>
            Fonte: {pickCoverage?.summary.sourceLabel ?? 'API da NBA + base local'} · último sync real em {formatTimestamp(pickCoverage?.summary.lastSyncAt ?? null)}
          </div>
        </section>

        {loadingPickCoverage ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0' }}>
            <LoadingBasketball size={28} />
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }} className="xl:grid-cols-2">
            {[
              {
                key: 'games',
                title: 'Jogos do dia',
                empty: 'Nenhum jogo aberto hoje para conferir.',
                items: filteredCoverageGames,
              },
              {
                key: 'series',
                title: `${roundShortLabel(pickCoverage?.summary.activeRound)} pronta para pick`,
                empty: `Nenhuma série de ${roundShortLabel(pickCoverage?.summary.activeRound)} aberta para fechamento agora.`,
                items: filteredCoverageSeries,
              },
            ].map((group) => (
              <section key={group.key} style={card}>
                <SectionTitle icon={group.key === 'games' ? <BellRing size={14} /> : <ShieldCheck size={14} />}>{group.title}</SectionTitle>
                {group.items.length === 0 ? (
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem' }}>{group.empty}</div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {group.items.map((item) => {
                      const tone = coverageStatusTone(item)
                      return (
                        <div
                          key={'gameId' in item ? item.gameId : item.seriesId}
                          style={{
                            padding: '14px 15px',
                            borderRadius: 12,
                            background: 'rgba(12,12,18,0.34)',
                            border: '1px solid rgba(200,150,60,0.12)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                            <div>
                              <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.98rem' }}>
                                {item.matchup}
                              </div>
                              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 4 }}>
                                {'gameNumber' in item ? `Jogo ${item.gameNumber}` : `Série da rodada ${pickCoverage?.summary.activeRound ?? 1}`} · {item.tipOffLabel}
                              </div>
                            </div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: tone, border: `1px solid ${tone}33`, background: `${tone}14`, borderRadius: 999, padding: '4px 10px', fontSize: '0.7rem', fontWeight: 800 }}>
                              {coverageStatusLabel(item)}
                            </div>
                          </div>

                          <div style={{ display: 'grid', gap: 10, marginTop: 12 }} className="md:grid-cols-2">
                            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(46,204,113,0.14)' }}>
                              <div style={{ color: 'var(--nba-success)', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6 }}>
                                Já fecharam · {item.pickedCount}
                              </div>
                              <div style={{ color: 'var(--nba-text)', fontSize: '0.76rem', lineHeight: 1.5 }}>
                                {item.pickedParticipants.length > 0 ? item.pickedParticipants.join(', ') : 'Ninguém ainda.'}
                              </div>
                            </div>
                            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(200,150,60,0.14)' }}>
                              <div style={{ color: item.missingCount > 0 ? 'var(--nba-gold)' : 'var(--nba-success)', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6 }}>
                                Ainda faltam · {item.missingCount}
                              </div>
                              <div style={{ color: 'var(--nba-text)', fontSize: '0.76rem', lineHeight: 1.5 }}>
                                {item.missingParticipants.length > 0 ? item.missingParticipants.join(', ') : 'Cobertura completa.'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
      )}
      </div>
    </>
  )
}
