import { BarChart2, Info } from 'lucide-react'
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

export function Ranking({ participantId }: Props) {
  const { ranking, loading } = useRanking()

  return (
    <div className="pb-24 pt-4 px-4 mx-auto" style={{ maxWidth: 860 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <BarChart2 size={20} style={{ color: 'var(--nba-gold)' }} />
          <h1
            className="title"
            style={{ color: 'var(--nba-gold)', fontSize: '2rem', lineHeight: 1 }}
          >
            Ranking
          </h1>
        </div>
        <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem' }}>
          Atualizado em tempo real via Supabase Realtime
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--nba-gold)', borderTopColor: 'transparent' }}
          />
        </div>
      ) : (
        <>
          <div
            style={{
              background: 'var(--nba-surface)',
              border: '1px solid var(--nba-border)',
              borderRadius: 8,
              padding: '1rem',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Info size={16} style={{ color: 'var(--nba-gold)' }} />
              <h2
                className="title"
                style={{
                  color: 'var(--nba-gold)',
                  fontSize: '1rem',
                  letterSpacing: '0.1em',
                }}
              >
                Como Funciona a Pontuação
              </h2>
            </div>

            <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', marginBottom: 12 }}>
              Você pontua ao acertar o vencedor do jogo ou da série. Se acertar também em quantos jogos a série termina, vira cravada.
            </p>

            <div style={{ display: 'grid', gap: 10 }}>
              {([1, 2, 3, 4] as const).map((round) => (
                <div
                  key={round}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(120px, 1.4fr) 1fr 1fr 1fr',
                    gap: 8,
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--nba-surface-2)',
                    border: '1px solid var(--nba-border)',
                    fontSize: '0.8rem',
                  }}
                >
                  <span style={{ color: 'var(--nba-text)', fontWeight: 600 }}>
                    {ROUND_LABELS[round]}
                  </span>
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
              ))}
            </div>

            <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginTop: 12 }}>
              Cravada substitui a pontuação da série, ela não soma por cima.
            </p>
          </div>

          {/* Chart card */}
          <div
            style={{
              background: 'var(--nba-surface)',
              border: '1px solid var(--nba-border)',
              borderRadius: 8,
              padding: '1rem',
              marginBottom: 16,
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
        </>
      )}
    </div>
  )
}
