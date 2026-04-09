import { useState } from 'react'
import { RefreshCw, Activity, Trophy, Clock3 } from 'lucide-react'
import { BracketSVG } from '../components/BracketSVG'
import { SeriesModal } from '../components/SeriesModal'
import { useSeries } from '../hooks/useSeries'
import { useUIStore } from '../store/useUIStore'
import { supabase } from '../lib/supabase'
import type { Series } from '../types'

interface Props {
  isAdmin: boolean
}

export function OfficialBracket({ isAdmin }: Props) {
  const { series, loading } = useSeries()
  const { addToast } = useUIStore()
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null)
  const [syncing, setSyncing] = useState(false)

  const completedSeries = series.filter((item) => item.is_complete).length
  const openSeries = Math.max(series.length - completedSeries, 0)
  const champion = series.find((item) => item.slot === 'FIN' && item.is_complete)?.winner?.abbreviation ?? 'Em disputa'

  async function handleSync() {
    setSyncing(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        addToast('Sessão expirada. Faça login novamente.', 'error')
        return
      }

      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'}/admin/sync`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      if (res.ok) {
        addToast('Sync iniciado!', 'success')
        return
      }

      const payload = await res.json().catch(() => null)
      addToast(payload?.error ?? 'Erro no sync', 'error')
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
      <div className="px-4 mb-5">
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(224,92,58,0.18), rgba(200,150,60,0.08) 55%, rgba(19,19,26,1) 100%)',
            border: '1px solid rgba(200,150,60,0.18)',
            borderRadius: 12,
            padding: '1rem',
            position: 'relative',
            overflow: 'hidden',
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
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="title text-4xl text-nba-gold">Bracket Oficial</h1>
                <p className="text-nba-muted text-sm">Resultados reais dos playoffs e panorama atualizado da chave.</p>
              </div>
              {isAdmin && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-2 text-sm text-nba-gold border border-nba-border rounded-lg px-3 py-2 hover:bg-nba-surface-2 transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(12,12,18,0.34)' }}
                >
                  <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Sincronizando...' : 'Sync'}
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {[
                { label: 'Séries concluídas', value: completedSeries, icon: <Activity size={14} />, color: 'var(--nba-success)' },
                { label: 'Ainda em aberto', value: openSeries, icon: <Clock3 size={14} />, color: 'var(--nba-gold)' },
                { label: 'Campeão atual', value: champion, icon: <Trophy size={14} />, color: 'var(--nba-text)' },
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--nba-text-muted)', fontSize: '0.7rem', marginBottom: 6 }}>
                    {item.icon}
                    {item.label}
                  </div>
                  <div className="font-condensed font-bold" style={{ color: item.color, fontSize: '1.32rem', lineHeight: 1 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
