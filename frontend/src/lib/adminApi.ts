import { supabase } from './supabase'

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  return session.access_token
}

export async function adminPost<TResponse = unknown>(path: string, body?: unknown): Promise<TResponse> {
  const token = await getAccessToken()

  const response = await fetch(`${backendUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body == null ? undefined : JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Não foi possível concluir a ação administrativa.')
  }

  return payload as TResponse
}

export async function adminGet<TResponse = unknown>(path: string): Promise<TResponse> {
  const token = await getAccessToken()

  const response = await fetch(`${backendUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Não foi possível carregar os dados administrativos.')
  }

  return payload as TResponse
}
