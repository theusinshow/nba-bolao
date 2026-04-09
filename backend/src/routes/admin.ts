import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { syncNBA } from '../jobs/syncNBA'
import { recalculateAllScores } from '../scoring/engine'
import { supabase } from '../lib/supabase'
import { SERIES_SEED } from './seedData'

const router = Router()

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ ok: false, error: 'Missing bearer token' })
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)

  if (userError || !user) {
    return res.status(401).json({ ok: false, error: 'Invalid session' })
  }

  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (participantError || !participant?.is_admin) {
    return res.status(403).json({ ok: false, error: 'Admin access required' })
  }

  next()
}

router.use(requireAdmin)

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
