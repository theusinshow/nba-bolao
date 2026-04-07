import { Navigate } from 'react-router-dom'
import type { AuthState } from '../hooks/useAuth'

interface Props {
  auth: AuthState
  children: React.ReactNode
}

export function ProtectedRoute({ auth, children }: Props) {
  if (auth.status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-nba-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (auth.status === 'unauthenticated') return <Navigate to="/login" replace />
  if (auth.status === 'unauthorized') return <Navigate to="/unauthorized" replace />
  return <>{children}</>
}
