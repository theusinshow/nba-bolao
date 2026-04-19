import { useState, useRef } from 'react'

export type DotStatus = 'correct' | 'wrong' | 'pending' | 'no-pick'

export interface DotData {
  gameId: string
  status: DotStatus
  round: number
  seriesId: string
  homeTeamId: string
  awayTeamId: string
  homeAbbr: string
  awayAbbr: string
  gameNumber: number
  tipOffAt: string | null
}

const DOT_COLOR: Record<DotStatus, string> = {
  correct: '#2ecc71',
  wrong: '#e74c3c',
  pending: '#555566',
  'no-pick': 'transparent',
}

const DOT_LABEL: Record<DotStatus, string> = {
  correct: 'Acertou',
  wrong: 'Errou',
  pending: 'Aguardando',
  'no-pick': 'Sem palpite',
}

// ─── Compact variant ─────────────────────────────────────────────────────────
// Shows the last N played games inline next to the participant name.
// Tooltip on hover (desktop only — intentional, mobile is decorative).

const COMPACT_COUNT = 5

function DotTooltip({ dot, children }: { dot: DotData; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  const statusColor = DOT_COLOR[dot.status]
  const label = DOT_LABEL[dot.status]

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--nba-surface-2)',
          border: '1px solid var(--nba-border)',
          borderRadius: 6,
          padding: '5px 8px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', color: 'var(--nba-text-muted)', letterSpacing: '0.03em' }}>
            J{dot.gameNumber} · {dot.homeAbbr} vs {dot.awayAbbr}
          </span>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '0.72rem', fontWeight: 700, color: statusColor, letterSpacing: '0.04em' }}>
            {label.toUpperCase()}
          </span>
          {/* Arrow */}
          <span style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid var(--nba-border)',
          }} />
        </span>
      )}
    </span>
  )
}

function CompactDots({ dots }: { dots: DotData[] }) {
  // First 5 games in chronological order (earliest tip-off first)
  const recent = dots.slice(0, COMPACT_COUNT)
  const padded: (DotData | null)[] = [
    ...Array(Math.max(0, COMPACT_COUNT - recent.length)).fill(null),
    ...recent,
  ]

  // Always render so the column has consistent width
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {padded.map((dot, i) =>
        dot === null ? (
          <span
            key={`empty-${i}`}
            style={{
              display: 'inline-block',
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: 'rgba(136,136,153,0.08)',
              border: '1px solid rgba(136,136,153,0.25)',
              flexShrink: 0,
            }}
          />
        ) : (
          <DotTooltip key={dot.gameId} dot={dot}>
            <span
              style={{
                display: 'inline-block',
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: dot.status === 'no-pick'
                  ? 'rgba(136,136,153,0.08)'
                  : DOT_COLOR[dot.status],
                border: dot.status === 'no-pick'
                  ? '1px solid rgba(136,136,153,0.4)'
                  : dot.status === 'pending'
                  ? '1px solid rgba(136,136,153,0.3)'
                  : 'none',
                boxShadow: dot.status === 'correct'
                  ? '0 0 4px rgba(46,204,113,0.5)'
                  : dot.status === 'wrong'
                  ? '0 0 4px rgba(231,76,60,0.4)'
                  : 'none',
                flexShrink: 0,
                cursor: 'default',
              }}
            />
          </DotTooltip>
        )
      )}
    </span>
  )
}

// ─── Grouped variant ─────────────────────────────────────────────────────────
// Shows all dots grouped by series with a matchup label.
// Clicking the group toggles a mini-legend with game-level detail.

function groupBySeries(dots: DotData[]): Map<string, DotData[]> {
  const map = new Map<string, DotData[]>()
  for (const dot of dots) {
    const existing = map.get(dot.seriesId) ?? []
    existing.push(dot)
    map.set(dot.seriesId, existing)
  }
  return map
}

function GroupedDots({ dots }: { dots: DotData[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const groups = groupBySeries(dots)
  if (groups.size === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Array.from(groups.entries()).map(([seriesId, seriesDots]) => {
        const first = seriesDots[0]
        const label = `${first.homeAbbr} × ${first.awayAbbr}`
        const isExpanded = expanded === seriesId
        const hasActivity = seriesDots.some(
          (d) => d.status === 'correct' || d.status === 'wrong',
        )

        return (
          <div key={seriesId}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              onClick={() => setExpanded(isExpanded ? null : seriesId)}
            >
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '0.7rem',
                  color: 'var(--nba-text-muted)',
                  minWidth: 72,
                  letterSpacing: '0.03em',
                }}
              >
                {label}
              </span>
              <span style={{ display: 'flex', gap: 3 }}>
                {seriesDots.map((dot) => (
                  <span
                    key={dot.gameId}
                    style={{
                      display: 'inline-block',
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: DOT_COLOR[dot.status],
                      flexShrink: 0,
                    }}
                  />
                ))}
              </span>
              {hasActivity && (
                <span
                  style={{
                    fontSize: '0.6rem',
                    color: 'var(--nba-text-muted)',
                    opacity: 0.5,
                    marginLeft: 2,
                  }}
                >
                  {isExpanded ? '▲' : '▼'}
                </span>
              )}
            </div>

            {/* Mini-legenda expandida ao tocar */}
            {isExpanded && (
              <div
                style={{
                  marginTop: 4,
                  marginLeft: 80,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {seriesDots.map((dot) => (
                  <span
                    key={dot.gameId}
                    style={{
                      fontSize: '0.68rem',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      color: DOT_COLOR[dot.status],
                      letterSpacing: '0.02em',
                    }}
                  >
                    J{dot.gameNumber} — {DOT_LABEL[dot.status]}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

interface Props {
  dots: DotData[]
  variant?: 'compact' | 'grouped'
}

export function GamePickDots({ dots, variant = 'compact' }: Props) {
  if (variant === 'grouped') {
    if (dots.length === 0) return null
    return <GroupedDots dots={dots} />
  }
  return <CompactDots dots={dots} />
}
