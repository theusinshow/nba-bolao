import { Router } from 'express'
import { fetchNBAGameOdds } from '../lib/odds'
import { fetchNBAInjuries } from '../lib/injuries'

const router = Router()

router.get('/insights', async (_req, res) => {
  try {
    const [oddsResult, injuriesResult] = await Promise.all([
      fetchNBAGameOdds(),
      fetchNBAInjuries(),
    ])

    res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      providers: {
        odds: oddsResult.status,
        injuries: injuriesResult.status,
      },
      odds: oddsResult.odds,
      injuries: injuriesResult.injuries,
    })
  } catch (error: unknown) {
    console.error('[analysis/insights] Failed:', error)
    res.status(500).json({
      ok: false,
      error: 'Não foi possível carregar os insights de análise.',
    })
  }
})

export default router
