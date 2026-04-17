import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import adminRouter from './routes/admin'
import analysisRouter from './routes/analysis'
import gamesRouter from './routes/games'
import seriesContextRouter from './routes/seriesContext'
import { getNBASyncSchedulerSnapshot, startNBASyncScheduler } from './scheduler/nbaSyncScheduler'
import { getDailyDigestSchedulerSnapshot, startDailyDigestScheduler } from './scheduler/dailyDigestScheduler'
import { SCORING } from './scoring/rules'

// Validação de variáveis de ambiente obrigatórias — encerra o processo com mensagem clara
const REQUIRED_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'] as const
const missingVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v])
if (missingVars.length > 0) {
  console.error(`[startup] Missing required environment variables: ${missingVars.join(', ')}`)
  console.error('[startup] Set them in .env or in the deployment environment before starting.')
  process.exit(1)
}

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
}))
app.use(express.json())

app.use('/admin', adminRouter)
app.use('/analysis', analysisRouter)
app.use('/games', gamesRouter)
app.use('/api/series-context', seriesContextRouter)

// Public endpoint — no auth required.
// Serves the canonical scoring config from backend/src/scoring/rules.ts so the
// frontend and any tooling can validate they are in sync with this source of truth.
app.get('/scoring-rules', (_req, res) => {
  res.json({ ok: true, scoring: SCORING })
})

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    scheduler: {
      nbaSync: getNBASyncSchedulerSnapshot(),
      dailyDigest: getDailyDigestSchedulerSnapshot(),
    },
  })
})

startNBASyncScheduler()
startDailyDigestScheduler()

app.listen(PORT, () => {
  console.log(`[server] Bolão NBA backend running on port ${PORT}`)
})
