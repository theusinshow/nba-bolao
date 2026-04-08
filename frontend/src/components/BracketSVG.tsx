import type { Series, SeriesPick } from '../types'

// ─── Layout constants ────────────────────────────────────────────────────────
const BOX_W = 120
const BOX_H = 52
const COL_GAP = 44
const ROW_GAP = 16

// Column x-positions (West grows right, East grows left from center)
const COLS = {
  WR1: 0,
  WR2: BOX_W + COL_GAP,
  WCF: (BOX_W + COL_GAP) * 2,
  FIN: (BOX_W + COL_GAP) * 3,
  ECF: (BOX_W + COL_GAP) * 4,
  ER2: (BOX_W + COL_GAP) * 5,
  ER1: (BOX_W + COL_GAP) * 6,
}

const SVG_W = COLS.ER1 + BOX_W
const TOTAL_H = 4 * BOX_H + 3 * ROW_GAP  // 4 rows in R1

// ─── Slot layout: [col, rowIndex within that column] ────────────────────────
// West top-half: W-R1-1 & W-R1-2 → W-R2-1; bottom: W-R1-3 & W-R1-4 → W-R2-2
// East mirrored

function slotY(colSlots: number[], idx: number): number {
  // distribute slots evenly in TOTAL_H
  const step = TOTAL_H / colSlots.length
  return step * idx + step / 2 - BOX_H / 2
}

const WEST_R1_YS = [0, 1, 2, 3].map((i) => slotY([0, 1, 2, 3], i))
const WEST_R2_YS = [0, 1].map((i) => slotY([0, 1], i))
const WEST_CF_Y = slotY([0], 0)
const FIN_Y = slotY([0], 0)

// Symmetric for East
const EAST_R1_YS = WEST_R1_YS
const EAST_R2_YS = WEST_R2_YS
const EAST_CF_Y = WEST_CF_Y

interface SlotDef {
  id: string
  x: number
  y: number
}

const SLOT_DEFS: SlotDef[] = [
  { id: 'W1-1', x: COLS.WR1, y: WEST_R1_YS[0] },
  { id: 'W1-2', x: COLS.WR1, y: WEST_R1_YS[1] },
  { id: 'W1-3', x: COLS.WR1, y: WEST_R1_YS[2] },
  { id: 'W1-4', x: COLS.WR1, y: WEST_R1_YS[3] },
  { id: 'W2-1', x: COLS.WR2, y: WEST_R2_YS[0] },
  { id: 'W2-2', x: COLS.WR2, y: WEST_R2_YS[1] },
  { id: 'WCF',  x: COLS.WCF, y: WEST_CF_Y },
  { id: 'FIN',  x: COLS.FIN, y: FIN_Y },
  { id: 'ECF',  x: COLS.ECF, y: EAST_CF_Y },
  { id: 'E2-1', x: COLS.ER2, y: EAST_R2_YS[0] },
  { id: 'E2-2', x: COLS.ER2, y: EAST_R2_YS[1] },
  { id: 'E1-1', x: COLS.ER1, y: EAST_R1_YS[0] },
  { id: 'E1-2', x: COLS.ER1, y: EAST_R1_YS[1] },
  { id: 'E1-3', x: COLS.ER1, y: EAST_R1_YS[2] },
  { id: 'E1-4', x: COLS.ER1, y: EAST_R1_YS[3] },
]

// Connections: [fromId, toId, side: 'left'|'right']
// "left" means the connector exits from the right side of `from` and enters from the left of `to`
// "right" means the opposite (East side — exits left, enters right)
const CONNECTIONS: Array<[string, string, 'right' | 'left']> = [
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

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  series: Series[]
  picks?: SeriesPick[]
  onSeriesClick?: (series: Series) => void
  participantName?: string
}

function pickStatus(s: Series, pick?: SeriesPick): 'correct' | 'wrong' | 'picked' | 'none' {
  if (!pick) return 'none'
  if (!s.is_complete) return 'picked'
  if (pick.winner_id === s.winner_id) return 'correct'
  return 'wrong'
}

function seriesLabel(s: Series, pick?: SeriesPick): { top: string; bot: string; topColor: string; botColor: string } {
  const tA = s.home_team ?? getTeam(s.home_team_id)
  const tB = s.away_team ?? getTeam(s.away_team_id)

  const topAbbr = tA?.abbreviation ?? '?'
  const botAbbr = tB?.abbreviation ?? '?'
  const topColor = tA?.primary_color ?? '#888'
  const botColor = tB?.primary_color ?? '#888'

  let suffix = ''
  if (s.is_complete && s.winner_id) {
    const wins = s.games_played
    const losses = (wins !== null ? wins : 0) - 4
    suffix = ` ${4}-${losses}`
  } else if (pick) {
    suffix = pick.winner_id === s.home_team_id ? ' ↑' : ' ↓'
  }

  return { top: topAbbr, bot: botAbbr, topColor, botColor }
}

const SVG_PADDING = 24

export function BracketSVG({ series, picks = [], onSeriesClick }: Props) {
  const seriesById: Record<string, Series> = Object.fromEntries(series.map((s) => [s.id, s]))
  const pickBySeriesId: Record<string, SeriesPick> = Object.fromEntries(picks.map((p) => [p.series_id, p]))

  function pickForSlot(id: string): SeriesPick | undefined {
    const s = seriesById[id]
    if (!s) return undefined
    return pickBySeriesId[s.id]
  }

  function renderConnections() {
    return CONNECTIONS.map(([fromId, toId, side], i) => {
      const from = getSlot(fromId)
      const to = getSlot(toId)

      if (side === 'left') {
        // from exits right, enters to from left
        const x1 = from.x + BOX_W
        const y1 = from.y + BOX_H / 2
        const x2 = to.x
        const y2 = to.y + BOX_H / 2
        const midX = (x1 + x2) / 2
        return (
          <path
            key={i}
            d={`M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`}
            fill="none"
            stroke="rgba(200,150,60,0.2)"
            strokeWidth={1.5}
          />
        )
      } else {
        // from exits left, enters to from right
        const x1 = from.x
        const y1 = from.y + BOX_H / 2
        const x2 = to.x + BOX_W
        const y2 = to.y + BOX_H / 2
        const midX = (x1 + x2) / 2
        return (
          <path
            key={i}
            d={`M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`}
            fill="none"
            stroke="rgba(200,150,60,0.2)"
            strokeWidth={1.5}
          />
        )
      }
    })
  }

  function renderBox(def: SlotDef) {
    const s = seriesById[def.id]
    const pick = pickForSlot(def.id)
    const status = s ? pickStatus(s, pick) : 'none'

    const borderColor =
      status === 'correct' ? '#2ecc71' :
      status === 'wrong' ? '#e74c3c' :
      status === 'picked' ? '#c8963c' :
      'rgba(200,150,60,0.2)'

    const tA = s?.home_team
    const tB = s?.away_team
    const winner = s?.winner

    const isClickable = !!s && !!onSeriesClick
    const label = def.slot === 'FINALS' ? 'FINALS' : def.slot

    return (
      <g
        key={def.slot}
        transform={`translate(${def.x}, ${def.y})`}
        onClick={() => s && onSeriesClick?.(s)}
        style={{ cursor: isClickable ? 'pointer' : 'default' }}
      >
        {/* Box background */}
        <rect
          width={BOX_W}
          height={BOX_H}
          rx={6}
          fill="#13131a"
          stroke={borderColor}
          strokeWidth={1.5}
        />

        {/* Team A row */}
        <rect
          x={1.5}
          y={1.5}
          width={BOX_W - 3}
          height={BOX_H / 2 - 1}
          rx={4}
          fill={tA && s?.winner_id === tA.id ? 'rgba(200,150,60,0.12)' : 'transparent'}
        />
        <text
          x={8}
          y={BOX_H / 2 - 8}
          fill={tA?.primary_color ?? '#888899'}
          fontSize={11}
          fontFamily="'Barlow Condensed', sans-serif"
          fontWeight="700"
        >
          {tA?.abbreviation ?? '—'}
        </text>
        {s?.is_complete && s.winner_id === tA?.id && (
          <text x={BOX_W - 8} y={BOX_H / 2 - 8} textAnchor="end" fill="#2ecc71" fontSize={9}>✓</text>
        )}
        {pick && !s?.is_complete && pick.winner_id === tA?.id && (
          <text x={BOX_W - 8} y={BOX_H / 2 - 8} textAnchor="end" fill="#c8963c" fontSize={9}>★</text>
        )}

        {/* Divider */}
        <line x1={8} y1={BOX_H / 2} x2={BOX_W - 8} y2={BOX_H / 2} stroke="rgba(200,150,60,0.15)" strokeWidth={0.5} />

        {/* Team B row */}
        <rect
          x={1.5}
          y={BOX_H / 2 + 0.5}
          width={BOX_W - 3}
          height={BOX_H / 2 - 2}
          rx={4}
          fill={tB && s?.winner_id === tB.id ? 'rgba(200,150,60,0.12)' : 'transparent'}
        />
        <text
          x={8}
          y={BOX_H - 10}
          fill={tB?.primary_color ?? '#888899'}
          fontSize={11}
          fontFamily="'Barlow Condensed', sans-serif"
          fontWeight="700"
        >
          {tB?.abbreviation ?? '—'}
        </text>
        {s?.is_complete && s.winner_id === tB?.id && (
          <text x={BOX_W - 8} y={BOX_H - 10} textAnchor="end" fill="#2ecc71" fontSize={9}>✓</text>
        )}
        {pick && !s?.is_complete && pick.winner_id === tB?.id && (
          <text x={BOX_W - 8} y={BOX_H - 10} textAnchor="end" fill="#c8963c" fontSize={9}>★</text>
        )}

        {/* Score label */}
        {s?.is_complete && s.games_played && (
          <text
            x={BOX_W / 2}
            y={BOX_H / 2 - 1}
            textAnchor="middle"
            fill="#888899"
            fontSize={8}
            fontFamily="'Barlow Condensed', sans-serif"
          >
            4-{s.games_played - 4}
          </text>
        )}

        {/* Champion badge for Finals */}
        {def.id === 'FIN' && winner && s?.is_complete && (
          <g>
            <rect x={0} y={BOX_H + 4} width={BOX_W} height={16} rx={4} fill="rgba(200,150,60,0.15)" />
            <text
              x={BOX_W / 2}
              y={BOX_H + 15}
              textAnchor="middle"
              fill="#c8963c"
              fontSize={9}
              fontFamily="'Bebas Neue', cursive"
              letterSpacing={1}
            >
              CAMPEÃO: {winner.abbreviation}
            </text>
          </g>
        )}
      </g>
    )
  }

  const totalH = TOTAL_H + 30 // extra for finals badge

  return (
    <div className="overflow-x-auto w-full">
      <svg
        viewBox={`-${SVG_PADDING} -${SVG_PADDING} ${SVG_W + SVG_PADDING * 2} ${totalH + SVG_PADDING * 2}`}
        style={{ minWidth: SVG_W + SVG_PADDING * 2, width: '100%', maxWidth: 1100 }}
      >
        {/* Column labels */}
        {[
          { x: COLS.WR1 + BOX_W / 2, label: 'R1 Oeste' },
          { x: COLS.WR2 + BOX_W / 2, label: 'R2 Oeste' },
          { x: COLS.WCF + BOX_W / 2, label: 'Conf Finals' },
          { x: COLS.FIN + BOX_W / 2, label: 'NBA Finals' },
          { x: COLS.ECF + BOX_W / 2, label: 'Conf Finals' },
          { x: COLS.ER2 + BOX_W / 2, label: 'R2 Leste' },
          { x: COLS.ER1 + BOX_W / 2, label: 'R1 Leste' },
        ].map(({ x, label }, i) => (
          <text
            key={i}
            x={x}
            y={-8}
            textAnchor="middle"
            fill="rgba(200,150,60,0.5)"
            fontSize={8}
            fontFamily="'Bebas Neue', cursive"
            letterSpacing={1}
          >
            {label}
          </text>
        ))}

        {renderConnections()}
        {SLOT_DEFS.map(renderBox)}
      </svg>
    </div>
  )
}
