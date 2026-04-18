import type { GamePick, SeriesPick } from '../types'
import { supabase } from './supabase'

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'
const DIRECT_SAVE_FALLBACK_STATUSES = new Set([404, 405, 502, 503, 504])

interface SaveGamePickResponse {
  ok: boolean
  pick: GamePick
  message: string
}

interface SaveSeriesPickResponse {
  ok: boolean
  pick: SeriesPick
  message: string
}

class PickApiError extends Error {
  status?: number
  shouldRetryDirectly: boolean

  constructor(message: string, options?: { status?: number; shouldRetryDirectly?: boolean }) {
    super(message)
    this.name = 'PickApiError'
    this.status = options?.status
    this.shouldRetryDirectly = options?.shouldRetryDirectly ?? false
  }
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  return session.access_token
}

async function getParticipantIdFromSession(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const userId = session?.user?.id
  if (!userId) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  const { data: participant, error } = await supabase
    .from('participants')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !participant?.id) {
    throw new Error(error?.message ?? 'Participante não encontrado para esta sessão.')
  }

  return participant.id
}

async function authenticatedPost<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const token = await getAccessToken()

  let response: Response

  try {
    response = await fetch(`${backendUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
  } catch (error) {
    console.warn(`[picksApi] backend indisponível em ${path}; tentando fallback direto`, error)
    throw new PickApiError('Não foi possível alcançar o backend oficial de palpites.', {
      shouldRetryDirectly: true,
    })
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new PickApiError(payload?.error ?? 'Não foi possível salvar o palpite.', {
      status: response.status,
      shouldRetryDirectly: DIRECT_SAVE_FALLBACK_STATUSES.has(response.status),
    })
  }

  return payload as TResponse
}

function shouldRetryDirectly(error: unknown) {
  return error instanceof PickApiError && error.shouldRetryDirectly
}

async function saveGamePickDirect(gameId: string, winnerId: string) {
  const participantId = await getParticipantIdFromSession()

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
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Não foi possível atualizar o palpite do jogo.')
    }

    return data as GamePick
  }

  const { data, error } = await supabase
    .from('game_picks')
    .insert({ participant_id: participantId, game_id: gameId, winner_id: winnerId })
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Não foi possível salvar o palpite do jogo.')
  }

  return data as GamePick
}

async function saveSeriesPickDirect(seriesId: string, winnerId: string, gamesCount: number) {
  const participantId = await getParticipantIdFromSession()

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
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Não foi possível atualizar o palpite da série.')
    }

    return data as SeriesPick
  }

  const { data, error } = await supabase
    .from('series_picks')
    .insert({ participant_id: participantId, series_id: seriesId, winner_id: winnerId, games_count: gamesCount })
    .select()
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Não foi possível salvar o palpite da série.')
  }

  return data as SeriesPick
}

export async function saveOfficialGamePick(gameId: string, winnerId: string) {
  try {
    const payload = await authenticatedPost<SaveGamePickResponse>('/api/picks/game', {
      gameId,
      winnerId,
    })

    return payload.pick
  } catch (error) {
    if (!shouldRetryDirectly(error)) {
      throw error
    }

    return saveGamePickDirect(gameId, winnerId)
  }
}

export async function saveOfficialSeriesPick(seriesId: string, winnerId: string, gamesCount: number) {
  try {
    const payload = await authenticatedPost<SaveSeriesPickResponse>('/api/picks/series', {
      seriesId,
      winnerId,
      gamesCount,
    })

    return payload.pick
  } catch (error) {
    if (!shouldRetryDirectly(error)) {
      throw error
    }

    return saveSeriesPickDirect(seriesId, winnerId, gamesCount)
  }
}
