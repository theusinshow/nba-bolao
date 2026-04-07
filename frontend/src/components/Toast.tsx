import { X } from 'lucide-react'
import { useUIStore } from '../store/useUIStore'

export function Toast() {
  const { toasts, removeToast } = useUIStore()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            t.type === 'success' ? 'bg-nba-success text-black' :
            t.type === 'error' ? 'bg-nba-danger text-white' :
            'bg-nba-surface-2 text-nba-text border border-nba-border'
          }`}
        >
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="ml-auto opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
