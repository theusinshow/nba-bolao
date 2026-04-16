import { Navigate } from 'react-router-dom'
import type { AuthState } from '../hooks/useAuth'
import { LoadingBasketball } from './LoadingBasketball'

interface Props {
  auth: AuthState
  children: React.ReactNode
  requireAdmin?: boolean
  /** Redireciona visitantes para /ranking (rotas que exigem participantId real) */
  blockGuest?: boolean
}

export function ProtectedRoute({ auth, children, requireAdmin = false, blockGuest = false }: Props) {
  if (auth.status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingBasketball size={32} />
      </div>
    )
  }
  if (auth.status === 'unauthenticated') return <Navigate to="/login" replace />
  if (auth.status === 'unauthorized') return <Navigate to="/unauthorized" replace />
  if (auth.status === 'guest') {
    if (requireAdmin || blockGuest) return <Navigate to="/ranking" replace />
    return <>{children}</>
  }
  if (requireAdmin && !auth.isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}
