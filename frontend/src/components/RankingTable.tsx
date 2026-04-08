import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import type { RankingEntry } from '../types'

interface Props {
  ranking: RankingEntry[]
  highlightId?: string
}

export function RankingTable({ ranking, highlightId }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-nba-muted text-xs font-condensed uppercase border-b border-nba-border">
            <th className="py-2 px-3 text-left">#</th>
            <th className="py-2 px-3 text-left">Participante</th>
            <th className="py-2 px-3 text-right">Total</th>
            <th className="py-2 px-3 text-right hidden sm:table-cell">R1</th>
            <th className="py-2 px-3 text-right hidden sm:table-cell">R2</th>
            <th className="py-2 px-3 text-right hidden sm:table-cell">CF</th>
            <th className="py-2 px-3 text-right hidden sm:table-cell">Finals</th>
            <th className="py-2 px-3 text-right hidden md:table-cell">Cravadas</th>
            <th className="py-2 px-3 text-right hidden md:table-cell">Séries%</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((e, idx) => {
            const isHighlight = e.participant_id === highlightId
            const rankDiff = e.prev_rank != null ? e.prev_rank - e.rank : 0
            const seriesPct = e.series_total > 0 ? Math.round((e.series_correct / e.series_total) * 100) : 0

            return (
              <tr
                key={e.participant_id}
                className="border-b border-nba-border transition-colors hover:bg-nba-surface-2"
                style={{
                  background: isHighlight
                    ? 'var(--nba-surface-2)'
                    : idx % 2 === 1
                    ? 'rgba(255,255,255,0.02)'
                    : 'transparent',
                }}
              >
                <td className="py-3 px-3 font-condensed font-bold text-nba-gold">{e.rank}</td>
                <td className="py-3 px-3 flex items-center gap-2">
                  <span>{e.participant_name}</span>
                  {rankDiff > 0 && <ArrowUp size={12} className="text-nba-success" />}
                  {rankDiff < 0 && <ArrowDown size={12} className="text-nba-danger" />}
                  {rankDiff === 0 && e.prev_rank != null && <Minus size={12} className="text-nba-muted" />}
                </td>
                <td className="py-3 px-3 text-right font-bold font-condensed text-nba-gold">{e.total_points}</td>
                <td className="py-3 px-3 text-right hidden sm:table-cell text-nba-muted font-condensed">{e.round1_points}</td>
                <td className="py-3 px-3 text-right hidden sm:table-cell text-nba-muted font-condensed">{e.round2_points}</td>
                <td className="py-3 px-3 text-right hidden sm:table-cell text-nba-muted font-condensed">{e.round3_points}</td>
                <td className="py-3 px-3 text-right hidden sm:table-cell text-nba-muted font-condensed">{e.round4_points}</td>
                <td className="py-3 px-3 text-right hidden md:table-cell font-condensed">
                  <span className={e.cravadas > 0 ? 'text-nba-gold font-bold' : 'text-nba-muted'}>{e.cravadas}</span>
                </td>
                <td className="py-3 px-3 text-right hidden md:table-cell font-condensed text-nba-muted">
                  {seriesPct}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
