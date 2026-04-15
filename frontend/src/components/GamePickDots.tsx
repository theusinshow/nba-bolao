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
  pending: '#3a3a4e',
  'no-pick': '#2a2a38',
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
  // Last 5 played games (tip_off_at in the past or already played)
  const recent = dots
    .filter((d) => d.status === 'correct' || d.status === 'wrong')
    .slice(-COMPACT_COUNT)

  if (recent.length === 0) return null

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 6 }}>
      {recent.map((dot) => (
        <span
          key={dot.gameId}
          title={`J${dot.gameNumber} · ${dot.homeAbbr} vs ${dot.awayAbbr} · ${DOT_LABEL[dot.status]}`}
          style={{
            display: 'inline-block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: DOT_COLOR[dot.status],
            flexShrink: 0,
            cursor: 'default',
          }}
        />
      ))}
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
  if (dots.length === 0) return null
  if (variant === 'grouped') return <GroupedDots dots={dots} />
  return <CompactDots dots={dots} />
}
