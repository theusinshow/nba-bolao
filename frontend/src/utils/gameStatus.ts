import type { Game, GameState } from '../types'

function inferStateFromGame(game: Pick<Game, 'played' | 'game_state' | 'tip_off_at' | 'status_text' | 'current_period' | 'home_score' | 'away_score'>): GameState {
  if (game.played || game.game_state === 'final') return 'final'
  if (game.game_state === 'live' || game.game_state === 'halftime') return game.game_state

  const rawStatus = game.status_text?.trim().toLowerCase() ?? ''
  if (rawStatus.includes('half')) return 'halftime'
  if (rawStatus.startsWith('q') || rawStatus.includes('ot') || (game.current_period ?? 0) > 0) return 'live'

  if (
    game.tip_off_at &&
    new Date(game.tip_off_at).getTime() <= Date.now() &&
    (game.home_score != null || game.away_score != null)
  ) {
    return 'live'
  }

  return 'scheduled'
}

export function getPeriodLabel(period?: number | null): string | null {
  if (!period || period <= 0) return null
  if (period <= 4) return `Q${period}`
  const overtimeNumber = period - 4
  return overtimeNumber === 1 ? 'OT' : `${overtimeNumber}OT`
}

export function getGameStatusMeta(game: Pick<Game, 'played' | 'game_state' | 'tip_off_at' | 'status_text' | 'current_period' | 'clock' | 'home_score' | 'away_score'>) {
  const state = inferStateFromGame(game)
  const periodLabel = getPeriodLabel(game.current_period)
  const cleanClock = game.clock?.trim() || null

  if (state === 'final') {
    return {
      state,
      isLive: false,
      showScore: game.home_score != null && game.away_score != null,
      badgeLabel: 'Finalizado',
      centerLabel: 'FINAL',
      detail: null as string | null,
    }
  }

  if (state === 'halftime') {
    return {
      state,
      isLive: true,
      showScore: game.home_score != null && game.away_score != null,
      badgeLabel: 'Intervalo',
      centerLabel: 'HT',
      detail: periodLabel,
    }
  }

  if (state === 'live') {
    return {
      state,
      isLive: true,
      showScore: game.home_score != null && game.away_score != null,
      badgeLabel: 'Ao vivo',
      centerLabel: 'LIVE',
      detail: periodLabel && cleanClock && cleanClock !== '0:00'
        ? `${periodLabel} • ${cleanClock}`
        : periodLabel && (cleanClock === '0:00' || /end of|between qtr|intermission/i.test(game.status_text ?? ''))
        ? `Fim do ${periodLabel}`
        : periodLabel
        ? `${periodLabel} em andamento`
        : 'Início',
    }
  }

  return {
    state,
    isLive: false,
    showScore: false,
    badgeLabel: 'Agendado',
    centerLabel: game.status_text?.trim() || 'VS',
    detail: null as string | null,
  }
}

export function isGameLive(game: Pick<Game, 'played' | 'game_state' | 'tip_off_at' | 'status_text' | 'current_period' | 'home_score' | 'away_score'>): boolean {
  return getGameStatusMeta(game).isLive
}
