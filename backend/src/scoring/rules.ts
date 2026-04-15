// Source of truth for scoring rules. The backend exposes this via GET /scoring-rules
// so frontend and tooling can validate they are in sync.
// Any change here MUST also be made in frontend/src/utils/scoring.ts (SCORING_CONFIG).
export const SCORING = {
  pointsPerGame: { 1: 1, 2: 2, 3: 3, 4: 4 } as Record<number, number>,
  pointsPerSeries: { 1: 3, 2: 6, 3: 9, 4: 12 } as Record<number, number>,
  pointsPerCravada: { 1: 6, 2: 12, 3: 20, 4: 25 } as Record<number, number>,
}

export interface SeriesOutcome {
  winnerId: string | null
  gamesPlayed: number
  isComplete: boolean
  round: number
}

export interface SeriesPickInput {
  winnerId: string
  gamesCount: number
}

export interface GameOutcome {
  winnerId: string | null
  played: boolean
  round?: number
}

export interface GamePickInput {
  winnerId: string
}

export function calculateSeriesPickPoints(pick: SeriesPickInput, series: SeriesOutcome): number {
  if (!series.isComplete || !series.winnerId) return 0
  if (pick.winnerId !== series.winnerId) return 0

  const round = series.round
  const isCravada = pick.gamesCount === series.gamesPlayed

  return isCravada ? SCORING.pointsPerCravada[round] : SCORING.pointsPerSeries[round]
}

export function calculateGamePickPoints(pick: GamePickInput, game: GameOutcome): number {
  if (!game.played || !game.winnerId) return 0
  if (pick.winnerId !== game.winnerId) return 0
  if (!game.round) return 0

  return SCORING.pointsPerGame[game.round]
}

export interface RankingSortable {
  participantName: string
  totalPoints: number
  cravadas?: number
  seriesCorrect?: number
  gamesCorrect?: number
}

export function compareRankingEntries(a: RankingSortable, b: RankingSortable): number {
  if (b.totalPoints !== a.totalPoints) {
    return b.totalPoints - a.totalPoints
  }

  if ((b.cravadas ?? 0) !== (a.cravadas ?? 0)) {
    return (b.cravadas ?? 0) - (a.cravadas ?? 0)
  }

  if ((b.seriesCorrect ?? 0) !== (a.seriesCorrect ?? 0)) {
    return (b.seriesCorrect ?? 0) - (a.seriesCorrect ?? 0)
  }

  if ((b.gamesCorrect ?? 0) !== (a.gamesCorrect ?? 0)) {
    return (b.gamesCorrect ?? 0) - (a.gamesCorrect ?? 0)
  }

  return a.participantName.localeCompare(b.participantName, 'pt-BR', { sensitivity: 'base' })
}
