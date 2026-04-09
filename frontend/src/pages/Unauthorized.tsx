interface Props {
  email?: string
  onSignOut: () => void
}

export function Unauthorized({ email, onSignOut }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 text-center">
      <div
        style={{
          width: 'min(100%, 360px)',
          background: 'var(--nba-surface)',
          border: '1px solid var(--nba-border)',
          borderRadius: 16,
          padding: '28px 20px',
        }}
      >
        <div className="text-5xl" style={{ marginBottom: 12 }}>🚫</div>
        <h1 className="title text-4xl text-nba-gold" style={{ marginBottom: 10 }}>Acesso Negado</h1>
        <p className="text-nba-muted text-sm" style={{ marginBottom: 10 }}>
          O e-mail <strong className="text-nba-text">{email}</strong> não está na lista de participantes do bolão.
        </p>
        <p className="text-nba-muted text-sm" style={{ marginBottom: 20 }}>Fale com o organizador para liberar seu acesso.</p>
        <button onClick={onSignOut} className="btn-primary" style={{ width: '100%' }}>
          Sair
        </button>
      </div>
    </div>
  )
}
