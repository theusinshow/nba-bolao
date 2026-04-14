import { Link } from 'react-router-dom'
import { Activity, ChevronRight, Clock, Database, Newspaper, Sparkles, TrendingUp } from 'lucide-react'
import { LoadingBasketball } from '../components/LoadingBasketball'
import { useGameFeed } from '../hooks/useGameFeed'
import { type AnalysisNewsItem, type AnalysisOddsItem, useAnalysisInsights } from '../hooks/useAnalysisInsights'

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
    timeZone: 'America/Sao_Paulo',
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
  { label: "Ball Don't Lie", color: 'var(--nba-success)', bg: 'rgba(46,204,113,0.10)', border: 'rgba(46,204,113,0.18)' },
  { label: 'The Odds API',   color: 'var(--nba-east)',    bg: 'rgba(74,144,217,0.10)', border: 'rgba(74,144,217,0.18)' },
  { label: 'ESPN News',      color: 'var(--nba-gold)',    bg: 'rgba(200,150,60,0.10)', border: 'rgba(200,150,60,0.18)' },
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
  generatedAt,
}: {
  nextGamesCount: number
  recentResultsCount: number
  oddsReady: boolean
  newsReady: boolean
  generatedAt: string | null
}) {
  const sectionsReady = [nextGamesCount > 0 || recentResultsCount > 0, oddsReady, newsReady].filter(Boolean).length

  return (
    <section
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

function NextGamesCard({
  games,
}: {
  games: ReturnType<typeof useGameFeed>['upcomingGames']
}) {
  const sourceGames = games.map((game) => ({
    home: game.home_team?.abbreviation ?? game.home_team_id,
    away: game.away_team?.abbreviation ?? game.away_team_id,
    date: formatShortDateTime(game.tip_off_at),
    round: ROUND_LABEL[game.series?.round ?? game.round ?? 1] ?? 'NBA',
  }))
  const featured = sourceGames[0]

  return (
    <div style={card}>
      <CardTitle icon={<Clock size={14} />}>Próximos Confrontos</CardTitle>

      {featured ? (
        <>
          <div style={{ background: 'linear-gradient(135deg, rgba(74,144,217,0.16), rgba(200,150,60,0.08))', border: '1px solid rgba(200,150,60,0.14)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <span className="font-condensed" style={{ color: 'var(--nba-gold)', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
                PRÓXIMO FOCO
              </span>
              <Badge label={featured.round} color={ROUND_BADGE_COLOR[featured.round] ?? '#888'} small />
            </div>
            <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1.25rem', lineHeight: 1 }}>
              {featured.home} vs {featured.away}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginTop: 6 }}>
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
                  <div key={`${g.home}-${g.away}-${g.date}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderRadius: 6, fontSize: '0.85rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.9rem' }}>
                          {g.home} <span style={{ color: 'var(--nba-text-muted)', fontWeight: 400 }}>vs</span> {g.away}
                        </div>
                        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 1 }}>
                          {g.date}
                        </div>
                      </div>
                      <Badge label={g.round} color={color} small />
                    </div>
                    {i < arr.length - 1 && <Divider />}
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
          Nenhum próximo confronto real sincronizado no momento.
        </div>
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
    <div style={card}>
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
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
          Ainda não há resultados finais reais no banco para alimentar este bloco.
        </div>
      )}
    </div>
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
    <div style={card}>
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
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
          {reason ?? 'Nenhuma odd correspondente aos jogos atuais foi encontrada.'}
        </div>
      )}
    </div>
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
    <div style={card}>
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
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
          {reason ?? 'Nenhuma notícia relevante foi encontrada para a NBA neste momento.'}
        </div>
      )}
    </div>
  )
}

function AnalysisActionsCard() {
  return (
    <div style={{ ...card, background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(74,144,217,0.08) 48%, rgba(200,150,60,0.08) 100%)' }}>
      <CardTitle icon={<Sparkles size={14} />}>Atalhos Relacionados</CardTitle>
      <div style={{ display: 'grid', gap: 10 }}>
        {[
          { to: '/games', label: 'Abrir Jogos', description: 'Voltar para a área de palpites e agenda operacional.' },
          { to: '/official', label: 'Ver chave oficial', description: 'Conferir o andamento real dos playoffs.' },
          { to: '/', label: 'Voltar para Home', description: 'Retornar ao painel principal do bolão.' },
        ].map((action) => (
          <Link key={action.to} to={action.to} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, textDecoration: 'none', background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)', color: 'var(--nba-text)' }}>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem' }}>{action.label}</span>
              <span style={{ display: 'block', color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 1 }}>
                {action.description}
              </span>
            </span>
            <ChevronRight size={16} style={{ color: 'var(--nba-text-muted)', flexShrink: 0 }} />
          </Link>
        ))}
      </div>
    </div>
  )
}

export function Analysis() {
  const { upcomingGames, recentCompletedGames } = useGameFeed()
  const { loading, error, generatedAt, odds, news, providers } = useAnalysisInsights()
  const allFeedGames = [...upcomingGames, ...recentCompletedGames]

  const relevantTeamNames = new Set(
    upcomingGames.flatMap((game) => [
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
        nextGamesCount={upcomingGames.length}
        recentResultsCount={recentCompletedGames.length}
        oddsReady={providers.odds.available && oddsToShow.length > 0}
        newsReady={providers.news.available && newsToShow.length > 0}
        generatedAt={generatedAt}
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr]">
        <div className="flex flex-col gap-4 min-w-0">
          <NextGamesCard games={upcomingGames} />
          <RecentResultsCard games={recentCompletedGames} />
          <OddsCard odds={oddsToShow} loading={loading} reason={oddsReason} unfiltered={oddsUnfiltered} teamStylesByName={teamStylesByName} />
          <div className="xl:hidden">
            <NewsCard news={newsToShow} loading={loading} reason={newsReason} />
          </div>
        </div>
        <div className="flex flex-col gap-4 min-w-0">
          <div className="hidden xl:block">
            <NewsCard news={newsToShow} loading={loading} reason={newsReason} />
          </div>
          <AnalysisActionsCard />
        </div>
      </div>
    </div>
  )
}
