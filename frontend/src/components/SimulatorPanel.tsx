import { useState, useMemo } from 'react'
import { X, RotateCcw, Zap, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import type { RankingEntry, Series, SeriesPick } from '../types'
import { calculateSeriesPickPoints } from '../utils/scoring'
import { getTeam, getTeamLogoUrl } from '../data/teams2025'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SimulatedResult {
  seriesId: string
  winnerId: string
  gamesCount: number
}

interface SimRankEntry extends RankingEntry {
  simulated_points: number
  simulated_rank: number
  rank_diff: number
}

interface Props {
  ranking: RankingEntry[]
  rawSeries: Series[]
  rawSeriesPicks: SeriesPick[]
  onClose: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GAMES_OPTIONS = [4, 5, 6, 7] as const
const GAMES_HINT: Partial<Record<number, string>> = { 4: 'Sweep', 7: 'Máx' }

const ROUND_LABEL: Record<number, string> = {
  1: 'R1', 2: 'R2', 3: 'Conf Finals', 4: 'Finals',
}

const ROUND_COLOR: Record<number, string> = {
  1: '#4a90d9', 2: '#9b59b6', 3: '#e05c3a', 4: '#c8963c',
}

const RANK_COLOR: Record<number, string> = {
  1: '#c8963c', 2: '#b8b8b8', 3: '#cd7f32',
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function SimulatorPanel({ ranking, rawSeries, rawSeriesPicks, onClose }: Props) {
  const [simResults, setSimResults] = useState<SimulatedResult[]>([])

  // Séries abertas com ambos os times definidos, enriquecidas com dados estáticos
  const openSeries = useMemo(() =>
    rawSeries
      .filter((s) => !s.is_complete && s.home_team_id != null && s.away_team_id != null)
      .map((s) => ({
        ...s,
        home_team: s.home_team ?? getTeam(s.home_team_id) ?? null,
        away_team: s.away_team ?? getTeam(s.away_team_id) ?? null,
      }))
      .sort((a, b) => a.round - b.round || (a.position ?? 0) - (b.position ?? 0)),
    [rawSeries]
  )

  // Ranking simulado — recalcula instantaneamente a cada mudança
  const simRanking = useMemo((): SimRankEntry[] => {
    const completedSims = simResults.filter((r) => r.winnerId !== '' && r.gamesCount > 0)

    const withBonus = ranking.map((entry) => {
      let bonus = 0
      completedSims.forEach((sim) => {
        const series = openSeries.find((s) => s.id === sim.seriesId)
        if (!series) return
        const pick = rawSeriesPicks.find(
          (p) => p.participant_id === entry.participant_id && p.series_id === sim.seriesId
        )
        if (!pick) return
        bonus += calculateSeriesPickPoints(
          { winnerId: pick.winner_id, gamesCount: pick.games_count },
          { winnerId: sim.winnerId, gamesPlayed: sim.gamesCount, isComplete: true, round: series.round }
        )
      })
      return { ...entry, simulated_points: entry.total_points + bonus }
    })

    const sorted = [...withBonus].sort((a, b) => b.simulated_points - a.simulated_points)
    return sorted.map((entry, idx) => ({
      ...entry,
      simulated_rank: idx + 1,
      rank_diff: entry.rank - (idx + 1),
    }))
  }, [ranking, simResults, openSeries, rawSeriesPicks])

  // Helpers de estado
  function getSimForSeries(seriesId: string): SimulatedResult | undefined {
    return simResults.find((r) => r.seriesId === seriesId)
  }

  function setSim(seriesId: string, field: 'winnerId' | 'gamesCount', value: string | number) {
    setSimResults((prev) => {
      const existing = prev.find((r) => r.seriesId === seriesId)
      if (existing) {
        return prev.map((r) => r.seriesId === seriesId ? { ...r, [field]: value } : r)
      }
      return [
        ...prev,
        {
          seriesId,
          winnerId: field === 'winnerId' ? (value as string) : '',
          gamesCount: field === 'gamesCount' ? (value as number) : 0,
        },
      ]
    })
  }

  const hasActive = simResults.some((r) => r.winnerId !== '' || r.gamesCount > 0)
  const hasComplete = simResults.some((r) => r.winnerId !== '' && r.gamesCount > 0)

  return (
    <div
      style={{
        background: 'var(--nba-surface)',
        border: '1px solid rgba(200,150,60,0.25)',
        borderRadius: 12,
        padding: '1.25rem',
        marginTop: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} style={{ color: 'var(--nba-gold)' }} />
          <h2
            className="title"
            style={{ fontSize: '1.1rem', color: 'var(--nba-gold)', margin: 0, letterSpacing: '0.08em' }}
          >
            SIMULADOR "E SE..."
          </h2>
          <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
            — sem salvar nada
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {hasActive && (
            <button
              onClick={() => setSimResults([])}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--nba-border)',
                background: 'transparent',
                color: 'var(--nba-text-muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={12} />
              Limpar
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '1px solid var(--nba-border)',
              background: 'transparent',
              color: 'var(--nba-text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {openSeries.length === 0 ? (
        <p style={{ color: 'var(--nba-text-muted)', textAlign: 'center', padding: '2rem 0' }}>
          Nenhuma série aberta para simular.
        </p>
      ) : (
        <>
          {/* ── Seletores de série ─────────────────────────────────────────── */}
          <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem', marginBottom: 10 }}>
            Escolha vencedor e jogos para cada série aberta:
          </p>

          <div
            style={{ display: 'grid', gap: 10, marginBottom: 20 }}
            className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          >
            {openSeries.map((series) => {
              const sim = getSimForSeries(series.id)
              const tA = series.home_team
              const tB = series.away_team
              const roundColor = ROUND_COLOR[series.round] ?? 'var(--nba-gold)'

              return (
                <div
                  key={series.id}
                  style={{
                    background: 'var(--nba-surface-2)',
                    border: sim?.winnerId
                      ? `1px solid ${TEAM_MAP_COLOR(sim.winnerId)}40`
                      : '1px solid var(--nba-border)',
                    borderRadius: 10,
                    padding: '12px 10px',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {/* Round label */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      marginBottom: 10,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: `${roundColor}12`,
                      border: `1px solid ${roundColor}30`,
                      color: roundColor,
                      fontSize: '0.68rem',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {ROUND_LABEL[series.round]}
                    {series.conference && !['Finals', null].includes(series.conference) && (
                      <span style={{ opacity: 0.7 }}>· {series.conference}</span>
                    )}
                  </div>

                  {/* Team picker */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {[tA, tB].map((team) => {
                      if (!team) return null
                      const isSelected = sim?.winnerId === team.id
                      return (
                        <button
                          key={team.id}
                          onClick={() => setSim(series.id, 'winnerId', team.id)}
                          style={{
                            flex: 1,
                            padding: '8px 6px',
                            borderRadius: 8,
                            border: isSelected
                              ? `2px solid ${team.primary_color}`
                              : '1px solid var(--nba-border)',
                            background: isSelected
                              ? `${team.primary_color}18`
                              : 'rgba(12,12,18,0.4)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                            cursor: 'pointer',
                            transition: 'border-color 0.15s, background 0.15s',
                          }}
                        >
                          <img
                            src={getTeamLogoUrl(team.abbreviation)}
                            alt={team.abbreviation}
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                            style={{ width: 32, height: 32, objectFit: 'contain' }}
                          />
                          <span
                            className="font-condensed font-bold"
                            style={{ color: team.primary_color, fontSize: '0.82rem' }}
                          >
                            {team.abbreviation}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Games picker */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {GAMES_OPTIONS.map((n) => {
                      const isSelected = sim?.gamesCount === n
                      return (
                        <button
                          key={n}
                          onClick={() => setSim(series.id, 'gamesCount', n)}
                          style={{
                            flex: 1,
                            padding: '5px 0',
                            borderRadius: 6,
                            border: isSelected
                              ? '2px solid var(--nba-gold)'
                              : '1px solid var(--nba-border)',
                            background: isSelected
                              ? 'rgba(200,150,60,0.14)'
                              : 'transparent',
                            color: isSelected ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
                            fontSize: '0.82rem',
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          {n}
                          {GAMES_HINT[n] && (
                            <span style={{ fontSize: '0.55rem', opacity: 0.7 }}>
                              {GAMES_HINT[n]}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Ranking simulado ───────────────────────────────────────────── */}
          <div
            style={{
              borderTop: '1px solid var(--nba-border)',
              paddingTop: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <h3
                className="title"
                style={{ fontSize: '0.95rem', color: 'var(--nba-text-muted)', margin: 0, letterSpacing: '0.08em' }}
              >
                RANKING SIMULADO
              </h3>
              {!hasComplete && (
                <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>
                  — complete uma série acima para ver mudanças
                </span>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--nba-border)',
                      color: 'var(--nba-text-muted)',
                      fontSize: '0.68rem',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Pos</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600 }}>Participante</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>Pts Sim.</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>Pts Reais</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>Δ Pos</th>
                  </tr>
                </thead>
                <tbody>
                  {simRanking.map((entry, idx) => {
                    const rankColor = RANK_COLOR[entry.simulated_rank] ?? 'var(--nba-text-muted)'
                    const bonus = entry.simulated_points - entry.total_points
                    const moved = entry.rank_diff !== 0

                    return (
                      <tr
                        key={entry.participant_id}
                        style={{
                          borderBottom: idx < simRanking.length - 1 ? '1px solid var(--nba-border)' : 'none',
                          background: moved
                            ? entry.rank_diff > 0
                              ? 'rgba(46,204,113,0.04)'
                              : 'rgba(231,76,60,0.04)'
                            : 'transparent',
                        }}
                      >
                        {/* Posição simulada */}
                        <td style={{ padding: '9px 10px', verticalAlign: 'middle' }}>
                          <span
                            className="font-condensed font-bold"
                            style={{ color: rankColor, fontSize: '0.95rem' }}
                          >
                            {entry.simulated_rank}
                          </span>
                        </td>

                        {/* Nome */}
                        <td style={{ padding: '9px 10px', verticalAlign: 'middle' }}>
                          <span style={{ color: 'var(--nba-text)', fontSize: '0.83rem' }}>
                            {entry.participant_name}
                          </span>
                        </td>

                        {/* Pontos simulados */}
                        <td style={{ padding: '9px 10px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <span
                            className="font-condensed font-bold"
                            style={{ color: rankColor, fontSize: '0.95rem' }}
                          >
                            {entry.simulated_points}
                          </span>
                          {bonus > 0 && (
                            <span
                              style={{
                                color: 'var(--nba-success)',
                                fontSize: '0.7rem',
                                marginLeft: 4,
                              }}
                            >
                              +{bonus}
                            </span>
                          )}
                        </td>

                        {/* Pontos reais */}
                        <td
                          style={{
                            padding: '9px 10px',
                            textAlign: 'right',
                            verticalAlign: 'middle',
                          }}
                        >
                          <span
                            className="font-condensed"
                            style={{ color: 'var(--nba-text-muted)', fontSize: '0.83rem' }}
                          >
                            {entry.total_points}
                          </span>
                        </td>

                        {/* Delta posição */}
                        <td style={{ padding: '9px 10px', textAlign: 'right', verticalAlign: 'middle' }}>
                          {entry.rank_diff > 0 ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2,
                                color: 'var(--nba-success)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                              }}
                            >
                              <ArrowUp size={11} />
                              {entry.rank_diff}
                            </span>
                          ) : entry.rank_diff < 0 ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2,
                                color: 'var(--nba-danger)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                              }}
                            >
                              <ArrowDown size={11} />
                              {Math.abs(entry.rank_diff)}
                            </span>
                          ) : (
                            <Minus size={11} style={{ color: 'var(--nba-text-muted)' }} />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Helper para pegar a cor do time selecionado no border do card
function TEAM_MAP_COLOR(teamId: string): string {
  return getTeam(teamId)?.primary_color ?? '#c8963c'
}
