import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()
const PICK_GRACE_MS = 5 * 60_000

interface AuthenticatedRequest extends Request {
  participantId?: string
}

interface GamePickRow {
  id: string
  participant_id: string
  game_id: string
  winner_id: string
}

interface SeriesPickRow {
  id: string
  participant_id: string
  series_id: string
  winner_id: string
  games_count: number
}

async function requireParticipant(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ ok: false, error: 'Sessão ausente.' })
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)

  if (userError || !user) {
    return res.status(401).json({ ok: false, error: 'Sessão inválida.' })
  }

  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (participantError || !participant?.id) {
    return res.status(403).json({ ok: false, error: 'Participante não encontrado para este login.' })
  }

  ;(req as AuthenticatedRequest).participantId = participant.id
  next()
}

function getParticipantId(req: Request) {
  const participantId = (req as AuthenticatedRequest).participantId
  if (!participantId) {
    throw new Error('Participante autenticado não disponível.')
  }
  return participantId
}

function usesMissingUniqueConstraint(message: string) {
  const normalized = message.toLocaleLowerCase('pt-BR')
  return normalized.includes('no unique or exclusion constraint') ||
    normalized.includes('there is no unique or exclusion constraint')
}

async function saveGamePickWithFallback(participantId: string, gameId: string, winnerId: string) {
  const payload = { participant_id: participantId, game_id: gameId, winner_id: winnerId }

  const upsertResult = await supabase
    .from('game_picks')
    .upsert(payload, { onConflict: 'participant_id,game_id' })
    .select('*')
    .single()

  if (!upsertResult.error && upsertResult.data) {
    return upsertResult.data as GamePickRow
  }

  if (!upsertResult.error || !usesMissingUniqueConstraint(upsertResult.error.message)) {
    throw new Error(upsertResult.error?.message ?? 'Não foi possível salvar o palpite do jogo.')
  }

  console.warn('[picks/game] UNIQUE constraint ausente em game_picks; usando fallback update/insert.')

  const { data: existing, error: existingError } = await supabase
    .from('game_picks')
    .select('*')
    .eq('participant_id', participantId)
    .eq('game_id', gameId)
    .limit(1)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  if (existing) {
    const { data, error } = await supabase
      .from('game_picks')
      .update({ winner_id: winnerId })
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Não foi possível atualizar o palpite do jogo.')
    }

    return data as GamePickRow
  }

  const { data, error } = await supabase
    .from('game_picks')
    .insert(payload)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Não foi possível inserir o palpite do jogo.')
  }

  return data as GamePickRow
}

async function saveSeriesPickWithFallback(participantId: string, seriesId: string, winnerId: string, gamesCount: number) {
  const payload = {
    participant_id: participantId,
    series_id: seriesId,
    winner_id: winnerId,
    games_count: gamesCount,
  }

  const upsertResult = await supabase
    .from('series_picks')
    .upsert(payload, { onConflict: 'participant_id,series_id' })
    .select('*')
    .single()

  if (!upsertResult.error && upsertResult.data) {
    return upsertResult.data as SeriesPickRow
  }

  if (!upsertResult.error || !usesMissingUniqueConstraint(upsertResult.error.message)) {
    throw new Error(upsertResult.error?.message ?? 'Não foi possível salvar o palpite da série.')
  }

  console.warn('[picks/series] UNIQUE constraint ausente em series_picks; usando fallback update/insert.')

  const { data: existing, error: existingError } = await supabase
    .from('series_picks')
    .select('*')
    .eq('participant_id', participantId)
    .eq('series_id', seriesId)
    .limit(1)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  if (existing) {
    const { data, error } = await supabase
      .from('series_picks')
      .update({ winner_id: winnerId, games_count: gamesCount })
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Não foi possível atualizar o palpite da série.')
    }

    return data as SeriesPickRow
  }

  const { data, error } = await supabase
    .from('series_picks')
    .insert(payload)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Não foi possível inserir o palpite da série.')
  }

  return data as SeriesPickRow
}

router.use(requireParticipant)

router.post('/game', async (req, res) => {
  try {
    const participantId = getParticipantId(req)
    const gameId = typeof req.body?.gameId === 'string' ? req.body.gameId.trim() : ''
    const winnerId = typeof req.body?.winnerId === 'string' ? req.body.winnerId.trim() : ''

    if (!gameId || !winnerId) {
      return res.status(400).json({ ok: false, error: 'gameId e winnerId são obrigatórios.' })
    }

    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, played, tip_off_at, home_team_id, away_team_id')
      .eq('id', gameId)
      .maybeSingle()

    if (gameError) {
      return res.status(500).json({ ok: false, error: gameError.message })
    }

    if (!game) {
      return res.status(404).json({ ok: false, error: 'Jogo não encontrado.' })
    }

    if (game.played) {
      return res.status(409).json({ ok: false, error: 'Jogo já finalizado.' })
    }

    if (winnerId !== game.home_team_id && winnerId !== game.away_team_id) {
      return res.status(400).json({ ok: false, error: 'Winner inválido para este jogo.' })
    }

    if (game.tip_off_at && new Date(game.tip_off_at).getTime() - PICK_GRACE_MS <= Date.now()) {
      return res.status(409).json({ ok: false, error: 'A janela deste jogo já foi travada.' })
    }

    const pick = await saveGamePickWithFallback(participantId, gameId, winnerId)

    res.json({
      ok: true,
      pick,
      message: 'Palpite de jogo salvo com sucesso.',
    })
  } catch (err: unknown) {
    console.error('[picks/game] Failed:', err)
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

router.post('/series', async (req, res) => {
  try {
    const participantId = getParticipantId(req)
    const seriesId = typeof req.body?.seriesId === 'string' ? req.body.seriesId.trim() : ''
    const winnerId = typeof req.body?.winnerId === 'string' ? req.body.winnerId.trim() : ''
    const gamesCount = Number(req.body?.gamesCount)

    if (!seriesId || !winnerId || !Number.isInteger(gamesCount)) {
      return res.status(400).json({ ok: false, error: 'seriesId, winnerId e gamesCount são obrigatórios.' })
    }

    if (gamesCount < 4 || gamesCount > 7) {
      return res.status(400).json({ ok: false, error: 'gamesCount deve estar entre 4 e 7.' })
    }

    const { data: seriesItem, error: seriesError } = await supabase
      .from('series')
      .select('id, is_complete, home_team_id, away_team_id')
      .eq('id', seriesId)
      .maybeSingle()

    if (seriesError) {
      return res.status(500).json({ ok: false, error: seriesError.message })
    }

    if (!seriesItem) {
      return res.status(404).json({ ok: false, error: 'Série não encontrada.' })
    }

    if (seriesItem.is_complete) {
      return res.status(409).json({ ok: false, error: 'Série já encerrada.' })
    }

    if (!seriesItem.home_team_id || !seriesItem.away_team_id) {
      return res.status(409).json({ ok: false, error: 'A série ainda não está pronta para receber palpite.' })
    }

    if (winnerId !== seriesItem.home_team_id && winnerId !== seriesItem.away_team_id) {
      return res.status(400).json({ ok: false, error: 'Winner inválido para esta série.' })
    }

    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('tip_off_at')
      .eq('series_id', seriesId)
      .not('tip_off_at', 'is', null)
      .order('tip_off_at', { ascending: true })
      .limit(1)

    if (gamesError) {
      return res.status(500).json({ ok: false, error: gamesError.message })
    }

    const firstTipOff = games?.[0]?.tip_off_at ?? null
    if (firstTipOff && new Date(firstTipOff).getTime() <= Date.now()) {
      return res.status(409).json({ ok: false, error: 'Os palpites desta série já foram travados.' })
    }

    const pick = await saveSeriesPickWithFallback(participantId, seriesId, winnerId, gamesCount)

    res.json({
      ok: true,
      pick,
      message: 'Palpite de série salvo com sucesso.',
    })
  } catch (err: unknown) {
    console.error('[picks/series] Failed:', err)
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

export default router
