import cron from 'node-cron'
import { exportDailyPicksDigest } from '../digest/exportDailyPicksDigest'
import { BRT_TIMEZONE } from '../lib/constants'

interface DailyDigestSchedulerSnapshot {
  cron: string
  timezone: string
  lastRunAt: string | null
  lastSuccessAt: string | null
  lastOutputDir: string | null
  lastError: string | null
  isRunning: boolean
}

const DIGEST_CRON = process.env.DAILY_DIGEST_CRON ?? '5 9 * * *'
const DIGEST_TIMEZONE = process.env.DAILY_DIGEST_TIMEZONE ?? BRT_TIMEZONE

let lastRunAt: Date | null = null
let lastSuccessAt: Date | null = null
let lastOutputDir: string | null = null
let lastError: string | null = null
let isRunning = false

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

async function runDailyDigest() {
  if (isRunning) {
    return
  }

  isRunning = true
  lastRunAt = new Date()

  try {
    const result = await exportDailyPicksDigest()
    lastSuccessAt = new Date()
    lastOutputDir = result.outputDir
    lastError = null
    console.log(`[daily-digest] Resumo diário gerado em ${result.outputDir}`)
  } catch (error: unknown) {
    lastError = error instanceof Error ? error.message : String(error)
    console.error('[daily-digest] Falha ao gerar resumo diário:', error)
  } finally {
    isRunning = false
  }
}

export function startDailyDigestScheduler() {
  if (!cron.validate(DIGEST_CRON)) {
    lastError = `Expressão DAILY_DIGEST_CRON inválida: ${DIGEST_CRON}`
    console.error(`[daily-digest] ${lastError}`)
    return
  }

  cron.schedule(
    DIGEST_CRON,
    () => {
      runDailyDigest().catch((error) => {
        lastError = error instanceof Error ? error.message : String(error)
        console.error('[daily-digest] Erro inesperado no scheduler:', error)
      })
    },
    {
      timezone: DIGEST_TIMEZONE,
    }
  )

  console.log(`[daily-digest] Scheduler ativo com cron "${DIGEST_CRON}" em ${DIGEST_TIMEZONE}`)
}

export function getDailyDigestSchedulerSnapshot(): DailyDigestSchedulerSnapshot {
  return {
    cron: DIGEST_CRON,
    timezone: DIGEST_TIMEZONE,
    lastRunAt: toIso(lastRunAt),
    lastSuccessAt: toIso(lastSuccessAt),
    lastOutputDir,
    lastError,
    isRunning,
  }
}
