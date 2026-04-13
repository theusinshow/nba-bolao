import cron from 'node-cron'
import { supabase } from '../lib/supabase'
import { syncNBA } from '../jobs/syncNBA'

type SyncMode = 'live' | 'pregame' | 'daily' | 'idle'

interface SchedulerSnapshot {
  mode: SyncMode
  intervalMinutes: number
  reason: string
  lastSyncAt: string | null
  lastAttemptAt: string | null
  lastSuccessAt: string | null
  lastError: string | null
  isRunning: boolean
}

const LIVE_INTERVAL_MINUTES = Number(process.env.NBA_SYNC_INTERVAL_LIVE_MINUTES ?? 2)
const PREGAME_INTERVAL_MINUTES = Number(process.env.NBA_SYNC_INTERVAL_PREGAME_MINUTES ?? 5)
const DAILY_INTERVAL_MINUTES = Number(process.env.NBA_SYNC_INTERVAL_DAILY_MINUTES ?? 15)
const IDLE_INTERVAL_MINUTES = Number(process.env.NBA_SYNC_INTERVAL_IDLE_MINUTES ?? 60)

const LIVE_LOOKBACK_MINUTES = Number(process.env.NBA_SYNC_LIVE_LOOKBACK_MINUTES ?? 240)
const PREGAME_LOOKAHEAD_MINUTES = Number(process.env.NBA_SYNC_PREGAME_LOOKAHEAD_MINUTES ?? 360)
const DAILY_LOOKAHEAD_MINUTES = Number(process.env.NBA_SYNC_DAILY_LOOKAHEAD_MINUTES ?? 1440)

let isRunning = false
let lastSyncAt: Date | null = null
let lastAttemptAt: Date | null = null
let lastSuccessAt: Date | null = null
let lastError: string | null = null
let currentSnapshot: SchedulerSnapshot = {
  mode: 'idle',
  intervalMinutes: IDLE_INTERVAL_MINUTES,
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

function minutesBetween(left: Date, right: Date): number {
  return Math.abs(left.getTime() - right.getTime()) / 60000
}

async function getSchedulerDecision(now: Date): Promise<{ mode: SyncMode; intervalMinutes: number; reason: string }> {
  const windowStart = new Date(now.getTime() - LIVE_LOOKBACK_MINUTES * 60000).toISOString()
  const windowEnd = new Date(now.getTime() + DAILY_LOOKAHEAD_MINUTES * 60000).toISOString()

  const { data: games, error } = await supabase
    .from('games')
    .select('id, tip_off_at, played')
    .gte('tip_off_at', windowStart)
    .lte('tip_off_at', windowEnd)
    .order('tip_off_at', { ascending: true })

  if (error) {
    return {
      mode: 'daily',
      intervalMinutes: DAILY_INTERVAL_MINUTES,
      reason: `Falha ao ler agenda local: ${error.message}`,
    }
  }

  const datedGames = (games ?? []).filter((game) => !!game.tip_off_at)

  const liveCandidate = datedGames.find((game) => (
    !game.played &&
    game.tip_off_at &&
    new Date(game.tip_off_at).getTime() <= now.getTime() &&
    new Date(game.tip_off_at).getTime() >= now.getTime() - LIVE_LOOKBACK_MINUTES * 60000
  ))

  if (liveCandidate) {
    return {
      mode: 'live',
      intervalMinutes: LIVE_INTERVAL_MINUTES,
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
      intervalMinutes: PREGAME_INTERVAL_MINUTES,
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
      intervalMinutes: DAILY_INTERVAL_MINUTES,
      reason: 'Existe jogo da rodada nas próximas 24 horas.',
    }
  }

  return {
    mode: 'idle',
    intervalMinutes: IDLE_INTERVAL_MINUTES,
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
  const needsSync = !lastSyncAt || minutesBetween(now, lastSyncAt) >= decision.intervalMinutes

  currentSnapshot = {
    mode: decision.mode,
    intervalMinutes: decision.intervalMinutes,
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
    console.log(`[scheduler] Triggering NBA sync in mode=${decision.mode} interval=${decision.intervalMinutes}m`)
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
      intervalMinutes: decision.intervalMinutes,
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
  cron.schedule('* * * * *', () => {
    tickScheduler().catch((error) => {
      lastError = error instanceof Error ? error.message : String(error)
      console.error('[scheduler] Unexpected scheduler error:', error)
    })
  })

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
