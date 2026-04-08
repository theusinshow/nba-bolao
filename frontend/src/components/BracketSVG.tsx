import type { Series, SeriesPick } from '../types'

// ─── Layout constants ────────────────────────────────────────────────────────
const BOX_W    = 148   // width of each series box
const BOX_H    = 70    // height of each series box (35px per team row)
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

function getSlot(id: string): SlotDef {
  return SLOT_DEFS.find((s) => s.id === id)!
}

// ─── Pick status helper ───────────────────────────────────────────────────────

function pickStatus(s: Series, pick?: SeriesPick): 'correct' | 'wrong' | 'picked' | 'none' {
  if (!pick) return 'none'
  if (!s.is_complete) return 'picked'
  return pick.winner_id === s.winner_id ? 'correct' : 'wrong'
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  series: Series[]
  picks?: SeriesPick[]
  onSeriesClick?: (series: Series) => void
}

export function BracketSVG({ series, picks = [], onSeriesClick }: Props) {
  const seriesById     = Object.fromEntries(series.map((s) => [s.id, s]))
  const pickBySeriesId = Object.fromEntries(picks.map((p) => [p.series_id, p]))

  function pickForSlot(id: string): SeriesPick | undefined {
    const s = seriesById[id]
    return s ? pickBySeriesId[s.id] : undefined
  }

  // ── Connectors ─────────────────────────────────────────────────────────────
  function renderConnections() {
    return CONNECTIONS.map(([fromId, toId, side], i) => {
      const from = getSlot(fromId)
      const to   = getSlot(toId)

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
    const isComplete  = s?.is_complete ?? false
    const isClickable = !!s && !!onSeriesClick

    const tAWins = isComplete && s?.winner_id === tA?.id
    const tBWins = isComplete && s?.winner_id === tB?.id
    const score  = isComplete && s?.games_played ? `4-${s.games_played - 4}` : ''

    // Row heights / vertical midpoints
    const rowH = BOX_H / 2   // 35
    const yA   = rowH / 2    // 17.5 — center of top row
    const yB   = rowH + rowH / 2  // 52.5 — center of bottom row

    // Box border colour driven by pick outcome
    const borderColor =
      status === 'correct' ? '#2ecc71' :
      status === 'wrong'   ? '#e74c3c' :
      status === 'picked'  ? '#c8963c' :
      'rgba(200,150,60,0.2)'

    const baseFont = "'Barlow Condensed', sans-serif"

    return (
      <g
        key={def.id}
        transform={`translate(${def.x}, ${def.y})`}
        onClick={() => s && onSeriesClick?.(s)}
        className={isClickable ? 'bracket-slot clickable' : 'bracket-slot'}
      >
        {/* ── Box shell ── */}
        <rect
          width={BOX_W}
          height={BOX_H}
          rx={7}
          fill="#13131a"
          stroke={borderColor}
          strokeWidth={1.5}
        />

        {/* ── Team A ── */}
        {/* Winner highlight tint */}
        {tAWins && (
          <rect
            x={1.5} y={1.5}
            width={BOX_W - 3} height={rowH - 2}
            rx={5}
            fill="rgba(46,204,113,0.10)"
          />
        )}

        {/* Abbreviation */}
        <text
          x={10} y={yA}
          dominantBaseline="middle"
          fill={tA?.primary_color ?? '#888899'}
          fontSize={13}
          fontFamily={baseFont}
          fontWeight="700"
          opacity={isComplete && !tAWins ? 0.35 : 1}
        >
          {tA?.abbreviation ?? '—'}
        </text>

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
        {tBWins && (
          <rect
            x={1.5} y={rowH + 0.5}
            width={BOX_W - 3} height={rowH - 2}
            rx={5}
            fill="rgba(46,204,113,0.10)"
          />
        )}

        <text
          x={10} y={yB}
          dominantBaseline="middle"
          fill={tB?.primary_color ?? '#888899'}
          fontSize={13}
          fontFamily={baseFont}
          fontWeight="700"
          opacity={isComplete && !tBWins ? 0.35 : 1}
        >
          {tB?.abbreviation ?? '—'}
        </text>

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
          minWidth: VB_W,
          width: '100%',
          maxWidth: VB_W,
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
