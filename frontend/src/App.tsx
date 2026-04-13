import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAuth } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Nav } from './components/Nav'
import { Toast } from './components/Toast'
import { Login } from './pages/Login'
import { Unauthorized } from './pages/Unauthorized'
import { LoadingBasketball } from './components/LoadingBasketball'

const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })))
const BracketEditor = lazy(() => import('./pages/BracketEditor').then((module) => ({ default: module.BracketEditor })))
const OfficialBracket = lazy(() => import('./pages/OfficialBracket').then((module) => ({ default: module.OfficialBracket })))
const Ranking = lazy(() => import('./pages/Ranking').then((module) => ({ default: module.Ranking })))
const Compare = lazy(() => import('./pages/Compare').then((module) => ({ default: module.Compare })))
const Games = lazy(() => import('./pages/Games').then((module) => ({ default: module.Games })))
const SimulationLab = lazy(() => import('./pages/SimulationLab').then((module) => ({ default: module.SimulationLab })))
const Admin = lazy(() => import('./pages/Admin').then((module) => ({ default: module.Admin })))

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingBasketball size={36} />
    </div>
  )
}

export default function App() {
  const { auth, signInWithGoogle, signOut } = useAuth()

  if (auth.status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingBasketball size={40} />
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
      <Suspense fallback={<RouteFallback />}>
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
          <Route
            path="/simulacao"
            element={
              <ProtectedRoute auth={auth}>
                <SimulationLab participantId={participantId} isAdmin={isAdmin} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute auth={auth} requireAdmin>
                <Admin participantId={participantId} />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Nav auth={auth} onSignOut={signOut} />
    </BrowserRouter>
  )
}
