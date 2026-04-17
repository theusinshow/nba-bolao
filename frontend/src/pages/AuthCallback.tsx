import { useEffect, useState } from 'react'
import { LoadingBasketball } from '../components/LoadingBasketball'
import { supabase } from '../lib/supabase'

const TIMEOUT_MS = 12_000

function getProviderError(): string | null {
  const url = new URL(window.location.href)
  const hash = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash)
  return (
    url.searchParams.get('error_description') ??
    url.searchParams.get('error') ??
    hash.get('error_description') ??
    hash.get('error') ??
    null
  )
}

export function AuthCallback() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    // Fail fast if Google returned an error
    const providerError = getProviderError()
    if (providerError) {
      setError(providerError)
      return
    }

    // The Supabase SDK (detectSessionInUrl: true) exchanges the PKCE code automatically on
    // client init. useAuth's onAuthStateChange picks up SIGNED_IN and re-renders the app.
    // We must NOT call exchangeCodeForSession manually — the code is single-use and a double
    // exchange (SDK + manual) causes the second call to fail, especially on slow mobile networks.

    // Redirect as soon as the session is confirmed.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        window.location.replace('/')
      }
    })

    // Session might already be set if the SDK exchanged the code before this component mounted.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (data.session) window.location.replace('/')
    })

    // Timeout fallback — if nothing happens in TIMEOUT_MS, something went wrong.
    const timeout = window.setTimeout(() => {
      if (!active) return
      setError('O retorno do login demorou demais. Tente novamente.')
    }, TIMEOUT_MS)

    return () => {
      active = false
      window.clearTimeout(timeout)
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: 'var(--nba-bg)' }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '1.5rem',
          display: 'grid',
          gap: 14,
          textAlign: 'center',
        }}
      >
        <div className="font-bebas tracking-[0.08em]" style={{ color: 'var(--nba-gold)', fontSize: '2rem', lineHeight: 1 }}>
          Finalizando login
        </div>

        {!error ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <LoadingBasketball size={44} />
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Estamos confirmando sua sessão com o Google.
            </div>
          </>
        ) : (
          <>
            <div className="font-condensed font-bold" style={{ color: '#ff8a65', fontSize: '1rem', lineHeight: 1.05 }}>
              Não foi possível concluir o login
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.84rem', lineHeight: 1.5 }}>
              {error}
            </div>
            <a
              href="/login"
              style={{
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 44,
                borderRadius: 10,
                textDecoration: 'none',
                background: 'rgba(200,150,60,0.14)',
                border: '1px solid rgba(200,150,60,0.22)',
                color: 'var(--nba-gold)',
                fontWeight: 700,
              }}
            >
              Voltar para login
            </a>
          </>
        )}
      </div>
    </div>
  )
}
