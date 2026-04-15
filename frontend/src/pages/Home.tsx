import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, Minus, AlertTriangle, ArrowLeftRight, ChevronRight, Clock, Sparkles, Star, Target, Trophy, Users, Zap } from 'lucide-react'
import { SkeletonCard } from '../components/SkeletonCard'
import { OnboardingTour } from '../components/OnboardingTour'
import { useRanking } from '../hooks/useRanking'
import { useSeries } from '../hooks/useSeries'
import { useGameFeed } from '../hooks/useGameFeed'
import { useAnalysisInsights } from '../hooks/useAnalysisInsights'
import { useOnboarding } from '../hooks/useOnboarding'
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

function useCountdown(targetDate: string | null | undefined) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    if (!targetDate) { setLabel(''); return }
    function tick() {
      const diff = new Date(targetDate!).getTime() - Date.now()
      if (diff <= 0) { setLabel('Agora'); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      if (h > 23) setLabel(formatShortDateTime(targetDate))
      else if (h > 0) setLabel(`em ${h}h ${m}min`)
      else setLabel(`em ${m}min`)
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [targetDate])
  return label
}

function LastNightRecap({
  games,
  upcomingGames,
  isRealData,
  loading,
}: {
  games: ReturnType<typeof useGameFeed>['recentCompletedGames']
  upcomingGames: ReturnType<typeof useGameFeed>['upcomingGames']
  isRealData: boolean
  loading: boolean
}) {
  const sourceGames = games.map((game) => ({
    home: game.home_team?.abbreviation ?? game.home_team_id,
    away: game.away_team?.abbreviation ?? game.away_team_id,
    homeScore: game.home_score ?? 0,
    awayScore: game.away_score ?? 0,
    round: ROUND_LABEL[game.series?.round ?? game.round ?? 1] ?? 'NBA',
    note: formatShortDateTime(game.tip_off_at),
    gameNumber: game.game_number,
  }))
  const nextRealGame = upcomingGames[0]
  const countdown = useCountdown(nextRealGame?.tip_off_at)

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
        {countdown && nextRealGame ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(200,150,60,0.12)', border: '1px solid rgba(200,150,60,0.22)', borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', color: 'var(--nba-gold)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            <Clock size={11} />
            Próximo {countdown}
          </span>
        ) : (
          <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
            {isRealData ? 'placares reais' : 'aguardando dados'}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 1rem 0.2rem' }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} style={{ minWidth: 250, padding: '12px 14px', borderRadius: 10, background: 'rgba(12,12,18,0.42)', border: '1px solid rgba(200,150,60,0.14)', display: 'grid', gap: 8 }}>
              <SkeletonCard width="72%" height={12} />
              <SkeletonCard width="48%" height={28} />
              <SkeletonCard width="60%" height={10} />
            </div>
          ))}
        </div>
      ) : sourceGames.length > 0 ? (
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
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.65rem', fontWeight: 600 }}>J{game.gameNumber}</span>
                    <Badge label={game.round} color={ROUND_BADGE_COLOR[game.round] ?? '#888'} />
                  </div>
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
  totalSeries,
  leaderPoints,
}: {
  myEntry?: { rank: number; total_points: number; participant_name: string }
  pickedSeries: number
  readySeries: number
  totalSeries: number
  leaderPoints: number
}) {
  const progress = readySeries > 0 ? Math.round((pickedSeries / readySeries) * 100) : 0
  const missingReady = Math.max(readySeries - pickedSeries, 0)
  const gapToLeader = myEntry ? Math.max(leaderPoints - myEntry.total_points, 0) : null

  const primaryAction =
    missingReady > 0
      ? { to: '/bracket', label: 'Fechar meus palpites', description: `${missingReady} série${missingReady !== 1 ? 's' : ''} pronta${missingReady !== 1 ? 's' : ''} sem pick`, tone: 'var(--nba-gold)' }
      : myEntry && myEntry.rank > 1
      ? { to: '/ranking', label: 'Caçar o líder', description: `${gapToLeader ?? 0} ponto${gapToLeader === 1 ? '' : 's'} para empatar`, tone: 'var(--nba-east)' }
      : { to: '/games', label: 'Ver jogos do dia', description: 'Acompanhar os próximos movimentos do bolão', tone: 'var(--nba-success)' }

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

      <div style={{ position: 'relative', display: 'grid', gap: 14 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nba-gold)' }}>
          <img src="/logo-bolao-nba-512.png" alt="Logo do Bolão NBA" style={{ width: 26, height: 26, objectFit: 'contain', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.28))' }} />
          <Sparkles size={14} />
          <span className="font-condensed" style={{ fontSize: '0.76rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Painel do participante
          </span>
        </div>

        {/* Title + greeting */}
        <div>
          <h1 className="title" style={{ color: 'var(--nba-gold)', fontSize: 'clamp(2rem, 5vw, 3rem)', lineHeight: 0.95, margin: 0 }}>
            Bolão NBA 2026
          </h1>
          <p style={{ color: 'var(--nba-text)', fontSize: '0.95rem', margin: '8px 0 0' }}>
            {myEntry ? `${myEntry.participant_name.split(' ')[0]}, você está no jogo.` : 'Seu painel está pronto para os playoffs.'}
          </p>
        </div>

        {/* 3 stat chips */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Minha posição', value: myEntry ? `#${myEntry.rank}` : '—', color: 'var(--nba-gold)' },
            { label: 'Meus pontos', value: myEntry?.total_points ?? 0, color: 'var(--nba-text)' },
            { label: 'Dist. do líder', value: myEntry ? (gapToLeader === 0 ? 'LÍDER' : `${gapToLeader}`) : '—', color: 'var(--nba-east)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.66rem', marginBottom: 5, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
              <div className="font-condensed font-bold" style={{ color, fontSize: '1.7rem', lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <span style={{ color: 'var(--nba-text)', fontWeight: 600, fontSize: '0.84rem' }}>Progresso do bracket</span>
            <span className="font-condensed font-bold" style={{ color: progress === 100 ? 'var(--nba-success)' : 'var(--nba-gold)' }}>
              {pickedSeries}/{readySeries || totalSeries} — {progress}%
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              borderRadius: 999,
              background: progress === 100 ? 'linear-gradient(90deg, #2ecc71, #7ae6a5)' : 'linear-gradient(90deg, var(--nba-gold), var(--nba-gold-light))',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>

        {/* Smart CTA */}
        <div style={{ borderRadius: 10, background: 'rgba(12,12,18,0.42)', border: `1px solid color-mix(in srgb, ${primaryAction.tone} 22%, transparent)`, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 10px' }}>
            <div className="font-condensed font-bold" style={{ color: primaryAction.tone, fontSize: '1rem', lineHeight: 1 }}>
              {primaryAction.label}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', marginTop: 4 }}>
              {primaryAction.description}
            </div>
          </div>
          <Link
            to={primaryAction.to}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '11px 16px',
              textDecoration: 'none',
              background: primaryAction.tone,
              color: '#0a0a0f',
              fontWeight: 700,
              fontSize: '0.86rem',
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.04em',
              borderTop: `1px solid color-mix(in srgb, ${primaryAction.tone} 35%, transparent)`,
            }}
          >
            Ir agora <ChevronRight size={15} />
          </Link>
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

  const podium = [
    { medal: '🥇', color: '#ffd166', bg: 'rgba(255,209,102,0.08)', border: 'rgba(255,209,102,0.22)' },
    { medal: '🥈', color: '#c9d1d9', bg: 'rgba(201,209,217,0.07)', border: 'rgba(201,209,217,0.18)' },
    { medal: '🥉', color: '#d68c45', bg: 'rgba(214,140,69,0.08)', border: 'rgba(214,140,69,0.20)' },
  ]

  return (
    <div style={card}>
      <CardTitle icon={<Trophy size={14} />}>Ranking Geral</CardTitle>

      {loading ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 44px', gap: 10, alignItems: 'center', padding: '8px 6px' }}>
              <SkeletonCard width={18} height={12} />
              <SkeletonCard width="100%" height={13} />
              <SkeletonCard width={34} height={13} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {top5.map((e, i) => {
            const isMe = e.participant_id === highlightId
            const diff = e.prev_rank != null ? e.prev_rank - e.rank : null
            const p = i < 3 ? podium[i] : null

            return (
              <div
                key={e.participant_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: p ? '10px 10px' : '7px 6px',
                  borderRadius: 8,
                  background: p ? p.bg : isMe ? 'var(--nba-surface-2)' : 'transparent',
                  border: p ? `1px solid ${p.border}` : isMe ? '1px solid rgba(200,150,60,0.18)' : '1px solid transparent',
                  transition: 'background 0.2s',
                }}
              >
                {/* Posição */}
                {p ? (
                  <span style={{ fontSize: '1.1rem', flexShrink: 0, width: 24, textAlign: 'center' }}>{p.medal}</span>
                ) : (
                  <span className="font-condensed font-bold" style={{ color: 'var(--nba-text-muted)', width: 24, textAlign: 'center', flexShrink: 0, fontSize: '0.82rem' }}>
                    {e.rank}
                  </span>
                )}

                {/* Nome */}
                <span style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: p ? p.color : isMe ? 'var(--nba-gold)' : 'var(--nba-text)',
                  fontWeight: p || isMe ? 700 : 400,
                  fontSize: p ? '0.9rem' : '0.85rem',
                }}>
                  {e.participant_name}
                </span>

                {/* Seta + pontos */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  {diff !== null && <RankArrow diff={diff} />}
                  <span className="font-condensed font-bold" style={{
                    color: p ? p.color : 'var(--nba-text-muted)',
                    fontSize: p ? '1rem' : '0.88rem',
                  }}>
                    {e.total_points}
                  </span>
                  {p && <span style={{ color: p.color, fontSize: '0.68rem', opacity: 0.7 }}>pts</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Link to="/ranking" style={{ display: 'block', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--nba-border)', textAlign: 'center', fontSize: '0.78rem', color: 'var(--nba-text-muted)' }}>
        <span id="scoring-guide-highlight" />
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
  loading,
}: {
  participantCount: number
  completedSeries: number
  totalSeries: number
  myEntry?: { rank: number; total_points: number }
  loading: boolean
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
            {loading ? (
              <SkeletonCard width={72} height={24} style={{ marginTop: 4 }} />
            ) : (
              <div className="font-condensed font-bold" style={{ color: gold ? 'var(--nba-gold)' : 'var(--nba-text)', fontSize: '1.4rem', lineHeight: 1.2 }}>
                {value}
              </div>
            )}
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

const ROUND_FULL_LABEL: Record<number, string> = { 1: 'Primeira Rodada', 2: 'Segunda Rodada', 3: 'Conf. Finals', 4: 'Finals' }
const ROUND_COLOR: Record<number, string> = { 1: '#4a90d9', 2: '#9b59b6', 3: '#e05c3a', 4: '#c8963c' }

function OfficialBracketCard({ series }: { series: ReturnType<typeof useSeries>['series'] }) {
  const completedSeries = series.filter((item) => item.is_complete).length
  const openSeries = Math.max(series.length - completedSeries, 0)
  const finals = series.find((item) => item.id === 'FIN')
  const champion = finals?.is_complete ? finals.winner : null
  const championLabel = champion?.abbreviation ?? (finals?.is_complete ? finals.winner_id ?? 'Definido' : 'Em disputa')

  const roundGroups = ([4, 3, 2, 1] as const)
    .map((round) => ({
      round,
      items: series
        .filter((s) => s.round === round && (s.home_team_id != null || s.away_team_id != null))
        .sort((a, b) => (a.conference ?? '').localeCompare(b.conference ?? '')),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <div style={{ ...card, background: 'linear-gradient(135deg, rgba(224,92,58,0.12), rgba(200,150,60,0.08) 55%, rgba(19,19,26,1) 100%)', border: '1px solid rgba(200,150,60,0.18)' }}>
      <CardTitle icon={<Trophy size={14} />}>Resultados reais</CardTitle>

      {/* 3 chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Concluídas', value: `${completedSeries}/${series.length}`, color: completedSeries > 0 ? 'var(--nba-success)' : 'var(--nba-text-muted)' },
          { label: 'Em aberto', value: String(openSeries), color: openSeries > 0 ? 'var(--nba-gold)' : 'var(--nba-text-muted)' },
          { label: 'Campeão', value: championLabel, color: champion ? (champion.primary_color ?? 'var(--nba-gold)') : 'var(--nba-text-muted)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.12)' }}>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.66rem', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            <div className="font-condensed font-bold" style={{ color, fontSize: '1.1rem', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Series grouped by round */}
      {roundGroups.length === 0 ? (
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', padding: '8px 0' }}>
          Bracket ainda não foi definido para esta temporada.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {roundGroups.map(({ round, items }) => {
            const color = ROUND_COLOR[round]
            return (
              <div key={round}>
                {/* Round header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ height: 1, width: 10, background: `${color}55`, flexShrink: 0 }} />
                  <span style={{ color, fontSize: '0.64rem', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {ROUND_FULL_LABEL[round]}
                  </span>
                  <div style={{ height: 1, flex: 1, background: `${color}28` }} />
                </div>

                {/* Series rows */}
                <div style={{ display: 'grid', gap: 5 }}>
                  {items.map((s) => {
                    const homeAbbr = s.home_team?.abbreviation ?? s.home_team_id ?? '—'
                    const awayAbbr = s.away_team?.abbreviation ?? s.away_team_id ?? '—'
                    const homeColor = s.home_team?.primary_color ?? 'var(--nba-text)'
                    const awayColor = s.away_team?.primary_color ?? 'var(--nba-text)'
                    const homeWon = s.is_complete && s.winner_id === s.home_team_id
                    const awayWon = s.is_complete && s.winner_id === s.away_team_id
                    const losses = s.games_played - 4

                    return (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 10px',
                          borderRadius: 8,
                          background: s.is_complete ? 'rgba(12,12,18,0.28)' : 'rgba(12,12,18,0.42)',
                          border: `1px solid ${s.is_complete ? 'rgba(46,204,113,0.12)' : 'rgba(200,150,60,0.10)'}`,
                        }}
                      >
                        <span
                          className="font-condensed font-bold"
                          style={{
                            color: homeWon ? homeColor : awayWon ? 'var(--nba-text-muted)' : 'var(--nba-text)',
                            fontSize: '0.92rem',
                            minWidth: 32,
                            opacity: awayWon ? 0.5 : 1,
                          }}
                        >
                          {homeAbbr}
                        </span>

                        <span
                          className="font-condensed font-bold"
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            fontSize: s.is_complete ? '0.88rem' : '0.72rem',
                            color: s.is_complete ? 'var(--nba-text)' : 'var(--nba-text-muted)',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {s.is_complete
                            ? `4 – ${losses}`
                            : s.games_played > 0
                            ? `${s.games_played}j`
                            : 'vs'}
                        </span>

                        <span
                          className="font-condensed font-bold"
                          style={{
                            color: awayWon ? awayColor : homeWon ? 'var(--nba-text-muted)' : 'var(--nba-text)',
                            fontSize: '0.92rem',
                            minWidth: 32,
                            textAlign: 'right',
                            opacity: homeWon ? 0.5 : 1,
                          }}
                        >
                          {awayAbbr}
                        </span>

                        {s.is_complete && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--nba-success)', flexShrink: 0 }}>✓</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
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

function NewsAlertPill() {
  const { news, loading } = useAnalysisInsights()
  if (loading || news.length === 0) return null
  return (
    <Link
      to="/analysis"
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, textDecoration: 'none', background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.22)', color: 'var(--nba-danger)' }}
    >
      <Zap size={14} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600 }}>
        {news.length} notícia{news.length !== 1 ? 's' : ''} nova{news.length !== 1 ? 's' : ''} na análise
      </span>
      <span style={{ fontSize: '0.72rem', color: 'var(--nba-text-muted)' }}>ver análise →</span>
    </Link>
  )
}

function HomeQuickDeck() {
  return (
    <div style={{ ...card, background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(74,144,217,0.08) 48%, rgba(200,150,60,0.08) 100%)' }}>
      <CardTitle icon={<Sparkles size={14} />}>Acessos Rápidos</CardTitle>
      <div style={{ display: 'grid', gap: 10 }} className="sm:grid-cols-2 lg:grid-cols-4">
        <Link
          id="bracket-highlight"
          to="/bracket"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '11px 14px',
            borderRadius: 10,
            textDecoration: 'none',
            color: 'var(--nba-text)',
            border: '1px solid rgba(200,150,60,0.2)',
            background: 'rgba(200,150,60,0.08)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <Target size={15} style={{ color: 'var(--nba-gold)', flexShrink: 0 }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem' }}>Abrir Bracket</span>
              <span style={{ display: 'block', color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>palpite série por série</span>
            </span>
          </span>
          <ChevronRight size={15} style={{ flexShrink: 0, color: 'var(--nba-text-muted)' }} />
        </Link>

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
              <span style={{ display: 'block', color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>odds, notícias e radar da rodada</span>
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
  const { series, picks, loading: seriesLoading } = useSeries(participantId)
  const { recentCompletedGames, upcomingGames, hasRealGames } = useGameFeed()
  const { show, complete } = useOnboarding()

  const myEntry = ranking.find((r) => r.participant_id === participantId)
  const leader = ranking[0]
  const completedSeries = series.filter((s) => s.is_complete).length
  const readySeries = series.filter(isSeriesReadyForPick)
  const readySeriesIds = new Set(readySeries.map((item) => item.id))
  const pickedSeries = picks.filter((pick) => readySeriesIds.has(pick.series_id)).length
  const canStartTour = !rankLoading && !seriesLoading && show

  return (
    <div className="pb-24 pt-4 px-4 mx-auto grid gap-4 xl:gap-5 grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_320px]" style={{ maxWidth: 1420 }}>
      {canStartTour && <OnboardingTour show={canStartTour} onComplete={complete} />}
      <div className="hidden xl:flex xl:flex-col xl:gap-4">
        <RankingCard ranking={ranking} loading={rankLoading} highlightId={participantId} />
        <StatsGrid participantCount={ranking.length} completedSeries={completedSeries} totalSeries={series.length} myEntry={myEntry} loading={rankLoading || seriesLoading} />
      </div>

      <div className="flex flex-col gap-4 min-w-0">
        <div className="animate-in-1"><LastNightRecap games={recentCompletedGames} upcomingGames={upcomingGames} isRealData={hasRealGames && recentCompletedGames.length > 0} loading={seriesLoading} /></div>
        <div className="animate-in-2"><HeroPanel myEntry={myEntry} pickedSeries={pickedSeries} readySeries={readySeries.length} totalSeries={series.length} leaderPoints={leader?.total_points ?? 0} /></div>
        <div className="animate-in-3"><NewsAlertPill /></div>
        <div className="animate-in-4"><HomeQuickDeck /></div>

        <div className="xl:hidden flex flex-col gap-4">
          <MyPicksCard series={series} picks={picks} />
          <RankingCard ranking={ranking} loading={rankLoading} highlightId={participantId} />
          <StatsGrid participantCount={ranking.length} completedSeries={completedSeries} totalSeries={series.length} myEntry={myEntry} loading={rankLoading || seriesLoading} />
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
