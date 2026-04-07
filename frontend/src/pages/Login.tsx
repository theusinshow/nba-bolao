interface Props {
  onSignIn: () => void
}

export function Login({ onSignIn }: Props) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--nba-bg)' }}
    >
      {/* Court lines SVG background */}
      <svg
        className="absolute inset-0 w-full h-full opacity-5"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <circle cx="400" cy="300" r="80" fill="none" stroke="#c8963c" strokeWidth="2" />
        <circle cx="400" cy="300" r="180" fill="none" stroke="#c8963c" strokeWidth="1" />
        <circle cx="400" cy="300" r="300" fill="none" stroke="#c8963c" strokeWidth="1" />
        <line x1="400" y1="0" x2="400" y2="600" stroke="#c8963c" strokeWidth="1" />
        <rect x="50" y="150" width="160" height="300" fill="none" stroke="#c8963c" strokeWidth="1.5" />
        <rect x="590" y="150" width="160" height="300" fill="none" stroke="#c8963c" strokeWidth="1.5" />
        <rect x="50" y="210" width="80" height="180" fill="none" stroke="#c8963c" strokeWidth="1" />
        <rect x="670" y="210" width="80" height="180" fill="none" stroke="#c8963c" strokeWidth="1" />
        <circle cx="50" cy="300" r="60" fill="none" stroke="#c8963c" strokeWidth="1" />
        <circle cx="750" cy="300" r="60" fill="none" stroke="#c8963c" strokeWidth="1" />
      </svg>

      <div className="relative z-10 flex flex-col items-center gap-8 px-8 text-center">
        {/* Logo */}
        <div>
          <div
            className="text-7xl md:text-8xl font-bebas tracking-widest"
            style={{ color: 'var(--nba-gold)', textShadow: '0 0 40px rgba(200,150,60,0.4)' }}
          >
            Bolão NBA
          </div>
          <div className="text-3xl md:text-4xl font-bebas tracking-widest text-nba-text opacity-80">
            2026 Playoffs
          </div>
        </div>

        {/* Sign in card */}
        <div
          className="card flex flex-col items-center gap-6 px-10 py-8"
          style={{ minWidth: 300 }}
        >
          <p className="text-nba-muted text-sm">Acesso restrito aos participantes do bolão</p>

          <button
            onClick={onSignIn}
            className="flex items-center gap-3 bg-white text-gray-800 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors w-full justify-center"
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
