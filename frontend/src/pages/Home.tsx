import { Link } from 'react-router-dom'
import {
  ArrowUp, ArrowDown, Minus, Trophy, Users, Target,
  AlertTriangle, Clock, TrendingUp, Star,
} from 'lucide-react'
import { useRanking } from '../hooks/useRanking'
import { useSeries } from '../hooks/useSeries'

interface Props {
  participantId: string
}

// ─── Simulated static data ────────────────────────────────────────────────────

type InjuryStatus = 'out' | 'questionable' | 'probable' | 'available'

const INJURIES: { player: string; team: string; status: InjuryStatus; detail: string }[] = [
  { player: 'Nikola Jokic', team: 'DEN', status: 'questionable', detail: 'Joelho direito' },
  { player: 'Victor Wembanyama', team: 'SAS', status: 'probable', detail: 'Fadiga' },
  { player: 'Jayson Tatum', team: 'BOS', status: 'available', detail: 'Retorno confirmado' },
  { player: 'LeBron James', team: 'LAL', status: 'questionable', detail: 'Tornozelo' },
  { player: 'Shai Gilgeous-Alexander', team: 'OKC', status: 'available', detail: '' },
]

const NEXT_GAMES = [
  { home: 'OKC', away: 'IND', date: '18/04', time: '21:30', round: 'Finals' },
  { home: 'BOS', away: 'NYK', date: '19/04', time: '15:00', round: 'R1' },
  { home: 'DEN', away: 'MIN', date: '19/04', time: '17:30', round: 'R1' },
  { home: 'NYK', away: 'DET', date: '20/04', time: '14:00', round: 'R1' },
  { home: 'GSW', away: 'HOU', date: '20/04', time: '18:00', round: 'R1' },
]

const ODDS = [
  { abbr: 'OKC', name: 'Thunder',  odds: '+180', favorite: true,  color: '#007AC1' },
  { abbr: 'BOS', name: 'Celtics',  odds: '+220', favorite: true,  color: '#007A33' },
  { abbr: 'DET', name: 'Pistons',  odds: '+300', favorite: false, color: '#C8102E' },
  { abbr: 'SAS', name: 'Spurs',    odds: '+350', favorite: false, color: '#C4CED4' },
  { abbr: 'DEN', name: 'Nuggets',  odds: '+400', favorite: false, color: '#FEC524' },
]

const INJURY_STATUS: Record<InjuryStatus, { label: string; color: string }> = {
  out:          { label: 'Out',         color: '#e74c3c' },
  questionable: { label: 'Questionável', color: '#f39c12' },
  probable:     { label: 'Provável',    color: '#27ae60' },
  available:    { label: 'Disponível',  color: '#2ecc71' },
}

const MEDAL = ['🥇', '🥈', '🥉']

// ─── Reusable mini-components ─────────────────────────────────────────────────

function CardTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon && <span style={{ color: 'var(--nba-gold)' }}>{icon}</span>}
      <h2 className="title text-base tracking-widest" style={{ color: 'var(--nba-gold)' }}>
        {children}
      </h2>
    </div>
  )
}

function StatusBadge({ status }: { status: InjuryStatus }) {
  const { label, color } = INJURY_STATUS[status]
  return (
    <span style={{
      background: `${color}22`,
      color,
      borderRadius: 4,
      padding: '1px 6px',
      fontSize: '0.68rem',
      fontWeight: 700,
      whiteSpace: 'nowrap' as const,
      flexShrink: 0,
    }}>
      {label}
    </span>
  )
}

function Divider() {
  return <div style={{ borderBottom: '1px solid var(--nba-border)' }} />
}

function SimNote({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginTop: '0.5rem' }}>
      {children}
    </p>
  )
}

// ─── Card components ──────────────────────────────────────────────────────────

function RankingCard({ ranking, loading, highlightId }: {
  ranking: ReturnType<typeof useRanking>['ranking']
  loading: boolean
  highlightId: string
}) {
  const top5 = ranking.slice(0, 5)
  return (
    <div className="card p-4">
      <CardTitle icon={<Trophy size={14} />}>Ranking Geral</CardTitle>
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-nba-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col">
          {top5.map((e, i) => {
            const isMe = e.participant_id === highlightId
            const rankDiff = e.prev_rank != null ? e.prev_rank - e.rank : 0
            return (
              <div key={e.participant_id}>
                <div
                  className="flex items-center gap-2 py-2 px-1 rounded transition-colors"
                  style={{ background: isMe ? 'var(--nba-surface-2)' : 'transparent', fontSize: '0.85rem' }}
                >
                  <span className="font-condensed font-bold w-5 text-center" style={{ color: 'var(--nba-gold)' }}>
                    {e.rank}
                  </span>
                  <span className="flex-1 truncate" style={{ color: isMe ? 'var(--nba-gold)' : 'var(--nba-text)' }}>
                    {e.participant_name}
                  </span>
                  <div className="flex items-center gap-1">
                    {rankDiff > 0 && <ArrowUp size={10} className="text-nba-success" />}
                    {rankDiff < 0 && <ArrowDown size={10} className="text-nba-danger" />}
                    {rankDiff === 0 && e.prev_rank != null && <Minus size={10} className="text-nba-muted" />}
                    <span className="font-condensed font-bold" style={{ color: 'var(--nba-gold)' }}>
                      {e.total_points}
                    </span>
                  </div>
                </div>
                {i < top5.length - 1 && <Divider />}
              </div>
            )
          })}
        </div>
      )}
      <Link
        to="/ranking"
        className="block mt-3 text-center text-xs font-condensed transition-colors hover:text-nba-gold"
        style={{
          color: 'var(--nba-text-muted)',
          borderTop: '1px solid var(--nba-border)',
          paddingTop: '0.5rem',
        }}
      >
        Ver ranking completo →
      </Link>
    </div>
  )
}

function InjuriesCard() {
  return (
    <div className="card p-4">
      <CardTitle icon={<AlertTriangle size={14} />}>Lesões e Notícias</CardTitle>
      <div className="flex flex-col">
        {INJURIES.map((item, i) => (
          <div key={item.player}>
            <div className="flex items-start gap-2 py-2" style={{ fontSize: '0.82rem' }}>
              <div className="flex-1 min-w-0">
                <div style={{ color: 'var(--nba-text)', fontWeight: 600 }} className="truncate">
                  {item.player}
                </div>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem' }}>
                  {item.team}{item.detail ? ` — ${item.detail}` : ''}
                </div>
              </div>
              <StatusBadge status={item.status} />
            </div>
            {i < INJURIES.length - 1 && <Divider />}
          </div>
        ))}
      </div>
      <SimNote>Atualizado simulado — integração real em breve</SimNote>
    </div>
  )
}

function StatsGrid({ participantCount, completedSeries, totalSeries, myEntry }: {
  participantCount: number
  completedSeries: number
  totalSeries: number
  myEntry?: { rank: number; total_points: number }
}) {
  const stats = [
    { icon: <Users size={16} />, label: 'Participantes', value: String(participantCount), gold: false },
    { icon: <Trophy size={16} />, label: 'Séries Concluídas', value: `${completedSeries}/${totalSeries}`, gold: false },
    { icon: <Target size={16} />, label: 'Minha Posição', value: myEntry ? `#${myEntry.rank}` : '—', gold: true },
    { icon: <Star size={16} />, label: 'Meus Pontos', value: myEntry ? String(myEntry.total_points) : '—', gold: false },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map(({ icon, label, value, gold }) => (
        <div key={label} className="card p-3 flex items-center gap-3">
          <span style={{ color: 'var(--nba-gold)', flexShrink: 0 }}>{icon}</span>
          <div className="min-w-0">
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>{label}</div>
            <div
              className="font-condensed text-xl font-bold"
              style={{ color: gold ? 'var(--nba-gold)' : 'var(--nba-text)' }}
            >
              {value}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PodiumCard({ ranking, loading, highlightId }: {
  ranking: ReturnType<typeof useRanking>['ranking']
  loading: boolean
  highlightId: string
}) {
  const top3 = ranking.slice(0, 3)
  return (
    <div className="card p-4">
      <CardTitle>Pódio</CardTitle>
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-nba-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : top3.length === 0 ? (
        <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.85rem' }}>Sem dados ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {top3.map((e, i) => {
            const rankDiff = e.prev_rank != null ? e.prev_rank - e.rank : 0
            const isFirst = i === 0
            const isMe = e.participant_id === highlightId
            return (
              <div
                key={e.participant_id}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{
                  background: isFirst
                    ? 'rgba(200,150,60,0.08)'
                    : isMe
                    ? 'var(--nba-surface-2)'
                    : 'transparent',
                  border: isFirst ? '1px solid rgba(200,150,60,0.25)' : '1px solid transparent',
                }}
              >
                <span
                  className="text-center leading-none select-none"
                  style={{ fontSize: isFirst ? '2.5rem' : '1.5rem', width: 44, flexShrink: 0 }}
                >
                  {MEDAL[i]}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-semibold flex items-center gap-1"
                    style={{
                      color: isFirst ? 'var(--nba-gold)' : 'var(--nba-text)',
                      fontSize: isFirst ? '1rem' : '0.9rem',
                    }}
                  >
                    <span className="truncate">{e.participant_name}</span>
                    {rankDiff > 0 && <ArrowUp size={12} className="text-nba-success shrink-0" />}
                    {rankDiff < 0 && <ArrowDown size={12} className="text-nba-danger shrink-0" />}
                    {rankDiff === 0 && e.prev_rank != null && <Minus size={12} className="text-nba-muted shrink-0" />}
                  </div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem' }}>
                    {e.cravadas} cravada{e.cravadas !== 1 ? 's' : ''}
                  </div>
                </div>
                <div
                  className="font-condensed font-bold"
                  style={{
                    color: 'var(--nba-gold)',
                    fontSize: isFirst ? '1.5rem' : '1.25rem',
                    flexShrink: 0,
                  }}
                >
                  {e.total_points}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RecentSeriesCard({ series }: { series: ReturnType<typeof useSeries>['series'] }) {
  const completed = series.filter((s) => s.is_complete).slice(-5).reverse()
  const ROUND_LABEL: Record<number, string> = { 1: 'R1', 2: 'R2', 3: 'CF', 4: 'Finals' }

  return (
    <div className="card p-4">
      <CardTitle>Séries Recentes</CardTitle>
      {completed.length === 0 ? (
        <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.85rem' }}>
          Nenhuma série encerrada ainda.
        </p>
      ) : (
        <div className="flex flex-col">
          {completed.map((s, i) => {
            const winner = s.winner ?? s.home_team
            const loser = s.winner?.id === s.home_team?.id ? s.away_team : s.home_team
            const label = `${s.conference ?? ''} ${ROUND_LABEL[s.round] ?? ''}`
            return (
              <div key={s.id}>
                <div className="flex items-center justify-between py-2" style={{ fontSize: '0.85rem' }}>
                  <span className="font-condensed uppercase text-xs" style={{ color: 'var(--nba-text-muted)' }}>
                    {label.trim()}
                  </span>
                  <span>
                    <span className="font-bold" style={{ color: winner?.primary_color ?? 'var(--nba-text)' }}>
                      {winner?.abbreviation ?? '?'}
                    </span>
                    <span className="mx-1" style={{ color: 'var(--nba-text-muted)' }}>
                      4-{s.games_played - 4}
                    </span>
                    <span style={{ color: 'var(--nba-text-muted)' }}>
                      {loser?.abbreviation ?? '?'}
                    </span>
                  </span>
                </div>
                {i < completed.length - 1 && <Divider />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function NextGamesCard() {
  const ROUND_COLORS: Record<string, string> = {
    Finals: 'var(--nba-gold)',
    R1: '#4a90d9',
    R2: '#9b59b6',
    CF: '#e05c3a',
  }
  return (
    <div className="card p-4">
      <CardTitle icon={<Clock size={14} />}>Próximos Jogos</CardTitle>
      <div className="flex flex-col">
        {NEXT_GAMES.map((g, i) => (
          <div key={i}>
            <div className="flex items-center gap-2 py-2" style={{ fontSize: '0.85rem' }}>
              <div className="flex-1 min-w-0">
                <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)' }}>
                  {g.home} <span style={{ color: 'var(--nba-text-muted)' }}>vs</span> {g.away}
                </div>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem' }}>
                  {g.date} · {g.time} BRT
                </div>
              </div>
              <span style={{
                background: `${ROUND_COLORS[g.round] ?? '#888'}22`,
                color: ROUND_COLORS[g.round] ?? '#888',
                borderRadius: 4,
                padding: '1px 6px',
                fontSize: '0.68rem',
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {g.round}
              </span>
            </div>
            {i < NEXT_GAMES.length - 1 && <Divider />}
          </div>
        ))}
      </div>
      <SimNote>Jogos reais sincronizados automaticamente</SimNote>
    </div>
  )
}

function OddsCard() {
  return (
    <div className="card p-4">
      <CardTitle icon={<TrendingUp size={14} />}>Favoritos ao Título</CardTitle>
      <div className="flex flex-col">
        {ODDS.map((o, i) => (
          <div key={o.abbr}>
            <div className="flex items-center gap-2 py-2" style={{ fontSize: '0.85rem' }}>
              <span
                className="font-condensed font-bold text-sm w-8 text-center"
                style={{ color: o.color }}
              >
                {o.abbr}
              </span>
              <span className="flex-1" style={{ color: 'var(--nba-text)' }}>{o.name}</span>
              {o.favorite && (
                <Star size={10} fill="currentColor" style={{ color: 'var(--nba-gold)', flexShrink: 0 }} />
              )}
              <span
                className="font-condensed font-bold"
                style={{
                  color: o.favorite ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
                  flexShrink: 0,
                }}
              >
                {o.odds}
              </span>
            </div>
            {i < ODDS.length - 1 && <Divider />}
          </div>
        ))}
      </div>
      <SimNote>Odds simuladas — integração real em breve</SimNote>
    </div>
  )
}

function MyPicksCard({ series, picks, participantId }: {
  series: ReturnType<typeof useSeries>['series']
  picks: ReturnType<typeof useSeries>['picks']
  participantId: string
}) {
  const STATUS_STYLE = {
    correct: { label: 'Acertou', color: 'var(--nba-success)' },
    wrong:   { label: 'Errou',   color: 'var(--nba-danger)' },
    pending: { label: 'Aguarda', color: 'var(--nba-text-muted)' },
  }

  const recent = [...picks].slice(-3).reverse().map((p) => {
    const s = series.find((s) => s.id === p.series_id)
    const pickedTeam = s?.home_team?.id === p.winner_id ? s?.home_team : s?.away_team
    const status: keyof typeof STATUS_STYLE = s?.is_complete
      ? p.winner_id === s?.winner_id ? 'correct' : 'wrong'
      : 'pending'
    return { pick: p, series: s, pickedTeam, status }
  })

  return (
    <div className="card p-4">
      <CardTitle>Meus Palpites</CardTitle>
      {recent.length === 0 ? (
        <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.85rem' }}>
          Nenhum palpite registrado ainda.{' '}
          <Link to="/bracket" style={{ color: 'var(--nba-gold)' }}>Palpitar →</Link>
        </p>
      ) : (
        <div className="flex flex-col">
          {recent.map(({ pick, series: s, pickedTeam, status }, i) => {
            const { label, color } = STATUS_STYLE[status]
            const ROUND_LABEL: Record<number, string> = { 1: 'R1', 2: 'R2', 3: 'CF', 4: 'Finals' }
            return (
              <div key={pick.id}>
                <div className="flex items-center gap-2 py-2" style={{ fontSize: '0.85rem' }}>
                  <div className="flex-1 min-w-0">
                    <div className="font-condensed font-bold truncate" style={{ color: pickedTeam?.primary_color ?? 'var(--nba-text)' }}>
                      {pickedTeam?.abbreviation ?? '?'}
                    </div>
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem' }}>
                      {s ? `${s.conference ?? ''} ${ROUND_LABEL[s.round] ?? ''}`.trim() : '—'}
                    </div>
                  </div>
                  <span style={{
                    background: `${color}22`,
                    color,
                    borderRadius: 4,
                    padding: '1px 6px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {label}
                  </span>
                </div>
                {i < recent.length - 1 && <Divider />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Home({ participantId }: Props) {
  const { ranking, loading: rankLoading } = useRanking()
  const { series, picks } = useSeries(participantId)

  const myEntry = ranking.find((r) => r.participant_id === participantId)
  const completedSeries = series.filter((s) => s.is_complete).length

  return (
    <div
      className="pb-20 pt-4 px-4 mx-auto grid gap-4 grid-cols-1 md:grid-cols-[1fr_280px] xl:grid-cols-[280px_1fr_280px]"
      style={{ maxWidth: 1400 }}
    >
      {/* ── Left column: desktop only ──────────────────────────── */}
      <div className="hidden xl:flex xl:flex-col gap-4">
        <RankingCard ranking={ranking} loading={rankLoading} highlightId={participantId} />
        <InjuriesCard />
      </div>

      {/* ── Center column ──────────────────────────────────────── */}
      <div className="flex flex-col gap-4 min-w-0">
        {/* Header */}
        <div>
          <h1 className="title text-5xl" style={{ color: 'var(--nba-gold)' }}>Bolão NBA 2026</h1>
          <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.85rem', marginTop: 2 }}>
            Playoffs em andamento · Atualização em tempo real
          </p>
        </div>

        <StatsGrid
          participantCount={ranking.length}
          completedSeries={completedSeries}
          totalSeries={series.length}
          myEntry={myEntry}
        />

        <PodiumCard ranking={ranking} loading={rankLoading} highlightId={participantId} />

        <RecentSeriesCard series={series} />
      </div>

      {/* ── Right column ───────────────────────────────────────── */}
      <div className="flex flex-col gap-4 min-w-0">
        <NextGamesCard />
        <OddsCard />
        <MyPicksCard series={series} picks={picks} participantId={participantId} />
      </div>
    </div>
  )
}
