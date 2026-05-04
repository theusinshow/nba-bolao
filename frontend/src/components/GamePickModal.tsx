import { useEffect, useState } from 'react'
import { X, Lock } from 'lucide-react'
import { HomeCourtBadge } from './HomeCourtBadge'
import { useFocusTrap } from '../hooks/useFocusTrap'
import type { Series } from '../types'
import { getTeam, getTeamLogoUrl } from '../data/teams2025'
import { useGamePicks } from '../hooks/useGamePicks'
import { useUIStore } from '../store/useUIStore'
import { CountdownTimer } from './CountdownTimer'
import { LoadingBasketball } from './LoadingBasketball'
import { normalizeGame } from '../utils/bracket'
import { supabase } from '../lib/supabase'
import { SCORING_CONFIG } from '../utils/scoring'

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
  const [allSeriesPicks, setAllSeriesPicks] = useState<Array<{ winner_id: string; games_count: number; participant_id: string; participant_name: string }>>([])

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

  useEffect(() => {
    supabase
      .from('series_picks')
      .select('winner_id, games_count, participant_id, participants(name)')
      .eq('series_id', series.id)
      .then(({ data }) => {
        setAllSeriesPicks(
          (data ?? []).map((d) => ({
            winner_id: d.winner_id as string,
            games_count: d.games_count as number,
            participant_id: d.participant_id as string,
            participant_name: (Array.isArray(d.participants) ? d.participants[0]?.name : (d.participants as { name?: string } | null)?.name) ?? '?',
          }))
        )
      })
  }, [series.id])

  const teamA = liveSeries.home_team ?? getTeam(liveSeries.home_team_id)
  const teamB = liveSeries.away_team ?? getTeam(liveSeries.away_team_id)

  const homeWins = games.filter(g => g.played && g.winner_id === liveSeries.home_team_id).length
  const awayWins = games.filter(g => g.played && g.winner_id === liveSeries.away_team_id).length
  const isClimax = !liveSeries.is_complete && (homeWins >= 3 || awayWins >= 3)

  function getOutcome(winningTeamId: string | null | undefined) {
    if (!winningTeamId) return null
    const isHome = winningTeamId === liveSeries.home_team_id
    const myWins = isHome ? homeWins : awayWins
    const oppWins = isHome ? awayWins : homeWins
    if (myWins + 1 < 4) return { closes: false as const, score: `${myWins + 1}–${oppWins}` }
    const totalGames = 4 + oppWins
    const round = liveSeries.round as 1 | 2 | 3 | 4
    const label = (p: typeof allSeriesPicks[0]) =>
      p.participant_id === participantId ? `${p.participant_name} (você)` : p.participant_name
    const cravadas = allSeriesPicks.filter(p => p.winner_id === winningTeamId && p.games_count === totalGames).map(label)
    const acertos  = allSeriesPicks.filter(p => p.winner_id === winningTeamId && p.games_count !== totalGames).map(label)
    const erros    = allSeriesPicks.filter(p => p.winner_id !== winningTeamId).map(label)
    return {
      closes: true as const,
      score: `4–${oppWins}`,
      cravadas,
      acertos,
      erros,
      cravadaPts: SCORING_CONFIG.pointsPerCravada[round],
      acertoPts: SCORING_CONFIG.pointsPerSeries[round],
    }
  }

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
                      { team: getTeam(homeId) ?? teamA, id: homeId, isHome: true },
                      { team: getTeam(awayId) ?? teamB, id: awayId, isHome: false },
                    ].map(({ team, id, isHome }) => {
                      if (!team) return null
                      const isPicked = pick?.winner_id === id
                      const isWinner = normalizedGame.winner_id === id

                      return (
                        <button
                          key={id}
                          disabled={locked || saving === game.id}
                          onClick={() => handlePick(game.id, id)}
                          className={`relative flex-1 py-3 px-3 rounded border font-condensed transition-all flex flex-col items-center gap-1 ${
                            isPicked && isWinner ? 'border-nba-success bg-nba-success/10 text-nba-success' :
                            isPicked && game.played && !isWinner ? 'border-nba-danger bg-nba-danger/10 text-nba-danger' :
                            isPicked ? 'border-nba-gold bg-nba-surface-2 text-nba-gold' :
                            isWinner && game.played ? 'border-nba-success/40 text-nba-success' :
                            'border-nba-border text-nba-muted hover:border-nba-gold/40'
                          } ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {isHome && (
                            <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 2 }}>
                              <HomeCourtBadge size={14} />
                            </div>
                          )}
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

                  {isClimax && !normalizedGame.played && !seriesClosedBeforeGame && (
                    <div className="mt-2 rounded border border-nba-gold/15 bg-nba-surface-2 px-3 py-2 flex flex-col gap-2">
                      {[
                        { teamId: homeId, team: getTeam(homeId) ?? teamA },
                        { teamId: awayId, team: getTeam(awayId) ?? teamB },
                      ].map(({ teamId, team }) => {
                        const o = getOutcome(teamId)
                        if (!o) return null
                        return (
                          <div key={teamId} className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-condensed">
                              {team && (
                                <img src={getTeamLogoUrl(team.abbreviation)} alt="" onError={e => (e.currentTarget.style.display = 'none')} style={{ width: 14, height: 14, objectFit: 'contain' }} />
                              )}
                              <span className="text-nba-muted">
                                Se <strong className="text-nba-text">{team?.abbreviation ?? '?'}</strong> vencer —
                              </span>
                              {!o.closes
                                ? <span className="text-nba-muted">Série ficaria {o.score}</span>
                                : <span className="text-nba-success font-medium">Encerra {o.score}</span>
                              }
                            </div>
                            {o.closes && (
                              <div className="pl-5 flex flex-col gap-0.5 text-[11px]">
                                {o.cravadas.length > 0 && <span className="text-nba-gold">🏆 Crava (+{o.cravadaPts} pts): {o.cravadas.join(', ')}</span>}
                                {o.acertos.length > 0  && <span className="text-nba-success/80">✓ Acerta (+{o.acertoPts} pts): {o.acertos.join(', ')}</span>}
                                {o.erros.length > 0    && <span className="text-nba-muted">✗ Erra: {o.erros.join(', ')}</span>}
                                {o.cravadas.length === 0 && o.acertos.length === 0 && o.erros.length === 0 && (
                                  <span className="text-nba-muted italic">nenhum palpite neste vencedor</span>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

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
