import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { BracketSVG } from '../components/BracketSVG'
import { SeriesModal } from '../components/SeriesModal'
import { useSeries } from '../hooks/useSeries'
import { useUIStore } from '../store/useUIStore'
import type { Series } from '../types'

interface Props {
  isAdmin: boolean
}

export function OfficialBracket({ isAdmin }: Props) {
  const { series, loading } = useSeries()
  const { addToast } = useUIStore()
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null)
  const [syncing, setSyncing] = useState(false)

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'}/admin/sync`,
        { method: 'POST' }
      )
      if (res.ok) addToast('Sync iniciado!', 'success')
      else addToast('Erro no sync', 'error')
    } catch {
      addToast('Backend indisponível', 'error')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-nba-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="pb-20 pt-4">
      <div className="px-4 mb-4 flex items-center justify-between">
        <div>
          <h1 className="title text-4xl text-nba-gold">Bracket Oficial</h1>
          <p className="text-nba-muted text-sm">Resultados reais dos playoffs</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 text-sm text-nba-gold border border-nba-border rounded-lg px-3 py-2 hover:bg-nba-surface-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sync
          </button>
        )}
      </div>

      <div className="px-2">
        <BracketSVG
          series={series}
          onSeriesClick={setSelectedSeries}
        />
      </div>

      {selectedSeries && (
        <SeriesModal
          series={selectedSeries}
          onSave={async () => {}}
          onClose={() => setSelectedSeries(null)}
          readOnly
        />
      )}
    </div>
  )
}
