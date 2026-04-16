import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, GitBranch, Calendar, BarChart2, ArrowLeftRight, LogOut, Menu, TestTube2, X, Shield, Activity, Sparkles, UserCircle } from 'lucide-react'
import type { AuthState } from '../hooks/useAuth'
import { restartOnboardingTour } from '../hooks/useOnboarding'

interface Props {
  auth: AuthState
  onSignOut: () => void
}

const primaryLinks = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/analysis', icon: Activity, label: 'Análise' },
  { to: '/bracket', icon: GitBranch, label: 'Bracket' },
  { to: '/games', icon: Calendar, label: 'Jogos' },
  { to: '/ranking', icon: BarChart2, label: 'Ranking' },
]

const guestPrimaryLinks = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/analysis', icon: Activity, label: 'Análise' },
  { to: '/official', icon: GitBranch, label: 'Bracket' },
  { to: '/ranking', icon: BarChart2, label: 'Ranking' },
]

export function Nav({ auth, onSignOut }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isGuest = auth.status === 'guest'
  const name = auth.status === 'authorized' ? auth.user.user_metadata.full_name ?? '' : ''
  const avatar = auth.status === 'authorized' ? auth.user.user_metadata.avatar_url : null
  const isAdmin = auth.status === 'authorized' ? auth.isAdmin : false
  const shortName = name.split(' ').filter(Boolean)[0] ?? 'Participante'
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join('')
    .toUpperCase()

  return (
    <>
      {menuOpen && (
        <>
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 45,
              background: 'rgba(0,0,0,0.6)',
            }}
          />
          <div
            style={{
              position: 'fixed',
              right: 12,
              bottom: 'calc(88px + env(safe-area-inset-bottom))',
              width: 'min(92vw, 320px)',
              zIndex: 46,
              background: 'rgba(19,19,26,0.98)',
              border: '1px solid rgba(200,150,60,0.16)',
              borderRadius: 16,
              padding: 14,
              boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <img
                  src="/logo-bolao-nba-512.png"
                  alt="Logo do Bolão NBA"
                  style={{
                    width: 38,
                    height: 38,
                    objectFit: 'contain',
                    flexShrink: 0,
                    filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.28))',
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--nba-text)', fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Bolão NBA
                  </div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
                    {shortName} • Menu rápido
                  </div>
                </div>
              </div>

              <button
                onClick={() => setMenuOpen(false)}
                style={{
                  border: '1px solid rgba(200,150,60,0.12)',
                  background: 'rgba(28,28,38,0.9)',
                  color: 'var(--nba-text-muted)',
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {isGuest && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(74,144,217,0.08)',
                    border: '1px solid rgba(74,144,217,0.18)',
                  }}
                >
                  <div style={{ color: 'var(--nba-east)', fontWeight: 700, fontSize: '0.82rem', marginBottom: 3 }}>
                    Modo visitante
                  </div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', lineHeight: 1.4 }}>
                    Você está visualizando o bolão sem uma conta. Para palpitar, entre com Google.
                  </div>
                </div>
              )}

              {!isGuest && (
                <>
                  <NavLink
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px',
                      borderRadius: 12, textDecoration: 'none',
                      color: isActive ? 'var(--nba-gold)' : 'var(--nba-text)',
                      background: isActive ? 'rgba(200,150,60,0.12)' : 'rgba(12,12,18,0.34)',
                      border: `1px solid ${isActive ? 'rgba(200,150,60,0.22)' : 'rgba(200,150,60,0.08)'}`,
                    })}
                  >
                    <UserCircle size={16} />
                    <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>Meu perfil</span>
                  </NavLink>

                  <NavLink
                    to="/compare"
                    onClick={() => setMenuOpen(false)}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px',
                      borderRadius: 12, textDecoration: 'none',
                      color: isActive ? 'var(--nba-gold)' : 'var(--nba-text)',
                      background: isActive ? 'rgba(200,150,60,0.12)' : 'rgba(12,12,18,0.34)',
                      border: `1px solid ${isActive ? 'rgba(200,150,60,0.22)' : 'rgba(200,150,60,0.08)'}`,
                    })}
                  >
                    <ArrowLeftRight size={16} />
                    <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>Comparar brackets</span>
                  </NavLink>

                  <NavLink
                    to="/simulacao"
                    onClick={() => setMenuOpen(false)}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px',
                      borderRadius: 12, textDecoration: 'none',
                      color: isActive ? 'var(--nba-east)' : 'var(--nba-text)',
                      background: isActive ? 'rgba(74,144,217,0.12)' : 'rgba(12,12,18,0.34)',
                      border: `1px solid ${isActive ? 'rgba(74,144,217,0.22)' : 'rgba(200,150,60,0.08)'}`,
                    })}
                  >
                    <TestTube2 size={16} />
                    <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>Simulação</span>
                  </NavLink>

                  {isAdmin && (
                    <NavLink
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      style={({ isActive }) => ({
                        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px',
                        borderRadius: 12, textDecoration: 'none',
                        color: isActive ? 'var(--nba-gold)' : 'var(--nba-text)',
                        background: isActive ? 'rgba(200,150,60,0.12)' : 'rgba(12,12,18,0.34)',
                        border: `1px solid ${isActive ? 'rgba(200,150,60,0.22)' : 'rgba(200,150,60,0.08)'}`,
                      })}
                    >
                      <Shield size={16} />
                      <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>Admin</span>
                    </NavLink>
                  )}

                  <button
                    onClick={() => { setMenuOpen(false); restartOnboardingTour() }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px',
                      borderRadius: 12, border: '1px solid rgba(200,150,60,0.18)',
                      background: 'rgba(200,150,60,0.08)', color: 'var(--nba-gold)',
                      cursor: 'pointer', fontWeight: 600, fontSize: '0.86rem',
                    }}
                  >
                    <Sparkles size={16} />
                    Ver tour novamente
                  </button>
                </>
              )}

              <button
                onClick={onSignOut}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px',
                  borderRadius: 12,
                  border: `1px solid ${isGuest ? 'rgba(74,144,217,0.22)' : 'rgba(231,76,60,0.18)'}`,
                  background: isGuest ? 'rgba(74,144,217,0.08)' : 'rgba(231,76,60,0.08)',
                  color: isGuest ? 'var(--nba-east)' : 'var(--nba-danger)',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.86rem',
                }}
              >
                <LogOut size={16} />
                {isGuest ? 'Sair do modo visitante' : 'Sair da conta'}
              </button>
            </div>
          </div>
        </>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2"
        style={{
          background: 'linear-gradient(to top, rgba(10,10,15,0.98), rgba(10,10,15,0.92))',
          borderTop: '1px solid rgba(200,150,60,0.14)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            maxWidth: 1080,
            margin: '0 auto',
            padding: '8px 10px',
            borderRadius: 16,
            border: '1px solid rgba(200,150,60,0.12)',
            background: 'rgba(19,19,26,0.9)',
            boxShadow: '0 -8px 24px rgba(0,0,0,0.22)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1 }}>
            {(isGuest ? guestPrimaryLinks : primaryLinks).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              id={to === '/ranking' ? 'ranking-nav' : undefined}
              end={to === '/'}
              style={({ isActive }) => ({
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '8px 6px',
                borderRadius: 12,
                color: isActive ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
                textDecoration: 'none',
                background: isActive ? 'rgba(200,150,60,0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(200,150,60,0.22)' : '1px solid transparent',
                transition: 'all 0.18s ease',
                boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.03)' : 'none',
              })}
            >
              {({ isActive }) => (
                <>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isActive ? 'rgba(200,150,60,0.14)' : 'transparent',
                    }}
                  >
                    <Icon size={18} />
                  </span>
                  <span
                    className="font-condensed"
                    style={{
                      fontSize: '0.68rem',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
            ))}
          </div>

          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              paddingLeft: 10,
              marginLeft: 4,
              borderLeft: '1px solid rgba(200,150,60,0.1)',
              flexShrink: 0,
              background: menuOpen ? 'rgba(200,150,60,0.08)' : 'transparent',
              border: menuOpen ? '1px solid rgba(200,150,60,0.22)' : '1px solid transparent',
              borderRadius: 12,
              padding: '6px 8px 6px 10px',
              cursor: 'pointer',
              transition: 'background 0.18s ease, border-color 0.18s ease',
            }}
            title="Abrir menu"
          >
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '999px',
                  border: menuOpen ? '1.5px solid var(--nba-gold)' : '1.5px solid rgba(200,150,60,0.28)',
                  objectFit: 'cover',
                  transition: 'border-color 0.18s ease',
                }}
              />
            ) : (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '999px',
                  background: 'rgba(200,150,60,0.14)',
                  border: menuOpen ? '1.5px solid var(--nba-gold)' : '1.5px solid rgba(200,150,60,0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.68rem',
                  color: 'var(--nba-gold)',
                  fontWeight: 700,
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}
              >
                {initials || '?'}
              </div>
            )}
            <Menu
              size={15}
              style={{
                color: menuOpen ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
                transition: 'color 0.18s ease',
              }}
            />
          </button>
        </div>
      </nav>
    </>
  )
}
