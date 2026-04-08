import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Nav } from './components/Nav'
import { Toast } from './components/Toast'
import { Login } from './pages/Login'
import { Unauthorized } from './pages/Unauthorized'
import { Home } from './pages/Home'
import { BracketEditor } from './pages/BracketEditor'
import { OfficialBracket } from './pages/OfficialBracket'
import { Ranking } from './pages/Ranking'
import { Compare } from './pages/Compare'
import { Games } from './pages/Games'

export default function App() {
  const { auth, signInWithGoogle, signOut } = useAuth()

  if (auth.status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-2 border-nba-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (auth.status === 'unauthenticated') {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login onSignIn={signInWithGoogle} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }

  if (auth.status === 'unauthorized') {
    return <Unauthorized email={auth.email} onSignOut={signOut} />
  }

  const { participantId, isAdmin } = auth

  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute auth={auth}>
              <Home participantId={participantId} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bracket"
          element={
            <ProtectedRoute auth={auth}>
              <BracketEditor participantId={participantId} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games"
          element={
            <ProtectedRoute auth={auth}>
              <Games participantId={participantId} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/official"
          element={
            <ProtectedRoute auth={auth}>
              <OfficialBracket isAdmin={isAdmin} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ranking"
          element={
            <ProtectedRoute auth={auth}>
              <Ranking participantId={participantId} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compare"
          element={
            <ProtectedRoute auth={auth}>
              <Compare />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Nav auth={auth} onSignOut={signOut} />
    </BrowserRouter>
  )
}
