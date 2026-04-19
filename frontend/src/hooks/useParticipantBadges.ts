import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface BadgeDefinition {
  emoji: string
  label: string
  description: string
}

export interface ParticipantBadge {
  participant_id: string
  badge_id: string
  earned_at: string
}

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
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
}

// Raridade decrescente — mais raros primeiro no ranking
const DISPLAY_ORDER = [
  'legendary', 'zebra', 'visionary', 'dominant', 'sniper',
  'series_master', 'on_fire', 'hat_trick', 'perfect_day', 'brave', 'contrarian', 'prophet',
]

export function sortBadges(badgeIds: string[]): string[] {
  return [...badgeIds].sort((a, b) => DISPLAY_ORDER.indexOf(a) - DISPLAY_ORDER.indexOf(b))
}

export function useParticipantBadges(): {
  badgesByParticipant: Map<string, string[]>
  loading: boolean
} {
  const [badgesByParticipant, setBadgesByParticipant] = useState<Map<string, string[]>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('participant_badges')
          .select('participant_id, badge_id')

        const map = new Map<string, string[]>()
        for (const row of (data ?? []) as ParticipantBadge[]) {
          const existing = map.get(row.participant_id) ?? []
          existing.push(row.badge_id)
          map.set(row.participant_id, existing)
        }
        setBadgesByParticipant(map)
      } finally {
        setLoading(false)
      }
    }

    load()

    const channel = supabase
      .channel('badges-refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participant_badges' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { badgesByParticipant, loading }
}
