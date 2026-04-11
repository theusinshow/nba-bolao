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

type ChartEventKind = 'game' | 'series'

interface ChartEvent {
  key: string
  round: number
  kind: ChartEventKind
  order: number
  label: string
}

const PLAYER_COLORS = ['#4a90d9', '#ff6b6b', '#f4b942', '#2ecc71', '#ff7a18', '#5ac8d8', '#b86cf2', '#d4c23a', '#7f8db8']

function roundShortLabel(round: number): string {
  if (round === 1) return 'R1'
  if (round === 2) return 'SF'
  if (round === 3) return 'CF'
  return 'FIN'
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
        minWidth: 180,
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
      }}
    >
      <div
        className="font-condensed font-bold"
        style={{
          color: 'var(--nba-gold)',
          fontSize: '0.92rem',
          marginBottom: 8,
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>

      <div style={{ display: 'grid', gap: 5 }}>
        {sorted.map((entry) => (
          <div
            key={entry.dataKey}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              fontSize: '0.76rem',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--nba-text-muted)' }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '999px',
                  background: entry.color,
                  flexShrink: 0,
                }}
              />
              {entry.dataKey}
            </span>
            <strong style={{ color: entry.color }}>{entry.value} pts</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function CustomLegend({
  payload,
}: {
  payload?: Array<{ value: string; color: string }>
}) {
  if (!payload?.length) return null

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px 14px',
        marginBottom: 12,
        fontSize: '0.75rem',
        color: 'var(--nba-text-muted)',
      }}
    >
      {payload.map((item) => (
        <span key={item.value} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '999px',
              background: item.color,
              flexShrink: 0,
            }}
          />
          {item.value}
        </span>
      ))}
    </div>
  )
}

export function RankingChart({ ranking, breakdowns }: Props) {
  const [isMobile, setIsMobile] = useState(false)

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

  const events = useMemo<ChartEvent[]>(() => {
    const eventMap = new Map<string, ChartEvent>()

    for (const participant of topParticipants) {
      const breakdown = breakdowns[participant.participant_id]
      if (!breakdown) continue

      for (const item of breakdown.game_breakdown) {
        const key = `game:${item.round}:${item.series_id}:${item.game_number}`
        if (!eventMap.has(key)) {
          eventMap.set(key, {
            key,
            round: item.round,
            kind: 'game',
            order: item.game_number,
            label: `${roundShortLabel(item.round)}-${item.game_number}`,
          })
        }
      }

      for (const item of breakdown.series_breakdown) {
        const key = `series:${item.round}:${item.series_id}`
        if (!eventMap.has(key)) {
          eventMap.set(key, {
            key,
            round: item.round,
            kind: 'series',
            order: 100 + (item.position ?? 99),
            label: `${roundShortLabel(item.round)}-S`,
          })
        }
      }
    }

    return [...eventMap.values()].sort((left, right) => {
      if (left.round !== right.round) return left.round - right.round
      if (left.order !== right.order) return left.order - right.order
      return left.key.localeCompare(right.key)
    })
  }, [breakdowns, topParticipants])

  const data = useMemo(() => {
    const eventIndexByKey = new Map(events.map((event, index) => [event.key, index]))

    return events.map((event, index) => {
      const row: Record<string, number | string> = {
        step: event.label,
        fullLabel: `${event.label} ${index + 1}`,
      }

      for (const participant of topParticipants) {
        const breakdown = breakdowns[participant.participant_id]
        const shortName = participant.participant_name.split(' ')[0]
        let cumulative = 0

        if (breakdown) {
          const gamePoints = breakdown.game_breakdown
            .filter((item) => {
              const itemKey = `game:${item.round}:${item.series_id}:${item.game_number}`
              const itemIndex = eventIndexByKey.get(itemKey)
              return itemIndex != null && itemIndex <= index
            })
            .reduce((sum, item) => sum + item.points, 0)

          const seriesPoints = breakdown.series_breakdown
            .filter((item) => {
              const itemKey = `series:${item.round}:${item.series_id}`
              const itemIndex = eventIndexByKey.get(itemKey)
              return itemIndex != null && itemIndex <= index
            })
            .reduce((sum, item) => sum + item.points, 0)

          cumulative = gamePoints + seriesPoints
        }

        row[shortName] = cumulative
      }

      return row
    })
  }, [breakdowns, events, topParticipants])

  const chartWidth = Math.max(760, data.length * (isMobile ? 56 : 68))

  if (topParticipants.length === 0 || data.length === 0) {
    return (
      <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem' }}>
        Ainda não há dados suficientes para desenhar a corrida de pontuação.
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem' }}>
        Evolução cumulativa dos pontos por checkpoints de rodada, jogo e fechamento de série.
      </div>

      <div
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: 4,
        }}
      >
        <div style={{ width: chartWidth, height: isMobile ? 300 : 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 20, right: 24, left: isMobile ? 0 : 8, bottom: 8 }}
            >
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

              {topParticipants.map((participant, index) => {
                const shortName = participant.participant_name.split(' ')[0]
                const color = PLAYER_COLORS[index % PLAYER_COLORS.length]
                const isLeader = index === 0

                return (
                  <Line
                    key={participant.participant_id}
                    type="linear"
                    dataKey={shortName}
                    stroke={color}
                    strokeWidth={isLeader ? 3 : 2}
                    dot={{ r: isMobile ? 2 : 2.5, strokeWidth: 0, fill: color }}
                    activeDot={{ r: 4 }}
                    connectNulls
                    isAnimationActive
                  >
                    <LabelList
                      dataKey={shortName}
                      position="top"
                      offset={6}
                      style={{
                        fill: color,
                        fontSize: isMobile ? 9 : 10,
                        fontWeight: 700,
                      }}
                      formatter={(value: number, _entry: unknown, labelIndex: number) =>
                        labelIndex === data.length - 1 ? value : ''
                      }
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
