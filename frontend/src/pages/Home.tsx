import { Link } from 'react-router-dom'
import {
  ArrowUp, ArrowDown, Minus, Trophy, Users, Target,
  AlertTriangle, Clock, TrendingUp, Star, ChevronRight, Sparkles, GitBranch, BarChart3,
} from 'lucide-react'
import { useRanking } from '../hooks/useRanking'
import { useSeries } from '../hooks/useSeries'

interface Props {
  participantId: string
}

// ─── Simulated static data ────────────────────────────────────────────────────

type InjuryStatus = 'out' | 'questionable' | 'probable' | 'available'

const INJURIES: { player: string; team: string; status: InjuryStatus; detail: string }[] = [
  { player: 'Nikola Jokic',              team: 'DEN', status: 'questionable', detail: 'Joelho direito' },
  { player: 'Victor Wembanyama',         team: 'SAS', status: 'probable',     detail: 'Fadiga' },
  { player: 'Jayson Tatum',              team: 'BOS', status: 'available',    detail: 'Retorno confirmado' },
  { player: 'LeBron James',              team: 'LAL', status: 'questionable', detail: 'Tornozelo' },
  { player: 'Shai Gilgeous-Alexander',   team: 'OKC', status: 'available',    detail: '' },
]

const NEXT_GAMES = [
  { home: 'OKC', away: 'IND', date: '18/04', time: '21:30', round: 'Finals' },
  { home: 'BOS', away: 'NYK', date: '19/04', time: '15:00', round: 'R1'     },
  { home: 'DEN', away: 'MIN', date: '19/04', time: '17:30', round: 'R1'     },
  { home: 'NYK', away: 'DET', date: '20/04', time: '14:00', round: 'R1'     },
  { home: 'GSW', away: 'HOU', date: '20/04', time: '18:00', round: 'R1'     },
]

const ODDS = [
  { abbr: 'OKC', name: 'Thunder', odds: '+180', favorite: true,  color: '#007AC1' },
  { abbr: 'BOS', name: 'Celtics', odds: '+220', favorite: true,  color: '#007A33' },
  { abbr: 'DET', name: 'Pistons', odds: '+300', favorite: false, color: '#C8102E' },
  { abbr: 'SAS', name: 'Spurs',   odds: '+350', favorite: false, color: '#C4CED4' },
  { abbr: 'DEN', name: 'Nuggets', odds: '+400', favorite: false, color: '#FEC524' },
]

const INJURY_META: Record<InjuryStatus, { label: string; color: string }> = {
  out:          { label: 'Out',          color: '#e74c3c' },
  questionable: { label: 'Questionável', color: '#f39c12' },
  probable:     { label: 'Provável',     color: '#27ae60' },
  available:    { label: 'Disponível',   color: '#2ecc71' },
}

const ROUND_BADGE_COLOR: Record<string, string> = {
  Finals: 'var(--nba-gold)',
  R1:     '#4a90d9',
  R2:     '#9b59b6',
  CF:     '#e05c3a',
}

const ROUND_LABEL: Record<number, string> = { 1: 'R1', 2: 'R2', 3: 'CF', 4: 'Finals' }

const MEDALS = [
  { emoji: '🥇', size: '2.8rem', color: '#FFD700', bgAlpha: '15' },
  { emoji: '🥈', size: '2rem',   color: '#C0C0C0', bgAlpha: '10' },
  { emoji: '🥉', size: '2rem',   color: '#CD7F32', bgAlpha: '10' },
]

// ─── Shared primitives ────────────────────────────────────────────────────────

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
      <h2
        className="title"
        style={{ color: 'var(--nba-gold)', fontSize: '1rem', letterSpacing: '0.1em', lineHeight: 1 }}
      >
        {children}
      </h2>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--nba-border)' }} />
}

function Badge({
  label,
  color,
  small,
}: {
  label: string
  color: string
  small?: boolean
}) {
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
  return (
    <p
      style={{
        color: 'var(--nba-text-muted)',
        fontSize: '0.68rem',
        marginTop: 8,
        lineHeight: 1.4,
      }}
    >
      {children}
    </p>
  )
}

function RankArrow({ diff }: { diff: number }) {
  if (diff > 0) return <ArrowUp size={10} style={{ color: 'var(--nba-success)', flexShrink: 0 }} />
  if (diff < 0) return <ArrowDown size={10} style={{ color: 'var(--nba-danger)', flexShrink: 0 }} />
  return <Minus size={10} style={{ color: 'var(--nba-text-muted)', flexShrink: 0 }} />
}

function HeroPanel({
  myEntry,
  pickedSeries,
  totalSeries,
}: {
  myEntry?: { rank: number; total_points: number; participant_name: string }
  pickedSeries: number
  totalSeries: number
}) {
  const progress = totalSeries > 0 ? Math.round((pickedSeries / totalSeries) * 100) : 0

  const actions = [
    {
      to: '/bracket',
      label: 'Completar bracket',
      sublabel: `${pickedSeries}/${totalSeries || 15} séries palpitadas`,
      icon: <GitBranch size={16} />,
    },
    {
      to: '/games',
      label: 'Ver jogos',
      sublabel: 'Acompanhe os próximos palpites',
      icon: <Clock size={16} />,
    },
    {
      to: '/ranking',
      label: 'Abrir ranking',
      sublabel: 'Confira sua posição no bolão',
      icon: <BarChart3 size={16} />,
    },
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
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at top right, rgba(232,180,90,0.18), transparent 34%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nba-gold)' }}>
          <Sparkles size={15} />
          <span
            className="font-condensed"
            style={{ fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            Painel do participante
          </span>
        </div>

        <div style={{ display: 'grid', gap: 12 }} className="md:grid-cols-[1.4fr_1fr]">
          <div>
            <h1
              className="title"
              style={{ color: 'var(--nba-gold)', fontSize: 'clamp(2.5rem, 6vw, 3.6rem)', lineHeight: 0.95, margin: 0 }}
            >
              Bolão NBA 2026
            </h1>
            <p style={{ color: 'var(--nba-text)', fontSize: '1rem', margin: '10px 0 6px' }}>
              {myEntry
                ? `${myEntry.participant_name.split(' ')[0]}, você está no jogo.`
                : 'Seu painel está pronto para os playoffs.'}
            </p>
            <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.84rem', maxWidth: 560, margin: 0 }}>
              Acompanhe sua posição, veja o andamento do bracket e entre nos palpites mais importantes antes do bloqueio.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              alignSelf: 'start',
            }}
          >
            <div
              style={{
                background: 'rgba(12,12,18,0.34)',
                border: '1px solid rgba(200,150,60,0.16)',
                borderRadius: 10,
                padding: '12px 14px',
              }}
            >
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>Minha posição</div>
              <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '2rem', lineHeight: 1.05 }}>
                {myEntry ? `#${myEntry.rank}` : '—'}
              </div>
            </div>
            <div
              style={{
                background: 'rgba(12,12,18,0.34)',
                border: '1px solid rgba(200,150,60,0.16)',
                borderRadius: 10,
                padding: '12px 14px',
              }}
            >
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>Meus pontos</div>
              <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '2rem', lineHeight: 1.05 }}>
                {myEntry?.total_points ?? 0}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 12,
            alignItems: 'start',
          }}
          className="md:grid-cols-[1.1fr_1fr]"
        >
          <div
            style={{
              background: 'rgba(12,12,18,0.34)',
              border: '1px solid rgba(200,150,60,0.16)',
              borderRadius: 10,
              padding: '12px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <span style={{ color: 'var(--nba-text)', fontWeight: 600, fontSize: '0.88rem' }}>Progresso do bracket</span>
              <span className="font-condensed font-bold" style={{ color: progress === 100 ? 'var(--nba-success)' : 'var(--nba-gold)' }}>
                {progress}%
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: progress === 100
                    ? 'linear-gradient(90deg, #2ecc71, #7ae6a5)'
                    : 'linear-gradient(90deg, var(--nba-gold), var(--nba-gold-light))',
                }}
              />
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem' }}>
              {pickedSeries} de {totalSeries || 15} séries preenchidas.
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
                  transition: 'transform 0.15s ease, border-color 0.15s ease, background 0.15s ease',
                }}
                onMouseEnter={(ev) => {
                  ev.currentTarget.style.transform = 'translateY(-1px)'
                  ev.currentTarget.style.borderColor = 'rgba(200,150,60,0.35)'
                  ev.currentTarget.style.background = 'rgba(28,28,38,0.9)'
                }}
                onMouseLeave={(ev) => {
                  ev.currentTarget.style.transform = 'translateY(0)'
                  ev.currentTarget.style.borderColor = 'rgba(200,150,60,0.16)'
                  ev.currentTarget.style.background = 'rgba(12,12,18,0.34)'
                }}
              >
                <span style={{ color: 'var(--nba-gold)', display: 'flex', flexShrink: 0 }}>{action.icon}</span>
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

// ─── Cards ────────────────────────────────────────────────────────────────────

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
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--nba-gold)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div>
          {top5.map((e, i) => {
            const isMe = e.participant_id === highlightId
            const diff = e.prev_rank != null ? e.prev_rank - e.rank : null
            return (
              <div key={e.participant_id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 6px',
                    borderRadius: 6,
                    background: isMe ? 'var(--nba-surface-2)' : 'transparent',
                    fontSize: '0.85rem',
                    transition: 'background 0.15s',
                    cursor: 'default',
                  }}
                  onMouseEnter={(ev) => {
                    if (!isMe) ev.currentTarget.style.background = 'var(--nba-surface-2)'
                  }}
                  onMouseLeave={(ev) => {
                    if (!isMe) ev.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span
                    className="font-condensed font-bold"
                    style={{ color: 'var(--nba-gold)', width: 20, textAlign: 'center', flexShrink: 0 }}
                  >
                    {e.rank}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: isMe ? 'var(--nba-gold)' : 'var(--nba-text)',
                      fontWeight: isMe ? 600 : 400,
                    }}
                  >
                    {e.participant_name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {diff !== null && <RankArrow diff={diff} />}
                    <span
                      className="font-condensed font-bold"
                      style={{ color: 'var(--nba-gold)', fontSize: '0.9rem' }}
                    >
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

      <Link
        to="/ranking"
        style={{
          display: 'block',
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px solid var(--nba-border)',
          textAlign: 'center',
          fontSize: '0.78rem',
          color: 'var(--nba-text-muted)',
          transition: 'color 0.15s',
          fontFamily: 'var(--font-condensed, sans-serif)',
          letterSpacing: '0.05em',
        }}
        onMouseEnter={(ev) => { ev.currentTarget.style.color = 'var(--nba-gold)' }}
        onMouseLeave={(ev) => { ev.currentTarget.style.color = 'var(--nba-text-muted)' }}
      >
        Ver ranking completo →
      </Link>
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
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 4px',
                  borderRadius: 6,
                  transition: 'background 0.15s',
                  cursor: 'default',
                }}
                onMouseEnter={(ev) => { ev.currentTarget.style.background = 'var(--nba-surface-2)' }}
                onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: 'var(--nba-text)',
                      fontWeight: 600,
                      fontSize: '0.83rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
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
      <SimNote>Atualizado simulado — integração real em breve</SimNote>
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
    { icon: <Users size={18} />,   label: 'Participantes',    value: String(participantCount),                   gold: false },
    { icon: <Trophy size={18} />,  label: 'Séries Concluídas', value: `${completedSeries}/${totalSeries || 15}`, gold: false },
    { icon: <Target size={18} />,  label: 'Minha Posição',    value: myEntry ? `#${myEntry.rank}` : '—',         gold: true  },
    { icon: <Star size={18} />,    label: 'Meus Pontos',      value: myEntry ? String(myEntry.total_points) : '—', gold: false },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {stats.map(({ icon, label, value, gold }) => (
        <div
          key={label}
          style={{
            ...card,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0.85rem',
          }}
        >
          <span style={{ color: 'var(--nba-gold)', flexShrink: 0, display: 'flex' }}>{icon}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem', lineHeight: 1.2 }}>{label}</div>
            <div
              className="font-condensed font-bold"
              style={{ color: gold ? 'var(--nba-gold)' : 'var(--nba-text)', fontSize: '1.4rem', lineHeight: 1.2 }}
            >
              {value}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PodiumCard({
  ranking,
  loading,
  highlightId,
}: {
  ranking: ReturnType<typeof useRanking>['ranking']
  loading: boolean
  highlightId: string
}) {
  const top3 = ranking.slice(0, 3)

  return (
    <div style={card}>
      <CardTitle icon={<Trophy size={14} />}>Pódio</CardTitle>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <div
            className="w-6 h-6 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--nba-gold)', borderTopColor: 'transparent' }}
          />
        </div>
      ) : top3.length === 0 ? (
        <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.85rem' }}>Sem dados ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {top3.map((e, i) => {
            const medal = MEDALS[i]
            const diff = e.prev_rank != null ? e.prev_rank - e.rank : null
            const isMe = e.participant_id === highlightId
            const isFirst = i === 0

            return (
              <div
                key={e.participant_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: isFirst ? '14px 12px' : '10px 12px',
                  borderRadius: 8,
                  background: isFirst
                    ? `${medal.color}${medal.bgAlpha}`
                    : isMe
                    ? 'var(--nba-surface-2)'
                    : 'var(--nba-surface-2)',
                  border: isFirst
                    ? `1px solid ${medal.color}33`
                    : '1px solid transparent',
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Medal */}
                <span
                  style={{
                    fontSize: medal.size,
                    lineHeight: 1,
                    userSelect: 'none',
                    flexShrink: 0,
                    filter: isFirst ? 'drop-shadow(0 0 8px rgba(255,215,0,0.4))' : undefined,
                  }}
                >
                  {medal.emoji}
                </span>

                {/* Name + cravadas */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      color: isFirst ? 'var(--nba-gold)' : isMe ? 'var(--nba-gold)' : 'var(--nba-text)',
                      fontWeight: 600,
                      fontSize: isFirst ? '1.05rem' : '0.9rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.participant_name}
                    </span>
                    {diff !== null && <RankArrow diff={diff} />}
                  </div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 2 }}>
                    {e.cravadas} cravada{e.cravadas !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Points */}
                <div
                  className="font-condensed font-bold"
                  style={{
                    color: 'var(--nba-gold)',
                    fontSize: isFirst ? '1.75rem' : '1.35rem',
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  {e.total_points}
                  <span style={{ fontSize: '0.65rem', color: 'var(--nba-text-muted)', marginLeft: 2 }}>pts</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RecentSeriesCard({ series }: { series: ReturnType<typeof useSeries>['series'] }) {
  const completed = series.filter((s) => s.is_complete).slice(-5).reverse()

  return (
    <div style={card}>
      <CardTitle>Séries Recentes</CardTitle>

      {completed.length === 0 ? (
        <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.85rem' }}>
          Nenhuma série encerrada ainda.
        </p>
      ) : (
        <div>
          {completed.map((s, i) => {
            const winner = s.winner ?? s.home_team
            const loser = s.winner?.id === s.home_team?.id ? s.away_team : s.home_team
            const label = `${s.conference ?? ''} ${ROUND_LABEL[s.round] ?? ''}`.trim()
            const loses = s.games_played - 4

            return (
              <div key={s.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 6px',
                    borderRadius: 6,
                    fontSize: '0.85rem',
                    transition: 'background 0.15s',
                    cursor: 'default',
                  }}
                  onMouseEnter={(ev) => { ev.currentTarget.style.background = 'var(--nba-surface-2)' }}
                  onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent' }}
                >
                  <span
                    className="font-condensed"
                    style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                  >
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

function NextGamesCard() {
  const featured = NEXT_GAMES[0]

  return (
    <div style={card}>
      <CardTitle icon={<Clock size={14} />}>Próximos Jogos</CardTitle>

      {featured && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(74,144,217,0.16), rgba(200,150,60,0.08))',
            border: '1px solid rgba(200,150,60,0.14)',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 12,
          }}
        >
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
            Ir para palpites
            <ChevronRight size={14} />
          </Link>
        </div>
      )}

      <div>
        {NEXT_GAMES.map((g, i) => {
          const color = ROUND_BADGE_COLOR[g.round] ?? '#888'
          return (
            <div key={i}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 4px',
                  borderRadius: 6,
                  fontSize: '0.85rem',
                  transition: 'background 0.15s',
                  cursor: 'default',
                }}
                onMouseEnter={(ev) => { ev.currentTarget.style.background = 'var(--nba-surface-2)' }}
                onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.9rem' }}>
                    {g.home}{' '}
                    <span style={{ color: 'var(--nba-text-muted)', fontWeight: 400 }}>vs</span>{' '}
                    {g.away}
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
      <SimNote>Jogos reais sincronizados automaticamente</SimNote>
    </div>
  )
}

function OddsCard() {
  return (
    <div style={card}>
      <CardTitle icon={<TrendingUp size={14} />}>Favoritos ao Título</CardTitle>

      <div>
        {ODDS.map((o, i) => (
          <div key={o.abbr}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 4px',
                borderRadius: 6,
                fontSize: '0.85rem',
                transition: 'background 0.15s',
                cursor: 'default',
              }}
              onMouseEnter={(ev) => { ev.currentTarget.style.background = 'var(--nba-surface-2)' }}
              onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent' }}
            >
              <span
                className="font-condensed font-bold"
                style={{ color: o.color, width: 32, textAlign: 'center', flexShrink: 0, fontSize: '0.85rem' }}
              >
                {o.abbr}
              </span>
              <span style={{ flex: 1, color: 'var(--nba-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {o.name}
              </span>
              {o.favorite && (
                <Star size={10} fill="currentColor" style={{ color: 'var(--nba-gold)', flexShrink: 0 }} />
              )}
              <span
                className="font-condensed font-bold"
                style={{
                  color: o.favorite ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
                  flexShrink: 0,
                  fontSize: '0.88rem',
                }}
              >
                {o.odds}
              </span>
            </div>
            {i < ODDS.length - 1 && <Divider />}
          </div>
        ))}
      </div>
      <SimNote>Odds simuladas — integração real em breve</SimNote>
    </div>
  )
}

function MyPicksCard({
  series,
  picks,
}: {
  series: ReturnType<typeof useSeries>['series']
  picks: ReturnType<typeof useSeries>['picks']
}) {
  const STATUS_STYLE = {
    correct: { label: 'Acertou', color: 'var(--nba-success)' },
    wrong:   { label: 'Errou',   color: 'var(--nba-danger)'  },
    pending: { label: 'Aguarda', color: 'var(--nba-text-muted)' },
  } as const

  const recent = [...picks].slice(-3).reverse().map((p) => {
    const s = series.find((sr) => sr.id === p.series_id)
    const pickedTeam = s?.home_team?.id === p.winner_id ? s?.home_team : s?.away_team
    const status: keyof typeof STATUS_STYLE = s?.is_complete
      ? p.winner_id === s?.winner_id ? 'correct' : 'wrong'
      : 'pending'
    return { pick: p, series: s, pickedTeam, status }
  })

  return (
    <div style={card}>
      <CardTitle>Meus Palpites</CardTitle>

      {recent.length === 0 ? (
        <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.85rem' }}>
          Nenhum palpite registrado.{' '}
          <Link to="/bracket" style={{ color: 'var(--nba-gold)' }}>
            Palpitar →
          </Link>
        </p>
      ) : (
        <div>
          {recent.map(({ pick, series: s, pickedTeam, status }, i) => {
            const { label, color } = STATUS_STYLE[status]
            return (
              <div key={pick.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 4px',
                    borderRadius: 6,
                    fontSize: '0.85rem',
                    transition: 'background 0.15s',
                    cursor: 'default',
                  }}
                  onMouseEnter={(ev) => { ev.currentTarget.style.background = 'var(--nba-surface-2)' }}
                  onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="font-condensed font-bold"
                      style={{
                        color: pickedTeam?.primary_color ?? 'var(--nba-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {pickedTeam?.abbreviation ?? '?'}
                    </div>
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
                      {s ? `${s.conference ?? ''} ${ROUND_LABEL[s.round] ?? ''}`.trim() : '—'}
                    </div>
                  </div>
                  <Badge label={label} color={color} small />
                </div>
                {i < recent.length - 1 && <Divider />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Home({ participantId }: Props) {
  const { ranking, loading: rankLoading } = useRanking()
  const { series, picks } = useSeries(participantId)

  const myEntry       = ranking.find((r) => r.participant_id === participantId)
  const completedSeries = series.filter((s) => s.is_complete).length
  const pickedSeries = picks.length

  return (
    <>
      {/* Responsive grid via inline style + media query workaround using Tailwind arbitrary values */}
      <div
        className={[
          'pb-24 pt-4 px-4 mx-auto',
          'grid gap-4',
          'grid-cols-1',
          'md:grid-cols-[1fr_280px]',
          'min-[1200px]:grid-cols-[280px_1fr_280px]',
        ].join(' ')}
        style={{ maxWidth: 1400 }}
      >
        {/* ── Left column — desktop only (≥1200px) ─────────────────────── */}
        <div
          className={[
            'hidden',
            'min-[1200px]:flex min-[1200px]:flex-col min-[1200px]:gap-4',
          ].join(' ')}
        >
          <RankingCard ranking={ranking} loading={rankLoading} highlightId={participantId} />
          <InjuriesCard />
        </div>

        {/* ── Center column ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 min-w-0">

          {/* Header */}
          <HeroPanel
            myEntry={myEntry}
            pickedSeries={pickedSeries}
            totalSeries={series.length}
          />

          <div className="md:hidden">
            <NextGamesCard />
          </div>

          {/* Stats 2×2 */}
          <StatsGrid
            participantCount={ranking.length}
            completedSeries={completedSeries}
            totalSeries={series.length}
            myEntry={myEntry}
          />

          {/* On tablet: ranking card appears here (left col hidden) */}
          <div className="md:hidden">
            <RankingCard ranking={ranking} loading={rankLoading} highlightId={participantId} />
          </div>

          {/* Podium */}
          <PodiumCard ranking={ranking} loading={rankLoading} highlightId={participantId} />

          {/* Recent series */}
          <RecentSeriesCard series={series} />
        </div>

        {/* ── Right column ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 min-w-0">
          <div className="hidden md:block">
            <NextGamesCard />
          </div>
          <OddsCard />
          <MyPicksCard series={series} picks={picks} />

          {/* On mobile: injuries card moves to bottom */}
          <div className="md:hidden">
            <InjuriesCard />
          </div>
        </div>
      </div>
    </>
  )
}
