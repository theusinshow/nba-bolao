import { RankingTable } from '../components/RankingTable'
import { RankingChart } from '../components/RankingChart'
import { useRanking } from '../hooks/useRanking'

interface Props {
  participantId: string
}

export function Ranking({ participantId }: Props) {
  const { ranking, loading } = useRanking()

  return (
    <div className="pb-20 pt-4 px-4 max-w-3xl mx-auto">
      <h1 className="title text-4xl text-nba-gold mb-1">Ranking</h1>
      <p className="text-nba-muted text-sm mb-4">Atualizado em tempo real</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-nba-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="card p-4 mb-4">
            <h2 className="title text-xl text-nba-text mb-4">Pontuação por Rodada</h2>
            <RankingChart ranking={ranking} />
          </div>

          <div className="card">
            <RankingTable ranking={ranking} highlightId={participantId} />
          </div>
        </>
      )}
    </div>
  )
}
