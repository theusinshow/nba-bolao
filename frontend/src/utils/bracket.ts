import type { Game, NormalizedGame, RoundNumber, Series } from '../types'

const SLOT_ALIASES: Record<string, string> = {
  'W-R1-1': 'W1-1',
  'W-R1-2': 'W1-2',
  'W-R1-3': 'W1-3',
  'W-R1-4': 'W1-4',
  'W-R2-1': 'W2-1',
  'W-R2-2': 'W2-2',
  'W-CF': 'WCF',
  'E-R1-1': 'E1-1',
  'E-R1-2': 'E1-2',
  'E-R1-3': 'E1-3',
  'E-R1-4': 'E1-4',
  'E-R2-1': 'E2-1',
  'E-R2-2': 'E2-2',
  'E-CF': 'ECF',
  FINALS: 'FIN',
}

export function normalizeSeriesSlot(value?: string | null): string | null {
  if (!value) return null
  return SLOT_ALIASES[value] ?? value
}

export function getSeriesSlot(series: Pick<Series, 'id' | 'slot'>): string {
  return normalizeSeriesSlot(series.slot ?? series.id) ?? series.id
}

export function inferRoundFromSeriesId(seriesId?: string | null): RoundNumber | undefined {
  const slot = normalizeSeriesSlot(seriesId)
  if (!slot) return undefined
  if (slot.startsWith('W1') || slot.startsWith('E1')) return 1
  if (slot.startsWith('W2') || slot.startsWith('E2')) return 2
  if (slot === 'WCF' || slot === 'ECF') return 3
  if (slot === 'FIN') return 4
  return undefined
}

export function normalizeGame(game: Game, round?: RoundNumber): NormalizedGame {
  const normalizedRound = (round ?? game.round ?? inferRoundFromSeriesId(game.series_id) ?? 1) as RoundNumber

  return {
    ...game,
    round: normalizedRound,
    team_a_id: game.team_a_id ?? game.home_team_id,
    team_b_id: game.team_b_id ?? game.away_team_id,
    score_a: game.score_a ?? game.home_score,
    score_b: game.score_b ?? game.away_score,
    balldontlie_id: game.balldontlie_id ?? game.nba_game_id,
  }
}

type SeriesTeamSide = 'home' | 'away'

interface SeriesTeamDisplay {
  abbreviation: string
  name: string
  isPlaceholder: boolean
}

const FEEDER_LABELS: Record<string, { home?: string; away?: string }> = {
  'W2-1': { home: 'Vencedor de W1-1', away: 'Vencedor de W1-2' },
  'W2-2': { home: 'Vencedor de W1-3', away: 'Vencedor de W1-4' },
  'E2-1': { home: 'Vencedor de E1-1', away: 'Vencedor de E1-2' },
  'E2-2': { home: 'Vencedor de E1-3', away: 'Vencedor de E1-4' },
  WCF: { home: 'Vencedor de W2-1', away: 'Vencedor de W2-2' },
  ECF: { home: 'Vencedor de E2-1', away: 'Vencedor de E2-2' },
  FIN: { home: 'Vencedor da final do Oeste', away: 'Vencedor da final do Leste' },
}

function getRoundOnePlayInLabel(series: Series, side: SeriesTeamSide): string | null {
  if (series.round !== 1 || side !== 'away') return null

  const seedLabel =
    series.position === 1 ? 'Seed 8 / play-in' :
    series.position === 2 ? 'Seed 7 / play-in' :
    null

  if (!seedLabel) return null

  return series.conference === 'West'
    ? `${seedLabel} do Oeste`
    : `${seedLabel} do Leste`
}

function getFallbackTeamLabel(series: Series, side: SeriesTeamSide): string | null {
  return getRoundOnePlayInLabel(series, side) ?? FEEDER_LABELS[getSeriesSlot(series)]?.[side] ?? null
}

export function isSeriesReadyForPick(series: Series): boolean {
  return !!series.home_team_id && !!series.away_team_id
}

export function getSeriesTeamDisplay(series: Series, side: SeriesTeamSide): SeriesTeamDisplay {
  const team = side === 'home' ? series.home_team : series.away_team

  if (team) {
    return {
      abbreviation: team.abbreviation,
      name: team.name,
      isPlaceholder: false,
    }
  }

  const fallback = getFallbackTeamLabel(series, side)
  if (fallback) {
    return {
      abbreviation: side === 'away' && series.round === 1 ? 'PI' : 'TBD',
      name: fallback,
      isPlaceholder: true,
    }
  }

  return {
    abbreviation: 'TBD',
    name: 'Aguardando definição',
    isPlaceholder: true,
  }
}
