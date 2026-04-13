import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import adminRouter from './routes/admin'
import analysisRouter from './routes/analysis'
import { getNBASyncSchedulerSnapshot, startNBASyncScheduler } from './scheduler/nbaSyncScheduler'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
}))
app.use(express.json())

app.use('/admin', adminRouter)
app.use('/analysis', analysisRouter)

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    scheduler: getNBASyncSchedulerSnapshot(),
  })
})

startNBASyncScheduler()

app.listen(PORT, () => {
  console.log(`[server] Bolão NBA backend running on port ${PORT}`)
})
