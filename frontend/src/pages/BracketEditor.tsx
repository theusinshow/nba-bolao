import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, GitBranch, Target, BadgeCheck, Hourglass, X } from 'lucide-react'
import { BracketSVG } from '../components/BracketSVG'
import { SeriesModal } from '../components/SeriesModal'
import { GamePickModal } from '../components/GamePickModal'
import { useSeries } from '../hooks/useSeries'
import type { Series } from '../types'
import { getSeriesSlot, isSeriesReadyForPick } from '../utils/bracket'

interface Props {
  participantId: string
}

const LEGEND = [
  { color: '#2ecc71', label: 'Acertou'    },
  { color: '#e74c3c', label: 'Errou'      },
  { color: '#c8963c', label: 'Palpitado'  },
  { color: 'rgba(200,150,60,0.2)', label: 'Sem palpite', dashed: true },
]

const MOBILE_SECTIONS = [
  { key: 'full', label: 'Tudo' },
  { key: 'west', label: 'Oeste' },
  { key: 'finals', label: 'Finais' },
  { key: 'east', label: 'Leste' },
] as const

function MobileBracketSheet({
  series,
  picks,
  onClose,
  onSeriesSelect,
  focusSection,
}: {
  series: Series[]
  picks: ReturnType<typeof useSeries>['picks']
  onClose: () => void
  onSeriesSelect: (series: Series) => void
  focusSection: 'west' | 'finals' | 'east' | 'full'
}) {
  const pickBySeries = Object.fromEntries(picks.map((pick) => [pick.series_id, pick]))
  const roundLabels: Record<number, string> = {
    1: '1ª rodada',
    2: '2ª rodada',
    3: 'Final de conferência',
    4: 'Finais da NBA',
  }

  const filteredSeries = [...series].filter((item) => {
    if (focusSection === 'full') return true
    if (focusSection === 'west') return item.conference === 'West'
    if (focusSection === 'east') return item.conference === 'East'
    return item.round >= 3
  })

  const ordered = filteredSeries.sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round
    return getSeriesSlot(a).localeCompare(getSeriesSlot(b))
  })

  const focusLabel =
    focusSection === 'full'
      ? 'Todos os lados da chave'
      : focusSection === 'west'
      ? 'Somente a conferência Oeste'
      : focusSection === 'east'
      ? 'Somente a conferência Leste'
      : 'Finais de conferência e finais da NBA'

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.68)',
          zIndex: 45,
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 46,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          background: 'rgba(19,19,26,0.98)',
          borderTop: '1px solid rgba(200,150,60,0.18)',
          padding: '16px 16px calc(16px + env(safe-area-inset-bottom))',
          maxHeight: '78vh',
          overflowY: 'auto',
          boxShadow: '0 -14px 40px rgba(0,0,0,0.32)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div>
            <div className="title" style={{ color: 'var(--nba-gold)', fontSize: '1.2rem', letterSpacing: '0.08em' }}>
              Chave Mobile
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.78rem' }}>
              {focusLabel}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: '1px solid rgba(200,150,60,0.12)',
              background: 'rgba(28,28,38,0.9)',
              color: 'var(--nba-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {ordered.length === 0 && (
            <div
              style={{
                padding: '14px 12px',
                borderRadius: 12,
                background: 'rgba(12,12,18,0.4)',
                border: '1px solid rgba(200,150,60,0.12)',
                color: 'var(--nba-text-muted)',
                fontSize: '0.82rem',
              }}
            >
              Nenhum confronto disponível neste filtro ainda.
            </div>
          )}

          {ordered.map((item) => {
            const home = item.home_team?.abbreviation ?? '—'
            const away = item.away_team?.abbreviation ?? '—'
            const pick = pickBySeries[item.id]
            const pickTeam = pick?.winner_id === item.home_team?.id
              ? item.home_team?.abbreviation
              : pick?.winner_id === item.away_team?.id
              ? item.away_team?.abbreviation
              : null

            return (
              <button
                key={item.id}
                onClick={() => {
                  onClose()
                  onSeriesSelect(item)
                }}
                style={{
                  width: '100%',
                  padding: '12px 12px',
                  borderRadius: 12,
                  background: 'rgba(12,12,18,0.4)',
                  border: '1px solid rgba(200,150,60,0.12)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <span className="font-condensed" style={{ color: 'var(--nba-gold)', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
                    {roundLabels[item.round]}
                  </span>
                  <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>
                    {item.conference ?? 'NBA'} {getSeriesSlot(item)}
                  </span>
                </div>

                <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1.1rem', lineHeight: 1 }}>
                  {home} <span style={{ color: 'var(--nba-text-muted)' }}>vs</span> {away}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {pickTeam && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: 'rgba(200,150,60,0.1)',
                        border: '1px solid rgba(200,150,60,0.18)',
                        color: 'var(--nba-gold)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                      }}
                    >
                      Seu palpite: {pickTeam}
                    </span>
                  )}
                  {item.is_complete && item.winner && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: 'rgba(46,204,113,0.1)',
                        border: '1px solid rgba(46,204,113,0.18)',
                        color: 'var(--nba-success)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                      }}
                    >
                      Vencedor: {item.winner.abbreviation}
                    </span>
                  )}
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(200,150,60,0.12)',
                      color: 'var(--nba-text-muted)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                    }}
                  >
                    Tocar para abrir
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

function BracketHero({
  pickedCount,
  totalSeries,
  readySeries,
  pct,
  roundSummaries,
}: {
  pickedCount: number
  totalSeries: number
  readySeries: number
  pct: number
  roundSummaries: Array<{
    label: string
    picked: number
    total: number
    pendingDefinition: number
  }>
}) {
  const remaining = Math.max(readySeries - pickedCount, 0)

  const items = [
    {
      label: 'Palpites feitos',
      value: `${pickedCount}/${readySeries}`,
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
                Monte seu caminho at&eacute; as finais e acompanhe o progresso apenas das rodadas que j&aacute; foram definidas.
              </p>
            </div>

            <Link
              to="/official"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                justifyContent: 'center',
                fontSize: '0.78rem',
                color: 'var(--nba-text-muted)',
                transition: 'color 0.2s ease',
                flexShrink: 0,
                marginTop: 4,
                padding: '9px 12px',
                borderRadius: 10,
                border: '1px solid rgba(200,150,60,0.12)',
                background: 'rgba(12,12,18,0.28)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--nba-gold)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--nba-text-muted)' }}
            >
              <Trophy size={14} />
              Ver bracket oficial
            </Link>
          </div>

          <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 sm:grid-cols-3">
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
          <span>{pickedCount} de {readySeries} s&eacute;ries dispon&iacute;veis palpitadas</span>
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

        <div
          style={{
            display: 'grid',
            gap: 10,
            marginTop: 14,
          }}
          className="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
        >
          {roundSummaries.map((round) => (
            <div
              key={round.label}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(12,12,18,0.3)',
                border: '1px solid rgba(200,150,60,0.12)',
              }}
            >
              <div
                className="font-condensed"
                style={{ color: 'var(--nba-gold)', fontSize: '0.82rem', letterSpacing: '0.08em', marginBottom: 6 }}
              >
                {round.label}
              </div>
              <div style={{ color: 'var(--nba-text)', fontSize: '0.86rem', fontWeight: 700 }}>
                {round.picked}/{round.total} palpites
              </div>
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 4 }}>
                {round.pendingDefinition > 0
                  ? `${round.pendingDefinition} aguardando definição`
                  : 'Tudo liberado nesta fase'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function BracketEditor({ participantId }: Props) {
  const { series, picks, loading, savePick, getPickForSeries } = useSeries(participantId)
  const [selectedSeries, setSelectedSeries]   = useState<Series | null>(null)
  const [gamePickSeries, setGamePickSeries]    = useState<Series | null>(null)
  const [mobileFocus, setMobileFocus] = useState<'west' | 'finals' | 'east' | 'full'>('full')
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)

  if (loading) {
    return (
      <div className="pb-24 pt-4 px-2 md:px-6 lg:px-10">
        <BracketSVG series={[]} loading />
      </div>
    )
  }

  const roundMeta = [
    { round: 1, label: '1ª rodada' },
    { round: 2, label: '2ª rodada' },
    { round: 3, label: 'Finais de conferência' },
    { round: 4, label: 'Grande final' },
  ] as const

  const readySeries = series.filter(isSeriesReadyForPick)
  const readySeriesIds = new Set(readySeries.map((item) => item.id))
  const pickedCount = picks.filter((pick) => readySeriesIds.has(pick.series_id)).length
  const totalSeries = series.length
  const pct = readySeries.length > 0 ? Math.round((pickedCount / readySeries.length) * 100) : 0
  const roundSummaries = roundMeta.map(({ round, label }) => {
    const roundSeries = series.filter((item) => item.round === round)
    const roundReady = roundSeries.filter(isSeriesReadyForPick)
    const roundReadyIds = new Set(roundReady.map((item) => item.id))

    return {
      label,
      picked: picks.filter((pick) => roundReadyIds.has(pick.series_id)).length,
      total: roundReady.length,
      pendingDefinition: Math.max(roundSeries.length - roundReady.length, 0),
    }
  })

  return (
    <div className="pb-24 pt-4">
      <BracketHero
        pickedCount={pickedCount}
        totalSeries={totalSeries}
        readySeries={readySeries.length}
        pct={pct}
        roundSummaries={roundSummaries}
      />

      {/* ── Bracket SVG ────────────────────────────────────────────────── */}
      <div
        className="px-2 md:px-6 lg:px-10"
        style={{ position: 'relative' }}
      >
        <div
          className="md:hidden"
          style={{
            margin: '0 8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
            {MOBILE_SECTIONS.map((section) => (
              <button
                key={section.key}
                onClick={() => setMobileFocus(section.key)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: mobileFocus === section.key ? '1px solid rgba(200,150,60,0.28)' : '1px solid rgba(200,150,60,0.12)',
                  background: mobileFocus === section.key ? 'rgba(200,150,60,0.12)' : 'rgba(12,12,18,0.4)',
                  color: mobileFocus === section.key ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {section.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setMobileSheetOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 999,
              border: '1px solid rgba(74,144,217,0.26)',
              background: 'rgba(74,144,217,0.12)',
              color: 'var(--nba-east)',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <GitBranch size={14} />
            Chave
          </button>
        </div>

        <BracketSVG
          series={series}
          picks={picks}
          onSeriesClick={(s) => setSelectedSeries(s)}
          focusSection={mobileFocus}
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

      {mobileSheetOpen && (
        <MobileBracketSheet
          series={series}
          picks={picks}
          onClose={() => setMobileSheetOpen(false)}
          onSeriesSelect={setSelectedSeries}
          focusSection={mobileFocus}
        />
      )}
    </div>
  )
}
