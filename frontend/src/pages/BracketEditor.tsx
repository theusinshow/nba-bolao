import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, GitBranch, Target, BadgeCheck, Hourglass } from 'lucide-react'
import { BracketSVG } from '../components/BracketSVG'
import { SeriesModal } from '../components/SeriesModal'
import { GamePickModal } from '../components/GamePickModal'
import { useSeries } from '../hooks/useSeries'
import type { Series } from '../types'

interface Props {
  participantId: string
}

const LEGEND = [
  { color: '#2ecc71', label: 'Acertou'    },
  { color: '#e74c3c', label: 'Errou'      },
  { color: '#c8963c', label: 'Palpitado'  },
  { color: 'rgba(200,150,60,0.2)', label: 'Sem palpite', dashed: true },
]

function BracketHero({
  pickedCount,
  totalSeries,
  pct,
}: {
  pickedCount: number
  totalSeries: number
  pct: number
}) {
  const remaining = Math.max(totalSeries - pickedCount, 0)

  const items = [
    {
      label: 'Palpites feitos',
      value: `${pickedCount}/${totalSeries}`,
      tone: 'var(--nba-text)',
      icon: <Target size={14} />,
    },
    {
      label: 'Em aberto',
      value: remaining,
      tone: remaining === 0 ? 'var(--nba-success)' : 'var(--nba-gold)',
      icon: <Hourglass size={14} />,
    },
    {
      label: 'Progresso',
      value: `${pct}%`,
      tone: pct === 100 ? 'var(--nba-success)' : 'var(--nba-gold)',
      icon: <BadgeCheck size={14} />,
    },
  ]

  return (
    <div
      className="px-4 mb-5"
      style={{
        display: 'grid',
        gap: 14,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(74,144,217,0.2), rgba(200,150,60,0.08) 55%, rgba(19,19,26,1) 100%)',
          border: '1px solid rgba(200,150,60,0.18)',
          borderRadius: 12,
          padding: '1rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at top right, rgba(232,180,90,0.18), transparent 35%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', display: 'grid', gap: 14 }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GitBranch size={18} style={{ color: 'var(--nba-gold)' }} />
                <h1
                  className="title"
                  style={{ color: 'var(--nba-gold)', fontSize: '2rem', lineHeight: 1 }}
                >
                  Meu Bracket
                </h1>
              </div>
              <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', maxWidth: 560 }}>
                Monte seu caminho at&eacute; as finais e acompanhe o quanto do seu bracket j&aacute; est&aacute; preenchido.
              </p>
            </div>

            <Link
              to="/official"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.78rem',
                color: 'var(--nba-text-muted)',
                transition: 'color 0.2s ease',
                flexShrink: 0,
                marginTop: 4,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--nba-gold)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--nba-text-muted)' }}
            >
              <Trophy size={14} />
              Ver bracket oficial
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            {items.map((item) => (
              <div
                key={item.label}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(12,12,18,0.34)',
                  border: '1px solid rgba(200,150,60,0.16)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--nba-text-muted)', fontSize: '0.7rem', marginBottom: 6 }}>
                  {item.icon}
                  {item.label}
                </div>
                <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.32rem', lineHeight: 1 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          background: 'var(--nba-surface)',
          border: '1px solid var(--nba-border)',
          borderRadius: 12,
          padding: '0.9rem 1rem',
        }}
      >
        <div className="flex justify-between mb-2" style={{ fontSize: '0.75rem', color: 'var(--nba-text-muted)' }}>
          <span>{pickedCount} de {totalSeries} s&eacute;ries palpitadas</span>
          <span style={{ color: pct === 100 ? 'var(--nba-success)' : 'var(--nba-text-muted)' }}>
            {pct}%
          </span>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 99,
            background: 'var(--nba-surface-2)',
            overflow: 'hidden',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: 99,
              background: pct === 100 ? 'var(--nba-success)' : 'linear-gradient(90deg, var(--nba-gold), #f0b64b)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        <div
          className="flex flex-wrap gap-x-5 gap-y-2"
          style={{ fontSize: '0.78rem', color: 'var(--nba-text-muted)' }}
        >
          {LEGEND.map(({ color, label, dashed }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  border: `1.5px ${dashed ? 'dashed' : 'solid'} ${color}`,
                  flexShrink: 0,
                }}
              />
              {label}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#c8963c', fontSize: '0.9rem' }}>★</span>
            Meu palpite
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#2ecc71', fontSize: '0.9rem' }}>✓</span>
            Vencedor
          </span>
        </div>
      </div>
    </div>
  )
}

export function BracketEditor({ participantId }: Props) {
  const { series, picks, loading, savePick, getPickForSeries } = useSeries(participantId)
  const [selectedSeries, setSelectedSeries]   = useState<Series | null>(null)
  const [gamePickSeries, setGamePickSeries]    = useState<Series | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--nba-gold)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  const pickedCount = picks.length
  const totalSeries = series.length
  const pct         = totalSeries > 0 ? Math.round((pickedCount / totalSeries) * 100) : 0

  return (
    <div className="pb-24 pt-4">
      <BracketHero pickedCount={pickedCount} totalSeries={totalSeries} pct={pct} />

      {/* ── Bracket SVG ────────────────────────────────────────────────── */}
      <div
        className="px-2"
        style={{ position: 'relative' }}
      >
        {/* Fade hint on right edge for mobile */}
        <div
          className="md:hidden"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 32,
            background: 'linear-gradient(to right, transparent, var(--nba-bg))',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        <BracketSVG
          series={series}
          picks={picks}
          onSeriesClick={(s) => setSelectedSeries(s)}
        />
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {selectedSeries && (
        <SeriesModal
          series={selectedSeries}
          existingPick={getPickForSeries(selectedSeries.id)}
          onSave={savePick}
          onClose={() => setSelectedSeries(null)}
        />
      )}

      {gamePickSeries && (
        <GamePickModal
          series={gamePickSeries}
          participantId={participantId}
          onClose={() => setGamePickSeries(null)}
        />
      )}
    </div>
  )
}
