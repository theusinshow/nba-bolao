import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BarChart3, CheckCircle2, ChevronDown, ChevronRight, CircleOff, Flame, Layers3, Trophy, XCircle } from 'lucide-react'
import type { ParticipantScoreBreakdown, RoundNumber } from '../types'

interface Props {
  breakdown?: ParticipantScoreBreakdown
  loading?: boolean
}

const ROUND_LABEL: Record<RoundNumber, string> = {
  1: 'R1',
  2: 'R2',
  3: 'CF',
  4: 'Finals',
}

const STATUS_META = {
  cravada: { label: 'Cravada', color: 'var(--nba-gold)', bg: 'rgba(200,150,60,0.1)', icon: <Flame size={13} /> },
  winner: { label: 'Vencedor', color: 'var(--nba-success)', bg: 'rgba(46,204,113,0.1)', icon: <CheckCircle2 size={13} /> },
  wrong: { label: 'Errou', color: 'var(--nba-danger)', bg: 'rgba(231,76,60,0.1)', icon: <XCircle size={13} /> },
  pending: { label: 'Pendente', color: 'var(--nba-text-muted)', bg: 'rgba(255,255,255,0.05)', icon: <CircleOff size={13} /> },
  correct: { label: 'Acertou', color: 'var(--nba-success)', bg: 'rgba(46,204,113,0.1)', icon: <CheckCircle2 size={13} /> },
} as const

interface GameBreakdownGroup {
  series_id: string
  round: RoundNumber
  matchup_label: string
  total_points: number
  correct_games: number
  played_games: number
  total_games: number
  items: ParticipantScoreBreakdown['game_breakdown']
}

function SummaryCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 10,
        background: 'rgba(12,12,18,0.34)',
        border: '1px solid rgba(200,150,60,0.16)',
      }}
    >
      <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>{label}</div>
      <div className="font-condensed font-bold" style={{ color: tone, fontSize: '1.4rem', lineHeight: 1.1, marginTop: 4 }}>
        {value}
      </div>
    </div>
  )
}

function SectionHeader({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{ color: 'var(--nba-gold)', display: 'flex' }}>{icon}</span>
      <h3 className="title" style={{ color: 'var(--nba-gold)', fontSize: '0.98rem', letterSpacing: '0.08em', margin: 0 }}>
        {title}
      </h3>
    </div>
  )
}

export function ParticipantScoreReport({ breakdown, loading }: Props) {
  const [expandedSeriesIds, setExpandedSeriesIds] = useState<string[]>([])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--nba-gold)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!breakdown) {
    return (
      <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--nba-text-muted)' }}>
        Selecione um participante para ver de onde veio cada ponto.
      </div>
    )
  }

  const { participant, summary, series_breakdown, game_breakdown } = breakdown
  const gameBreakdownGroups = useMemo<GameBreakdownGroup[]>(() => {
    const grouped = new Map<string, GameBreakdownGroup>()

    for (const item of game_breakdown) {
      const current = grouped.get(item.series_id)
      if (!current) {
        grouped.set(item.series_id, {
          series_id: item.series_id,
          round: item.round,
          matchup_label: item.matchup_label,
          total_points: item.points,
          correct_games: item.status === 'correct' ? 1 : 0,
          played_games: item.played ? 1 : 0,
          total_games: 1,
          items: [item],
        })
        continue
      }

      current.total_points += item.points
      current.correct_games += item.status === 'correct' ? 1 : 0
      current.played_games += item.played ? 1 : 0
      current.total_games += 1
      current.items.push(item)
    }

    return [...grouped.values()]
      .map((group) => ({
        ...group,
        items: [...group.items].sort((left, right) => left.game_number - right.game_number),
      }))
      .sort((left, right) => {
        if (left.round !== right.round) return left.round - right.round
        return left.matchup_label.localeCompare(right.matchup_label)
      })
  }, [game_breakdown])

  useEffect(() => {
    if (gameBreakdownGroups.length === 0) {
      setExpandedSeriesIds([])
      return
    }

    setExpandedSeriesIds((current) => {
      const validCurrent = current.filter((seriesId) => gameBreakdownGroups.some((group) => group.series_id === seriesId))
      if (validCurrent.length > 0) return validCurrent
      return [gameBreakdownGroups[0].series_id]
    })
  }, [gameBreakdownGroups])

  function toggleSeriesGroup(seriesId: string) {
    setExpandedSeriesIds((current) =>
      current.includes(seriesId)
        ? current.filter((id) => id !== seriesId)
        : [...current, seriesId]
    )
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(74,144,217,0.16), rgba(200,150,60,0.08) 60%, rgba(19,19,26,1) 100%)',
          border: '1px solid rgba(200,150,60,0.18)',
          borderRadius: 12,
          padding: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginBottom: 4 }}>Relatório do participante</div>
            <h2 className="title" style={{ color: 'var(--nba-gold)', fontSize: '1.5rem', lineHeight: 1, margin: 0 }}>
              {participant.name}
            </h2>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 999,
              background: 'rgba(12,12,18,0.36)',
              border: '1px solid rgba(200,150,60,0.18)',
              color: 'var(--nba-text-muted)',
              fontSize: '0.76rem',
            }}
          >
            <BarChart3 size={14} />
            Breakdown do ranking
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10 }} className="grid-cols-2 md:grid-cols-4">
          <SummaryCard label="Total" value={summary.total_points} tone="var(--nba-gold)" />
          <SummaryCard label="Séries" value={summary.series_points} tone="var(--nba-text)" />
          <SummaryCard label="Jogos" value={summary.game_points} tone="var(--nba-east)" />
          <SummaryCard label="Cravadas" value={summary.cravadas} tone="var(--nba-success)" />
        </div>

        <div style={{ display: 'grid', gap: 10, marginTop: 10 }} className="grid-cols-2 md:grid-cols-4">
          {summary.round_points.map((points, index) => (
            <SummaryCard
              key={index}
              label={ROUND_LABEL[(index + 1) as RoundNumber]}
              value={points}
              tone="var(--nba-text-muted)"
            />
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }} className="lg:grid-cols-2">
        <div
          style={{
            background: 'var(--nba-surface)',
            border: '1px solid var(--nba-border)',
            borderRadius: 12,
            padding: '1rem',
          }}
        >
          <SectionHeader title="Séries" icon={<Trophy size={15} />} />

          {series_breakdown.length === 0 ? (
            <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem' }}>Nenhum palpite de série registrado.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {series_breakdown.map((item) => {
                const status = STATUS_META[item.status]
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px',
                      borderRadius: 10,
                      border: '1px solid rgba(200,150,60,0.12)',
                      background: 'rgba(12,12,18,0.32)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span className="font-condensed" style={{ color: 'var(--nba-gold)', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
                        {ROUND_LABEL[item.round]} · {item.matchup_label}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          color: status.color,
                          background: status.bg,
                          borderRadius: 999,
                          padding: '3px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        {status.icon}
                        {status.label}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gap: 6, fontSize: '0.78rem', color: 'var(--nba-text-muted)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span>Seu palpite</span>
                        <strong style={{ color: 'var(--nba-text)' }}>
                          {item.picked_winner_label} em {item.picked_games_count}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span>Resultado</span>
                        <strong style={{ color: 'var(--nba-text)' }}>
                          {item.actual_winner_label ?? 'Pendente'}{item.actual_winner_label ? ` em ${item.actual_games_played}` : ''}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span>Pontos</span>
                        <strong style={{ color: item.points > 0 ? status.color : 'var(--nba-text-muted)' }}>
                          +{item.points}
                        </strong>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div
          style={{
            background: 'var(--nba-surface)',
            border: '1px solid var(--nba-border)',
            borderRadius: 12,
            padding: '1rem',
          }}
        >
          <SectionHeader title="Jogos" icon={<Layers3 size={15} />} />

          {gameBreakdownGroups.length === 0 ? (
            <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem' }}>Nenhum palpite jogo a jogo registrado.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {gameBreakdownGroups.map((group) => {
                const expanded = expandedSeriesIds.includes(group.series_id)
                return (
                  <div
                    key={group.series_id}
                    style={{
                      borderRadius: 10,
                      border: '1px solid rgba(200,150,60,0.12)',
                      background: 'rgba(12,12,18,0.32)',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      onClick={() => toggleSeriesGroup(group.series_id)}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        color: 'inherit',
                        textAlign: 'left',
                        padding: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                        <div>
                          <div className="font-condensed" style={{ color: 'var(--nba-gold)', fontSize: '0.72rem', letterSpacing: '0.08em', marginBottom: 6 }}>
                            {ROUND_LABEL[group.round]} · {group.matchup_label}
                          </div>
                          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem' }}>
                            {group.correct_games}/{group.played_games || group.total_games} acertos • {group.total_games} jogo{group.total_games !== 1 ? 's' : ''}
                          </div>
                        </div>

                        <span
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            border: '1px solid rgba(200,150,60,0.12)',
                            background: 'rgba(28,28,38,0.9)',
                            color: expanded ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gap: 8 }} className="grid-cols-2">
                        <div
                          style={{
                            padding: '8px 10px',
                            borderRadius: 10,
                            background: 'rgba(12,12,18,0.34)',
                            border: '1px solid rgba(200,150,60,0.12)',
                          }}
                        >
                          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.66rem' }}>Pontos da série</div>
                          <div className="font-condensed font-bold" style={{ color: group.total_points > 0 ? 'var(--nba-success)' : 'var(--nba-text)', fontSize: '1.05rem', lineHeight: 1.1 }}>
                            {group.total_points}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: '8px 10px',
                            borderRadius: 10,
                            background: 'rgba(12,12,18,0.34)',
                            border: '1px solid rgba(200,150,60,0.12)',
                          }}
                        >
                          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.66rem' }}>Jogos concluídos</div>
                          <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1.05rem', lineHeight: 1.1 }}>
                            {group.played_games}/{group.total_games}
                          </div>
                        </div>
                      </div>
                    </button>

                    {expanded && (
                      <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--nba-border)', background: 'rgba(0,0,0,0.12)' }}>
                        <div style={{ display: 'grid', gap: 10, paddingTop: 12 }}>
                          {group.items.map((item) => {
                            const status = STATUS_META[item.status]
                            return (
                              <div
                                key={item.id}
                                style={{
                                  padding: '12px',
                                  borderRadius: 10,
                                  border: '1px solid rgba(200,150,60,0.12)',
                                  background: 'rgba(12,12,18,0.32)',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                  <span className="font-condensed" style={{ color: 'var(--nba-gold)', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
                                    Jogo {item.game_number}
                                  </span>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      color: status.color,
                                      background: status.bg,
                                      borderRadius: 999,
                                      padding: '3px 8px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                    }}
                                  >
                                    {status.icon}
                                    {status.label}
                                  </span>
                                </div>

                                <div style={{ display: 'grid', gap: 6, fontSize: '0.78rem', color: 'var(--nba-text-muted)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                    <span>Seu palpite</span>
                                    <strong style={{ color: 'var(--nba-text)' }}>{item.picked_winner_label}</strong>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                    <span>Vencedor real</span>
                                    <strong style={{ color: 'var(--nba-text)' }}>{item.actual_winner_label ?? 'Pendente'}</strong>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                    <span>Pontos</span>
                                    <strong style={{ color: item.points > 0 ? status.color : 'var(--nba-text-muted)' }}>
                                      +{item.points}
                                    </strong>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
