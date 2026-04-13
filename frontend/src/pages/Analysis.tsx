import { Link } from 'react-router-dom'
import { AlertTriangle, Activity, ChevronRight, Clock, Sparkles, Star, TrendingUp } from 'lucide-react'

type InjuryStatus = 'out' | 'questionable' | 'probable' | 'available'

const INJURIES: { player: string; team: string; status: InjuryStatus; detail: string }[] = [
  { player: 'Nikola Jokic', team: 'DEN', status: 'questionable', detail: 'Joelho direito' },
  { player: 'Victor Wembanyama', team: 'SAS', status: 'probable', detail: 'Fadiga' },
  { player: 'Jayson Tatum', team: 'BOS', status: 'available', detail: 'Retorno confirmado' },
  { player: 'LeBron James', team: 'LAL', status: 'questionable', detail: 'Tornozelo' },
  { player: 'Shai Gilgeous-Alexander', team: 'OKC', status: 'available', detail: '' },
]

const NEXT_GAMES = [
  { home: 'OKC', away: 'IND', date: '18/04', time: '21:30', round: 'Finals' },
  { home: 'BOS', away: 'NYK', date: '19/04', time: '15:00', round: 'R1' },
  { home: 'DEN', away: 'MIN', date: '19/04', time: '17:30', round: 'R1' },
  { home: 'NYK', away: 'DET', date: '20/04', time: '14:00', round: 'R1' },
  { home: 'GSW', away: 'HOU', date: '20/04', time: '18:00', round: 'R1' },
]

const LAST_NIGHT_RESULTS = [
  { home: 'BOS', away: 'NYK', homeScore: 112, awayScore: 105, round: 'R1', note: 'BOS abriu 1-0' },
  { home: 'DEN', away: 'MIN', homeScore: 108, awayScore: 101, round: 'R1', note: 'Jokic com 29 pts' },
  { home: 'OKC', away: 'IND', homeScore: 121, awayScore: 116, round: 'Finals', note: 'SGA decisivo no fim' },
  { home: 'DET', away: 'MIL', homeScore: 99, awayScore: 94, round: 'R1', note: 'Detroit roubou mando' },
  { home: 'LAL', away: 'HOU', homeScore: 118, awayScore: 114, round: 'R1', note: 'LeBron fechou no clutch' },
]

const ODDS = [
  { abbr: 'OKC', name: 'Thunder', odds: '+180', favorite: true, color: '#007AC1' },
  { abbr: 'BOS', name: 'Celtics', odds: '+220', favorite: true, color: '#007A33' },
  { abbr: 'DET', name: 'Pistons', odds: '+300', favorite: false, color: '#C8102E' },
  { abbr: 'SAS', name: 'Spurs', odds: '+350', favorite: false, color: '#C4CED4' },
  { abbr: 'DEN', name: 'Nuggets', odds: '+400', favorite: false, color: '#FEC524' },
]

const INJURY_META: Record<InjuryStatus, { label: string; color: string }> = {
  out: { label: 'Out', color: '#e74c3c' },
  questionable: { label: 'Questionável', color: '#f39c12' },
  probable: { label: 'Provável', color: '#27ae60' },
  available: { label: 'Disponível', color: '#2ecc71' },
}

const ROUND_BADGE_COLOR: Record<string, string> = {
  Finals: 'var(--nba-gold)',
  R1: '#4a90d9',
  R2: '#9b59b6',
  CF: '#e05c3a',
}

const card: React.CSSProperties = {
  background: 'var(--nba-surface)',
  border: '1px solid var(--nba-border)',
  borderRadius: 8,
  padding: '1rem',
}

function CardTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      {icon && <span style={{ color: 'var(--nba-gold)', display: 'flex' }}>{icon}</span>}
      <h2 className="title" style={{ color: 'var(--nba-gold)', fontSize: '1rem', letterSpacing: '0.1em', lineHeight: 1 }}>
        {children}
      </h2>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--nba-border)' }} />
}

function Badge({ label, color, small }: { label: string; color: string; small?: boolean }) {
  return (
    <span
      style={{
        background: `${color}22`,
        color,
        borderRadius: 4,
        padding: small ? '1px 6px' : '2px 8px',
        fontSize: small ? '0.65rem' : '0.7rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  )
}

function SimNote({ children }: { children: React.ReactNode }) {
  return <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginTop: 8, lineHeight: 1.4 }}>{children}</p>
}

function AnalysisHero() {
  return (
    <section
      style={{
        background: 'linear-gradient(135deg, rgba(74,144,217,0.16), rgba(200,150,60,0.10) 52%, rgba(19,19,26,1) 100%)',
        border: '1px solid rgba(200,150,60,0.22)',
        borderRadius: 12,
        padding: '1.05rem',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(74,144,217,0.18), transparent 36%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nba-gold)' }}>
          <Activity size={15} />
          <span className="font-condensed" style={{ fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Central de leitura
          </span>
        </div>

        <div style={{ display: 'grid', gap: 12 }} className="md:grid-cols-[1.35fr_1fr]">
          <div>
            <h1 className="title" style={{ color: 'var(--nba-gold)', fontSize: 'clamp(2.2rem, 5vw, 3.1rem)', lineHeight: 0.95, margin: 0 }}>
              Análise da Rodada
            </h1>
            <p style={{ color: 'var(--nba-text)', fontSize: '0.96rem', margin: '10px 0 6px' }}>
              Um espaço separado para radar, tendência e contexto dos playoffs.
            </p>
            <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', maxWidth: 620, margin: 0 }}>
              Esta aba concentra os blocos de leitura que estavam disputando espaço com a operação diária do bolão. A Home agora fica mais objetiva, e a análise ganha um lugar próprio para crescer.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 10 }} className="grid-cols-2">
            {[
              { label: 'Próximos confrontos', value: NEXT_GAMES.length, tone: 'var(--nba-text)' },
              { label: 'Resultados recentes', value: LAST_NIGHT_RESULTS.length, tone: 'var(--nba-gold)' },
              { label: 'Odds em destaque', value: ODDS.length, tone: 'var(--nba-east)' },
              { label: 'Radar de lesões', value: INJURIES.length, tone: 'var(--nba-success)' },
            ].map((item) => (
              <div key={item.label} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)' }}>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>{item.label}</div>
                <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.35rem', lineHeight: 1 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function AnalysisContextCard() {
  return (
    <section style={{ ...card, background: 'linear-gradient(135deg, rgba(200,150,60,0.10), rgba(74,144,217,0.06) 55%, rgba(19,19,26,1) 100%)', border: '1px solid rgba(200,150,60,0.18)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color: 'var(--nba-gold)', display: 'flex' }}>
          <AlertTriangle size={14} />
        </span>
        <span className="font-condensed" style={{ color: 'var(--nba-gold)', fontSize: '0.76rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Contexto Atual
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, color: 'var(--nba-gold)', background: 'rgba(200,150,60,0.10)', border: '1px solid rgba(200,150,60,0.18)' }}>
          Conteúdo em modo simulado
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, color: 'var(--nba-success)', background: 'rgba(46,204,113,0.10)', border: '1px solid rgba(46,204,113,0.18)' }}>
          Home focada no bolão real
        </span>
      </div>

      <p style={{ color: 'var(--nba-text)', fontSize: '0.82rem', margin: 0, lineHeight: 1.45 }}>
        Esta seção ainda funciona como radar visual enquanto a integração real desses dados não entra. A separação em aba própria foi feita para manter a Home mais limpa e a navegação mais coerente.
      </p>
    </section>
  )
}

function LastNightResultsTicker() {
  const tickerItems = [...LAST_NIGHT_RESULTS, ...LAST_NIGHT_RESULTS]

  return (
    <section style={{ ...card, padding: '0.9rem 0', overflow: 'hidden', position: 'relative', background: 'linear-gradient(135deg, rgba(74,144,217,0.12), rgba(200,150,60,0.08) 60%, rgba(19,19,26,1) 100%)', border: '1px solid rgba(200,150,60,0.18)' }}>
      <style>{`
        @keyframes analysis-results-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 1rem', marginBottom: 10 }}>
        <span style={{ color: 'var(--nba-gold)', display: 'flex' }}>
          <Clock size={14} />
        </span>
        <h2 className="title" style={{ color: 'var(--nba-gold)', fontSize: '0.95rem', letterSpacing: '0.08em', lineHeight: 1, margin: 0 }}>
          Resultados da última noite
        </h2>
      </div>

      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 42, background: 'linear-gradient(90deg, rgba(19,19,26,0.95), rgba(19,19,26,0))', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 42, background: 'linear-gradient(270deg, rgba(19,19,26,0.95), rgba(19,19,26,0))', pointerEvents: 'none', zIndex: 1 }} />

      <div style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', width: 'max-content', animation: 'analysis-results-marquee 34s linear infinite', gap: 12, padding: '0 1rem' }}>
          {tickerItems.map((game, index) => (
            <div key={`${game.home}-${game.away}-${index}`} style={{ minWidth: 260, display: 'grid', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.42)', border: '1px solid rgba(200,150,60,0.14)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.92rem', lineHeight: 1 }}>
                  {game.home} <span style={{ color: 'var(--nba-text-muted)' }}>vs</span> {game.away}
                </span>
                <Badge label={game.round} color={ROUND_BADGE_COLOR[game.round] ?? '#888'} small />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '1.35rem', lineHeight: 1 }}>
                  {game.homeScore} - {game.awayScore}
                </span>
                <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>final</span>
              </div>
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>{game.note}</div>
            </div>
          ))}
        </div>
      </div>

      <SimNote>Resultados simulados por enquanto — integração com dados reais virá depois.</SimNote>
    </section>
  )
}

function NextGamesCard() {
  const featured = NEXT_GAMES[0]

  return (
    <div style={card}>
      <CardTitle icon={<Clock size={14} />}>Próximos Confrontos</CardTitle>

      {featured && (
        <div style={{ background: 'linear-gradient(135deg, rgba(74,144,217,0.16), rgba(200,150,60,0.08))', border: '1px solid rgba(200,150,60,0.14)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <span className="font-condensed" style={{ color: 'var(--nba-gold)', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
              PRÓXIMO FOCO
            </span>
            <Badge label={featured.round} color={ROUND_BADGE_COLOR[featured.round] ?? '#888'} small />
          </div>
          <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1.25rem', lineHeight: 1 }}>
            {featured.home} vs {featured.away}
          </div>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginTop: 6 }}>
            {featured.date} às {featured.time} BRT
          </div>
          <Link to="/games" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--nba-gold)', fontSize: '0.78rem', marginTop: 10, textDecoration: 'none' }}>
            Ir para jogos
            <ChevronRight size={14} />
          </Link>
        </div>
      )}

      <div>
        {NEXT_GAMES.map((g, i) => {
          const color = ROUND_BADGE_COLOR[g.round] ?? '#888'
          return (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderRadius: 6, fontSize: '0.85rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.9rem' }}>
                    {g.home} <span style={{ color: 'var(--nba-text-muted)', fontWeight: 400 }}>vs</span> {g.away}
                  </div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 1 }}>
                    {g.date} · {g.time} BRT
                  </div>
                </div>
                <Badge label={g.round} color={color} small />
              </div>
              {i < NEXT_GAMES.length - 1 && <Divider />}
            </div>
          )
        })}
      </div>
      <SimNote>Agenda simulada por enquanto — integração com dados reais virá depois.</SimNote>
    </div>
  )
}

function OddsCard() {
  return (
    <div style={card}>
      <CardTitle icon={<TrendingUp size={14} />}>Odds dos Confrontos</CardTitle>
      <div>
        {ODDS.map((o, i) => (
          <div key={o.abbr}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderRadius: 6, fontSize: '0.85rem' }}>
              <span className="font-condensed font-bold" style={{ color: o.color, width: 32, textAlign: 'center', flexShrink: 0, fontSize: '0.85rem' }}>
                {o.abbr}
              </span>
              <span style={{ flex: 1, color: 'var(--nba-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {o.name}
              </span>
              {o.favorite && <Star size={10} fill="currentColor" style={{ color: 'var(--nba-gold)', flexShrink: 0 }} />}
              <span className="font-condensed font-bold" style={{ color: o.favorite ? 'var(--nba-gold)' : 'var(--nba-text-muted)', flexShrink: 0, fontSize: '0.88rem' }}>
                {o.odds}
              </span>
            </div>
            {i < ODDS.length - 1 && <Divider />}
          </div>
        ))}
      </div>
      <SimNote>Odds simuladas — integração real em breve.</SimNote>
    </div>
  )
}

function InjuriesCard() {
  return (
    <div style={card}>
      <CardTitle icon={<AlertTriangle size={14} />}>Lesões e Notícias</CardTitle>
      <div>
        {INJURIES.map((item, i) => {
          const meta = INJURY_META[item.status]
          return (
            <div key={item.player}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderRadius: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--nba-text)', fontWeight: 600, fontSize: '0.83rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.player}
                  </div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
                    {item.team}{item.detail ? ` — ${item.detail}` : ''}
                  </div>
                </div>
                <Badge label={meta.label} color={meta.color} small />
              </div>
              {i < INJURIES.length - 1 && <Divider />}
            </div>
          )
        })}
      </div>
      <SimNote>Radar de lesões simulado — integração real em breve.</SimNote>
    </div>
  )
}

function AnalysisActionsCard() {
  return (
    <div style={{ ...card, background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(74,144,217,0.08) 48%, rgba(200,150,60,0.08) 100%)' }}>
      <CardTitle icon={<Sparkles size={14} />}>Atalhos Relacionados</CardTitle>
      <div style={{ display: 'grid', gap: 10 }}>
        {[
          { to: '/games', label: 'Abrir Jogos', description: 'Voltar para a área de palpites e agenda operacional.' },
          { to: '/official', label: 'Ver chave oficial', description: 'Conferir o andamento real dos playoffs.' },
          { to: '/', label: 'Voltar para Home', description: 'Retornar ao painel principal do bolão.' },
        ].map((action) => (
          <Link key={action.to} to={action.to} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, textDecoration: 'none', background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)', color: 'var(--nba-text)' }}>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem' }}>{action.label}</span>
              <span style={{ display: 'block', color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 1 }}>
                {action.description}
              </span>
            </span>
            <ChevronRight size={16} style={{ color: 'var(--nba-text-muted)', flexShrink: 0 }} />
          </Link>
        ))}
      </div>
    </div>
  )
}

export function Analysis() {
  return (
    <div className="pb-24 pt-4 px-4 mx-auto flex flex-col gap-4" style={{ maxWidth: 1280 }}>
      <AnalysisHero />
      <AnalysisContextCard />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr]">
        <div className="flex flex-col gap-4 min-w-0">
          <NextGamesCard />
          <LastNightResultsTicker />
        </div>
        <div className="flex flex-col gap-4 min-w-0">
          <AnalysisActionsCard />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OddsCard />
        <InjuriesCard />
      </div>
    </div>
  )
}
