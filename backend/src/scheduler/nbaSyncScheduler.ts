import { supabase } from '../lib/supabase'
import { syncNBA } from '../jobs/syncNBA'

type SyncMode = 'clutch' | 'live' | 'pregame' | 'daily' | 'idle'

interface SchedulerSnapshot {
  mode: SyncMode
  intervalSeconds: number
  intervalMinutes: number
  reason: string
  lastSyncAt: string | null
  lastAttemptAt: string | null
  lastSuccessAt: string | null
  lastError: string | null
  isRunning: boolean
}

const CLUTCH_INTERVAL_SECONDS = Number(process.env.NBA_SYNC_INTERVAL_CLUTCH_SECONDS ?? 15)
const LIVE_INTERVAL_SECONDS = Number(process.env.NBA_SYNC_INTERVAL_LIVE_SECONDS ?? Number(process.env.NBA_SYNC_INTERVAL_LIVE_MINUTES ?? 1) * 60)
const PREGAME_INTERVAL_SECONDS = Number(process.env.NBA_SYNC_INTERVAL_PREGAME_SECONDS ?? Number(process.env.NBA_SYNC_INTERVAL_PREGAME_MINUTES ?? 5) * 60)
const DAILY_INTERVAL_SECONDS = Number(process.env.NBA_SYNC_INTERVAL_DAILY_SECONDS ?? Number(process.env.NBA_SYNC_INTERVAL_DAILY_MINUTES ?? 15) * 60)
const IDLE_INTERVAL_SECONDS = Number(process.env.NBA_SYNC_INTERVAL_IDLE_SECONDS ?? Number(process.env.NBA_SYNC_INTERVAL_IDLE_MINUTES ?? 60) * 60)

const LIVE_LOOKBACK_MINUTES = Number(process.env.NBA_SYNC_LIVE_LOOKBACK_MINUTES ?? 240)
const PREGAME_LOOKAHEAD_MINUTES = Number(process.env.NBA_SYNC_PREGAME_LOOKAHEAD_MINUTES ?? 360)
const DAILY_LOOKAHEAD_MINUTES = Number(process.env.NBA_SYNC_DAILY_LOOKAHEAD_MINUTES ?? 1440)
const CLUTCH_CLOCK_THRESHOLD_SECONDS = Number(process.env.NBA_SYNC_CLUTCH_CLOCK_THRESHOLD_SECONDS ?? 300)
const SCHEDULER_HEARTBEAT_SECONDS = Number(process.env.NBA_SYNC_SCHEDULER_HEARTBEAT_SECONDS ?? 15)

interface SchedulerGameRow {
  id: string
  tip_off_at: string | null
  played: boolean
  game_state?: 'scheduled' | 'live' | 'halftime' | 'final' | null
  current_period?: number | null
  clock?: string | null
}

let isRunning = false
let lastSyncAt: Date | null = null
let lastAttemptAt: Date | null = null
let lastSuccessAt: Date | null = null
let lastError: string | null = null
let schedulerTimer: NodeJS.Timeout | null = null
let currentSnapshot: SchedulerSnapshot = {
  mode: 'idle',
  intervalSeconds: IDLE_INTERVAL_SECONDS,
  intervalMinutes: Math.max(1, Math.ceil(IDLE_INTERVAL_SECONDS / 60)),
  reason: 'Scheduler ainda não avaliou a agenda.',
  lastSyncAt: null,
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastError: null,
  isRunning: false,
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

function secondsBetween(left: Date, right: Date): number {
  return Math.abs(left.getTime() - right.getTime()) / 1000
}

function toIntervalMinutes(intervalSeconds: number): number {
  return Math.max(1, Math.ceil(intervalSeconds / 60))
}

function parseClockToSeconds(clock: string | null | undefined): number | null {
  if (!clock) return null
  const match = clock.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return (Number(match[1]) * 60) + Number(match[2])
}

function isClutchCandidate(game: SchedulerGameRow): boolean {
  if (game.played) return false
  if (game.game_state !== 'live') return false

  const period = game.current_period ?? null
  if (!period || period < 4) return false
  if (period > 4) return true

  const clockSeconds = parseClockToSeconds(game.clock)
  if (clockSeconds == null) return false
  return clockSeconds <= CLUTCH_CLOCK_THRESHOLD_SECONDS
}

async function loadSchedulerGames(windowStart: string, windowEnd: string): Promise<{ games: SchedulerGameRow[]; error: string | null }> {
  const primarySelect = 'id, tip_off_at, played, game_state, current_period, clock'
  const fallbackSelect = 'id, tip_off_at, played'

  const primaryResult = await supabase
    .from('games')
    .select(primarySelect)
    .gte('tip_off_at', windowStart)
    .lte('tip_off_at', windowEnd)
    .order('tip_off_at', { ascending: true })

  if (!primaryResult.error) {
    return { games: (primaryResult.data ?? []) as SchedulerGameRow[], error: null }
  }

  const fallbackResult = await supabase
    .from('games')
    .select(fallbackSelect)
    .gte('tip_off_at', windowStart)
    .lte('tip_off_at', windowEnd)
    .order('tip_off_at', { ascending: true })

  if (fallbackResult.error) {
    return { games: [], error: fallbackResult.error.message }
  }

  return { games: (fallbackResult.data ?? []) as SchedulerGameRow[], error: null }
}

async function getSchedulerDecision(now: Date): Promise<{ mode: SyncMode; intervalSeconds: number; reason: string }> {
  const windowStart = new Date(now.getTime() - LIVE_LOOKBACK_MINUTES * 60000).toISOString()
  const windowEnd = new Date(now.getTime() + DAILY_LOOKAHEAD_MINUTES * 60000).toISOString()

  const { games, error } = await loadSchedulerGames(windowStart, windowEnd)

  if (error) {
    return {
      mode: 'daily',
      intervalSeconds: DAILY_INTERVAL_SECONDS,
      reason: `Falha ao ler agenda local: ${error}`,
    }
  }

  const datedGames = (games ?? []).filter((game) => !!game.tip_off_at)
  const clutchCandidate = datedGames.find((game) => isClutchCandidate(game))

  if (clutchCandidate) {
    return {
      mode: 'clutch',
      intervalSeconds: CLUTCH_INTERVAL_SECONDS,
      reason: 'Existe jogo em reta final ou overtime; acelerando para capturar o resultado final mais rápido.',
    }
  }

  const liveCandidate = datedGames.find((game) => (
    !game.played &&
    game.tip_off_at &&
    new Date(game.tip_off_at).getTime() <= now.getTime() &&
    new Date(game.tip_off_at).getTime() >= now.getTime() - LIVE_LOOKBACK_MINUTES * 60000
  ))

  if (liveCandidate) {
    return {
      mode: 'live',
      intervalSeconds: LIVE_INTERVAL_SECONDS,
      reason: 'Existe jogo já iniciado e ainda não finalizado no banco.',
    }
  }

  const pregameCandidate = datedGames.find((game) => (
    !game.played &&
    game.tip_off_at &&
    new Date(game.tip_off_at).getTime() > now.getTime() &&
    new Date(game.tip_off_at).getTime() <= now.getTime() + PREGAME_LOOKAHEAD_MINUTES * 60000
  ))

  if (pregameCandidate) {
    return {
      mode: 'pregame',
      intervalSeconds: PREGAME_INTERVAL_SECONDS,
      reason: 'Existe jogo próximo dentro da janela pregame.',
    }
  }

  const dailyCandidate = datedGames.find((game) => (
    game.tip_off_at &&
    new Date(game.tip_off_at).getTime() > now.getTime() &&
    new Date(game.tip_off_at).getTime() <= now.getTime() + DAILY_LOOKAHEAD_MINUTES * 60000
  ))

  if (dailyCandidate) {
    return {
      mode: 'daily',
      intervalSeconds: DAILY_INTERVAL_SECONDS,
      reason: 'Existe jogo da rodada nas próximas 24 horas.',
    }
  }

  return {
    mode: 'idle',
    intervalSeconds: IDLE_INTERVAL_SECONDS,
    reason: 'Sem jogo próximo na agenda local; mantendo cadência leve.',
  }
}

async function tickScheduler() {
  const now = new Date()
  lastAttemptAt = now

  if (isRunning) {
    currentSnapshot = {
      ...currentSnapshot,
      lastAttemptAt: toIso(lastAttemptAt),
      isRunning: true,
      reason: 'Sync anterior ainda em execução; novo ciclo ignorado.',
    }
    return
  }

  const decision = await getSchedulerDecision(now)
  const needsSync = !lastSyncAt || secondsBetween(now, lastSyncAt) >= decision.intervalSeconds

  currentSnapshot = {
    mode: decision.mode,
    intervalSeconds: decision.intervalSeconds,
    intervalMinutes: toIntervalMinutes(decision.intervalSeconds),
    reason: decision.reason,
    lastSyncAt: toIso(lastSyncAt),
    lastAttemptAt: toIso(lastAttemptAt),
    lastSuccessAt: toIso(lastSuccessAt),
    lastError,
    isRunning,
  }

  if (!needsSync) return

  isRunning = true
  currentSnapshot = {
    ...currentSnapshot,
    isRunning: true,
  }

  try {
    console.log(`[scheduler] Triggering NBA sync in mode=${decision.mode} interval=${decision.intervalSeconds}s`)
    await syncNBA()
    lastSyncAt = new Date()
    lastSuccessAt = lastSyncAt
    lastError = null
  } catch (error: unknown) {
    lastError = error instanceof Error ? error.message : String(error)
    console.error('[scheduler] Sync failed:', error)
  } finally {
    isRunning = false
    currentSnapshot = {
      mode: decision.mode,
      intervalSeconds: decision.intervalSeconds,
      intervalMinutes: toIntervalMinutes(decision.intervalSeconds),
      reason: decision.reason,
      lastSyncAt: toIso(lastSyncAt),
      lastAttemptAt: toIso(lastAttemptAt),
      lastSuccessAt: toIso(lastSuccessAt),
      lastError,
      isRunning: false,
    }
  }
}

export function startNBASyncScheduler() {
  if (schedulerTimer) return

  schedulerTimer = setInterval(() => {
    tickScheduler().catch((error) => {
      lastError = error instanceof Error ? error.message : String(error)
      console.error('[scheduler] Unexpected scheduler error:', error)
    })
  }, SCHEDULER_HEARTBEAT_SECONDS * 1000)

  if (typeof schedulerTimer.unref === 'function') {
    schedulerTimer.unref()
  }

  tickScheduler().catch((error) => {
    lastError = error instanceof Error ? error.message : String(error)
    console.error('[scheduler] Initial scheduler error:', error)
  })
}

export function getNBASyncSchedulerSnapshot(): SchedulerSnapshot {
  return {
    ...currentSnapshot,
    lastSyncAt: toIso(lastSyncAt),
    lastAttemptAt: toIso(lastAttemptAt),
    lastSuccessAt: toIso(lastSuccessAt),
    lastError,
    isRunning,
  }
}
