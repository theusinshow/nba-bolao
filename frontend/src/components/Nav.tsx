import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, GitBranch, Calendar, BarChart2, ArrowLeftRight, LogOut, Menu, X } from 'lucide-react'
import type { AuthState } from '../hooks/useAuth'

interface Props {
  auth: AuthState
  onSignOut: () => void
}

const primaryLinks = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/bracket', icon: GitBranch, label: 'Bracket' },
  { to: '/games', icon: Calendar, label: 'Jogos' },
  { to: '/ranking', icon: BarChart2, label: 'Ranking' },
]

export function Nav({ auth, onSignOut }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const name = auth.status === 'authorized' ? auth.user.user_metadata.full_name ?? '' : ''
  const avatar = auth.status === 'authorized' ? auth.user.user_metadata.avatar_url : null
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
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '999px',
                      border: '1px solid rgba(200,150,60,0.22)',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '999px',
                      background: 'rgba(200,150,60,0.12)',
                      border: '1px solid rgba(200,150,60,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      color: 'var(--nba-gold)',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {initials || '?'}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--nba-text)', fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {shortName}
                  </div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
                    Menu rápido
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
              <NavLink
                to="/compare"
                onClick={() => setMenuOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 12px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  color: isActive ? 'var(--nba-gold)' : 'var(--nba-text)',
                  background: isActive ? 'rgba(200,150,60,0.12)' : 'rgba(12,12,18,0.34)',
                  border: `1px solid ${isActive ? 'rgba(200,150,60,0.22)' : 'rgba(200,150,60,0.08)'}`,
                })}
              >
                <ArrowLeftRight size={16} />
                <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>Comparar brackets</span>
              </NavLink>

              <button
                onClick={onSignOut}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(231,76,60,0.18)',
                  background: 'rgba(231,76,60,0.08)',
                  color: 'var(--nba-danger)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                }}
              >
                <LogOut size={16} />
                Sair da conta
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
            {primaryLinks.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
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
              gap: 8,
              paddingLeft: 8,
              marginLeft: 4,
              borderLeft: '1px solid rgba(200,150,60,0.1)',
              flexShrink: 0,
              background: 'transparent',
              borderTop: 'none',
              borderRight: 'none',
              borderBottom: 'none',
              cursor: 'pointer',
            }}
            title="Abrir menu"
          >
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '999px',
                  border: '1px solid rgba(200,150,60,0.22)',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '999px',
                  background: 'rgba(200,150,60,0.12)',
                  border: '1px solid rgba(200,150,60,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  color: 'var(--nba-gold)',
                  fontWeight: 700,
                }}
              >
                {initials || '?'}
              </div>
            )}
            <span
              style={{
                border: '1px solid rgba(200,150,60,0.12)',
                background: 'rgba(28,28,38,0.9)',
                color: menuOpen ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
                width: 32,
                height: 32,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.18s ease',
              }}
            >
              <Menu size={15} />
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
