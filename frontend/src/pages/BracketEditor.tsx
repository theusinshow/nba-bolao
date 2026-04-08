import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { BracketSVG } from '../components/BracketSVG'
import { SeriesModal } from '../components/SeriesModal'
import { GamePickModal } from '../components/GamePickModal'
import { useSeries } from '../hooks/useSeries'
import type { Series } from '../types'

interface Props {
  participantId: string
}

export function BracketEditor({ participantId }: Props) {
  const { series, picks, loading, savePick, getPickForSeries } = useSeries(participantId)
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null)
  const [gamePickSeries, setGamePickSeries] = useState<Series | null>(null)

  function handleSeriesClick(s: Series) {
    setSelectedSeries(s)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-nba-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const completedCount = picks.length
  const totalSeries = series.length

  return (
    <div className="pb-20 pt-4">
      <div className="px-4 mb-4 flex items-start justify-between">
        <div>
          <h1 className="title text-4xl text-nba-gold">Meu Bracket</h1>
          <p className="text-nba-muted text-sm">
            {completedCount}/{totalSeries} séries palpitadas — Clique em uma série para editar
          </p>
        </div>
        <Link
          to="/official"
          className="flex items-center gap-1.5 text-xs text-nba-muted hover:text-nba-gold transition-colors mt-1 shrink-0"
        >
          <Trophy size={14} />
          Bracket Oficial
        </Link>
      </div>

      <div className="px-2">
        <BracketSVG
          series={series}
          picks={picks}
          onSeriesClick={handleSeriesClick}
        />
      </div>

      {selectedSeries && (
        <SeriesModal
          series={selectedSeries}
          existingPick={getPickForSeries(selectedSeries.id)}
          onSave={savePick}
          onClose={() => setSelectedSeries(null)}
        />
      )}

      {gamePickSeries && (
        <GamePickModal
          series={gamePickSeries}
          participantId={participantId}
          onClose={() => setGamePickSeries(null)}
        />
      )}

      {/* Legend */}
      <div className="px-4 mt-4 flex gap-4 flex-wrap text-xs text-nba-muted">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border border-nba-success inline-block" />
          Acertou
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border border-nba-danger inline-block" />
          Errou
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border border-nba-gold inline-block" />
          Palpitado
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border border-nba-border inline-block" />
          Sem palpite
        </span>
      </div>
    </div>
  )
}
