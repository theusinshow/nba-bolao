import { useState } from 'react'

interface Props {
  size?: number
  style?: React.CSSProperties
}

export function HomeCourtBadge({ size = 16, style }: Props) {
  const [show, setShow] = useState(false)

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', cursor: 'default', flexShrink: 0, ...style }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <img
        src="/svg-mando.svg"
        width={size}
        height={size}
        alt=""
        style={{ display: 'block' }}
      />
      {show && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            background: 'var(--nba-surface-2)',
            border: '1px solid var(--nba-border)',
            borderRadius: 6,
            padding: '5px 10px',
            fontSize: '0.72rem',
            fontFamily: "'Barlow Condensed', condensed, sans-serif",
            letterSpacing: '0.05em',
            textTransform: 'uppercase' as const,
            color: 'var(--nba-gold)',
            pointerEvents: 'none',
            zIndex: 9999,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}
        >
          Mando de quadra
        </div>
      )}
    </div>
  )
}
