import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import type { RankingEntry } from '../types'

interface Props {
  ranking: RankingEntry[]
}

export function RankingChart({ ranking }: Props) {
  const data = ranking.slice(0, 9).map((e) => ({
    name: e.participant_name.split(' ')[0],
    R1: e.round1_points,
    R2: e.round2_points,
    CF: e.round3_points,
    Finals: e.round4_points,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,150,60,0.1)" />
        <XAxis dataKey="name" tick={{ fill: '#888899', fontSize: 11 }} />
        <YAxis tick={{ fill: '#888899', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#13131a', border: '1px solid rgba(200,150,60,0.3)', borderRadius: 8 }}
          labelStyle={{ color: '#f0f0f0' }}
          itemStyle={{ color: '#e8b45a' }}
        />
        <Legend wrapperStyle={{ color: '#888899', fontSize: 12 }} />
        <Bar dataKey="R1" stackId="a" fill="#4a90d9" />
        <Bar dataKey="R2" stackId="a" fill="#c8963c" />
        <Bar dataKey="CF" stackId="a" fill="#e05c3a" />
        <Bar dataKey="Finals" stackId="a" fill="#e8b45a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
