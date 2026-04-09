import { NavLink } from 'react-router-dom'
import { Home, GitBranch, Calendar, BarChart2, ArrowLeftRight, LogOut } from 'lucide-react'
import type { AuthState } from '../hooks/useAuth'

interface Props {
  auth: AuthState
  onSignOut: () => void
}

const links = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/bracket', icon: GitBranch, label: 'Bracket' },
  { to: '/games', icon: Calendar, label: 'Jogos' },
  { to: '/ranking', icon: BarChart2, label: 'Ranking' },
  { to: '/compare', icon: ArrowLeftRight, label: 'Comparar' },
]

export function Nav({ auth, onSignOut }: Props) {
  const name = auth.status === 'authorized' ? auth.user.user_metadata.full_name ?? '' : ''
  const avatar = auth.status === 'authorized' ? auth.user.user_metadata.avatar_url : null
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join('')
    .toUpperCase()

  return (
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
          {links.map(({ to, icon: Icon, label }) => (
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

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingLeft: 8,
            marginLeft: 4,
            borderLeft: '1px solid rgba(200,150,60,0.1)',
            flexShrink: 0,
          }}
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
          <button
            onClick={onSignOut}
            style={{
              border: '1px solid rgba(200,150,60,0.12)',
              background: 'rgba(28,28,38,0.9)',
              color: 'var(--nba-text-muted)',
              width: 32,
              height: 32,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
            }}
            title="Sair"
            onMouseEnter={(ev) => {
              ev.currentTarget.style.color = 'var(--nba-danger)'
              ev.currentTarget.style.borderColor = 'rgba(231,76,60,0.26)'
            }}
            onMouseLeave={(ev) => {
              ev.currentTarget.style.color = 'var(--nba-text-muted)'
              ev.currentTarget.style.borderColor = 'rgba(200,150,60,0.12)'
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </nav>
  )
}
