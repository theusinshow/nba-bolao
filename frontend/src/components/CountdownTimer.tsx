import { useEffect, useState } from 'react'

interface Props {
  targetDate: string
  label?: string
  /** Se true, fica vermelho quando restar menos de 1 hora */
  urgentUnderOneHour?: boolean
  className?: string
}

function pad(n: number) { return String(n).padStart(2, '0') }

export function CountdownTimer({ targetDate, label, urgentUnderOneHour = false, className }: Props) {
  const [diff, setDiff] = useState(() =>
    Math.max(0, new Date(targetDate).getTime() - Date.now())
  )

  useEffect(() => {
    const id = setInterval(() => {
      setDiff(Math.max(0, new Date(targetDate).getTime() - Date.now()))
    }, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  if (diff === 0) {
    return (
      <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem' }}>
        Iniciado
      </span>
    )
  }

  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1_000)
  const isUrgent = urgentUnderOneHour && diff < 3_600_000

  const timeStr = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} className={className}>
      {label && (
        <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 2 }}>
          {label}
        </span>
      )}
      <span
        className="font-condensed font-bold"
        style={{
          color: isUrgent ? 'var(--nba-danger)' : 'var(--nba-gold)',
          fontSize: '0.95rem',
          lineHeight: 1,
          transition: 'color 0.3s ease',
        }}
      >
        {timeStr}
      </span>
      {isUrgent && (
        <span style={{ color: 'var(--nba-danger)', fontSize: '0.6rem', marginTop: 1, opacity: 0.8 }}>
          em breve
        </span>
      )}
    </div>
  )
}
