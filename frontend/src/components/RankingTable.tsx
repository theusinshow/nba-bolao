import { ArrowUp, ArrowDown, ChevronRight, Minus, Star } from 'lucide-react'
import type { RankingEntry } from '../types'

interface Props {
  ranking: RankingEntry[]
  highlightId?: string
  selectedId?: string
  onParticipantClick?: (participantId: string) => void
  onAvatarClick?: (participantId: string) => void
}

// ─── Avatar com iniciais ──────────────────────────────────────────────────────

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
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function Avatar({ name }: { name: string }) {
  const color = nameToColor(name)
  return (
    <span
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: `${color}22`,
        border: `1.5px solid ${color}66`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.62rem',
        fontWeight: 700,
        color,
        flexShrink: 0,
        fontFamily: "'Barlow Condensed', sans-serif",
        letterSpacing: '0.04em',
        userSelect: 'none',
      }}
    >
      {initials(name)}
    </span>
  )
}

// ─── Barra de progresso ───────────────────────────────────────────────────────

function PctBar({ pct }: { pct: number }) {
  const barColor =
    pct >= 70 ? '#2ecc71' :
    pct >= 40 ? '#c8963c' :
    '#e74c3c'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
      <div
        style={{
          width: 52,
          height: 5,
          borderRadius: 99,
          background: 'var(--nba-surface-2)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 99,
            background: barColor,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <span
        className="font-condensed"
        style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem', minWidth: 28, textAlign: 'right' }}
      >
        {pct}%
      </span>
    </div>
  )
}

// ─── Cores por posição ────────────────────────────────────────────────────────

const MEDAL_BG: Record<number, string> = {
  1: 'rgba(200,150,60,0.13)',
  2: 'rgba(192,192,192,0.09)',
  3: 'rgba(180,110,50,0.09)',
}

const MEDAL_GLOW: Record<number, string> = {
  1: 'inset 3px 0 0 #c8963c',
  2: 'inset 3px 0 0 #b0b0b0',
  3: 'inset 3px 0 0 #cd7f32',
}

const RANK_COLOR: Record<number, string> = {
  1: '#c8963c',
  2: '#b8b8b8',
  3: '#cd7f32',
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function RankingTable({ ranking, highlightId, selectedId, onParticipantClick, onAvatarClick }: Props) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>

        {/* Header */}
        <thead>
          <tr
            style={{
              borderBottom: '1px solid var(--nba-border)',
              color: 'var(--nba-text-muted)',
              fontSize: '0.72rem',
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
            }}
          >
            <th style={{ padding: '10px 12px', textAlign: 'left',  fontWeight: 600 }}>#</th>
            <th style={{ padding: '10px 12px', textAlign: 'left',  fontWeight: 600 }}>Participante</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Total</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }} className="hidden sm:table-cell">R1</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }} className="hidden sm:table-cell">R2</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }} className="hidden sm:table-cell">CF</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }} className="hidden sm:table-cell">Finals</th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }} className="hidden md:table-cell">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Star size={11} style={{ color: 'var(--nba-gold)' }} />
                Cravadas
              </span>
            </th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }} className="hidden md:table-cell">
              Acerto
            </th>
            <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Relatório</th>
          </tr>
        </thead>

        {/* Rows */}
        <tbody>
          {ranking.map((e, idx) => {
            const isMe     = e.participant_id === highlightId
            const isSelected = e.participant_id === selectedId
            const isMedal  = e.rank <= 3
            const rankDiff = e.prev_rank != null ? e.prev_rank - e.rank : null
            const seriesPct = e.series_total > 0
              ? Math.round((e.series_correct / e.series_total) * 100)
              : 0

            // Row background priority: medal > me > zebra
            const rowBg =
              isMedal  ? MEDAL_BG[e.rank] :
              isSelected ? 'rgba(74,144,217,0.12)' :
              isMe     ? 'var(--nba-surface-2)' :
              idx % 2 === 1 ? 'rgba(255,255,255,0.02)' :
              'transparent'

            // Left accent: medal glow or user gold
            const rowShadow =
              isMedal  ? MEDAL_GLOW[e.rank] :
              isSelected ? 'inset 3px 0 0 var(--nba-east)' :
              isMe     ? 'inset 3px 0 0 var(--nba-gold)' :
              'none'

            const rankColor = RANK_COLOR[e.rank] ?? 'var(--nba-gold)'

            return (
              <tr
                key={e.participant_id}
                style={{
                  background: rowBg,
                  boxShadow: rowShadow,
                  borderBottom: idx < ranking.length - 1 ? '1px solid var(--nba-border)' : 'none',
                  transition: 'background 0.2s ease, filter 0.2s ease',
                  cursor: onParticipantClick ? 'pointer' : 'default',
                }}
                onMouseEnter={(ev) => {
                  ev.currentTarget.style.filter = 'brightness(1.12)'
                }}
                onMouseLeave={(ev) => {
                  ev.currentTarget.style.filter = 'none'
                }}
                onClick={() => onParticipantClick?.(e.participant_id)}
              >
                {/* Rank */}
                <td style={{ padding: '11px 12px', verticalAlign: 'middle' }}>
                  <span
                    className="font-condensed font-bold"
                    style={{ color: rankColor, fontSize: '0.95rem' }}
                  >
                    {e.rank}
                  </span>
                </td>

                {/* Name + avatar + arrow */}
                <td style={{ padding: '11px 12px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      onClick={(ev) => {
                        if (!onAvatarClick) return
                        ev.stopPropagation()
                        onAvatarClick(e.participant_id)
                      }}
                      style={{ cursor: onAvatarClick ? 'pointer' : 'default' }}
                      title={onAvatarClick ? 'Ver perfil' : undefined}
                    >
                      <Avatar name={e.participant_name} />
                    </span>
                    <span
                      style={{
                        color: isMe ? 'var(--nba-gold)' : 'var(--nba-text)',
                        fontWeight: isMe ? 600 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 140,
                      }}
                    >
                      {e.participant_name}
                    </span>
                    {rankDiff !== null && rankDiff > 0 && (
                      <ArrowUp size={11} style={{ color: 'var(--nba-success)', flexShrink: 0 }} />
                    )}
                    {rankDiff !== null && rankDiff < 0 && (
                      <ArrowDown size={11} style={{ color: 'var(--nba-danger)', flexShrink: 0 }} />
                    )}
                    {rankDiff !== null && rankDiff === 0 && (
                      <Minus size={11} style={{ color: 'var(--nba-text-muted)', flexShrink: 0 }} />
                    )}
                  </div>
                </td>

                {/* Total */}
                <td style={{ padding: '11px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
                  <span
                    className="font-condensed font-bold"
                    style={{ color: rankColor, fontSize: '1.05rem' }}
                  >
                    {e.total_points}
                  </span>
                </td>

                {/* Round points — sm+ */}
                {(['round1_points', 'round2_points', 'round3_points', 'round4_points'] as const).map((key) => (
                  <td
                    key={key}
                    className="hidden sm:table-cell"
                    style={{ padding: '11px 12px', textAlign: 'right', verticalAlign: 'middle' }}
                  >
                    <span className="font-condensed" style={{ color: 'var(--nba-text-muted)', fontSize: '0.88rem' }}>
                      {e[key] ?? 0}
                    </span>
                  </td>
                ))}

                {/* Cravadas — md+ */}
                <td
                  className="hidden md:table-cell"
                  style={{ padding: '11px 12px', textAlign: 'right', verticalAlign: 'middle' }}
                >
                  {e.cravadas > 0 ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'rgba(200,150,60,0.12)',
                        border: '1px solid rgba(200,150,60,0.25)',
                        borderRadius: 4,
                        padding: '1px 7px',
                      }}
                    >
                      <Star size={10} fill="#c8963c" style={{ color: '#c8963c' }} />
                      <span className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '0.85rem' }}>
                        {e.cravadas}
                      </span>
                    </span>
                  ) : (
                    <span className="font-condensed" style={{ color: 'var(--nba-text-muted)', fontSize: '0.85rem' }}>—</span>
                  )}
                </td>

                {/* % Acerto — md+ */}
                <td
                  className="hidden md:table-cell"
                  style={{ padding: '11px 12px', verticalAlign: 'middle' }}
                >
                  <PctBar pct={seriesPct} />
                </td>

                <td style={{ padding: '11px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      onParticipantClick?.(e.participant_id)
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      borderRadius: 999,
                      border: `1px solid ${isSelected ? 'rgba(74,144,217,0.32)' : 'rgba(200,150,60,0.16)'}`,
                      background: isSelected ? 'rgba(74,144,217,0.14)' : 'rgba(12,12,18,0.34)',
                      color: isSelected ? 'var(--nba-east)' : 'var(--nba-gold)',
                      padding: '6px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Ver
                    <ChevronRight size={13} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
