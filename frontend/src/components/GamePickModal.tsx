import { useEffect, useState } from 'react'
import { X, Lock } from 'lucide-react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import type { Series } from '../types'
import { getTeam, getTeamLogoUrl } from '../data/teams2025'
import { useGamePicks } from '../hooks/useGamePicks'
import { useUIStore } from '../store/useUIStore'
import { CountdownTimer } from './CountdownTimer'
import { LoadingBasketball } from './LoadingBasketball'
import { normalizeGame } from '../utils/bracket'
import { supabase } from '../lib/supabase'

interface Props {
  series: Series
  participantId: string
  onClose: () => void
}

export function GamePickModal({ series, participantId, onClose }: Props) {
  const { games, loading, saveGamePick, getPickForGame, isGameLocked } = useGamePicks(participantId, series.id)
  const { addToast } = useUIStore()
  const [saving, setSaving] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  // Estado local da série — atualizado via realtime enquanto o modal estiver aberto
  const [liveSeries, setLiveSeries] = useState<Series>(series)
  const dialogRef = useFocusTrap<HTMLDivElement>(true)
  const titleId = 'game-pick-modal-title'

  function handleClose() { setClosing(true) }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Assina mudanças na série enquanto o modal está aberto para detectar encerramento em tempo real
  useEffect(() => {
    const channel = supabase
      .channel(`game-pick-modal-series-${series.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'series', filter: `id=eq.${series.id}` },
        (payload) => {
          setLiveSeries((prev) => ({ ...prev, ...(payload.new as Partial<Series>) }))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [series.id])

  const teamA = liveSeries.home_team ?? getTeam(liveSeries.home_team_id)
  const teamB = liveSeries.away_team ?? getTeam(liveSeries.away_team_id)

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
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm modal-backdrop${closing ? ' closing' : ''}`}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`card w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto modal-panel${closing ? ' closing' : ''}`}
        onAnimationEnd={() => { if (closing) onClose() }}
      >
        <button onClick={handleClose} aria-label="Fechar" className="absolute top-4 right-4 text-nba-muted hover:text-nba-text">
          <X size={20} />
        </button>

        <p className="text-nba-muted text-xs font-condensed uppercase mb-1">
          {liveSeries.conference} — {['R1', 'R2', 'Conf Finals', 'NBA Finals'][liveSeries.round - 1]}
        </p>
        <div className="flex items-center gap-2 mb-1">
          {teamA && (
            <img
              src={getTeamLogoUrl(teamA.abbreviation)}
              alt={teamA.abbreviation}
              onError={(e) => (e.currentTarget.style.display = 'none')}
              style={{ width: 32, height: 32, objectFit: 'contain' }}
            />
          )}
          <h2 id={titleId} className="title text-2xl text-nba-gold">
            {teamA?.abbreviation} vs {teamB?.abbreviation}
          </h2>
          {teamB && (
            <img
              src={getTeamLogoUrl(teamB.abbreviation)}
              alt={teamB.abbreviation}
              onError={(e) => (e.currentTarget.style.display = 'none')}
              style={{ width: 32, height: 32, objectFit: 'contain' }}
            />
          )}
        </div>
        <p className="text-nba-muted text-xs mb-4">Palpite jogo a jogo — bloqueado após tip-off</p>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingBasketball size={24} />
          </div>
        ) : games.length === 0 ? (
          <p className="text-nba-muted text-center py-8">Nenhum jogo cadastrado ainda.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {games.map((game) => {
              const normalizedGame = normalizeGame(game, liveSeries.round)
              const homeId = normalizedGame.home_team_id
              const awayId = normalizedGame.away_team_id
              const seriesClosedBeforeGame =
                liveSeries.is_complete &&
                normalizedGame.game_number > liveSeries.games_played
              const locked = seriesClosedBeforeGame || isGameLocked(game)
              const pick = getPickForGame(game.id)
              const correct = normalizedGame.played && pick && pick.winner_id === normalizedGame.winner_id
              const wrong = normalizedGame.played && pick && pick.winner_id !== normalizedGame.winner_id

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
                    {seriesClosedBeforeGame && (
                      <span className="text-xs text-nba-east font-condensed">
                        Série já encerrada
                      </span>
                    )}
                    {locked && !game.played && !seriesClosedBeforeGame && (
                      <span className="flex items-center gap-1 text-xs text-nba-danger">
                        <Lock size={10} /> Bloqueado
                      </span>
                    )}
                    {!locked && game.tip_off_at && (
                      <CountdownTimer targetDate={game.tip_off_at} label="Tip-off em" />
                    )}
                    {normalizedGame.played && (
                      <span className="text-xs text-nba-muted font-condensed">
                        {normalizedGame.score_a} – {normalizedGame.score_b}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {[
                      { team: getTeam(homeId) ?? teamA, id: homeId },
                      { team: getTeam(awayId) ?? teamB, id: awayId },
                    ].map(({ team, id }) => {
                      if (!team) return null
                      const isPicked = pick?.winner_id === id
                      const isWinner = normalizedGame.winner_id === id

                      return (
                        <button
                          key={id}
                          disabled={locked || saving === game.id}
                          onClick={() => handlePick(game.id, id)}
                          className={`flex-1 py-3 px-3 rounded border font-condensed transition-all flex flex-col items-center gap-1 ${
                            isPicked && isWinner ? 'border-nba-success bg-nba-success/10 text-nba-success' :
                            isPicked && game.played && !isWinner ? 'border-nba-danger bg-nba-danger/10 text-nba-danger' :
                            isPicked ? 'border-nba-gold bg-nba-surface-2 text-nba-gold' :
                            isWinner && game.played ? 'border-nba-success/40 text-nba-success' :
                            'border-nba-border text-nba-muted hover:border-nba-gold/40'
                          } ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <img
                            src={getTeamLogoUrl(team.abbreviation)}
                            alt={team.abbreviation}
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                            style={{ width: 40, height: 40, objectFit: 'contain' }}
                          />
                          <span className="text-sm">{team.abbreviation}</span>
                        </button>
                      )
                    })}
                  </div>

                  {seriesClosedBeforeGame && (
                    <div className="mt-2 rounded-md border border-nba-east/20 bg-nba-east/10 px-3 py-2 text-xs text-nba-muted">
                      A série terminou em {liveSeries.games_played} jogo{liveSeries.games_played !== 1 ? 's' : ''}. Este jogo não recebe mais palpite.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
