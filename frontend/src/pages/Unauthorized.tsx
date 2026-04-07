interface Props {
  email?: string
  onSignOut: () => void
}

export function Unauthorized({ email, onSignOut }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-8 text-center">
      <div className="text-5xl">🚫</div>
      <h1 className="title text-4xl text-nba-gold">Acesso Negado</h1>
      <p className="text-nba-muted max-w-sm">
        O e-mail <strong className="text-nba-text">{email}</strong> não está na lista de participantes do bolão.
      </p>
      <p className="text-nba-muted text-sm">Fale com o organizador para liberar seu acesso.</p>
      <button onClick={onSignOut} className="btn-primary">
        Sair
      </button>
    </div>
  )
}
