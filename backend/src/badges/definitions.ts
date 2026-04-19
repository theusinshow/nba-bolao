export const BADGE_DEFINITIONS = {
  prophet:        { emoji: '🔮', label: 'Profeta',            description: 'Conquistou a primeira cravada' },
  contrarian:     { emoji: '⚡', label: 'Contra a corrente',  description: 'Acertou apostando no time minoritário (≤40% do grupo)' },
  perfect_day:    { emoji: '🎯', label: 'Dia perfeito',       description: 'Acertou todos os jogos do dia (mín. 2 jogos)' },
  on_fire:        { emoji: '🔥', label: 'Em chamas',          description: '3 jogos certos consecutivos' },
  visionary:      { emoji: '👑', label: 'Visionário',         description: 'Acertou o campeão da NBA' },
  legendary:      { emoji: '💎', label: 'Lendário',           description: '3 cravadas na mesma rodada' },
  dominant:       { emoji: '🌊', label: 'Dominante',          description: '5 jogos certos consecutivos' },
  sniper:         { emoji: '🏹', label: 'Sniper',             description: '80%+ de acerto nos jogos (mín. 5 jogados)' },
  brave:          { emoji: '🦁', label: 'Corajoso',           description: 'Acertou apostando na minoria em 3 jogos diferentes' },
  series_master:  { emoji: '🏆', label: 'Mestre das Séries',  description: '5 ou mais séries com vencedor correto' },
  hat_trick:      { emoji: '🎪', label: 'Hat-trick',          description: '3 acertos no mesmo dia' },
  zebra:          { emoji: '🎭', label: 'Zebra',              description: 'Único do grupo a apostar no time vencedor' },
} as const

export type BadgeId = keyof typeof BADGE_DEFINITIONS
export const BADGE_IDS = Object.keys(BADGE_DEFINITIONS) as BadgeId[]

// Ordem de exibição no ranking (mais raros primeiro)
export const BADGE_DISPLAY_ORDER: BadgeId[] = [
  'legendary', 'zebra', 'visionary', 'dominant', 'sniper',
  'series_master', 'on_fire', 'hat_trick', 'perfect_day', 'brave', 'contrarian', 'prophet',
]
