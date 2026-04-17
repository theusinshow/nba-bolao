import { randomUUID } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import type { ArtifactDescriptor } from '../lib/operationalArtifacts'
import { getRepoRoot } from '../lib/operationalArtifacts'
import { supabase } from '../lib/supabase'
import { hydrateArtifactDownloadUrls } from './operationalStorage'

export type AdminOperationName =
  | 'sync'
  | 'rescore'
  | 'backup'
  | 'verify-backup'
  | 'daily-digest'
  | 'daily-reminder'
  | 'reset-picks'
  | 'add-allowed-email'
  | 'remove-allowed-email'
  | 'toggle-admin'
  | 'remove-participant'

export type AdminOperationCategory = 'routine' | 'messaging' | 'protection' | 'access'
export type AdminOperationStatus = 'success' | 'error'

export interface AdminOperationActor {
  adminUserId: string | null
  adminParticipantId: string | null
}

export interface AdminOperationRun {
  id: string
  operation: AdminOperationName
  category: AdminOperationCategory
  status: AdminOperationStatus
  summary: string
  startedAt: string
  finishedAt: string
  durationMs: number
  targetDate: string | null
  variant: string | null
  outputDir: string | null
  actor: AdminOperationActor
  artifacts: ArtifactDescriptor[]
  metadata: Record<string, unknown>
  error: string | null
}

interface OperationLogFile {
  version: 1
  updatedAt: string
  runs: AdminOperationRun[]
}

export interface OperationSummaryEntry {
  operation: AdminOperationName
  category: AdminOperationCategory
  label: string
  lastRunAt: string | null
  lastSuccessAt: string | null
  lastError: string | null
  lastStatus: AdminOperationStatus | null
  totalRuns: number
}

export interface AdminOperationsSnapshot {
  updatedAt: string
  runs: AdminOperationRun[]
  summary: OperationSummaryEntry[]
}

const LOG_DIR = path.join(getRepoRoot(), 'backups', 'admin-operations')
const LOG_FILE = path.join(LOG_DIR, 'operations-log.json')
const MAX_RUNS = 120
const RUNS_TABLE = 'admin_operation_runs'
const ARTIFACTS_TABLE = 'admin_operation_artifacts'

const OPERATION_META: Record<AdminOperationName, { label: string; category: AdminOperationCategory }> = {
  sync: { label: 'Sincronizar dados NBA', category: 'routine' },
  rescore: { label: 'Recalcular ranking', category: 'routine' },
  backup: { label: 'Gerar backup operacional', category: 'protection' },
  'verify-backup': { label: 'Verificar backup operacional', category: 'protection' },
  'daily-digest': { label: 'Resumo do dia', category: 'messaging' },
  'daily-reminder': { label: 'Lembrete de palpites', category: 'messaging' },
  'reset-picks': { label: 'Reset pré-largada', category: 'protection' },
  'add-allowed-email': { label: 'Liberar email', category: 'access' },
  'remove-allowed-email': { label: 'Remover email liberado', category: 'access' },
  'toggle-admin': { label: 'Alterar privilégio admin', category: 'access' },
  'remove-participant': { label: 'Remover participante', category: 'access' },
}

let logWriteQueue = Promise.resolve()
let supabaseTablesAvailable: boolean | null = null

async function ensureLogFile() {
  await mkdir(LOG_DIR, { recursive: true })

  try {
    await readFile(LOG_FILE, 'utf8')
  } catch {
    const initial: OperationLogFile = {
      version: 1,
      updatedAt: new Date().toISOString(),
      runs: [],
    }
    await writeFile(LOG_FILE, JSON.stringify(initial, null, 2), 'utf8')
  }
}

async function readLogFile(): Promise<OperationLogFile> {
  await ensureLogFile()
  const raw = await readFile(LOG_FILE, 'utf8')

  try {
    const parsed = JSON.parse(raw) as Partial<OperationLogFile>
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      runs: Array.isArray(parsed.runs) ? parsed.runs as AdminOperationRun[] : [],
    }
  } catch {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      runs: [],
    }
  }
}

async function canUseSupabaseTables() {
  if (supabaseTablesAvailable != null) return supabaseTablesAvailable

  try {
    const { error } = await supabase
      .from(RUNS_TABLE)
      .select('id')
      .limit(1)

    supabaseTablesAvailable = !error
  } catch {
    supabaseTablesAvailable = false
  }

  return supabaseTablesAvailable
}

async function writeSupabaseRun(run: AdminOperationRun) {
  if (!(await canUseSupabaseTables())) return false

  const runInsert = await supabase.from(RUNS_TABLE).upsert({
    id: run.id,
    operation: run.operation,
    category: run.category,
    status: run.status,
    summary: run.summary,
    started_at: run.startedAt,
    finished_at: run.finishedAt,
    duration_ms: run.durationMs,
    target_date: run.targetDate,
    variant: run.variant,
    output_dir: run.outputDir,
    admin_user_id: run.actor.adminUserId,
    admin_participant_id: run.actor.adminParticipantId,
    metadata: run.metadata,
    error: run.error,
  })

  if (runInsert.error) {
    console.warn('[admin-operations] Supabase run persistence failed:', runInsert.error.message)
    supabaseTablesAvailable = false
    return false
  }

  if (run.artifacts.length > 0) {
    const artifactInsert = await supabase.from(ARTIFACTS_TABLE).upsert(
      run.artifacts.map((artifact) => ({
        id: `${run.id}:${artifact.key}`,
        run_id: run.id,
        artifact_key: artifact.key,
        label: artifact.label,
        local_path: artifact.path,
        kind: artifact.kind,
        size_bytes: artifact.sizeBytes,
        checksum_sha256: artifact.checksumSha256,
        storage_bucket: artifact.storageBucket ?? null,
        storage_path: artifact.storagePath ?? null,
        storage_status: artifact.storageStatus ?? null,
        storage_error: artifact.storageError ?? null,
      })),
      { onConflict: 'id' }
    )

    if (artifactInsert.error) {
      console.warn('[admin-operations] Supabase artifact persistence failed:', artifactInsert.error.message)
      supabaseTablesAvailable = false
      return false
    }
  }

  return true
}

async function readSupabaseRuns(limit: number): Promise<AdminOperationRun[]> {
  if (!(await canUseSupabaseTables())) return []

  const { data: runs, error } = await supabase
    .from(RUNS_TABLE)
    .select('*')
    .order('finished_at', { ascending: false })
    .limit(limit)

  if (error || !runs) {
    if (error) {
      console.warn('[admin-operations] Supabase run read failed:', error.message)
      supabaseTablesAvailable = false
    }
    return []
  }

  const runIds = runs.map((run) => String(run.id))
  const { data: artifacts, error: artifactsError } = runIds.length === 0
    ? { data: [], error: null }
    : await supabase
        .from(ARTIFACTS_TABLE)
        .select('*')
        .in('run_id', runIds)

  if (artifactsError) {
    console.warn('[admin-operations] Supabase artifact read failed:', artifactsError.message)
    supabaseTablesAvailable = false
    return []
  }

  const artifactsByRunId = new Map<string, ArtifactDescriptor[]>()
  for (const row of artifacts ?? []) {
    const runArtifacts = artifactsByRunId.get(String(row.run_id)) ?? []
    runArtifacts.push({
      key: String(row.artifact_key),
      label: String(row.label),
      path: String(row.local_path),
      kind: row.kind as ArtifactDescriptor['kind'],
      sizeBytes: Number(row.size_bytes ?? 0),
      checksumSha256: String(row.checksum_sha256),
      storageBucket: row.storage_bucket ? String(row.storage_bucket) : null,
      storagePath: row.storage_path ? String(row.storage_path) : null,
      storageStatus: row.storage_status as ArtifactDescriptor['storageStatus'] ?? undefined,
      storageError: row.storage_error ? String(row.storage_error) : null,
      downloadUrl: null,
    })
    artifactsByRunId.set(String(row.run_id), runArtifacts)
  }

  return Promise.all((runs ?? []).map(async (row) => ({
    id: String(row.id),
    operation: row.operation as AdminOperationName,
    category: row.category as AdminOperationCategory,
    status: row.status as AdminOperationStatus,
    summary: String(row.summary),
    startedAt: String(row.started_at),
    finishedAt: String(row.finished_at),
    durationMs: Number(row.duration_ms ?? 0),
    targetDate: row.target_date ? String(row.target_date) : null,
    variant: row.variant ? String(row.variant) : null,
    outputDir: row.output_dir ? String(row.output_dir) : null,
    actor: {
      adminUserId: row.admin_user_id ? String(row.admin_user_id) : null,
      adminParticipantId: row.admin_participant_id ? String(row.admin_participant_id) : null,
    },
    artifacts: await hydrateArtifactDownloadUrls(artifactsByRunId.get(String(row.id)) ?? []),
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    error: row.error ? String(row.error) : null,
  })))
}

function buildSummary(runs: AdminOperationRun[]): OperationSummaryEntry[] {
  return Object.entries(OPERATION_META).map(([operation, meta]) => {
    const operationRuns = runs.filter((run) => run.operation === operation)
    const lastRun = operationRuns[0] ?? null
    const lastSuccess = operationRuns.find((run) => run.status === 'success') ?? null
    const lastError = operationRuns.find((run) => run.status === 'error') ?? null

    return {
      operation: operation as AdminOperationName,
      category: meta.category,
      label: meta.label,
      lastRunAt: lastRun?.finishedAt ?? null,
      lastSuccessAt: lastSuccess?.finishedAt ?? null,
      lastError: lastError?.error ?? null,
      lastStatus: lastRun?.status ?? null,
      totalRuns: operationRuns.length,
    }
  })
}

export async function listAdminOperationRuns(limit = 24): Promise<AdminOperationsSnapshot> {
  const [file, supabaseRuns] = await Promise.all([
    readLogFile(),
    readSupabaseRuns(limit),
  ])
  const mergedRuns = [...supabaseRuns, ...file.runs]
  const dedupedRuns = Array.from(
    new Map(mergedRuns.map((run) => [run.id, run])).values()
  )
  const runs = dedupedRuns.sort((left, right) => right.finishedAt.localeCompare(left.finishedAt))

  return {
    updatedAt: supabaseRuns.length > 0 ? new Date().toISOString() : file.updatedAt,
    runs: runs.slice(0, limit),
    summary: buildSummary(runs),
  }
}

export interface RecordAdminOperationInput {
  operation: AdminOperationName
  status: AdminOperationStatus
  summary: string
  startedAt: string
  finishedAt: string
  actor?: Partial<AdminOperationActor>
  targetDate?: string | null
  variant?: string | null
  outputDir?: string | null
  artifacts?: ArtifactDescriptor[]
  metadata?: Record<string, unknown>
  error?: string | null
}

export async function recordAdminOperation(input: RecordAdminOperationInput): Promise<AdminOperationRun> {
  const meta = OPERATION_META[input.operation]
  const run: AdminOperationRun = {
    id: randomUUID(),
    operation: input.operation,
    category: meta.category,
    status: input.status,
    summary: input.summary,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    durationMs: Math.max(0, new Date(input.finishedAt).getTime() - new Date(input.startedAt).getTime()),
    targetDate: input.targetDate ?? null,
    variant: input.variant ?? null,
    outputDir: input.outputDir ?? null,
    actor: {
      adminUserId: input.actor?.adminUserId ?? null,
      adminParticipantId: input.actor?.adminParticipantId ?? null,
    },
    artifacts: input.artifacts ?? [],
    metadata: input.metadata ?? {},
    error: input.error ?? null,
  }

  await (logWriteQueue = logWriteQueue.then(async () => {
    const current = await readLogFile()
    const next: OperationLogFile = {
      version: 1,
      updatedAt: new Date().toISOString(),
      runs: [run, ...current.runs].slice(0, MAX_RUNS),
    }
    await writeFile(LOG_FILE, JSON.stringify(next, null, 2), 'utf8')
  }))

  await writeSupabaseRun(run)

  return run
}

export function getAdminOperationMeta(operation: AdminOperationName) {
  return OPERATION_META[operation]
}
