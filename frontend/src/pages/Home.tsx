import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, Minus, AlertTriangle, ArrowLeftRight, ChevronRight, Clock, Sparkles, Star, Target, Trophy, Users } from 'lucide-react'
import { LoadingBasketball } from '../components/LoadingBasketball'
import { useRanking } from '../hooks/useRanking'
import { useSeries } from '../hooks/useSeries'
import { useGameFeed } from '../hooks/useGameFeed'
import { isSeriesReadyForPick } from '../utils/bracket'

interface Props {
  participantId: string
}

const ROUND_LABEL: Record<number, string> = { 1: 'R1', 2: 'R2', 3: 'CF', 4: 'Finals' }

const card: React.CSSProperties = {
  background: 'var(--nba-surface)',
  border: '1px solid var(--nba-border)',
  borderRadius: 8,
  padding: '1rem',
}

const ROUND_BADGE_COLOR: Record<string, string> = {
  Finals: 'var(--nba-gold)',
  R1: '#4a90d9',
  R2: '#9b59b6',
  CF: '#e05c3a',
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

function RankArrow({ diff }: { diff: number }) {
  if (diff > 0) return <ArrowUp size={10} style={{ color: 'var(--nba-success)', flexShrink: 0 }} />
  if (diff < 0) return <ArrowDown size={10} style={{ color: 'var(--nba-danger)', flexShrink: 0 }} />
  return <Minus size={10} style={{ color: 'var(--nba-text-muted)', flexShrink: 0 }} />
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        background: `${color}22`,
        color,
        borderRadius: 4,
        padding: '1px 6px',
        fontSize: '0.65rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  )
}

function formatShortDateTime(dateValue: string | null | undefined) {
  if (!dateValue) return 'Sem horário'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(dateValue))
}

function LastNightRecap({
  games,
  upcomingGames,
  isRealData,
}: {
  games: ReturnType<typeof useGameFeed>['recentCompletedGames']
  upcomingGames: ReturnType<typeof useGameFeed>['upcomingGames']
  isRealData: boolean
}) {
  const sourceGames = games.map((game) => ({
    home: game.home_team?.abbreviation ?? game.home_team_id,
    away: game.away_team?.abbreviation ?? game.away_team_id,
    homeScore: game.home_score ?? 0,
    awayScore: game.away_score ?? 0,
    round: ROUND_LABEL[game.series?.round ?? game.round ?? 1] ?? 'NBA',
    note: formatShortDateTime(game.tip_off_at),
  }))
  const nextRealGame = upcomingGames[0]

  return (
    <section style={{ ...card, padding: '0.9rem 0', overflow: 'hidden', position: 'relative', background: 'linear-gradient(135deg, rgba(74,144,217,0.12), rgba(200,150,60,0.08) 60%, rgba(19,19,26,1) 100%)', border: '1px solid rgba(200,150,60,0.18)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 1rem', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--nba-gold)', display: 'flex' }}>
            <Clock size={14} />
          </span>
          <h2 className="title" style={{ color: 'var(--nba-gold)', fontSize: '0.95rem', letterSpacing: '0.08em', lineHeight: 1, margin: 0 }}>
            Jogos da última noite
          </h2>
        </div>
        <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
          {isRealData ? 'placares reais sincronizados' : 'aguardando primeiros resultados reais'}
        </span>
      </div>

      {sourceGames.length > 0 ? (
        <div
          style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            padding: '0 1rem 0.2rem',
            scrollSnapType: 'x proximity',
          }}
        >
          {sourceGames.map((game) => {
            return (
              <div
                key={`${game.home}-${game.away}`}
                style={{
                  minWidth: 250,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'rgba(12,12,18,0.42)',
                  border: '1px solid rgba(200,150,60,0.14)',
                  scrollSnapAlign: 'start',
                  display: 'grid',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.92rem', lineHeight: 1 }}>
                    {game.home} <span style={{ color: 'var(--nba-text-muted)' }}>vs</span> {game.away}
                  </span>
                  <Badge label={game.round} color={ROUND_BADGE_COLOR[game.round] ?? '#888'} />
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '1.35rem', lineHeight: 1 }}>
                    {game.homeScore} - {game.awayScore}
                  </span>
                  <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>final</span>
                </div>

                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>{game.note}</div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ padding: '0 1rem 0.2rem' }}>
          <div
            style={{
              borderRadius: 10,
              padding: '14px 16px',
              background: 'rgba(12,12,18,0.42)',
              border: '1px solid rgba(200,150,60,0.14)',
              display: 'grid',
              gap: 8,
            }}
          >
            <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.92rem', lineHeight: 1 }}>
              Ainda não há jogos finalizados nesta pós-temporada
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', lineHeight: 1.5 }}>
              A Home agora mostra só placares reais. Quando o primeiro jogo terminar, este bloco será atualizado automaticamente pelo feed sincronizado do Supabase.
            </div>
            {nextRealGame && (
              <div style={{ color: 'var(--nba-gold)', fontSize: '0.76rem' }}>
                Próximo jogo confirmado: {nextRealGame.home_team?.abbreviation ?? nextRealGame.home_team_id} vs {nextRealGame.away_team?.abbreviation ?? nextRealGame.away_team_id} em {formatShortDateTime(nextRealGame.tip_off_at)}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginTop: 10, padding: '0 1rem', lineHeight: 1.4 }}>
        {isRealData
          ? 'Bloco alimentado por jogos reais vindos do banco sincronizado.'
          : 'Sem fallback fictício: este espaço só mostra resultados reais da API depois que os jogos forem concluídos.'}
      </div>
    </section>
  )
}

function HeroPanel({
  myEntry,
  pickedSeries,
  readySeries,
}: {
  myEntry?: { rank: number; total_points: number; participant_name: string }
  pickedSeries: number
  readySeries: number
}) {
  const progress = readySeries > 0 ? Math.round((pickedSeries / readySeries) * 100) : 0

  const actions = [
    { to: '/bracket', label: 'Completar bracket', sublabel: `${pickedSeries}/${readySeries} séries disponíveis` },
    { to: '/games', label: 'Ver jogos', sublabel: 'Acompanhe os próximos palpites' },
    { to: '/ranking', label: 'Abrir ranking', sublabel: 'Confira sua posição no bolão' },
  ]

  return (
    <section
      style={{
        background: 'linear-gradient(135deg, rgba(200,150,60,0.18), rgba(74,144,217,0.10) 45%, rgba(19,19,26,1) 100%)',
        border: '1px solid rgba(200,150,60,0.22)',
        borderRadius: 12,
        padding: '1.1rem',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(232,180,90,0.18), transparent 34%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nba-gold)' }}>
          <img src="/logo-bolao-nba-512.png" alt="Logo do Bolão NBA" style={{ width: 28, height: 28, objectFit: 'contain', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.28))' }} />
          <Sparkles size={15} />
          <span className="font-condensed" style={{ fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Painel do participante
          </span>
        </div>

        <div style={{ display: 'grid', gap: 12 }} className="md:grid-cols-[1.4fr_1fr]">
          <div>
            <h1 className="title" style={{ color: 'var(--nba-gold)', fontSize: 'clamp(2.5rem, 6vw, 3.6rem)', lineHeight: 0.95, margin: 0 }}>
              Bolão NBA 2026
            </h1>
            <p style={{ color: 'var(--nba-text)', fontSize: '1rem', margin: '10px 0 6px' }}>
              {myEntry ? `${myEntry.participant_name.split(' ')[0]}, você está no jogo.` : 'Seu painel está pronto para os playoffs.'}
            </p>
            <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.84rem', maxWidth: 560, margin: 0 }}>
              Acompanhe sua posição, veja o andamento do bracket e entre nos palpites mais importantes antes do bloqueio.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignSelf: 'start' }}>
            <div style={{ background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>Minha posição</div>
              <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '2rem', lineHeight: 1.05 }}>
                {myEntry ? `#${myEntry.rank}` : '—'}
              </div>
            </div>
            <div style={{ background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>Meus pontos</div>
              <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '2rem', lineHeight: 1.05 }}>
                {myEntry?.total_points ?? 0}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12, alignItems: 'start' }} className="md:grid-cols-[1.1fr_1fr]">
          <div style={{ background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <span style={{ color: 'var(--nba-text)', fontWeight: 600, fontSize: '0.88rem' }}>Progresso do bracket</span>
              <span className="font-condensed font-bold" style={{ color: progress === 100 ? 'var(--nba-success)' : 'var(--nba-gold)' }}>
                {progress}%
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 8 }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: progress === 100 ? 'linear-gradient(90deg, #2ecc71, #7ae6a5)' : 'linear-gradient(90deg, var(--nba-gold), var(--nba-gold-light))',
                }}
              />
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem' }}>
              {pickedSeries} de {readySeries} séries definidas preenchidas.
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {actions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  background: 'rgba(12,12,18,0.34)',
                  border: '1px solid rgba(200,150,60,0.16)',
                  color: 'var(--nba-text)',
                }}
              >
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem' }}>{action.label}</span>
                  <span style={{ display: 'block', color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 1 }}>
                    {action.sublabel}
                  </span>
                </span>
                <ChevronRight size={16} style={{ color: 'var(--nba-text-muted)', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function PanelPulseBar({
  readySeries,
  pickedSeries,
  myRank,
}: {
  readySeries: number
  pickedSeries: number
  myRank?: number
}) {
  const pending = Math.max(readySeries - pickedSeries, 0)

  return (
    <section
      style={{
        display: 'grid',
        gap: 10,
        padding: '0.85rem 1rem',
        borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(200,150,60,0.10), rgba(74,144,217,0.06) 55%, rgba(19,19,26,1) 100%)',
        border: '1px solid rgba(200,150,60,0.18)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--nba-gold)', display: 'flex' }}>
            <Target size={14} />
          </span>
          <span className="font-condensed" style={{ color: 'var(--nba-gold)', fontSize: '0.76rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Pulso do dia
          </span>
        </div>
        <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
          Home focada em ação; radar completo segue em Análise
        </span>
      </div>

      <div style={{ display: 'grid', gap: 10 }} className="sm:grid-cols-3">
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.14)' }}>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Prontas para palpitar</div>
          <div className="font-condensed font-bold" style={{ color: readySeries > 0 ? 'var(--nba-text)' : 'var(--nba-text-muted)', fontSize: '1.25rem', lineHeight: 1 }}>
            {readySeries}
          </div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.14)' }}>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Pedindo ação</div>
          <div className="font-condensed font-bold" style={{ color: pending > 0 ? 'var(--nba-gold)' : 'var(--nba-success)', fontSize: '1.25rem', lineHeight: 1 }}>
            {pending}
          </div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.14)' }}>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Minha posição agora</div>
          <div className="font-condensed font-bold" style={{ color: myRank != null ? 'var(--nba-gold)' : 'var(--nba-text-muted)', fontSize: '1.25rem', lineHeight: 1 }}>
            {myRank != null ? `#${myRank}` : '—'}
          </div>
        </div>
      </div>
    </section>
  )
}

function MyMomentCard({
  myEntry,
  readySeries,
  pickedSeries,
  totalSeries,
  leaderPoints,
}: {
  myEntry?: { rank: number; total_points: number; participant_name: string }
  readySeries: number
  pickedSeries: number
  totalSeries: number
  leaderPoints: number
}) {
  const missingReady = Math.max(readySeries - pickedSeries, 0)
  const gapToLeader = myEntry ? Math.max(leaderPoints - myEntry.total_points, 0) : null

  const primaryAction =
    missingReady > 0
      ? { to: '/bracket', label: 'Fechar meus palpites', description: `${missingReady} série${missingReady !== 1 ? 's' : ''} pronta${missingReady !== 1 ? 's' : ''} sem pick`, tone: 'var(--nba-gold)' }
      : myEntry && myEntry.rank > 1
      ? { to: '/ranking', label: 'Caçar o líder', description: `${gapToLeader ?? 0} ponto${gapToLeader === 1 ? '' : 's'} para empatar`, tone: 'var(--nba-east)' }
      : { to: '/games', label: 'Ver jogos do dia', description: 'Acompanhar os próximos movimentos do bolão', tone: 'var(--nba-success)' }

  return (
    <section style={{ ...card, background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(74,144,217,0.10) 45%, rgba(200,150,60,0.10) 100%)', border: '1px solid rgba(200,150,60,0.18)' }}>
      <CardTitle icon={<Sparkles size={14} />}>Seu Momento Agora</CardTitle>

      <div style={{ display: 'grid', gap: 10 }} className="sm:grid-cols-3">
        {[
          { label: 'Séries prontas', value: String(readySeries), tone: 'var(--nba-text)' },
          { label: 'Faltando palpitar', value: String(missingReady), tone: missingReady > 0 ? 'var(--nba-gold)' : 'var(--nba-success)' },
          { label: 'Distância do líder', value: myEntry ? String(gapToLeader ?? 0) : '—', tone: 'var(--nba-east)' },
        ].map((item) => (
          <div key={item.label} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.14)' }}>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>{item.label}</div>
            <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.35rem', lineHeight: 1 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(12,12,18,0.42)', border: '1px solid rgba(200,150,60,0.16)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div className="font-condensed font-bold" style={{ color: primaryAction.tone, fontSize: '1rem', lineHeight: 1 }}>
              {primaryAction.label}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', marginTop: 4 }}>
              {primaryAction.description}
            </div>
          </div>

          <Link to={primaryAction.to} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, textDecoration: 'none', color: 'var(--nba-text)', border: '1px solid rgba(200,150,60,0.18)', background: 'rgba(28,28,38,0.9)', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
            Abrir
            <ChevronRight size={15} />
          </Link>
        </div>

        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 10 }}>
          Progresso útil agora: {pickedSeries}/{readySeries || totalSeries} séries prontas preenchidas.
        </div>
      </div>
    </section>
  )
}

function RankingCard({
  ranking,
  loading,
  highlightId,
}: {
  ranking: ReturnType<typeof useRanking>['ranking']
  loading: boolean
  highlightId: string
}) {
  const top5 = ranking.slice(0, 5)

  return (
    <div style={card}>
      <CardTitle icon={<Trophy size={14} />}>Ranking Geral</CardTitle>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
          <LoadingBasketball size={20} />
        </div>
      ) : (
        <div>
          {top5.map((e, i) => {
            const isMe = e.participant_id === highlightId
            const diff = e.prev_rank != null ? e.prev_rank - e.rank : null
            return (
              <div key={e.participant_id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 6px', borderRadius: 6, background: isMe ? 'var(--nba-surface-2)' : 'transparent', fontSize: '0.85rem' }}>
                  <span className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', width: 20, textAlign: 'center', flexShrink: 0 }}>
                    {e.rank}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isMe ? 'var(--nba-gold)' : 'var(--nba-text)', fontWeight: isMe ? 600 : 400 }}>
                    {e.participant_name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {diff !== null && <RankArrow diff={diff} />}
                    <span className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '0.9rem' }}>
                      {e.total_points}
                    </span>
                  </div>
                </div>
                {i < top5.length - 1 && <Divider />}
              </div>
            )
          })}
        </div>
      )}

      <Link to="/ranking" style={{ display: 'block', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--nba-border)', textAlign: 'center', fontSize: '0.78rem', color: 'var(--nba-text-muted)' }}>
        Ver ranking completo →
      </Link>
    </div>
  )
}

function StatsGrid({
  participantCount,
  completedSeries,
  totalSeries,
  myEntry,
}: {
  participantCount: number
  completedSeries: number
  totalSeries: number
  myEntry?: { rank: number; total_points: number }
}) {
  const stats = [
    { icon: <Users size={18} />, label: 'Participantes', value: String(participantCount), gold: false },
    { icon: <Trophy size={18} />, label: 'Séries Concluídas', value: `${completedSeries}/${totalSeries || 15}`, gold: false },
    { icon: <Target size={18} />, label: 'Minha Posição', value: myEntry ? `#${myEntry.rank}` : '—', gold: true },
    { icon: <Star size={18} />, label: 'Meus Pontos', value: myEntry ? String(myEntry.total_points) : '—', gold: false },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {stats.map(({ icon, label, value, gold }) => (
        <div key={label} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: '0.85rem' }}>
          <span style={{ color: 'var(--nba-gold)', flexShrink: 0, display: 'flex' }}>{icon}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem', lineHeight: 1.2 }}>{label}</div>
            <div className="font-condensed font-bold" style={{ color: gold ? 'var(--nba-gold)' : 'var(--nba-text)', fontSize: '1.4rem', lineHeight: 1.2 }}>
              {value}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function RecentSeriesCard({ series }: { series: ReturnType<typeof useSeries>['series'] }) {
  const completed = series.filter((s) => s.is_complete).slice(-5).reverse()

  return (
    <div style={card}>
      <CardTitle>Séries Recentes</CardTitle>

      {completed.length === 0 ? (
        <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.85rem' }}>Nenhuma série encerrada ainda.</p>
      ) : (
        <div>
          {completed.map((s, i) => {
            const winner = s.winner ?? s.home_team
            const loser = s.winner?.id === s.home_team?.id ? s.away_team : s.home_team
            const label = `${s.conference ?? ''} ${ROUND_LABEL[s.round] ?? ''}`.trim()
            const loses = s.games_played - 4

            return (
              <div key={s.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 6px', borderRadius: 6, fontSize: '0.85rem' }}>
                  <span className="font-condensed" style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {label}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="font-condensed font-bold" style={{ color: winner?.primary_color ?? 'var(--nba-text)' }}>
                      {winner?.abbreviation ?? '?'}
                    </span>
                    <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.78rem' }}>4-{loses}</span>
                    <span style={{ color: 'var(--nba-text-muted)' }}>{loser?.abbreviation ?? '?'}</span>
                  </span>
                </div>
                {i < completed.length - 1 && <Divider />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function OfficialBracketCard({ series }: { series: ReturnType<typeof useSeries>['series'] }) {
  const completedSeries = series.filter((item) => item.is_complete).length
  const openSeries = Math.max(series.length - completedSeries, 0)
  const finals = series.find((item) => item.id === 'FIN')
  const championLabel = finals?.is_complete ? finals.winner?.abbreviation ?? finals.winner_id ?? 'Definido' : 'Em disputa'

  const spotlightSeries = [...series]
    .filter((item) => item.round >= 3)
    .sort((left, right) => {
      if (left.round !== right.round) return right.round - left.round
      return left.id.localeCompare(right.id)
    })
    .slice(0, 2)

  return (
    <div style={{ ...card, background: 'linear-gradient(135deg, rgba(224,92,58,0.12), rgba(200,150,60,0.08) 55%, rgba(19,19,26,1) 100%)', border: '1px solid rgba(200,150,60,0.18)' }}>
      <CardTitle icon={<Trophy size={14} />}>Resultados reais</CardTitle>

      <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', marginBottom: 14 }}>
        Acompanhe a chave oficial dos playoffs e veja como os confrontos estão avançando na vida real.
      </p>

      <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 sm:grid-cols-3">
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)' }}>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>Séries concluídas</div>
          <div className="font-condensed font-bold" style={{ color: 'var(--nba-success)', fontSize: '1.45rem', lineHeight: 1.1 }}>
            {completedSeries}
          </div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)' }}>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>Em aberto</div>
          <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '1.45rem', lineHeight: 1.1 }}>
            {openSeries}
          </div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)' }}>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>Campeão atual</div>
          <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1.45rem', lineHeight: 1.1 }}>
            {championLabel}
          </div>
        </div>
      </div>

      {spotlightSeries.length > 0 && (
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }} className="sm:grid-cols-2">
          {spotlightSeries.map((item) => (
            <div key={item.id} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)' }}>
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>
                {item.conference ?? 'NBA'} {ROUND_LABEL[item.round] ?? ''}
              </div>
              <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1rem', lineHeight: 1 }}>
                {item.home_team?.abbreviation ?? item.home_team_id ?? '—'} vs {item.away_team?.abbreviation ?? item.away_team_id ?? '—'}
              </div>
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', marginTop: 6 }}>
                {item.is_complete ? `Vencedor: ${item.winner?.abbreviation ?? item.winner_id ?? '—'}` : 'Confronto em andamento'}
              </div>
            </div>
          ))}
        </div>
      )}

      <Link to="/official" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '10px 14px', borderRadius: 10, textDecoration: 'none', background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)', color: 'var(--nba-gold)', fontWeight: 700, fontSize: '0.82rem' }}>
        Acompanhar playoffs
        <ChevronRight size={15} />
      </Link>
    </div>
  )
}

function MyPicksCard({ series, picks }: { series: ReturnType<typeof useSeries>['series']; picks: ReturnType<typeof useSeries>['picks'] }) {
  const recent = [...picks].slice(-3).reverse().map((p) => {
    const s = series.find((sr) => sr.id === p.series_id)
    const pickedTeam = s?.home_team?.id === p.winner_id ? s?.home_team : s?.away_team
    const status = s?.is_complete ? (p.winner_id === s?.winner_id ? 'Acertou' : 'Errou') : 'Aguarda'
    const color = s?.is_complete ? (p.winner_id === s?.winner_id ? 'var(--nba-success)' : 'var(--nba-danger)') : 'var(--nba-text-muted)'
    return { pick: p, series: s, pickedTeam, status, color }
  })

  const completedSeries = picks.filter((pick) => {
    const currentSeries = series.find((item) => item.id === pick.series_id)
    return !!currentSeries?.is_complete
  }).length
  const pendingSeries = Math.max(picks.length - completedSeries, 0)

  return (
    <div style={card}>
      <CardTitle>Meus Palpites</CardTitle>

      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }} className="grid-cols-2">
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.14)' }}>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Palpites salvos</div>
          <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1.25rem', lineHeight: 1 }}>
            {picks.length}
          </div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.14)' }}>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Ainda em aberto</div>
          <div className="font-condensed font-bold" style={{ color: pendingSeries > 0 ? 'var(--nba-gold)' : 'var(--nba-success)', fontSize: '1.25rem', lineHeight: 1 }}>
            {pendingSeries}
          </div>
        </div>
      </div>

      {recent.length === 0 ? (
        <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.85rem' }}>
          Nenhum palpite registrado. <Link to="/bracket" style={{ color: 'var(--nba-gold)' }}>Palpitar →</Link>
        </p>
      ) : (
        <div>
          {recent.map(({ pick, series: s, pickedTeam, status, color }, i) => (
            <div key={pick.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderRadius: 6, fontSize: '0.85rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-condensed font-bold" style={{ color: pickedTeam?.primary_color ?? 'var(--nba-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pickedTeam?.abbreviation ?? '?'}
                  </div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
                    {s ? `${s.conference ?? ''} ${ROUND_LABEL[s.round] ?? ''}`.trim() : '—'}
                  </div>
                </div>
                <span style={{ color, fontSize: '0.72rem', fontWeight: 700 }}>{status}</span>
              </div>
              {i < recent.length - 1 && <Divider />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HomeQuickDeck() {
  return (
    <div style={{ ...card, background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(74,144,217,0.08) 48%, rgba(200,150,60,0.08) 100%)' }}>
      <CardTitle icon={<Sparkles size={14} />}>Acessos Rápidos</CardTitle>
      <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem', lineHeight: 1.45, margin: '0 0 12px' }}>
        Atalhos para continuar a rodada sem procurar rota no menu. A ideia aqui é sair da Home já sabendo o próximo clique.
      </p>
      <div style={{ display: 'grid', gap: 10 }} className="sm:grid-cols-3">
        <Link
          to="/games"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '11px 14px',
            borderRadius: 10,
            textDecoration: 'none',
            color: 'var(--nba-text)',
            border: '1px solid rgba(46,204,113,0.18)',
            background: 'rgba(46,204,113,0.06)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <Clock size={15} style={{ color: 'var(--nba-success)', flexShrink: 0 }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem' }}>Ir para Jogos</span>
              <span style={{ display: 'block', color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>travar picks e acompanhar o dia</span>
            </span>
          </span>
          <ChevronRight size={15} style={{ flexShrink: 0, color: 'var(--nba-text-muted)' }} />
        </Link>

        <Link
          to="/analysis"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '11px 14px',
            borderRadius: 10,
            textDecoration: 'none',
            color: 'var(--nba-text)',
            border: '1px solid rgba(200,150,60,0.18)',
            background: 'rgba(28,28,38,0.9)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <AlertTriangle size={15} style={{ color: 'var(--nba-gold)', flexShrink: 0 }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem' }}>Abrir Análise</span>
              <span style={{ display: 'block', color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>odds, lesões e radar da rodada</span>
            </span>
          </span>
          <ChevronRight size={15} style={{ flexShrink: 0, color: 'var(--nba-text-muted)' }} />
        </Link>
        <Link
          to="/compare"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '11px 14px',
            borderRadius: 10,
            textDecoration: 'none',
            color: 'var(--nba-text)',
            border: '1px solid rgba(74,144,217,0.2)',
            background: 'rgba(74,144,217,0.08)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <ArrowLeftRight size={15} style={{ color: 'var(--nba-east)', flexShrink: 0 }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem' }}>Comparar brackets</span>
              <span style={{ display: 'block', color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>veja lado a lado os palpites da galera</span>
            </span>
          </span>
          <ChevronRight size={15} style={{ flexShrink: 0, color: 'var(--nba-text-muted)' }} />
        </Link>
      </div>
    </div>
  )
}

export function Home({ participantId }: Props) {
  const { ranking, loading: rankLoading } = useRanking()
  const { series, picks } = useSeries(participantId)
  const { recentCompletedGames, upcomingGames, hasRealGames } = useGameFeed()

  const myEntry = ranking.find((r) => r.participant_id === participantId)
  const leader = ranking[0]
  const completedSeries = series.filter((s) => s.is_complete).length
  const readySeries = series.filter(isSeriesReadyForPick)
  const readySeriesIds = new Set(readySeries.map((item) => item.id))
  const pickedSeries = picks.filter((pick) => readySeriesIds.has(pick.series_id)).length

  return (
    <div className="pb-24 pt-4 px-4 mx-auto grid gap-4 xl:gap-5 grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_320px]" style={{ maxWidth: 1420 }}>
      <div className="hidden xl:flex xl:flex-col xl:gap-4">
        <RankingCard ranking={ranking} loading={rankLoading} highlightId={participantId} />
        <StatsGrid participantCount={ranking.length} completedSeries={completedSeries} totalSeries={series.length} myEntry={myEntry} />
      </div>

      <div className="flex flex-col gap-4 min-w-0">
        <LastNightRecap games={recentCompletedGames} upcomingGames={upcomingGames} isRealData={hasRealGames && recentCompletedGames.length > 0} />
        <HeroPanel myEntry={myEntry} pickedSeries={pickedSeries} readySeries={readySeries.length} />
        <PanelPulseBar readySeries={readySeries.length} pickedSeries={pickedSeries} myRank={myEntry?.rank} />
        <MyMomentCard myEntry={myEntry} readySeries={readySeries.length} pickedSeries={pickedSeries} totalSeries={series.length} leaderPoints={leader?.total_points ?? 0} />
        <HomeQuickDeck />

        <div className="xl:hidden flex flex-col gap-4">
          <MyPicksCard series={series} picks={picks} />
          <RankingCard ranking={ranking} loading={rankLoading} highlightId={participantId} />
          <StatsGrid participantCount={ranking.length} completedSeries={completedSeries} totalSeries={series.length} myEntry={myEntry} />
          <RecentSeriesCard series={series} />
        </div>

        <OfficialBracketCard series={series} />
      </div>

      <div className="hidden xl:flex xl:flex-col xl:gap-4 min-w-0">
        <MyPicksCard series={series} picks={picks} />
        <RecentSeriesCard series={series} />
      </div>
    </div>
  )
}
