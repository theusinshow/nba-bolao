import { useEffect, useMemo, useState } from 'react'
import { Lock, CheckCircle, XCircle, Save, Sparkles, Flame, BadgeCheck, CircleOff, Clock3, ChevronDown, ChevronRight, Layers3 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CountdownTimer } from '../components/CountdownTimer'
import { useUIStore } from '../store/useUIStore'
import type { Game, GamePick, Team } from '../types'
import { normalizeGame } from '../utils/bracket'
import { calculateGamePickPoints } from '../utils/scoring'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GameWithTeams extends Game {
  team_a?: Team | null
  team_b?: Team | null
  series_games_played?: number | null
  series_is_complete?: boolean
}

interface Props {
  participantId: string
}

interface SeriesGroup {
  key: string
  seriesId: string
  round: 1 | 2 | 3 | 4
  games: GameWithTeams[]
  teamA: Team | null
  teamB: Team | null
  openGames: number
  playedGames: number
  pickedGames: number
  points: number
  nextTipOff: string | null
  seriesGamesPlayed: number | null
  seriesIsComplete: boolean
  effectiveGamesCount: number
}

interface AutoPickPreviewItem {
  gameId: string
  winnerId: string
}

interface AutoPickDayGroup {
  key: string
  label: string
  iso: string
  games: GameWithTeams[]
  pendingGames: GameWithTeams[]
  alreadyPickedGames: GameWithTeams[]
}

type SavePickSource = 'manual' | 'auto'

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
// Handles overflow when hBrt + 3 >= 24 (crosses midnight UTC)
function brt(date: string, hBrt: number, mBrt = 0): string {
  const utcHours = hBrt + 3
  const h = String(utcHours % 24).padStart(2, '0')
  const m = String(mBrt).padStart(2, '0')

  if (utcHours >= 24) {
    const d = new Date(`${date}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + 1)
    const nextDate = d.toISOString().slice(0, 10)
    return `${nextDate}T${h}:${m}:00Z`
  }

  return `${date}T${h}:${m}:00Z`
}

const MOCK_GAMES: GameWithTeams[] = [
  {
    id: 'mock-1', series_id: '', game_number: 1, round: 1,
    team_a_id: 'OKC',   team_b_id: 'TBDW8',
    winner_id: null, home_team_id: 'OKC', away_team_id: 'TBDW8',
    home_score: null, away_score: null, nba_game_id: null,
    score_a: null, score_b: null, played: false,
    tip_off_at: brt('2026-04-19', 18, 0), balldontlie_id: null,
    team_a: MOCK_TEAMS.OKC, team_b: MOCK_TEAMS.TBDW8,
  },
  {
    id: 'mock-2', series_id: '', game_number: 1, round: 1,
    team_a_id: 'DET',   team_b_id: 'TBDE8',
    winner_id: null, home_team_id: 'DET', away_team_id: 'TBDE8',
    home_score: null, away_score: null, nba_game_id: null,
    score_a: null, score_b: null, played: false,
    tip_off_at: brt('2026-04-19', 20, 30), balldontlie_id: null,
    team_a: MOCK_TEAMS.DET, team_b: MOCK_TEAMS.TBDE8,
  },
  {
    id: 'mock-3', series_id: '', game_number: 1, round: 1,
    team_a_id: 'SAS',   team_b_id: 'TBDW7',
    winner_id: null, home_team_id: 'SAS', away_team_id: 'TBDW7',
    home_score: null, away_score: null, nba_game_id: null,
    score_a: null, score_b: null, played: false,
    tip_off_at: brt('2026-04-20', 15, 0), balldontlie_id: null,
    team_a: MOCK_TEAMS.SAS, team_b: MOCK_TEAMS.TBDW7,
  },
  {
    id: 'mock-4', series_id: '', game_number: 1, round: 1,
    team_a_id: 'BOS',   team_b_id: 'TBDE7',
    winner_id: null, home_team_id: 'BOS', away_team_id: 'TBDE7',
    home_score: null, away_score: null, nba_game_id: null,
    score_a: null, score_b: null, played: false,
    tip_off_at: brt('2026-04-20', 17, 30), balldontlie_id: null,
    team_a: MOCK_TEAMS.BOS, team_b: MOCK_TEAMS.TBDE7,
  },
  {
    id: 'mock-5', series_id: '', game_number: 1, round: 1,
    team_a_id: 'DEN',   team_b_id: 'MIN',
    winner_id: null, home_team_id: 'DEN', away_team_id: 'MIN',
    home_score: null, away_score: null, nba_game_id: null,
    score_a: null, score_b: null, played: false,
    tip_off_at: brt('2026-04-20', 20, 0), balldontlie_id: null,
    team_a: MOCK_TEAMS.DEN, team_b: MOCK_TEAMS.MIN,
  },
  {
    id: 'mock-6', series_id: '', game_number: 1, round: 1,
    team_a_id: 'HOU',   team_b_id: 'LAL',
    winner_id: null, home_team_id: 'HOU', away_team_id: 'LAL',
    home_score: null, away_score: null, nba_game_id: null,
    score_a: null, score_b: null, played: false,
    tip_off_at: brt('2026-04-21', 19, 0), balldontlie_id: null,
    team_a: MOCK_TEAMS.HOU, team_b: MOCK_TEAMS.LAL,
  },
  {
    id: 'mock-7', series_id: '', game_number: 1, round: 1,
    team_a_id: 'NYK',   team_b_id: 'ATL',
    winner_id: null, home_team_id: 'NYK', away_team_id: 'ATL',
    home_score: null, away_score: null, nba_game_id: null,
    score_a: null, score_b: null, played: false,
    tip_off_at: brt('2026-04-21', 21, 30), balldontlie_id: null,
    team_a: MOCK_TEAMS.NYK, team_b: MOCK_TEAMS.ATL,
  },
  {
    id: 'mock-8', series_id: '', game_number: 1, round: 1,
    team_a_id: 'CLE',   team_b_id: 'TBDE6',
    winner_id: null, home_team_id: 'CLE', away_team_id: 'TBDE6',
    home_score: null, away_score: null, nba_game_id: null,
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

function isSeriesClosedBeforeGame(game: GameWithTeams): boolean {
  return !!(
    game.series_is_complete &&
    game.series_games_played != null &&
    game.game_number > game.series_games_played
  )
}

function isGameOpenForPick(game: GameWithTeams): boolean {
  if (isSeriesClosedBeforeGame(game)) return false
  if (game.played) return false
  if (!game.tip_off_at) return false
  return new Date(game.tip_off_at) > new Date()
}

function getUrgency(game: GameWithTeams) {
  if (isSeriesClosedBeforeGame(game)) {
    return { label: null, color: 'var(--nba-text-muted)' }
  }

  if (game.played || !game.tip_off_at) return { label: null, color: 'var(--nba-text-muted)' }

  const diff = new Date(game.tip_off_at).getTime() - Date.now()
  if (diff <= 0) return { label: 'Fechado', color: 'var(--nba-danger)' }
  if (diff <= 3_600_000) return { label: 'Fecha em breve', color: 'var(--nba-danger)' }
  if (diff <= 10_800_000) return { label: 'Hoje ainda', color: 'var(--nba-gold)' }

  return { label: null, color: 'var(--nba-text-muted)' }
}

function getGameStateMeta(game: GameWithTeams, hasSavedPick: boolean, hasPendingPick: boolean) {
  if (isSeriesClosedBeforeGame(game)) {
    return { label: 'Série já encerrada', color: 'var(--nba-east)', bg: 'rgba(74,144,217,0.12)', icon: <CircleOff size={12} /> }
  }

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

function computeSeriesGroups(games: GameWithTeams[], picks: GamePick[]): SeriesGroup[] {
  const picksByGameId = Object.fromEntries(picks.map((pick) => [pick.game_id, pick]))
  const grouped = new Map<string, GameWithTeams[]>()

  for (const game of games) {
    const key = game.series_id || `mock-series-${game.home_team_id}-${game.away_team_id}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(game)
  }

  return [...grouped.entries()]
    .map(([seriesId, seriesGames]) => {
      const orderedGames = [...seriesGames].sort((left, right) => left.game_number - right.game_number)
      const firstGame = orderedGames[0]
      const round = (firstGame.round ?? 1) as 1 | 2 | 3 | 4
      const seriesGamesPlayed = firstGame.series_games_played ?? null
      const seriesIsComplete = firstGame.series_is_complete ?? false
      const effectiveGames = seriesIsComplete && seriesGamesPlayed != null
        ? orderedGames.filter((game) => game.game_number <= seriesGamesPlayed)
        : orderedGames
      const openGames = seriesIsComplete ? 0 : effectiveGames.filter((game) => !game.played).length
      const playedGames = orderedGames.filter((game) => game.played).length
      const pickedGames = effectiveGames.filter((game) => !!picksByGameId[game.id]).length
      const points = effectiveGames.reduce((sum, game) => {
        const pick = picksByGameId[game.id]
        if (!pick) return sum
        return sum + calculateGamePickPoints(
          { winnerId: pick.winner_id },
          { winnerId: game.winner_id ?? undefined, played: game.played, round: game.round }
        )
      }, 0)

      const nextTipOff = seriesIsComplete ? null : effectiveGames
        .filter((game) => !game.played && game.tip_off_at)
        .sort((left, right) => new Date(left.tip_off_at!).getTime() - new Date(right.tip_off_at!).getTime())[0]?.tip_off_at ?? null

      return {
        key: seriesId,
        seriesId,
        round,
        games: orderedGames,
        teamA: firstGame.team_a ?? null,
        teamB: firstGame.team_b ?? null,
        openGames,
        playedGames,
        pickedGames,
        points,
        nextTipOff,
        seriesGamesPlayed,
        seriesIsComplete,
        effectiveGamesCount: effectiveGames.length,
      }
    })
    .sort((left, right) => {
      if ((left.openGames > 0) !== (right.openGames > 0)) {
        return left.openGames > 0 ? -1 : 1
      }

      if (left.nextTipOff && right.nextTipOff) {
        return new Date(left.nextTipOff).getTime() - new Date(right.nextTipOff).getTime()
      }

      if (left.nextTipOff) return -1
      if (right.nextTipOff) return 1

      if (left.round !== right.round) return left.round - right.round
      return left.seriesId.localeCompare(right.seriesId)
    })
}

function buildAutoPickDayGroups(games: GameWithTeams[], picks: GamePick[]): AutoPickDayGroup[] {
  const pickMap = new Map(picks.map((pick) => [pick.game_id, pick]))
  const groups = new Map<string, GameWithTeams[]>()

  for (const game of games) {
    if (!game.tip_off_at) continue
    if (!isGameOpenForPick(game)) continue
    const key = dateKeyBRT(game.tip_off_at)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(game)
  }

  return [...groups.entries()]
    .map(([key, dayGames]) => {
      const ordered = [...dayGames].sort((a, b) => new Date(a.tip_off_at!).getTime() - new Date(b.tip_off_at!).getTime())
      const pendingGames = ordered.filter((game) => !pickMap.has(game.id))
      const alreadyPickedGames = ordered.filter((game) => pickMap.has(game.id))

      return {
        key,
        label: formatDateHeader(ordered[0].tip_off_at!),
        iso: ordered[0].tip_off_at!,
        games: ordered,
        pendingGames,
        alreadyPickedGames,
      }
    })
    .sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime())
}

function generateRandomPreview(games: GameWithTeams[]): AutoPickPreviewItem[] {
  return games
    .map((game) => {
      const options = [game.home_team_id, game.away_team_id].filter(Boolean)
      if (options.length < 2) return null
      const winnerId = options[Math.floor(Math.random() * options.length)]
      return { gameId: game.id, winnerId }
    })
    .filter((item): item is AutoPickPreviewItem => !!item)
}

function getAutoPickStorageKey(participantId: string) {
  return `nba-bolao:auto-picks:${participantId}`
}

function loadAutoPickIds(participantId: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(getAutoPickStorageKey(participantId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function persistAutoPickIds(participantId: string, ids: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(getAutoPickStorageKey(participantId), JSON.stringify(ids))
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

function DailyAutoPickCard({
  groups,
  onOpen,
}: {
  groups: AutoPickDayGroup[]
  onOpen: (group: AutoPickDayGroup) => void
}) {
  if (groups.length === 0) return null

  return (
    <div
      style={{
        background: 'var(--nba-surface)',
        border: '1px solid var(--nba-border)',
        borderRadius: 12,
        padding: '1rem',
        marginBottom: 18,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <div className="title" style={{ color: 'var(--nba-gold)', fontSize: '1rem', marginBottom: 4 }}>
            Vai na fé
          </div>
          <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem', margin: 0 }}>
            Preencha no aleatório só os jogos do dia que ainda estiverem abertos.
          </p>
        </div>
        <span
          className="font-condensed"
          style={{
            color: 'var(--nba-text-muted)',
            fontSize: '0.72rem',
            background: 'var(--nba-surface-2)',
            border: '1px solid var(--nba-border)',
            borderRadius: 999,
            padding: '4px 10px',
          }}
        >
          {groups.length} dia{groups.length !== 1 ? 's' : ''} disponível{groups.length !== 1 ? 'eis' : ''}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {groups.map((group) => (
          <button
            key={group.key}
            onClick={() => onOpen(group)}
            style={{
              width: '100%',
              textAlign: 'left',
              border: '1px solid rgba(200,150,60,0.16)',
              borderRadius: 10,
              background: 'rgba(12,12,18,0.34)',
              padding: '12px 14px',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '0.92rem', lineHeight: 1 }}>
                  {group.label}
                </div>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', marginTop: 5 }}>
                  {group.pendingGames.length} sem palpite • {group.alreadyPickedGames.length} já preenchido{group.alreadyPickedGames.length !== 1 ? 's' : ''}
                </div>
              </div>
              <span
                className="font-condensed font-bold"
                style={{
                  color: 'var(--nba-gold)',
                  fontSize: '0.82rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Vai na fé hoje
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function AutoPickModal({
  group,
  preview,
  mode,
  saving,
  onClose,
  onModeChange,
  onRefreshPreview,
  onConfirm,
}: {
  group: AutoPickDayGroup
  preview: AutoPickPreviewItem[]
  mode: 'fill-missing' | 'overwrite'
  saving: boolean
  onClose: () => void
  onModeChange: (mode: 'fill-missing' | 'overwrite') => void
  onRefreshPreview: () => void
  onConfirm: () => void
}) {
  const previewMap = new Map(preview.map((item) => [item.gameId, item.winnerId]))
  const listedGames = mode === 'overwrite' ? group.games : group.pendingGames

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--nba-surface)',
          border: '1px solid rgba(200,150,60,0.22)',
          borderRadius: 14,
          padding: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div>
            <div className="title" style={{ color: 'var(--nba-gold)', fontSize: '1.15rem', marginBottom: 4 }}>
              Vai na fé • {group.label}
            </div>
            <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem', margin: 0 }}>
              Os palpites abaixo são aleatórios. Revise antes de confirmar.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: '1px solid rgba(200,150,60,0.14)',
              background: 'rgba(12,12,18,0.34)',
              color: 'var(--nba-text-muted)',
              borderRadius: 10,
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            Fechar
          </button>
        </div>

        {group.alreadyPickedGames.length > 0 && (
          <div
            style={{
              display: 'grid',
              gap: 8,
              marginBottom: 14,
            }}
            className="grid-cols-1 sm:grid-cols-2"
          >
            <button
              onClick={() => onModeChange('fill-missing')}
              style={{
                textAlign: 'left',
                borderRadius: 10,
                padding: '10px 12px',
                border: `1px solid ${mode === 'fill-missing' ? 'rgba(46,204,113,0.32)' : 'rgba(200,150,60,0.12)'}`,
                background: mode === 'fill-missing' ? 'rgba(46,204,113,0.12)' : 'rgba(12,12,18,0.34)',
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              <div className="font-condensed font-bold" style={{ color: mode === 'fill-missing' ? 'var(--nba-success)' : 'var(--nba-text)', fontSize: '0.88rem' }}>
                Preencher só faltantes
              </div>
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 4 }}>
                Mantém seus palpites já salvos e gera só o que falta.
              </div>
            </button>
            <button
              onClick={() => onModeChange('overwrite')}
              style={{
                textAlign: 'left',
                borderRadius: 10,
                padding: '10px 12px',
                border: `1px solid ${mode === 'overwrite' ? 'rgba(231,76,60,0.28)' : 'rgba(200,150,60,0.12)'}`,
                background: mode === 'overwrite' ? 'rgba(231,76,60,0.10)' : 'rgba(12,12,18,0.34)',
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              <div className="font-condensed font-bold" style={{ color: mode === 'overwrite' ? 'var(--nba-danger)' : 'var(--nba-text)', fontSize: '0.88rem' }}>
                Sobrescrever o dia inteiro
              </div>
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 4 }}>
                Refaz todos os jogos abertos deste dia, inclusive os já preenchidos.
              </div>
            </button>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem' }}>
            {listedGames.length} jogo{listedGames.length !== 1 ? 's' : ''} será{listedGames.length !== 1 ? 'ão' : ''} alterado{listedGames.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={onRefreshPreview}
            style={{
              border: '1px solid rgba(200,150,60,0.16)',
              background: 'rgba(12,12,18,0.34)',
              color: 'var(--nba-gold)',
              borderRadius: 10,
              padding: '7px 10px',
              cursor: 'pointer',
              fontSize: '0.76rem',
              fontWeight: 700,
            }}
          >
            Gerar outra prévia
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
          {listedGames.map((game) => (
            <div
              key={game.id}
              style={{
                borderRadius: 10,
                border: '1px solid rgba(200,150,60,0.12)',
                background: 'rgba(12,12,18,0.34)',
                padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.9rem', lineHeight: 1 }}>
                    Jogo {game.game_number} • {game.team_a?.abbreviation ?? game.home_team_id} vs {game.team_b?.abbreviation ?? game.away_team_id}
                  </div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 4 }}>
                    {game.tip_off_at ? formatTimeBRT(game.tip_off_at) : 'Horário indefinido'}
                  </div>
                </div>
                <div
                  className="font-condensed font-bold"
                  style={{
                    color: 'var(--nba-gold)',
                    fontSize: '0.92rem',
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: 'rgba(200,150,60,0.12)',
                    border: '1px solid rgba(200,150,60,0.2)',
                  }}
                >
                  {previewMap.get(game.id) === game.home_team_id
                    ? game.team_a?.abbreviation ?? game.home_team_id
                    : game.team_b?.abbreviation ?? game.away_team_id}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              flex: 1,
              minWidth: 140,
              border: '1px solid rgba(200,150,60,0.14)',
              background: 'rgba(12,12,18,0.34)',
              color: 'var(--nba-text)',
              borderRadius: 10,
              padding: '10px 14px',
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={saving || listedGames.length === 0}
            style={{
              flex: 1.2,
              minWidth: 180,
              border: 'none',
              background: saving ? 'rgba(200,150,60,0.36)' : 'var(--nba-gold)',
              color: saving ? 'rgba(10,10,15,0.6)' : '#0a0a0f',
              borderRadius: 10,
              padding: '10px 14px',
              cursor: saving ? 'default' : 'pointer',
              fontWeight: 700,
            }}
          >
            {saving ? 'Aplicando...' : 'Confirmar vai na fé'}
          </button>
        </div>
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
    isSelected ? 'rgba(200,150,60,0.22)' :
    'transparent'

  const borderColor =
    isWinner ? 'rgba(46,204,113,0.45)' :
    isLoser ? 'rgba(231,76,60,0.28)' :
    isSelected ? 'rgba(200,150,60,0.78)' :
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
        border: '1px solid transparent',
        borderColor,
        cursor: locked ? 'default' : 'pointer',
        transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
        outline: 'none',
        opacity: isLoser ? 0.45 : 1,
        borderRadius: side === 'left' ? '7px 0 0 0' : '0 7px 0 0',
        boxShadow: isSelected ? 'inset 0 0 0 1px rgba(255,255,255,0.05), 0 0 0 2px rgba(200,150,60,0.18)' : 'none',
        transform: isSelected ? 'translateY(-1px)' : 'translateY(0)',
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
          color: isSelected ? 'var(--nba-gold)' : abbr === 'TBD' ? 'var(--nba-text-muted)' : color,
          fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
          lineHeight: 1,
          letterSpacing: '-0.01em',
          textShadow: isSelected ? '0 0 18px rgba(200,150,60,0.24)' : 'none',
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

      {isSelected && !isWinner && !isLoser && (
        <span
          className="font-condensed font-bold"
          style={{
            marginTop: 8,
            padding: '3px 8px',
            borderRadius: 999,
            background: 'rgba(200,150,60,0.18)',
            border: '1px solid rgba(200,150,60,0.36)',
            color: 'var(--nba-gold)',
            fontSize: '0.68rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Selecionado
        </span>
      )}

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
  onSave: (gameId: string, winnerId: string, source?: SavePickSource) => Promise<void>
  wasAutoPicked: boolean
}

function GameCard({ game, pick, onSave, wasAutoPicked }: GameCardProps) {
  const [pending, setPending] = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)
  const seriesClosedBeforeGame =
    !!game.series_is_complete &&
    game.series_games_played != null &&
    game.game_number > game.series_games_played

  // Se não há tip_off_at assumimos que o jogo ainda não foi agendado → não bloqueado
  const locked     = seriesClosedBeforeGame || (game.tip_off_at ? new Date(game.tip_off_at) <= new Date() : false)
  const savedId    = pick?.winner_id ?? null
  const displayId  = pending ?? savedId
  const hasPending = pending !== null && pending !== savedId
  const tA = game.team_a
  const tB = game.team_b
  const selectedTeam =
    displayId === tA?.id ? tA :
    displayId === tB?.id ? tB :
    null

  function handleClick(teamId: string) {
    if (locked || game.played || seriesClosedBeforeGame) return
    setPending((prev) => (prev === teamId ? null : teamId))
  }

  async function handleSave() {
    if (!pending) return
    setSaving(true)
    try {
      await onSave(game.id, pending, 'manual')
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
        boxShadow: urgency.label && !game.played && !seriesClosedBeforeGame ? '0 10px 24px rgba(0,0,0,0.16)' : 'none',
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

        {game.tip_off_at && !game.played && !seriesClosedBeforeGame && (
          <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', flexShrink: 0 }}>
            <Clock3 size={11} style={{ display: 'inline-flex', verticalAlign: 'text-bottom', marginRight: 4 }} />
            {formatTimeBRT(game.tip_off_at)}
          </span>
        )}
      </div>

      {/* ── Teams row ── */}
      {urgency.label && !game.played && !seriesClosedBeforeGame && (
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
          locked={locked || game.played || seriesClosedBeforeGame}
          onClick={() => handleClick(tA?.id ?? game.home_team_id)}
        />
        <CenterPanel game={game} locked={locked} />
        <TeamSide
          team={tB}
          side="right"
          isSelected={displayId === tB?.id}
          isWinner={tBWins}
          isLoser={tBWrong}
          locked={locked || game.played || seriesClosedBeforeGame}
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
          ) : seriesClosedBeforeGame ? (
            <span
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                color: 'var(--nba-east)', fontSize: '0.72rem',
              }}
            >
              <CircleOff size={11} />
              Série encerrada
            </span>
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

      {seriesClosedBeforeGame && (
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid rgba(74,144,217,0.18)',
            background: 'rgba(74,144,217,0.08)',
            color: 'var(--nba-text-muted)',
            fontSize: '0.74rem',
          }}
        >
          Série já encerrada em <strong style={{ color: 'var(--nba-east)' }}>jogo {game.series_games_played}</strong>. Este card fica apenas como histórico da série.
        </div>
      )}

      {!seriesClosedBeforeGame && !hasPending && !game.played && savedId && (
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid rgba(46,204,113,0.15)',
            background: 'rgba(46,204,113,0.06)',
            color: 'var(--nba-text-muted)',
            fontSize: '0.74rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span>
            Palpite atual: <strong style={{ color: 'var(--nba-success)' }}>{savedId === tA?.id ? tA?.abbreviation : tB?.abbreviation}</strong>
          </span>
          {wasAutoPicked && (
            <span
              className="font-condensed font-bold"
              style={{
                color: 'var(--nba-gold)',
                fontSize: '0.7rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '4px 8px',
                borderRadius: 999,
                background: 'rgba(200,150,60,0.14)',
                border: '1px solid rgba(200,150,60,0.26)',
              }}
            >
              Vai na fé
            </span>
          )}
        </div>
      )}

      {/* ── Save action (appears when pending) ── */}
      {hasPending && !seriesClosedBeforeGame && (
        <div style={{ padding: 12, borderTop: '1px solid rgba(200,150,60,0.18)', background: 'rgba(200,150,60,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'var(--nba-text)', fontSize: '0.8rem', fontWeight: 700 }}>
                Palpite pronto para envio
              </div>
              <div style={{ color: 'var(--nba-text)', fontSize: '0.76rem', marginTop: 4 }}>
                Você está escolhendo{' '}
                <span className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '0.9rem' }}>
                  {selectedTeam?.abbreviation ?? (displayId === tA?.id ? tA?.abbreviation : tB?.abbreviation)}
                </span>
                {selectedTeam?.name ? (
                  <span style={{ color: 'var(--nba-text-muted)' }}>
                    {' '}• {selectedTeam.name}
                  </span>
                ) : null}
              </div>
            </div>
            <div
              className="font-condensed font-bold"
              style={{
                color: 'var(--nba-gold)',
                fontSize: '0.82rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '4px 9px',
                borderRadius: 999,
                background: 'rgba(12,12,18,0.34)',
                border: '1px solid rgba(200,150,60,0.22)',
              }}
            >
              {selectedTeam?.abbreviation ?? 'Pronto'}
            </div>
          </div>
          <button
            onClick={handleSave}
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
  const [expandedSeriesIds, setExpandedSeriesIds] = useState<string[]>([])
  const [autoPickGroup, setAutoPickGroup] = useState<AutoPickDayGroup | null>(null)
  const [autoPickMode, setAutoPickMode] = useState<'fill-missing' | 'overwrite'>('fill-missing')
  const [autoPickPreview, setAutoPickPreview] = useState<AutoPickPreviewItem[]>([])
  const [autoPickSaving, setAutoPickSaving] = useState(false)
  const [autoPickGameIds, setAutoPickGameIds] = useState<string[]>([])
  const { addToast } = useUIStore()

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (games.length > 0) fetchPicks()
  }, [games, participantId])

  useEffect(() => {
    if (!participantId) return
    setAutoPickGameIds(loadAutoPickIds(participantId))
  }, [participantId])

  const seriesGroups = useMemo(() => computeSeriesGroups(games, picks), [games, picks])
  const autoPickDayGroups = useMemo(() => buildAutoPickDayGroups(games, picks), [games, picks])

  useEffect(() => {
    if (seriesGroups.length === 0) {
      setExpandedSeriesIds([])
      return
    }

    setExpandedSeriesIds((current) => {
      const validCurrent = current.filter((seriesId) => seriesGroups.some((group) => group.seriesId === seriesId))
      if (validCurrent.length > 0) return validCurrent

      const firstOpenSeries = seriesGroups.find((group) => group.openGames > 0)
      return [firstOpenSeries?.seriesId ?? seriesGroups[0].seriesId]
    })
  }, [seriesGroups])

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
      const seriesIds = [...new Set(gamesData.map((game) => game.series_id))]
      const { data: seriesData } = await supabase
        .from('series')
        .select('id, round, games_played, is_complete')
        .in('id', seriesIds)

      const teamMap = Object.fromEntries((teamsData ?? []).map((t) => [t.id, t]))
      const seriesMetaById = Object.fromEntries((seriesData ?? []).map((series) => [series.id, series]))
      const merged = gamesData.map((g) => ({
        ...normalizeGame(g as Game, seriesMetaById[g.series_id]?.round),
        team_a: teamMap[g.home_team_id] ?? null,
        team_b: teamMap[g.away_team_id] ?? null,
        series_games_played: seriesMetaById[g.series_id]?.games_played ?? null,
        series_is_complete: seriesMetaById[g.series_id]?.is_complete ?? false,
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

  async function savePick(gameId: string, winnerId: string, source: SavePickSource = 'manual') {
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
      setAutoPickGameIds((current) => {
        const next = source === 'auto'
          ? Array.from(new Set([...current, gameId]))
          : current.filter((id) => id !== gameId)
        persistAutoPickIds(participantId, next)
        return next
      })
      addToast('Palpite salvo! (simulação)', 'success')
      return
    }

    if (!participantId) {
      addToast('Erro: participante não identificado', 'error')
      return
    }

    try {
      const existing = picks.find((p) => p.game_id === gameId)

      if (existing) {
        const { data, error } = await supabase
          .from('game_picks')
          .update({ winner_id: winnerId })
          .eq('id', existing.id)
          .select()
          .single()
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
        if (error) {
          addToast(`Erro ao salvar: ${error.message}`, 'error')
          return
        }
        if (data) setPicks((prev) => [...prev, data as GamePick])
      }

      setAutoPickGameIds((current) => {
        const next = source === 'auto'
          ? Array.from(new Set([...current, gameId]))
          : current.filter((id) => id !== gameId)
        persistAutoPickIds(participantId, next)
        return next
      })

      addToast('Palpite salvo!', 'success')
    } catch (err) {
      console.error('[savePick] exceção inesperada:', err)
      addToast(`Erro inesperado: ${err instanceof Error ? err.message : String(err)}`, 'error')
    }
  }

  function openAutoPick(group: AutoPickDayGroup) {
    const mode = group.alreadyPickedGames.length > 0 ? 'fill-missing' : 'overwrite'
    setAutoPickGroup(group)
    setAutoPickMode(mode)
    setAutoPickPreview(generateRandomPreview(mode === 'overwrite' ? group.games : group.pendingGames))
  }

  function refreshAutoPickPreview(nextMode = autoPickMode) {
    if (!autoPickGroup) return
    const sourceGames = nextMode === 'overwrite' ? autoPickGroup.games : autoPickGroup.pendingGames
    setAutoPickPreview(generateRandomPreview(sourceGames))
  }

  function changeAutoPickMode(mode: 'fill-missing' | 'overwrite') {
    setAutoPickMode(mode)
    refreshAutoPickPreview(mode)
  }

  async function confirmAutoPick() {
    if (!autoPickGroup) return
    setAutoPickSaving(true)
    try {
      for (const item of autoPickPreview) {
        await savePick(item.gameId, item.winnerId, 'auto')
      }
      addToast('Vai na fé aplicado com sucesso!', 'success')
      setAutoPickGroup(null)
      setAutoPickPreview([])
    } finally {
      setAutoPickSaving(false)
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

  function toggleSeries(seriesId: string) {
    setExpandedSeriesIds((current) =>
      current.includes(seriesId)
        ? current.filter((id) => id !== seriesId)
        : [...current, seriesId]
    )
  }

  return (
    <div style={{ padding: '16px 16px 96px', maxWidth: 680, margin: '0 auto' }}>
      <GamesHero games={games} picks={picks} isMock={isMock} />
      <DailyAutoPickCard groups={autoPickDayGroups} onOpen={openAutoPick} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <h2
          className="title"
          style={{
            color: 'var(--nba-gold)',
            fontSize: '1rem',
            letterSpacing: '0.14em',
            lineHeight: 1,
          }}
        >
          SÉRIES
        </h2>
        <div
          style={{
            height: 1,
            flex: 1,
            minWidth: 32,
            background: 'var(--nba-border)',
          }}
        />
        <span
          className="font-condensed"
          style={{
            color: 'var(--nba-text-muted)',
            fontSize: '0.72rem',
            background: 'var(--nba-surface-2)',
            border: '1px solid var(--nba-border)',
            borderRadius: 4,
            padding: '2px 8px',
          }}
        >
          {seriesGroups.length} série{seriesGroups.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {seriesGroups.map((group) => (
          <SeriesCard
            key={group.key}
            group={group}
            picks={picks}
            expanded={expandedSeriesIds.includes(group.seriesId)}
            onToggle={() => toggleSeries(group.seriesId)}
            onSave={savePick}
            autoPickGameIds={autoPickGameIds}
          />
        ))}
      </div>

      {autoPickGroup && (
        <AutoPickModal
          group={autoPickGroup}
          preview={autoPickPreview}
          mode={autoPickMode}
          saving={autoPickSaving}
          onClose={() => {
            if (autoPickSaving) return
            setAutoPickGroup(null)
            setAutoPickPreview([])
          }}
          onModeChange={changeAutoPickMode}
          onRefreshPreview={() => refreshAutoPickPreview()}
          onConfirm={confirmAutoPick}
        />
      )}
    </div>
  )
}

function SeriesCard({
  group,
  picks,
  expanded,
  onToggle,
  onSave,
  autoPickGameIds,
}: {
  group: SeriesGroup
  picks: GamePick[]
  expanded: boolean
  onToggle: () => void
  onSave: (gameId: string, winnerId: string, source?: SavePickSource) => Promise<void>
  autoPickGameIds: string[]
}) {
  const completionPct = group.effectiveGamesCount > 0 ? Math.round((group.pickedGames / group.effectiveGamesCount) * 100) : 0
  const roundColor = ROUND_COLOR[group.round]
  const hasOpenGames = group.openGames > 0

  return (
    <div
      style={{
        background: 'var(--nba-surface)',
        border: `1px solid ${expanded ? 'rgba(200,150,60,0.24)' : 'var(--nba-border)'}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          padding: '14px 14px 12px',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span
                className="font-condensed font-bold"
                style={{
                  color: roundColor,
                  fontSize: '0.72rem',
                  letterSpacing: '0.08em',
                  background: `${roundColor}20`,
                  border: `1px solid ${roundColor}40`,
                  borderRadius: 999,
                  padding: '2px 8px',
                }}
              >
                {ROUND_LABEL[group.round]}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  color: hasOpenGames ? 'var(--nba-gold)' : 'var(--nba-success)',
                  background: hasOpenGames ? 'rgba(200,150,60,0.1)' : 'rgba(46,204,113,0.1)',
                  borderRadius: 999,
                  padding: '2px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}
              >
                <Layers3 size={12} />
                {hasOpenGames ? `${group.openGames} aberto${group.openGames !== 1 ? 's' : ''}` : 'Série encerrada'}
              </span>
            </div>

            <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1.5rem', lineHeight: 1 }}>
              {group.teamA?.abbreviation ?? group.games[0]?.home_team_id ?? '—'} vs {group.teamB?.abbreviation ?? group.games[0]?.away_team_id ?? '—'}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginTop: 6 }}>
              {group.effectiveGamesCount} jogo{group.effectiveGamesCount !== 1 ? 's' : ''} válidos • {group.playedGames} finalizado{group.playedGames !== 1 ? 's' : ''}
            </div>
            {group.seriesIsComplete && group.seriesGamesPlayed != null && group.seriesGamesPlayed < group.games.length && (
              <div style={{ color: 'var(--nba-east)', fontSize: '0.68rem', marginTop: 4 }}>
                Série encerrada antes do jogo {group.seriesGamesPlayed + 1}
              </div>
            )}
          </div>

          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: '1px solid rgba(200,150,60,0.12)',
              background: 'rgba(28,28,38,0.9)',
              color: expanded ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        </div>

        <div style={{ display: 'grid', gap: 10 }} className="grid-cols-2 sm:grid-cols-4">
          <div
            style={{
              padding: '9px 10px',
              borderRadius: 10,
              background: 'rgba(12,12,18,0.34)',
              border: '1px solid rgba(200,150,60,0.12)',
            }}
          >
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>Palpites feitos</div>
            <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1.1rem', lineHeight: 1.1 }}>
              {group.pickedGames}/{group.effectiveGamesCount}
            </div>
          </div>
          <div
            style={{
              padding: '9px 10px',
              borderRadius: 10,
              background: 'rgba(12,12,18,0.34)',
              border: '1px solid rgba(200,150,60,0.12)',
            }}
          >
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>Pontos da série</div>
            <div className="font-condensed font-bold" style={{ color: group.points > 0 ? 'var(--nba-success)' : 'var(--nba-text)', fontSize: '1.1rem', lineHeight: 1.1 }}>
              {group.points}
            </div>
          </div>
          <div
            style={{
              padding: '9px 10px',
              borderRadius: 10,
              background: 'rgba(12,12,18,0.34)',
              border: '1px solid rgba(200,150,60,0.12)',
            }}
          >
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>Cobertura</div>
            <div className="font-condensed font-bold" style={{ color: completionPct === 100 ? 'var(--nba-success)' : 'var(--nba-gold)', fontSize: '1.1rem', lineHeight: 1.1 }}>
              {completionPct}%
            </div>
          </div>
          <div
            style={{
              padding: '9px 10px',
              borderRadius: 10,
              background: 'rgba(12,12,18,0.34)',
              border: '1px solid rgba(200,150,60,0.12)',
            }}
          >
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>Próximo fechamento</div>
            <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1.1rem', lineHeight: 1.1 }}>
              {group.nextTipOff ? formatTimeBRT(group.nextTipOff) : '—'}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--nba-border)', background: 'rgba(0,0,0,0.12)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
            {group.games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                pick={picks.find((pick) => pick.game_id === game.id)}
                onSave={onSave}
                wasAutoPicked={autoPickGameIds.includes(game.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
