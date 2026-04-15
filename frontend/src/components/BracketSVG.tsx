import { useEffect, useRef, useState } from 'react'
import { Trophy } from 'lucide-react'
import type { Series, SeriesPick } from '../types'
import { getSeriesSlot, getSeriesTeamDisplay, isSeriesReadyForPick } from '../utils/bracket'
import { teamAbbrStyle, teamAbbrSVGProps } from '../utils/teamColors'
import { SkeletonCard } from './SkeletonCard'

// ─── Team logo helper ────────────────────────────────────────────────────────
function teamLogoUrl(abbreviation: string): string {
  return `https://a.espncdn.com/i/teamlogos/nba/500/${abbreviation.toLowerCase()}.png`
}

// ─── Layout constants ────────────────────────────────────────────────────────
const BOX_W    = 148   // width of each series box
const BOX_H    = 90    // height of each series box (45px per team row)
const COL_GAP  = 40    // horizontal gap between columns
const ROW_GAP  = 18    // vertical gap between boxes in same column
const SVG_PAD  = 28    // padding around the whole SVG
const LABEL_H  = 28    // extra space above content for column labels

// Column x-positions
const COLS = {
  WR1: 0,
  WR2: BOX_W + COL_GAP,
  WCF: (BOX_W + COL_GAP) * 2,
  FIN: (BOX_W + COL_GAP) * 3,
  ECF: (BOX_W + COL_GAP) * 4,
  ER2: (BOX_W + COL_GAP) * 5,
  ER1: (BOX_W + COL_GAP) * 6,
}

const SVG_W  = COLS.ER1 + BOX_W
const TOTAL_H = 4 * BOX_H + 3 * ROW_GAP

// Distribute `colSlots.length` boxes evenly across TOTAL_H
function slotY(count: number, idx: number): number {
  const step = TOTAL_H / count
  return step * idx + step / 2 - BOX_H / 2
}

const R1_YS = [0, 1, 2, 3].map((i) => slotY(4, i))
const R2_YS = [0, 1].map((i) => slotY(2, i))
const CF_Y  = slotY(1, 0)
const FIN_Y = slotY(1, 0)

interface SlotDef {
  id: string
  x: number
  y: number
}

const SLOT_DEFS: SlotDef[] = [
  { id: 'W1-1', x: COLS.WR1, y: R1_YS[0] },
  { id: 'W1-2', x: COLS.WR1, y: R1_YS[1] },
  { id: 'W1-3', x: COLS.WR1, y: R1_YS[2] },
  { id: 'W1-4', x: COLS.WR1, y: R1_YS[3] },
  { id: 'W2-1', x: COLS.WR2, y: R2_YS[0] },
  { id: 'W2-2', x: COLS.WR2, y: R2_YS[1] },
  { id: 'WCF',  x: COLS.WCF, y: CF_Y      },
  { id: 'FIN',  x: COLS.FIN, y: FIN_Y     },
  { id: 'ECF',  x: COLS.ECF, y: CF_Y      },
  { id: 'E2-1', x: COLS.ER2, y: R2_YS[0] },
  { id: 'E2-2', x: COLS.ER2, y: R2_YS[1] },
  { id: 'E1-1', x: COLS.ER1, y: R1_YS[0] },
  { id: 'E1-2', x: COLS.ER1, y: R1_YS[1] },
  { id: 'E1-3', x: COLS.ER1, y: R1_YS[2] },
  { id: 'E1-4', x: COLS.ER1, y: R1_YS[3] },
]

// Connections: [fromId, toId, 'left'|'right']
// 'left'  = exits right side of from, enters left  side of to
// 'right' = exits left  side of from, enters right side of to
const CONNECTIONS: Array<[string, string, 'left' | 'right']> = [
  ['W1-1', 'W2-1', 'left'],
  ['W1-2', 'W2-1', 'left'],
  ['W1-3', 'W2-2', 'left'],
  ['W1-4', 'W2-2', 'left'],
  ['W2-1', 'WCF',  'left'],
  ['W2-2', 'WCF',  'left'],
  ['WCF',  'FIN',  'left'],
  ['FIN',  'ECF',  'right'],
  ['ECF',  'E2-1', 'right'],
  ['ECF',  'E2-2', 'right'],
  ['E2-1', 'E1-1', 'right'],
  ['E2-1', 'E1-2', 'right'],
  ['E2-2', 'E1-3', 'right'],
  ['E2-2', 'E1-4', 'right'],
]

function getSlot(id: string): SlotDef | undefined {
  return SLOT_DEFS.find((s) => s.id === id)
}

// ─── Pick status helper ───────────────────────────────────────────────────────

function pickStatus(s: Series, pick?: SeriesPick): 'correct' | 'wrong' | 'picked' | 'none' {
  if (!pick) return 'none'
  if (!s.is_complete) return 'picked'
  return pick.winner_id === s.winner_id ? 'correct' : 'wrong'
}

// ─── Mobile round labels ──────────────────────────────────────────────────────

const ROUND_LABELS: Record<number, string> = {
  1: 'PRIMEIRA RODADA',
  2: 'SEGUNDA RODADA',
  3: 'CONF FINALS',
  4: 'NBA FINALS',
}

// ─── Mobile series card ───────────────────────────────────────────────────────

function MobileSeriesCard({
  s,
  pick,
  comparePick,
  myPick,
  isCompareMode,
  onClick,
}: {
  s: Series
  pick?: SeriesPick
  comparePick?: SeriesPick
  myPick?: SeriesPick
  isCompareMode: boolean
  onClick?: () => void
}) {
  const [logoErr, setLogoErr] = useState({ a: false, b: false })

  const tA = s.home_team
  const tB = s.away_team
  const homeDisplay = getSeriesTeamDisplay(s, 'home')
  const awayDisplay = getSeriesTeamDisplay(s, 'away')
  const matchupReady = isSeriesReadyForPick(s)
  const isComplete = s.is_complete
  const tAWins = isComplete && s.winner_id === tA?.id
  const tBWins = isComplete && s.winner_id === tB?.id
  const score   = isComplete && s.games_played ? `4-${s.games_played - 4}` : null

  const status = pickStatus(s, pick)

  const BADGE: Record<typeof status, { label: string; color: string; bg: string }> = {
    none:    { label: 'Sem palpite', color: 'var(--nba-text-muted)',  bg: 'rgba(255,255,255,0.04)' },
    picked:  { label: 'Palpitado',   color: 'var(--nba-gold)',        bg: 'rgba(200,150,60,0.10)'  },
    correct: { label: 'Acertou',     color: 'var(--nba-success)',     bg: 'rgba(46,204,113,0.10)'  },
    wrong:   { label: 'Errou',       color: 'var(--nba-danger)',      bg: 'rgba(231,76,60,0.10)'   },
  }
  const badge = BADGE[status]

  // Border color: compare mode or pick-status
  let borderColor: string
  if (isCompareMode) {
    if (myPick && comparePick) {
      borderColor = myPick.winner_id === comparePick.winner_id
        ? 'rgba(46,204,113,0.7)'
        : 'rgba(231,76,60,0.7)'
    } else if (myPick || comparePick) {
      borderColor = 'rgba(241,196,15,0.7)'
    } else {
      borderColor = 'rgba(200,150,60,0.2)'
    }
  } else {
    borderColor =
      status === 'correct' ? 'rgba(46,204,113,0.7)'  :
      status === 'wrong'   ? 'rgba(231,76,60,0.7)'   :
      status === 'picked'  ? 'rgba(200,150,60,0.5)'  :
      'var(--nba-border)'
  }

  const pickedTeamId = pick?.winner_id
  const colorA = tA?.primary_color   ?? '#c8963c'
  const colorB = tB?.primary_color   ?? '#c8963c'
  const secA   = tA?.secondary_color ?? 'rgba(200,150,60,0.4)'
  const secB   = tB?.secondary_color ?? 'rgba(200,150,60,0.4)'

  // Gradient border: secondary colors when no pick status, solid when picked/correct/wrong
  const hasPick = status !== 'none'
  const cardBackground = hasPick
    ? `linear-gradient(to right, ${colorA}10 0%, var(--nba-surface) 32%, var(--nba-surface) 68%, ${colorB}10 100%) padding-box,
       linear-gradient(${borderColor}, ${borderColor}) border-box`
    : `linear-gradient(to right, ${colorA}10 0%, var(--nba-surface) 32%, var(--nba-surface) 68%, ${colorB}10 100%) padding-box,
       linear-gradient(to right, ${secA} 50%, ${secB} 50%) border-box`

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        width: '100%',
        background: cardBackground,
        border: '1.5px solid transparent',
        borderRadius: 10,
        padding: 0,
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        overflow: 'hidden',
        transition: 'background 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Teams row */}
      <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 82 }}>

        {/* Team A (home) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '14px 12px',
            borderLeft: `3px solid ${secA}`,
            background: tAWins ? 'rgba(46,204,113,0.07)' : 'transparent',
            opacity: isComplete && !tAWins ? 0.4 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {tA && !homeDisplay.isPlaceholder && !logoErr.a ? (
            <img
              src={teamLogoUrl(tA.abbreviation)}
              alt={tA.abbreviation}
              onError={() => setLogoErr((e) => ({ ...e, a: true }))}
              style={{ width: 44, height: 44, objectFit: 'contain' }}
            />
          ) : (
            <span
              className="font-condensed font-bold"
              style={{
                ...(homeDisplay.isPlaceholder
                  ? { color: 'var(--nba-text-muted)' }
                  : teamAbbrStyle(tA?.primary_color)),
                fontSize: '1.9rem',
                lineHeight: 1,
                letterSpacing: '-0.01em',
              }}
            >
              {homeDisplay.abbreviation}
            </span>
          )}
          <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginTop: 3 }}>
            {homeDisplay.isPlaceholder ? homeDisplay.name : tA?.name?.split(' ').pop() ?? ''}
          </span>
          {/* Pick star */}
          {pickedTeamId === tA?.id && !isComplete && (
            <span style={{ color: 'var(--nba-gold)', fontSize: '0.7rem', marginTop: 4 }}>★ seu palpite</span>
          )}
          {/* Winner check */}
          {tAWins && (
            <span style={{ color: 'var(--nba-success)', fontSize: '0.72rem', fontWeight: 700, marginTop: 4 }}>✓ vencedor</span>
          )}
        </div>

        {/* Center: VS or score */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 8px',
            minWidth: 52,
            borderLeft: '1px solid var(--nba-border)',
            borderRight: '1px solid var(--nba-border)',
          }}
        >
          {score ? (
            <>
              <span
                className="font-condensed font-bold"
                style={{ color: 'var(--nba-gold)', fontSize: '1.1rem', lineHeight: 1 }}
              >
                {score}
              </span>
              <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.6rem', marginTop: 3 }}>final</span>
            </>
          ) : (
            <span
              className="font-condensed"
              style={{ color: 'var(--nba-text-muted)', fontSize: '1rem', letterSpacing: 1 }}
            >
              VS
            </span>
          )}
        </div>

        {/* Team B (away) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '14px 12px',
            borderRight: `3px solid ${secB}`,
            background: tBWins ? 'rgba(46,204,113,0.07)' : 'transparent',
            opacity: isComplete && !tBWins ? 0.4 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {tB && !awayDisplay.isPlaceholder && !logoErr.b ? (
            <img
              src={teamLogoUrl(tB.abbreviation)}
              alt={tB.abbreviation}
              onError={() => setLogoErr((e) => ({ ...e, b: true }))}
              style={{ width: 44, height: 44, objectFit: 'contain' }}
            />
          ) : (
            <span
              className="font-condensed font-bold"
              style={{
                ...(awayDisplay.isPlaceholder
                  ? { color: 'var(--nba-text-muted)' }
                  : teamAbbrStyle(tB?.primary_color)),
                fontSize: '1.9rem',
                lineHeight: 1,
                letterSpacing: '-0.01em',
              }}
            >
              {awayDisplay.abbreviation}
            </span>
          )}
          <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginTop: 3, textAlign: 'right' }}>
            {awayDisplay.isPlaceholder ? awayDisplay.name : tB?.name?.split(' ').pop() ?? ''}
          </span>
          {pickedTeamId === tB?.id && !isComplete && (
            <span style={{ color: 'var(--nba-gold)', fontSize: '0.7rem', marginTop: 4 }}>★ seu palpite</span>
          )}
          {tBWins && (
            <span style={{ color: 'var(--nba-success)', fontSize: '0.72rem', fontWeight: 700, marginTop: 4 }}>✓ vencedor</span>
          )}
        </div>
      </div>

      {/* Status footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          padding: '7px 12px',
          borderTop: '1px solid var(--nba-border)',
          background: badge.bg,
        }}
        >
          <span style={{ color: badge.color, fontSize: '0.72rem', fontWeight: 600 }}>
            {badge.label}
          </span>
          {!matchupReady && (
            <span style={{ color: 'var(--nba-east)', fontSize: '0.68rem', fontWeight: 600 }}>
              Aguardando play-in
            </span>
          )}
          {/* Champion badge for Finals */}
          {s.winner && isComplete && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--nba-gold)', fontSize: '0.68rem' }}>
              <Trophy size={10} />
              {s.winner.abbreviation}
            </span>
          )}
        {onClick && (
          <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>
            Tocar para palpitar →
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Mobile bracket view ──────────────────────────────────────────────────────

function MobileBracketView({
  series,
  picks,
  comparePicks,
  onSeriesClick,
  focusSection = 'full',
}: {
  series: Series[]
  picks: SeriesPick[]
  comparePicks?: SeriesPick[]
  onSeriesClick?: (s: Series) => void
  focusSection?: 'west' | 'finals' | 'east' | 'full'
}) {
  const pickBySeriesId    = Object.fromEntries(picks.map((p) => [p.series_id, p]))
  const compareBySeriesId = comparePicks
    ? Object.fromEntries(comparePicks.map((p) => [p.series_id, p]))
    : null
  const isCompareMode = !!comparePicks

  const filteredSeries = series.filter((s) => {
    if (focusSection === 'full') return true
    if (focusSection === 'finals') return s.round >= 3
    if (focusSection === 'west') return s.conference === 'West'
    if (focusSection === 'east') return s.conference === 'East'
    return true
  })

  const rounds = ([1, 2, 3, 4] as const).map((r) => ({
    round: r,
    label: ROUND_LABELS[r],
    items: filteredSeries.filter((s) => s.round === r),
  })).filter((g) => g.items.length > 0)

  const ROUND_COLOR: Record<number, string> = {
    1: 'var(--nba-east)',
    2: '#9b59b6',
    3: 'var(--nba-west)',
    4: 'var(--nba-gold)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, padding: '4px 0 8px' }}>
      {rounds.map(({ round, label, items }) => (
        <div key={round}>
          {/* Round header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: `${ROUND_COLOR[round]}18`,
              border: `1px solid ${ROUND_COLOR[round]}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: ROUND_COLOR[round], fontSize: '0.76rem', fontWeight: 700,
            }}>
              {round === 4 ? '★' : `R${round}`}
            </div>
            <span
              className="title"
              style={{
                color: ROUND_COLOR[round],
                fontSize: '1rem',
                letterSpacing: '0.1em',
              }}
            >
              {label}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--nba-border)' }} />
            <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem', flexShrink: 0 }}>
              {items.length} {items.length === 1 ? 'série' : 'séries'}
            </span>
          </div>

          {/* Series cards — 2-col grid on sm+ for R1/R2 */}
          <div className={round <= 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : ''} style={round > 2 ? { display: 'flex', flexDirection: 'column', gap: 12 } : {}}>
            {items.map((s) => (
              <MobileSeriesCard
                key={s.id}
                s={s}
                pick={pickBySeriesId[s.id]}
                comparePick={compareBySeriesId?.[s.id]}
                myPick={pickBySeriesId[s.id]}
                isCompareMode={isCompareMode}
                onClick={onSeriesClick ? () => onSeriesClick(s) : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  series: Series[]
  picks?: SeriesPick[]
  loading?: boolean
  onSeriesClick?: (series: Series) => void
  // Compare mode — when provided, border colours reflect agreement instead of pick outcome
  comparePicks?: SeriesPick[]
  onSeriesHover?: (series: Series | null, clientX: number, clientY: number) => void
  focusSection?: 'west' | 'finals' | 'east' | 'full'
}

function BracketSkeleton({ mobile }: { mobile: boolean }) {
  if (mobile) {
    return (
      <div style={{ display: 'grid', gap: 18, padding: '4px 0 8px' }}>
        {Array.from({ length: 4 }).map((_, group) => (
          <div key={group} style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <SkeletonCard width={28} height={28} radius={999} />
              <SkeletonCard width={160} height={16} />
              <SkeletonCard width="100%" height={1} />
            </div>
            {Array.from({ length: group < 2 ? 2 : 1 }).map((__, index) => (
              <SkeletonCard key={index} width="100%" height={100} radius={10} />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ minWidth: 1300, display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))', gap: 12 }}>
          {Array.from({ length: 7 }).map((_, index) => (
            <SkeletonCard key={index} width="100%" height={12} />
          ))}
        </div>
        <SkeletonCard width="100%" height={1} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))', gap: 12 }}>
          {Array.from({ length: 15 }).map((_, index) => (
            <SkeletonCard key={index} width="100%" height={90} radius={8} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function BracketSVG({ series, picks = [], loading = false, onSeriesClick, comparePicks, onSeriesHover, focusSection = 'full' }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const seriesById     = Object.fromEntries(series.map((s) => [getSeriesSlot(s), s]))
  const pickBySeriesId = Object.fromEntries(picks.map((p) => [p.series_id, p]))
  const compareById    = comparePicks
    ? Object.fromEntries(comparePicks.map((p) => [p.series_id, p]))
    : null

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const maxScroll = Math.max(container.scrollWidth - container.clientWidth, 0)

    const targets = {
      west: 0,
      finals: Math.max((container.scrollWidth - container.clientWidth) / 2, 0),
      east: maxScroll,
      full: 0,
    } as const

    container.scrollTo({
      left: targets[focusSection],
      behavior: 'smooth',
    })
  }, [focusSection])

  if (loading) {
    return <BracketSkeleton mobile={isMobile} />
  }

  // ── Mobile view ─────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <MobileBracketView
        series={series}
        picks={picks}
        comparePicks={comparePicks}
        onSeriesClick={onSeriesClick}
        focusSection={focusSection}
      />
    )
  }

  // ── Desktop SVG view (unchanged) ────────────────────────────────────────────

  function pickForSlot(id: string): SeriesPick | undefined {
    const s = seriesById[id]
    return s ? pickBySeriesId[s.id] : undefined
  }

  // ── Connectors ─────────────────────────────────────────────────────────────
  function renderConnections() {
    return CONNECTIONS.map(([fromId, toId, side], i) => {
      const from = getSlot(fromId)
      const to   = getSlot(toId)
      if (!from || !to) return null

      const x1 = side === 'left' ? from.x + BOX_W : from.x
      const y1 = from.y + BOX_H / 2
      const x2 = side === 'left' ? to.x            : to.x + BOX_W
      const y2 = to.y + BOX_H / 2
      const mx = (x1 + x2) / 2

      return (
        <path
          key={i}
          d={`M ${x1} ${y1} H ${mx} V ${y2} H ${x2}`}
          fill="none"
          stroke="rgba(200,150,60,0.25)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    })
  }

  // ── Series box ─────────────────────────────────────────────────────────────
  function renderBox(def: SlotDef) {
    const s       = seriesById[def.id]
    const pick    = pickForSlot(def.id)
    const status  = s ? pickStatus(s, pick) : 'none'

    const tA = s?.home_team
    const tB = s?.away_team
    const homeDisplay = s ? getSeriesTeamDisplay(s, 'home') : { abbreviation: '—', name: '', isPlaceholder: true }
    const awayDisplay = s ? getSeriesTeamDisplay(s, 'away') : { abbreviation: '—', name: '', isPlaceholder: true }
    const isComplete  = s?.is_complete ?? false
    const isClickable = !!s && !!onSeriesClick
    const matchupReady = s ? isSeriesReadyForPick(s) : false

    const tAWins = isComplete && s?.winner_id === tA?.id
    const tBWins = isComplete && s?.winner_id === tB?.id
    const score  = isComplete && s?.games_played ? `4-${s.games_played - 4}` : ''

    // Row heights / vertical midpoints
    const rowH = BOX_H / 2   // 35
    const yA   = rowH / 2    // 17.5 — center of top row
    const yB   = rowH + rowH / 2  // 52.5 — center of bottom row

    // Box border: compare mode overrides pick-status colours
    let borderColor: string
    if (compareById && s) {
      const myPick    = pickBySeriesId[s.id]
      const otherPick = compareById[s.id]
      if (myPick && otherPick) {
        borderColor = myPick.winner_id === otherPick.winner_id
          ? 'rgba(46,204,113,0.7)'    // agree — green
          : 'rgba(231,76,60,0.7)'     // disagree — red
      } else if (myPick || otherPick) {
        borderColor = 'rgba(241,196,15,0.7)'  // only one picked — yellow
      } else {
        borderColor = 'rgba(200,150,60,0.2)'  // neither
      }
    } else {
      borderColor =
        status === 'correct' ? '#2ecc71' :
        status === 'wrong'   ? '#e74c3c' :
        status === 'picked'  ? '#c8963c' :
        'rgba(200,150,60,0.2)'
    }

    const baseFont = "'Barlow Condensed', sans-serif"

    return (
      <g
        key={def.id}
        transform={`translate(${def.x}, ${def.y})`}
        onClick={() => s && onSeriesClick?.(s)}
        onMouseEnter={(e) => s && onSeriesHover?.(s, e.clientX, e.clientY)}
        onMouseLeave={() => onSeriesHover?.(null, 0, 0)}
        className={isClickable ? 'bracket-slot clickable' : 'bracket-slot'}
      >
        {/* ── Box shell ── */}
        <rect
          width={BOX_W}
          height={BOX_H}
          rx={7}
          fill="#13131a"
          stroke={status === 'none' && !compareById ? `url(#sec-${def.id})` : borderColor}
          strokeWidth={1.5}
        />

        {/* ── Team A ── */}
        {/* Secondary color left strip */}
        {tA?.secondary_color && (
          <rect x={0} y={1.5} width={3} height={rowH - 3} rx={1.5} fill={tA.secondary_color} />
        )}
        {/* Winner highlight tint */}
        {tAWins && (
          <rect
            x={1.5} y={1.5}
            width={BOX_W - 3} height={rowH - 2}
            rx={5}
            fill="rgba(46,204,113,0.10)"
          />
        )}

        {/* Logo + Abbreviation */}
        {tA && !homeDisplay.isPlaceholder ? (
          <image
            href={teamLogoUrl(tA.abbreviation)}
            x={8} y={(rowH - 28) / 2}
            width={28} height={28}
            opacity={isComplete && !tAWins ? 0.35 : 1}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          <text
            x={12} y={yA}
            dominantBaseline="middle"
            fill="#6f88aa"
            fontSize={13}
            fontFamily={baseFont}
            fontWeight="700"
          >
            {homeDisplay.abbreviation}
          </text>
        )}
        {tA && !homeDisplay.isPlaceholder && (
          <text
            x={40} y={yA}
            dominantBaseline="middle"
            {...teamAbbrSVGProps(tA.primary_color)}
            fontSize={11}
            fontFamily={baseFont}
            fontWeight="700"
            opacity={isComplete && !tAWins ? 0.35 : 1}
          >
            {homeDisplay.abbreviation}
          </text>
        )}

        {/* Score (on winner row) */}
        {score && tAWins && (
          <text
            x={BOX_W - 26} y={yA}
            dominantBaseline="middle"
            textAnchor="end"
            fill="#c8963c"
            fontSize={11}
            fontFamily={baseFont}
            fontWeight="700"
          >
            {score}
          </text>
        )}

        {/* Winner ✓ */}
        {tAWins && (
          <text
            x={BOX_W - 10} y={yA}
            dominantBaseline="middle"
            textAnchor="middle"
            fill="#2ecc71"
            fontSize={13}
            fontWeight="700"
          >
            ✓
          </text>
        )}

        {/* User pick ★ */}
        {pick && !isComplete && pick.winner_id === tA?.id && (
          <text
            x={BOX_W - 10} y={yA}
            dominantBaseline="middle"
            textAnchor="middle"
            fill="#c8963c"
            fontSize={12}
          >
            ★
          </text>
        )}

        {/* ── Divider ── */}
        <line
          x1={8} y1={rowH}
          x2={BOX_W - 8} y2={rowH}
          stroke="rgba(200,150,60,0.18)"
          strokeWidth={0.75}
        />

        {/* ── Team B ── */}
        {/* Secondary color left strip */}
        {tB?.secondary_color && (
          <rect x={0} y={rowH + 1.5} width={3} height={rowH - 3} rx={1.5} fill={tB.secondary_color} />
        )}
        {tBWins && (
          <rect
            x={1.5} y={rowH + 0.5}
            width={BOX_W - 3} height={rowH - 2}
            rx={5}
            fill="rgba(46,204,113,0.10)"
          />
        )}

        {/* Logo + Abbreviation */}
        {tB && !awayDisplay.isPlaceholder ? (
          <image
            href={teamLogoUrl(tB.abbreviation)}
            x={8} y={rowH + (rowH - 28) / 2}
            width={28} height={28}
            opacity={isComplete && !tBWins ? 0.35 : 1}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          <text
            x={12} y={yB}
            dominantBaseline="middle"
            fill="#6f88aa"
            fontSize={13}
            fontFamily={baseFont}
            fontWeight="700"
          >
            {awayDisplay.abbreviation}
          </text>
        )}
        {tB && !awayDisplay.isPlaceholder && (
          <text
            x={40} y={yB}
            dominantBaseline="middle"
            {...teamAbbrSVGProps(tB.primary_color)}
            fontSize={11}
            fontFamily={baseFont}
            fontWeight="700"
            opacity={isComplete && !tBWins ? 0.35 : 1}
          >
            {awayDisplay.abbreviation}
          </text>
        )}

        {score && tBWins && (
          <text
            x={BOX_W - 26} y={yB}
            dominantBaseline="middle"
            textAnchor="end"
            fill="#c8963c"
            fontSize={11}
            fontFamily={baseFont}
            fontWeight="700"
          >
            {score}
          </text>
        )}

        {tBWins && (
          <text
            x={BOX_W - 10} y={yB}
            dominantBaseline="middle"
            textAnchor="middle"
            fill="#2ecc71"
            fontSize={13}
            fontWeight="700"
          >
            ✓
          </text>
        )}

        {pick && !isComplete && pick.winner_id === tB?.id && (
          <text
            x={BOX_W - 10} y={yB}
            dominantBaseline="middle"
            textAnchor="middle"
            fill="#c8963c"
            fontSize={12}
          >
            ★
          </text>
        )}

        {/* ── Champion badge (Finals only) ── */}
        {def.id === 'FIN' && s?.winner && isComplete && (
          <g>
            <rect
              x={0} y={BOX_H + 6}
              width={BOX_W} height={20}
              rx={5}
              fill="rgba(200,150,60,0.18)"
              stroke="rgba(200,150,60,0.35)"
              strokeWidth={1}
            />
            <text
              x={BOX_W / 2} y={BOX_H + 16}
              dominantBaseline="middle"
              textAnchor="middle"
              fill="#c8963c"
              fontSize={10}
              fontFamily="'Bebas Neue', cursive"
              letterSpacing={1.5}
            >
              CAMPEÃO: {s.winner.abbreviation}
            </text>
          </g>
        )}

        {!matchupReady && (
          <g>
            <rect
              x={BOX_W - 38}
              y={BOX_H / 2 - 10}
              width={30}
              height={20}
              rx={10}
              fill="rgba(74,144,217,0.12)"
              stroke="rgba(74,144,217,0.32)"
              strokeWidth={1}
            />
            <text
              x={BOX_W - 23}
              y={BOX_H / 2}
              dominantBaseline="middle"
              textAnchor="middle"
              fill="#4a90d9"
              fontSize={9}
              fontFamily={baseFont}
              fontWeight="700"
            >
              TBD
            </text>
          </g>
        )}
      </g>
    )
  }

  // ── Column labels ───────────────────────────────────────────────────────────
  const LABELS = [
    { x: COLS.WR1 + BOX_W / 2, text: 'R1 OESTE'    },
    { x: COLS.WR2 + BOX_W / 2, text: 'R2 OESTE'    },
    { x: COLS.WCF + BOX_W / 2, text: 'CONF FINALS' },
    { x: COLS.FIN + BOX_W / 2, text: 'NBA FINALS'  },
    { x: COLS.ECF + BOX_W / 2, text: 'CONF FINALS' },
    { x: COLS.ER2 + BOX_W / 2, text: 'R2 LESTE'    },
    { x: COLS.ER1 + BOX_W / 2, text: 'R1 LESTE'    },
  ]

  const VB_W = SVG_W + SVG_PAD * 2
  const VB_H = TOTAL_H + LABEL_H + SVG_PAD * 2 + 30  // +30 for champion badge

  return (
    <div
      ref={scrollRef}
      style={{
        overflowX: 'auto',
        overflowY: 'visible',
        WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
        scrollbarWidth: 'thin' as React.CSSProperties['scrollbarWidth'],
        scrollbarColor: 'rgba(200,150,60,0.3) transparent',
      }}
    >
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        style={{
          width: '100%',
          minWidth: VB_W,
          display: 'block',
          overflow: 'visible',
        }}
      >
        {/* CSS for hover transitions */}
        <style>{`
          .bracket-slot { transition: filter 0.2s ease; }
          .bracket-slot.clickable { cursor: pointer; }
          .bracket-slot.clickable:hover { filter: brightness(1.18) drop-shadow(0 0 4px rgba(200,150,60,0.25)); }
        `}</style>

        {/* Secondary color gradients for slot borders */}
        <defs>
          {SLOT_DEFS.map((def) => {
            const s  = seriesById[def.id]
            const sA = s?.home_team?.secondary_color ?? 'rgba(200,150,60,0.4)'
            const sB = s?.away_team?.secondary_color ?? 'rgba(200,150,60,0.4)'
            return (
              <linearGradient key={def.id} id={`sec-${def.id}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="50%" stopColor={sA} />
                <stop offset="50%" stopColor={sB} />
              </linearGradient>
            )
          })}
        </defs>

        {/* Translate everything down to make room for labels */}
        <g transform={`translate(${SVG_PAD}, ${SVG_PAD + LABEL_H})`}>

          {/* Column labels */}
          {LABELS.map(({ x, text }, i) => (
            <text
              key={i}
              x={x}
              y={-12}
              textAnchor="middle"
              fill="rgba(200,150,60,0.65)"
              fontSize={10}
              fontFamily="'Bebas Neue', cursive"
              letterSpacing={2}
            >
              {text}
            </text>
          ))}

          {/* Separator lines under labels */}
          {LABELS.map(({ x }, i) => (
            <line
              key={i}
              x1={x - BOX_W / 2 + 4} y1={-4}
              x2={x + BOX_W / 2 - 4} y2={-4}
              stroke="rgba(200,150,60,0.12)"
              strokeWidth={1}
            />
          ))}

          {renderConnections()}
          {SLOT_DEFS.map(renderBox)}
        </g>
      </svg>
    </div>
  )
}
