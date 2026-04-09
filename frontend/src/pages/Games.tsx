import { useEffect, useState } from 'react'
import { Lock, CheckCircle, XCircle, Save, Sparkles, Flame, BadgeCheck, CircleOff, Clock3 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CountdownTimer } from '../components/CountdownTimer'
import { useUIStore } from '../store/useUIStore'
import type { Game, GamePick, Team } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GameWithTeams extends Game {
  team_a?: Team | null
  team_b?: Team | null
}

interface Props {
  participantId: string
}

// ─── Mock teams (Play-in / non-2025 teams) ────────────────────────────────────

const MOCK_TEAMS: Record<string, Team> = {
  OKC:   { id: 'OKC',   name: 'Oklahoma City Thunder',    abbreviation: 'OKC',  conference: 'West', seed: 1, primary_color: '#007AC1' },
  HOU:   { id: 'HOU',   name: 'Houston Rockets',          abbreviation: 'HOU',  conference: 'West', seed: 2, primary_color: '#CE1141' },
  DEN:   { id: 'DEN',   name: 'Denver Nuggets',           abbreviation: 'DEN',  conference: 'West', seed: 4, primary_color: '#0E2240' },
  MIN:   { id: 'MIN',   name: 'Minnesota Timberwolves',   abbreviation: 'MIN',  conference: 'West', seed: 7, primary_color: '#0C2340' },
  LAL:   { id: 'LAL',   name: 'Los Angeles Lakers',       abbreviation: 'LAL',  conference: 'West', seed: 6, primary_color: '#552583' },
  SAS:   { id: 'SAS',   name: 'San Antonio Spurs',        abbreviation: 'SAS',  conference: 'West', seed: 5, primary_color: '#C4CED4' },
  CLE:   { id: 'CLE',   name: 'Cleveland Cavaliers',      abbreviation: 'CLE',  conference: 'East', seed: 1, primary_color: '#860038' },
  BOS:   { id: 'BOS',   name: 'Boston Celtics',           abbreviation: 'BOS',  conference: 'East', seed: 2, primary_color: '#007A33' },
  NYK:   { id: 'NYK',   name: 'New York Knicks',          abbreviation: 'NYK',  conference: 'East', seed: 3, primary_color: '#F58426' },
  DET:   { id: 'DET',   name: 'Detroit Pistons',          abbreviation: 'DET',  conference: 'East', seed: 5, primary_color: '#C8102E' },
  ATL:   { id: 'ATL',   name: 'Atlanta Hawks',            abbreviation: 'ATL',  conference: 'East', seed: 6, primary_color: '#E03A3E' },
  TBDW7: { id: 'TBDW7', name: 'Play-In Oeste #7',         abbreviation: 'TBD',  conference: 'West', seed: 7, primary_color: '#556677' },
  TBDW8: { id: 'TBDW8', name: 'Play-In Oeste #8',         abbreviation: 'TBD',  conference: 'West', seed: 8, primary_color: '#556677' },
  TBDE6: { id: 'TBDE6', name: 'Play-In Leste #6',         abbreviation: 'TBD',  conference: 'East', seed: 6, primary_color: '#556677' },
  TBDE7: { id: 'TBDE7', name: 'Play-In Leste #7',         abbreviation: 'TBD',  conference: 'East', seed: 7, primary_color: '#556677' },
  TBDE8: { id: 'TBDE8', name: 'Play-In Leste #8',         abbreviation: 'TBD',  conference: 'East', seed: 8, primary_color: '#556677' },
}

// BRT = UTC-3 → add 3 h to convert BRT to UTC
function brt(date: string, hBrt: number, mBrt = 0): string {
  const h = String(hBrt + 3).padStart(2, '0')
  const m = String(mBrt).padStart(2, '0')
  return `${date}T${h}:${m}:00Z`
}

const MOCK_GAMES: GameWithTeams[] = [
  {
    id: 'mock-1', series_id: '', game_number: 1, round: 1,
    team_a_id: 'OKC',   team_b_id: 'TBDW8',
    winner_id: null, home_team_id: 'OKC', away_team_id: 'TBDW8',
    score_a: null, score_b: null, played: false,
    tip_off_at: brt('2026-04-19', 18, 0), balldontlie_id: null,
    team_a: MOCK_TEAMS.OKC, team_b: MOCK_TEAMS.TBDW8,
  },
  {
    id: 'mock-2', series_id: '', game_number: 1, round: 1,
    team_a_id: 'DET',   team_b_id: 'TBDE8',
    winner_id: null, home_team_id: 'DET', away_team_id: 'TBDE8',
    score_a: null, score_b: null, played: false,
    tip_off_at: brt('2026-04-19', 20, 30), balldontlie_id: null,
    team_a: MOCK_TEAMS.DET, team_b: MOCK_TEAMS.TBDE8,
  },
  {
    id: 'mock-3', series_id: '', game_number: 1, round: 1,
    team_a_id: 'SAS',   team_b_id: 'TBDW7',
    winner_id: null, home_team_id: 'SAS', away_team_id: 'TBDW7',
    score_a: null, score_b: null, played: false,
    tip_off_at: brt('2026-04-20', 15, 0), balldontlie_id: null,
    team_a: MOCK_TEAMS.SAS, team_b: MOCK_TEAMS.TBDW7,
  },
  {
    id: 'mock-4', series_id: '', game_number: 1, round: 1,
    team_a_id: 'BOS',   team_b_id: 'TBDE7',
    winner_id: null, home_team_id: 'BOS', away_team_id: 'TBDE7',
    score_a: null, score_b: null, played: false,
    tip_off_at: brt('2026-04-20', 17, 30), balldontlie_id: null,
    team_a: MOCK_TEAMS.BOS, team_b: MOCK_TEAMS.TBDE7,
  },
  {
    id: 'mock-5', series_id: '', game_number: 1, round: 1,
    team_a_id: 'DEN',   team_b_id: 'MIN',
    winner_id: null, home_team_id: 'DEN', away_team_id: 'MIN',
    score_a: null, score_b: null, played: false,
    tip_off_at: brt('2026-04-20', 20, 0), balldontlie_id: null,
    team_a: MOCK_TEAMS.DEN, team_b: MOCK_TEAMS.MIN,
  },
  {
    id: 'mock-6', series_id: '', game_number: 1, round: 1,
    team_a_id: 'HOU',   team_b_id: 'LAL',
    winner_id: null, home_team_id: 'HOU', away_team_id: 'LAL',
    score_a: null, score_b: null, played: false,
    tip_off_at: brt('2026-04-21', 19, 0), balldontlie_id: null,
    team_a: MOCK_TEAMS.HOU, team_b: MOCK_TEAMS.LAL,
  },
  {
    id: 'mock-7', series_id: '', game_number: 1, round: 1,
    team_a_id: 'NYK',   team_b_id: 'ATL',
    winner_id: null, home_team_id: 'NYK', away_team_id: 'ATL',
    score_a: null, score_b: null, played: false,
    tip_off_at: brt('2026-04-21', 21, 30), balldontlie_id: null,
    team_a: MOCK_TEAMS.NYK, team_b: MOCK_TEAMS.ATL,
  },
  {
    id: 'mock-8', series_id: '', game_number: 1, round: 1,
    team_a_id: 'CLE',   team_b_id: 'TBDE6',
    winner_id: null, home_team_id: 'CLE', away_team_id: 'TBDE6',
    score_a: null, score_b: null, played: false,
    tip_off_at: brt('2026-04-22', 19, 0), balldontlie_id: null,
    team_a: MOCK_TEAMS.CLE, team_b: MOCK_TEAMS.TBDE6,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateKeyBRT(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

function formatDateHeader(iso: string): string {
  const d = new Date(iso)
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })
  const day     = d.toLocaleDateString('pt-BR', { day: 'numeric', timeZone: 'America/Sao_Paulo' })
  const month   = d.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'America/Sao_Paulo' })
    .replace('.', '').toUpperCase()
  return `${weekday.toUpperCase()} · ${day} ${month}`
}

function formatTimeBRT(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function getRelativeDateLabel(iso: string): string | null {
  const target = new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const now = new Date()
  const today = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(now.getDate() + 1)
  const tomorrow = tomorrowDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  if (target === today) return 'Hoje'
  if (target === tomorrow) return 'Amanhã'
  return null
}

function getUrgency(game: GameWithTeams) {
  if (game.played || !game.tip_off_at) return { label: null, color: 'var(--nba-text-muted)' }

  const diff = new Date(game.tip_off_at).getTime() - Date.now()
  if (diff <= 0) return { label: 'Fechado', color: 'var(--nba-danger)' }
  if (diff <= 3_600_000) return { label: 'Fecha em breve', color: 'var(--nba-danger)' }
  if (diff <= 10_800_000) return { label: 'Hoje ainda', color: 'var(--nba-gold)' }

  return { label: null, color: 'var(--nba-text-muted)' }
}

function getGameStateMeta(game: GameWithTeams, hasSavedPick: boolean, hasPendingPick: boolean) {
  if (game.played) {
    return { label: 'Finalizado', color: 'var(--nba-success)', bg: 'rgba(46,204,113,0.1)', icon: <BadgeCheck size={12} /> }
  }

  if (game.tip_off_at && new Date(game.tip_off_at) <= new Date()) {
    return { label: 'Bloqueado', color: 'var(--nba-danger)', bg: 'rgba(231,76,60,0.08)', icon: <Lock size={12} /> }
  }

  if (hasPendingPick) {
    return { label: 'Pronto para salvar', color: 'var(--nba-gold)', bg: 'rgba(200,150,60,0.1)', icon: <Save size={12} /> }
  }

  if (hasSavedPick) {
    return { label: 'Palpite salvo', color: 'var(--nba-success)', bg: 'rgba(46,204,113,0.1)', icon: <BadgeCheck size={12} /> }
  }

  return { label: 'Aguardando palpite', color: 'var(--nba-text-muted)', bg: 'rgba(255,255,255,0.04)', icon: <CircleOff size={12} /> }
}

const ROUND_LABEL: Record<number, string> = { 1: 'R1', 2: 'R2', 3: 'CF', 4: 'Finals' }
const ROUND_COLOR: Record<number, string> = {
  1: '#4a90d9', 2: '#9b59b6', 3: '#e05c3a', 4: '#c8963c',
}

// ─── Empty state (no games) ───────────────────────────────────────────────────

function EmptyState() {
  const target = '2026-04-18T03:00:00Z' // 18/04 00h BRT
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '56px 16px', gap: 12, textAlign: 'center',
      }}
    >
      <span style={{ fontSize: '3rem', lineHeight: 1 }}>🏀</span>
      <h2
        className="title"
        style={{ color: 'var(--nba-gold)', fontSize: '1.6rem', letterSpacing: '0.08em' }}
      >
        Playoffs chegando!
      </h2>
      <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.88rem', maxWidth: 280 }}>
        Os jogos serão exibidos aqui a partir de 18 de abril
      </p>
      <div style={{ marginTop: 8 }}>
        <CountdownTimer targetDate={target} label="Faltam" urgentUnderOneHour />
      </div>
    </div>
  )
}

// ─── Date group header ────────────────────────────────────────────────────────

function DateHeader({ iso, count }: { iso: string; count: number }) {
  const relative = getRelativeDateLabel(iso)
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        flexWrap: 'wrap',
        marginBottom: 12,
      }}
    >
      <h2
        className="title"
        style={{
          color: 'var(--nba-gold)', fontSize: '1rem',
          letterSpacing: '0.14em', lineHeight: 1,
        }}
      >
        {formatDateHeader(iso)}
      </h2>
      {relative && (
        <span
          className="font-condensed"
          style={{
            color: relative === 'Hoje' ? 'var(--nba-gold)' : 'var(--nba-east)',
            background: relative === 'Hoje' ? 'rgba(200,150,60,0.12)' : 'rgba(74,144,217,0.14)',
            border: `1px solid ${relative === 'Hoje' ? 'rgba(200,150,60,0.3)' : 'rgba(74,144,217,0.3)'}`,
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: '0.68rem',
            letterSpacing: '0.05em',
            flexShrink: 0,
          }}
        >
          {relative}
        </span>
      )}
      <div
        style={{
          height: 1, flex: 1,
          minWidth: 32,
          background: 'var(--nba-border)',
        }}
      />
      <span
        className="font-condensed"
        style={{
          color: 'var(--nba-text-muted)', fontSize: '0.72rem',
          background: 'var(--nba-surface-2)',
          border: '1px solid var(--nba-border)',
          borderRadius: 4, padding: '2px 8px',
          flexShrink: 0,
        }}
      >
        {count} jogo{count !== 1 ? 's' : ''}
      </span>
    </div>
  )
}

// ─── Team side (half of the card) ────────────────────────────────────────────

function TeamSide({
  team,
  side,
  isSelected,
  isWinner,
  isLoser,
  locked,
  onClick,
}: {
  team: Team | null | undefined
  side: 'left' | 'right'
  isSelected: boolean
  isWinner: boolean
  isLoser: boolean
  locked: boolean
  onClick: () => void
}) {
  const color = team?.primary_color ?? 'var(--nba-text-muted)'
  const abbr  = team?.abbreviation ?? '?'
  const name  = team?.name ?? '—'

  const resultBg =
    isWinner ? 'rgba(46,204,113,0.10)' :
    isLoser  ? 'rgba(231,76,60,0.08)'  :
    isSelected ? 'rgba(200,150,60,0.08)' :
    'transparent'

  const align = side === 'left' ? 'flex-start' : 'flex-end'

  return (
    <button
      onClick={onClick}
      disabled={locked}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: align,
        padding: '20px 14px',
        background: resultBg,
        border: 'none',
        cursor: locked ? 'default' : 'pointer',
        transition: 'background 0.2s ease',
        outline: 'none',
        opacity: isLoser ? 0.45 : 1,
        borderRadius: side === 'left' ? '7px 0 0 0' : '0 7px 0 0',
      }}
      onMouseEnter={(e) => {
        if (!locked && !isSelected && !isWinner && !isLoser) {
          e.currentTarget.style.background = 'rgba(200,150,60,0.06)'
        }
      }}
      onMouseLeave={(e) => {
        if (!locked && !isSelected && !isWinner && !isLoser) {
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      <span
        className="font-condensed font-bold"
        style={{
          color: abbr === 'TBD' ? 'var(--nba-text-muted)' : color,
          fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
          lineHeight: 1,
          letterSpacing: '-0.01em',
        }}
      >
        {abbr}
      </span>
      <span
        style={{
          color: 'var(--nba-text-muted)',
          fontSize: '0.7rem',
          marginTop: 4,
          maxWidth: 110,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: side === 'left' ? 'left' : 'right',
          direction: side === 'right' ? 'rtl' : 'ltr',
        }}
      >
        {abbr === 'TBD' ? name : name.split(' ').pop()}
      </span>

      {/* Result icons */}
      {isWinner && (
        <CheckCircle size={14} style={{ color: '#2ecc71', marginTop: 6 }} />
      )}
      {isLoser && (
        <XCircle size={14} style={{ color: '#e74c3c', marginTop: 6 }} />
      )}
    </button>
  )
}

// ─── Center panel ─────────────────────────────────────────────────────────────

function CenterPanel({ game, locked }: { game: GameWithTeams; locked: boolean }) {
  const hasScore = game.played && game.score_a != null && game.score_b != null

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '12px 8px', gap: 4,
        borderLeft: '1px solid var(--nba-border)',
        borderRight: '1px solid var(--nba-border)',
        minWidth: 64, flexShrink: 0,
      }}
    >
      {hasScore ? (
        <>
          <span
            className="font-condensed font-bold"
            style={{ color: 'var(--nba-text)', fontSize: '1.3rem', lineHeight: 1 }}
          >
            {game.score_a}
          </span>
          <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.65rem' }}>—</span>
          <span
            className="font-condensed font-bold"
            style={{ color: 'var(--nba-text)', fontSize: '1.3rem', lineHeight: 1 }}
          >
            {game.score_b}
          </span>
        </>
      ) : (
        <>
          {game.tip_off_at && !locked && (
            <span
              className="font-condensed font-bold"
              style={{ color: 'var(--nba-text)', fontSize: '1rem', lineHeight: 1 }}
            >
              {formatTimeBRT(game.tip_off_at)}
            </span>
          )}
          <span
            className="title"
            style={{ color: 'var(--nba-text-muted)', fontSize: '0.85rem', letterSpacing: '0.05em' }}
          >
            {locked && !game.played ? <Lock size={16} /> : 'VS'}
          </span>
          {game.tip_off_at && !locked && (
            <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.6rem' }}>BRT</span>
          )}
        </>
      )}
    </div>
  )
}

// ─── Game card ────────────────────────────────────────────────────────────────

interface GameCardProps {
  game: GameWithTeams
  pick: GamePick | undefined
  onSave: (gameId: string, winnerId: string) => Promise<void>
}

function GameCard({ game, pick, onSave }: GameCardProps) {
  const [pending, setPending] = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)

  // Se não há tip_off_at assumimos que o jogo ainda não foi agendado → não bloqueado
  const locked     = game.tip_off_at ? new Date(game.tip_off_at) <= new Date() : false
  const savedId    = pick?.winner_id ?? null
  const displayId  = pending ?? savedId
  const hasPending = pending !== null && pending !== savedId
  const tA = game.team_a
  const tB = game.team_b

  function handleClick(teamId: string) {
    console.log('time selecionado:', teamId)
    if (locked || game.played) return
    setPending((prev) => (prev === teamId ? null : teamId))
  }

  async function handleSave() {
    console.log('[GameCard] handleSave chamado', { pending, saving })
    if (!pending) {
      console.warn('[GameCard] handleSave: pending é null, abortando')
      return
    }
    setSaving(true)
    try {
      await onSave(game.id, pending)
      setPending(null)
    } catch (err) {
      console.error('[GameCard] handleSave threw:', err)
    } finally {
      setSaving(false)
    }
  }

  // Result helpers
  const tAWins = game.played && game.winner_id === tA?.id
  const tBWins = game.played && game.winner_id === tB?.id
  const tACorrect = game.played && savedId === tA?.id && tAWins
  const tAWrong   = game.played && savedId === tA?.id && !tAWins
  const tBCorrect = game.played && savedId === tB?.id && tBWins
  const tBWrong   = game.played && savedId === tB?.id && !tBWins

  const round = game.round as 1 | 2 | 3 | 4
  const roundColor = ROUND_COLOR[round]
  const urgency = getUrgency(game)
  const stateMeta = getGameStateMeta(game, !!savedId, hasPending)

  // Border: gold when selected or saved, else default
  const cardBorder =
    displayId ? 'rgba(200,150,60,0.5)' : 'var(--nba-border)'

  return (
    <div
      style={{
        background: 'var(--nba-surface)',
        border: `1px solid ${cardBorder}`,
        borderRadius: 8,
        overflow: 'hidden',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        boxShadow: urgency.label && !game.played ? '0 10px 24px rgba(0,0,0,0.16)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!displayId) {
          e.currentTarget.style.borderColor = 'rgba(200,150,60,0.4)'
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(200,150,60,0.08)'
        }
      }}
      onMouseLeave={(e) => {
        if (!displayId) {
          e.currentTarget.style.borderColor = 'var(--nba-border)'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '9px 12px',
          borderBottom: '1px solid var(--nba-border)',
          background: 'rgba(12,12,18,0.45)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            className="font-condensed font-bold"
            style={{
              color: roundColor,
              fontSize: '0.72rem',
              letterSpacing: '0.06em',
              background: `${roundColor}1f`,
              border: `1px solid ${roundColor}40`,
              padding: '2px 7px',
              borderRadius: 999,
              flexShrink: 0,
            }}
          >
            {ROUND_LABEL[round]}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: stateMeta.color,
              background: stateMeta.bg,
              borderRadius: 999,
              padding: '2px 8px',
              fontSize: '0.72rem',
              fontWeight: 600,
              minWidth: 0,
            }}
          >
            {stateMeta.icon}
            {stateMeta.label}
          </span>
        </div>

        {game.tip_off_at && !game.played && (
          <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', flexShrink: 0 }}>
            <Clock3 size={11} style={{ display: 'inline-flex', verticalAlign: 'text-bottom', marginRight: 4 }} />
            {formatTimeBRT(game.tip_off_at)}
          </span>
        )}
      </div>

      {/* ── Teams row ── */}
      {urgency.label && !game.played && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '7px 12px',
            borderBottom: '1px solid var(--nba-border)',
            background: urgency.color === 'var(--nba-danger)'
              ? 'rgba(231,76,60,0.08)'
              : 'rgba(200,150,60,0.08)',
          }}
        >
          <span
            className="font-condensed font-bold"
            style={{
              color: urgency.color,
              fontSize: '0.72rem',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Flame size={12} />
            {urgency.label}
          </span>
          {game.tip_off_at && (
            <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>
              {formatTimeBRT(game.tip_off_at)} BRT
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex' }}>
        <TeamSide
          team={tA}
          side="left"
          isSelected={displayId === tA?.id}
          isWinner={tAWins}
          isLoser={tAWrong}
          locked={locked || game.played}
          onClick={() => handleClick(tA?.id ?? game.home_team_id)}
        />
        <CenterPanel game={game} locked={locked} />
        <TeamSide
          team={tB}
          side="right"
          isSelected={displayId === tB?.id}
          isWinner={tBWins}
          isLoser={tBWrong}
          locked={locked || game.played}
          onClick={() => handleClick(tB?.id ?? game.away_team_id)}
        />
      </div>

      {/* ── Status bar ── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px',
          borderTop: '1px solid var(--nba-border)',
          background: 'rgba(0,0,0,0.15)',
          gap: 8,
        }}
      >
        {/* Left: round badge + game number */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            className="font-condensed font-bold"
            style={{
              background: `${roundColor}22`,
              color: roundColor,
              border: `1px solid ${roundColor}44`,
              borderRadius: 4,
              padding: '1px 7px',
              fontSize: '0.72rem',
            }}
          >
            {ROUND_LABEL[round]}
          </span>
          <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>
            Jogo {game.game_number}
          </span>
        </div>

        {/* Right: state-dependent content */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {game.played ? (
            /* Played result */
            savedId ? (
              (tACorrect || tBCorrect) ? (
                <span style={{ color: '#2ecc71', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={12} /> Acertou!
                </span>
              ) : (
                <span style={{ color: '#e74c3c', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <XCircle size={12} /> Errou
                </span>
              )
            ) : (
              <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem' }}>Encerrado</span>
            )
          ) : locked ? (
            /* Locked */
            <span
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                color: 'var(--nba-text-muted)', fontSize: '0.72rem',
              }}
            >
              <Lock size={11} />
              Encerrado para palpites
            </span>
          ) : game.tip_off_at ? (
            /* Countdown */
            <CountdownTimer
              targetDate={game.tip_off_at}
              urgentUnderOneHour
            />
          ) : null}
        </div>
      </div>

      {!hasPending && !game.played && savedId && (
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid rgba(46,204,113,0.15)',
            background: 'rgba(46,204,113,0.06)',
            color: 'var(--nba-text-muted)',
            fontSize: '0.74rem',
          }}
        >
          Palpite atual: <strong style={{ color: 'var(--nba-success)' }}>{savedId === tA?.id ? tA?.abbreviation : tB?.abbreviation}</strong>
        </div>
      )}

      {/* ── Save action (appears when pending) ── */}
      {hasPending && (
        <div style={{ padding: 12, borderTop: '1px solid rgba(200,150,60,0.18)', background: 'rgba(200,150,60,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'var(--nba-text)', fontSize: '0.8rem', fontWeight: 700 }}>
                Palpite pronto para envio
              </div>
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
                Toque em salvar para confirmar {displayId === tA?.id ? tA?.abbreviation : tB?.abbreviation}.
              </div>
            </div>
          </div>
          <button
            onClick={() => { console.log('clicou salvar', pending); handleSave(); }}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: '100%',
              padding: '10px 16px',
              background: saving ? 'rgba(200,150,60,0.3)' : 'var(--nba-gold)',
              border: 'none',
              color: saving ? 'rgba(255,255,255,0.6)' : '#0a0a0f',
              fontSize: '0.85rem',
              fontWeight: 700,
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.08em',
              cursor: saving ? 'default' : 'pointer',
              transition: 'background 0.2s ease, opacity 0.2s ease',
              borderRadius: 8,
            }}
            onMouseEnter={(e) => {
              if (!saving) e.currentTarget.style.background = '#e8b45a'
            }}
            onMouseLeave={(e) => {
              if (!saving) e.currentTarget.style.background = 'var(--nba-gold)'
            }}
          >
            <Save size={13} />
            {saving ? 'Salvando...' : 'SALVAR PALPITE'}
          </button>
        </div>
      )}
    </div>
  )
}

function GamesHero({
  games,
  picks,
  isMock,
}: {
  games: GameWithTeams[]
  picks: GamePick[]
  isMock: boolean
}) {
  const openGames = games.filter((game) => !game.played)
  const lockedSoon = openGames.filter((game) => {
    if (!game.tip_off_at) return false
    const diff = new Date(game.tip_off_at).getTime() - Date.now()
    return diff > 0 && diff <= 10_800_000
  }).length

  const pickedIds = new Set(picks.map((pick) => pick.game_id))
  const pendingPicks = openGames.filter((game) => !pickedIds.has(game.id)).length
  const nextGame = openGames
    .filter((game) => game.tip_off_at)
    .sort((a, b) => new Date(a.tip_off_at!).getTime() - new Date(b.tip_off_at!).getTime())[0]

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(200,150,60,0.18), rgba(224,92,58,0.10) 55%, rgba(19,19,26,1) 100%)',
        border: '1px solid rgba(200,150,60,0.22)',
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
          background: 'radial-gradient(circle at top right, rgba(232,180,90,0.18), transparent 35%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nba-gold)' }}>
          <Sparkles size={15} />
          <span className="font-condensed" style={{ fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Central de palpites
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 className="title" style={{ color: 'var(--nba-gold)', fontSize: '2.2rem', lineHeight: 0.95, margin: 0 }}>
              Jogos
            </h1>
            <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.84rem', margin: '8px 0 0' }}>
              {isMock
                ? 'Dados simulados para validar layout e fluxo de palpites'
                : 'Fique de olho nos horários para não perder nenhum fechamento'}
            </p>
          </div>

          {nextGame?.tip_off_at && (
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
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Próximo fechamento</div>
              <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1.1rem', lineHeight: 1 }}>
                {formatTimeBRT(nextGame.tip_off_at)}
              </div>
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 4 }}>
                {nextGame.team_a?.abbreviation ?? nextGame.home_team_id} vs {nextGame.team_b?.abbreviation ?? nextGame.away_team_id}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 sm:grid-cols-3">
          {[
            { label: 'Jogos abertos', value: openGames.length, tone: 'var(--nba-text)' },
            { label: 'Sem palpite', value: pendingPicks, tone: pendingPicks > 0 ? 'var(--nba-gold)' : 'var(--nba-success)' },
            { label: 'Fecham hoje', value: lockedSoon, tone: lockedSoon > 0 ? 'var(--nba-danger)' : 'var(--nba-text)' },
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
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>{item.label}</div>
              <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.7rem', lineHeight: 1.1 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Games({ participantId }: Props) {
  const [games,   setGames]   = useState<GameWithTeams[]>([])
  const [picks,   setPicks]   = useState<GamePick[]>([])
  const [loading, setLoading] = useState(true)
  const [isMock,  setIsMock]  = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { addToast } = useUIStore()

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (games.length > 0) fetchPicks()
  }, [games, participantId])

  async function fetchAll() {
    setLoading(true)
    setLoadError(null)
    const [{ data: gamesData, error: gamesError }, { data: teamsData, error: teamsError }] = await Promise.all([
      supabase.from('games').select('*').order('tip_off_at', { ascending: true }),
      supabase.from('teams').select('*'),
    ])

    if (gamesError || teamsError) {
      setGames([])
      setIsMock(false)
      setLoadError('Nao foi possivel carregar os jogos agora.')
      setLoading(false)
      return
    }

    if (gamesData && gamesData.length > 0) {
      const teamMap = Object.fromEntries((teamsData ?? []).map((t) => [t.id, t]))
      const merged = gamesData.map((g) => ({
        ...g,
        team_a: teamMap[g.home_team_id] ?? null,
        team_b: teamMap[g.away_team_id] ?? null,
      }))
      setGames(merged as GameWithTeams[])
      setIsMock(false)
    } else if (import.meta.env.DEV) {
      // No real games yet — use mock data for layout testing
      setGames(MOCK_GAMES)
      setIsMock(true)
    } else {
      setGames([])
      setIsMock(false)
    }
    setLoading(false)
  }

  async function fetchPicks() {
    if (!participantId || games.length === 0 || isMock) return
    const gameIds = games.map((g) => g.id)
    const { data } = await supabase
      .from('game_picks')
      .select('*')
      .eq('participant_id', participantId)
      .in('game_id', gameIds)
    if (data) setPicks(data as GamePick[])
  }

  async function savePick(gameId: string, winnerId: string) {
    console.log('[savePick] chamado', { gameId, winnerId, participantId, isMock })

    if (isMock) {
      const fake: GamePick = {
        id: `mock-pick-${gameId}`,
        participant_id: participantId,
        game_id: gameId,
        winner_id: winnerId,
        points: 0,
      }
      setPicks((prev) => {
        const exists = prev.find((p) => p.game_id === gameId)
        return exists
          ? prev.map((p) => p.game_id === gameId ? { ...p, winner_id: winnerId } : p)
          : [...prev, fake]
      })
      addToast('Palpite salvo! (simulação)', 'success')
      return
    }

    if (!participantId) {
      console.error('[savePick] participantId ausente!')
      addToast('Erro: participante não identificado', 'error')
      return
    }

    try {
      const existing = picks.find((p) => p.game_id === gameId)
      console.log('[savePick] pick existente:', existing ?? 'nenhum')

      if (existing) {
        const { data, error } = await supabase
          .from('game_picks')
          .update({ winner_id: winnerId })
          .eq('id', existing.id)
          .select()
          .single()
        console.log('[savePick] update result:', { data, error })
        if (error) {
          addToast(`Erro ao salvar: ${error.message}`, 'error')
          return
        }
        if (data) setPicks((prev) => prev.map((p) => p.id === existing.id ? data as GamePick : p))
      } else {
        const { data, error } = await supabase
          .from('game_picks')
          .insert({ participant_id: participantId, game_id: gameId, winner_id: winnerId })
          .select()
          .single()
        console.log('[savePick] insert result:', { data, error })
        if (error) {
          addToast(`Erro ao salvar: ${error.message}`, 'error')
          return
        }
        if (data) setPicks((prev) => [...prev, data as GamePick])
      }

      console.log('[savePick] sucesso!')
      addToast('Palpite salvo!', 'success')
    } catch (err) {
      console.error('[savePick] exceção inesperada:', err)
      addToast(`Erro inesperado: ${err instanceof Error ? err.message : String(err)}`, 'error')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div
          className="rounded-full border-2 animate-spin"
          style={{ width: 32, height: 32, borderColor: 'var(--nba-gold)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (games.length === 0) {
    if (loadError) {
      return (
        <div style={{ padding: '40px 16px 96px', maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <h2 className="title" style={{ color: 'var(--nba-gold)', fontSize: '1.4rem', marginBottom: 8 }}>
            Jogos indisponiveis
          </h2>
          <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.9rem' }}>
            {loadError}
          </p>
        </div>
      )
    }
    return <EmptyState />
  }

  // Group games by date in BRT
  const grouped = new Map<string, { iso: string; games: GameWithTeams[] }>()
  for (const g of games) {
    if (!g.tip_off_at) continue
    const key = dateKeyBRT(g.tip_off_at)
    if (!grouped.has(key)) grouped.set(key, { iso: g.tip_off_at, games: [] })
    grouped.get(key)!.games.push(g)
  }

  return (
    <div style={{ padding: '16px 16px 96px', maxWidth: 680, margin: '0 auto' }}>
      <GamesHero games={games} picks={picks} isMock={isMock} />

      {/* Games grouped by date */}
      {[...grouped.entries()].map(([key, { iso, games: dayGames }]) => (
        <div key={key} style={{ marginBottom: 28 }}>
          <DateHeader iso={iso} count={dayGames.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {dayGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                pick={picks.find((p) => p.game_id === game.id)}
                onSave={savePick}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
