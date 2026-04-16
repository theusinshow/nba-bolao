import { Router } from 'express'
import { fetchNBAGameOdds, fetchNBAGameOddsSummary } from '../lib/odds'
import { fetchNBANews } from '../lib/news'
import { fetchNBAInjuries } from '../lib/injuries'

const router = Router()

router.get('/injuries', async (_req, res) => {
  try {
    const result = await fetchNBAInjuries()
    res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      provider: result.status,
      injuries: result.injuries,
    })
  } catch (error: unknown) {
    console.error('[analysis/injuries] Failed:', error)
    res.status(500).json({
      ok: false,
      error: 'Não foi possível carregar o relatório de lesões.',
    })
  }
})

router.get('/insights', async (_req, res) => {
  try {
    const [oddsResult, newsResult] = await Promise.all([
      fetchNBAGameOdds(),
      fetchNBANews(),
    ])

    res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      providers: {
        odds: oddsResult.status,
        news: newsResult.status,
      },
      odds: oddsResult.odds,
      news: newsResult.news,
    })
  } catch (error: unknown) {
    console.error('[analysis/insights] Failed:', error)
    res.status(500).json({
      ok: false,
      error: 'Não foi possível carregar os insights de análise.',
    })
  }
})

router.get('/odds-summary', async (_req, res) => {
  try {
    const result = await fetchNBAGameOddsSummary()

    res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      provider: result.status,
      odds: result.odds,
    })
  } catch (error: unknown) {
    console.error('[analysis/odds-summary] Failed:', error)
    res.status(500).json({
      ok: false,
      error: 'Não foi possível carregar o resumo de odds.',
    })
  }
})

export default router
