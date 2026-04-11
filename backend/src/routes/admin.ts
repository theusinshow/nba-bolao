import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { syncNBA } from '../jobs/syncNBA'
import { recalculateAllScores } from '../scoring/engine'
import { supabase } from '../lib/supabase'
import { SERIES_SEED } from './seedData'
import { removeParticipantCompletely } from '../admin/removeParticipant'

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
  try {
    await syncNBA()
    res.json({ ok: true, message: 'Sync completed successfully' })
  } catch (err: unknown) {
    console.error('[admin/sync] Sync failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/rescore — recalculate scores only
router.post('/rescore', async (_req, res) => {
  try {
    await recalculateAllScores()
    res.json({ ok: true, message: 'Rescoring completed successfully' })
  } catch (err: unknown) {
    console.error('[admin/rescore] Rescore failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/seed — seed series data for 2025 playoffs
router.post('/seed', async (_req, res) => {
  try {
    for (const s of SERIES_SEED) {
      const { data: existing } = await supabase
        .from('series')
        .select('id')
        .eq('id', s.id)
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

// POST /admin/participants/remove — fully remove one participant and related data
router.post('/participants/remove', async (req, res) => {
  try {
    const participantId = typeof req.body?.participantId === 'string' ? req.body.participantId.trim() : ''
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : ''

    const provided = [participantId, email, userId].filter(Boolean)
    if (provided.length !== 1) {
      return res.status(400).json({
        ok: false,
        error: 'Provide exactly one identifier: participantId, email, or userId.',
      })
    }

    const result = participantId
      ? await removeParticipantCompletely({ participantId })
      : email
      ? await removeParticipantCompletely({ email })
      : await removeParticipantCompletely({ userId })

    res.json({
      ok: true,
      message: `Participant ${result.participant.name} removed completely from the bolao.`,
      result,
    })
  } catch (err: unknown) {
    console.error('[admin/participants/remove] Removal failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

export default router
