import { useState } from 'react'

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
          <span
            key={dot.gameId}
            title={`J${dot.gameNumber} · ${dot.homeAbbr} vs ${dot.awayAbbr} · ${DOT_LABEL[dot.status]}`}
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
