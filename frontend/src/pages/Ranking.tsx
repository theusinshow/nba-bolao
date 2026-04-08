import { BarChart2 } from 'lucide-react'
import { RankingTable } from '../components/RankingTable'
import { RankingChart } from '../components/RankingChart'
import { useRanking } from '../hooks/useRanking'

interface Props {
  participantId: string
}

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
