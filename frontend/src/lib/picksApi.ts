import type { GamePick, SeriesPick } from '../types'
import { supabase } from './supabase'

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

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

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  return session.access_token
}

async function authenticatedPost<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const token = await getAccessToken()

  const response = await fetch(`${backendUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Não foi possível salvar o palpite.')
  }

  return payload as TResponse
}

export async function saveOfficialGamePick(gameId: string, winnerId: string) {
  const payload = await authenticatedPost<SaveGamePickResponse>('/api/picks/game', {
    gameId,
    winnerId,
  })

  return payload.pick
}

export async function saveOfficialSeriesPick(seriesId: string, winnerId: string, gamesCount: number) {
  const payload = await authenticatedPost<SaveSeriesPickResponse>('/api/picks/series', {
    seriesId,
    winnerId,
    gamesCount,
  })

  return payload.pick
}
