import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useUIStore } from '../store/useUIStore'

interface DisplayToast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  exiting: boolean
}

export function Toast() {
  const { toasts, removeToast } = useUIStore()
  const [displayed, setDisplayed] = useState<DisplayToast[]>([])
  const exitTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Sync store toasts → displayed list with enter/exit tracking
  useEffect(() => {
    setDisplayed((prev) => {
      const storeIds = new Set(toasts.map((t) => t.id))
      const prevIds = new Set(prev.map((t) => t.id))

      // Mark removed toasts as exiting
      const updated = prev.map((t) => {
        if (!storeIds.has(t.id) && !t.exiting) {
          // Schedule actual removal after exit animation (210ms)
          exitTimers.current[t.id] = setTimeout(() => {
            setDisplayed((d) => d.filter((x) => x.id !== t.id))
            delete exitTimers.current[t.id]
          }, 210)
          return { ...t, exiting: true }
        }
        return t
      })

      // Add new toasts
      const added = toasts
        .filter((t) => !prevIds.has(t.id))
        .map((t) => ({ ...t, exiting: false }))

      return [...updated, ...added]
    })
  }, [toasts])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => { Object.values(exitTimers.current).forEach(clearTimeout) }
  }, [])

  function handleDismiss(id: string) {
    removeToast(id)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
    >
      {displayed.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            t.exiting ? 'toast-exit' : 'toast-enter'
          } ${
            t.type === 'success' ? 'bg-nba-success text-black' :
            t.type === 'error' ? 'bg-nba-danger text-white' :
            'bg-nba-surface-2 text-nba-text border border-nba-border'
          }`}
        >
          <span>{t.message}</span>
          <button onClick={() => handleDismiss(t.id)} className="ml-auto opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
