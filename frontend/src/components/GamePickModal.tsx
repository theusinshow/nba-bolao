import { useState } from 'react'
import { X, Lock } from 'lucide-react'
import type { Series } from '../types'
import { getTeam } from '../data/teams2025'
import { useGamePicks } from '../hooks/useGamePicks'
import { useUIStore } from '../store/useUIStore'
import { CountdownTimer } from './CountdownTimer'

interface Props {
  series: Series
  participantId: string
  onClose: () => void
}

export function GamePickModal({ series, participantId, onClose }: Props) {
  const { games, loading, saveGamePick, getPickForGame, isGameLocked } = useGamePicks(participantId, series.id)
  const { addToast } = useUIStore()
  const [saving, setSaving] = useState<string | null>(null)

  const teamA = series.home_team ?? getTeam(series.home_team_id)
  const teamB = series.away_team ?? getTeam(series.away_team_id)

  async function handlePick(gameId: string, winnerId: string) {
    setSaving(gameId)
    const result = await saveGamePick(gameId, winnerId)
    if (result?.error) {
      addToast(result.error, 'error')
    } else {
      addToast('Palpite salvo!', 'success')
    }
    setSaving(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-nba-muted hover:text-nba-text">
          <X size={20} />
        </button>

        <p className="text-nba-muted text-xs font-condensed uppercase mb-1">
          {series.conference} — {['R1', 'R2', 'Conf Finals', 'NBA Finals'][series.round - 1]}
        </p>
        <h2 className="title text-2xl text-nba-gold mb-1">
          {teamA?.abbreviation} vs {teamB?.abbreviation}
        </h2>
        <p className="text-nba-muted text-xs mb-4">Palpite jogo a jogo — bloqueado após tip-off</p>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-nba-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : games.length === 0 ? (
          <p className="text-nba-muted text-center py-8">Nenhum jogo cadastrado ainda.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {games.map((game) => {
              const locked = isGameLocked(game)
              const pick = getPickForGame(game.id)
              const correct = game.played && pick && pick.winner_id === game.winner_id
              const wrong = game.played && pick && pick.winner_id !== game.winner_id

              return (
                <div
                  key={game.id}
                  className={`p-3 rounded-lg border ${
                    correct ? 'border-nba-success/40 bg-nba-success/5' :
                    wrong ? 'border-nba-danger/40 bg-nba-danger/5' :
                    'border-nba-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-nba-muted text-xs font-condensed">Jogo {game.game_number}</span>
                    {locked && !game.played && (
                      <span className="flex items-center gap-1 text-xs text-nba-danger">
                        <Lock size={10} /> Bloqueado
                      </span>
                    )}
                    {!locked && game.tip_off_at && (
                      <CountdownTimer targetDate={game.tip_off_at} label="Tip-off em" />
                    )}
                    {game.played && (
                      <span className="text-xs text-nba-muted font-condensed">
                        {game.score_a} – {game.score_b}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {[
                      { team: teamA, id: game.team_a_id },
                      { team: teamB, id: game.team_b_id },
                    ].map(({ team, id }) => {
                      if (!team) return null
                      const isPicked = pick?.winner_id === id
                      const isWinner = game.winner_id === id

                      return (
                        <button
                          key={id}
                          disabled={locked || saving === game.id}
                          onClick={() => handlePick(game.id, id)}
                          className={`flex-1 py-2 px-3 rounded border text-sm font-condensed transition-all ${
                            isPicked && isWinner ? 'border-nba-success bg-nba-success/10 text-nba-success' :
                            isPicked && game.played && !isWinner ? 'border-nba-danger bg-nba-danger/10 text-nba-danger' :
                            isPicked ? 'border-nba-gold bg-nba-surface-2 text-nba-gold' :
                            isWinner && game.played ? 'border-nba-success/40 text-nba-success' :
                            'border-nba-border text-nba-muted hover:border-nba-gold/40'
                          } ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {team.abbreviation}
                        </button>
                      )
                    })}
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
