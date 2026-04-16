interface Props {
  onSignIn: () => void
  onEnterAsGuest: () => void
}

export function Login({ onSignIn, onEnterAsGuest }: Props) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-8"
      style={{ background: 'var(--nba-bg)' }}
    >
      {/* Basketball court SVG background */}
      <svg
        className="absolute inset-0 w-full h-full court-lines"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <g opacity="0.8" stroke="#c8963c" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="16" y="16" width="768" height="568" strokeWidth="1.25" />
          <line x1="400" y1="16" x2="400" y2="584" strokeWidth="1" />
          <circle cx="400" cy="300" r="74" strokeWidth="1.8" />
          <circle cx="400" cy="300" r="14" strokeWidth="1" />

          <rect x="16" y="190" width="190" height="220" strokeWidth="1.4" />
          <rect x="16" y="235" width="76" height="130" strokeWidth="1.1" />
          <circle cx="206" cy="300" r="62" strokeWidth="1.1" />
          <path d="M 16 72 L 92 72 L 92 196" strokeWidth="1.2" />
          <path d="M 16 528 L 92 528 L 92 404" strokeWidth="1.2" />
          <path d="M 92 110 A 248 248 0 0 1 92 490" strokeWidth="1.5" />
          <path d="M 92 258 A 42 42 0 0 0 92 342" strokeWidth="1.1" />
          <line x1="54" y1="270" x2="54" y2="330" strokeWidth="1" />
          <line x1="38" y1="272" x2="54" y2="272" strokeWidth="1" />
          <circle cx="64" cy="300" r="7" strokeWidth="1" />

          <rect x="594" y="190" width="190" height="220" strokeWidth="1.4" />
          <rect x="708" y="235" width="76" height="130" strokeWidth="1.1" />
          <circle cx="594" cy="300" r="62" strokeWidth="1.1" />
          <path d="M 784 72 L 708 72 L 708 196" strokeWidth="1.2" />
          <path d="M 784 528 L 708 528 L 708 404" strokeWidth="1.2" />
          <path d="M 708 110 A 248 248 0 0 0 708 490" strokeWidth="1.5" />
          <path d="M 708 258 A 42 42 0 0 1 708 342" strokeWidth="1.1" />
          <line x1="746" y1="270" x2="746" y2="330" strokeWidth="1" />
          <line x1="746" y1="272" x2="762" y2="272" strokeWidth="1" />
          <circle cx="736" cy="300" r="7" strokeWidth="1" />
        </g>
      </svg>

      <div className="animate-in relative z-10 flex flex-col items-center gap-6 w-full max-w-[360px] text-center">
        {/* Logo */}
        <div>
          <img
            src="/logo-bolao-nba-512.png"
            alt="Logo do Bolão NBA"
            style={{
              width: 120,
              height: 120,
              objectFit: 'contain',
              margin: '0 auto 14px',
              filter: 'drop-shadow(0 10px 28px rgba(0,0,0,0.42))',
            }}
          />
          <div
            className="text-5xl sm:text-6xl md:text-8xl font-bebas tracking-[0.08em] title-glow"
            style={{ color: 'var(--nba-gold)' }}
          >
            Bolão NBA
          </div>
          <div className="text-2xl sm:text-3xl md:text-4xl font-bebas tracking-[0.08em] text-nba-text opacity-80">
            2026 Playoffs
          </div>
        </div>

        {/* Sign in card */}
        <div
          className="card flex flex-col items-center gap-5 px-5 sm:px-8 py-7 w-full"
        >
          <p className="text-nba-muted text-sm max-w-[240px]">Acesso restrito aos participantes do bolão</p>

          <button
            onClick={onSignIn}
            className="flex items-center gap-3 bg-white text-gray-800 font-semibold px-6 py-3.5 rounded-lg hover:bg-gray-100 transition-colors w-full justify-center"
          >
            {/* Google logo */}
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Entrar com Google
          </button>

          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(200,150,60,0.15)' }} />
            <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>ou</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(200,150,60,0.15)' }} />
          </div>

          <button
            onClick={onEnterAsGuest}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 8,
              border: '1px solid rgba(200,150,60,0.22)',
              background: 'transparent',
              color: 'var(--nba-text-muted)',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(200,150,60,0.45)'
              e.currentTarget.style.color = 'var(--nba-gold)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(200,150,60,0.22)'
              e.currentTarget.style.color = 'var(--nba-text-muted)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Ver como visitante
          </button>
        </div>

        <p className="text-nba-muted text-xs opacity-60">
          © 2026 Bolão NBA — Entre amigos
        </p>
      </div>
    </div>
  )
}
