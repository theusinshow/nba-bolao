export const SCORING_CONFIG = {
  pointsPerGame: { 1: 1, 2: 2, 3: 3, 4: 4 },
  pointsPerSeries: { 1: 3, 2: 6, 3: 9, 4: 12 },
  pointsPerCravada: { 1: 6, 2: 12, 3: 20, 4: 25 },
  championBonus: 0,
} as const

// CRÍTICO: Cravada SUBSTITUI série, nunca soma
export function calculateSeriesPickPoints(
  pick: { winnerId: string; gamesCount: number },
  series: { winnerId?: string; gamesPlayed: number; isComplete: boolean; round: number }
): number {
  if (!series.isComplete || !series.winnerId) return 0
  if (pick.winnerId !== series.winnerId) return 0
  const round = series.round as 1 | 2 | 3 | 4
  const cravada = pick.gamesCount === series.gamesPlayed
  return cravada
    ? SCORING_CONFIG.pointsPerCravada[round]
    : SCORING_CONFIG.pointsPerSeries[round]
}

export function calculateGamePickPoints(
  pick: { winnerId: string },
  game: { winnerId?: string; played: boolean; round?: number }
): number {
  if (!game.played || !game.winnerId) return 0
  if (pick.winnerId !== game.winnerId) return 0
  if (!game.round) return 0
  return SCORING_CONFIG.pointsPerGame[game.round as 1 | 2 | 3 | 4]
}

export function isCravada(pick: { gamesCount: number }, series: { gamesPlayed: number; isComplete: boolean; winnerId?: string }, pickWinnerId: string): boolean {
  if (!series.isComplete || !series.winnerId) return false
  if (pickWinnerId !== series.winnerId) return false
  return pick.gamesCount === series.gamesPlayed
}
