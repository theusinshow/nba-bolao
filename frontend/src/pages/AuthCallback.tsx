import { useEffect, useState } from 'react'
import { LoadingBasketball } from '../components/LoadingBasketball'
import { supabase } from '../lib/supabase'

export function AuthCallback() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function completeAuth() {
      const currentUrl = new URL(window.location.href)
      const code = currentUrl.searchParams.get('code')
      const providerError = currentUrl.searchParams.get('error_description') ?? currentUrl.searchParams.get('error')

      if (providerError) {
        if (active) setError(providerError)
        return
      }

      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
        }

        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!data.session) {
          throw new Error('O retorno do login chegou sem uma sessão válida.')
        }

        window.location.replace('/')
      } catch (authError) {
        console.error('[auth/callback] failed to finish OAuth flow', authError)
        if (!active) return
        setError(authError instanceof Error ? authError.message : 'Não foi possível concluir o login com Google.')
      }
    }

    void completeAuth()

    return () => {
      active = false
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
