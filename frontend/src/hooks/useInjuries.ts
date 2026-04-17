import { useEffect, useState } from 'react'

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

export interface InjuriesProviderState {
  provider: 'balldontlie-nba-injuries'
  configured: boolean
  available: boolean
  reason?: string
}

export interface InjuryItem {
  id: string
  player_name: string
  team: string | null
  status: string
  detail: string | null
  position: string | null
  impact: 'high' | 'medium' | 'low'
}

interface InjuriesResponse {
  ok: boolean
  generatedAt: string
  provider: InjuriesProviderState
  injuries: InjuryItem[]
}

const DEFAULT_PROVIDER: InjuriesProviderState = {
  provider: 'balldontlie-nba-injuries',
  configured: false,
  available: false,
  reason: 'Ainda não carregado.',
}

function sanitizeProvider(value: InjuriesProviderState | null | undefined): InjuriesProviderState {
  if (!value) return DEFAULT_PROVIDER
  return {
    provider: 'balldontlie-nba-injuries',
    configured: Boolean(value.configured),
    available: Boolean(value.available),
    reason: typeof value.reason === 'string' ? value.reason : undefined,
  }
}

function sanitizeInjuries(value: unknown): InjuryItem[] {
  return Array.isArray(value) ? value.filter((item): item is InjuryItem => Boolean(item && typeof item === 'object')) : []
}

export function useInjuries() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [injuries, setInjuries] = useState<InjuryItem[]>([])
  const [provider, setProvider] = useState<InjuriesProviderState>(DEFAULT_PROVIDER)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${backendUrl}/analysis/injuries`)
        const payload = await response.json().catch(() => null) as InjuriesResponse | null

        if (!response.ok || !payload?.ok) {
          throw new Error(
            payload && 'error' in payload
              ? String((payload as { error?: string }).error ?? '')
              : 'Falha ao carregar lesões.'
          )
        }

        if (!active) return

        setGeneratedAt(typeof payload.generatedAt === 'string' ? payload.generatedAt : null)
        setProvider(sanitizeProvider(payload.provider))
        setInjuries(sanitizeInjuries(payload.injuries))
      } catch (loadError: unknown) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar lesões.')
        setProvider(DEFAULT_PROVIDER)
        setInjuries([])
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => { active = false }
  }, [])

  return { loading, error, generatedAt, injuries, provider }
}
