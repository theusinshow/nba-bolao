import { Router } from 'express'
import { syncNBA } from '../jobs/syncNBA'
import { recalculateAllScores } from '../scoring/engine'
import { supabase } from '../lib/supabase'
import { SERIES_SEED } from './seedData'

const router = Router()

// POST /admin/sync — trigger manual NBA sync
router.post('/sync', async (_req, res) => {
  res.json({ ok: true, message: 'Sync started' })
  syncNBA().catch(console.error)
})

// POST /admin/rescore — recalculate scores only
router.post('/rescore', async (_req, res) => {
  res.json({ ok: true, message: 'Rescoring started' })
  recalculateAllScores().catch(console.error)
})

// POST /admin/seed — seed series data for 2025 playoffs
router.post('/seed', async (_req, res) => {
  try {
    for (const s of SERIES_SEED) {
      const { data: existing } = await supabase
        .from('series')
        .select('id')
        .eq('slot', s.slot)
        .single()

      if (existing) {
        await supabase.from('series').update(s).eq('id', existing.id)
      } else {
        await supabase.from('series').insert(s)
      }
    }
    res.json({ ok: true, message: `Seeded ${SERIES_SEED.length} series` })
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// GET /admin/health
router.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() })
})

export default router
