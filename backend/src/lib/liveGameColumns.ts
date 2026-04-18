import { supabase } from './supabase'

const LIVE_GAME_COLUMNS = ['game_state', 'status_text', 'current_period', 'clock'] as const
const CACHE_TTL_MS = 5 * 60 * 1000

type LiveGameColumnName = (typeof LIVE_GAME_COLUMNS)[number]

interface LiveGameColumnsSnapshot {
  ready: boolean
  available: LiveGameColumnName[]
  missing: LiveGameColumnName[]
  checkedAt: string
  migrationPath: string
  message: string
}

let cachedSnapshot: LiveGameColumnsSnapshot | null = null
let cacheExpiresAt = 0

function buildSnapshot(available: LiveGameColumnName[], missing: LiveGameColumnName[]): LiveGameColumnsSnapshot {
  const ready = missing.length === 0
  return {
    ready,
    available,
    missing,
    checkedAt: new Date().toISOString(),
    migrationPath: 'supabase/live-game-status.sql',
    message: ready
      ? 'Banco pronto para status ao vivo, período e relógio.'
      : `Faltam colunas live em games: ${missing.join(', ')}.`,
  }
}

async function hasColumn(column: LiveGameColumnName): Promise<boolean> {
  const { error } = await supabase
    .from('games')
    .select(`id, ${column}`)
    .limit(1)

  if (!error) return true

  const normalizedMessage = error.message.toLowerCase()
  if (normalizedMessage.includes(`column games.${column} does not exist`)) {
    return false
  }

  throw new Error(`Falha ao validar coluna ${column}: ${error.message}`)
}

export async function getLiveGameColumnsSnapshot(forceRefresh = false): Promise<LiveGameColumnsSnapshot> {
  if (!forceRefresh && cachedSnapshot && Date.now() < cacheExpiresAt) {
    return cachedSnapshot
  }

  const checks = await Promise.all(LIVE_GAME_COLUMNS.map(async (column) => ({
    column,
    available: await hasColumn(column),
  })))

  const available = checks.filter((item) => item.available).map((item) => item.column)
  const missing = checks.filter((item) => !item.available).map((item) => item.column)
  const snapshot = buildSnapshot(available, missing)

  cachedSnapshot = snapshot
  cacheExpiresAt = Date.now() + CACHE_TTL_MS

  return snapshot
}
