import { BADGE_DEFINITIONS, sortBadges } from '../hooks/useParticipantBadges'

interface Props {
  badgeIds: string[]
  max?: number          // limit for compact display in ranking
  size?: 'sm' | 'md'
}

export function BadgeList({ badgeIds, max, size = 'sm' }: Props) {
  if (badgeIds.length === 0) return null

  const sorted = sortBadges(badgeIds)
  const visible = max ? sorted.slice(0, max) : sorted
  const hidden = max ? Math.max(0, sorted.length - max) : 0
  const fontSize = size === 'md' ? '1.1rem' : '0.85rem'

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexWrap: 'nowrap' }}>
      {visible.map((id) => {
        const def = BADGE_DEFINITIONS[id]
        if (!def) return null
        return (
          <span
            key={id}
            title={`${def.label} — ${def.description}`}
            style={{ fontSize, lineHeight: 1, cursor: 'default', userSelect: 'none' }}
          >
            {def.emoji}
          </span>
        )
      })}
      {hidden > 0 && (
        <span style={{ fontSize: '0.7rem', color: 'var(--nba-text-muted)', marginLeft: 2 }}>
          +{hidden}
        </span>
      )}
    </span>
  )
}
