import { useEffect, useMemo, useRef, useState } from 'react'
import { Lock, CheckCircle, XCircle, Save, Sparkles, Flame, BadgeCheck, CircleOff, Clock3, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Layers3, Users, X, Shuffle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CountdownTimer } from '../components/CountdownTimer'
import { LoadingBasketball } from '../components/LoadingBasketball'
import { useUIStore } from '../store/useUIStore'
import { type OddsSummaryItem, useOddsSummary } from '../hooks/useOddsSummary'
import type { Game, GamePick, Participant, Team } from '../types'
import { normalizeGame } from '../utils/bracket'
import { calculateGamePickPoints } from '../utils/scoring'
import { TEAM_MAP, getTeamLogoUrl } from '../data/teams2025'
import { teamAbbrStyle } from '../utils/teamColors'
import { BRT_TIMEZONE } from '../utils/constants'

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

interface RevealedGamePick extends GamePick {
  participant_name: string
}

type GamesFilter = 'all' | 'pending' | 'urgent' | 'saved' | 'completed'

interface PickFocusEntry {
  game: GameWithTeams
  pick: GamePick
  team: Team | null
  statusLabel: string
  statusColor: string
}

interface MatchedGameOdds {
  bookmaker: string
  updatedAt: string | null
  homeDecimal: string
  awayDecimal: string
  favoriteTeamId: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateKeyBRT(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: BRT_TIMEZONE })
}

function formatDateHeader(iso: string): string {
  const d = new Date(iso)
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: BRT_TIMEZONE })
  const day     = d.toLocaleDateString('pt-BR', { day: 'numeric', timeZone: BRT_TIMEZONE })
  const month   = d.toLocaleDateString('pt-BR', { month: 'short', timeZone: BRT_TIMEZONE })
    .replace('.', '').toUpperCase()
  return `${weekday.toUpperCase()} · ${day} ${month}`
}

function formatTimeBRT(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: BRT_TIMEZONE,
  })
}

function getRelativeDateLabel(iso: string): string | null {
  const target = new Date(iso).toLocaleDateString('pt-BR', { timeZone: BRT_TIMEZONE })
  const now = new Date()
  const today = now.toLocaleDateString('pt-BR', { timeZone: BRT_TIMEZONE })

  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(now.getDate() + 1)
  const tomorrow = tomorrowDate.toLocaleDateString('pt-BR', { timeZone: BRT_TIMEZONE })

  if (target === today) return 'Hoje'
  if (target === tomorrow) return 'Amanhã'
  return null
}

const PICK_GRACE_MS = 5 * 60_000 // palpites aceitos até 5 min antes do tip-off

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
  return new Date(game.tip_off_at).getTime() - PICK_GRACE_MS > Date.now()
}

function getDayLabel(dateKey: string): string {
  const now = new Date()
  const todayKey = now.toLocaleDateString('pt-BR', { timeZone: BRT_TIMEZONE })
  const tomorrow = new Date(now.getTime() + 24 * 3_600_000)
  const tomorrowKey = tomorrow.toLocaleDateString('pt-BR', { timeZone: BRT_TIMEZONE })
  if (dateKey === todayKey) return 'Hoje'
  if (dateKey === tomorrowKey) return 'Amanhã'
  const parts = dateKey.split('/')
  if (parts.length !== 3) return dateKey
  const [dd, mm, yyyy] = parts
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()
  return `${weekday} ${dd}/${mm}`
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

  if (game.tip_off_at && new Date(game.tip_off_at).getTime() - PICK_GRACE_MS <= Date.now()) {
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

function isUrgentSeries(group: SeriesGroup) {
  if (!group.nextTipOff) return false
  const diff = new Date(group.nextTipOff).getTime() - Date.now()
  return diff > 0 && diff <= 10_800_000
}

function matchesSeriesFilter(group: SeriesGroup, filter: GamesFilter) {
  switch (filter) {
    case 'pending':
      return group.openGames > 0 && group.pickedGames < group.effectiveGamesCount
    case 'urgent':
      return group.openGames > 0 && isUrgentSeries(group)
    case 'saved':
      return group.openGames > 0 && group.pickedGames > 0
    case 'completed':
      return group.seriesIsComplete || group.openGames === 0
    case 'all':
    default:
      return true
  }
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

function buildPickFocusEntries(games: GameWithTeams[], picks: GamePick[]): PickFocusEntry[] {
  const gameMap = Object.fromEntries(games.map((game) => [game.id, game]))

  return picks
    .map((pick) => {
      const game = gameMap[pick.game_id]
      if (!game) return null

      const team =
        pick.winner_id === game.team_a?.id ? game.team_a :
        pick.winner_id === game.team_b?.id ? game.team_b :
        null

      let statusLabel = 'Palpite salvo'
      let statusColor = 'var(--nba-success)'

      if (game.played) {
        if (pick.winner_id === game.winner_id) {
          statusLabel = 'Acertou'
          statusColor = 'var(--nba-success)'
        } else {
          statusLabel = 'Errou'
          statusColor = 'var(--nba-danger)'
        }
      } else if (!isGameOpenForPick(game)) {
        statusLabel = 'Travado'
        statusColor = 'var(--nba-text-muted)'
      } else if (game.tip_off_at) {
        const diff = new Date(game.tip_off_at).getTime() - Date.now()
        if (diff <= 10_800_000) {
          statusLabel = 'Fecha em breve'
          statusColor = diff <= 3_600_000 ? 'var(--nba-danger)' : 'var(--nba-gold)'
        } else {
          statusLabel = 'Em aberto'
          statusColor = 'var(--nba-gold)'
        }
      }

      return { game, pick, team, statusLabel, statusColor }
    })
    .filter((entry): entry is PickFocusEntry => !!entry)
    .sort((left, right) => {
      const leftOpen = !left.game.played && isGameOpenForPick(left.game)
      const rightOpen = !right.game.played && isGameOpenForPick(right.game)
      if (leftOpen !== rightOpen) return leftOpen ? -1 : 1

      const leftTime = left.game.tip_off_at ? new Date(left.game.tip_off_at).getTime() : Number.MAX_SAFE_INTEGER
      const rightTime = right.game.tip_off_at ? new Date(right.game.tip_off_at).getTime() : Number.MAX_SAFE_INTEGER

      if (leftOpen && rightOpen) return leftTime - rightTime
      return rightTime - leftTime
    })
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

function isGameRevealed(game: GameWithTeams): boolean {
  if (isSeriesClosedBeforeGame(game)) return true
  if (game.played) return true
  if (!game.tip_off_at) return false
  return new Date(game.tip_off_at) <= new Date()
}

function normalizeName(value: string | null | undefined) {
  return value
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim() ?? ''
}

function convertAmericanToDecimal(value: number | null) {
  if (value == null) return null
  if (value > 0) return 1 + value / 100
  if (value < 0) return 1 + 100 / Math.abs(value)
  return null
}

function formatDecimalOdds(value: number | null) {
  const decimal = convertAmericanToDecimal(value)
  if (decimal == null) return '—'
  return decimal.toFixed(2)
}

function buildGameOddsMatch(game: GameWithTeams, odds: OddsSummaryItem[]): MatchedGameOdds | null {
  const homeName = normalizeName(game.team_a?.name)
  const awayName = normalizeName(game.team_b?.name)
  if (!homeName || !awayName) return null

  const matched = odds.find((item) => (
    normalizeName(item.home_team_name) === homeName &&
    normalizeName(item.away_team_name) === awayName
  ))

  if (!matched) return null

  const favoriteTeamId =
    matched.moneyline.home != null && matched.moneyline.away != null
      ? matched.moneyline.home < matched.moneyline.away
        ? game.team_a?.id ?? null
        : matched.moneyline.away < matched.moneyline.home
        ? game.team_b?.id ?? null
        : null
      : null

  return {
    bookmaker: matched.bookmaker,
    updatedAt: matched.updated_at,
    homeDecimal: formatDecimalOdds(matched.moneyline.home),
    awayDecimal: formatDecimalOdds(matched.moneyline.away),
    favoriteTeamId,
  }
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

const FAB_TOOLTIP_KEY = 'nba-bolao:vai-na-fe-intro-seen'

function AutoPickFAB({
  groups,
  onOpen,
}: {
  groups: AutoPickDayGroup[]
  onOpen: (group: AutoPickDayGroup) => void
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [showDayPicker, setShowDayPicker] = useState(false)
  const shownRef = useRef(false)
  const totalPending = groups.reduce((sum, g) => sum + g.pendingGames.length, 0)
  const hasGames = groups.length > 0

  // Mostra o balão uma única vez quando há jogos pendentes
  useEffect(() => {
    if (!hasGames || shownRef.current) return
    shownRef.current = true
    try {
      if (localStorage.getItem(FAB_TOOLTIP_KEY)) return
    } catch { return }
    const t = setTimeout(() => setShowTooltip(true), 700)
    return () => clearTimeout(t)
  }, [hasGames])

  function dismissTooltip() {
    setShowTooltip(false)
    try { localStorage.setItem(FAB_TOOLTIP_KEY, '1') } catch { /* noop */ }
  }

  function handleFabClick() {
    dismissTooltip()
    setShowDayPicker(false)
    if (groups.length === 0) return
    if (groups.length === 1) {
      onOpen(groups[0])
    } else {
      setShowDayPicker((v) => !v)
    }
  }

  // Posição base acima da barra de navegação
  const fabBottom = 'calc(80px + 16px + env(safe-area-inset-bottom))'
  const popoverBottom = 'calc(80px + 16px + 52px + 12px + env(safe-area-inset-bottom))'

  return (
    <>
      {/* Overlay fecha o seletor de dia */}
      {showDayPicker && (
        <div
          onClick={() => setShowDayPicker(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 48 }}
        />
      )}

      {/* Balão explicativo (primeira visita) */}
      {showTooltip && (
        <div
          style={{
            position: 'fixed',
            bottom: popoverBottom,
            right: 16,
            zIndex: 51,
            background: 'var(--nba-surface)',
            border: '1px solid rgba(200,150,60,0.32)',
            borderRadius: 12,
            padding: '14px 16px',
            maxWidth: 230,
            boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
          }}
        >
          {/* Seta apontando para o FAB */}
          <div style={{
            position: 'absolute', bottom: -8, right: 18,
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid rgba(200,150,60,0.32)',
          }} />
          <div style={{
            position: 'absolute', bottom: -6, right: 19,
            width: 0, height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: '7px solid var(--nba-surface)',
          }} />

          <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '0.92rem', marginBottom: 6 }}>
            🎲 Vai na fé
          </div>
          <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.78rem', margin: '0 0 12px', lineHeight: 1.45 }}>
            Sem tempo para pensar? Deixa eu sortear seus palpites — você confere antes de confirmar.
          </p>
          <button
            onClick={dismissTooltip}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 999,
              border: '1px solid rgba(200,150,60,0.3)',
              background: 'rgba(200,150,60,0.12)',
              color: 'var(--nba-gold)',
              fontSize: '0.76rem', fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.04em',
            }}
          >
            Entendi!
          </button>
        </div>
      )}

      {/* Seletor de dia (quando há múltiplos dias) */}
      {showDayPicker && (
        <div
          style={{
            position: 'fixed',
            bottom: popoverBottom,
            right: 16,
            zIndex: 49,
            background: 'rgba(19,19,26,0.98)',
            border: '1px solid rgba(200,150,60,0.22)',
            borderRadius: 12,
            padding: '10px',
            display: 'flex', flexDirection: 'column', gap: 6,
            minWidth: 190,
            boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(14px)',
          }}
        >
          <div
            className="font-condensed"
            style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0 4px 4px' }}
          >
            Sortear palpites para…
          </div>
          {groups.map((group) => (
            <button
              key={group.key}
              onClick={() => { onOpen(group); setShowDayPicker(false) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                border: '1px solid rgba(200,150,60,0.14)',
                background: 'rgba(12,12,18,0.5)',
                color: 'var(--nba-text)',
                cursor: 'pointer',
              }}
            >
              <span className="font-condensed font-bold" style={{ fontSize: '0.88rem' }}>
                {getDayLabel(group.key)}
              </span>
              {group.pendingGames.length > 0 && (
                <span
                  className="font-condensed"
                  style={{
                    background: 'rgba(200,150,60,0.16)',
                    color: 'var(--nba-gold)',
                    borderRadius: 4, padding: '1px 7px',
                    fontSize: '0.72rem', fontWeight: 700,
                  }}
                >
                  {group.pendingGames.length} pendente{group.pendingGames.length !== 1 ? 's' : ''}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Botão circular flutuante */}
      <button
        onClick={handleFabClick}
        disabled={!hasGames}
        title="Vai na fé — sortear palpites"
        style={{
          position: 'fixed',
          bottom: fabBottom,
          right: 16,
          zIndex: 49,
          width: 52, height: 52,
          borderRadius: '50%',
          border: 'none',
          background: hasGames ? 'var(--nba-gold)' : 'rgba(200,150,60,0.28)',
          color: '#0a0a0f',
          cursor: hasGames ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: hasGames
            ? '0 4px 20px rgba(200,150,60,0.50), 0 2px 8px rgba(0,0,0,0.3)'
            : 'none',
          transition: 'background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease',
        }}
        onMouseEnter={(e) => { if (hasGames) e.currentTarget.style.transform = 'scale(1.08)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <Shuffle size={22} />
        {totalPending > 0 && (
          <span
            style={{
              position: 'absolute', top: -3, right: -3,
              background: 'var(--nba-danger)',
              color: '#fff',
              borderRadius: '50%',
              width: 20, height: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.62rem', fontWeight: 700,
              border: '2px solid var(--nba-bg)',
              lineHeight: 1,
            }}
          >
            {totalPending > 9 ? '9+' : totalPending}
          </span>
        )}
      </button>
    </>
  )
}

function DayTabsBar({
  days,
  selected,
  onChange,
}: {
  days: string[]
  selected: string | null
  onChange: (day: string | null) => void
}) {
  if (days.length <= 1) return null

  return (
    <div
      style={{
        display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2,
        marginBottom: 14, scrollbarWidth: 'none',
      }}
    >
      <button
        onClick={() => onChange(null)}
        style={{
          padding: '5px 12px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
          border: `1px solid ${!selected ? 'rgba(200,150,60,0.3)' : 'rgba(200,150,60,0.1)'}`,
          background: !selected ? 'rgba(200,150,60,0.10)' : 'transparent',
          color: !selected ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
          fontSize: '0.72rem', fontWeight: 700,
        }}
      >
        Todos os dias
      </button>
      {days.map((day) => {
        const isSelected = selected === day
        return (
          <button
            key={day}
            onClick={() => onChange(day)}
            style={{
              padding: '5px 12px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
              border: `1px solid ${isSelected ? 'rgba(200,150,60,0.3)' : 'rgba(200,150,60,0.1)'}`,
              background: isSelected ? 'rgba(200,150,60,0.10)' : 'transparent',
              color: isSelected ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
              fontSize: '0.72rem', fontWeight: 700,
            }}
          >
            {getDayLabel(day)}
          </button>
        )
      })}
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

function RevealedPicksModal({
  game,
  picks,
  onClose,
}: {
  game: GameWithTeams
  picks: RevealedGamePick[]
  onClose: () => void
}) {
  const homeVotes = picks.filter((pick) => pick.winner_id === game.home_team_id)
  const awayVotes = picks.filter((pick) => pick.winner_id === game.away_team_id)
  const totalVotes = picks.length
  const homePct = totalVotes > 0 ? Math.round((homeVotes.length / totalVotes) * 100) : 0
  const awayPct = totalVotes > 0 ? Math.round((awayVotes.length / totalVotes) * 100) : 0
  const loneHomeVote = totalVotes > 1 && homeVotes.length === 1
  const loneAwayVote = totalVotes > 1 && awayVotes.length === 1
  const sortedPicks = [...picks].sort((left, right) =>
    left.participant_name.localeCompare(right.participant_name, 'pt-BR', { sensitivity: 'base' })
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        style={{
          width: '100%',
          maxWidth: 560,
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
            <div className="title" style={{ color: 'var(--nba-gold)', fontSize: '1.1rem', marginBottom: 4 }}>
              Palpites revelados
            </div>
            <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem', margin: 0 }}>
              Jogo {game.game_number} • {game.team_a?.abbreviation ?? game.home_team_id} vs {game.team_b?.abbreviation ?? game.away_team_id}
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
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10, marginBottom: 14 }} className="grid-cols-1 sm:grid-cols-2">
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: `${game.team_a?.primary_color ?? '#4a90d9'}18`,
              border: `1px solid ${game.team_a?.primary_color ?? '#4a90d9'}40`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              {game.team_a && (
                <img
                  src={getTeamLogoUrl(game.team_a.abbreviation)}
                  alt={game.team_a.abbreviation}
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                  style={{ width: 22, height: 22, objectFit: 'contain' }}
                />
              )}
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>{game.team_a?.name ?? game.home_team_id}</div>
            </div>
            <div className="font-condensed font-bold" style={{ color: game.team_a?.primary_color ?? 'var(--nba-text)', fontSize: '1.5rem', lineHeight: 1.1 }}>
              {homeVotes.length}
              <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginLeft: 6 }}>{homePct}%</span>
            </div>
            {loneHomeVote && (
              <div style={{ color: 'var(--nba-gold)', fontSize: '0.68rem', marginTop: 4 }}>
                Voto solitário
              </div>
            )}
          </div>
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: `${game.team_b?.primary_color ?? '#e05c3a'}18`,
              border: `1px solid ${game.team_b?.primary_color ?? '#e05c3a'}40`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              {game.team_b && (
                <img
                  src={getTeamLogoUrl(game.team_b.abbreviation)}
                  alt={game.team_b.abbreviation}
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                  style={{ width: 22, height: 22, objectFit: 'contain' }}
                />
              )}
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>{game.team_b?.name ?? game.away_team_id}</div>
            </div>
            <div className="font-condensed font-bold" style={{ color: game.team_b?.primary_color ?? 'var(--nba-text)', fontSize: '1.5rem', lineHeight: 1.1 }}>
              {awayVotes.length}
              <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginLeft: 6 }}>{awayPct}%</span>
            </div>
            {loneAwayVote && (
              <div style={{ color: 'var(--nba-gold)', fontSize: '0.68rem', marginTop: 4 }}>
                Voto solitário
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            marginBottom: 14,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(12,12,18,0.34)',
            border: '1px solid rgba(200,150,60,0.14)',
            color: 'var(--nba-text-muted)',
            fontSize: '0.76rem',
          }}
        >
          {totalVotes > 0
            ? `${totalVotes} participante${totalVotes !== 1 ? 's' : ''} já tiveram o palpite revelado para este jogo.`
            : 'Ninguém registrou palpite para este jogo até o fechamento.'}
        </div>

        {totalVotes > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            {sortedPicks.map((pick) => {
              const pickedTeam = pick.winner_id === game.home_team_id ? game.team_a : game.team_b
              const pickedTeamVotes = pick.winner_id === game.home_team_id ? homeVotes.length : awayVotes.length
              const isLoneVote = totalVotes > 1 && pickedTeamVotes === 1
              const isCorrect = game.played && game.winner_id != null && pick.winner_id === game.winner_id
              return (
                <div
                  key={pick.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(12,12,18,0.34)',
                    border: '1px solid rgba(200,150,60,0.12)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: 'var(--nba-text)', fontWeight: 600, fontSize: '0.86rem' }}>
                      {pick.participant_name}
                    </div>
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {isLoneVote && (
                        <span style={{ color: 'var(--nba-gold)' }}>
                          voto solitário
                        </span>
                      )}
                      {game.played && (
                        <span style={{ color: isCorrect ? 'var(--nba-success)' : 'var(--nba-danger)' }}>
                          {isCorrect ? 'acertou' : 'errou'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span
                      className="font-condensed font-bold"
                      style={{
                        color: pickedTeam?.primary_color ?? 'var(--nba-gold)',
                        background: pickedTeam?.primary_color ? `${pickedTeam.primary_color}22` : 'rgba(200,150,60,0.12)',
                        border: `1px solid ${pickedTeam?.primary_color ?? 'rgba(200,150,60,0.22)'}`,
                        borderRadius: 999,
                        padding: '4px 9px',
                        fontSize: '0.78rem',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {pickedTeam?.abbreviation ?? pick.winner_id}
                    </span>
                    {game.played && (
                      <span
                        className="font-condensed font-bold"
                        style={{
                          color: isCorrect ? 'var(--nba-success)' : 'var(--nba-danger)',
                          fontSize: '0.74rem',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {isCorrect ? '✓ acertou' : '✕ errou'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
  const [logoError, setLogoError] = useState(false)

  const color = team?.primary_color ?? 'var(--nba-gold)'
  const abbr  = team?.abbreviation ?? '?'
  const name  = team?.name ?? '—'
  const showLogo = !!team && abbr !== 'TBD' && !logoError

  const teamTint    = !team?.primary_color ? 'rgba(200,150,60,0.32)' : `${team.primary_color}50`
  const teamOutline = !team?.primary_color ? 'rgba(200,150,60,0.8)'  : `${color}cc`

  const resultBg =
    isWinner ? 'rgba(46,204,113,0.10)' :
    isLoser  ? 'rgba(231,76,60,0.08)'  :
    isSelected ? `linear-gradient(180deg, ${team?.primary_color ?? '#c8963c'}38 0%, rgba(12,12,18,0.55) 100%)` :
    'transparent'

  const borderColor =
    isWinner ? 'rgba(46,204,113,0.45)' :
    isLoser ? 'rgba(231,76,60,0.28)' :
    isSelected ? teamOutline :
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
        borderLeft:  side === 'left'  ? `4px solid ${team?.secondary_color ?? 'transparent'}` : undefined,
        borderRight: side === 'right' ? `4px solid ${team?.secondary_color ?? 'transparent'}` : undefined,
        cursor: locked ? 'default' : 'pointer',
        transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
        outline: 'none',
        opacity: isLoser ? 0.45 : 1,
        borderRadius: side === 'left' ? '7px 0 0 0' : '0 7px 0 0',
        boxShadow: isSelected ? `inset 0 0 18px ${team?.primary_color ?? '#c8963c'}28, 0 0 0 2px ${teamOutline}` : 'none',
        transform: isSelected ? 'translateY(-1px)' : 'translateY(0)',
      }}
      onMouseEnter={(e) => {
        if (!locked && !isSelected && !isWinner && !isLoser) {
          e.currentTarget.style.background = teamTint
        }
      }}
      onMouseLeave={(e) => {
        if (!locked && !isSelected && !isWinner && !isLoser) {
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      {showLogo ? (
        <img
          src={getTeamLogoUrl(team!.abbreviation)}
          alt={abbr}
          onError={() => setLogoError(true)}
          style={{
            width: 52,
            height: 52,
            objectFit: 'contain',
            filter: isLoser ? 'grayscale(0.6)' : 'none',
            transition: 'filter 0.2s ease',
          }}
        />
      ) : null}
      <span
        className="font-condensed font-bold"
        style={{
          ...(abbr === 'TBD'
            ? { color: 'var(--nba-text-muted)' }
            : teamAbbrStyle(team?.primary_color)),
          fontSize: showLogo ? '1rem' : 'clamp(1.6rem, 4vw, 2.2rem)',
          lineHeight: 1,
          letterSpacing: '-0.01em',
          marginTop: showLogo ? 4 : 0,
          textShadow: isSelected && !showLogo ? `0 0 12px ${team?.primary_color ?? '#c8963c'}aa` : 'none',
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
            background: teamTint,
            border: `1px solid ${teamOutline}`,
            color: abbr === 'TBD' ? 'var(--nba-gold)' : color,
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
  onSave: (gameId: string, winnerId: string, source?: SavePickSource) => Promise<boolean>
  wasAutoPicked: boolean
  revealedPicks: RevealedGamePick[]
  onOpenRevealedPicks: (game: GameWithTeams) => void
  odds: MatchedGameOdds | null
}

function GameCard({ game, pick, onSave, wasAutoPicked, revealedPicks, onOpenRevealedPicks, odds }: GameCardProps) {
  const [pending, setPending] = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)
  const seriesClosedBeforeGame =
    !!game.series_is_complete &&
    game.series_games_played != null &&
    game.game_number > game.series_games_played

  // Se não há tip_off_at assumimos que o jogo ainda não foi agendado → não bloqueado
  const locked     = seriesClosedBeforeGame || (game.tip_off_at ? new Date(game.tip_off_at).getTime() - PICK_GRACE_MS <= Date.now() : false)
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
      const saved = await onSave(game.id, pending, 'manual')
      if (saved) setPending(null)
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
  const canRevealPicks = isGameRevealed(game)

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

      {odds && !game.played && !seriesClosedBeforeGame && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '8px 12px',
            background: 'rgba(74,144,217,0.08)',
            borderBottom: '1px solid rgba(74,144,217,0.16)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>
            Odds rápidas • {odds.bookmaker}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: odds.favoriteTeamId === tA?.id ? 'var(--nba-gold)' : 'var(--nba-text)', fontSize: '0.74rem', fontWeight: odds.favoriteTeamId === tA?.id ? 700 : 600 }}>
              {tA?.abbreviation ?? game.home_team_id} {odds.homeDecimal}
            </span>
            <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>vs</span>
            <span style={{ color: odds.favoriteTeamId === tB?.id ? 'var(--nba-gold)' : 'var(--nba-text)', fontSize: '0.74rem', fontWeight: odds.favoriteTeamId === tB?.id ? 700 : 600 }}>
              {tB?.abbreviation ?? game.away_team_id} {odds.awayDecimal}
            </span>
          </div>
        </div>
      )}

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

      {canRevealPicks && (
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid rgba(74,144,217,0.18)',
            background: 'rgba(74,144,217,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--nba-text)', fontSize: '0.8rem', fontWeight: 700 }}>
              Palpites revelados
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', marginTop: 3 }}>
              {revealedPicks.length > 0
                ? `${revealedPicks.length} participante${revealedPicks.length !== 1 ? 's' : ''} com palpite visível para este jogo.`
                : 'Nenhum palpite registrado ficou visível para este jogo.'}
            </div>
          </div>
          <button
            onClick={() => onOpenRevealedPicks(game)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid rgba(74,144,217,0.3)',
              background: 'rgba(12,12,18,0.34)',
              color: 'var(--nba-east)',
              borderRadius: 10,
              padding: '8px 10px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.76rem',
            }}
          >
            <Users size={13} />
            Ver palpites
          </button>
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
                <span
                  className="font-condensed font-bold"
                  style={{ color: selectedTeam?.primary_color ?? 'var(--nba-gold)', fontSize: '0.9rem' }}
                >
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
                color: selectedTeam?.primary_color ?? 'var(--nba-gold)',
                fontSize: '0.82rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '4px 9px',
                borderRadius: 999,
                background: selectedTeam?.primary_color ? `${selectedTeam.primary_color}22` : 'rgba(12,12,18,0.34)',
                border: selectedTeam?.primary_color ? `1px solid ${selectedTeam.primary_color}66` : '1px solid rgba(200,150,60,0.22)',
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
  pendingSeries,
  urgentSeries,
  seriesGroups,
  recentlySavedGameId,
}: {
  games: GameWithTeams[]
  picks: GamePick[]
  pendingSeries: number
  urgentSeries: number
  seriesGroups: SeriesGroup[]
  recentlySavedGameId: string | null
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
  const todayKey = new Date().toLocaleDateString('pt-BR', { timeZone: BRT_TIMEZONE })
  const todayOpenGames = openGames.filter((game) => game.tip_off_at && dateKeyBRT(game.tip_off_at) === todayKey)
  const todaySavedCount = todayOpenGames.filter((game) => pickedIds.has(game.id)).length
  const nextUrgentSeries = seriesGroups.find((group) => group.openGames > 0 && isUrgentSeries(group))
  const recentSavedGame = recentlySavedGameId ? games.find((game) => game.id === recentlySavedGameId) : null
  const actionHeadline =
    pendingPicks > 0
      ? `${pendingPicks} jogo${pendingPicks !== 1 ? 's' : ''} ainda dependem do seu palpite.`
      : urgentSeries > 0
      ? `${urgentSeries} série${urgentSeries !== 1 ? 's' : ''} entram em zona crítica hoje.`
      : 'Sua cartela do momento está sob controle.'
  const actionDetail = nextUrgentSeries
    ? `Pressão maior em ${nextUrgentSeries.teamA?.abbreviation ?? nextUrgentSeries.games[0]?.home_team_id} x ${nextUrgentSeries.teamB?.abbreviation ?? nextUrgentSeries.games[0]?.away_team_id}.`
    : nextGame?.tip_off_at
    ? `Próximo lock na agenda: ${formatTimeBRT(nextGame.tip_off_at)}.`
    : 'Sem fechamento imediato no radar.'

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
              Fique de olho nos horários para não perder nenhum fechamento
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

        <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 sm:grid-cols-2">
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(12,12,18,0.34)',
              border: '1px solid rgba(200,150,60,0.16)',
            }}
          >
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>Séries pedindo ação</div>
            <div className="font-condensed font-bold" style={{ color: pendingSeries > 0 ? 'var(--nba-gold)' : 'var(--nba-success)', fontSize: '1.35rem', lineHeight: 1.1 }}>
              {pendingSeries}
            </div>
          </div>
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(12,12,18,0.34)',
              border: '1px solid rgba(200,150,60,0.16)',
            }}
          >
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>Séries urgentes</div>
            <div className="font-condensed font-bold" style={{ color: urgentSeries > 0 ? 'var(--nba-danger)' : 'var(--nba-text)', fontSize: '1.35rem', lineHeight: 1.1 }}>
              {urgentSeries}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 lg:grid-cols-3">
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(12,12,18,0.34)',
              border: '1px solid rgba(200,150,60,0.16)',
            }}
          >
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Radar de ação</div>
            <div className="font-condensed font-bold" style={{ color: pendingPicks > 0 ? 'var(--nba-gold)' : 'var(--nba-success)', fontSize: '1.02rem', lineHeight: 1.05, marginBottom: 6 }}>
              {actionHeadline}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', lineHeight: 1.45 }}>
              {actionDetail}
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(12,12,18,0.34)',
              border: '1px solid rgba(200,150,60,0.16)',
            }}
          >
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Cobertura de hoje</div>
            <div className="font-condensed font-bold" style={{ color: todayOpenGames.length > 0 && todaySavedCount < todayOpenGames.length ? 'var(--nba-gold)' : 'var(--nba-text)', fontSize: '1.35rem', lineHeight: 1 }}>
              {todaySavedCount}/{todayOpenGames.length}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', marginTop: 6, lineHeight: 1.45 }}>
              {todayOpenGames.length > 0
                ? 'Jogos de hoje já cobertos com pick salvo.'
                : 'Nenhum jogo aberto hoje para travar na cartela.'}
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: recentSavedGame ? 'rgba(46,204,113,0.08)' : 'rgba(12,12,18,0.34)',
              border: recentSavedGame ? '1px solid rgba(46,204,113,0.18)' : '1px solid rgba(200,150,60,0.16)',
            }}
          >
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Último movimento</div>
            <div className="font-condensed font-bold" style={{ color: recentSavedGame ? 'var(--nba-success)' : 'var(--nba-text)', fontSize: '1.02rem', lineHeight: 1.05, marginBottom: 6 }}>
              {recentSavedGame
                ? `${recentSavedGame.team_a?.abbreviation ?? recentSavedGame.home_team_id} x ${recentSavedGame.team_b?.abbreviation ?? recentSavedGame.away_team_id}`
                : 'Nenhum pick salvo agora'}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', lineHeight: 1.45 }}>
              {recentSavedGame
                ? 'Seu último palpite já está refletido na rodada e destacado na lista abaixo.'
                : 'Assim que você salvar um novo palpite, ele aparece aqui para confirmar o movimento.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FiltersBar({
  active,
  counts,
  onChange,
}: {
  active: GamesFilter
  counts: Record<GamesFilter, number>
  onChange: (filter: GamesFilter) => void
}) {
  const items: { id: GamesFilter; label: string }[] = [
    { id: 'all', label: 'Todas' },
    { id: 'pending', label: 'Sem palpite' },
    { id: 'urgent', label: 'Urgentes' },
    { id: 'saved', label: 'Com pick' },
    { id: 'completed', label: 'Encerradas' },
  ]

  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
      {items.map((item) => {
        const selected = active === item.id
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 999,
              padding: '8px 12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: `1px solid ${selected ? 'rgba(200,150,60,0.28)' : 'rgba(200,150,60,0.12)'}`,
              background: selected ? 'rgba(200,150,60,0.12)' : 'rgba(12,12,18,0.34)',
              color: selected ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
              fontWeight: 700,
              fontSize: '0.76rem',
            }}
          >
            <span>{item.label}</span>
            <span
              className="font-condensed"
              style={{
                color: selected ? 'var(--nba-text)' : 'var(--nba-text-muted)',
                background: selected ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
                borderRadius: 999,
                padding: '1px 7px',
                fontSize: '0.72rem',
              }}
            >
              {counts[item.id]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function PicksFocusCard({ entries }: { entries: PickFocusEntry[] }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(74,144,217,0.08) 48%, rgba(200,150,60,0.08) 100%)',
        border: '1px solid rgba(200,150,60,0.16)',
        borderRadius: 12,
        padding: '1rem',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="title" style={{ color: 'var(--nba-gold)', fontSize: '1rem', letterSpacing: '0.08em', lineHeight: 1 }}>
            SEUS PALPITES EM FOCO
          </div>
          <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', margin: '6px 0 0' }}>
            Um resumo rápido dos picks que mais importam neste momento.
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem', margin: 0 }}>
          Você ainda não salvou palpites de jogo.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 sm:grid-cols-2">
          {entries.map(({ game, team, statusLabel, statusColor }) => (
            <div
              key={game.id}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(12,12,18,0.34)',
                border: '1px solid rgba(200,150,60,0.12)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <span className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.9rem' }}>
                  {game.team_a?.abbreviation ?? game.home_team_id} vs {game.team_b?.abbreviation ?? game.away_team_id}
                </span>
                <span style={{ color: statusColor, fontSize: '0.68rem', fontWeight: 700 }}>
                  {statusLabel}
                </span>
              </div>
              <div style={{ color: team?.primary_color ?? 'var(--nba-gold)', fontWeight: 700, fontSize: '0.82rem' }}>
                Seu pick: {team?.abbreviation ?? '?'}
              </div>
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 4 }}>
                Jogo {game.game_number}{game.tip_off_at ? ` • ${formatTimeBRT(game.tip_off_at)} BRT` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Series context badge (day view) ─────────────────────────────────────────

function SeriesContextBadge({ game, isFirst }: { game: GameWithTeams; isFirst: boolean }) {
  const round = game.round as 1 | 2 | 3 | 4
  const roundColor = ROUND_COLOR[round]
  const teamA = game.team_a?.abbreviation ?? game.home_team_id
  const teamB = game.team_b?.abbreviation ?? game.away_team_id

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginTop: isFirst ? 0 : 20, marginBottom: 6,
      }}
    >
      <span
        className="font-condensed font-bold"
        style={{
          color: roundColor,
          background: `${roundColor}20`,
          border: `1px solid ${roundColor}44`,
          borderRadius: 999,
          padding: '2px 8px',
          fontSize: '0.68rem',
          letterSpacing: '0.06em',
          flexShrink: 0,
        }}
      >
        {ROUND_LABEL[round]}
      </span>
      <span
        className="font-condensed"
        style={{ color: 'var(--nba-text-muted)', fontSize: '0.78rem', fontWeight: 600 }}
      >
        {teamA} × {teamB} — Jogo {game.game_number}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--nba-border)', minWidth: 16 }} />
    </div>
  )
}

// ─── Calendar strip (day view) ────────────────────────────────────────────────

function CalendarStrip({
  days,
  selected,
  onChange,
}: {
  days: string[]
  selected: string | null
  onChange: (day: string) => void
}) {
  const WINDOW = 5
  const [windowStart, setWindowStart] = useState(() => {
    if (!selected) return 0
    const idx = days.indexOf(selected)
    return idx >= 0 ? Math.max(0, Math.min(idx, Math.max(0, days.length - WINDOW))) : 0
  })

  useEffect(() => {
    if (!selected) return
    const idx = days.indexOf(selected)
    if (idx < 0) return
    if (idx < windowStart) setWindowStart(idx)
    else if (idx >= windowStart + WINDOW) setWindowStart(Math.max(0, idx - WINDOW + 1))
  }, [selected, days, windowStart])

  const todayKey = new Date().toLocaleDateString('pt-BR', { timeZone: BRT_TIMEZONE })
  const windowDays = days.slice(windowStart, windowStart + WINDOW)
  const canLeft = windowStart > 0
  const canRight = windowStart + WINDOW < days.length

  function parseDayKey(key: string) {
    const [dd, mm, yyyy] = key.split('/')
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
    const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' })
      .replace('.', '').toUpperCase().slice(0, 3)
    const month = d.toLocaleDateString('pt-BR', { month: 'short' })
      .replace('.', '').toUpperCase().slice(0, 3)
    return { dd, weekday, month, isToday: key === todayKey }
  }

  if (days.length === 0) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
      <button
        onClick={() => setWindowStart((prev) => Math.max(0, prev - 1))}
        disabled={!canLeft}
        style={{
          width: 32, height: 52, borderRadius: 8, flexShrink: 0,
          border: '1px solid rgba(200,150,60,0.16)',
          background: canLeft ? 'rgba(12,12,18,0.5)' : 'transparent',
          color: canLeft ? 'var(--nba-text)' : 'var(--nba-text-muted)',
          cursor: canLeft ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: canLeft ? 1 : 0.25,
        }}
      >
        <ChevronLeft size={14} />
      </button>

      <div style={{ display: 'flex', gap: 6, flex: 1 }}>
        {windowDays.map((key) => {
          const { dd, weekday, month, isToday } = parseDayKey(key)
          const isSelected = key === selected
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 2, padding: '8px 4px',
                borderRadius: 10,
                border: `1px solid ${isSelected ? 'rgba(200,150,60,0.4)' : 'rgba(200,150,60,0.1)'}`,
                background: isSelected ? 'rgba(200,150,60,0.14)' : 'rgba(12,12,18,0.34)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                className="font-condensed"
                style={{
                  fontSize: '0.62rem', letterSpacing: '0.06em', fontWeight: 700,
                  color: isToday
                    ? (isSelected ? 'var(--nba-gold)' : 'var(--nba-east)')
                    : (isSelected ? 'var(--nba-gold)' : 'var(--nba-text-muted)'),
                }}
              >
                {isToday ? 'HOJE' : weekday}
              </span>
              <span
                className="font-condensed font-bold"
                style={{ fontSize: '1.1rem', lineHeight: 1, color: isSelected ? 'var(--nba-gold)' : 'var(--nba-text)' }}
              >
                {dd.replace(/^0/, '')}
              </span>
              <span style={{ fontSize: '0.58rem', color: isSelected ? 'rgba(200,150,60,0.8)' : 'var(--nba-text-muted)' }}>
                {month}
              </span>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => setWindowStart((prev) => Math.min(days.length - WINDOW, prev + 1))}
        disabled={!canRight}
        style={{
          width: 32, height: 52, borderRadius: 8, flexShrink: 0,
          border: '1px solid rgba(200,150,60,0.16)',
          background: canRight ? 'rgba(12,12,18,0.5)' : 'transparent',
          color: canRight ? 'var(--nba-text)' : 'var(--nba-text-muted)',
          cursor: canRight ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: canRight ? 1 : 0.25,
        }}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

// ─── View mode toggle ─────────────────────────────────────────────────────────

function ViewModeToggle({
  viewMode,
  onChange,
}: {
  viewMode: 'day' | 'series'
  onChange: (mode: 'day' | 'series') => void
}) {
  const items = [
    { id: 'day' as const, label: 'Por dia', Icon: CalendarDays },
    { id: 'series' as const, label: 'Por série', Icon: Layers3 },
  ]

  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
      {items.map(({ id, label, Icon }) => {
        const active = viewMode === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${active ? 'rgba(200,150,60,0.32)' : 'rgba(200,150,60,0.12)'}`,
              background: active ? 'rgba(200,150,60,0.14)' : 'transparent',
              color: active ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
              fontWeight: 700, fontSize: '0.78rem',
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.04em',
              transition: 'all 0.15s ease',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Games({ participantId }: Props) {
  const [games,   setGames]   = useState<GameWithTeams[]>([])
  const [picks,   setPicks]   = useState<GamePick[]>([])
  const [revealedPicksByGameId, setRevealedPicksByGameId] = useState<Record<string, RevealedGamePick[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expandedSeriesIds, setExpandedSeriesIds] = useState<string[]>([])
  const [autoPickGroup, setAutoPickGroup] = useState<AutoPickDayGroup | null>(null)
  const [autoPickMode, setAutoPickMode] = useState<'fill-missing' | 'overwrite'>('fill-missing')
  const [autoPickPreview, setAutoPickPreview] = useState<AutoPickPreviewItem[]>([])
  const [autoPickSaving, setAutoPickSaving] = useState(false)
  const [autoPickGameIds, setAutoPickGameIds] = useState<string[]>([])
  const [revealedGame, setRevealedGame] = useState<GameWithTeams | null>(null)
  const [activeFilter, setActiveFilter] = useState<GamesFilter>('pending')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [recentlySavedGameId, setRecentlySavedGameId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'day' | 'series'>('day')
  const { addToast } = useUIStore()
  const { odds: oddsSummary } = useOddsSummary()

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

  useEffect(() => {
    const sub = supabase
      .channel('games-participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => {
        if (games.length > 0) fetchPicks()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
    }
  }, [games, participantId])

  const seriesGroups = useMemo(() => computeSeriesGroups(games, picks), [games, picks])
  const autoPickDayGroups = useMemo(() => buildAutoPickDayGroups(games, picks), [games, picks])
  const availableDays = useMemo(() => {
    const days = new Set<string>()
    for (const game of games) {
      if (game.tip_off_at) days.add(dateKeyBRT(game.tip_off_at))
    }
    return [...days].sort((a, b) => {
      const [dA, mA, yA] = a.split('/')
      const [dB, mB, yB] = b.split('/')
      return new Date(Number(yA), Number(mA) - 1, Number(dA)).getTime() -
             new Date(Number(yB), Number(mB) - 1, Number(dB)).getTime()
    })
  }, [games])
  const pickFocusEntries = useMemo(() => buildPickFocusEntries(games, picks).slice(0, 4), [games, picks])
  const oddsByGameId = useMemo<Record<string, MatchedGameOdds | null>>(
    () => Object.fromEntries(
      games.map((game) => [game.id, buildGameOddsMatch(game, oddsSummary)])
    ),
    [games, oddsSummary]
  )
  const filterCounts = useMemo<Record<GamesFilter, number>>(() => ({
    all: seriesGroups.length,
    pending: seriesGroups.filter((group) => matchesSeriesFilter(group, 'pending')).length,
    urgent: seriesGroups.filter((group) => matchesSeriesFilter(group, 'urgent')).length,
    saved: seriesGroups.filter((group) => matchesSeriesFilter(group, 'saved')).length,
    completed: seriesGroups.filter((group) => matchesSeriesFilter(group, 'completed')).length,
  }), [seriesGroups])
  const filteredSeriesGroups = useMemo(
    () => seriesGroups.filter((group) => matchesSeriesFilter(group, activeFilter)),
    [seriesGroups, activeFilter]
  )
  const filteredByDay = useMemo(() => {
    if (!selectedDay) return filteredSeriesGroups
    return filteredSeriesGroups.filter((group) =>
      group.games.some((game) => game.tip_off_at && dateKeyBRT(game.tip_off_at) === selectedDay)
    )
  }, [filteredSeriesGroups, selectedDay])

  const selectedDayGames = useMemo(() => {
    if (!selectedDay) return []
    return games
      .filter((game) => game.tip_off_at && dateKeyBRT(game.tip_off_at) === selectedDay)
      .sort((a, b) => new Date(a.tip_off_at!).getTime() - new Date(b.tip_off_at!).getTime())
  }, [games, selectedDay])

  const selectedDayAutoPickGroup = useMemo(
    () => autoPickDayGroups.find((g) => g.key === selectedDay) ?? null,
    [autoPickDayGroups, selectedDay]
  )

  useEffect(() => {
    if (filteredSeriesGroups.length === 0) {
      setExpandedSeriesIds([])
      return
    }

    setExpandedSeriesIds((current) => {
      const validCurrent = current.filter((seriesId) => filteredSeriesGroups.some((group) => group.seriesId === seriesId))
      if (validCurrent.length > 0) return validCurrent

      const firstOpenSeries = filteredSeriesGroups.find((group) => group.openGames > 0)
      return [firstOpenSeries?.seriesId ?? filteredSeriesGroups[0].seriesId]
    })
  }, [filteredSeriesGroups])

  useEffect(() => {
    if (filterCounts[activeFilter] > 0) return
    if (filterCounts.pending > 0) {
      setActiveFilter('pending')
      return
    }
    setActiveFilter('all')
  }, [activeFilter, filterCounts])

  // Seleciona "hoje" por padrão; se hoje não tiver jogo, seleciona o próximo dia com jogo
  useEffect(() => {
    if (availableDays.length === 0) return
    const todayKey = new Date().toLocaleDateString('pt-BR', { timeZone: BRT_TIMEZONE })
    if (availableDays.includes(todayKey)) {
      setSelectedDay(todayKey)
      return
    }
    // Próximo dia futuro com jogo (availableDays já está ordenado ascendente)
    const [dd, mm, yyyy] = todayKey.split('/')
    const todayTime = new Date(Number(yyyy), Number(mm) - 1, Number(dd)).getTime()
    const nextDay = availableDays.find((key) => {
      const [d, m, y] = key.split('/')
      return new Date(Number(y), Number(m) - 1, Number(d)).getTime() >= todayTime
    })
    setSelectedDay(nextDay ?? availableDays[availableDays.length - 1])
  }, [availableDays])

  useEffect(() => {
    if (!recentlySavedGameId) return
    const timeout = window.setTimeout(() => setRecentlySavedGameId(null), 2600)
    return () => window.clearTimeout(timeout)
  }, [recentlySavedGameId])

  async function fetchAll() {
    setLoading(true)
    setLoadError(null)
    const [{ data: gamesData, error: gamesError }, { data: teamsData, error: teamsError }] = await Promise.all([
      supabase.from('games').select('*').order('tip_off_at', { ascending: true }),
      supabase.from('teams').select('*'),
    ])

    if (gamesError || teamsError) {
      setGames([])
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

      const teamMap = Object.fromEntries(
        (teamsData ?? []).map((t) => [t.id, { ...t, ...TEAM_MAP[t.id] }])
      )
      const seriesMetaById = Object.fromEntries((seriesData ?? []).map((series) => [series.id, series]))
      const merged = gamesData.map((g) => ({
        ...normalizeGame(g as Game, seriesMetaById[g.series_id]?.round),
        team_a: teamMap[g.home_team_id] ?? null,
        team_b: teamMap[g.away_team_id] ?? null,
        series_games_played: seriesMetaById[g.series_id]?.games_played ?? null,
        series_is_complete: seriesMetaById[g.series_id]?.is_complete ?? false,
      }))
      setGames(merged as GameWithTeams[])
    } else {
      setGames([])
    }
    setLoading(false)
  }

  async function fetchPicks() {
    if (!participantId || games.length === 0) return
    const gameIds = games.map((g) => g.id)
    const [{ data: myPicks }, { data: allPicks }, { data: participants }] = await Promise.all([
      supabase
        .from('game_picks')
        .select('*')
        .eq('participant_id', participantId)
        .in('game_id', gameIds),
      supabase
        .from('game_picks')
        .select('*')
        .in('game_id', gameIds),
      supabase
        .from('participants')
        .select('id, name'),
    ])

    if (myPicks) setPicks(myPicks as GamePick[])

    if (allPicks && participants) {
      const participantNames = Object.fromEntries((participants as Pick<Participant, 'id' | 'name'>[]).map((participant) => [participant.id, participant.name]))
      const nextRevealedPicksByGameId = (allPicks as GamePick[]).reduce<Record<string, RevealedGamePick[]>>((acc, pick) => {
        const game = games.find((item) => item.id === pick.game_id)
        if (!game || !isGameRevealed(game)) return acc
        const participantName = participantNames[pick.participant_id]
        if (!participantName) return acc

        if (!acc[pick.game_id]) acc[pick.game_id] = []
        acc[pick.game_id].push({
          ...pick,
          participant_name: participantName,
        })
        return acc
      }, {})

      setRevealedPicksByGameId(nextRevealedPicksByGameId)
    }
  }

  async function savePick(gameId: string, winnerId: string, source: SavePickSource = 'manual'): Promise<boolean> {
    if (!participantId) {
      addToast('Erro: participante não identificado', 'error')
      return false
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
          return false
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
          return false
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

      if (source === 'manual') {
        setRecentlySavedGameId(gameId)
        addToast('Palpite salvo!', 'success')
      }
      return true
    } catch (err) {
      console.error('[savePick] exceção inesperada:', err)
      addToast(`Erro inesperado: ${err instanceof Error ? err.message : String(err)}`, 'error')
      return false
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
        const saved = await savePick(item.gameId, item.winnerId, 'auto')
        if (!saved) {
          addToast('Vai na fé interrompido: alguns palpites não foram salvos.', 'error')
          return
        }
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
        <LoadingBasketball size={32} />
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
      <GamesHero
        games={games}
        picks={picks}
        pendingSeries={filterCounts.pending}
        urgentSeries={filterCounts.urgent}
        seriesGroups={seriesGroups}
        recentlySavedGameId={recentlySavedGameId}
      />

      <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />

      {viewMode === 'day' ? (
        <>
          <CalendarStrip days={availableDays} selected={selectedDay} onChange={setSelectedDay} />

          {selectedDay == null || selectedDayGames.length === 0 ? (
            <div
              style={{
                padding: '18px 16px', borderRadius: 12,
                background: 'rgba(12,12,18,0.48)',
                border: '1px solid var(--nba-border)',
                color: 'var(--nba-text-muted)',
              }}
            >
              <div
                className="font-condensed font-bold"
                style={{ color: 'var(--nba-text)', fontSize: '0.95rem', letterSpacing: '0.08em', marginBottom: 6 }}
              >
                {selectedDay ? 'NENHUM JOGO NESTE DIA' : 'SELECIONE UM DIA'}
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.5 }}>
                {selectedDay
                  ? 'Não há jogos agendados para esta data.'
                  : 'Use o calendário acima para escolher um dia.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {selectedDayGames.map((game, idx) => (
                <div key={game.id}>
                  <SeriesContextBadge game={game} isFirst={idx === 0} />
                  <GameCard
                    game={game}
                    pick={picks.find((p) => p.game_id === game.id)}
                    onSave={savePick}
                    wasAutoPicked={autoPickGameIds.includes(game.id)}
                    revealedPicks={revealedPicksByGameId[game.id] ?? []}
                    onOpenRevealedPicks={setRevealedGame}
                    odds={oddsByGameId[game.id] ?? null}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <PicksFocusCard entries={pickFocusEntries} />
          <FiltersBar active={activeFilter} counts={filterCounts} onChange={setActiveFilter} />
          <DayTabsBar days={availableDays} selected={selectedDay} onChange={setSelectedDay} />

          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12,
            }}
          >
            <h2 className="title" style={{ color: 'var(--nba-gold)', fontSize: '1rem', letterSpacing: '0.14em', lineHeight: 1 }}>
              SÉRIES
            </h2>
            <div style={{ height: 1, flex: 1, minWidth: 32, background: 'var(--nba-border)' }} />
            <span
              className="font-condensed"
              style={{
                color: 'var(--nba-text-muted)', fontSize: '0.72rem',
                background: 'var(--nba-surface-2)', border: '1px solid var(--nba-border)',
                borderRadius: 4, padding: '2px 8px',
              }}
            >
              {filteredByDay.length} série{filteredByDay.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredByDay.length === 0 && (
              <div
                style={{
                  padding: '18px 16px', borderRadius: 12,
                  background: 'rgba(12,12,18,0.48)',
                  border: '1px solid var(--nba-border)',
                  color: 'var(--nba-text-muted)',
                }}
              >
                <div
                  className="font-condensed font-bold"
                  style={{ color: 'var(--nba-text)', fontSize: '0.95rem', letterSpacing: '0.08em', marginBottom: 6 }}
                >
                  NENHUMA SÉRIE NESTE FILTRO
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.5 }}>
                  Troque o filtro acima para voltar a navegar por todas as séries ou focar em outro recorte da rodada.
                </p>
              </div>
            )}

            {filteredByDay.map((group) => (
              <SeriesCard
                key={group.key}
                group={group}
                picks={picks}
                expanded={expandedSeriesIds.includes(group.seriesId)}
                isHighlighted={recentlySavedGameId != null && group.games.some((game) => game.id === recentlySavedGameId)}
                onToggle={() => toggleSeries(group.seriesId)}
                onSave={savePick}
                autoPickGameIds={autoPickGameIds}
                revealedPicksByGameId={revealedPicksByGameId}
                oddsByGameId={oddsByGameId}
                onOpenRevealedPicks={setRevealedGame}
              />
            ))}
          </div>
        </>
      )}

      <AutoPickFAB groups={autoPickDayGroups} onOpen={openAutoPick} />

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

      {revealedGame && (
        <RevealedPicksModal
          game={revealedGame}
          picks={revealedPicksByGameId[revealedGame.id] ?? []}
          onClose={() => setRevealedGame(null)}
        />
      )}
    </div>
  )
}

function SeriesCard({
  group,
  picks,
  expanded,
  isHighlighted,
  onToggle,
  onSave,
  autoPickGameIds,
  revealedPicksByGameId,
  oddsByGameId,
  onOpenRevealedPicks,
}: {
  group: SeriesGroup
  picks: GamePick[]
  expanded: boolean
  isHighlighted: boolean
  onToggle: () => void
  onSave: (gameId: string, winnerId: string, source?: SavePickSource) => Promise<boolean>
  autoPickGameIds: string[]
  revealedPicksByGameId: Record<string, RevealedGamePick[]>
  oddsByGameId: Record<string, MatchedGameOdds | null>
  onOpenRevealedPicks: (game: GameWithTeams) => void
}) {
  const completionPct = group.effectiveGamesCount > 0 ? Math.round((group.pickedGames / group.effectiveGamesCount) * 100) : 0
  const roundColor = ROUND_COLOR[group.round]
  const hasOpenGames = group.openGames > 0
  const urgentSeries = isUrgentSeries(group)
  const borderColor = isHighlighted
    ? 'rgba(46,204,113,0.38)'
    : expanded
      ? 'rgba(200,150,60,0.24)'
      : urgentSeries
        ? 'rgba(231,76,60,0.24)'
        : 'var(--nba-border)'
  const boxShadow = isHighlighted
    ? '0 18px 36px rgba(46,204,113,0.12)'
    : urgentSeries
      ? '0 14px 28px rgba(231,76,60,0.08)'
      : 'none'

  return (
    <div
      style={{
        background: 'var(--nba-surface)',
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow,
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
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
              {urgentSeries && hasOpenGames && (
                <span
                  className="font-condensed font-bold"
                  style={{
                    color: 'var(--nba-danger)',
                    fontSize: '0.68rem',
                    letterSpacing: '0.08em',
                    background: 'rgba(231,76,60,0.12)',
                    border: '1px solid rgba(231,76,60,0.26)',
                    borderRadius: 999,
                    padding: '2px 8px',
                  }}
                >
                  PRIORIDADE
                </span>
              )}
              {isHighlighted && (
                <span
                  className="font-condensed font-bold"
                  style={{
                    color: 'var(--nba-success)',
                    fontSize: '0.68rem',
                    letterSpacing: '0.08em',
                    background: 'rgba(46,204,113,0.12)',
                    border: '1px solid rgba(46,204,113,0.26)',
                    borderRadius: 999,
                    padding: '2px 8px',
                  }}
                >
                  ATUALIZADA AGORA
                </span>
              )}
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
                revealedPicks={revealedPicksByGameId[game.id] ?? []}
                odds={oddsByGameId[game.id] ?? null}
                onOpenRevealedPicks={onOpenRevealedPicks}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
