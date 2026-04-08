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

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-2"
      style={{
        background: 'var(--nba-surface)',
        borderTop: '1px solid var(--nba-border)',
      }}
    >
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs transition-colors ${
              isActive ? 'text-nba-gold' : 'text-nba-muted hover:text-nba-text'
            }`
          }
        >
          <Icon size={20} />
          <span className="font-condensed text-[0.7rem]">{label}</span>
        </NavLink>
      ))}

      <div className="flex items-center gap-2 pl-2">
        {avatar ? (
          <img src={avatar} alt={name} className="w-7 h-7 rounded-full border border-nba-border" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-nba-surface-2 border border-nba-border flex items-center justify-center text-xs text-nba-gold font-bold">
            {name[0] ?? '?'}
          </div>
        )}
        <button
          onClick={onSignOut}
          className="text-nba-muted hover:text-nba-danger transition-colors"
          title="Sair"
        >
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  )
}
