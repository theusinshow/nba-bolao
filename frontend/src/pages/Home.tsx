import { ArrowUp, ArrowDown, Minus, Trophy, Users, Target, Calendar } from 'lucide-react'
import { useRanking } from '../hooks/useRanking'
import { useSeries } from '../hooks/useSeries'
import { getTeam } from '../data/teams2025'

interface Props {
  participantId: string
}

const MEDAL = ['🥇', '🥈', '🥉']

export function Home({ participantId }: Props) {
  const { ranking, loading: rankLoading } = useRanking()
  const { series } = useSeries()

  const top3 = ranking.slice(0, 3)
  const myEntry = ranking.find((r) => r.participant_id === participantId)
  const completedSeries = series.filter((s) => s.is_complete).length
  const totalSeries = series.length

  return (
    <div className="pb-20 px-4 pt-4 max-w-xl mx-auto">
      <h1 className="title text-4xl text-nba-gold mb-1">Bolão NBA 2026</h1>
      <p className="text-nba-muted text-sm mb-6">Playoffs em andamento</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <Users size={18} className="text-nba-gold" />
          <div>
            <div className="text-nba-muted text-xs">Participantes</div>
            <div className="font-condensed text-xl font-bold text-nba-text">{ranking.length}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <Trophy size={18} className="text-nba-gold" />
          <div>
            <div className="text-nba-muted text-xs">Séries Concluídas</div>
            <div className="font-condensed text-xl font-bold text-nba-text">{completedSeries}/{totalSeries}</div>
          </div>
        </div>
        {myEntry && (
          <>
            <div className="card p-4 flex items-center gap-3">
              <Target size={18} className="text-nba-gold" />
              <div>
                <div className="text-nba-muted text-xs">Minha Posição</div>
                <div className="font-condensed text-xl font-bold text-nba-gold">#{myEntry.rank}</div>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <Calendar size={18} className="text-nba-gold" />
              <div>
                <div className="text-nba-muted text-xs">Meus Pontos</div>
                <div className="font-condensed text-xl font-bold text-nba-text">{myEntry.total_points}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Podium */}
      <div className="card p-4 mb-6">
        <h2 className="title text-xl text-nba-text mb-4">Pódio</h2>
        {rankLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-nba-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {top3.map((e, i) => {
              const rankDiff = e.prev_rank != null ? e.prev_rank - e.rank : 0
              return (
                <div
                  key={e.participant_id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    e.participant_id === participantId ? 'bg-nba-surface-2' : ''
                  }`}
                >
                  <span className="text-2xl w-8">{MEDAL[i]}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-nba-text flex items-center gap-1">
                      {e.participant_name}
                      {rankDiff > 0 && <ArrowUp size={12} className="text-nba-success" />}
                      {rankDiff < 0 && <ArrowDown size={12} className="text-nba-danger" />}
                      {rankDiff === 0 && e.prev_rank != null && <Minus size={12} className="text-nba-muted" />}
                    </div>
                    <div className="text-xs text-nba-muted">{e.cravadas} cravada{e.cravadas !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="font-condensed text-xl font-bold text-nba-gold">{e.total_points}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent results */}
      <div className="card p-4">
        <h2 className="title text-xl text-nba-text mb-3">Séries Recentes</h2>
        <div className="flex flex-col gap-2">
          {series
            .filter((s) => s.is_complete)
            .slice(-5)
            .reverse()
            .map((s) => {
              const winner = getTeam(s.winner_id)
              const loser = s.home_team_id === s.winner_id
                ? (s.away_team ?? getTeam(s.away_team_id))
                : (s.home_team ?? getTeam(s.home_team_id))
              const roundLabel = ['R1', 'R2', 'CF', 'Finals'][s.round - 1]
              return (
                <div key={s.id} className="flex items-center justify-between py-1">
                  <span className="text-nba-muted text-xs font-condensed">{s.conference ?? 'Finals'} {roundLabel}</span>
                  <span className="text-nba-text text-sm">
                    <span className="font-bold" style={{ color: winner?.primary_color }}>{winner?.abbreviation}</span>
                    <span className="text-nba-muted mx-1">4-{s.games_played - 4}</span>
                    <span className="text-nba-muted">{loser?.abbreviation}</span>
                  </span>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
