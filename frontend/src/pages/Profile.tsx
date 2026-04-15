import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, Target, TrendingUp, Zap } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useParticipantProfile } from '../hooks/useParticipantProfile'
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

// ─── Página ───────────────────────────────────────────────────────────────────

export function Profile() {
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

      {/* Round accuracy chart */}
      {chartData.length > 0 && (
        <div
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

      {/* Empty state */}
      {!breakdown && (
        <div
          style={{
            background: 'var(--nba-surface)',
            border: '1px solid var(--nba-border)',
            borderRadius: 12,
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <p style={{ color: 'var(--nba-text-muted)' }}>Nenhum palpite feito ainda.</p>
        </div>
      )}
    </div>
  )
}
