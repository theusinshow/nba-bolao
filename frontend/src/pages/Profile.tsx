import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, Target, TrendingUp, Zap } from 'lucide-react'
import type { ParticipantScoreBreakdown } from '../types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useParticipantProfile } from '../hooks/useParticipantProfile'
import { SCORING_CONFIG } from '../utils/scoring'
import { useParticipantBadges, BADGE_DEFINITIONS, sortBadges } from '../hooks/useParticipantBadges'
import { ParticipantScoreReport } from '../components/ParticipantScoreReport'
import { getTeamLogoUrl } from '../data/teams2025'
import { LoadingBasketball } from '../components/LoadingBasketball'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#4a90d9', '#e05c3a', '#9b59b6', '#2ecc71',
  '#e74c3c', '#f39c12', '#1abc9c', '#e91e63',
  '#00bcd4', '#ff9800',
]

function nameToColor(name: string): string {
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

const ROUND_COLOR: Record<number, string> = {
  1: '#4a90d9',
  2: '#9b59b6',
  3: '#e05c3a',
  4: '#c8963c',
}

const RANK_COLOR: Record<number, string> = {
  1: '#c8963c',
  2: '#b8b8b8',
  3: '#cd7f32',
}

function buildProfileBadges({
  overallPct,
  rankSwing,
  favoriteTeams,
  expensiveMisses,
  entry,
}: {
  overallPct: number
  rankSwing: number
  favoriteTeams: Array<{ teamId: string; count: number }>
  expensiveMisses: Array<{ matchup: string }>
  entry: NonNullable<ReturnType<typeof useParticipantProfile>['entry']>
}) {
  const badges: Array<{ label: string; detail: string; tone: string }> = []

  if (entry.cravadas >= 3) {
    badges.push({ label: 'Cravador', detail: `${entry.cravadas} cravadas já sustentam a campanha.`, tone: 'var(--nba-gold)' })
  }
  if (overallPct >= 65) {
    badges.push({ label: 'Leitura quente', detail: `${overallPct}% de acerto nas séries até aqui.`, tone: 'var(--nba-success)' })
  }
  if (rankSwing > 0) {
    badges.push({ label: 'Em ascensão', detail: `Ganhou ${rankSwing} posição${rankSwing !== 1 ? 'ões' : ''} no recorte recente.`, tone: 'var(--nba-east)' })
  }
  if (favoriteTeams[0]?.count >= 3) {
    badges.push({ label: 'Fiel à leitura', detail: `Voltou ${favoriteTeams[0].count} vezes para a mesma franquia.`, tone: '#ff8c72' })
  }
  if (expensiveMisses.length === 0 && entry.series_total > 0) {
    badges.push({ label: 'Sem queda cara', detail: 'Ainda não tomou uma paulada relevante de pontuação.', tone: 'var(--nba-text)' })
  }

  return badges.slice(0, 4)
}

// ─── Histórico de palpites ────────────────────────────────────────────────────

const HIST_ROUND_LABELS: Record<number, string> = {
  1: 'R1 · Primeira Rodada',
  2: 'R2 · Semifinais de Conferência',
  3: 'Finais de Conferência',
  4: 'NBA Finals',
}

type HistFilter = 'all' | 'correct' | 'wrong' | 'pending'

function statusIsCorrect(s: string) { return s === 'correct' || s === 'winner' || s === 'cravada' }

function rowColors(status: string) {
  if (statusIsCorrect(status)) return { bg: 'rgba(46,204,113,0.07)', border: '1px solid rgba(46,204,113,0.18)' }
  if (status === 'wrong') return { bg: 'rgba(231,76,60,0.07)', border: '1px solid rgba(231,76,60,0.18)' }
  return { bg: 'rgba(0,0,0,0.18)', border: '1px solid rgba(200,150,60,0.08)' }
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { label: string; color: string; bg: string }> = {
    cravada: { label: 'Cravada 🏆', color: 'var(--nba-gold)', bg: 'rgba(200,150,60,0.14)' },
    winner:  { label: 'Acerto ✅',  color: 'var(--nba-success)', bg: 'rgba(46,204,113,0.12)' },
    correct: { label: 'Acerto ✅',  color: 'var(--nba-success)', bg: 'rgba(46,204,113,0.12)' },
    wrong:   { label: 'Erro ❌',    color: 'var(--nba-danger)',  bg: 'rgba(231,76,60,0.12)' },
    pending: { label: 'Pendente ⏳', color: 'var(--nba-text-muted)', bg: 'rgba(136,136,153,0.1)' },
  }
  const c = cfg[status] ?? cfg.pending
  return (
    <span style={{
      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.68rem',
      letterSpacing: '0.05em', color: c.color, background: c.bg,
      border: `1px solid ${c.color}44`, borderRadius: 4, padding: '2px 7px',
      flexShrink: 0, whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  )
}

function TeamLogo({ abbr }: { abbr: string }) {
  return (
    <img
      src={getTeamLogoUrl(abbr)}
      alt={abbr}
      onError={(e) => { e.currentTarget.style.display = 'none' }}
      style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }}
    />
  )
}

function HistoricoTab({ breakdown, isOwnProfile = true }: { breakdown: ParticipantScoreBreakdown | null; isOwnProfile?: boolean }) {
  const [filter, setFilter] = useState<HistFilter>('all')

  if (!breakdown) {
    return (
      <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 48, borderRadius: 8, background: 'var(--nba-surface-2)', opacity: 0.5 }} />
        ))}
      </div>
    )
  }

  const series_breakdown = isOwnProfile
    ? breakdown.series_breakdown
    : breakdown.series_breakdown.filter((s) => s.status !== 'pending')
  const game_breakdown = isOwnProfile
    ? breakdown.game_breakdown
    : breakdown.game_breakdown.filter((g) => g.played)

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalPts = [...series_breakdown, ...game_breakdown].reduce((s, i) => s + i.points, 0)
  const seriesCorrect = series_breakdown.filter((i) => statusIsCorrect(i.status)).length
  const seriesPlayed  = series_breakdown.filter((i) => i.status !== 'pending').length
  const gamesCorrect  = game_breakdown.filter((i) => i.status === 'correct').length
  const gamesPlayed   = game_breakdown.filter((i) => i.played).length
  const cravadas      = series_breakdown.filter((i) => i.status === 'cravada').length

  // ── Streak ─────────────────────────────────────────────────────────────────
  const allResolved = [
    ...series_breakdown
      .filter((i) => i.status !== 'pending')
      .map((i) => ({ date: i.event_date ?? '', correct: statusIsCorrect(i.status) })),
    ...game_breakdown
      .filter((i) => i.played)
      .map((i) => ({ date: i.event_date ?? '', correct: i.status === 'correct' })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  let streak = 0
  const streakCorrect = allResolved[0]?.correct ?? true
  for (const p of allResolved) {
    if (p.correct === streakCorrect) streak++
    else break
  }

  // ── Filter ─────────────────────────────────────────────────────────────────
  function matches(status: string) {
    if (filter === 'all') return true
    if (filter === 'correct') return statusIsCorrect(status)
    return status === filter
  }

  // ── Group by round ─────────────────────────────────────────────────────────
  const seriesByRound = series_breakdown.reduce<Record<number, typeof series_breakdown>>(
    (acc, item) => { ;(acc[item.round] ??= []).push(item); return acc }, {}
  )
  const gamesByRound = game_breakdown.reduce<Record<number, typeof game_breakdown>>(
    (acc, item) => { ;(acc[item.round] ??= []).push(item); return acc }, {}
  )
  const allRounds = [
    ...new Set([...Object.keys(seriesByRound), ...Object.keys(gamesByRound)].map(Number)),
  ].sort((a, b) => a - b)

  if (allRounds.length === 0) {
    return (
      <p style={{ color: 'var(--nba-text-muted)', textAlign: 'center', padding: '32px 0', fontSize: '0.9rem' }}>
        Nenhum palpite registrado ainda.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Summary card ── */}
      <div style={{ background: 'var(--nba-surface)', border: '1px solid var(--nba-border)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {([
            { label: 'Pts ganhos', value: `${totalPts}`, gold: true },
            { label: 'Cravadas',   value: `${cravadas}`, gold: true },
            { label: 'Séries',     value: `${seriesCorrect}/${seriesPlayed}`, gold: false },
            { label: 'Jogos',      value: `${gamesCorrect}/${gamesPlayed}`,   gold: false },
          ] as const).map(({ label, value, gold }) => (
            <div key={label} style={{ textAlign: 'center', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.22)', border: gold ? '1px solid rgba(200,150,60,0.2)' : '1px solid var(--nba-border)' }}>
              <div className="font-condensed font-bold" style={{ color: gold ? 'var(--nba-gold)' : 'var(--nba-text)', fontSize: '1.25rem', lineHeight: 1 }}>{value}</div>
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.63rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
        {streak >= 2 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, background: streakCorrect ? 'rgba(46,204,113,0.08)' : 'rgba(231,76,60,0.08)', border: streakCorrect ? '1px solid rgba(46,204,113,0.2)' : '1px solid rgba(231,76,60,0.2)' }}>
            <span style={{ fontSize: '1rem' }}>{streakCorrect ? '🔥' : '❄️'}</span>
            <span className="font-condensed font-bold" style={{ fontSize: '0.9rem', color: streakCorrect ? 'var(--nba-success)' : 'var(--nba-danger)' }}>
              {streak} {streakCorrect ? 'acerto' : 'erro'}{streak !== 1 ? 's' : ''} seguido{streak !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Filter pills ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {([
          { key: 'all',     label: 'Todos' },
          { key: 'correct', label: '✅ Acertos' },
          { key: 'wrong',   label: '❌ Erros' },
          { key: 'pending', label: '⏳ Pendentes' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
              border: filter === key ? '1px solid rgba(200,150,60,0.5)' : '1px solid var(--nba-border)',
              background: filter === key ? 'rgba(200,150,60,0.12)' : 'var(--nba-surface-2)',
              color: filter === key ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.82rem',
              letterSpacing: '0.04em', transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Rounds ── */}
      {allRounds.map((round) => {
        const seriesItems = (seriesByRound[round] ?? []).filter((i) => matches(i.status))
        const gameItems   = (gamesByRound[round]  ?? []).filter((i) => matches(i.status))
        if (seriesItems.length === 0 && gameItems.length === 0) return null

        const allForRound  = [...(seriesByRound[round] ?? []), ...(gamesByRound[round] ?? [])]
        const playedRound  = allForRound.filter((i) => i.status !== 'pending')
        const correctRound = allForRound.filter((i) => statusIsCorrect(i.status))
        const roundPct     = playedRound.length > 0 ? Math.round((correctRound.length / playedRound.length) * 100) : null
        const barColor     = roundPct == null ? 'var(--nba-text-muted)' : roundPct >= 60 ? 'var(--nba-success)' : roundPct >= 40 ? 'var(--nba-gold)' : 'var(--nba-danger)'

        return (
          <div key={round} style={{ background: 'var(--nba-surface)', border: '1px solid var(--nba-border)', borderRadius: 12, overflow: 'hidden' }}>

            {/* Round header + progress */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--nba-border)', background: 'rgba(200,150,60,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: roundPct != null ? 6 : 0 }}>
                <span className="title" style={{ fontSize: '0.88rem', color: 'var(--nba-gold)', letterSpacing: '0.08em' }}>
                  {HIST_ROUND_LABELS[round] ?? `Rodada ${round}`}
                </span>
                {roundPct != null && (
                  <span className="font-condensed font-bold" style={{ fontSize: '0.8rem', color: barColor }}>
                    {correctRound.length}/{playedRound.length} · {roundPct}%
                  </span>
                )}
              </div>
              {roundPct != null && (
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(136,136,153,0.15)' }}>
                  <div style={{ height: '100%', width: `${roundPct}%`, borderRadius: 2, background: barColor, transition: 'width 0.4s ease' }} />
                </div>
              )}
            </div>

            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>

              {/* Series */}
              {seriesItems.length > 0 && (
                <>
                  <div style={{ fontSize: '0.64rem', color: 'var(--nba-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>🏆 Séries</div>
                  {seriesItems.map((item) => {
                    const [homeAbbr = '', awayAbbr = ''] = item.matchup_label.split(' vs ')
                    const { bg, border } = rowColors(item.status)
                    const missed = item.status === 'wrong' ? SCORING_CONFIG.pointsPerSeries[item.round as 1|2|3|4] : 0
                    return (
                      <div key={item.id} style={{ borderRadius: 8, background: bg, border, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
                          <div style={{ display: 'flex', gap: 2 }}>
                            <TeamLogo abbr={homeAbbr.trim()} />
                            <TeamLogo abbr={awayAbbr.trim()} />
                          </div>
                          <span className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.88rem', flex: 1, minWidth: 0 }}>
                            {item.matchup_label.replace(' vs ', ' × ')}
                          </span>
                          <StatusPill status={item.status} />
                          <span className="font-condensed font-bold" style={{ fontSize: '0.82rem', minWidth: 44, textAlign: 'right', color: item.points > 0 ? 'var(--nba-gold)' : 'var(--nba-text-muted)' }}>
                            {item.points > 0 ? `+${item.points}` : '—'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px 8px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <TeamLogo abbr={item.picked_winner_label} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--nba-text-muted)' }}>
                              Apostei: <strong style={{ color: item.status === 'wrong' ? 'var(--nba-danger)' : 'var(--nba-text)' }}>{item.picked_winner_label}</strong>
                              {item.status === 'cravada' && <span style={{ color: 'var(--nba-gold)', fontSize: '0.65rem' }}> · {item.picked_games_count}j 🎯</span>}
                            </span>
                          </div>
                          {item.status === 'wrong' && item.actual_winner_label && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <TeamLogo abbr={item.actual_winner_label} />
                              <span style={{ fontSize: '0.7rem', color: 'var(--nba-text-muted)' }}>
                                Ganhou: <strong style={{ color: 'var(--nba-success)' }}>{item.actual_winner_label}</strong>
                              </span>
                              <span className="font-condensed font-bold" style={{ fontSize: '0.7rem', color: 'var(--nba-danger)' }}>−{missed} pts</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}

              {/* Games */}
              {gameItems.length > 0 && (
                <>
                  <div style={{ fontSize: '0.64rem', color: 'var(--nba-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2, marginTop: seriesItems.length > 0 ? 10 : 0 }}>🎮 Jogos</div>
                  {gameItems.map((item) => {
                    const { bg, border } = rowColors(item.status)
                    const missed = item.status === 'wrong' ? SCORING_CONFIG.pointsPerGame[item.round as 1|2|3|4] : 0
                    return (
                      <div key={item.id} style={{ borderRadius: 8, background: bg, border, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
                          <div style={{ display: 'flex', gap: 2 }}>
                            {item.matchup_label.split(' vs ').map((abbr, i) => (
                              <TeamLogo key={i} abbr={abbr.trim()} />
                            ))}
                          </div>
                          <span className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.88rem', flex: 1, minWidth: 0 }}>
                            J{item.game_number} · {item.matchup_label.replace(' vs ', ' × ')}
                          </span>
                          <StatusPill status={item.status} />
                          <span className="font-condensed font-bold" style={{ fontSize: '0.82rem', minWidth: 44, textAlign: 'right', color: item.points > 0 ? 'var(--nba-gold)' : 'var(--nba-text-muted)' }}>
                            {item.points > 0 ? `+${item.points}` : '—'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px 8px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <TeamLogo abbr={item.picked_winner_label} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--nba-text-muted)' }}>
                              Apostei: <strong style={{ color: item.status === 'wrong' ? 'var(--nba-danger)' : 'var(--nba-text)' }}>{item.picked_winner_label}</strong>
                            </span>
                          </div>
                          {item.status === 'wrong' && item.actual_winner_label && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <TeamLogo abbr={item.actual_winner_label} />
                              <span style={{ fontSize: '0.7rem', color: 'var(--nba-text-muted)' }}>
                                Ganhou: <strong style={{ color: 'var(--nba-success)' }}>{item.actual_winner_label}</strong>
                              </span>
                              <span className="font-condensed font-bold" style={{ fontSize: '0.7rem', color: 'var(--nba-danger)' }}>−{missed} pts</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export function Profile({ currentParticipantId }: { currentParticipantId?: string }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    loading,
    entry,
    breakdown,
    roundStats,
    favoriteTeams,
    expensiveMisses,
  } = useParticipantProfile(id!)
  const isOwnProfile = !!currentParticipantId && currentParticipantId === id
  const { badgesByParticipant } = useParticipantBadges()
  const [tab, setTab] = useState<'perfil' | 'historico'>('perfil')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingBasketball size={36} />
      </div>
    )
  }

  if (!entry) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 16,
        }}
      >
        <p style={{ color: 'var(--nba-text-muted)' }}>Participante não encontrado.</p>
        <button className="btn-primary" onClick={() => navigate('/ranking')}>
          Voltar ao Ranking
        </button>
      </div>
    )
  }

  const overallPct =
    entry.series_total > 0
      ? Math.round((entry.series_correct / entry.series_total) * 100)
      : 0
  const bestRound = [...roundStats].sort((left, right) => right.pct - left.pct || right.correct - left.correct)[0]
  const weakestRound = [...roundStats]
    .filter((round) => round.total > 0)
    .sort((left, right) => left.pct - right.pct || left.correct - right.correct)[0]
  const rankSwing = entry.prev_rank != null ? entry.prev_rank - entry.rank : 0
  const profileBadges = buildProfileBadges({
    overallPct,
    rankSwing,
    favoriteTeams,
    expensiveMisses,
    entry,
  })

  const earnedBadgeIds = sortBadges(badgesByParticipant.get(id!) ?? [])

  const avatarColor = nameToColor(entry.participant_name)
  const rankColor = RANK_COLOR[entry.rank] ?? 'var(--nba-gold)'
  const chartData = roundStats.filter((r) => r.total > 0)

  return (
    <div className="pb-24 pt-4 px-4 mx-auto" style={{ maxWidth: 720 }}>

      {/* Back */}
      <button
        onClick={() => navigate('/ranking')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--nba-text-muted)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.82rem',
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '0.04em',
          marginBottom: 16,
          padding: 0,
        }}
      >
        <ArrowLeft size={14} />
        Voltar ao Ranking
      </button>

      {/* Header card */}
      <div
        style={{
          background: `linear-gradient(135deg, ${avatarColor}14, rgba(19,19,26,0.96))`,
          border: `1px solid ${avatarColor}33`,
          borderRadius: 12,
          padding: '1.25rem',
          marginBottom: 14,
        }}
      >
        {/* Name + rank */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: `${avatarColor}22`,
              border: `2px solid ${avatarColor}66`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              fontWeight: 700,
              color: avatarColor,
              fontFamily: "'Barlow Condensed', sans-serif",
              flexShrink: 0,
            }}
          >
            {initials(entry.participant_name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              className="title"
              style={{ fontSize: '1.6rem', color: 'var(--nba-text)', margin: 0, lineHeight: 1 }}
            >
              {entry.participant_name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
              <span
                className="font-condensed font-bold"
                style={{ color: rankColor, fontSize: '0.85rem' }}
              >
                #{entry.rank}º lugar
              </span>
              <span style={{ color: 'var(--nba-border)' }}>·</span>
              <span
                className="font-condensed font-bold"
                style={{ color: rankColor, fontSize: '1.4rem', lineHeight: 1 }}
              >
                {entry.total_points} pts
              </span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { icon: <Target size={14} />, label: 'Acertos', value: `${entry.series_correct}/${entry.series_total}` },
            { icon: <Star size={14} fill="currentColor" />, label: 'Cravadas', value: String(entry.cravadas), gold: true },
            { icon: <TrendingUp size={14} />, label: '% Acerto', value: `${overallPct}%` },
          ].map(({ icon, label, value, gold }) => (
            <div
              key={label}
              style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 8,
                padding: '10px 12px',
                textAlign: 'center',
                border: gold
                  ? '1px solid rgba(200,150,60,0.2)'
                  : '1px solid var(--nba-border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  color: gold ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
                  marginBottom: 4,
                }}
              >
                {icon}
              </div>
              <div
                className="font-condensed font-bold"
                style={{
                  color: gold ? 'var(--nba-gold)' : 'var(--nba-text)',
                  fontSize: '1.25rem',
                  lineHeight: 1,
                }}
              >
                {value}
              </div>
              <div
                style={{
                  color: 'var(--nba-text-muted)',
                  fontSize: '0.65rem',
                  marginTop: 3,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['perfil', 'historico'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 18px',
              borderRadius: 20,
              border: tab === t ? '1px solid rgba(200,150,60,0.5)' : '1px solid var(--nba-border)',
              background: tab === t ? 'rgba(200,150,60,0.12)' : 'var(--nba-surface-2)',
              color: tab === t ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: '0.88rem',
              letterSpacing: '0.06em',
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'all 0.15s',
            }}
          >
            {t === 'perfil' ? 'Perfil' : 'Histórico'}
          </button>
        ))}
      </div>

      {tab === 'historico' && <HistoricoTab breakdown={breakdown} isOwnProfile={isOwnProfile} />}

      {tab === 'perfil' && <>
      <div
        id="profile-hero-tour"
        style={{
          background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(74,144,217,0.08) 44%, rgba(200,150,60,0.08) 100%)',
          border: '1px solid rgba(200,150,60,0.18)',
          borderRadius: 12,
          padding: '1.1rem 1.25rem',
          marginBottom: 14,
        }}
      >
        <h2
          className="title"
          style={{ fontSize: '1.05rem', color: 'var(--nba-gold)', marginBottom: 14 }}
        >
          Perfil Competitivo
        </h2>
        <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 md:grid-cols-3">
          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.14)' }}>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Momento</div>
            <div className="font-condensed font-bold" style={{ color: rankSwing > 0 ? 'var(--nba-success)' : rankSwing < 0 ? 'var(--nba-danger)' : 'var(--nba-gold)', fontSize: '1.02rem', lineHeight: 1.05, marginBottom: 6 }}>
              {rankSwing > 0 ? `Subiu ${rankSwing} posição${rankSwing !== 1 ? 'ões' : ''}` : rankSwing < 0 ? `Caiu ${Math.abs(rankSwing)} posição${Math.abs(rankSwing) !== 1 ? 'ões' : ''}` : 'Posição estável'}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem', lineHeight: 1.45 }}>
              {entry.prev_rank != null ? `Saiu de ${entry.prev_rank}º para ${entry.rank}º no recorte mais recente do ranking.` : 'Primeira leitura registrada nesta corrida.'}
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.14)' }}>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Melhor trecho</div>
            <div className="font-condensed font-bold" style={{ color: 'var(--nba-success)', fontSize: '1.02rem', lineHeight: 1.05, marginBottom: 6 }}>
              {bestRound?.total ? `${bestRound.label} em ${bestRound.pct}%` : 'Sem rodada forte ainda'}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem', lineHeight: 1.45 }}>
              {bestRound?.total ? `${bestRound.correct}/${bestRound.total} acertos com ${bestRound.cravadas} cravada${bestRound.cravadas !== 1 ? 's' : ''} marcaram o pico da cartela.` : 'O participante ainda não fechou rodada suficiente para destacar um pico.'}
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.14)' }}>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Zona de atenção</div>
            <div className="font-condensed font-bold" style={{ color: weakestRound?.total ? 'var(--nba-danger)' : 'var(--nba-text)', fontSize: '1.02rem', lineHeight: 1.05, marginBottom: 6 }}>
              {weakestRound?.total ? `${weakestRound.label} segurou a pontuação` : 'Sem ponto fraco claro'}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem', lineHeight: 1.45 }}>
              {weakestRound?.total ? `${weakestRound.correct}/${weakestRound.total} acertos foi o trecho menos eficiente da campanha até aqui.` : expensiveMisses[0] ? `${expensiveMisses[0].matchup} foi a queda mais cara da cartela até agora.` : 'A campanha ainda não gerou um padrão de fraqueza forte.'}
            </div>
          </div>
        </div>
      </div>

      {profileBadges.length > 0 && (
      <div
        id="profile-competitive-tour"
        style={{
            background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(74,144,217,0.08) 50%, rgba(200,150,60,0.08) 100%)',
            border: '1px solid rgba(200,150,60,0.18)',
            borderRadius: 12,
            padding: '1.1rem 1.25rem',
            marginBottom: 14,
          }}
        >
          <h2 className="title" style={{ fontSize: '1.05rem', color: 'var(--nba-gold)', marginBottom: 14 }}>
            DNA da Cartela
          </h2>
          <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 md:grid-cols-2">
            {profileBadges.map((badge) => (
              <div
                key={badge.label}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'rgba(12,12,18,0.34)',
                  border: '1px solid rgba(200,150,60,0.14)',
                }}
              >
                <div className="font-condensed font-bold" style={{ color: badge.tone, fontSize: '1rem', lineHeight: 1.05, marginBottom: 6 }}>
                  {badge.label}
                </div>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem', lineHeight: 1.45 }}>
                  {badge.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Round accuracy chart */}
      {chartData.length > 0 && (
        <div
          id="profile-dna-tour"
          style={{
            background: 'var(--nba-surface)',
            border: '1px solid var(--nba-border)',
            borderRadius: 12,
            padding: '1.25rem',
            marginBottom: 14,
          }}
        >
          <h2
            className="title"
            style={{ fontSize: '1.1rem', color: 'var(--nba-gold)', marginBottom: 16 }}
          >
            Acerto por Rodada
          </h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(200,150,60,0.1)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--nba-text-muted)', fontSize: 11, fontFamily: "'Barlow Condensed'" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'var(--nba-text-muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: '#13131a',
                  border: '1px solid rgba(200,150,60,0.2)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, _name: string, props: { payload?: { correct: number; total: number; cravadas: number } }) => [
                  `${value}% (${props.payload?.correct ?? 0}/${props.payload?.total ?? 0}) · ${props.payload?.cravadas ?? 0} cravada${(props.payload?.cravadas ?? 0) !== 1 ? 's' : ''}`,
                  'Acerto',
                ]}
              />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {chartData.map((r) => (
                  <Cell key={r.round} fill={ROUND_COLOR[r.round] ?? '#c8963c'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Times favoritos + Séries mais caras */}
      <div
        style={{ display: 'grid', gap: 14 }}
        className="grid-cols-1 sm:grid-cols-2"
      >
        {/* Times favoritos */}
        {favoriteTeams.length > 0 && (
          <div
            style={{
              background: 'var(--nba-surface)',
              border: '1px solid var(--nba-border)',
              borderRadius: 12,
              padding: '1.25rem',
            }}
          >
            <h2
              className="title"
              style={{ fontSize: '1.1rem', color: 'var(--nba-gold)', marginBottom: 14 }}
            >
              Times Favoritos
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {favoriteTeams.map(({ teamId, teamName, abbreviation, primary_color, count }) => (
                <div
                  key={teamId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--nba-border)',
                  }}
                >
                  <img
                    src={getTeamLogoUrl(abbreviation)}
                    alt={abbreviation}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                    style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }}
                  />
                  <span
                    className="font-condensed font-bold"
                    style={{ color: primary_color, fontSize: '0.95rem', flex: 1 }}
                  >
                    {abbreviation}
                  </span>
                  <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem' }}>
                    {teamName.split(' ').pop()}
                  </span>
                  <span
                    className="font-condensed font-bold"
                    style={{
                      color: 'var(--nba-gold)',
                      fontSize: '0.85rem',
                      background: 'rgba(200,150,60,0.1)',
                      border: '1px solid rgba(200,150,60,0.2)',
                      borderRadius: 4,
                      padding: '1px 7px',
                    }}
                  >
                    {count}×
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Séries mais caras */}
        {expensiveMisses.length > 0 && (
          <div
            style={{
              background: 'var(--nba-surface)',
              border: '1px solid var(--nba-border)',
              borderRadius: 12,
              padding: '1.25rem',
            }}
          >
            <h2
              className="title"
              style={{
                fontSize: '1.1rem',
                color: 'var(--nba-danger)',
                marginBottom: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Zap size={14} />
              Séries Mais Caras
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {expensiveMisses.map((miss) => (
                <div
                  key={miss.seriesId}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(231,76,60,0.05)',
                    border: '1px solid rgba(231,76,60,0.18)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span
                      className="font-condensed font-bold"
                      style={{ color: 'var(--nba-text)', fontSize: '0.9rem' }}
                    >
                      {miss.matchup}
                    </span>
                    <span
                      className="font-condensed font-bold"
                      style={{ color: 'var(--nba-danger)', fontSize: '0.85rem' }}
                    >
                      -{miss.pointsMissed} pts
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.72rem',
                      color: 'var(--nba-text-muted)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>
                      Apostou:{' '}
                      <strong style={{ color: 'var(--nba-danger)' }}>
                        {miss.pickedWinnerLabel}
                      </strong>
                    </span>
                    {miss.actualWinnerLabel && (
                      <>
                        <span>·</span>
                        <span>
                          Ganhou:{' '}
                          <strong style={{ color: 'var(--nba-success)' }}>
                            {miss.actualWinnerLabel}
                          </strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Relatório detalhado de pontuação */}
      <div style={{ marginTop: 4 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <h2
            className="title"
            style={{ color: 'var(--nba-gold)', fontSize: '1rem', letterSpacing: '0.14em', lineHeight: 1 }}
          >
            RELATÓRIO DE PONTUAÇÃO
          </h2>
          <div style={{ height: 1, flex: 1, background: 'var(--nba-border)' }} />
        </div>
        <ParticipantScoreReport breakdown={breakdown} loading={loading} isOwnProfile={isOwnProfile} />
      </div>

      {/* ── Conquistas ──────────────────────────────────────────────────── */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.08em', color: 'var(--nba-text-muted)', margin: 0 }}>
            CONQUISTAS
          </h2>
          <div style={{ height: 1, flex: 1, background: 'var(--nba-border)' }} />
        </div>

        {earnedBadgeIds.length === 0 ? (
          <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
            Nenhuma conquista ainda — continue palpitando!
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {earnedBadgeIds.map((badgeId) => {
              const def = BADGE_DEFINITIONS[badgeId]
              if (!def) return null
              return (
                <div
                  key={badgeId}
                  style={{
                    background: 'var(--nba-surface)',
                    border: '1px solid var(--nba-border)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{def.emoji}</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: 'var(--nba-gold)', letterSpacing: '0.04em' }}>
                    {def.label.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--nba-text-muted)', lineHeight: 1.4 }}>
                    {def.description}
                  </span>
                </div>
              )
            })}

            {/* Badges não conquistados */}
            {Object.entries(BADGE_DEFINITIONS)
              .filter(([id]) => !earnedBadgeIds.includes(id))
              .map(([badgeId, def]) => (
                <div
                  key={badgeId}
                  style={{
                    background: 'var(--nba-surface)',
                    border: '1px solid rgba(136,136,153,0.12)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    opacity: 0.4,
                    filter: 'grayscale(1)',
                  }}
                >
                  <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{def.emoji}</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: 'var(--nba-text-muted)', letterSpacing: '0.04em' }}>
                    {def.label.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--nba-text-muted)', lineHeight: 1.4 }}>
                    {def.description}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
      </>}
    </div>
  )
}
