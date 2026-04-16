import { useEffect, useState } from 'react'

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

export interface InjuriesProviderState {
  provider: 'sportsdataio'
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
}

interface InjuriesResponse {
  ok: boolean
  generatedAt: string
  provider: InjuriesProviderState
  injuries: InjuryItem[]
}

export function useInjuries() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [injuries, setInjuries] = useState<InjuryItem[]>([])
  const [provider, setProvider] = useState<InjuriesProviderState>({
    provider: 'sportsdataio',
    configured: false,
    available: false,
    reason: 'Ainda não carregado.',
  })

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

        setGeneratedAt(payload.generatedAt)
        setProvider(payload.provider)
        setInjuries(payload.injuries)
      } catch (loadError: unknown) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar lesões.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => { active = false }
  }, [])

  return { loading, error, generatedAt, injuries, provider }
}
