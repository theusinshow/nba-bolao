import { useState, useEffect, useCallback } from 'react'
import { ArrowLeftRight, AlertTriangle, Sparkles, Swords, ShieldCheck, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { BracketSVG } from '../components/BracketSVG'
import { useSeries } from '../hooks/useSeries'
import { useRanking } from '../hooks/useRanking'
import type { Participant, SeriesPick, Series } from '../types'

// ─── Avatar (shared with RankingTable) ───────────────────────────────────────

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

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const color = nameToColor(name)
  return (
    <span
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: `${color}22`,
        border: `2px solid ${color}66`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.3,
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

function CompareHero({
  participantsCount,
  bothSelected,
  sameSelected,
}: {
  participantsCount: number
  bothSelected: boolean
  sameSelected: boolean
}) {
  const statusLabel = sameSelected
    ? 'Seleções inválidas'
    : bothSelected
    ? 'Comparação pronta'
    : 'Escolha os participantes'

  const statusColor = sameSelected
    ? 'var(--nba-danger)'
    : bothSelected
    ? 'var(--nba-success)'
    : 'var(--nba-gold)'

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(74,144,217,0.18), rgba(224,92,58,0.12) 52%, rgba(19,19,26,1) 100%)',
        border: '1px solid rgba(200,150,60,0.18)',
        borderRadius: 12,
        padding: '1rem',
        marginBottom: 18,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at top right, rgba(232,180,90,0.16), transparent 34%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nba-gold)' }}>
          <Sparkles size={15} />
          <span className="font-condensed" style={{ fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Arena de comparação
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 className="title" style={{ color: 'var(--nba-gold)', fontSize: '2.2rem', lineHeight: 0.95, margin: 0 }}>
              Comparar Brackets
            </h1>
            <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.84rem', margin: '8px 0 0', maxWidth: 580 }}>
              Coloque dois participantes frente a frente e veja onde eles concordam, divergem e quem está levando vantagem no bolão.
            </p>
          </div>

          <div
            style={{
              minWidth: 180,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(12,12,18,0.34)',
              border: '1px solid rgba(200,150,60,0.16)',
            }}
          >
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Status atual</div>
            <div className="font-condensed font-bold" style={{ color: statusColor, fontSize: '1.05rem', lineHeight: 1 }}>
              {statusLabel}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 5 }}>
              {participantsCount} participante{participantsCount !== 1 ? 's' : ''} disponíveis
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          {[
            { label: 'Participantes', value: participantsCount, color: 'var(--nba-text)', icon: <Users size={14} /> },
            { label: 'Modo', value: bothSelected && !sameSelected ? 'Duelo' : 'Preparando', color: 'var(--nba-gold)', icon: <Swords size={14} /> },
            { label: 'Objetivo', value: 'Ver diferenças', color: 'var(--nba-success)', icon: <ShieldCheck size={14} /> },
          ].map((item) => (
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
                <span style={{ display: 'flex' }}>{item.icon}</span>
                {item.label}
              </div>
              <div className="font-condensed font-bold" style={{ color: item.color, fontSize: '1.25rem', lineHeight: 1.1 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Participant header card ──────────────────────────────────────────────────

const P_COLOR = {
  left:  'var(--nba-east)',   // #4a90d9
  right: 'var(--nba-west)',   // #e05c3a
}

function ParticipantHeader({
  participant,
  totalPoints,
  side,
  isWinning,
}: {
  participant: Participant
  totalPoints: number
  side: 'left' | 'right'
  isWinning: boolean
}) {
  const accent = P_COLOR[side]
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: 'var(--nba-surface)',
        border: `1px solid ${accent}44`,
        borderTop: `3px solid ${accent}`,
        borderRadius: 8,
        marginBottom: 12,
      }}
    >
      <Avatar name={participant.name} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: 'var(--nba-text)',
            fontWeight: 600,
            fontSize: '0.9rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {participant.name}
        </div>
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
          {side === 'left' ? 'Participante 1' : 'Participante 2'}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div
          className="font-condensed font-bold"
          style={{
            fontSize: '1.4rem',
            lineHeight: 1,
            color: isWinning ? 'var(--nba-gold)' : accent,
          }}
        >
          {totalPoints}
        </div>
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>pts</div>
      </div>
    </div>
  )
}

// ─── Styled select ────────────────────────────────────────────────────────────

function StyledSelect({
  value,
  onChange,
  participants,
  label,
  excludeId,
  accent,
}: {
  value: string
  onChange: (id: string) => void
  participants: Participant[]
  label: string
  excludeId?: string
  accent: string
}) {
  return (
    <div style={{ flex: 1 }}>
      <label
        style={{
          display: 'block',
          color: accent,
          fontSize: '0.72rem',
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          background: 'rgba(19,19,26,0.95)',
          border: `1px solid ${value ? accent + '88' : 'rgba(200,150,60,0.12)'}`,
          color: value ? 'var(--nba-text)' : 'var(--nba-text-muted)',
          borderRadius: 10,
          padding: '11px 12px',
          fontSize: '0.9rem',
          outline: 'none',
          cursor: 'pointer',
          transition: 'border-color 0.2s ease',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888899' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: 32,
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = accent }}
        onBlur={(e) => { e.currentTarget.style.borderColor = value ? accent + '88' : 'var(--nba-border)' }}
      >
        <option value="">Selecionar...</option>
        {participants
          .filter((p) => p.id !== excludeId)
          .map((p) => (
            <option key={p.id} value={p.id} style={{ background: '#13131a' }}>
              {p.name}
            </option>
          ))}
      </select>
    </div>
  )
}

function SelectionArena({
  participants,
  leftId,
  rightId,
  onLeft,
  onRight,
}: {
  participants: Participant[]
  leftId: string
  rightId: string
  onLeft: (id: string) => void
  onRight: (id: string) => void
}) {
  return (
    <div
      style={{
        background: 'var(--nba-surface)',
        border: '1px solid var(--nba-border)',
        borderRadius: 12,
        padding: '1rem',
        marginBottom: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <ArrowLeftRight size={16} style={{ color: 'var(--nba-gold)' }} />
        <h2 className="title" style={{ color: 'var(--nba-gold)', fontSize: '1rem', letterSpacing: '0.1em', margin: 0 }}>
          Montar duelo
        </h2>
      </div>

      <div style={{ display: 'flex', gap: 12 }} className="flex-col sm:flex-row">
        <StyledSelect
          value={leftId}
          onChange={onLeft}
          participants={participants}
          label="Participante 1"
          excludeId={rightId}
          accent="var(--nba-east)"
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 44,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(200,150,60,0.1)',
              border: '1px solid rgba(200,150,60,0.18)',
              color: 'var(--nba-gold)',
            }}
          >
            <Swords size={16} />
          </div>
        </div>
        <StyledSelect
          value={rightId}
          onChange={onRight}
          participants={participants}
          label="Participante 2"
          excludeId={leftId}
          accent="var(--nba-west)"
        />
      </div>
    </div>
  )
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  p1, p2,
  picks1, picks2,
  series,
  pts1, pts2,
}: {
  p1: Participant; p2: Participant
  picks1: SeriesPick[]; picks2: SeriesPick[]
  series: Series[]
  pts1: number; pts2: number
}) {
  // Count agreements/disagreements on series with picks from both
  let agree = 0, disagree = 0, onlyOne = 0

  for (const s of series) {
    const pick1 = picks1.find((p) => p.series_id === s.id)
    const pick2 = picks2.find((p) => p.series_id === s.id)
    if (pick1 && pick2) {
      if (pick1.winner_id === pick2.winner_id) agree++
      else disagree++
    } else if (pick1 || pick2) {
      onlyOne++
    }
  }

  const total = series.length

  const p1Winning = pts1 > pts2
  const p2Winning = pts2 > pts1
  const tied = pts1 === pts2 && pts1 > 0

  return (
    <div
      style={{
        background: 'var(--nba-surface)',
        border: '1px solid var(--nba-border)',
        borderRadius: 8,
        padding: '1rem',
        marginBottom: 20,
      }}
    >
      {/* Points comparison */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 12,
          marginBottom: 14,
          paddingBottom: 14,
          borderBottom: '1px solid var(--nba-border)',
        }}
      >
        {/* P1 score */}
        <div style={{ textAlign: 'center' }}>
          <div
            className="font-condensed font-bold"
            style={{ fontSize: '2.2rem', lineHeight: 1, color: p1Winning ? 'var(--nba-gold)' : 'var(--nba-east)' }}
          >
            {pts1}
          </div>
          <div
            style={{
              color: 'var(--nba-text-muted)',
              fontSize: '0.72rem',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {p1.name.split(' ')[0]}
          </div>
          {p1Winning && (
            <div style={{ color: 'var(--nba-gold)', fontSize: '0.65rem', marginTop: 2 }}>↑ na frente</div>
          )}
        </div>

        {/* VS */}
        <div className="title" style={{ color: 'var(--nba-text-muted)', fontSize: '1.1rem' }}>
          {tied ? 'EMPATE' : 'VS'}
        </div>

        {/* P2 score */}
        <div style={{ textAlign: 'center' }}>
          <div
            className="font-condensed font-bold"
            style={{ fontSize: '2.2rem', lineHeight: 1, color: p2Winning ? 'var(--nba-gold)' : 'var(--nba-west)' }}
          >
            {pts2}
          </div>
          <div
            style={{
              color: 'var(--nba-text-muted)',
              fontSize: '0.72rem',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {p2.name.split(' ')[0]}
          </div>
          {p2Winning && (
            <div style={{ color: 'var(--nba-gold)', fontSize: '0.65rem', marginTop: 2 }}>↑ na frente</div>
          )}
        </div>
      </div>

      {/* Agreement stats */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Stat
          label="Concordam"
          value={`${agree}/${total}`}
          color="rgba(46,204,113,0.8)"
          note="mesmo vencedor"
        />
        <Stat
          label="Divergem"
          value={`${disagree}/${total}`}
          color="rgba(231,76,60,0.8)"
          note="vencedores diferentes"
        />
        <Stat
          label="Só um palpitou"
          value={`${onlyOne}/${total}`}
          color="rgba(241,196,15,0.8)"
          note="série em aberto"
        />
      </div>
    </div>
  )
}

function Stat({ label, value, color, note }: { label: string; value: string; color: string; note: string }) {
  return (
    <div
      style={{
        flex: '1 1 80px',
        background: `${color}11`,
        border: `1px solid ${color}44`,
        borderRadius: 6,
        padding: '8px 10px',
        textAlign: 'center',
      }}
    >
      <div className="font-condensed font-bold" style={{ color, fontSize: '1.1rem', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ color: 'var(--nba-text)', fontSize: '0.72rem', marginTop: 2 }}>{label}</div>
      <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.62rem', marginTop: 1 }}>{note}</div>
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function CompareLegend() {
  const items = [
    { color: 'rgba(46,204,113,0.7)',  label: 'Concordam'       },
    { color: 'rgba(231,76,60,0.7)',   label: 'Divergem'        },
    { color: 'rgba(241,196,15,0.7)',  label: 'Só um palpitou'  },
    { color: 'rgba(200,150,60,0.2)',  label: 'Sem palpites'    },
  ]
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '6px 16px',
        margin: '12px 0',
        fontSize: '0.75rem',
        color: 'var(--nba-text-muted)',
      }}
    >
      {items.map(({ color, label }) => (
        <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              width: 10, height: 10, borderRadius: 2,
              border: `2px solid ${color}`,
              flexShrink: 0,
            }}
          />
          {label}
        </span>
      ))}
    </div>
  )
}

// ─── Floating tooltip ────────────────────────────────────────────────────────

interface TooltipState {
  series: Series
  clientX: number
  clientY: number
}

function SeriesHoverTooltip({
  tooltip,
  picks1,
  picks2,
  p1Name,
  p2Name,
}: {
  tooltip: TooltipState
  picks1: SeriesPick[]
  picks2: SeriesPick[]
  p1Name: string
  p2Name: string
}) {
  const s = tooltip.series
  const pick1 = picks1.find((p) => p.series_id === s.id)
  const pick2 = picks2.find((p) => p.series_id === s.id)

  const teamName = (winnerId: string | undefined) => {
    if (!winnerId) return null
    const t = s.home_team?.id === winnerId ? s.home_team : s.away_team
    return t ? `${t.abbreviation} (${t.name.split(' ').pop()})` : '?'
  }

  const getPickedTeamColor = (winnerId: string | undefined) => {
    if (!winnerId) return 'var(--nba-text-muted)'
    const t = s.home_team?.id === winnerId ? s.home_team : s.away_team
    return t?.primary_color ?? 'var(--nba-text)'
  }

  const agree = pick1 && pick2 && pick1.winner_id === pick2.winner_id

  const ROUND_LABEL: Record<number, string> = { 1: 'R1', 2: 'R2', 3: 'CF', 4: 'Finals' }
  const roundLabel = `${s.conference ?? ''} ${ROUND_LABEL[s.round] ?? ''}`.trim()

  return (
    <div
      style={{
        position: 'fixed',
        left: tooltip.clientX + 14,
        top: tooltip.clientY - 10,
        zIndex: 50,
        background: '#13131a',
        border: '1px solid rgba(200,150,60,0.35)',
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 200,
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        pointerEvents: 'none',
      }}
    >
      <div
        className="title"
        style={{ color: 'var(--nba-gold)', fontSize: '0.85rem', letterSpacing: '0.1em', marginBottom: 8 }}
      >
        {roundLabel}
        {s.home_team && s.away_team && (
          <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', fontFamily: 'Barlow, sans-serif', fontWeight: 400, marginLeft: 6 }}>
            {s.home_team.abbreviation} vs {s.away_team.abbreviation}
          </span>
        )}
      </div>

      {[
        { name: p1Name, pick: pick1, accent: 'var(--nba-east)' },
        { name: p2Name, pick: pick2, accent: 'var(--nba-west)' },
      ].map(({ name, pick, accent }) => (
        <div
          key={name}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: '3px 0',
          }}
        >
          <span style={{ color: accent, fontSize: '0.75rem', fontWeight: 600 }}>
            {name.split(' ')[0]}
          </span>
          {pick ? (
            <span
              className="font-condensed font-bold"
              style={{ color: getPickedTeamColor(pick.winner_id), fontSize: '0.85rem' }}
            >
              {teamName(pick.winner_id)}
              <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', fontWeight: 400, marginLeft: 4 }}>
                em {pick.games_count}
              </span>
            </span>
          ) : (
            <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem' }}>Não palpitou</span>
          )}
        </div>
      ))}

      {agree && (
        <div
          style={{
            marginTop: 7,
            paddingTop: 7,
            borderTop: '1px solid rgba(200,150,60,0.15)',
            color: '#2ecc71',
            fontSize: '0.68rem',
          }}
        >
          ✓ Concordam no vencedor
        </div>
      )}
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 16px',
        gap: 12,
        textAlign: 'center',
        color: 'var(--nba-text-muted)',
      }}
    >
      {icon}
      <p style={{ fontSize: '0.95rem' }}>{title}</p>
      {sub && <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>{sub}</p>}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Compare() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [leftId,   setLeftId]   = useState('')
  const [rightId,  setRightId]  = useState('')
  const [leftPicks,  setLeftPicks]  = useState<SeriesPick[]>([])
  const [rightPicks, setRightPicks] = useState<SeriesPick[]>([])
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const { series } = useSeries()
  const { ranking } = useRanking()

  useEffect(() => {
    supabase.from('participants').select('*').then(({ data }) => {
      if (data) setParticipants(data as Participant[])
    })
  }, [])

  async function fetchPicks(id: string): Promise<SeriesPick[]> {
    const { data } = await supabase.from('series_picks').select('*').eq('participant_id', id)
    return (data as SeriesPick[]) ?? []
  }

  async function handleLeft(id: string) {
    setLeftId(id)
    setLeftPicks(id ? await fetchPicks(id) : [])
  }

  async function handleRight(id: string) {
    setRightId(id)
    setRightPicks(id ? await fetchPicks(id) : [])
  }

  const handleHover = useCallback(
    (series: Series | null, x: number, y: number) => {
      setTooltip(series ? { series, clientX: x, clientY: y } : null)
    },
    []
  )

  const p1 = participants.find((p) => p.id === leftId)
  const p2 = participants.find((p) => p.id === rightId)

  const pts = (id: string) => ranking.find((r) => r.participant_id === id)?.total_points ?? 0
  const pts1 = pts(leftId)
  const pts2 = pts(rightId)

  const bothSelected  = !!leftId && !!rightId
  const sameSelected  = leftId && rightId && leftId === rightId

  return (
    <div className="pb-24 pt-4 px-4 mx-auto" style={{ maxWidth: 1400 }}>
      <CompareHero
        participantsCount={participants.length}
        bothSelected={bothSelected}
        sameSelected={!!sameSelected}
      />

      <SelectionArena
        participants={participants}
        leftId={leftId}
        rightId={rightId}
        onLeft={handleLeft}
        onRight={handleRight}
      />

      {/* Same participant warning */}
      {sameSelected && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: 'rgba(231,76,60,0.08)',
            border: '1px solid rgba(231,76,60,0.3)',
            borderRadius: 8,
            marginBottom: 16,
            color: '#e74c3c',
            fontSize: '0.85rem',
          }}
        >
          <AlertTriangle size={16} />
          Selecione participantes diferentes para comparar
        </div>
      )}

      {/* Empty states */}
      {!leftId && !rightId && (
        <EmptyState
          icon={<ArrowLeftRight size={36} style={{ opacity: 0.3 }} />}
          title="Selecione dois participantes para comparar"
          sub="As bordas do bracket indicam onde concordam ou divergem"
        />
      )}
      {leftId && !rightId && !sameSelected && (
        <EmptyState
          icon={<ArrowLeftRight size={36} style={{ opacity: 0.3 }} />}
          title="Selecione o segundo participante"
        />
      )}

      {/* Main comparison */}
      {bothSelected && !sameSelected && p1 && p2 && (
        <>
          {/* Summary card */}
          <SummaryCard
            p1={p1} p2={p2}
            picks1={leftPicks} picks2={rightPicks}
            series={series}
            pts1={pts1} pts2={pts2}
          />

          {/* Legend */}
          <CompareLegend />

          {/* Brackets — side by side on desktop, stacked on mobile */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 24,
            }}
            className="min-[900px]:grid-cols-2"
          >
            {/* Left bracket */}
            <div>
              <ParticipantHeader
                participant={p1}
                totalPoints={pts1}
                side="left"
                isWinning={pts1 > pts2}
              />
              <BracketSVG
                series={series}
                picks={leftPicks}
                comparePicks={rightPicks}
                onSeriesHover={handleHover}
              />
            </div>

            {/* Right bracket */}
            <div>
              <ParticipantHeader
                participant={p2}
                totalPoints={pts2}
                side="right"
                isWinning={pts2 > pts1}
              />
              <BracketSVG
                series={series}
                picks={rightPicks}
                comparePicks={leftPicks}
                onSeriesHover={handleHover}
              />
            </div>
          </div>
        </>
      )}

      {/* Floating tooltip */}
      {tooltip && p1 && p2 && (
        <SeriesHoverTooltip
          tooltip={tooltip}
          picks1={leftPicks}
          picks2={rightPicks}
          p1Name={p1.name}
          p2Name={p2.name}
        />
      )}
    </div>
  )
}
