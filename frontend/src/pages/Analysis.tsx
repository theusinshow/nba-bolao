import { Component, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Activity, ChevronRight, Clock, Database, HeartPulse, Newspaper, Sparkles, TrendingUp } from 'lucide-react'
import { LoadingBasketball } from '../components/LoadingBasketball'
import type { AuthState } from '../hooks/useAuth'
import { useGameFeed } from '../hooks/useGameFeed'
import { type AnalysisNewsItem, type AnalysisOddsItem, useAnalysisInsights } from '../hooks/useAnalysisInsights'
import { type InjuryItem, useInjuries } from '../hooks/useInjuries'
import { useSeries } from '../hooks/useSeries'
import { TEAMS_2025, getTeamLogoUrl } from '../data/teams2025'
import { BRT_TIMEZONE } from '../utils/constants'
import { fadeUpItem, premiumTween, pressMotion, softStaggerContainer } from '../lib/motion'

const ROUND_BADGE_COLOR: Record<string, string> = {
  Finals: 'var(--nba-gold)',
  R1: '#4a90d9',
  R2: '#9b59b6',
  CF: '#e05c3a',
}

const ROUND_LABEL: Record<number, string> = { 1: 'R1', 2: 'R2', 3: 'CF', 4: 'Finals' }

const card: React.CSSProperties = {
  background: 'var(--nba-surface)',
  border: '1px solid var(--nba-border)',
  borderRadius: 8,
  padding: '1rem',
}

class AnalysisSectionBoundary extends Component<
  { title: string; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error(`[analysis] section crashed: ${this.props.title}`, error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ ...card, borderRadius: 12 }}>
          <div className="font-condensed font-bold" style={{ color: '#ff8a65', fontSize: '1rem', lineHeight: 1.05, marginBottom: 8 }}>
            {this.props.title} indisponível
          </div>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem', lineHeight: 1.45 }}>
            Esse bloco recebeu um dado inesperado e foi isolado para não derrubar a aba inteira.
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function CardTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      {icon && <span style={{ color: 'var(--nba-gold)', display: 'flex' }}>{icon}</span>}
      <h2 className="title" style={{ color: 'var(--nba-gold)', fontSize: '1rem', letterSpacing: '0.1em', lineHeight: 1 }}>
        {children}
      </h2>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--nba-border)' }} />
}

function Badge({ label, color, small }: { label: string; color: string; small?: boolean }) {
  return (
    <span
      style={{
        background: `${color}22`,
        color,
        borderRadius: 4,
        padding: small ? '1px 6px' : '2px 8px',
        fontSize: small ? '0.65rem' : '0.7rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  )
}

function formatShortDateTime(dateValue: string | null | undefined) {
  if (!dateValue) return 'Sem horário'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BRT_TIMEZONE,
  }).format(new Date(dateValue))
}

function normalizeName(value: string | null | undefined) {
  return value
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim() ?? ''
}

function formatAmericanOdds(value: number | null) {
  if (value == null) return '—'
  return value > 0 ? `+${value}` : `${value}`
}

function convertAmericanToDecimal(value: number | null) {
  if (value == null) return null
  if (value > 0) return 1 + value / 100
  if (value < 0) return 1 + 100 / Math.abs(value)
  return null
}

function formatDecimalOdds(value: number | null) {
  const decimal = convertAmericanToDecimal(value)
  if (decimal == null) return '—'
  return decimal.toFixed(2)
}

interface TeamOddsStyle {
  abbreviation: string
  primaryColor: string
  secondaryColor: string
}

function getReadableTextColor(background: string) {
  const hex = background.replace('#', '')
  if (hex.length !== 6) return '#ffffff'
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.62 ? '#111111' : '#ffffff'
}

function truncateText(value: string | null | undefined, maxLength: number) {
  if (!value) return null
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1).trimEnd()}…`
}

const SOURCE_PILLS = [
  { label: 'Dados NBA',    color: 'var(--nba-success)', bg: 'rgba(46,204,113,0.10)', border: 'rgba(46,204,113,0.18)' },
  { label: 'Odds ao vivo', color: 'var(--nba-east)',    bg: 'rgba(74,144,217,0.10)', border: 'rgba(74,144,217,0.18)' },
  { label: 'Notícias',     color: 'var(--nba-gold)',    bg: 'rgba(200,150,60,0.10)', border: 'rgba(200,150,60,0.18)' },
]

function AnalysisHeroFooter({ sectionsReady, generatedAt }: { sectionsReady: number; generatedAt: string | null }) {
  const status = sectionsReady + '/3 frentes ativas' + (generatedAt ? ' - ' + formatShortDateTime(generatedAt) : '')
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SOURCE_PILLS.map((p) => (
          <span key={p.label} style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: 999, fontSize: '0.66rem', fontWeight: 700, color: p.color, background: p.bg, border: '1px solid ' + p.border }}>
            {p.label}
          </span>
        ))}
      </div>
      <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>{status}</span>
    </div>
  )
}

function AnalysisHero({
  nextGamesCount,
  recentResultsCount,
  oddsReady,
  newsReady,
  injuriesCount,
  generatedAt,
}: {
  nextGamesCount: number
  recentResultsCount: number
  oddsReady: boolean
  newsReady: boolean
  injuriesCount: number
  generatedAt: string | null
}) {
  const sectionsReady = [nextGamesCount > 0 || recentResultsCount > 0, oddsReady, newsReady].filter(Boolean).length

  return (
    <section
      id="analysis-hero-tour"
      style={{
        background: 'linear-gradient(135deg, rgba(74,144,217,0.16), rgba(200,150,60,0.10) 52%, rgba(19,19,26,1) 100%)',
        border: '1px solid rgba(200,150,60,0.22)',
        borderRadius: 12,
        padding: '1.05rem',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(74,144,217,0.18), transparent 36%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nba-gold)' }}>
          <Activity size={15} />
          <span className="font-condensed" style={{ fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Central de leitura
          </span>
        </div>

        <div style={{ display: 'grid', gap: 12 }} className="md:grid-cols-[1.35fr_1fr]">
          <div>
            <h1 className="title" style={{ color: 'var(--nba-gold)', fontSize: 'clamp(2.2rem, 5vw, 3.1rem)', lineHeight: 0.95, margin: 0 }}>
              Análise da Rodada
            </h1>
            <p style={{ color: 'var(--nba-text)', fontSize: '0.96rem', margin: '10px 0 6px' }}>
              Odds, notícias e agenda real concentradas em uma única aba.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 10 }} className="grid-cols-2">
            {[
              { label: 'Próximos jogos', value: nextGamesCount, tone: 'var(--nba-text)' },
              { label: 'Resultados', value: recentResultsCount, tone: 'var(--nba-gold)' },
              { label: 'Odds', value: oddsReady ? 'Prontas' : 'Indisponível', tone: oddsReady ? 'var(--nba-success)' : 'var(--nba-danger)' },
              { label: 'Notícias', value: newsReady ? 'Prontas' : 'Indisponível', tone: newsReady ? 'var(--nba-success)' : 'var(--nba-danger)' },
              { label: 'Lesionados', value: injuriesCount > 0 ? injuriesCount : '—', tone: injuriesCount > 0 ? 'var(--nba-danger)' : 'var(--nba-text-muted)' },
            ].map((item) => (
              <div key={item.label} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)' }}>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>{item.label}</div>
                <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.2rem', lineHeight: 1 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <AnalysisHeroFooter sectionsReady={sectionsReady} generatedAt={generatedAt} />
      </div>
    </section>
  )
}

function TeamLogoRow({ abbr, name }: { abbr: string; name: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <img
        src={getTeamLogoUrl(abbr)}
        alt={abbr}
        onError={(e) => (e.currentTarget.style.display = 'none')}
        style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }}
      />
      <span className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.95rem', lineHeight: 1 }}>
        {abbr}
      </span>
      <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem' }}>{name}</span>
    </div>
  )
}

function NextGamesCard({
  games,
}: {
  games: ReturnType<typeof useGameFeed>['upcomingGames']
}) {
  const sourceGames = games.map((game) => ({
    homeAbbr: game.home_team?.abbreviation ?? game.home_team_id,
    awayAbbr: game.away_team?.abbreviation ?? game.away_team_id,
    homeName: game.home_team?.name?.split(' ').pop() ?? game.home_team_id,
    awayName: game.away_team?.name?.split(' ').pop() ?? game.away_team_id,
    date: formatShortDateTime(game.tip_off_at),
    round: ROUND_LABEL[game.series?.round ?? game.round ?? 1] ?? 'NBA',
  }))
  const featured = sourceGames[0]

  return (
    <div className="card-hover" style={card}>
      <CardTitle icon={<Clock size={14} />}>Próximos Confrontos</CardTitle>

      {featured ? (
        <>
          <div style={{ background: 'linear-gradient(135deg, rgba(74,144,217,0.16), rgba(200,150,60,0.08))', border: '1px solid rgba(200,150,60,0.14)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
              <span className="font-condensed" style={{ color: 'var(--nba-gold)', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
                PRÓXIMO FOCO
              </span>
              <Badge label={featured.round} color={ROUND_BADGE_COLOR[featured.round] ?? '#888'} small />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <TeamLogoRow abbr={featured.homeAbbr} name={featured.homeName} />
              <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', paddingLeft: 29 }}>vs</span>
              <TeamLogoRow abbr={featured.awayAbbr} name={featured.awayName} />
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', marginTop: 10 }}>
              {featured.date}
            </div>
            <Link to="/games" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--nba-gold)', fontSize: '0.78rem', marginTop: 10, textDecoration: 'none' }}>
              Ir para jogos
              <ChevronRight size={14} />
            </Link>
          </div>

          {sourceGames.slice(1).length > 0 && (
            <div>
              {sourceGames.slice(1).map((g, i, arr) => {
                const color = ROUND_BADGE_COLOR[g.round] ?? '#888'
                return (
                  <div key={`${g.homeAbbr}-${g.awayAbbr}-${g.date}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                        <img
                          src={getTeamLogoUrl(g.homeAbbr)}
                          alt={g.homeAbbr}
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                          style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0 }}
                        />
                        <span className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.88rem' }}>
                          {g.homeAbbr}
                        </span>
                        <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem' }}>vs</span>
                        <img
                          src={getTeamLogoUrl(g.awayAbbr)}
                          alt={g.awayAbbr}
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                          style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0 }}
                        />
                        <span className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.88rem' }}>
                          {g.awayAbbr}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>{g.date}</span>
                        <Badge label={g.round} color={color} small />
                      </div>
                    </div>
                    {i < arr.length - 1 && <Divider />}
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <InsightEmptyState
          title="Agenda real ainda sem confrontos sincronizados"
          description="Quando os próximos jogos entrarem no feed oficial, este bloco passa a destacar automaticamente o duelo em foco da rodada."
          accent="var(--nba-east)"
        />
      )}
    </div>
  )
}

function RecentResultsCard({
  games,
}: {
  games: ReturnType<typeof useGameFeed>['recentCompletedGames']
}) {
  const sourceGames = games.map((game) => {
    const homeWon = game.winner_id === game.home_team_id
    const awayWon = game.winner_id === game.away_team_id
    return {
      home: game.home_team?.abbreviation ?? game.home_team_id,
      away: game.away_team?.abbreviation ?? game.away_team_id,
      homeColor: game.home_team?.primary_color ?? 'var(--nba-text)',
      awayColor: game.away_team?.primary_color ?? 'var(--nba-text)',
      homeScore: game.home_score ?? 0,
      awayScore: game.away_score ?? 0,
      homeWon,
      awayWon,
      round: ROUND_LABEL[game.series?.round ?? game.round ?? 1] ?? 'NBA',
      note: formatShortDateTime(game.tip_off_at),
      gameNumber: game.game_number,
    }
  })

  return (
    <motion.div
      id="analysis-results-tour"
      className="card-hover"
      variants={fadeUpItem}
      initial="hidden"
      animate="show"
      whileHover={{ y: -3, boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}
      transition={premiumTween}
      style={card}
    >
      <CardTitle icon={<Database size={14} />}>Resultados Recentes</CardTitle>

      {sourceGames.length > 0 ? (
        <div>
          {sourceGames.map((game, i) => (
            <div key={`${game.home}-${game.away}-${game.note}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderRadius: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-condensed font-bold" style={{ fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ color: game.homeWon ? game.homeColor : 'var(--nba-text-muted)', fontWeight: game.homeWon ? 700 : 400 }}>
                      {game.home}
                    </span>
                    <span style={{ color: 'var(--nba-text-muted)', fontWeight: 400, fontSize: '0.78rem' }}>vs</span>
                    <span style={{ color: game.awayWon ? game.awayColor : 'var(--nba-text-muted)', fontWeight: game.awayWon ? 700 : 400 }}>
                      {game.away}
                    </span>
                  </div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 2 }}>
                    {game.note}
                  </div>
                </div>
                <div style={{ display: 'grid', justifyItems: 'end', gap: 4 }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.63rem', fontWeight: 600 }}>J{game.gameNumber}</span>
                    <Badge label={game.round} color={ROUND_BADGE_COLOR[game.round] ?? '#888'} small />
                  </div>
                  <span className="font-condensed font-bold" style={{ color: game.homeWon ? game.homeColor : game.awayWon ? game.awayColor : 'var(--nba-gold)', fontSize: '0.95rem' }}>
                    {game.homeScore} – {game.awayScore}
                  </span>
                </div>
              </div>
              {i < sourceGames.length - 1 && <Divider />}
            </div>
          ))}
        </div>
      ) : (
        <InsightEmptyState
          title="Resultados finais ainda não apareceram"
          description="Assim que a primeira partida da pós-temporada for encerrada e sincronizada, este bloco passa a mostrar placares reais e contexto recente."
          accent="var(--nba-gold)"
        />
      )}
    </motion.div>
  )
}

function OddsCard({
  odds,
  loading,
  reason,
  unfiltered,
  teamStylesByName,
}: {
  odds: AnalysisOddsItem[]
  loading: boolean
  reason?: string
  unfiltered?: boolean
  teamStylesByName: Record<string, TeamOddsStyle>
}) {
  return (
    <motion.div
      id="analysis-odds-tour"
      className="card-hover"
      variants={fadeUpItem}
      initial="hidden"
      animate="show"
      whileHover={{ y: -3, boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}
      transition={premiumTween}
      style={card}
    >
      <CardTitle icon={<TrendingUp size={14} />}>Odds dos Confrontos</CardTitle>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '18px 0' }}>
          <LoadingBasketball size={20} />
        </div>
      ) : odds.length > 0 ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {unfiltered && (
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(243,156,18,0.08)', border: '1px solid rgba(243,156,18,0.20)', color: '#f39c12', fontSize: '0.76rem' }}>
              Exibindo todas as odds disponíveis — nenhuma correspondeu aos jogos atuais pelo nome do time.
            </div>
          )}
          {odds.map((item, index) => {
            const homeFavored = item.moneyline.home !== null && item.moneyline.away !== null && item.moneyline.home < item.moneyline.away
            const awayFavored = item.moneyline.home !== null && item.moneyline.away !== null && item.moneyline.away < item.moneyline.home
            const homeTeamStyle = teamStylesByName[normalizeName(item.home_team_name)]
            const awayTeamStyle = teamStylesByName[normalizeName(item.away_team_name)]
            const homePrimary = homeTeamStyle?.primaryColor ?? 'var(--nba-east)'
            const homeSecondary = homeTeamStyle?.secondaryColor ?? 'rgba(74,144,217,0.18)'
            const awayPrimary = awayTeamStyle?.primaryColor ?? 'var(--nba-west)'
            const awaySecondary = awayTeamStyle?.secondaryColor ?? 'rgba(224,92,58,0.18)'
            return (
              <div
                key={item.id}
                style={{
                  padding: '12px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(74,144,217,0.06) 50%, rgba(200,150,60,0.08) 100%)',
                  border: '1px solid rgba(200,150,60,0.14)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                  <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>{item.bookmaker}</span>
                  <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>
                    {item.updated_at ? formatShortDateTime(item.updated_at) : formatShortDateTime(item.commence_time)}
                  </span>
                </div>

                <div style={{ display: 'grid', gap: 10 }} className="sm:grid-cols-2">
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: 12,
                      background: `${homePrimary}18`,
                      border: `1px solid ${homeSecondary}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                      <span className="font-condensed font-bold" style={{ color: homePrimary, fontSize: '1rem', lineHeight: 1 }}>
                        {homeTeamStyle?.abbreviation ?? item.home_team_name}
                      </span>
                      {homeFavored && (
                        <Badge label="Favorito" color={homePrimary} small />
                      )}
                    </div>
                    <div
                      className="font-condensed font-bold"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 88,
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: homePrimary,
                        color: getReadableTextColor(homePrimary),
                        fontSize: '1.55rem',
                        lineHeight: 1,
                      }}
                    >
                      {formatDecimalOdds(item.moneyline.home)}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '12px',
                      borderRadius: 12,
                      background: `${awayPrimary}18`,
                      border: `1px solid ${awaySecondary}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                      <span className="font-condensed font-bold" style={{ color: awayPrimary, fontSize: '1rem', lineHeight: 1 }}>
                        {awayTeamStyle?.abbreviation ?? item.away_team_name}
                      </span>
                      {awayFavored && (
                        <Badge label="Favorito" color={awayPrimary} small />
                      )}
                    </div>
                    <div
                      className="font-condensed font-bold"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 88,
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: awayPrimary,
                        color: getReadableTextColor(awayPrimary),
                        fontSize: '1.55rem',
                        lineHeight: 1,
                      }}
                    >
                      {formatDecimalOdds(item.moneyline.away)}
                    </div>
                  </div>
                </div>

                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 10 }}>
                  Leitura simplificada: quanto menor a odd, maior o favoritismo.
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <InsightEmptyState
          title="Mercado sem leitura útil agora"
          description={reason ?? 'As odds ainda não retornaram confronto compatível com a agenda atual da rodada.'}
          accent="var(--nba-east)"
        />
      )}
    </motion.div>
  )
}

function NewsCard({
  news,
  loading,
  reason,
}: {
  news: AnalysisNewsItem[]
  loading: boolean
  reason?: string
}) {
  return (
    <motion.div
      id="analysis-injuries-tour"
      className="card-hover"
      variants={fadeUpItem}
      initial="hidden"
      animate="show"
      whileHover={{ y: -3, boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}
      transition={premiumTween}
      style={card}
    >
      <CardTitle icon={<Newspaper size={14} />}>Notícias da NBA</CardTitle>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '18px 0' }}>
          <LoadingBasketball size={20} />
        </div>
      ) : news.length > 0 ? (
        <div>
          {news.map((item, index) => (
            <div key={item.id}>
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'grid',
                  gap: 6,
                  padding: '8px 4px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.92rem', lineHeight: 1.2 }}>
                    {item.title}
                  </div>
                  <Badge label={item.source} color="var(--nba-gold)" small />
                </div>

                {item.summary && (
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', lineHeight: 1.45 }}>
                    {truncateText(item.summary, 180)}
                  </div>
                )}

                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>
                  {item.published_at ? `Publicado em ${formatShortDateTime(item.published_at)}` : 'Horário não informado'}
                </div>
              </a>
              {index < news.length - 1 && <Divider />}
            </div>
          ))}
        </div>
      ) : (
        <InsightEmptyState
          title="Noticiário sem destaque forte agora"
          description={reason ?? 'Quando surgirem notícias mais aderentes aos times ativos, a central volta a puxar a narrativa da rodada aqui.'}
          accent="var(--nba-gold)"
        />
      )}
    </motion.div>
  )
}

const INJURY_STATUS_STYLE: Record<string, { color: string; label: string }> = {
  Out:          { color: 'var(--nba-danger)',  label: 'Fora' },
  Doubtful:     { color: '#e67e22',            label: 'Duvidoso' },
  Questionable: { color: '#f1c40f',            label: 'Questionável' },
  Probable:     { color: 'var(--nba-success)', label: 'Provável' },
  'Day-To-Day': { color: '#e67e22',            label: 'Dia a dia' },
}

function getInjuryStyle(status: string) {
  return INJURY_STATUS_STYLE[status] ?? { color: 'var(--nba-text-muted)', label: status }
}

function getImpactStyle(impact: InjuryItem['impact']) {
  if (impact === 'high') {
    return {
      label: 'Impacto alto',
      color: '#ff8a65',
      background: 'rgba(255,138,101,0.12)',
      border: 'rgba(255,138,101,0.28)',
    }
  }
  if (impact === 'medium') {
    return {
      label: 'Impacto médio',
      color: 'var(--nba-gold)',
      background: 'rgba(200,150,60,0.12)',
      border: 'rgba(200,150,60,0.24)',
    }
  }
  return {
    label: 'Monitorar',
    color: 'var(--nba-text-muted)',
    background: 'rgba(136,136,153,0.10)',
    border: 'rgba(136,136,153,0.18)',
  }
}

function getTeamNameFromAbbr(abbr: string | null) {
  if (!abbr) return null
  return TEAMS_2025.find((team) => team.abbreviation === abbr)?.name ?? abbr
}

function InjuriesRadar({ injuries }: { injuries: InjuryItem[] }) {
  const highImpact = injuries.filter((item) => item.impact === 'high')
  const mediumOrHigher = injuries.filter((item) => item.impact !== 'low')

  const teamsByVolume = Object.entries(
    injuries.reduce<Record<string, number>>((acc, item) => {
      if (!item.team) return acc
      acc[item.team] = (acc[item.team] ?? 0) + 1
      return acc
    }, {})
  )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
    .slice(0, 3)

  const headlineItems = highImpact.length > 0 ? highImpact.slice(0, 3) : mediumOrHigher.slice(0, 3)

  return (
    <div
      style={{
        borderRadius: 12,
        padding: '12px 14px',
        background: 'linear-gradient(135deg, rgba(231,76,60,0.10), rgba(200,150,60,0.10) 55%, rgba(19,19,26,1) 100%)',
        border: '1px solid rgba(200,150,60,0.18)',
        display: 'grid',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span className="font-condensed" style={{ color: 'var(--nba-gold)', fontSize: '0.76rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Radar da rodada
        </span>
        <span style={{ color: highImpact.length > 0 ? '#ff8a65' : 'var(--nba-gold)', fontSize: '0.72rem', fontWeight: 700 }}>
          {highImpact.length} impacto alto
        </span>
      </div>

      <div style={{ display: 'grid', gap: 8 }} className="grid-cols-2">
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(255,138,101,0.16)' }}>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.66rem', marginBottom: 5 }}>Casos monitorados</div>
          <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1.35rem', lineHeight: 1 }}>
            {injuries.length}
          </div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)' }}>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.66rem', marginBottom: 5 }}>Times afetados</div>
          <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '1.35rem', lineHeight: 1 }}>
            {teamsByVolume.length}
          </div>
        </div>
      </div>

      {teamsByVolume.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {teamsByVolume.map(([team, count]) => (
            <span
              key={team}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                borderRadius: 999,
                background: 'rgba(12,12,18,0.34)',
                border: '1px solid rgba(200,150,60,0.14)',
                color: 'var(--nba-text)',
                fontSize: '0.68rem',
                fontWeight: 700,
              }}
            >
              {team}
              <span style={{ color: 'var(--nba-text-muted)' }}>{count}</span>
            </span>
          ))}
        </div>
      )}

      {headlineItems.length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
          {headlineItems.map((item) => {
            const impactStyle = getImpactStyle(item.impact)
            const statusStyle = getInjuryStyle(item.status)
            return (
              <div
                key={`headline-${item.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: 'rgba(12,12,18,0.38)',
                  border: '1px solid rgba(200,150,60,0.12)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.86rem', lineHeight: 1 }}>
                    {item.player_name}
                  </div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginTop: 3 }}>
                    {item.team ?? 'Sem time'}{item.detail ? ` • ${truncateText(item.detail, 72)}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ color: impactStyle.color, fontSize: '0.62rem', fontWeight: 700 }}>
                    {impactStyle.label}
                  </span>
                  <span style={{ color: statusStyle.color, fontSize: '0.62rem', fontWeight: 700 }}>
                    {statusStyle.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function InsightEmptyState({
  title,
  description,
  accent = 'var(--nba-text-muted)',
}: {
  title: string
  description: string
  accent?: string
}) {
  return (
    <motion.div
      style={{
        borderRadius: 12,
        padding: '14px 16px',
        background: 'linear-gradient(135deg, rgba(12,12,18,0.40), rgba(255,255,255,0.02))',
        border: '1px solid rgba(200,150,60,0.12)',
        display: 'grid',
        gap: 6,
      }}
    >
      <div className="font-condensed font-bold" style={{ color: accent, fontSize: '0.94rem', lineHeight: 1 }}>
        {title}
      </div>
      <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.78rem', lineHeight: 1.5 }}>
        {description}
      </div>
    </motion.div>
  )
}

function InjuriesCard({
  injuries,
  loading,
  reason,
}: {
  injuries: InjuryItem[]
  loading: boolean
  reason?: string
}) {
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL')

  // Ordena: Out → Doubtful → Questionable → Probable → outros
  const ORDER = ['Out', 'Doubtful', 'Day-To-Day', 'Questionable', 'Probable']
  const sorted = [...injuries].sort((a, b) => {
    const ia = ORDER.indexOf(a.status)
    const ib = ORDER.indexOf(b.status)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })

  const availableTeams = useMemo(() => (
    Array.from(new Set(sorted.map((item) => item.team).filter((team): team is string => !!team))).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  ), [sorted])

  const filtered = selectedTeam === 'ALL'
    ? sorted
    : sorted.filter((item) => item.team === selectedTeam)

  const groupedByTeam = filtered.reduce<Record<string, InjuryItem[]>>((acc, item) => {
    const key = item.team ?? 'SEM_TIME'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const groupedEntries = Object.entries(groupedByTeam).sort(([teamA], [teamB]) => {
    if (teamA === 'SEM_TIME') return 1
    if (teamB === 'SEM_TIME') return -1
    return teamA.localeCompare(teamB, 'pt-BR')
  })

  return (
    <motion.div
      className="card-hover"
      variants={fadeUpItem}
      initial="hidden"
      animate="show"
      whileHover={{ y: -3, boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}
      transition={premiumTween}
      style={card}
    >
      <CardTitle icon={<HeartPulse size={14} />}>Relatório de Lesões</CardTitle>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '18px 0' }}>
          <LoadingBasketball size={20} />
        </div>
      ) : sorted.length > 0 ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <InjuriesRadar injuries={sorted} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', lineHeight: 1.4 }}>
              Principais ausências e dúvidas da rodada, priorizadas por time.
            </div>
            <span style={{ color: 'var(--nba-gold)', fontSize: '0.72rem', fontWeight: 700 }}>
              {filtered.length} caso{filtered.length !== 1 ? 's' : ''} em foco
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedTeam('ALL')}
              style={{
                borderRadius: 999,
                padding: '6px 10px',
                border: selectedTeam === 'ALL' ? '1px solid rgba(200,150,60,0.28)' : '1px solid rgba(200,150,60,0.12)',
                background: selectedTeam === 'ALL' ? 'rgba(200,150,60,0.12)' : 'rgba(12,12,18,0.34)',
                color: selectedTeam === 'ALL' ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Todos
            </button>
            {availableTeams.map((teamAbbr) => (
              <button
                key={teamAbbr}
                onClick={() => setSelectedTeam(teamAbbr)}
                style={{
                  borderRadius: 999,
                  padding: '6px 10px',
                  border: selectedTeam === teamAbbr ? '1px solid rgba(200,150,60,0.28)' : '1px solid rgba(200,150,60,0.12)',
                  background: selectedTeam === teamAbbr ? 'rgba(200,150,60,0.12)' : 'rgba(12,12,18,0.34)',
                  color: selectedTeam === teamAbbr ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {teamAbbr}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {groupedEntries.map(([teamKey, teamItems]) => {
              const teamData = TEAMS_2025.find((t) => t.abbreviation === teamKey)

              return (
                <div
                  key={teamKey}
                  style={{
                    borderRadius: 12,
                    border: '1px solid rgba(200,150,60,0.14)',
                    background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(74,144,217,0.05) 50%, rgba(200,150,60,0.06) 100%)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      padding: '10px 12px',
                      borderBottom: '1px solid rgba(200,150,60,0.10)',
                      background: 'rgba(12,12,18,0.28)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      {teamData && (
                        <img
                          src={getTeamLogoUrl(teamData.abbreviation)}
                          alt={teamData.abbreviation}
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                          style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }}
                        />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div className="font-condensed font-bold" style={{ color: teamData?.primary_color ?? 'var(--nba-text)', fontSize: '0.95rem', lineHeight: 1 }}>
                          {teamKey === 'SEM_TIME' ? 'Sem time associado' : teamKey}
                        </div>
                        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginTop: 2 }}>
                          {teamKey === 'SEM_TIME' ? 'Relatório sem associação de franquia' : getTeamNameFromAbbr(teamKey)}
                        </div>
                      </div>
                    </div>
                    <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                      {teamItems.length} alerta{teamItems.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 0' }}>
                    {teamItems.map((item, index) => {
                      const style = getInjuryStyle(item.status)
                      const impactStyle = getImpactStyle(item.impact)

                      return (
                        <div key={item.id}>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr auto',
                              alignItems: 'center',
                              gap: 8,
                              padding: '8px 12px',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
                                <div
                                  className="font-condensed font-bold"
                                  style={{ color: item.impact === 'high' ? '#fff1eb' : 'var(--nba-text)', fontSize: '0.9rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                >
                                  {item.player_name}
                                </div>
                                {item.impact !== 'low' && (
                                  <span
                                    style={{
                                      background: impactStyle.background,
                                      color: impactStyle.color,
                                      borderRadius: 999,
                                      padding: '2px 7px',
                                      fontSize: '0.6rem',
                                      fontWeight: 700,
                                      whiteSpace: 'nowrap',
                                      border: `1px solid ${impactStyle.border}`,
                                    }}
                                  >
                                    {impactStyle.label}
                                  </span>
                                )}
                              </div>
                              {item.detail && (
                                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.69rem', lineHeight: 1.35, marginTop: 2 }}>
                                  {item.detail}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                              <span
                                style={{
                                  background: `${style.color}22`,
                                  color: style.color,
                                  borderRadius: 4,
                                  padding: '1px 7px',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  border: `1px solid ${style.color}44`,
                                }}
                              >
                                {style.label}
                              </span>
                              {item.position && (
                                <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.62rem' }}>
                                  {item.position}
                                </span>
                              )}
                            </div>
                          </div>
                          {index < teamItems.length - 1 && <Divider />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <InsightEmptyState
              title="Filtro sem alerta relevante"
              description="Esse recorte não tem ausências ou dúvidas fortes no momento. Troque o time ou volte para `Todos` para ampliar a leitura."
              accent="var(--nba-text-muted)"
            />
          )}
        </div>
      ) : (
        <InsightEmptyState
          title="Radar de lesões limpo"
          description={reason ?? 'Nenhum jogador entrou no recorte relevante da rodada neste momento.'}
          accent="var(--nba-danger)"
        />
      )}
    </motion.div>
  )
}

function AnalysisEditorialDeck({
  upcomingGames,
  odds,
  news,
  injuries,
}: {
  upcomingGames: ReturnType<typeof useGameFeed>['upcomingGames']
  odds: AnalysisOddsItem[]
  news: AnalysisNewsItem[]
  injuries: InjuryItem[]
}) {
  const activeInjuries = injuries.filter((item) => item.impact === 'high' || item.impact === 'medium')

  const topLine = useMemo(() => {
    if (activeInjuries.filter((item) => item.impact === 'high').length > 0) {
      const count = activeInjuries.filter((item) => item.impact === 'high').length
      return {
        eyebrow: 'Headline da rodada',
        title: `${count} alerta${count !== 1 ? 's' : ''} pesados mexem com a leitura dos confrontos`,
        detail: 'A central priorizou ausências de alto impacto antes de qualquer outra camada da rodada.',
      }
    }

    if (news.length > 0) {
      return {
        eyebrow: 'Headline da rodada',
        title: truncateText(news[0].title, 88) ?? 'Noticiário movimenta a rodada',
        detail: 'O noticiário já começa a puxar a narrativa dos confrontos ativos.',
      }
    }

    if (odds.length > 0) {
      const first = odds[0]
      const homeFavored = first.moneyline.home !== null && first.moneyline.away !== null && first.moneyline.home < first.moneyline.away
      const favorite = homeFavored ? first.home_team_name : first.away_team_name
      return {
        eyebrow: 'Headline da rodada',
        title: `${favorite} abre a rodada com leitura mais forte no mercado`,
        detail: 'As odds já começam a desenhar os confrontos com maior pressão competitiva.',
      }
    }

    return {
      eyebrow: 'Headline da rodada',
      title: 'A rodada está montada para leitura cruzada de agenda, mercado e elenco',
      detail: 'Use a central para entender rapidamente onde a chave pode balançar.',
    }
  }, [activeInjuries, news, odds])

  const focusMatchup = useMemo(() => {
    const scoredGames = upcomingGames.map((game) => {
      const homeAbbr = game.home_team?.abbreviation ?? game.home_team_id
      const awayAbbr = game.away_team?.abbreviation ?? game.away_team_id
      const pressure = injuries.reduce((acc, item) => {
        if (item.team !== homeAbbr && item.team !== awayAbbr) return acc
        return acc + (item.impact === 'high' ? 3 : item.impact === 'medium' ? 1 : 0)
      }, 0)

      return { game, homeAbbr, awayAbbr, pressure }
    }).sort((a, b) => b.pressure - a.pressure)

    return scoredGames[0]
  }, [injuries, upcomingGames])

  const watchTeams = useMemo(() => {
    return Object.entries(
      injuries.reduce<Record<string, number>>((acc, item) => {
        if (!item.team || item.impact === 'low') return acc
        acc[item.team] = (acc[item.team] ?? 0) + (item.impact === 'high' ? 2 : 1)
        return acc
      }, {})
    )
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .slice(0, 3)
  }, [injuries])

  return (
    <motion.section
      id="analysis-pressure-tour"
      variants={fadeUpItem}
      initial="hidden"
      animate="show"
      whileHover={{ y: -2, boxShadow: '0 18px 34px rgba(0,0,0,0.16)' }}
      transition={premiumTween}
      style={{
        ...card,
        background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(74,144,217,0.08) 52%, rgba(200,150,60,0.08) 100%)',
        borderRadius: 12,
        display: 'grid',
        gap: 12,
      }}
    >
      <div style={{ display: 'grid', gap: 8 }}>
        <span className="font-condensed" style={{ color: 'var(--nba-gold)', fontSize: '0.76rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {topLine.eyebrow}
        </span>
        <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1.24rem', lineHeight: 1.05 }}>
          {topLine.title}
        </div>
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
          {topLine.detail}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }} className="md:grid-cols-3">
        <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.14)' }}>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.66rem', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Confronto em foco
          </div>
          <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '1.1rem', lineHeight: 1 }}>
            {focusMatchup ? `${focusMatchup.homeAbbr} x ${focusMatchup.awayAbbr}` : 'Aguardando agenda'}
          </div>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 6, lineHeight: 1.4 }}>
            {focusMatchup
              ? focusMatchup.pressure > 0
                ? 'É o duelo que mais concentra pressão de elenco agora.'
                : 'É o próximo duelo que ancora a leitura da rodada.'
              : 'Sem confronto destacado no feed atual.'}
          </div>
        </div>

        <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(74,144,217,0.16)' }}>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.66rem', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Termômetro do mercado
          </div>
          <div className="font-condensed font-bold" style={{ color: 'var(--nba-east)', fontSize: '1.1rem', lineHeight: 1 }}>
            {odds.length > 0 ? `${odds.length} leitura${odds.length !== 1 ? 's' : ''} ativa${odds.length !== 1 ? 's' : ''}` : 'Sem odds'}
          </div>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 6, lineHeight: 1.4 }}>
            {odds.length > 0 ? 'As odds já estão ajudando a separar favoritos e pontos de tensão.' : 'O mercado ainda não entregou leitura útil para os jogos atuais.'}
          </div>
        </div>

        <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(255,138,101,0.16)' }}>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.66rem', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Times mais sensíveis
          </div>
          <div className="font-condensed font-bold" style={{ color: '#ff8a65', fontSize: '1.1rem', lineHeight: 1 }}>
            {watchTeams.length > 0 ? watchTeams.map(([team]) => team).join(' · ') : 'Sem pressão extra'}
          </div>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 6, lineHeight: 1.4 }}>
            {watchTeams.length > 0 ? 'Esses times concentram hoje o maior peso de elenco na central.' : 'Nenhuma franquia se destaca como foco de alerta neste momento.'}
          </div>
        </div>
      </div>
    </motion.section>
  )
}

function AnalysisPressureDeck({
  upcomingGames,
  odds,
  news,
  injuries,
}: {
  upcomingGames: ReturnType<typeof useGameFeed>['upcomingGames']
  odds: AnalysisOddsItem[]
  news: AnalysisNewsItem[]
  injuries: InjuryItem[]
}) {
  const pressureCards = useMemo(() => {
    const cards = upcomingGames.map((game) => {
      const homeAbbr = game.home_team?.abbreviation ?? game.home_team_id
      const awayAbbr = game.away_team?.abbreviation ?? game.away_team_id
      const teams = [homeAbbr, awayAbbr].filter((team): team is string => !!team)

      const teamInjuries = injuries.filter((item) => item.team != null && teams.includes(item.team))
      const highImpact = teamInjuries.filter((item) => item.impact === 'high')
      const mediumImpact = teamInjuries.filter((item) => item.impact === 'medium')
      const allNames = normalizeName(`${game.home_team?.name ?? ''} ${game.away_team?.name ?? ''} ${homeAbbr ?? ''} ${awayAbbr ?? ''}`)
      const relatedNews = news.filter((item) => {
        const haystack = normalizeName(`${item.title} ${item.summary ?? ''}`)
        return !!haystack && teams.some((team) => haystack.includes(normalizeName(team))) || haystack.includes(allNames)
      })

      const relatedOdd = odds.find((item) => {
        const homeName = normalizeName(item.home_team_name)
        const awayName = normalizeName(item.away_team_name)
        return (
          (homeAbbr != null && (homeName.includes(normalizeName(homeAbbr)) || normalizeName(game.home_team?.name).includes(homeName))) &&
          (awayAbbr != null && (awayName.includes(normalizeName(awayAbbr)) || normalizeName(game.away_team?.name).includes(awayName)))
        )
      })

      const pressureScore = highImpact.length * 3 + mediumImpact.length + (relatedNews.length > 0 ? 1 : 0) + (relatedOdd ? 1 : 0)

      let title = `${homeAbbr} x ${awayAbbr} em leitura estável`
      let detail = 'Confronto sem grande ruído externo neste momento.'
      let accent = 'var(--nba-text-muted)'
      let border = 'rgba(136,136,153,0.18)'
      let background = 'rgba(12,12,18,0.34)'

      if (highImpact.length >= 2) {
        title = `${homeAbbr} x ${awayAbbr} chega com alto nível de pressão`
        detail = 'Os dois lados carregam ausências que podem deslocar bastante a leitura do jogo.'
        accent = '#ff8a65'
        border = 'rgba(255,138,101,0.22)'
        background = 'rgba(255,138,101,0.08)'
      } else if (highImpact.length === 1) {
        title = `${homeAbbr} x ${awayAbbr} gira em torno de um nome pesado fora`
        detail = `${highImpact[0].player_name} virou o principal ponto de atenção do confronto.`
        accent = '#ff8a65'
        border = 'rgba(255,138,101,0.22)'
        background = 'rgba(255,138,101,0.08)'
      } else if (mediumImpact.length >= 2 || (mediumImpact.length >= 1 && relatedNews.length > 0)) {
        title = `${homeAbbr} x ${awayAbbr} pede monitoramento pré-jogo`
        detail = 'Elenco e noticiário deixam esse duelo mais sensível do que parece à primeira vista.'
        accent = 'var(--nba-gold)'
        border = 'rgba(200,150,60,0.22)'
        background = 'rgba(200,150,60,0.08)'
      } else if (relatedOdd && relatedNews.length > 0) {
        title = `${homeAbbr} x ${awayAbbr} já tem narrativa formada`
        detail = 'Mercado e noticiário estão apontando juntos para esse confronto.'
        accent = 'var(--nba-east)'
        border = 'rgba(74,144,217,0.22)'
        background = 'rgba(74,144,217,0.08)'
      }

      return {
        id: game.id,
        title,
        detail,
        accent,
        border,
        background,
        pressureScore,
        tipOff: formatShortDateTime(game.tip_off_at),
        labels: [
          highImpact.length > 0 ? `${highImpact.length} alerta${highImpact.length !== 1 ? 's' : ''} alto${highImpact.length !== 1 ? 's' : ''}` : null,
          mediumImpact.length > 0 ? `${mediumImpact.length} em monitoramento` : null,
          relatedNews.length > 0 ? `${relatedNews.length} notícia${relatedNews.length !== 1 ? 's' : ''}` : null,
        ].filter((label): label is string => !!label).slice(0, 2),
      }
    })

    return cards
      .sort((a, b) => b.pressureScore - a.pressureScore)
      .slice(0, 3)
  }, [injuries, news, odds, upcomingGames])

  if (pressureCards.length === 0) return null

  return (
    <motion.section
      variants={fadeUpItem}
      initial="hidden"
      animate="show"
      whileHover={{ y: -2, boxShadow: '0 18px 34px rgba(0,0,0,0.16)' }}
      transition={premiumTween}
      style={{ ...card, display: 'grid', gap: 12, borderRadius: 12 }}
    >
      <CardTitle icon={<Sparkles size={14} />}>Onde a rodada pesa</CardTitle>
      <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem', lineHeight: 1.45 }}>
        Os confrontos abaixo concentram hoje o maior peso de elenco, mercado ou noticiário.
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {pressureCards.map((item) => (
          <div
            key={item.id}
            style={{
              padding: '13px 14px',
              borderRadius: 12,
              background: item.background,
              border: `1px solid ${item.border}`,
              display: 'grid',
              gap: 7,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div className="font-condensed font-bold" style={{ color: item.accent, fontSize: '1rem', lineHeight: 1.05 }}>
                {item.title}
              </div>
              <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                {item.tipOff}
              </span>
            </div>
            <div style={{ color: 'var(--nba-text)', fontSize: '0.8rem', lineHeight: 1.45 }}>
              {item.detail}
            </div>
            {item.labels.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {item.labels.map((label) => (
                  <span
                    key={label}
                    style={{
                      display: 'inline-flex',
                      padding: '3px 8px',
                      borderRadius: 999,
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      color: item.accent,
                      background: 'rgba(12,12,18,0.30)',
                      border: `1px solid ${item.border}`,
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.section>
  )
}

function AnalysisAdvantageDeck({
  loading,
  participantReady,
  insights,
}: {
  loading: boolean
  participantReady: boolean
  insights: Array<{
    id: string
    eyebrow: string
    title: string
    detail: string
    accent: string
    border: string
    background: string
    meta?: string
  }>
}) {
  if (!participantReady) return null

  return (
    <motion.section
      variants={fadeUpItem}
      initial="hidden"
      animate="show"
      whileHover={{ y: -2, boxShadow: '0 18px 34px rgba(0,0,0,0.16)' }}
      transition={premiumTween}
      style={{ ...card, display: 'grid', gap: 12, borderRadius: 12 }}
    >
      <CardTitle icon={<TrendingUp size={14} />}>Sua vantagem na rodada</CardTitle>
      <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem', lineHeight: 1.45 }}>
        Uma leitura do que está abrindo oportunidade ou risco para a sua cartela agora.
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '18px 0 8px' }}>
          <LoadingBasketball size={40} />
        </div>
      ) : insights.length > 0 ? (
        <div style={{ display: 'grid', gap: 10 }} className="lg:grid-cols-3">
          {insights.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '14px 15px',
                borderRadius: 12,
                background: item.background,
                border: `1px solid ${item.border}`,
                display: 'grid',
                gap: 8,
                minWidth: 0,
              }}
            >
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {item.eyebrow}
              </div>
              <div className="font-condensed font-bold" style={{ color: item.accent, fontSize: '1.02rem', lineHeight: 1.05 }}>
                {item.title}
              </div>
              <div style={{ color: 'var(--nba-text)', fontSize: '0.8rem', lineHeight: 1.45 }}>
                {item.detail}
              </div>
              {item.meta && (
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>
                  {item.meta}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '14px 15px', borderRadius: 12, border: '1px solid rgba(200,150,60,0.16)', background: 'rgba(12,12,18,0.28)' }}>
          <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '0.95rem', lineHeight: 1.05 }}>
            Cartela estável neste momento
          </div>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem', marginTop: 6, lineHeight: 1.45 }}>
            Sem exposição crítica ou oportunidade clara na leitura atual da rodada.
          </div>
        </div>
      )}
    </motion.section>
  )
}

function AnalysisActionsCard() {
  return (
    <motion.div
      variants={fadeUpItem}
      initial="hidden"
      animate="show"
      whileHover={{ y: -2, boxShadow: '0 18px 34px rgba(0,0,0,0.16)' }}
      transition={premiumTween}
      style={{ ...card, background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(74,144,217,0.08) 48%, rgba(200,150,60,0.08) 100%)' }}
    >
      <CardTitle icon={<Sparkles size={14} />}>Atalhos Relacionados</CardTitle>
      <motion.div variants={softStaggerContainer} initial="hidden" animate="show" style={{ display: 'grid', gap: 10 }}>
        {[
          { to: '/games', label: 'Abrir Jogos', description: 'Voltar para a área de palpites e agenda operacional.' },
          { to: '/official', label: 'Ver chave oficial', description: 'Conferir o andamento real dos playoffs.' },
          { to: '/', label: 'Voltar para Home', description: 'Retornar ao painel principal do bolão.' },
        ].map((action) => (
          <motion.div
            key={action.to}
            variants={fadeUpItem}
            whileHover={{ x: 4, y: -2 }}
            whileTap={pressMotion.tap}
            transition={premiumTween}
          >
            <Link to={action.to} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, textDecoration: 'none', background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)', color: 'var(--nba-text)' }}>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem' }}>{action.label}</span>
                <span style={{ display: 'block', color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 1 }}>
                  {action.description}
                </span>
              </span>
              <ChevronRight size={16} style={{ color: 'var(--nba-text-muted)', flexShrink: 0 }} />
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}

export function Analysis({ auth }: { auth: AuthState }) {
  const { games, upcomingGames, recentCompletedGames } = useGameFeed()
  const { loading, error, generatedAt, odds, news, providers } = useAnalysisInsights()
  const { loading: injuriesLoading, injuries, provider: injuriesProvider, error: injuriesError } = useInjuries()
  const participantId = auth.status === 'authorized' ? auth.participantId : undefined
  const { series, picks, loading: seriesLoading } = useSeries(participantId)
  const safeGames = Array.isArray(games) ? games.filter((game): game is typeof games[number] => Boolean(game)) : []
  const safeUpcomingGames = Array.isArray(upcomingGames) ? upcomingGames.filter((game): game is typeof upcomingGames[number] => Boolean(game)) : []
  const safeRecentCompletedGames = Array.isArray(recentCompletedGames) ? recentCompletedGames.filter((game): game is typeof recentCompletedGames[number] => Boolean(game)) : []
  const safeSeries = Array.isArray(series) ? series.filter((item): item is typeof series[number] => Boolean(item)) : []
  const safePicks = Array.isArray(picks) ? picks.filter((item): item is typeof picks[number] => Boolean(item)) : []
  const allFeedGames = safeGames.length > 0 ? safeGames : [...safeUpcomingGames, ...safeRecentCompletedGames]
  let injuriesToShow: InjuryItem[] = Array.isArray(injuries) ? injuries.filter((item): item is InjuryItem => Boolean(item)) : []
  let injuriesReason =
    injuriesError ?? (!injuriesProvider.available ? injuriesProvider.reason : undefined)

  try {
    const relevantInjuryTeams = new Set(
      allFeedGames.flatMap((game) => [
        game.home_team?.abbreviation ?? game.home_team_id,
        game.away_team?.abbreviation ?? game.away_team_id,
        game.series?.home_team_id,
        game.series?.away_team_id,
      ]).filter((team): team is string => !!team)
    )

    const fallbackPlayoffTeams = new Set(TEAMS_2025.map((t) => t.abbreviation))
    injuriesToShow = injuriesToShow.filter((item) => {
      if (!item.team) return true
      if (relevantInjuryTeams.size > 0) return relevantInjuryTeams.has(item.team)
      return fallbackPlayoffTeams.has(item.team)
    })
    injuriesReason =
      injuriesError
      ?? (!injuriesProvider.available ? injuriesProvider.reason : undefined)
      ?? (injuriesToShow.length === 0 && injuries.length > 0
        ? 'Nenhuma lesão relevante encontrada para os times ativos da rodada.'
        : undefined)
  } catch (injuryFilterError) {
    console.error('[analysis] injuries filter crashed', injuryFilterError)
  }

  const advantageInsights = useMemo(() => {
    try {
      if (!participantId) return []

      const now = Date.now()
      const injuriesByTeam = new Map<string, InjuryItem[]>()
      injuriesToShow.forEach((item) => {
        if (!item?.team) return
        const current = injuriesByTeam.get(item.team) ?? []
        current.push(item)
        injuriesByTeam.set(item.team, current)
      })

      const activeSeries = safeSeries.filter((item) => {
        const unlocked = !item.tip_off_at || new Date(item.tip_off_at).getTime() > now
        return !item.is_complete && !!item.home_team_id && !!item.away_team_id && unlocked
      })

      const cards: Array<{
        id: string
        eyebrow: string
        title: string
        detail: string
        accent: string
        border: string
        background: string
        meta?: string
        score: number
      }> = []

      const unpickedSeries = activeSeries.filter((item) => !safePicks.some((pick) => pick.series_id === item.id))
      const bestOpenWindow = unpickedSeries
        .map((item) => {
          const homeAbbr = item.home_team?.abbreviation ?? item.home_team_id ?? ''
          const awayAbbr = item.away_team?.abbreviation ?? item.away_team_id ?? ''
          const homeHighImpact = (injuriesByTeam.get(homeAbbr) ?? []).filter((injury) => injury.impact === 'high')
          const awayHighImpact = (injuriesByTeam.get(awayAbbr) ?? []).filter((injury) => injury.impact === 'high')
          const strongerSide = homeHighImpact.length >= awayHighImpact.length ? { team: homeAbbr, injuries: homeHighImpact, opponent: awayAbbr } : { team: awayAbbr, injuries: awayHighImpact, opponent: homeAbbr }

          return {
            series: item,
            strongerSide,
            impact: strongerSide.injuries.length,
          }
        })
        .sort((left, right) => right.impact - left.impact)[0]

      if (bestOpenWindow) {
        const { series: item, strongerSide, impact } = bestOpenWindow
        cards.push({
          id: `open-${item.id}`,
          eyebrow: 'Janela de ataque',
          title: `${strongerSide.opponent} ganha ângulo antes do lock`,
          detail: impact > 0
            ? `${strongerSide.team} carrega ${impact} alerta${impact !== 1 ? 's' : ''} alto${impact !== 1 ? 's' : ''}. Essa série ainda está aberta para leitura e pick.`
            : `A série ${item.home_team?.abbreviation ?? item.home_team_id} x ${item.away_team?.abbreviation ?? item.away_team_id} segue aberta e pode ser usada para atacar antes do fechamento.`,
          accent: 'var(--nba-gold)',
          border: 'rgba(200,150,60,0.22)',
          background: 'rgba(200,150,60,0.08)',
          meta: item.tip_off_at ? `Fecha em ${formatShortDateTime(item.tip_off_at)}` : 'Ainda sem horário oficial',
          score: impact > 0 ? 6 + impact : 4,
        })
      }

      const riskyPickedSeries = activeSeries
        .map((item) => {
          const pick = safePicks.find((entry) => entry.series_id === item.id)
          if (!pick) return null

          const pickedTeam = item.home_team_id === pick.winner_id ? item.home_team : item.away_team_id === pick.winner_id ? item.away_team : null
          const pickedAbbr = pickedTeam?.abbreviation ?? pick.winner_id
          const pickedInjuries = (injuriesByTeam.get(pickedAbbr) ?? []).filter((injury) => injury.impact === 'high')
          if (pickedInjuries.length === 0) return null

          return { series: item, pick, pickedTeam, pickedInjuries }
        })
        .filter((value): value is NonNullable<typeof value> => !!value)
        .sort((left, right) => right.pickedInjuries.length - left.pickedInjuries.length)[0]

      if (riskyPickedSeries) {
        cards.push({
          id: `risk-${riskyPickedSeries.series.id}`,
          eyebrow: 'Risco da sua cartela',
          title: `${riskyPickedSeries.pickedTeam?.abbreviation ?? riskyPickedSeries.pick.winner_id} está sob pressão`,
          detail: `${riskyPickedSeries.pickedInjuries[0].player_name} lidera o alerta do lado que você escolheu nesta série. Vale monitorar o noticiário e o lock.`,
          accent: '#ff8a65',
          border: 'rgba(255,138,101,0.22)',
          background: 'rgba(255,138,101,0.08)',
          meta: riskyPickedSeries.series.tip_off_at ? `Série ainda aberta até ${formatShortDateTime(riskyPickedSeries.series.tip_off_at)}` : 'Sem lock oficial no feed',
          score: 8 + riskyPickedSeries.pickedInjuries.length,
        })
      }

      const urgentUnpicked = unpickedSeries
        .filter((item) => item.tip_off_at)
        .sort((left, right) => new Date(left.tip_off_at!).getTime() - new Date(right.tip_off_at!).getTime())[0]

      if (urgentUnpicked) {
        cards.push({
          id: `urgent-${urgentUnpicked.id}`,
          eyebrow: 'Palpite pendente',
          title: `${urgentUnpicked.home_team?.abbreviation ?? urgentUnpicked.home_team_id} x ${urgentUnpicked.away_team?.abbreviation ?? urgentUnpicked.away_team_id} ainda está sem lado`,
          detail: 'Essa é a próxima série da sua cartela que ainda não recebeu leitura fechada. Se ela estiver no seu radar, vale resolver antes de esfriar.',
          accent: 'var(--nba-east)',
          border: 'rgba(74,144,217,0.22)',
          background: 'rgba(74,144,217,0.08)',
          meta: `Lock estimado em ${formatShortDateTime(urgentUnpicked.tip_off_at)}`,
          score: 7,
        })
      }

      return cards
        .sort((left, right) => right.score - left.score)
        .slice(0, 3)
        .map(({ score, ...item }) => item)
    } catch (advantageError) {
      console.error('[analysis] advantage insights crashed', advantageError)
      return []
    }
  }, [injuries, injuriesToShow, participantId, safePicks, safeSeries])

  try {
    const relevantTeamNames = new Set(
      safeUpcomingGames.flatMap((game) => [
        normalizeName(game.home_team?.name),
        normalizeName(game.away_team?.name),
      ]).filter(Boolean)
    )

    const filteredOdds = odds.filter((item) => (
      relevantTeamNames.has(normalizeName(item.home_team_name)) &&
      relevantTeamNames.has(normalizeName(item.away_team_name))
    ))
    const oddsToShow = filteredOdds.length > 0 ? filteredOdds : odds
    const oddsUnfiltered = filteredOdds.length === 0 && odds.length > 0
    const teamStylesByName = Object.fromEntries(
      allFeedGames.flatMap((game) => {
        const homeName = normalizeName(game.home_team?.name)
        const awayName = normalizeName(game.away_team?.name)
        const entries: Array<[string, TeamOddsStyle]> = []

        if (homeName && game.home_team) {
          entries.push([
            homeName,
            {
              abbreviation: game.home_team.abbreviation,
              primaryColor: game.home_team.primary_color ?? '#4a90d9',
              secondaryColor: game.home_team.secondary_color ?? 'rgba(74,144,217,0.18)',
            },
          ])
        }

        if (awayName && game.away_team) {
          entries.push([
            awayName,
            {
              abbreviation: game.away_team.abbreviation,
              primaryColor: game.away_team.primary_color ?? '#e05c3a',
              secondaryColor: game.away_team.secondary_color ?? 'rgba(224,92,58,0.18)',
            },
          ])
        }

        return entries
      })
    )

    const filteredNews = news.filter((item) => {
      const haystack = normalizeName(`${item.title} ${item.summary ?? ''}`)
      if (!haystack) return false
      return Array.from(relevantTeamNames).some((teamName) => teamName && haystack.includes(teamName))
    })
    const newsToShow = filteredNews.length > 0 ? filteredNews : news

    const oddsReason = error
      ? error
      : !providers.odds.available
      ? providers.odds.reason
      : oddsToShow.length === 0
      ? 'Nenhuma odd disponível no momento.'
      : undefined

    const newsReason = error
      ? error
      : !providers.news.available
      ? providers.news.reason
      : newsToShow.length === 0
      ? 'Nenhuma notícia relevante encontrada para a rodada neste momento.'
      : undefined

    return (
      <div className="pb-24 pt-4 px-4 mx-auto flex flex-col gap-4" style={{ maxWidth: 1280 }}>
        <AnalysisHero
          nextGamesCount={safeUpcomingGames.length}
          recentResultsCount={safeRecentCompletedGames.length}
          oddsReady={providers.odds.available && oddsToShow.length > 0}
          newsReady={providers.news.available && newsToShow.length > 0}
          injuriesCount={injuriesToShow.length}
          generatedAt={generatedAt}
        />

        <AnalysisSectionBoundary title="Resumo editorial">
          <AnalysisEditorialDeck
            upcomingGames={safeUpcomingGames}
            odds={oddsToShow}
            news={newsToShow}
            injuries={injuriesToShow}
          />
        </AnalysisSectionBoundary>

        <AnalysisSectionBoundary title="Onde a rodada pesa">
          <AnalysisPressureDeck
            upcomingGames={safeUpcomingGames}
            odds={oddsToShow}
            news={newsToShow}
            injuries={injuriesToShow}
          />
        </AnalysisSectionBoundary>

        <AnalysisSectionBoundary title="Sua vantagem na rodada">
          <AnalysisAdvantageDeck
            loading={seriesLoading || injuriesLoading}
            participantReady={auth.status === 'authorized'}
            insights={advantageInsights}
          />
        </AnalysisSectionBoundary>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr]">
          <div className="flex flex-col gap-4 min-w-0">
            <AnalysisSectionBoundary title="Próximos confrontos">
              <NextGamesCard games={safeUpcomingGames} />
            </AnalysisSectionBoundary>
            <AnalysisSectionBoundary title="Resultados recentes">
              <RecentResultsCard games={safeRecentCompletedGames} />
            </AnalysisSectionBoundary>
            <AnalysisSectionBoundary title="Odds dos confrontos">
              <OddsCard odds={oddsToShow} loading={loading} reason={oddsReason} unfiltered={oddsUnfiltered} teamStylesByName={teamStylesByName} />
            </AnalysisSectionBoundary>
            <div className="xl:hidden">
              <AnalysisSectionBoundary title="Notícias da NBA">
                <NewsCard news={newsToShow} loading={loading} reason={newsReason} />
              </AnalysisSectionBoundary>
            </div>
            <div className="xl:hidden">
              <AnalysisSectionBoundary title="Relatório de lesões">
                <InjuriesCard injuries={injuriesToShow} loading={injuriesLoading} reason={injuriesReason} />
              </AnalysisSectionBoundary>
            </div>
          </div>
          <div className="flex flex-col gap-4 min-w-0">
            <div className="hidden xl:block">
              <AnalysisSectionBoundary title="Notícias da NBA">
                <NewsCard news={newsToShow} loading={loading} reason={newsReason} />
              </AnalysisSectionBoundary>
            </div>
            <AnalysisSectionBoundary title="Relatório de lesões">
              <InjuriesCard injuries={injuriesToShow} loading={injuriesLoading} reason={injuriesReason} />
            </AnalysisSectionBoundary>
            <AnalysisSectionBoundary title="Atalhos relacionados">
              <AnalysisActionsCard />
            </AnalysisSectionBoundary>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('[analysis] page render crashed', error)
    return (
      <div className="pb-24 pt-4 px-4 mx-auto flex flex-col gap-4" style={{ maxWidth: 1280 }}>
        <div style={{ ...card, borderRadius: 12, border: '1px solid rgba(255,138,101,0.24)' }}>
          <div className="font-condensed font-bold" style={{ color: '#ff8a65', fontSize: '1.08rem', lineHeight: 1.05, marginBottom: 8 }}>
            Análise temporariamente indisponível
          </div>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.84rem', lineHeight: 1.5 }}>
            A aba recebeu um dado inesperado durante a montagem. O restante do app continua íntegro enquanto isolamos esse trecho.
          </div>
        </div>
      </div>
    )
  }
}
