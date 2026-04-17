import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect, useRef, Component } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useAuth } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Nav } from './components/Nav'
import { Toast } from './components/Toast'
import { OnboardingTour } from './components/OnboardingTour'
import { Login } from './pages/Login'
import { Unauthorized } from './pages/Unauthorized'
import { LoadingBasketball } from './components/LoadingBasketball'
import { premiumTween } from './lib/motion'
import { useOnboarding } from './hooks/useOnboarding'

class RouteCrashBoundary extends Component<
  { routeName: string; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error(`[route] ${this.props.routeName} crashed`, error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-start justify-center px-4 pt-6 pb-24">
          <div
            style={{
              width: '100%',
              maxWidth: 980,
              background: 'var(--nba-surface)',
              border: '1px solid rgba(255,138,101,0.24)',
              borderRadius: 12,
              padding: '1rem',
            }}
          >
            <div className="font-condensed font-bold" style={{ color: '#ff8a65', fontSize: '1.1rem', lineHeight: 1.05, marginBottom: 8 }}>
              {this.props.routeName} temporariamente indisponível
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Essa tela foi isolada para não derrubar o restante do aplicativo. Você ainda pode navegar pelas outras abas enquanto ajustamos o erro.
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Patch <a> clicks inside BrowserRouter to use View Transitions API when available
function ViewTransitionHandler() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationRef = useRef(location)
  useEffect(() => { locationRef.current = location }, [location])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (anchor.target || anchor.download || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const path = url.pathname + url.search + url.hash
      if (path === locationRef.current.pathname + locationRef.current.search + locationRef.current.hash) return
      if (!('startViewTransition' in document)) return
      e.preventDefault()
      ;(document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
        navigate(path)
      })
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [navigate])

  return null
}

const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })))
const Analysis = lazy(() => import('./pages/Analysis').then((module) => ({ default: module.Analysis })))
const BracketEditor = lazy(() => import('./pages/BracketEditor').then((module) => ({ default: module.BracketEditor })))
const OfficialBracket = lazy(() => import('./pages/OfficialBracket').then((module) => ({ default: module.OfficialBracket })))
const Ranking = lazy(() => import('./pages/Ranking').then((module) => ({ default: module.Ranking })))
const Compare = lazy(() => import('./pages/Compare').then((module) => ({ default: module.Compare })))
const Games = lazy(() => import('./pages/Games').then((module) => ({ default: module.Games })))
const SimulationLab = lazy(() => import('./pages/SimulationLab').then((module) => ({ default: module.SimulationLab })))
const Admin = lazy(() => import('./pages/Admin').then((module) => ({ default: module.Admin })))
const Profile = lazy(() => import('./pages/Profile').then((module) => ({ default: module.Profile })))

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingBasketball size={36} />
    </div>
  )
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
      transition={premiumTween}
      style={{ minHeight: '100vh' }}
    >
      {children}
    </motion.div>
  )
}

function AppRoutes({
  auth,
  participantId,
  isAdmin,
}: {
  auth: ReturnType<typeof useAuth>['auth']
  participantId: string
  isAdmin: boolean
}) {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <ProtectedRoute auth={auth}>
              <PageTransition>
                <Home participantId={participantId} />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analysis"
          element={
            <ProtectedRoute auth={auth}>
              <RouteCrashBoundary routeName="Análise">
                <PageTransition>
                  <Analysis />
                </PageTransition>
              </RouteCrashBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bracket"
          element={
            <ProtectedRoute auth={auth} blockGuest>
              <PageTransition>
                <BracketEditor participantId={participantId} />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/games"
          element={
            <ProtectedRoute auth={auth} blockGuest>
              <PageTransition>
                <Games participantId={participantId} />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/official"
          element={
            <ProtectedRoute auth={auth}>
              <PageTransition>
                <OfficialBracket isAdmin={isAdmin} />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ranking"
          element={
            <ProtectedRoute auth={auth}>
              <PageTransition>
                <Ranking participantId={participantId} />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/compare"
          element={
            <ProtectedRoute auth={auth}>
              <PageTransition>
                <Compare />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/simulacao"
          element={
            <ProtectedRoute auth={auth} blockGuest>
              <PageTransition>
                <SimulationLab participantId={participantId} isAdmin={isAdmin} />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute auth={auth} requireAdmin>
              <PageTransition>
                <Admin participantId={participantId} />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute auth={auth}>
              <PageTransition>
                <Profile />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  const { auth, signInWithGoogle, signOut, enterAsGuest } = useAuth()
  const { show, complete } = useOnboarding()

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
          <Route path="/login" element={<Login onSignIn={signInWithGoogle} onEnterAsGuest={enterAsGuest} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }

  if (auth.status === 'unauthorized') {
    return <Unauthorized email={auth.email} onSignOut={signOut} />
  }

  const participantId = auth.status === 'authorized' ? auth.participantId : ''
  const isAdmin = auth.status === 'authorized' ? auth.isAdmin : false

  return (
    <BrowserRouter>
      <ViewTransitionHandler />
      <Toast />
      <Suspense fallback={<RouteFallback />}>
        <AppRoutes auth={auth} participantId={participantId} isAdmin={isAdmin} />
      </Suspense>
      {auth.status === 'authorized' && show && (
        <OnboardingTour
          show={show}
          onComplete={complete}
          profilePath={`/profile/${participantId}`}
        />
      )}
      <Nav auth={auth} onSignOut={signOut} />
    </BrowserRouter>
  )
}
