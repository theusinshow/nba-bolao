import { Navigate } from 'react-router-dom'
import type { AuthState } from '../hooks/useAuth'
import { LoadingBasketball } from './LoadingBasketball'

interface Props {
  auth: AuthState
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ auth, children, requireAdmin = false }: Props) {
  if (auth.status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingBasketball size={32} />
      </div>
    )
  }
  if (auth.status === 'unauthenticated') return <Navigate to="/login" replace />
  if (auth.status === 'unauthorized') return <Navigate to="/unauthorized" replace />
  if (requireAdmin && !auth.isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}
