import { useState } from 'react'
import { BarChart2, Crown, Flame, Info, Medal, Trophy, X } from 'lucide-react'
import { RankingTable } from '../components/RankingTable'
import { RankingChart } from '../components/RankingChart'
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
    { label: 'Líder', icon: <Crown size={16} />, color: '#ffd166', glow: 'rgba(255,209,102,0.18)' },
    { label: 'Vice', icon: <Medal size={16} />, color: '#c9d1d9', glow: 'rgba(201,209,217,0.14)' },
    { label: '3º lugar', icon: <Trophy size={16} />, color: '#d68c45', glow: 'rgba(214,140,69,0.14)' },
  ]

  return (
    <div style={{ display: 'grid', gap: 12 }} className="md:grid-cols-3">
      {topThree.map((entry, index) => {
        const style = styles[index]
        const isMe = entry.participant_id === participantId

        return (
          <div
            key={entry.participant_id}
            style={{
              background: `linear-gradient(180deg, ${style.glow}, rgba(19,19,26,0.96))`,
              border: `1px solid ${style.color}33`,
              borderRadius: 12,
              padding: '1rem',
              boxShadow: isMe ? '0 0 0 1px rgba(200,150,60,0.28) inset' : 'none',
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
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

      <div style={{ display: 'grid', gap: 10 }}>
        {([1, 2, 3, 4] as const).map((round) => (
          <div
            key={round}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: 'var(--nba-surface-2)',
              border: '1px solid var(--nba-border)',
            }}
          >
            <div style={{ color: 'var(--nba-text)', fontWeight: 600, fontSize: '0.82rem', marginBottom: 6 }}>
              {ROUND_LABELS[round]}
            </div>
            <div style={{ display: 'grid', gap: 4, fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--nba-text-muted)' }}>
                Jogo: <strong style={{ color: 'var(--nba-gold)' }}>{SCORING_CONFIG.pointsPerGame[round]} pt</strong>
              </span>
              <span style={{ color: 'var(--nba-text-muted)' }}>
                Série: <strong style={{ color: 'var(--nba-gold)' }}>{SCORING_CONFIG.pointsPerSeries[round]} pts</strong>
              </span>
              <span style={{ color: 'var(--nba-text-muted)' }}>
                Cravada: <strong style={{ color: 'var(--nba-gold)' }}>{SCORING_CONFIG.pointsPerCravada[round]} pts</strong>
              </span>
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
  const { ranking, loading } = useRanking()
  const [mobileScoringOpen, setMobileScoringOpen] = useState(false)

  return (
    <div className="pb-24 pt-4 px-4 mx-auto" style={{ maxWidth: 1180 }}>
      <RankingHero ranking={ranking} participantId={participantId} />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--nba-gold)', borderTopColor: 'transparent' }}
          />
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
              <TopThreeCards ranking={ranking} participantId={participantId} />

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
                  Pontuação por Rodada
                </h2>
                <RankingChart ranking={ranking} />
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
                  <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem' }}>
                    {ranking.length} participante{ranking.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <RankingTable ranking={ranking} highlightId={participantId} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
