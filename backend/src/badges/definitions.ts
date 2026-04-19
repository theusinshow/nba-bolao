export const BADGE_DEFINITIONS = {
  prophet:      { emoji: '🔮', label: 'Profeta',           description: 'Conquistou a primeira cravada' },
  contrarian:   { emoji: '⚡', label: 'Contra a corrente', description: 'Acertou apostando no time minoritário (≤40% do grupo)' },
  perfect_day:  { emoji: '🎯', label: 'Dia perfeito',      description: 'Acertou todos os jogos do dia (mín. 2 jogos)' },
  on_fire:      { emoji: '🔥', label: 'Em chamas',         description: '3 jogos certos consecutivos' },
  visionary:    { emoji: '👑', label: 'Visionário',        description: 'Acertou o campeão da NBA' },
  legendary:    { emoji: '💎', label: 'Lendário',          description: '3 cravadas na mesma rodada' },
} as const

export type BadgeId = keyof typeof BADGE_DEFINITIONS
export const BADGE_IDS = Object.keys(BADGE_DEFINITIONS) as BadgeId[]

// Ordem de exibição no ranking (mais raros primeiro)
export const BADGE_DISPLAY_ORDER: BadgeId[] = ['legendary', 'visionary', 'on_fire', 'perfect_day', 'contrarian', 'prophet']
