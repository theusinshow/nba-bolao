import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { syncNBA } from '../jobs/syncNBA'
import { recalculateAllScores } from '../scoring/engine'
import { supabase } from '../lib/supabase'
import { removeParticipantCompletely } from '../admin/removeParticipant'
import { exportOperationalSnapshot } from '../backup/exportOperationalSnapshot'
import { exportDailyPicksDigest } from '../digest/exportDailyPicksDigest'
import { exportDailyReminder } from '../digest/exportDailyReminder'
import { restoreRows } from '../lib/rollback'

const router = Router()

interface AllowedEmailRow {
  email: string
}

interface ParticipantRow {
  id: string
  user_id: string
  name: string
  email: string
  is_admin: boolean | null
}

interface PickRow {
  id: string
  participant_id: string
}

interface AdminRequest extends Request {
  adminUserId?: string
  adminParticipantId?: string
}

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
    .select('id, is_admin')
    .eq('user_id', user.id)
    .single()

  if (participantError || !participant?.is_admin) {
    return res.status(403).json({ ok: false, error: 'Admin access required' })
  }

  ;(req as AdminRequest).adminUserId = user.id
  ;(req as AdminRequest).adminParticipantId = participant.id
  next()
}

function countDuplicateValues(values: string[]): number {
  const counts = new Map<string, number>()

  for (const value of values) {
    const normalized = value.trim().toLocaleLowerCase('pt-BR')
    if (!normalized) continue
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  }

  // Soma as entradas extras (count - 1) por grupo — ex: "João" aparecendo 3x = 2 duplicatas
  return Array.from(counts.values()).reduce((sum, count) => sum + Math.max(0, count - 1), 0)
}

async function buildAdminOverview() {
  const [
    { data: participants, error: participantsError },
    { data: allowedEmails, error: allowedEmailsError },
    { data: seriesPicks, error: seriesPicksError },
    { data: gamePicks, error: gamePicksError },
    { data: simulationSeriesPicks, error: simulationSeriesPicksError },
    { data: simulationGamePicks, error: simulationGamePicksError },
    { data: series, error: seriesError },
    { data: games, error: gamesError },
  ] = await Promise.all([
    supabase.from('participants').select('id, user_id, name, email, is_admin'),
    supabase.from('allowed_emails').select('email'),
    supabase.from('series_picks').select('id, participant_id'),
    supabase.from('game_picks').select('id, participant_id'),
    supabase.from('simulation_series_picks').select('id, participant_id'),
    supabase.from('simulation_game_picks').select('id, participant_id'),
    supabase.from('series').select('id, is_complete'),
    supabase.from('games').select('id, played'),
  ])

  const fetchError =
    participantsError ??
    allowedEmailsError ??
    seriesPicksError ??
    gamePicksError ??
    simulationSeriesPicksError ??
    simulationGamePicksError ??
    seriesError ??
    gamesError

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  const participantRows = (participants ?? []) as ParticipantRow[]
  const allowedEmailRows = (allowedEmails ?? []) as AllowedEmailRow[]
  const seriesPickRows = (seriesPicks ?? []) as PickRow[]
  const gamePickRows = (gamePicks ?? []) as PickRow[]
  const simulationSeriesPickRows = (simulationSeriesPicks ?? []) as PickRow[]
  const simulationGamePickRows = (simulationGamePicks ?? []) as PickRow[]
  const participantIds = new Set(participantRows.map((participant) => participant.id))
  const participantEmails = new Set(participantRows.map((participant) => participant.email.toLocaleLowerCase('pt-BR')))
  const allowedEmailSet = new Set(allowedEmailRows.map((row) => row.email.toLocaleLowerCase('pt-BR')))

  const participantsWithoutAccess = participantRows.filter(
    (participant) => !allowedEmailSet.has(participant.email.toLocaleLowerCase('pt-BR'))
  )
  const allowedWithoutParticipant = allowedEmailRows.filter(
    (row) => !participantEmails.has(row.email.toLocaleLowerCase('pt-BR'))
  )

  return {
    stats: {
      participants: participantRows.length,
      admins: participantRows.filter((participant) => participant.is_admin).length,
      allowed_emails: allowedEmailRows.length,
      series_picks: seriesPickRows.length,
      game_picks: gamePickRows.length,
      simulation_series_picks: simulationSeriesPickRows.length,
      simulation_game_picks: simulationGamePickRows.length,
      series_total: (series ?? []).length,
      series_completed: ((series ?? []) as Array<{ is_complete: boolean }>).filter((item) => item.is_complete).length,
      games_total: (games ?? []).length,
      games_played: ((games ?? []) as Array<{ played: boolean }>).filter((item) => item.played).length,
      mode: process.env.APP_MODE ?? process.env.BOLAO_MODE ?? 'ficticio',
    },
    inconsistencies: {
      duplicate_names: countDuplicateValues(participantRows.map((participant) => participant.name)),
      duplicate_emails: countDuplicateValues(participantRows.map((participant) => participant.email)),
      participants_without_access: participantsWithoutAccess.length,
      allowed_without_participant: allowedWithoutParticipant.length,
      orphaned_series_picks: seriesPickRows.filter((pick) => !participantIds.has(pick.participant_id)).length,
      orphaned_game_picks: gamePickRows.filter((pick) => !participantIds.has(pick.participant_id)).length,
    },
    details: {
      participants_without_access: participantsWithoutAccess.map((participant) => ({
        id: participant.id,
        name: participant.name,
        email: participant.email,
      })),
      allowed_without_participant: allowedWithoutParticipant.map((row) => row.email),
    },
  }
}

async function deleteAllRows(table: string): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .delete()
    .not('id', 'is', null)
    .select('id')

  if (error) {
    throw new Error(`Failed deleting ${table}: ${error.message}`)
  }

  return (data ?? []).length
}

async function snapshotTable(table: 'series_picks' | 'game_picks' | 'simulation_series_picks' | 'simulation_game_picks') {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw new Error(`Failed snapshotting ${table}: ${error.message}`)
  return (data ?? []) as Record<string, unknown>[]
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

// GET /admin/health
router.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() })
})

// GET /admin/overview
router.get('/overview', async (_req, res) => {
  try {
    const overview = await buildAdminOverview()
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      overview,
    })
  } catch (err: unknown) {
    console.error('[admin/overview] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// GET /admin/allowed-emails
router.get('/allowed-emails', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('allowed_emails')
      .select('email')
      .order('email', { ascending: true })

    if (error) {
      return res.status(500).json({ ok: false, error: error.message })
    }

    res.json({ ok: true, emails: (data ?? []) as AllowedEmailRow[] })
  } catch (err: unknown) {
    console.error('[admin/allowed-emails] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/backup — generate operational backup snapshot
router.post('/backup', async (_req, res) => {
  try {
    const result = await exportOperationalSnapshot()
    res.json({
      ok: true,
      message: 'Operational backup generated successfully',
      result,
    })
  } catch (err: unknown) {
    console.error('[admin/backup] Backup failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/daily-digest — generate WhatsApp-ready daily picks summary
router.post('/daily-digest', async (req, res) => {
  try {
    const targetDate = typeof req.body?.targetDate === 'string' ? req.body.targetDate.trim() : ''
    const result = await exportDailyPicksDigest(targetDate || undefined)

    res.json({
      ok: true,
      message: 'Resumo diário gerado com sucesso',
      result,
    })
  } catch (err: unknown) {
    console.error('[admin/daily-digest] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/daily-reminder — generate WhatsApp-ready reminder of who hasn't picked today
router.post('/daily-reminder', async (req, res) => {
  try {
    const targetDate = typeof req.body?.targetDate === 'string' ? req.body.targetDate.trim() : ''
    const result = await exportDailyReminder(targetDate || undefined)

    res.json({ ok: true, result })
  } catch (err: unknown) {
    console.error('[admin/daily-reminder] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/reset-picks — reset all saved picks before opening the bolao
router.post('/reset-picks', async (req, res) => {
  let snapshots: {
    series_picks: Record<string, unknown>[]
    game_picks: Record<string, unknown>[]
    simulation_series_picks: Record<string, unknown>[]
    simulation_game_picks: Record<string, unknown>[]
  } | null = null

  try {
    const confirmation = typeof req.body?.confirmation === 'string' ? req.body.confirmation.trim() : ''
    if (confirmation !== 'ZERAR PALPITES') {
      return res.status(400).json({
        ok: false,
        error: 'Confirmação inválida. Digite exatamente: ZERAR PALPITES',
      })
    }

    // Gera backup antes de qualquer deleção
    const backup = await exportOperationalSnapshot()
    snapshots = {
      series_picks: await snapshotTable('series_picks'),
      game_picks: await snapshotTable('game_picks'),
      simulation_series_picks: await snapshotTable('simulation_series_picks'),
      simulation_game_picks: await snapshotTable('simulation_game_picks'),
    }

    // Executa deleções em sequência — se qualquer uma falhar, lança exceção
    // e o catch externo retorna erro sem continuar as demais tabelas
    const tables = ['series_picks', 'game_picks', 'simulation_series_picks', 'simulation_game_picks']
    const deleted: Record<string, number> = {}
    for (const table of tables) {
      deleted[table] = await deleteAllRows(table)
    }

    await recalculateAllScores()

    res.json({
      ok: true,
      message: 'Todos os palpites foram zerados com backup prévio gerado.',
      backup,
      deleted,
    })
  } catch (err: unknown) {
    try {
      await restoreRows('series_picks', snapshots?.series_picks ?? [])
      await restoreRows('game_picks', snapshots?.game_picks ?? [])
      await restoreRows('simulation_series_picks', snapshots?.simulation_series_picks ?? [])
      await restoreRows('simulation_game_picks', snapshots?.simulation_game_picks ?? [])
    } catch (rollbackErr) {
      console.error('[admin/reset-picks] Rollback failed:', rollbackErr)
    }
    console.error('[admin/reset-picks] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/allowed-emails/add
router.post('/allowed-emails/add', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email is required.' })
    }

    const { data, error } = await supabase
      .from('allowed_emails')
      .upsert({ email }, { onConflict: 'email' })
      .select('email')
      .single()

    if (error) {
      return res.status(500).json({ ok: false, error: error.message })
    }

    res.json({ ok: true, email: data.email, message: 'Email liberado com sucesso.' })
  } catch (err: unknown) {
    console.error('[admin/allowed-emails/add] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/allowed-emails/remove
router.post('/allowed-emails/remove', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email is required.' })
    }

    const { data, error } = await supabase
      .from('allowed_emails')
      .delete()
      .eq('email', email)
      .select('email')

    if (error) {
      return res.status(500).json({ ok: false, error: error.message })
    }

    res.json({ ok: true, removed: data?.length ?? 0, message: 'Email removido da lista de acesso.' })
  } catch (err: unknown) {
    console.error('[admin/allowed-emails/remove] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /admin/participants/set-admin
router.post('/participants/set-admin', async (req, res) => {
  try {
    const participantId = typeof req.body?.participantId === 'string' ? req.body.participantId.trim() : ''
    const isAdmin = typeof req.body?.isAdmin === 'boolean' ? req.body.isAdmin : null
    const currentAdminParticipantId = (req as AdminRequest).adminParticipantId ?? ''

    if (!participantId || isAdmin == null) {
      return res.status(400).json({ ok: false, error: 'participantId and isAdmin are required.' })
    }

    if (!isAdmin && participantId === currentAdminParticipantId) {
      return res.status(400).json({ ok: false, error: 'Você não pode remover seu próprio acesso de admin por esta rota.' })
    }

    const { data, error } = await supabase
      .from('participants')
      .update({ is_admin: isAdmin })
      .eq('id', participantId)
      .select('id, name, email, is_admin')
      .single()

    if (error || !data) {
      return res.status(500).json({ ok: false, error: error?.message ?? 'Participant not found.' })
    }

    res.json({
      ok: true,
      participant: data,
      message: isAdmin ? 'Participante promovido a admin.' : 'Privilégio de admin removido.',
    })
  } catch (err: unknown) {
    console.error('[admin/participants/set-admin] Failed:', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
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
