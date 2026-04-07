import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import adminRouter from './routes/admin'
import { syncNBA } from './jobs/syncNBA'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

app.use(cors())
app.use(express.json())

app.use('/admin', adminRouter)

app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() })
})

// Sync every 15 minutes between 21:00–04:00 UTC (covers NBA game times)
// Cron: at minute 0, 15, 30, 45 during hours 21-23 and 0-4
cron.schedule('*/15 21-23,0-4 * * *', () => {
  console.log('[cron] Triggered NBA sync')
  syncNBA().catch(console.error)
})

app.listen(PORT, () => {
  console.log(`[server] Bolão NBA backend running on port ${PORT}`)
})
