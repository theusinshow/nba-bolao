import { useMemo } from 'react'
import { useRanking } from './useRanking'
import { SCORING_CONFIG } from '../utils/scoring'
import { getTeam } from '../data/teams2025'

export interface RoundStat {
  round: 1 | 2 | 3 | 4
  label: string
  total: number
  correct: number
  cravadas: number
  pct: number
}

export interface FavoriteTeam {
  teamId: string
  teamName: string
  abbreviation: string
  primary_color: string
  count: number
}

export interface ExpensiveMiss {
  seriesId: string
  matchup: string
  round: 1 | 2 | 3 | 4
  pickedWinnerLabel: string
  actualWinnerLabel: string | null
  pointsMissed: number
}

const ROUND_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: 'R1',
  2: 'R2',
  3: 'C.Finals',
  4: 'Finals',
}

export function useParticipantProfile(participantId: string) {
  const { ranking, breakdowns, loading } = useRanking()

  const entry = useMemo(
    () => ranking.find((e) => e.participant_id === participantId),
    [ranking, participantId]
  )

  const breakdown = breakdowns[participantId]

  const roundStats = useMemo((): RoundStat[] => {
    if (!breakdown) return []
    const { series_breakdown } = breakdown
    return ([1, 2, 3, 4] as const).map((round) => {
      const items = series_breakdown.filter(
        (s) => s.round === round && s.status !== 'pending'
      )
      const correct = items.filter(
        (s) => s.status === 'winner' || s.status === 'cravada'
      ).length
      const cravadas = items.filter((s) => s.status === 'cravada').length
      const total = items.length
      return {
        round,
        label: ROUND_LABEL[round],
        total,
        correct,
        cravadas,
        pct: total > 0 ? Math.round((correct / total) * 100) : 0,
      }
    })
  }, [breakdown])

  const favoriteTeams = useMemo((): FavoriteTeam[] => {
    if (!breakdown) return []
    const counts = new Map<string, number>()
    breakdown.series_breakdown.forEach((s) => {
      counts.set(s.picked_winner_id, (counts.get(s.picked_winner_id) ?? 0) + 1)
    })
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([teamId, count]) => {
        const team = getTeam(teamId)
        return {
          teamId,
          teamName: team?.name ?? teamId,
          abbreviation: team?.abbreviation ?? teamId,
          primary_color: team?.primary_color ?? '#c8963c',
          count,
        }
      })
  }, [breakdown])

  const expensiveMisses = useMemo((): ExpensiveMiss[] => {
    if (!breakdown) return []
    return breakdown.series_breakdown
      .filter((s) => s.status === 'wrong')
      .map((s) => ({
        seriesId: s.series_id,
        matchup: s.matchup_label,
        round: s.round as 1 | 2 | 3 | 4,
        pickedWinnerLabel: s.picked_winner_label,
        actualWinnerLabel: s.actual_winner_label,
        pointsMissed: SCORING_CONFIG.pointsPerSeries[s.round as 1 | 2 | 3 | 4],
      }))
      .sort((a, b) => b.pointsMissed - a.pointsMissed)
  }, [breakdown])

  return {
    loading,
    entry,
    breakdown,
    roundStats,
    favoriteTeams,
    expensiveMisses,
  }
}
