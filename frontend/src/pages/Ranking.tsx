import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart2, Crown, Flame, Info, Medal, ReceiptText, Trophy, X } from 'lucide-react'
import { ParticipantScoreReport } from '../components/ParticipantScoreReport'
import { RankingTable } from '../components/RankingTable'
import { RankingChart } from '../components/RankingChart'
import { LoadingBasketball } from '../components/LoadingBasketball'
import { useRanking } from '../hooks/useRanking'
import { SCORING_CONFIG } from '../utils/scoring'

interface Props {
  participantId: string
}

const ROUND_LABELS = {
  1: '1ª rodada',
  2: '2ª rodada',
  3: 'Final de conferência',
  4: 'Finais da NBA',
} as const

function TopThreeCards({
  ranking,
  participantId,
}: {
  ranking: ReturnType<typeof useRanking>['ranking']
  participantId: string
}) {
  const topThree = ranking.slice(0, 3)
  if (topThree.length === 0) return null

  const styles = [
    { label: 'Líder', icon: <Crown size={16} />, color: '#ffd166', glow: 'rgba(255,209,102,0.18)', glowClass: 'podium-gold' },
    { label: 'Vice', icon: <Medal size={16} />, color: '#c9d1d9', glow: 'rgba(201,209,217,0.14)', glowClass: 'podium-silver' },
    { label: '3º lugar', icon: <Trophy size={16} />, color: '#d68c45', glow: 'rgba(214,140,69,0.14)', glowClass: 'podium-bronze' },
  ]

  return (
    <div style={{ display: 'grid', gap: 12 }} className="grid-cols-1 sm:grid-cols-3">
      {topThree.map((entry, index) => {
        const style = styles[index]
        const isMe = entry.participant_id === participantId

        return (
          <div
            key={entry.participant_id}
            className={style.glowClass}
            style={{
              background: `linear-gradient(180deg, ${style.glow}, rgba(19,19,26,0.96))`,
              border: `1px solid ${style.color}33`,
              borderRadius: 12,
              padding: '1rem',
              minHeight: 180,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: isMe ? '0 0 0 1px rgba(200,150,60,0.28) inset' : 'none',
              transition: 'transform 0.22s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: style.color, fontSize: '0.78rem', fontWeight: 700 }}>
                {style.icon}
                {style.label}
              </span>
              <span className="font-condensed font-bold" style={{ color: style.color, fontSize: '1rem' }}>
                #{entry.rank}
              </span>
            </div>

            <div style={{ color: isMe ? 'var(--nba-gold)' : 'var(--nba-text)', fontWeight: 700, fontSize: '0.96rem', marginBottom: 6 }}>
              {entry.participant_name}
            </div>
            <div className="font-condensed font-bold" style={{ color: style.color, fontSize: '2.2rem', lineHeight: 1, marginBottom: 10 }}>
              {entry.total_points}
            </div>

            <div style={{ display: 'grid', gap: 6, fontSize: '0.76rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--nba-text-muted)' }}>
                <span>Cravadas</span>
                <strong style={{ color: 'var(--nba-text)' }}>{entry.cravadas}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--nba-text-muted)' }}>
                <span>Acertos de série</span>
                <strong style={{ color: 'var(--nba-text)' }}>{entry.series_correct}/{entry.series_total}</strong>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RankingHero({
  ranking,
  participantId,
}: {
  ranking: ReturnType<typeof useRanking>['ranking']
  participantId: string
}) {
  const myEntry = ranking.find((entry) => entry.participant_id === participantId)
  const leader = ranking[0]
  const myGap = myEntry && leader ? Math.max(leader.total_points - myEntry.total_points, 0) : null

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(200,150,60,0.18), rgba(74,144,217,0.10) 55%, rgba(19,19,26,1) 100%)',
        border: '1px solid rgba(200,150,60,0.22)',
        borderRadius: 12,
        padding: '1rem',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 18,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at top right, rgba(232,180,90,0.18), transparent 35%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nba-gold)' }}>
          <Flame size={15} />
          <span className="font-condensed" style={{ fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Corrida pelo topo
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <BarChart2 size={20} style={{ color: 'var(--nba-gold)' }} />
              <h1 className="title" style={{ color: 'var(--nba-gold)', fontSize: '2rem', lineHeight: 1, margin: 0 }}>
                Ranking
              </h1>
            </div>
            <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', margin: 0 }}>
              Atualizado em tempo real via Supabase Realtime
            </p>
          </div>

          <div
            style={{
              minWidth: 190,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(12,12,18,0.34)',
              border: '1px solid rgba(200,150,60,0.16)',
            }}
          >
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Seu cenário atual</div>
            <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '1.1rem', lineHeight: 1 }}>
              {myEntry ? `#${myEntry.rank} com ${myEntry.total_points} pts` : 'Aguardando pontuação'}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 4 }}>
              {myGap == null ? 'Entre na disputa para aparecer aqui.' : myGap === 0 ? 'Você está empatado na liderança.' : `${myGap} ponto${myGap !== 1 ? 's' : ''} para alcançar o topo`}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 sm:grid-cols-3">
          {[
            { label: 'Participantes', value: ranking.length, tone: 'var(--nba-text)' },
            { label: 'Líder atual', value: leader ? leader.participant_name.split(' ')[0] : '—', tone: 'var(--nba-gold)' },
            { label: 'Maior pontuação', value: leader?.total_points ?? 0, tone: 'var(--nba-success)' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(12,12,18,0.34)',
                border: '1px solid rgba(200,150,60,0.16)',
              }}
            >
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>{item.label}</div>
              <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.65rem', lineHeight: 1.1 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ScoringGuide({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const [showTiebreakInfo, setShowTiebreakInfo] = useState(false)

  return (
    <div
      style={{
        background: 'var(--nba-surface)',
        border: '1px solid var(--nba-border)',
        borderRadius: 8,
        padding: '1rem',
        position: mobile ? 'relative' : 'sticky',
        top: mobile ? undefined : 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Info size={16} style={{ color: 'var(--nba-gold)' }} />
          <h2
            className="title"
            style={{
              color: 'var(--nba-gold)',
              fontSize: '1rem',
              letterSpacing: '0.1em',
            }}
          >
            Pontuação
          </h2>
        </div>

        {mobile && onClose && (
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--nba-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', marginBottom: 12 }}>
        Acertar o vencedor do jogo ou da série gera pontos. Se acertar também em quantos jogos a série termina, vira cravada.
      </p>

      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setShowTiebreakInfo((current) => !current)}
          aria-label="Explicar o critério de desempate"
          style={{
            width: 22,
            height: 22,
            borderRadius: '999px',
            border: '1px solid rgba(200,150,60,0.35)',
            background: 'rgba(200,150,60,0.14)',
            color: 'var(--nba-gold)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Info size={12} />
        </button>

        {showTiebreakInfo && (
          <div
            style={{
              marginTop: 10,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(12,12,18,0.96)',
              border: '1px solid rgba(200,150,60,0.26)',
              color: 'var(--nba-text)',
              fontSize: '0.78rem',
              lineHeight: 1.45,
            }}
          >
            Critério de desempate:
            <br />
            1. total de pontos
            <br />
            2. cravadas
            <br />
            3. acertos de série
            <br />
            4. acertos de jogo
            <br />
            5. ordem alfabética
          </div>
        )}
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 44px 54px', gap: 4, marginBottom: 4 }}>
        <div />
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.62rem', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textAlign: 'center', textTransform: 'uppercase' }}>Jogo</div>
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.62rem', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textAlign: 'center', textTransform: 'uppercase' }}>Série</div>
        <div style={{ color: '#ffd166', fontSize: '0.62rem', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textAlign: 'center', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Flame size={9} />Cravada
        </div>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        {([1, 2, 3, 4] as const).map((round) => (
          <div
            key={round}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 44px 44px 54px',
              alignItems: 'center',
              gap: 4,
              padding: '9px 10px',
              borderRadius: 8,
              background: 'var(--nba-surface-2)',
              border: '1px solid var(--nba-border)',
            }}
          >
            <div style={{ color: 'var(--nba-text)', fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ROUND_LABELS[round]}
            </div>
            <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '0.95rem', textAlign: 'center', lineHeight: 1 }}>
              {SCORING_CONFIG.pointsPerGame[round]}
            </div>
            <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '0.95rem', textAlign: 'center', lineHeight: 1 }}>
              {SCORING_CONFIG.pointsPerSeries[round]}
            </div>
            <div
              className="font-condensed font-bold"
              style={{
                color: '#ffd166',
                fontSize: '0.95rem',
                textAlign: 'center',
                lineHeight: 1,
                background: 'rgba(255,209,102,0.09)',
                borderRadius: 6,
                padding: '4px 0',
              }}
            >
              {SCORING_CONFIG.pointsPerCravada[round]}
            </div>
          </div>
        ))}
      </div>

      <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginTop: 12 }}>
        Cravada substitui a pontuação da série, ela não soma por cima.
      </p>
    </div>
  )
}

export function Ranking({ participantId }: Props) {
  const { ranking, breakdowns, loading, error } = useRanking()
  const [mobileScoringOpen, setMobileScoringOpen] = useState(false)
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(participantId)
  const [mobileReportOpen, setMobileReportOpen] = useState(false)

  const selectedBreakdown = useMemo(() => {
    if (!selectedParticipantId) return undefined
    return breakdowns[selectedParticipantId]
  }, [breakdowns, selectedParticipantId])

  const navigate = useNavigate()

  function handleParticipantReportOpen(nextParticipantId: string) {
    setSelectedParticipantId(nextParticipantId)
    navigate(`/profile/${nextParticipantId}`)
  }

  return (
    <div className="pb-24 pt-4 px-4 mx-auto" style={{ maxWidth: 1180 }}>
      <div className="animate-in"><RankingHero ranking={ranking} participantId={participantId} /></div>

      {error && (
        <div style={{ margin: '16px 0', padding: '12px 16px', borderRadius: 8, background: 'rgba(231,76,60,0.10)', border: '1px solid rgba(231,76,60,0.3)', color: 'var(--nba-danger)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <LoadingBasketball size={32} />
        </div>
      ) : (
        <>
          <div className="lg:hidden" style={{ marginBottom: 16 }}>
            <button
              onClick={() => setMobileScoringOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: 'var(--nba-surface)',
                border: '1px solid var(--nba-border)',
                borderRadius: 8,
                color: 'var(--nba-gold)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Info size={15} />
              Ver pontuação
            </button>
          </div>

          {mobileScoringOpen && (
            <div className="lg:hidden">
              <div
                onClick={() => setMobileScoringOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.65)',
                  zIndex: 40,
                }}
              />
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: 'min(88vw, 320px)',
                  padding: 16,
                  zIndex: 41,
                  overflowY: 'auto',
                }}
              >
                <ScoringGuide mobile onClose={() => setMobileScoringOpen(false)} />
              </div>
            </div>
          )}

          <div
            className="grid lg:grid-cols-[280px_minmax(0,1fr)]"
            style={{ gap: 16, alignItems: 'start' }}
          >
            <aside className="hidden lg:block">
              <ScoringGuide />
            </aside>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr)',
                gap: 16,
              }}
            >
              <div className="animate-in-2"><TopThreeCards ranking={ranking} participantId={participantId} /></div>

              {/* Chart card */}
              <div
                style={{
                  background: 'var(--nba-surface)',
                  border: '1px solid var(--nba-border)',
                  borderRadius: 8,
                  padding: '1rem',
                }}
              >
                <h2
                  className="title"
                  style={{
                    color: 'var(--nba-gold)',
                    fontSize: '1rem',
                    letterSpacing: '0.1em',
                    marginBottom: 16,
                  }}
                >
                  Corrida de Pontuação
                </h2>
                <RankingChart ranking={ranking} breakdowns={breakdowns} />
              </div>

              {/* Table card */}
              <div
                style={{
                  background: 'var(--nba-surface)',
                  border: '1px solid var(--nba-border)',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                {/* Table header strip */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--nba-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <h2
                    className="title"
                    style={{ color: 'var(--nba-gold)', fontSize: '1rem', letterSpacing: '0.1em' }}
                  >
                    Classificação
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem' }}>
                      {ranking.length} participante{ranking.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      className="lg:hidden"
                      onClick={() => setMobileReportOpen(true)}
                      disabled={!selectedBreakdown}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 10px',
                        borderRadius: 999,
                        border: '1px solid rgba(74,144,217,0.26)',
                        background: selectedBreakdown ? 'rgba(74,144,217,0.12)' : 'rgba(255,255,255,0.03)',
                        color: selectedBreakdown ? 'var(--nba-east)' : 'var(--nba-text-muted)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: selectedBreakdown ? 'pointer' : 'default',
                      }}
                    >
                      <ReceiptText size={13} />
                      Relatório
                    </button>
                  </div>
                </div>

                <RankingTable
                  ranking={ranking}
                  highlightId={participantId}
                  selectedId={selectedParticipantId ?? undefined}
                  onParticipantClick={handleParticipantReportOpen}
                />
              </div>

              <div
                className="hidden lg:block"
                style={{
                  background: 'var(--nba-surface)',
                  border: '1px solid var(--nba-border)',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--nba-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <h2
                    className="title"
                    style={{ color: 'var(--nba-gold)', fontSize: '1rem', letterSpacing: '0.1em' }}
                  >
                    Relatório de Pontuação
                  </h2>
                  <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem' }}>
                    {selectedBreakdown?.participant.name ?? 'Selecione um participante'}
                  </span>
                </div>

                <div style={{ padding: 16 }}>
                  <ParticipantScoreReport breakdown={selectedBreakdown} loading={loading} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {mobileReportOpen && (
        <div className="lg:hidden">
          <div
            onClick={() => setMobileReportOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 41,
              maxHeight: '82vh',
              overflowY: 'auto',
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              background: 'rgba(19,19,26,0.98)',
              borderTop: '1px solid rgba(200,150,60,0.18)',
              padding: '16px 16px calc(20px + env(safe-area-inset-bottom))',
              boxShadow: '0 -14px 40px rgba(0,0,0,0.32)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div>
                <div className="title" style={{ color: 'var(--nba-gold)', fontSize: '1.1rem', letterSpacing: '0.08em' }}>
                  Relatório
                </div>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.78rem' }}>
                  {selectedBreakdown?.participant.name ?? 'Selecione um participante na tabela'}
                </div>
              </div>
              <button
                onClick={() => setMobileReportOpen(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: '1px solid rgba(200,150,60,0.12)',
                  background: 'rgba(28,28,38,0.9)',
                  color: 'var(--nba-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>
            <ParticipantScoreReport breakdown={selectedBreakdown} loading={loading} />
          </div>
        </div>
      )}
    </div>
  )
}
