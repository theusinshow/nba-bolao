import { Router } from 'express'
import { fetchESPNGameOddsSummary } from '../lib/odds'
import { fetchNBANews } from '../lib/news'
import { fetchNBAInjuries } from '../lib/injuries'
import { fetchNBAGameHighlights } from '../lib/gameHighlights'

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

router.get('/game-highlights', async (req, res) => {
  try {
    const rawGameIds = Array.isArray(req.query.gameIds)
      ? req.query.gameIds
      : Array.isArray(req.query['gameIds[]'])
      ? req.query['gameIds[]']
      : typeof req.query.gameIds === 'string'
      ? req.query.gameIds.split(',')
      : typeof req.query['gameIds[]'] === 'string'
      ? String(req.query['gameIds[]']).split(',')
      : []

    const gameIds = rawGameIds
      .map((value) => Number(String(value).trim()))
      .filter((value) => Number.isFinite(value) && value > 0)

    const result = await fetchNBAGameHighlights(gameIds)

    res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      provider: result.status,
      highlights: result.highlights,
    })
  } catch (error: unknown) {
    console.error('[analysis/game-highlights] Failed:', error)
    res.status(500).json({
      ok: false,
      error: 'Não foi possível carregar os destaques reais dos jogos.',
    })
  }
})

router.get('/insights', async (_req, res) => {
  try {
    const [oddsResult, newsResult] = await Promise.all([
      fetchESPNGameOddsSummary(),
      fetchNBANews(),
    ])

    // Map GameOddsSummaryItem → AnalysisOddsItem (spread/total not available from ESPN)
    const nullMarket = { home_line: null, home_odds: null, away_line: null, away_odds: null }
    const nullTotal = { points: null, over_odds: null, under_odds: null }
    const odds = oddsResult.odds.map((item) => ({
      ...item,
      spread: nullMarket,
      total: nullTotal,
    }))

    res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      providers: {
        odds: oddsResult.status,
        news: newsResult.status,
      },
      odds,
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
    const result = await fetchESPNGameOddsSummary()

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
