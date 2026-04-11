import { useState, useEffect, useCallback } from 'react'
import { ArrowLeftRight, AlertTriangle, Sparkles, Swords, ShieldCheck, Users, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { BracketSVG } from '../components/BracketSVG'
import { useSeries } from '../hooks/useSeries'
import { useRanking } from '../hooks/useRanking'
import type { Participant, SeriesPick, Series, Game, GamePick, Team } from '../types'

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
              width: '100%',
              maxWidth: 220,
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

        <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 sm:grid-cols-3">
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

function getTeamName(team: Team | null | undefined): string {
  if (!team) return 'A definir'
  return team.abbreviation || team.name
}

function getSeriesMatchupLabel(series: Series): string {
  return `${getTeamName(series.home_team)} x ${getTeamName(series.away_team)}`
}

function getGameMatchupLabel(game: Game, seriesRef?: Series): string {
  const homeAbbr =
    seriesRef?.home_team?.id === game.home_team_id
      ? seriesRef.home_team.abbreviation
      : seriesRef?.away_team?.id === game.home_team_id
      ? seriesRef.away_team.abbreviation
      : game.home_team_id
  const awayAbbr =
    seriesRef?.home_team?.id === game.away_team_id
      ? seriesRef.home_team.abbreviation
      : seriesRef?.away_team?.id === game.away_team_id
      ? seriesRef.away_team.abbreviation
      : game.away_team_id

  return `${homeAbbr} x ${awayAbbr}`
}

function getPickedTeamLabel(winnerId: string | undefined, game: Game, seriesRef?: Series): string {
  if (!winnerId) return 'Sem palpite'

  const homeTeam =
    seriesRef?.home_team?.id === game.home_team_id
      ? seriesRef.home_team
      : seriesRef?.away_team?.id === game.home_team_id
      ? seriesRef.away_team
      : null
  const awayTeam =
    seriesRef?.home_team?.id === game.away_team_id
      ? seriesRef.home_team
      : seriesRef?.away_team?.id === game.away_team_id
      ? seriesRef.away_team
      : null

  if (homeTeam?.id === winnerId) return homeTeam.abbreviation
  if (awayTeam?.id === winnerId) return awayTeam.abbreviation
  return winnerId
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
          className="sm:flex hidden"
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
  gamePicks1, gamePicks2,
  games,
  series,
  pts1, pts2,
}: {
  p1: Participant; p2: Participant
  picks1: SeriesPick[]; picks2: SeriesPick[]
  gamePicks1: GamePick[]; gamePicks2: GamePick[]
  games: Game[]
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
  let gameAgree = 0, gameDisagree = 0, gameOnlyOne = 0

  for (const game of games) {
    const pick1 = gamePicks1.find((p) => p.game_id === game.id)
    const pick2 = gamePicks2.find((p) => p.game_id === game.id)
    if (pick1 && pick2) {
      if (pick1.winner_id === pick2.winner_id) gameAgree++
      else gameDisagree++
    } else if (pick1 || pick2) {
      gameOnlyOne++
    }
  }

  const totalGames = games.length

  const p1Winning = pts1 > pts2
  const p2Winning = pts2 > pts1
  const tied = pts1 === pts2 && pts1 > 0
  const duelLead = p1Winning ? p1.name.split(' ')[0] : p2Winning ? p2.name.split(' ')[0] : 'Empate'

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
      <div
        style={{
          display: 'grid',
          gap: 10,
          marginBottom: 14,
        }}
        className="grid-cols-2 lg:grid-cols-4"
      >
        {[
          { label: 'Na frente', value: duelLead, color: tied ? 'var(--nba-text)' : 'var(--nba-gold)' },
          { label: 'Concordam', value: agree, color: 'var(--nba-success)' },
          { label: 'Divergem', value: disagree, color: 'var(--nba-danger)' },
          { label: 'Só um palpitou', value: onlyOne, color: 'var(--nba-text)' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(12,12,18,0.34)',
              border: '1px solid rgba(200,150,60,0.14)',
            }}
          >
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 5 }}>{item.label}</div>
            <div className="font-condensed font-bold" style={{ color: item.color, fontSize: '1.2rem', lineHeight: 1.05 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Points comparison */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 8,
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

      <div
        className="sm:hidden"
        style={{
          marginBottom: 12,
          padding: '8px 10px',
          borderRadius: 10,
          background: 'rgba(12,12,18,0.34)',
          border: '1px solid rgba(200,150,60,0.12)',
          color: 'var(--nba-text-muted)',
          fontSize: '0.74rem',
          textAlign: 'center',
        }}
      >
        Arraste horizontalmente cada bracket para comparar as escolhas completas.
      </div>

      {/* Agreement stats */}
      <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 lg:grid-cols-2">
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'center',
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(12,12,18,0.34)',
            border: '1px solid rgba(200,150,60,0.14)',
          }}
        >
          <div style={{ width: '100%', textAlign: 'center', color: 'var(--nba-gold)', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Séries
          </div>
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

        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'center',
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(12,12,18,0.34)',
            border: '1px solid rgba(200,150,60,0.14)',
          }}
        >
          <div style={{ width: '100%', textAlign: 'center', color: 'var(--nba-gold)', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Jogo a jogo
          </div>
          <Stat
            label="Concordam"
            value={`${gameAgree}/${totalGames}`}
            color="rgba(46,204,113,0.8)"
            note="mesmo vencedor"
          />
          <Stat
            label="Divergem"
            value={`${gameDisagree}/${totalGames}`}
            color="rgba(231,76,60,0.8)"
            note="vencedores diferentes"
          />
          <Stat
            label="Só um palpitou"
            value={`${gameOnlyOne}/${totalGames}`}
            color="rgba(241,196,15,0.8)"
            note="jogo em aberto"
          />
        </div>
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

function GameComparisonBoard({
  games,
  series,
  picks1,
  picks2,
  p1,
  p2,
}: {
  games: Game[]
  series: Series[]
  picks1: GamePick[]
  picks2: GamePick[]
  p1: Participant
  p2: Participant
}) {
  const [filterMode, setFilterMode] = useState<'all' | 'differences' | 'resolved'>('all')
  const seriesMap = new Map(series.map((item) => [item.id, item]))
  const leftPicksByGameId = new Map(picks1.map((pick) => [pick.game_id, pick]))
  const rightPicksByGameId = new Map(picks2.map((pick) => [pick.game_id, pick]))
  const grouped = series
    .map((seriesItem) => ({
      series: seriesItem,
      games: games.filter((game) => game.series_id === seriesItem.id).sort((a, b) => a.game_number - b.game_number),
    }))
    .filter((group) => group.games.length > 0)
  const filteredGrouped = grouped
    .map(({ series: seriesItem, games: seriesGames }) => ({
      series: seriesItem,
      games: seriesGames.filter((game) => {
        const leftPick = leftPicksByGameId.get(game.id)
        const rightPick = rightPicksByGameId.get(game.id)

        if (filterMode === 'differences') {
          return (!!leftPick && !!rightPick && leftPick.winner_id !== rightPick.winner_id) || (!!leftPick !== !!rightPick)
        }

        if (filterMode === 'resolved') {
          return game.played
        }

        return true
      }),
    }))
    .filter((group) => group.games.length > 0)
  const [expandedSeriesIds, setExpandedSeriesIds] = useState<string[]>(() => {
    const firstInteresting = grouped.find(({ games: seriesGames }) =>
      seriesGames.some((game) => {
        const leftPick = leftPicksByGameId.get(game.id)
        const rightPick = rightPicksByGameId.get(game.id)
        return (
          game.played ||
          (leftPick && rightPick && leftPick.winner_id !== rightPick.winner_id) ||
          (!!leftPick !== !!rightPick)
        )
      })
    )

    return firstInteresting ? [firstInteresting.series.id] : grouped[0] ? [grouped[0].series.id] : []
  })

  if (grouped.length === 0) {
    return (
      <div
        style={{
          background: 'var(--nba-surface)',
          border: '1px solid var(--nba-border)',
          borderRadius: 10,
          padding: '1rem',
          marginBottom: 20,
        }}
      >
        <div className="title" style={{ color: 'var(--nba-gold)', fontSize: '1rem', marginBottom: 8 }}>
          Comparação jogo a jogo
        </div>
        <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', margin: 0 }}>
          Ainda não há jogos cadastrados para comparar nesta bateria.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'var(--nba-surface)',
        border: '1px solid var(--nba-border)',
        borderRadius: 10,
        padding: '1rem',
        marginBottom: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div className="title" style={{ color: 'var(--nba-gold)', fontSize: '1rem', marginBottom: 4 }}>
            Comparação jogo a jogo
          </div>
          <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem', margin: 0 }}>
            Veja rapidamente em quais partidas cada um foi para um lado diferente.
          </p>
        </div>
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
          {filteredGrouped.length} série{filteredGrouped.length !== 1 ? 's' : ''} no recorte atual
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {[
          { id: 'all', label: 'Todos' },
          { id: 'differences', label: 'Só divergências' },
          { id: 'resolved', label: 'Só resolvidos' },
        ].map((filter) => {
          const active = filterMode === filter.id
          return (
            <button
              key={filter.id}
              onClick={() => setFilterMode(filter.id as 'all' | 'differences' | 'resolved')}
              style={{
                borderRadius: 999,
                padding: '7px 11px',
                border: `1px solid ${active ? 'rgba(200,150,60,0.35)' : 'rgba(200,150,60,0.12)'}`,
                background: active ? 'rgba(200,150,60,0.12)' : 'rgba(12,12,18,0.34)',
                color: active ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      {filteredGrouped.length === 0 ? (
        <div
          style={{
            padding: '14px 12px',
            borderRadius: 10,
            background: 'rgba(12,12,18,0.34)',
            border: '1px solid rgba(200,150,60,0.12)',
            color: 'var(--nba-text-muted)',
            fontSize: '0.8rem',
            textAlign: 'center',
          }}
        >
          Nenhum jogo se encaixa nesse filtro agora.
        </div>
      ) : (
      <div style={{ display: 'grid', gap: 12 }}>
        {filteredGrouped.map(({ series: seriesItem, games: seriesGames }) => {
          const roundLabel =
            seriesItem.round === 1
              ? '1ª rodada'
              : seriesItem.round === 2
              ? '2ª rodada'
              : seriesItem.round === 3
              ? 'Finais de conferência'
              : 'Grande final'
          const isExpanded = expandedSeriesIds.includes(seriesItem.id)
          const seriesStats = seriesGames.reduce(
            (acc, game) => {
              const leftPick = leftPicksByGameId.get(game.id)
              const rightPick = rightPicksByGameId.get(game.id)
              const bothPicked = !!leftPick && !!rightPick
              const samePick = bothPicked && leftPick.winner_id === rightPick.winner_id
              const played = game.played && !!game.winner_id

              if (samePick) acc.agree += 1
              else if (bothPicked) acc.disagree += 1
              else if (leftPick || rightPick) acc.onlyOne += 1
              else acc.none += 1

              if (played && leftPick) {
                if (leftPick.winner_id === game.winner_id) acc.leftCorrect += 1
                else acc.leftWrong += 1
              }

              if (played && rightPick) {
                if (rightPick.winner_id === game.winner_id) acc.rightCorrect += 1
                else acc.rightWrong += 1
              }

              return acc
            },
            {
              agree: 0,
              disagree: 0,
              onlyOne: 0,
              none: 0,
              leftCorrect: 0,
              leftWrong: 0,
              rightCorrect: 0,
              rightWrong: 0,
            }
          )

          return (
            <div
              key={seriesItem.id}
              style={{
                borderRadius: 10,
                background: 'rgba(12,12,18,0.34)',
                border: '1px solid rgba(200,150,60,0.14)',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() =>
                  setExpandedSeriesIds((current) =>
                    current.includes(seriesItem.id)
                      ? current.filter((id) => id !== seriesItem.id)
                      : [...current, seriesItem.id]
                  )
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  width: '100%',
                  padding: '10px 12px',
                  background: 'transparent',
                  color: 'inherit',
                  border: 'none',
                  borderBottom: '1px solid rgba(200,150,60,0.12)',
                  flexWrap: 'wrap',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '0.96rem', lineHeight: 1 }}>
                    {getSeriesMatchupLabel(seriesItem)}
                  </div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem', marginTop: 4 }}>
                    {roundLabel} • {seriesItem.conference ?? 'Finals'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {seriesStats.disagree > 0 && (
                    <span style={{ color: 'var(--nba-danger)', fontSize: '0.72rem', fontWeight: 700 }}>
                      {seriesStats.disagree} diverg
                    </span>
                  )}
                  {seriesStats.agree > 0 && (
                    <span style={{ color: 'var(--nba-success)', fontSize: '0.72rem', fontWeight: 700 }}>
                      {seriesStats.agree} iguais
                    </span>
                  )}
                  {(seriesStats.leftCorrect + seriesStats.rightCorrect) > 0 && (
                    <span style={{ color: 'var(--nba-gold)', fontSize: '0.72rem', fontWeight: 700 }}>
                      {seriesStats.leftCorrect}x{seriesStats.rightCorrect} acertos
                    </span>
                  )}
                  <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
                    {seriesGames.length} jogo{seriesGames.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ color: isExpanded ? 'var(--nba-gold)' : 'var(--nba-text-muted)', display: 'flex' }}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div style={{ display: 'grid', gap: 8, padding: 12 }}>
                  {seriesGames.map((game) => {
                    const leftPick = leftPicksByGameId.get(game.id)
                    const rightPick = rightPicksByGameId.get(game.id)
                    const samePick = !!leftPick && !!rightPick && leftPick.winner_id === rightPick.winner_id
                    const leftCorrect = !!leftPick && game.played && !!game.winner_id && leftPick.winner_id === game.winner_id
                    const rightCorrect = !!rightPick && game.played && !!game.winner_id && rightPick.winner_id === game.winner_id
                    const leftWrong = !!leftPick && game.played && !!game.winner_id && leftPick.winner_id !== game.winner_id
                    const rightWrong = !!rightPick && game.played && !!game.winner_id && rightPick.winner_id !== game.winner_id
                    const rowAccent = samePick
                      ? 'rgba(46,204,113,0.16)'
                      : leftPick && rightPick
                      ? 'rgba(231,76,60,0.14)'
                      : leftPick || rightPick
                      ? 'rgba(241,196,15,0.12)'
                      : 'rgba(200,150,60,0.08)'

                    return (
                      <div
                        key={game.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: rowAccent,
                          border: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                          <div>
                            <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.92rem', lineHeight: 1 }}>
                              Jogo {game.game_number}
                            </div>
                            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 4 }}>
                              {getGameMatchupLabel(game, seriesMap.get(game.series_id))}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {samePick ? (
                              <span style={{ color: 'var(--nba-success)', fontSize: '0.72rem', fontWeight: 700 }}>Escolha igual</span>
                            ) : leftPick && rightPick ? (
                              <span style={{ color: 'var(--nba-danger)', fontSize: '0.72rem', fontWeight: 700 }}>Escolhas diferentes</span>
                            ) : leftPick || rightPick ? (
                              <span style={{ color: '#f1c40f', fontSize: '0.72rem', fontWeight: 700 }}>Só um palpitou</span>
                            ) : (
                              <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', fontWeight: 700 }}>Sem palpites</span>
                            )}
                            {game.played && game.winner_id && (
                              <span style={{ color: 'var(--nba-gold)', fontSize: '0.72rem', fontWeight: 700 }}>
                                Resultado: {getPickedTeamLabel(game.winner_id, game, seriesMap.get(game.series_id))}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gap: 8 }} className="grid-cols-1 md:grid-cols-2">
                          <div
                            style={{
                              padding: '8px 10px',
                              borderRadius: 8,
                              background: leftCorrect
                                ? 'rgba(46,204,113,0.12)'
                                : leftWrong
                                ? 'rgba(231,76,60,0.12)'
                                : 'rgba(74,144,217,0.12)',
                              border: `1px solid ${
                                leftCorrect
                                  ? 'rgba(46,204,113,0.32)'
                                  : leftWrong
                                  ? 'rgba(231,76,60,0.28)'
                                  : 'rgba(74,144,217,0.22)'
                              }`,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                              <div style={{ color: 'var(--nba-east)', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                {p1.name.split(' ')[0]}
                              </div>
                              {leftPick && game.played && game.winner_id && (
                                <span style={{ color: leftCorrect ? 'var(--nba-success)' : 'var(--nba-danger)', fontSize: '0.68rem', fontWeight: 700 }}>
                                  {leftCorrect ? 'Acertou' : 'Errou'}
                                </span>
                              )}
                            </div>
                            <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.92rem', lineHeight: 1.1 }}>
                              {leftPick ? getPickedTeamLabel(leftPick.winner_id, game, seriesMap.get(game.series_id)) : 'Sem palpite'}
                            </div>
                          </div>

                          <div
                            style={{
                              padding: '8px 10px',
                              borderRadius: 8,
                              background: rightCorrect
                                ? 'rgba(46,204,113,0.12)'
                                : rightWrong
                                ? 'rgba(231,76,60,0.12)'
                                : 'rgba(224,92,58,0.12)',
                              border: `1px solid ${
                                rightCorrect
                                  ? 'rgba(46,204,113,0.32)'
                                  : rightWrong
                                  ? 'rgba(231,76,60,0.28)'
                                  : 'rgba(224,92,58,0.22)'
                              }`,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                              <div style={{ color: 'var(--nba-west)', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                {p2.name.split(' ')[0]}
                              </div>
                              {rightPick && game.played && game.winner_id && (
                                <span style={{ color: rightCorrect ? 'var(--nba-success)' : 'var(--nba-danger)', fontSize: '0.68rem', fontWeight: 700 }}>
                                  {rightCorrect ? 'Acertou' : 'Errou'}
                                </span>
                              )}
                            </div>
                            <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.92rem', lineHeight: 1.1 }}>
                              {rightPick ? getPickedTeamLabel(rightPick.winner_id, game, seriesMap.get(game.series_id)) : 'Sem palpite'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      )}
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
  const [games, setGames] = useState<Game[]>([])
  const [leftGamePicks, setLeftGamePicks] = useState<GamePick[]>([])
  const [rightGamePicks, setRightGamePicks] = useState<GamePick[]>([])
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const { series } = useSeries()
  const { ranking } = useRanking()

  useEffect(() => {
    supabase.from('participants').select('*').then(({ data }) => {
      if (data) setParticipants(data as Participant[])
    })
  }, [])

  useEffect(() => {
    supabase
      .from('games')
      .select('*')
      .order('tip_off_at', { ascending: true })
      .order('game_number', { ascending: true })
      .then(({ data }) => {
        if (data) setGames(data as Game[])
      })
  }, [])

  async function fetchPicks(id: string): Promise<SeriesPick[]> {
    const { data } = await supabase.from('series_picks').select('*').eq('participant_id', id)
    return (data as SeriesPick[]) ?? []
  }

  async function fetchGamePicks(id: string): Promise<GamePick[]> {
    const { data } = await supabase.from('game_picks').select('*').eq('participant_id', id)
    return (data as GamePick[]) ?? []
  }

  async function handleLeft(id: string) {
    setLeftId(id)
    if (!id) {
      setLeftPicks([])
      setLeftGamePicks([])
      return
    }

    const [seriesData, gameData] = await Promise.all([fetchPicks(id), fetchGamePicks(id)])
    setLeftPicks(seriesData)
    setLeftGamePicks(gameData)
  }

  async function handleRight(id: string) {
    setRightId(id)
    if (!id) {
      setRightPicks([])
      setRightGamePicks([])
      return
    }

    const [seriesData, gameData] = await Promise.all([fetchPicks(id), fetchGamePicks(id)])
    setRightPicks(seriesData)
    setRightGamePicks(gameData)
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
            gamePicks1={leftGamePicks} gamePicks2={rightGamePicks}
            games={games}
            series={series}
            pts1={pts1} pts2={pts2}
          />

          {/* Legend */}
          <CompareLegend />

          <GameComparisonBoard
            games={games}
            series={series}
            picks1={leftGamePicks}
            picks2={rightGamePicks}
            p1={p1}
            p2={p2}
          />

          {/* Brackets — side by side on desktop, stacked on mobile */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 18,
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
