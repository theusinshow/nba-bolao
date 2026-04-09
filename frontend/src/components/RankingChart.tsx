import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import type { RankingEntry } from '../types'

interface Props {
  ranking: RankingEntry[]
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

const ROUND_COLORS: Record<string, string> = {
  R1:     '#4a90d9',
  R2:     '#c8963c',
  CF:     '#e05c3a',
  Finals: '#e8b45a',
}

interface TooltipPayloadItem {
  dataKey: string
  value: number
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  const total = payload.reduce((sum, e) => sum + (e.value ?? 0), 0)
  const rounds = payload.filter((e) => (e.value ?? 0) > 0)

  return (
    <div
      style={{
        background: '#13131a',
        border: '1px solid rgba(200,150,60,0.35)',
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 170,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      {/* Name */}
      <p
        style={{
          color: '#f0f0f0',
          fontFamily: "'Bebas Neue', cursive",
          letterSpacing: 1.5,
          fontSize: '1rem',
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: '1px solid rgba(200,150,60,0.15)',
        }}
      >
        {label}
      </p>

      {/* Points per round */}
      {rounds.map((entry) => (
        <div
          key={entry.dataKey}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 20,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#888899',
              fontSize: '0.78rem',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: entry.color,
                flexShrink: 0,
              }}
            />
            {entry.dataKey}
          </span>
          <span
            style={{
              color: entry.color,
              fontWeight: 700,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: '0.9rem',
            }}
          >
            {entry.value} pts
          </span>
        </div>
      ))}

      {rounds.length === 0 && (
        <p style={{ color: '#888899', fontSize: '0.78rem' }}>Sem pontos ainda</p>
      )}

      {/* Total */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 6,
          paddingTop: 6,
          borderTop: '1px solid rgba(200,150,60,0.2)',
        }}
      >
        <span style={{ color: '#888899', fontSize: '0.78rem' }}>Total</span>
        <span
          style={{
            color: '#c8963c',
            fontWeight: 700,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '1rem',
          }}
        >
          {total} pts
        </span>
      </div>
    </div>
  )
}

// ─── Custom legend ────────────────────────────────────────────────────────────

function CustomLegend() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '8px 16px',
        marginTop: 8,
        fontSize: '0.75rem',
        color: '#888899',
        fontFamily: "'Barlow Condensed', sans-serif",
      }}
    >
      {Object.entries(ROUND_COLORS).map(([key, color]) => (
        <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: color,
              flexShrink: 0,
            }}
          />
          {key}
        </span>
      ))}
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RankingChart({ ranking }: Props) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)')
    const onChange = () => setIsMobile(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const data = ranking.slice(0, isMobile ? 5 : 9).map((e) => ({
    name:   e.participant_name.split(' ')[0],
    R1:     e.round1_points,
    R2:     e.round2_points,
    CF:     e.round3_points,
    Finals: e.round4_points,
  }))

  return (
    <ResponsiveContainer width="100%" height={isMobile ? 220 : 260}>
      <BarChart
        data={data}
        margin={{ top: 4, right: isMobile ? 0 : 8, left: isMobile ? -24 : -16, bottom: 0 }}
        barCategoryGap={isMobile ? '30%' : '22%'}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(200,150,60,0.08)"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fill: '#888899', fontSize: isMobile ? 10 : 11, fontFamily: "'Barlow Condensed', sans-serif" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#888899', fontSize: isMobile ? 10 : 11, fontFamily: "'Barlow Condensed', sans-serif" }}
          axisLine={false}
          tickLine={false}
          width={isMobile ? 24 : 32}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(200,150,60,0.06)' }}
        />
        <Legend content={<CustomLegend />} />

        <Bar dataKey="R1"     stackId="a" fill={ROUND_COLORS.R1}     isAnimationActive />
        <Bar dataKey="R2"     stackId="a" fill={ROUND_COLORS.R2}     isAnimationActive />
        <Bar dataKey="CF"     stackId="a" fill={ROUND_COLORS.CF}     isAnimationActive />
        <Bar dataKey="Finals" stackId="a" fill={ROUND_COLORS.Finals} isAnimationActive radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
