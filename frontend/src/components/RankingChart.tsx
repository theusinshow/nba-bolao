import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ParticipantScoreBreakdown, RankingEntry } from '../types'

interface Props {
  ranking: RankingEntry[]
  breakdowns: Record<string, ParticipantScoreBreakdown>
}

type GroupMode = 'daily' | '3days' | 'weekly'

interface ScoreEvent {
  date: string
  points: number
}

const PLAYER_COLORS = ['#4a90d9', '#ff6b6b', '#f4b942', '#2ecc71', '#ff7a18', '#5ac8d8', '#b86cf2', '#d4c23a', '#7f8db8']

function buildUniqueChartLabels(names: string[]) {
  const firstNameCounts = new Map<string, number>()
  for (const name of names) {
    const firstName = name.split(' ')[0] || name
    firstNameCounts.set(firstName, (firstNameCounts.get(firstName) ?? 0) + 1)
  }

  const usedLabels = new Set<string>()

  return names.map((name) => {
    const parts = name.split(' ').filter(Boolean)
    const firstName = parts[0] || name

    if ((firstNameCounts.get(firstName) ?? 0) === 1) {
      usedLabels.add(firstName)
      return firstName
    }

    let label = parts.length > 1 ? `${firstName} ${parts[parts.length - 1][0]}.` : firstName
    let suffix = 2
    while (usedLabels.has(label)) {
      label = `${firstName} ${suffix}`
      suffix += 1
    }

    usedLabels.add(label)
    return label
  })
}

function formatDateLabel(dateValue: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(dateValue))
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function bucketDate(dateValue: string, mode: GroupMode) {
  const date = startOfDay(new Date(dateValue))

  if (mode === 'daily') {
    return date.toISOString()
  }

  if (mode === '3days') {
    const start = new Date(date)
    const dayOfMonth = start.getDate()
    const offset = (dayOfMonth - 1) % 3
    start.setDate(dayOfMonth - offset)
    return start.toISOString()
  }

  const start = new Date(date)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff)
  return start.toISOString()
}

function groupLabel(bucket: string, mode: GroupMode) {
  const start = new Date(bucket)

  if (mode === 'daily') return formatDateLabel(bucket)

  const end = new Date(start)
  end.setDate(start.getDate() + (mode === '3days' ? 2 : 6))
  return `${formatDateLabel(start.toISOString())} - ${formatDateLabel(end.toISOString())}`
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: '7px 11px',
        border: `1px solid ${active ? 'rgba(200,150,60,0.35)' : 'rgba(200,150,60,0.12)'}`,
        background: active ? 'rgba(200,150,60,0.12)' : 'rgba(12,12,18,0.34)',
        color: active ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
        fontSize: '0.74rem',
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

interface TooltipPayloadItem {
  dataKey: string
  value: number
  color: string
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  const sorted = [...payload].sort((left, right) => (right.value ?? 0) - (left.value ?? 0))

  return (
    <div
      style={{
        background: '#13131a',
        border: '1px solid rgba(200,150,60,0.3)',
        borderRadius: 10,
        padding: '10px 12px',
        minWidth: 190,
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
      }}
    >
      <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '0.92rem', marginBottom: 8 }}>
        {label}
      </div>

      <div style={{ display: 'grid', gap: 5 }}>
        {sorted.map((entry) => (
          <div
            key={entry.dataKey}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: '0.76rem' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--nba-text-muted)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '999px', background: entry.color, flexShrink: 0 }} />
              {entry.dataKey}
            </span>
            <strong style={{ color: entry.color }}>{entry.value} pts</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload?.length) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginBottom: 14, fontSize: '0.75rem' }}>
      {payload.map((item, index) => {
        const isLeader = index === 0
        return (
          <span
            key={item.value}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              color: isLeader ? 'var(--nba-text)' : 'var(--nba-text-muted)',
              fontWeight: isLeader ? 700 : 400,
              opacity: isLeader ? 1 : 0.72,
            }}
          >
            <span style={{ width: isLeader ? 10 : 7, height: isLeader ? 3.5 : 2.5, borderRadius: 2, background: item.color, flexShrink: 0 }} />
            {item.value}
          </span>
        )
      })}
    </div>
  )
}

export function RankingChart({ ranking, breakdowns }: Props) {
  const [isMobile, setIsMobile] = useState(false)
  const [groupMode, setGroupMode] = useState<GroupMode>('3days')

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)')
    const onChange = () => setIsMobile(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const topParticipants = useMemo(
    () => ranking.slice(0, isMobile ? 6 : 9),
    [isMobile, ranking]
  )

  const participantLabels = useMemo(
    () => buildUniqueChartLabels(topParticipants.map((participant) => participant.participant_name)),
    [topParticipants]
  )

  const participantEvents = useMemo(() => {
    return topParticipants.map((participant, index) => {
      const breakdown = breakdowns[participant.participant_id]
      const events: ScoreEvent[] = []

      if (breakdown) {
        for (const item of breakdown.game_breakdown) {
          if (!item.event_date || item.points <= 0) continue
          events.push({ date: item.event_date, points: item.points })
        }

        for (const item of breakdown.series_breakdown) {
          if (!item.event_date || item.points <= 0) continue
          events.push({ date: item.event_date, points: item.points })
        }
      }

      return {
        id: participant.participant_id,
        name: participantLabels[index],
        events,
      }
    })
  }, [breakdowns, participantLabels, topParticipants])

  const buckets = useMemo(() => {
    const keys = new Set<string>()
    for (const participant of participantEvents) {
      for (const event of participant.events) {
        keys.add(bucketDate(event.date, groupMode))
      }
    }

    return [...keys].sort((left, right) => new Date(left).getTime() - new Date(right).getTime())
  }, [groupMode, participantEvents])

  const data = useMemo(() => {
    return buckets.map((bucket) => {
      const row: Record<string, number | string> = {
        step: groupLabel(bucket, groupMode),
      }

      for (const participant of participantEvents) {
        let total = 0
        for (const event of participant.events) {
          const eventBucket = bucketDate(event.date, groupMode)
          if (new Date(eventBucket).getTime() <= new Date(bucket).getTime()) {
            total += event.points
          }
        }
        row[participant.name] = total
      }

      return row
    })
  }, [buckets, groupMode, participantEvents])

  const chartWidth = Math.max(760, data.length * (isMobile ? 72 : 96))

  if (topParticipants.length === 0 || data.length === 0) {
    return (
      <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem' }}>
        Ainda não há dados suficientes para desenhar a corrida de pontuação.
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem' }}>
          Evolução cumulativa agrupada por tempo para reduzir o comprimento do gráfico.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <FilterChip label="Diário" active={groupMode === 'daily'} onClick={() => setGroupMode('daily')} />
          <FilterChip label="3 dias" active={groupMode === '3days'} onClick={() => setGroupMode('3days')} />
          <FilterChip label="Semanal" active={groupMode === 'weekly'} onClick={() => setGroupMode('weekly')} />
        </div>
      </div>

      <div style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: 4 }}>
        <div style={{ width: chartWidth, height: isMobile ? 300 : 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 24, left: isMobile ? 0 : 8, bottom: 8 }}>
              <CartesianGrid stroke="rgba(200,150,60,0.10)" vertical={false} />
              <XAxis
                dataKey="step"
                tick={{ fill: '#8f95a3', fontSize: isMobile ? 10 : 11 }}
                axisLine={{ stroke: 'rgba(200,150,60,0.14)' }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fill: '#8f95a3', fontSize: isMobile ? 10 : 11 }}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 28 : 36}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="left" content={<CustomLegend />} />

              {participantEvents.map((participant, index) => {
                const color = PLAYER_COLORS[index % PLAYER_COLORS.length]
                const isLeader = index === 0
                const opacity = isLeader ? 1 : 0.62

                return (
                  <Line
                    key={participant.id}
                    type="linear"
                    dataKey={participant.name}
                    stroke={color}
                    strokeWidth={isLeader ? 3.5 : 1.5}
                    strokeOpacity={opacity}
                    dot={{ r: isLeader ? 3 : (isMobile ? 1.5 : 2), strokeWidth: 0, fill: color, fillOpacity: opacity }}
                    activeDot={{ r: isLeader ? 5 : 3.5, strokeWidth: 0 }}
                    connectNulls
                    isAnimationActive
                  >
                    <LabelList
                      dataKey={participant.name}
                      position="top"
                      offset={6}
                      style={{ fill: color, fontSize: isMobile ? 9 : 10, fontWeight: isLeader ? 800 : 600, opacity }}
                      formatter={(value: number, _entry: unknown, labelIndex: number) => (labelIndex === data.length - 1 ? value : '')}
                    />
                  </Line>
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
