import { useEffect, useState } from 'react'

interface Props {
  targetDate: string
  label?: string
}

function pad(n: number) { return String(n).padStart(2, '0') }

export function CountdownTimer({ targetDate, label = 'Até o início' }: Props) {
  const [diff, setDiff] = useState(0)

  useEffect(() => {
    function update() {
      setDiff(Math.max(0, new Date(targetDate).getTime() - Date.now()))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  if (diff === 0) return <span className="text-nba-muted text-sm">Iniciado</span>

  const hours = Math.floor(diff / 3_600_000)
  const mins = Math.floor((diff % 3_600_000) / 60_000)
  const secs = Math.floor((diff % 60_000) / 1_000)

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-nba-muted mb-1">{label}</span>
      <span className="font-condensed text-nba-gold text-lg font-semibold">
        {pad(hours)}:{pad(mins)}:{pad(secs)}
      </span>
    </div>
  )
}
