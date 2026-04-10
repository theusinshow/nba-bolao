import { useEffect, useMemo, useState } from 'react'
import { Beaker, Lock, RefreshCw, Sparkles, Trophy, Users } from 'lucide-react'
import { BracketSVG } from '../components/BracketSVG'
import { ParticipantScoreReport } from '../components/ParticipantScoreReport'
import { RankingTable } from '../components/RankingTable'
import { SeriesModal } from '../components/SeriesModal'
import { TEAM_MAP } from '../data/teams2025'
import { supabase } from '../lib/supabase'
import { useUIStore } from '../store/useUIStore'
import type { GamePick, Participant, Series, SeriesPick } from '../types'
import {
  buildSimulationRanking,
  createSimulationState,
  revealSimulationResults,
  type SimulationState,
} from '../utils/simulation'

interface Props {
  participantId: string
  isAdmin: boolean
}

interface SimulationRunRow {
  id: string
  name: string
  state: SimulationState
  status: 'open' | 'revealed'
  is_active: boolean
  created_at: string
  revealed_at: string | null
}

interface SimulationSeriesPickRow extends SeriesPick {
  simulation_id: string
}

interface SimulationGamePickRow extends GamePick {
  simulation_id: string
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: 'var(--nba-surface)',
        border: '1px solid var(--nba-border)',
        borderRadius: 12,
        padding: '1rem',
      }}
    >
      <h2 className="title" style={{ color: 'var(--nba-gold)', fontSize: '1rem', letterSpacing: '0.08em', marginBottom: 14 }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function SimulationHero({
  run,
  isAdmin,
  creating,
  syncing,
  onCreateOrReset,
  onReveal,
}: {
  run: SimulationRunRow | null
  isAdmin: boolean
  creating: boolean
  syncing: boolean
  onCreateOrReset: () => void
  onReveal: () => void
}) {
  const resultsRevealed = run?.status === 'revealed'

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(74,144,217,0.16), rgba(46,204,113,0.10) 55%, rgba(19,19,26,1) 100%)',
        border: '1px solid rgba(74,144,217,0.24)',
        borderRadius: 12,
        padding: '1rem',
        marginBottom: 18,
      }}
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nba-east)' }}>
          <Beaker size={15} />
          <span className="font-condensed" style={{ fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Simulação compartilhada
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 className="title" style={{ color: 'var(--nba-gold)', fontSize: '2rem', lineHeight: 1, margin: 0 }}>
              Rodada Fictícia
            </h1>
            <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.84rem', margin: '8px 0 0' }}>
              {run
                ? `${run.name} • criada em ${new Date(run.created_at).toLocaleString('pt-BR')}`
                : 'Nenhuma simulação ativa ainda'}
            </p>
          </div>

          {isAdmin && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={onCreateOrReset}
                disabled={creating || syncing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(200,150,60,0.18)',
                  background: 'rgba(12,12,18,0.34)',
                  color: 'var(--nba-gold)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  opacity: creating || syncing ? 0.7 : 1,
                }}
              >
                <RefreshCw size={14} className={creating ? 'animate-spin' : ''} />
                {run ? 'Resetar rodada' : 'Criar rodada'}
              </button>

              <button
                onClick={onReveal}
                disabled={!run || resultsRevealed || creating || syncing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(46,204,113,0.2)',
                  background: resultsRevealed ? 'rgba(46,204,113,0.12)' : 'rgba(46,204,113,0.16)',
                  color: resultsRevealed ? 'var(--nba-success)' : '#d8ffe6',
                  cursor: !run || resultsRevealed ? 'default' : 'pointer',
                  fontWeight: 700,
                  opacity: !run || creating || syncing ? 0.7 : 1,
                }}
              >
                <Sparkles size={14} />
                {syncing ? 'Publicando...' : resultsRevealed ? 'Resultados publicados' : 'Publicar resultados'}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 sm:grid-cols-3">
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)' }}>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>Base</div>
            <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1.4rem', lineHeight: 1.1 }}>
              Supabase isolado
            </div>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)' }}>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>Impacto no bolão real</div>
            <div className="font-condensed font-bold" style={{ color: 'var(--nba-success)', fontSize: '1.4rem', lineHeight: 1.1 }}>
              Zero
            </div>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)' }}>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>Status</div>
            <div className="font-condensed font-bold" style={{ color: resultsRevealed ? 'var(--nba-success)' : 'var(--nba-gold)', fontSize: '1.4rem', lineHeight: 1.1 }}>
              {run ? (resultsRevealed ? 'Encerrada' : 'Aberta para palpites') : 'Aguardando criação'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SimulationLab({ participantId, isAdmin }: Props) {
  const [run, setRun] = useState<SimulationRunRow | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [seriesPicks, setSeriesPicks] = useState<SimulationSeriesPickRow[]>([])
  const [gamePicks, setGamePicks] = useState<SimulationGamePickRow[]>([])
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null)
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(participantId)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [setupError, setSetupError] = useState(false)
  const { addToast } = useUIStore()

  useEffect(() => {
    fetchAll()
  }, [])

  const rankingState = useMemo(() => {
    if (!run) return { ranking: [], breakdowns: {} }
    return buildSimulationRanking(run.state, participants, seriesPicks, gamePicks)
  }, [run, participants, seriesPicks, gamePicks])

  const mySeriesPicks = useMemo(
    () =>
      Object.fromEntries(
        seriesPicks
          .filter((pick) => pick.participant_id === participantId)
          .map((pick) => [pick.series_id, pick])
      ),
    [participantId, seriesPicks]
  )

  const myGamePicks = useMemo(
    () =>
      Object.fromEntries(
        gamePicks
          .filter((pick) => pick.participant_id === participantId)
          .map((pick) => [pick.game_id, pick])
      ),
    [participantId, gamePicks]
  )

  const participantProgress = useMemo(() => {
    if (!run) return []
    const totalSeries = run.state.series.filter((item) => item.round === 1).length
    const totalGames = run.state.games.length

    return participants.map((participant) => {
      const participantSeriesPicks = seriesPicks.filter((pick) => pick.participant_id === participant.id).length
      const participantGamePicks = gamePicks.filter((pick) => pick.participant_id === participant.id).length
      const finished = participantSeriesPicks === totalSeries && participantGamePicks === totalGames

      return {
        participant,
        seriesCount: participantSeriesPicks,
        gamesCount: participantGamePicks,
        totalSeries,
        totalGames,
        finished,
      }
    })
  }, [run, participants, seriesPicks, gamePicks])

  async function fetchAll() {
    setLoading(true)
    setSetupError(false)

    const [
      participantsResult,
      runResult,
    ] = await Promise.all([
      supabase.from('participants').select('id, user_id, name, email, is_admin').order('name'),
      supabase
        .from('simulation_runs')
        .select('id, name, state, status, is_active, created_at, revealed_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1),
    ])

    if (participantsResult.error || runResult.error) {
      setSetupError(
        participantsResult.error?.code === '42P01' ||
        runResult.error?.code === '42P01'
      )
      setLoading(false)
      return
    }

    setParticipants((participantsResult.data ?? []) as Participant[])

    const activeRun = (runResult.data?.[0] ?? null) as SimulationRunRow | null
    setRun(activeRun)

    if (!activeRun) {
      setSeriesPicks([])
      setGamePicks([])
      setLoading(false)
      return
    }

    const [seriesPicksResult, gamePicksResult] = await Promise.all([
      supabase
        .from('simulation_series_picks')
        .select('id, simulation_id, participant_id, series_id, winner_id, games_count')
        .eq('simulation_id', activeRun.id),
      supabase
        .from('simulation_game_picks')
        .select('id, simulation_id, participant_id, game_id, winner_id')
        .eq('simulation_id', activeRun.id),
    ])

    if (seriesPicksResult.error || gamePicksResult.error) {
      setSetupError(
        seriesPicksResult.error?.code === '42P01' ||
        gamePicksResult.error?.code === '42P01'
      )
      setLoading(false)
      return
    }

    setSeriesPicks((seriesPicksResult.data ?? []) as SimulationSeriesPickRow[])
    setGamePicks((gamePicksResult.data ?? []) as SimulationGamePickRow[])
    setLoading(false)
  }

  async function handleCreateOrReset() {
    if (!isAdmin) return

    setCreating(true)
    setSetupError(false)
    const state = createSimulationState()

    try {
      let simulationId = run?.id ?? null

      if (simulationId) {
        const { error: updateError } = await supabase
          .from('simulation_runs')
          .update({
            name: state.scenarioName,
            state,
            status: 'open',
            revealed_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', simulationId)

        if (updateError) throw updateError

        const [{ error: deleteSeriesError }, { error: deleteGamesError }] = await Promise.all([
          supabase.from('simulation_series_picks').delete().eq('simulation_id', simulationId),
          supabase.from('simulation_game_picks').delete().eq('simulation_id', simulationId),
        ])

        if (deleteSeriesError) throw deleteSeriesError
        if (deleteGamesError) throw deleteGamesError
      } else {
        const { data, error } = await supabase
          .from('simulation_runs')
          .insert({
            name: state.scenarioName,
            state,
            status: 'open',
            is_active: true,
            created_by_participant_id: participantId,
          })
          .select('id')
          .single()

        if (error) throw error
        simulationId = data.id
      }

      addToast('Rodada fictícia pronta para todo mundo palpitar.', 'success')
      await fetchAll()
      setSelectedSeries(null)
      setSelectedParticipantId(participantId)
    } catch (error) {
      const code = error instanceof Error ? '' : ''
      void code
      setSetupError((error as { code?: string } | null)?.code === '42P01')
      addToast('Não foi possível criar/resetar a simulação.', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function handleReveal() {
    if (!isAdmin || !run) return

    setSyncing(true)
    try {
      const nextState = revealSimulationResults(run.state)
      const { error } = await supabase
        .from('simulation_runs')
        .update({
          state: nextState,
          status: 'revealed',
          revealed_at: nextState.revealedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', run.id)

      if (error) throw error

      addToast('Resultados fictícios publicados para todos.', 'success')
      await fetchAll()
    } catch (error) {
      setSetupError((error as { code?: string } | null)?.code === '42P01')
      addToast('Não foi possível publicar os resultados.', 'error')
    } finally {
      setSyncing(false)
    }
  }

  async function handleSaveSeriesPick(seriesId: string, winnerId: string, gamesCount: number) {
    if (!run || run.status !== 'open') return

    const { error } = await supabase
      .from('simulation_series_picks')
      .upsert(
        {
          simulation_id: run.id,
          participant_id: participantId,
          series_id: seriesId,
          winner_id: winnerId,
          games_count: gamesCount,
        },
        { onConflict: 'simulation_id,participant_id,series_id' }
      )

    if (error) {
      addToast('Erro ao salvar palpite da série.', 'error')
      return
    }

    addToast('Palpite da série salvo na simulação.', 'success')
    await fetchAll()
  }

  async function handleSaveGamePick(gameId: string, winnerId: string) {
    if (!run || run.status !== 'open') return

    const { error } = await supabase
      .from('simulation_game_picks')
      .upsert(
        {
          simulation_id: run.id,
          participant_id: participantId,
          game_id: gameId,
          winner_id: winnerId,
        },
        { onConflict: 'simulation_id,participant_id,game_id' }
      )

    if (error) {
      addToast('Erro ao salvar palpite do jogo.', 'error')
      return
    }

    addToast('Palpite do jogo salvo na simulação.', 'success')
    await fetchAll()
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--nba-gold)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (setupError) {
    return (
      <div className="pb-24 pt-4 px-4 mx-auto" style={{ maxWidth: 860 }}>
        <SectionCard title="Configuração pendente">
          <p style={{ color: 'var(--nba-text)', fontSize: '0.9rem', marginBottom: 10 }}>
            A simulação compartilhada precisa das tabelas novas no Supabase antes de funcionar.
          </p>
          <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', marginBottom: 10 }}>
            Rode o SQL em [supabase/shared-simulation.sql](C:\Dev\pessoal\projetos\nba-bolao\supabase\shared-simulation.sql) no SQL Editor do Supabase e depois recarregue esta página.
          </p>
        </SectionCard>
      </div>
    )
  }

  const selectedBreakdown = rankingState.breakdowns[selectedParticipantId]

  return (
    <div className="pb-24 pt-4 px-4 mx-auto" style={{ maxWidth: 1180 }}>
      <SimulationHero
        run={run}
        isAdmin={isAdmin}
        creating={creating}
        syncing={syncing}
        onCreateOrReset={handleCreateOrReset}
        onReveal={handleReveal}
      />

      {!run ? (
        <SectionCard title="Aguardando rodada">
          <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.84rem' }}>
            {isAdmin
              ? 'Crie a rodada fictícia para liberar os palpites dos seus amigos.'
              : 'O admin ainda não abriu a rodada fictícia.'}
          </p>
        </SectionCard>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <SectionCard title="Progresso dos palpites">
            <div style={{ display: 'grid', gap: 10 }}>
              {participantProgress.map((item) => (
                <div
                  key={item.participant.id}
                  style={{
                    padding: '12px',
                    borderRadius: 10,
                    border: '1px solid rgba(200,150,60,0.12)',
                    background: 'rgba(12,12,18,0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: item.participant.id === participantId ? 'var(--nba-gold)' : 'var(--nba-text)', fontWeight: 700 }}>
                      {item.participant.name}
                    </div>
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginTop: 4 }}>
                      Séries {item.seriesCount}/{item.totalSeries} • Jogos {item.gamesCount}/{item.totalGames}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: item.finished ? 'rgba(46,204,113,0.10)' : 'rgba(200,150,60,0.10)',
                      border: `1px solid ${item.finished ? 'rgba(46,204,113,0.2)' : 'rgba(200,150,60,0.18)'}`,
                      color: item.finished ? 'var(--nba-success)' : 'var(--nba-gold)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                    }}
                  >
                    <Users size={13} />
                    {item.finished ? 'Palpites completos' : 'Ainda preenchendo'}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Bracket compartilhado">
            <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', marginBottom: 12 }}>
              A primeira rodada está aberta para palpites. Todo mundo aponta vencedor e quantidade de jogos; depois o admin publica os resultados fictícios.
            </p>
            <BracketSVG
              series={run.state.series}
              picks={seriesPicks.filter((pick) => pick.participant_id === participantId)}
              onSeriesClick={(series) => setSelectedSeries(series)}
            />
          </SectionCard>

          <SectionCard title="Jogos abertos da rodada">
            <div style={{ display: 'grid', gap: 12 }}>
              {run.state.games.map((game) => {
                const homeTeam = TEAM_MAP[game.home_team_id]
                const awayTeam = TEAM_MAP[game.away_team_id]
                const pick = myGamePicks[game.id] as GamePick | undefined
                const locked = run.status !== 'open'

                return (
                  <div
                    key={game.id}
                    style={{
                      padding: '12px',
                      borderRadius: 10,
                      border: '1px solid rgba(200,150,60,0.12)',
                      background: 'rgba(12,12,18,0.28)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                      <div>
                        <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '1rem', lineHeight: 1 }}>
                          Jogo {game.game_number} • {homeTeam?.abbreviation ?? game.home_team_id} vs {awayTeam?.abbreviation ?? game.away_team_id}
                        </div>
                        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', marginTop: 4 }}>
                          {locked
                            ? `${game.home_score ?? '—'} x ${game.away_score ?? '—'}`
                            : new Date(game.tip_off_at ?? '').toLocaleString('pt-BR')}
                        </div>
                      </div>

                      {locked && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--nba-danger)', fontSize: '0.72rem' }}>
                          <Lock size={13} />
                          Fechado após publicação
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gap: 8 }} className="grid-cols-1 sm:grid-cols-2">
                      {[
                        { id: game.home_team_id, label: homeTeam?.abbreviation ?? game.home_team_id },
                        { id: game.away_team_id, label: awayTeam?.abbreviation ?? game.away_team_id },
                      ].map((option) => (
                        <button
                          key={option.id}
                          onClick={() => handleSaveGamePick(game.id, option.id)}
                          disabled={locked}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 10,
                            textAlign: 'left',
                            border: `1px solid ${
                              game.winner_id === option.id
                                ? 'rgba(46,204,113,0.38)'
                                : pick?.winner_id === option.id
                                ? 'rgba(200,150,60,0.34)'
                                : 'rgba(200,150,60,0.12)'
                            }`,
                            background:
                              game.winner_id === option.id
                                ? 'rgba(46,204,113,0.12)'
                                : pick?.winner_id === option.id
                                ? 'rgba(200,150,60,0.10)'
                                : 'rgba(12,12,18,0.34)',
                            color:
                              game.winner_id === option.id
                                ? 'var(--nba-success)'
                                : pick?.winner_id === option.id
                                ? 'var(--nba-gold)'
                                : 'var(--nba-text)',
                            cursor: locked ? 'default' : 'pointer',
                          }}
                        >
                          <div className="font-condensed font-bold" style={{ fontSize: '1rem', lineHeight: 1 }}>
                            {option.label}
                          </div>
                          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 4 }}>
                            {game.winner_id === option.id
                              ? 'Vencedor revelado'
                              : pick?.winner_id === option.id
                              ? 'Seu palpite'
                              : 'Clique para palpitar'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard title="Ranking da simulação">
            {run.status !== 'revealed' ? (
              <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.84rem' }}>
                O ranking aparece aqui assim que o admin publicar os resultados fictícios.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                <div
                  style={{
                    background: 'rgba(12,12,18,0.22)',
                    border: '1px solid rgba(200,150,60,0.12)',
                    borderRadius: 12,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--nba-border)' }}>
                    <div className="title" style={{ color: 'var(--nba-gold)', fontSize: '0.98rem', letterSpacing: '0.08em' }}>
                      Classificação fictícia
                    </div>
                  </div>
                  <RankingTable
                    ranking={rankingState.ranking}
                    highlightId={participantId}
                    selectedId={selectedParticipantId}
                    onParticipantClick={setSelectedParticipantId}
                  />
                </div>

                <ParticipantScoreReport breakdown={selectedBreakdown} />
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {selectedSeries && run && (
        <SeriesModal
          series={selectedSeries}
          existingPick={mySeriesPicks[selectedSeries.id]}
          onSave={handleSaveSeriesPick}
          onClose={() => setSelectedSeries(null)}
          readOnly={run.status !== 'open' || selectedSeries.round !== 1}
        />
      )}
    </div>
  )
}
