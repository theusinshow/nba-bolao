interface Props {
  onSignIn: () => void
}

export function Login({ onSignIn }: Props) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-8"
      style={{ background: 'var(--nba-bg)' }}
    >
      {/* Court lines SVG background */}
      <svg
        className="absolute inset-0 w-full h-full opacity-5"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <line x1="400" y1="0" x2="400" y2="600" stroke="#c8963c" strokeWidth="1" />
        <circle cx="400" cy="300" r="78" fill="none" stroke="#c8963c" strokeWidth="2" />
        <line x1="360" y1="300" x2="440" y2="300" stroke="#c8963c" strokeWidth="1" />

        <rect x="0" y="0" width="800" height="600" fill="none" stroke="#c8963c" strokeWidth="1" />

        <rect x="0" y="170" width="150" height="260" fill="none" stroke="#c8963c" strokeWidth="1.5" />
        <rect x="0" y="225" width="60" height="150" fill="none" stroke="#c8963c" strokeWidth="1" />
        <circle cx="150" cy="300" r="60" fill="none" stroke="#c8963c" strokeWidth="1" />
        <path d="M 0 230 A 220 220 0 0 1 0 370" fill="none" stroke="#c8963c" strokeWidth="1" />
        <path d="M 60 270 A 30 30 0 0 0 60 330" fill="none" stroke="#c8963c" strokeWidth="1" />
        <line x1="40" y1="260" x2="40" y2="340" stroke="#c8963c" strokeWidth="1" />

        <rect x="650" y="170" width="150" height="260" fill="none" stroke="#c8963c" strokeWidth="1.5" />
        <rect x="740" y="225" width="60" height="150" fill="none" stroke="#c8963c" strokeWidth="1" />
        <circle cx="650" cy="300" r="60" fill="none" stroke="#c8963c" strokeWidth="1" />
        <path d="M 800 230 A 220 220 0 0 0 800 370" fill="none" stroke="#c8963c" strokeWidth="1" />
        <path d="M 740 270 A 30 30 0 0 1 740 330" fill="none" stroke="#c8963c" strokeWidth="1" />
        <line x1="760" y1="260" x2="760" y2="340" stroke="#c8963c" strokeWidth="1" />
      </svg>

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-[360px] text-center">
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
            className="text-5xl sm:text-6xl md:text-8xl font-bebas tracking-[0.08em]"
            style={{ color: 'var(--nba-gold)', textShadow: '0 0 40px rgba(200,150,60,0.4)' }}
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
        </div>

        <p className="text-nba-muted text-xs opacity-60">
          © 2026 Bolão NBA — Entre amigos
        </p>
      </div>
    </div>
  )
}
