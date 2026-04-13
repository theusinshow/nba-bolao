import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, ChevronRight, Clock, Database, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react'
import { LoadingBasketball } from '../components/LoadingBasketball'
import { useGameFeed } from '../hooks/useGameFeed'
import { type AnalysisInjuryItem, type AnalysisOddsItem, useAnalysisInsights } from '../hooks/useAnalysisInsights'

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

function formatInjuryStatus(value: string) {
  const lower = value.toLowerCase()
  if (lower === 'out') return 'Fora'
  if (lower === 'questionable') return 'Questionável'
  if (lower === 'probable') return 'Provável'
  if (lower === 'doubtful') return 'Duvidoso'
  return value
}

function getInjuryColor(value: string) {
  const lower = value.toLowerCase()
  if (lower === 'out') return '#e74c3c'
  if (lower === 'questionable') return '#f39c12'
  if (lower === 'probable') return '#27ae60'
  if (lower === 'doubtful') return '#d35400'
  return '#4a90d9'
}

function AnalysisHero({
  nextGamesCount,
  recentResultsCount,
  oddsReady,
  injuriesReady,
}: {
  nextGamesCount: number
  recentResultsCount: number
  oddsReady: boolean
  injuriesReady: boolean
}) {
  const sectionsReady = [nextGamesCount > 0 || recentResultsCount > 0, oddsReady, injuriesReady].filter(Boolean).length

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
              Odds, lesões e agenda real concentradas em uma única aba.
            </p>
            <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', maxWidth: 620, margin: 0 }}>
              Jogos e resultados seguem vindo do Supabase sincronizado com Ball Don’t Lie. Odds e lesões agora passam pelo backend para proteger as chaves externas e filtrar só o que importa para a rodada.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 10 }} className="grid-cols-2">
            {[
              { label: 'Próximos jogos reais', value: nextGamesCount, tone: 'var(--nba-text)' },
              { label: 'Resultados reais', value: recentResultsCount, tone: 'var(--nba-gold)' },
              { label: 'Odds prontas', value: oddsReady ? 'Sim' : 'Não', tone: oddsReady ? 'var(--nba-success)' : 'var(--nba-danger)' },
              { label: 'Lesões prontas', value: injuriesReady ? 'Sim' : 'Não', tone: injuriesReady ? 'var(--nba-success)' : 'var(--nba-danger)' },
            ].map((item) => (
              <div key={item.label} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)' }}>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>{item.label}</div>
                <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.35rem', lineHeight: 1 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
          {sectionsReady}/4 frentes já respondendo de forma real ou operacional.
        </div>
      </div>
    </section>
  )
}

function AnalysisContextCard({
  generatedAt,
  oddsReason,
  injuriesReason,
}: {
  generatedAt: string | null
  oddsReason?: string
  injuriesReason?: string
}) {
  return (
    <section style={{ ...card, background: 'linear-gradient(135deg, rgba(200,150,60,0.10), rgba(74,144,217,0.06) 55%, rgba(19,19,26,1) 100%)', border: '1px solid rgba(200,150,60,0.18)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color: 'var(--nba-gold)', display: 'flex' }}>
          <AlertTriangle size={14} />
        </span>
        <span className="font-condensed" style={{ color: 'var(--nba-gold)', fontSize: '0.76rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Contexto Atual
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, color: 'var(--nba-success)', background: 'rgba(46,204,113,0.10)', border: '1px solid rgba(46,204,113,0.18)' }}>
          Ball Don’t Lie para jogos/placares
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, color: 'var(--nba-east)', background: 'rgba(74,144,217,0.10)', border: '1px solid rgba(74,144,217,0.18)' }}>
          The Odds API para odds
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, color: 'var(--nba-gold)', background: 'rgba(200,150,60,0.10)', border: '1px solid rgba(200,150,60,0.18)' }}>
          SportsDataIO para lesões
        </span>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <p style={{ color: 'var(--nba-text)', fontSize: '0.82rem', margin: 0, lineHeight: 1.45 }}>
          {generatedAt
            ? `Última leitura do backend em ${formatShortDateTime(generatedAt)}.`
            : 'Aguardando a primeira leitura do backend de análise.'}
        </p>
        {oddsReason && (
          <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', margin: 0, lineHeight: 1.45 }}>
            Odds: {oddsReason}
          </p>
        )}
        {injuriesReason && (
          <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', margin: 0, lineHeight: 1.45 }}>
            Lesões: {injuriesReason}
          </p>
        )}
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

          <div>
            {sourceGames.map((g, i) => {
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
                  {i < sourceGames.length - 1 && <Divider />}
                </div>
              )
            })}
          </div>
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
  const sourceGames = games.map((game) => ({
    home: game.home_team?.abbreviation ?? game.home_team_id,
    away: game.away_team?.abbreviation ?? game.away_team_id,
    homeScore: game.home_score ?? 0,
    awayScore: game.away_score ?? 0,
    round: ROUND_LABEL[game.series?.round ?? game.round ?? 1] ?? 'NBA',
    note: formatShortDateTime(game.tip_off_at),
  }))

  return (
    <div style={card}>
      <CardTitle icon={<Database size={14} />}>Resultados Recentes</CardTitle>

      {sourceGames.length > 0 ? (
        <div>
          {sourceGames.map((game, i) => (
            <div key={`${game.home}-${game.away}-${game.note}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderRadius: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.92rem' }}>
                    {game.home} <span style={{ color: 'var(--nba-text-muted)', fontWeight: 400 }}>vs</span> {game.away}
                  </div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 2 }}>
                    {game.note}
                  </div>
                </div>
                <div style={{ display: 'grid', justifyItems: 'end', gap: 4 }}>
                  <Badge label={game.round} color={ROUND_BADGE_COLOR[game.round] ?? '#888'} small />
                  <span className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '0.95rem' }}>
                    {game.homeScore} - {game.awayScore}
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
}: {
  odds: AnalysisOddsItem[]
  loading: boolean
  reason?: string
}) {
  return (
    <div style={card}>
      <CardTitle icon={<TrendingUp size={14} />}>Odds dos Confrontos</CardTitle>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '18px 0' }}>
          <LoadingBasketball size={20} />
        </div>
      ) : odds.length > 0 ? (
        <div>
          {odds.map((item, index) => (
            <div key={item.id}>
              <div style={{ display: 'grid', gap: 8, padding: '8px 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '0.92rem' }}>
                    {item.home_team_name} <span style={{ color: 'var(--nba-text-muted)', fontWeight: 400 }}>vs</span> {item.away_team_name}
                  </div>
                  <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>{item.bookmaker}</span>
                </div>

                <div style={{ display: 'grid', gap: 6 }} className="sm:grid-cols-3">
                  <div style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.12)' }}>
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.66rem', marginBottom: 4 }}>Moneyline</div>
                    <div style={{ color: 'var(--nba-text)', fontSize: '0.76rem' }}>{formatAmericanOdds(item.moneyline.home)} / {formatAmericanOdds(item.moneyline.away)}</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.12)' }}>
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.66rem', marginBottom: 4 }}>Spread</div>
                    <div style={{ color: 'var(--nba-text)', fontSize: '0.76rem' }}>{item.spread.home_line ?? '—'} / {item.spread.away_line ?? '—'}</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.12)' }}>
                    <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.66rem', marginBottom: 4 }}>Total</div>
                    <div style={{ color: 'var(--nba-text)', fontSize: '0.76rem' }}>{item.total.points ?? '—'}</div>
                  </div>
                </div>

                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>
                  Atualizado em {formatShortDateTime(item.updated_at ?? item.commence_time)}
                </div>
              </div>
              {index < odds.length - 1 && <Divider />}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
          {reason ?? 'Nenhuma odd correspondente aos jogos atuais foi encontrada.'}
        </div>
      )}
    </div>
  )
}

function InjuriesCard({
  injuries,
  loading,
  reason,
}: {
  injuries: AnalysisInjuryItem[]
  loading: boolean
  reason?: string
}) {
  return (
    <div style={card}>
      <CardTitle icon={<ShieldAlert size={14} />}>Lesões e Notícias</CardTitle>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '18px 0' }}>
          <LoadingBasketball size={20} />
        </div>
      ) : injuries.length > 0 ? (
        <div>
          {injuries.map((item, index) => (
            <div key={item.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderRadius: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--nba-text)', fontWeight: 600, fontSize: '0.83rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.player_name}
                  </div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
                    {[item.team, item.position, item.detail].filter(Boolean).join(' • ')}
                  </div>
                </div>
                <Badge label={formatInjuryStatus(item.status)} color={getInjuryColor(item.status)} small />
              </div>
              {index < injuries.length - 1 && <Divider />}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
          {reason ?? 'Nenhuma lesão relevante foi encontrada para os confrontos atuais.'}
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
  const { loading, error, generatedAt, odds, injuries, providers } = useAnalysisInsights()

  const relevantTeamNames = new Set(
    upcomingGames.flatMap((game) => [
      normalizeName(game.home_team?.name),
      normalizeName(game.away_team?.name),
    ]).filter(Boolean)
  )
  const relevantTeamAbbreviations = new Set(
    upcomingGames.flatMap((game) => [
      normalizeName(game.home_team?.abbreviation ?? game.home_team_id),
      normalizeName(game.away_team?.abbreviation ?? game.away_team_id),
    ]).filter(Boolean)
  )

  const filteredOdds = odds.filter((item) => (
    relevantTeamNames.has(normalizeName(item.home_team_name)) &&
    relevantTeamNames.has(normalizeName(item.away_team_name))
  ))

  const filteredInjuries = injuries.filter((item) => item.team && relevantTeamAbbreviations.has(normalizeName(item.team)))

  const oddsReason = error
    ? error
    : !providers.odds.available
    ? providers.odds.reason
    : filteredOdds.length === 0
    ? 'Odds carregadas, mas ainda sem correspondência para os jogos atuais da sua rodada.'
    : undefined

  const injuriesReason = error
    ? error
    : !providers.injuries.available
    ? providers.injuries.reason
    : filteredInjuries.length === 0
    ? 'Nenhuma lesão relevante retornou para os times envolvidos nos próximos confrontos.'
    : undefined

  return (
    <div className="pb-24 pt-4 px-4 mx-auto flex flex-col gap-4" style={{ maxWidth: 1280 }}>
      <AnalysisHero
        nextGamesCount={upcomingGames.length}
        recentResultsCount={recentCompletedGames.length}
        oddsReady={providers.odds.available && filteredOdds.length > 0}
        injuriesReady={providers.injuries.available && filteredInjuries.length > 0}
      />
      <AnalysisContextCard
        generatedAt={generatedAt}
        oddsReason={providers.odds.available ? undefined : providers.odds.reason}
        injuriesReason={providers.injuries.available ? undefined : providers.injuries.reason}
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr]">
        <div className="flex flex-col gap-4 min-w-0">
          <NextGamesCard games={upcomingGames} />
          <RecentResultsCard games={recentCompletedGames} />
          <OddsCard odds={filteredOdds} loading={loading} reason={oddsReason} />
          <InjuriesCard injuries={filteredInjuries} loading={loading} reason={injuriesReason} />
        </div>
        <div className="flex flex-col gap-4 min-w-0">
          <AnalysisActionsCard />
        </div>
      </div>
    </div>
  )
}
