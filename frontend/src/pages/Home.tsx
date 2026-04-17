import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowDown, ArrowUp, Minus, AlertTriangle, ArrowLeftRight, ChevronRight, Clock, Sparkles, Star, Target, Trophy, Users, Zap } from 'lucide-react'
import { SkeletonCard } from '../components/SkeletonCard'
import { OnboardingTour } from '../components/OnboardingTour'
import { useRanking } from '../hooks/useRanking'
import { useSeries } from '../hooks/useSeries'
import { useGameFeed } from '../hooks/useGameFeed'
import { useAnalysisInsights } from '../hooks/useAnalysisInsights'
import { type GameHighlightItem, useGameHighlights } from '../hooks/useGameHighlights'
import { type InjuryItem, useInjuries } from '../hooks/useInjuries'
import { useOnboarding } from '../hooks/useOnboarding'
import { isSeriesReadyForPick } from '../utils/bracket'
import { getTeamLogoUrl } from '../data/teams2025'
import { BRT_TIMEZONE } from '../utils/constants'
import { fadeInItem, fadeUpItem, premiumTween, pressMotion, scaleInItem, softStaggerContainer, staggerContainer } from '../lib/motion'

interface Props {
  participantId: string
}

const ROUND_LABEL: Record<number, string> = { 1: 'R1', 2: 'R2', 3: 'CF', 4: 'Finals' }

const card: React.CSSProperties = {
  background: 'var(--nba-surface)',
  border: '1px solid var(--nba-border)',
  borderRadius: 8,
  padding: '1rem',
}

const ROUND_BADGE_COLOR: Record<string, string> = {
  Finals: 'var(--nba-gold)',
  R1: '#4a90d9',
  R2: '#9b59b6',
  CF: '#e05c3a',
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

function RankArrow({ diff }: { diff: number }) {
  if (diff > 0) return <ArrowUp size={10} style={{ color: 'var(--nba-success)', flexShrink: 0 }} />
  if (diff < 0) return <ArrowDown size={10} style={{ color: 'var(--nba-danger)', flexShrink: 0 }} />
  return <Minus size={10} style={{ color: 'var(--nba-text-muted)', flexShrink: 0 }} />
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        background: `${color}22`,
        color,
        borderRadius: 4,
        padding: '1px 6px',
        fontSize: '0.65rem',
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

function useCountdown(targetDate: string | null | undefined) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    if (!targetDate) { setLabel(''); return }
    function tick() {
      const diff = new Date(targetDate!).getTime() - Date.now()
      if (diff <= 0) { setLabel('Agora'); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      if (h > 23) setLabel(formatShortDateTime(targetDate))
      else if (h > 0) setLabel(`em ${h}h ${m}min`)
      else setLabel(`em ${m}min`)
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [targetDate])
  return label
}

function LastNightRecap({
  games,
  upcomingGames,
  isRealData,
  loading,
  highlightsByGameId,
  highlightsLoading,
  highlightsAvailable,
}: {
  games: ReturnType<typeof useGameFeed>['recentCompletedGames']
  upcomingGames: ReturnType<typeof useGameFeed>['upcomingGames']
  isRealData: boolean
  loading: boolean
  highlightsByGameId: Record<number, GameHighlightItem>
  highlightsLoading: boolean
  highlightsAvailable: boolean
}) {
  function buildPlayerOfNight(highlight: GameHighlightItem | undefined) {
    if (!highlight) return null
    const candidates = [
      highlight.leaders.points ? { ...highlight.leaders.points, tag: 'PTS' } : null,
      highlight.leaders.rebounds ? { ...highlight.leaders.rebounds, tag: 'REB' } : null,
      highlight.leaders.assists ? { ...highlight.leaders.assists, tag: 'AST' } : null,
    ].filter((item): item is NonNullable<typeof item> => !!item)

    return candidates.sort((left, right) => right.value - left.value)[0] ?? null
  }

  const sourceGames = games.map((game) => ({
    nbaGameId: game.nba_game_id ?? null,
    home: game.home_team?.abbreviation ?? game.home_team_id,
    away: game.away_team?.abbreviation ?? game.away_team_id,
    homeAbbr: game.home_team?.abbreviation ?? game.home_team_id,
    awayAbbr: game.away_team?.abbreviation ?? game.away_team_id,
    homeScore: game.home_score ?? 0,
    awayScore: game.away_score ?? 0,
    homeWon: game.winner_id === game.home_team_id,
    awayWon: game.winner_id === game.away_team_id,
    round: ROUND_LABEL[game.series?.round ?? game.round ?? 1] ?? 'NBA',
    note: formatShortDateTime(game.tip_off_at),
    gameNumber: game.game_number,
  }))
  // Duplica para loop contínuo do carrossel
  const carouselItems = sourceGames.length > 0 ? [...sourceGames, ...sourceGames] : []
  const nextRealGame = upcomingGames[0]
  const countdown = useCountdown(nextRealGame?.tip_off_at)

  return (
    <motion.section
      variants={fadeUpItem}
      initial="hidden"
      animate="show"
      whileHover={{ y: -2, boxShadow: '0 20px 42px rgba(0,0,0,0.18)' }}
      transition={premiumTween}
      style={{ ...card, padding: '0.9rem 0', overflow: 'hidden', position: 'relative', background: 'linear-gradient(135deg, rgba(74,144,217,0.12), rgba(200,150,60,0.08) 60%, rgba(19,19,26,1) 100%)', border: '1px solid rgba(200,150,60,0.18)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 1rem', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--nba-gold)', display: 'flex' }}>
            <Clock size={14} />
          </span>
          <h2 className="title" style={{ color: 'var(--nba-gold)', fontSize: '0.95rem', letterSpacing: '0.08em', lineHeight: 1, margin: 0 }}>
            Jogos da última noite
          </h2>
        </div>
        {countdown && nextRealGame ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(200,150,60,0.12)', border: '1px solid rgba(200,150,60,0.22)', borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', color: 'var(--nba-gold)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            <Clock size={11} />
            Próximo {countdown}
          </span>
        ) : (
          <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
            {isRealData ? 'placares reais' : 'aguardando dados'}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 1rem 0.2rem' }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} style={{ minWidth: 250, padding: '12px 14px', borderRadius: 10, background: 'rgba(12,12,18,0.42)', border: '1px solid rgba(200,150,60,0.14)', display: 'grid', gap: 8 }}>
              <SkeletonCard width="72%" height={12} />
              <SkeletonCard width="48%" height={28} />
              <SkeletonCard width="60%" height={10} />
            </div>
          ))}
        </div>
      ) : sourceGames.length > 0 ? (
        <div style={{ overflow: 'hidden', padding: '0 0 0.2rem' }}>
          <div
            className="nba-marquee"
            style={{ display: 'flex', gap: 10, width: 'max-content' }}
          >
            {carouselItems.map((game, i) => (
              <div
                key={`${game.home}-${game.away}-${i}`}
                style={{
                  width: 252,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'rgba(12,12,18,0.42)',
                  border: '1px solid rgba(200,150,60,0.14)',
                  display: 'grid',
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                {/* Times com logos */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    <img
                      src={getTeamLogoUrl(game.homeAbbr)}
                      alt={game.homeAbbr}
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                      style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }}
                    />
                    <span
                      className="font-condensed font-bold"
                      style={{ color: game.homeWon ? 'var(--nba-text)' : 'var(--nba-text-muted)', fontSize: '0.88rem', lineHeight: 1 }}
                    >
                      {game.home}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.62rem', fontWeight: 600 }}>J{game.gameNumber}</span>
                    <Badge label={game.round} color={ROUND_BADGE_COLOR[game.round] ?? '#888'} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                  <img
                    src={getTeamLogoUrl(game.awayAbbr)}
                    alt={game.awayAbbr}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                    style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }}
                  />
                  <span
                    className="font-condensed font-bold"
                    style={{ color: game.awayWon ? 'var(--nba-text)' : 'var(--nba-text-muted)', fontSize: '0.88rem', lineHeight: 1 }}
                  >
                    {game.away}
                  </span>
                </div>

                {/* Placar */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '1.25rem', lineHeight: 1 }}>
                    {game.homeScore} — {game.awayScore}
                  </span>
                  <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>final</span>
                </div>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>{game.note}</div>

                {game.nbaGameId && highlightsByGameId[game.nbaGameId] && (
                  <div
                    style={{
                      marginTop: 2,
                      paddingTop: 8,
                      borderTop: '1px solid rgba(200,150,60,0.12)',
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    {highlightsByGameId[game.nbaGameId].headline && (
                      <div style={{ color: 'var(--nba-text)', fontSize: '0.72rem', lineHeight: 1.35, fontWeight: 600 }}>
                        {highlightsByGameId[game.nbaGameId].headline}
                      </div>
                    )}

                    {buildPlayerOfNight(highlightsByGameId[game.nbaGameId]) && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          padding: '6px 8px',
                          borderRadius: 8,
                          background: 'rgba(200,150,60,0.08)',
                          border: '1px solid rgba(200,150,60,0.12)',
                        }}
                      >
                        <span style={{ color: 'var(--nba-gold)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em' }}>
                          JOGADOR DA NOITE
                        </span>
                        <span style={{ color: 'var(--nba-text)', fontSize: '0.68rem', minWidth: 0, flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {buildPlayerOfNight(highlightsByGameId[game.nbaGameId])!.player_name} ({buildPlayerOfNight(highlightsByGameId[game.nbaGameId])!.tag} {buildPlayerOfNight(highlightsByGameId[game.nbaGameId])!.value})
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'grid', gap: 4 }}>
                      {[
                        { label: 'PTS', leader: highlightsByGameId[game.nbaGameId].leaders.points },
                        { label: 'REB', leader: highlightsByGameId[game.nbaGameId].leaders.rebounds },
                        { label: 'AST', leader: highlightsByGameId[game.nbaGameId].leaders.assists },
                      ].map(({ label, leader }) => (
                        leader ? (
                          <div key={`${game.nbaGameId}-${label}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.62rem', fontWeight: 700 }}>{label}</span>
                            <span style={{ color: 'var(--nba-text)', fontSize: '0.68rem', minWidth: 0, flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {leader.player_name}{leader.team ? ` (${leader.team})` : ''} — {leader.value}
                            </span>
                          </div>
                        ) : null
                      ))}
                    </div>
                  </div>
                )}

                {game.nbaGameId && !highlightsByGameId[game.nbaGameId] && highlightsLoading && (
                  <div style={{ marginTop: 2, paddingTop: 8, borderTop: '1px solid rgba(200,150,60,0.12)', color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>
                    Carregando destaques individuais...
                  </div>
                )}

                {game.nbaGameId && !highlightsByGameId[game.nbaGameId] && !highlightsLoading && !highlightsAvailable && (
                  <div style={{ marginTop: 2, paddingTop: 8, borderTop: '1px solid rgba(200,150,60,0.12)', color: 'var(--nba-text-muted)', fontSize: '0.68rem' }}>
                    Destaques individuais indisponíveis no momento.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: '0 1rem 0.2rem' }}>
          <div
            style={{
              borderRadius: 12,
              padding: '16px 18px',
              background: 'linear-gradient(135deg, rgba(12,12,18,0.42), rgba(74,144,217,0.05))',
              border: '1px solid rgba(200,150,60,0.16)',
              display: 'grid',
              gap: 10,
            }}
          >
            <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '0.98rem', lineHeight: 1 }}>
              Ainda não há jogos finalizados nesta pós-temporada
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.78rem', lineHeight: 1.55 }}>
              A Home agora mostra só placares reais. Quando o primeiro jogo terminar, este bloco será atualizado automaticamente pelo feed sincronizado do Supabase.
            </div>
            {nextRealGame && (
              <div style={{ color: 'var(--nba-east)', fontSize: '0.76rem', lineHeight: 1.45 }}>
                Próximo jogo confirmado: {nextRealGame.home_team?.abbreviation ?? nextRealGame.home_team_id} vs {nextRealGame.away_team?.abbreviation ?? nextRealGame.away_team_id} em {formatShortDateTime(nextRealGame.tip_off_at)}
              </div>
            )}
          </div>
        </div>
      )}

    </motion.section>
  )
}

function HeroPanel({
  myEntry,
  pickedSeries,
  readySeries,
  totalSeries,
  leaderPoints,
  urgentPicks,
  todayGamesCount,
  liveGamesCount,
  alertSeriesCount,
}: {
  myEntry?: { rank: number; total_points: number; participant_name: string }
  pickedSeries: number
  readySeries: number
  totalSeries: number
  leaderPoints: number
  urgentPicks: number
  todayGamesCount: number
  liveGamesCount: number
  alertSeriesCount: number
}) {
  const progress = readySeries > 0 ? Math.round((pickedSeries / readySeries) * 100) : 0
  const missingReady = Math.max(readySeries - pickedSeries, 0)
  const gapToLeader = myEntry ? Math.max(leaderPoints - myEntry.total_points, 0) : null

  const primaryAction =
    missingReady > 0
      ? { to: '/bracket', label: 'Fechar meus palpites', description: `${missingReady} série${missingReady !== 1 ? 's' : ''} pronta${missingReady !== 1 ? 's' : ''} sem pick`, tone: 'var(--nba-gold)' }
      : myEntry && myEntry.rank > 1
      ? { to: '/ranking', label: 'Caçar o líder', description: `${gapToLeader ?? 0} ponto${gapToLeader === 1 ? '' : 's'} para empatar`, tone: 'var(--nba-east)' }
      : { to: '/games', label: 'Ver jogos do dia', description: 'Acompanhar os próximos movimentos do bolão', tone: 'var(--nba-success)' }

  const focusSummary =
    urgentPicks > 0
      ? `Hoje a prioridade é fechar ${urgentPicks} série${urgentPicks !== 1 ? 's' : ''} pronta${urgentPicks !== 1 ? 's' : ''} antes do lock.`
      : liveGamesCount > 0
      ? `${liveGamesCount} jogo${liveGamesCount !== 1 ? 's' : ''} ao vivo mexendo na chave real agora.`
      : todayGamesCount > 0
      ? `${todayGamesCount} confronto${todayGamesCount !== 1 ? 's' : ''} agitado${todayGamesCount !== 1 ? 's' : ''} na agenda real de hoje.`
      : alertSeriesCount > 0
      ? `${alertSeriesCount} série${alertSeriesCount !== 1 ? 's' : ''} seguem em alerta por contexto de elenco.`
      : 'Seu painel está limpo e pronto para acompanhar o próximo movimento da rodada.'

  return (
    <motion.section
      variants={scaleInItem}
      initial="hidden"
      animate="show"
      whileHover={{ y: -3, boxShadow: '0 24px 48px rgba(0,0,0,0.22)' }}
      style={{
        background: 'linear-gradient(135deg, rgba(200,150,60,0.18), rgba(74,144,217,0.10) 45%, rgba(19,19,26,1) 100%)',
        border: '1px solid rgba(200,150,60,0.22)',
        borderRadius: 12,
        padding: '1.1rem',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(232,180,90,0.18), transparent 34%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', display: 'grid', gap: 14 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nba-gold)' }}>
          <img src="/logo-bolao-nba-512.png" alt="Logo do Bolão NBA" style={{ width: 26, height: 26, objectFit: 'contain', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.28))' }} />
          <Sparkles size={14} />
          <span className="font-condensed" style={{ fontSize: '0.76rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Painel do participante
          </span>
        </div>

        {/* Title + greeting */}
        <div>
          <h1 className="title" style={{ color: 'var(--nba-gold)', fontSize: 'clamp(2rem, 5vw, 3rem)', lineHeight: 0.95, margin: 0 }}>
            Bolão NBA 2026
          </h1>
          <p style={{ color: 'var(--nba-text)', fontSize: '0.95rem', margin: '8px 0 0' }}>
            {myEntry ? `${myEntry.participant_name.split(' ')[0]}, você está no jogo.` : 'Seu painel está pronto para os playoffs.'}
          </p>
          <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', margin: '8px 0 0', lineHeight: 1.45, maxWidth: 620 }}>
            {focusSummary}
          </p>
        </div>

        <motion.div
          variants={softStaggerContainer}
          initial="hidden"
          animate="show"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}
        >
          {[
            {
              label: 'Palpites urgentes',
              value: urgentPicks,
              helper: urgentPicks > 0 ? 'séries prontas sem pick' : 'nenhum lock pendente',
              color: urgentPicks > 0 ? 'var(--nba-gold)' : 'var(--nba-success)',
              background: urgentPicks > 0 ? 'rgba(200,150,60,0.10)' : 'rgba(46,204,113,0.08)',
              border: urgentPicks > 0 ? 'rgba(200,150,60,0.18)' : 'rgba(46,204,113,0.16)',
            },
            {
              label: liveGamesCount > 0 ? 'Jogos ao vivo' : 'Jogos de hoje',
              value: liveGamesCount > 0 ? liveGamesCount : todayGamesCount,
              helper: liveGamesCount > 0 ? 'mexendo na chave agora' : todayGamesCount > 0 ? 'na agenda real da NBA' : 'sem jogo confirmado hoje',
              color: liveGamesCount > 0 ? 'var(--nba-success)' : 'var(--nba-east)',
              background: liveGamesCount > 0 ? 'rgba(46,204,113,0.08)' : 'rgba(74,144,217,0.08)',
              border: liveGamesCount > 0 ? 'rgba(46,204,113,0.16)' : 'rgba(74,144,217,0.16)',
            },
            {
              label: 'Radar de alerta',
              value: alertSeriesCount,
              helper: alertSeriesCount > 0 ? 'séries com contexto sensível' : 'sem sinal de pressão extra',
              color: alertSeriesCount > 0 ? '#ff8c72' : 'var(--nba-text-muted)',
              background: alertSeriesCount > 0 ? 'rgba(255,140,114,0.09)' : 'rgba(255,255,255,0.03)',
              border: alertSeriesCount > 0 ? 'rgba(255,140,114,0.16)' : 'rgba(255,255,255,0.06)',
            },
          ].map(({ label, value, helper, color, background, border }) => (
            <motion.div
              key={label}
              variants={scaleInItem}
              whileHover={{ y: -2, scale: 1.015 }}
              style={{ background, border: `1px solid ${border}`, borderRadius: 12, padding: '11px 12px' }}
            >
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.66rem', marginBottom: 5, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {label}
              </div>
              <div className="font-condensed font-bold" style={{ color, fontSize: '1.55rem', lineHeight: 1 }}>
                {value}
              </div>
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem', marginTop: 5, lineHeight: 1.35 }}>
                {helper}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* 3 stat chips */}
        <motion.div variants={softStaggerContainer} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Minha posição', value: myEntry ? `#${myEntry.rank}` : '—', color: 'var(--nba-gold)' },
            { label: 'Meus pontos', value: myEntry?.total_points ?? 0, color: 'var(--nba-text)' },
            { label: 'Dist. do líder', value: myEntry ? (gapToLeader === 0 ? 'LÍDER' : `${gapToLeader}`) : '—', color: 'var(--nba-east)' },
          ].map(({ label, value, color }) => (
            <motion.div key={label} variants={scaleInItem} whileHover={{ y: -2, scale: 1.015 }} style={{ background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.66rem', marginBottom: 5, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
              <div className="font-condensed font-bold" style={{ color, fontSize: '1.7rem', lineHeight: 1 }}>{value}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Progress bar */}
        <div style={{ background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.16)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <span style={{ color: 'var(--nba-text)', fontWeight: 600, fontSize: '0.84rem' }}>Progresso do bracket</span>
            <span className="font-condensed font-bold" style={{ color: progress === 100 ? 'var(--nba-success)' : 'var(--nba-gold)' }}>
              {pickedSeries}/{readySeries || totalSeries} — {progress}%
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              borderRadius: 999,
              background: progress === 100 ? 'linear-gradient(90deg, #2ecc71, #7ae6a5)' : 'linear-gradient(90deg, var(--nba-gold), var(--nba-gold-light))',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>

        {/* Smart CTA */}
        <div style={{ borderRadius: 10, background: 'rgba(12,12,18,0.42)', border: `1px solid color-mix(in srgb, ${primaryAction.tone} 22%, transparent)`, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 10px' }}>
            <div className="font-condensed font-bold" style={{ color: primaryAction.tone, fontSize: '1rem', lineHeight: 1 }}>
              {primaryAction.label}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', marginTop: 4 }}>
              {primaryAction.description}
            </div>
          </div>
          <motion.div whileHover={{ y: -1 }} whileTap={pressMotion.tap}>
          <Link
            to={primaryAction.to}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '11px 16px',
              textDecoration: 'none',
              background: primaryAction.tone,
              color: '#0a0a0f',
              fontWeight: 700,
              fontSize: '0.86rem',
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.04em',
              borderTop: `1px solid color-mix(in srgb, ${primaryAction.tone} 35%, transparent)`,
            }}
          >
            Ir agora <ChevronRight size={15} />
          </Link>
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}

function RankingCard({
  ranking,
  loading,
  highlightId,
}: {
  ranking: ReturnType<typeof useRanking>['ranking']
  loading: boolean
  highlightId: string
}) {
  const top5 = ranking.slice(0, 5)
  const myEntry = ranking.find((entry) => entry.participant_id === highlightId)
  const leader = ranking[0]
  const topThree = ranking.slice(0, 3)
  const topThreeCutoff = topThree.length > 0 ? topThree[topThree.length - 1] : undefined
  const directRival = myEntry
    ? ranking.find((entry) => entry.rank === Math.max(myEntry.rank - 1, 1) && entry.participant_id !== myEntry.participant_id)
      ?? ranking.find((entry) => entry.rank === myEntry.rank + 1)
    : undefined
  const gapToLeader = myEntry && leader ? Math.max(leader.total_points - myEntry.total_points, 0) : null
  const gapToTop3 = myEntry && topThreeCutoff ? Math.max(topThreeCutoff.total_points - myEntry.total_points, 0) : null
  const myMomentum = myEntry?.prev_rank != null ? myEntry.prev_rank - myEntry.rank : null
  const hottestEntry = ranking
    .filter((entry) => entry.prev_rank != null && entry.prev_rank - entry.rank > 0)
    .sort((left, right) => (right.prev_rank! - right.rank) - (left.prev_rank! - left.rank))[0]
  const momentumSummary =
    myMomentum != null && myMomentum > 0
      ? `Você subiu ${myMomentum} posição${myMomentum === 1 ? '' : 'ões'} e encostou mais no pelotão da frente.`
      : directRival && gapToTop3 != null && gapToTop3 <= 3
      ? `Seu rival direto está ao alcance e o top 3 ficou bem perto.`
      : hottestEntry
      ? `${hottestEntry.participant_name.split(' ')[0]} é quem mais sobe agora no ranking.`
      : 'A disputa segue apertada e qualquer série pode mexer no topo.'

  const podium = [
    { medal: '🥇', color: '#ffd166', bg: 'rgba(255,209,102,0.08)', border: 'rgba(255,209,102,0.22)' },
    { medal: '🥈', color: '#c9d1d9', bg: 'rgba(201,209,217,0.07)', border: 'rgba(201,209,217,0.18)' },
    { medal: '🥉', color: '#d68c45', bg: 'rgba(214,140,69,0.08)', border: 'rgba(214,140,69,0.20)' },
  ]

  return (
    <motion.div
      variants={fadeUpItem}
      initial="hidden"
      animate="show"
      whileHover={{ y: -3, boxShadow: '0 18px 36px rgba(0,0,0,0.18)' }}
      style={{ ...card, minWidth: 0, overflow: 'hidden' }}
    >
      <CardTitle icon={<Trophy size={14} />}>Ranking Geral</CardTitle>

      {!loading && myEntry && (
        <div
          style={{
            display: 'grid',
            gap: 8,
            marginBottom: 12,
            padding: '12px 13px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(74,144,217,0.05))',
            border: '1px solid rgba(200,150,60,0.12)',
          }}
        >
          <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '0.92rem', lineHeight: 1 }}>
            Radar competitivo
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ color: 'var(--nba-text)', fontSize: '0.78rem', lineHeight: 1.4 }}>
              {myEntry.rank <= 3
                ? `Você está no top 3 e a ${gapToLeader ?? 0} ponto${gapToLeader === 1 ? '' : 's'} da liderança.`
                : `Você está a ${gapToTop3 ?? 0} ponto${gapToTop3 === 1 ? '' : 's'} do top 3 e a ${gapToLeader ?? 0} da liderança.`}
            </div>
            {directRival && (
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', lineHeight: 1.4 }}>
                Rival direto: <span style={{ color: 'var(--nba-text)', fontWeight: 700 }}>{directRival.participant_name}</span>{' '}
                ({directRival.total_points} pts)
              </div>
            )}
            <div style={{ color: 'var(--nba-east)', fontSize: '0.72rem', lineHeight: 1.4, fontWeight: 600 }}>
              {momentumSummary}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 44px', gap: 10, alignItems: 'center', padding: '8px 6px' }}>
              <SkeletonCard width={18} height={12} />
              <SkeletonCard width="100%" height={13} />
              <SkeletonCard width={34} height={13} />
            </div>
          ))}
        </div>
      ) : (
        <motion.div variants={softStaggerContainer} initial="hidden" animate="show" style={{ display: 'grid', gap: 6 }}>
          {top5.map((e, i) => {
            const isMe = e.participant_id === highlightId
            const isRival = directRival?.participant_id === e.participant_id
            const diff = e.prev_rank != null ? e.prev_rank - e.rank : null
            const p = i < 3 ? podium[i] : null

            return (
              <motion.div
                key={e.participant_id}
                variants={fadeUpItem}
                whileHover={{ x: 4, backgroundColor: p ? p.bg : isMe ? 'var(--nba-surface-2)' : isRival ? 'rgba(74,144,217,0.08)' : 'rgba(255,255,255,0.02)' }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 0,
                  width: '100%',
                  gap: 10,
                  padding: p ? '10px 10px' : '7px 6px',
                  borderRadius: 8,
                  background: p ? p.bg : isMe ? 'var(--nba-surface-2)' : isRival ? 'rgba(74,144,217,0.06)' : 'transparent',
                  border: p ? `1px solid ${p.border}` : isMe ? '1px solid rgba(200,150,60,0.18)' : isRival ? '1px solid rgba(74,144,217,0.18)' : '1px solid transparent',
                  transition: 'background 0.2s',
                  overflow: 'hidden',
                }}
              >
                {/* Posição */}
                {p ? (
                  <span style={{ fontSize: '1.1rem', flexShrink: 0, width: 24, textAlign: 'center' }}>{p.medal}</span>
                ) : (
                  <span className="font-condensed font-bold" style={{ color: 'var(--nba-text-muted)', width: 24, textAlign: 'center', flexShrink: 0, fontSize: '0.82rem' }}>
                    {e.rank}
                  </span>
                )}

                {/* Nome */}
                <span style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: p ? p.color : isMe ? 'var(--nba-gold)' : isRival ? 'var(--nba-east)' : 'var(--nba-text)',
                  fontWeight: p || isMe ? 700 : 400,
                  fontSize: p ? '0.9rem' : '0.85rem',
                }}>
                  {e.participant_name}
                </span>

                {/* Seta + pontos */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  {isRival && !p && (
                    <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '2px 5px', borderRadius: 999, color: 'var(--nba-east)', background: 'rgba(74,144,217,0.12)', border: '1px solid rgba(74,144,217,0.18)' }}>
                      rival
                    </span>
                  )}
                  {!isRival && diff !== null && diff > 0 && !p && (
                    <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '2px 5px', borderRadius: 999, color: 'var(--nba-success)', background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.18)' }}>
                      subiu
                    </span>
                  )}
                  {diff !== null && <RankArrow diff={diff} />}
                  <span className="font-condensed font-bold" style={{
                    color: p ? p.color : 'var(--nba-text-muted)',
                    fontSize: p ? '1rem' : '0.88rem',
                  }}>
                    {e.total_points}
                  </span>
                  {p && <span style={{ color: p.color, fontSize: '0.68rem', opacity: 0.7 }}>pts</span>}
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      <Link to="/ranking" style={{ display: 'block', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--nba-border)', textAlign: 'center', fontSize: '0.78rem', color: 'var(--nba-text-muted)' }}>
        <span id="scoring-guide-highlight" />
        Ver ranking completo →
      </Link>
    </motion.div>
  )
}

function StatsGrid({
  participantCount,
  completedSeries,
  totalSeries,
  myEntry,
  loading,
}: {
  participantCount: number
  completedSeries: number
  totalSeries: number
  myEntry?: { rank: number; total_points: number }
  loading: boolean
}) {
  const stats = [
    { icon: <Users size={18} />, label: 'Participantes', value: String(participantCount), gold: false },
    { icon: <Trophy size={18} />, label: 'Séries Concluídas', value: `${completedSeries}/${totalSeries || 15}`, gold: false },
    { icon: <Target size={18} />, label: 'Minha Posição', value: myEntry ? `#${myEntry.rank}` : '—', gold: true },
    { icon: <Star size={18} />, label: 'Meus Pontos', value: myEntry ? String(myEntry.total_points) : '—', gold: false },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {stats.map(({ icon, label, value, gold }) => (
        <div key={label} className="card-hover" style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: '0.85rem' }}>
          <span style={{ color: 'var(--nba-gold)', flexShrink: 0, display: 'flex' }}>{icon}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem', lineHeight: 1.2 }}>{label}</div>
            {loading ? (
              <SkeletonCard width={72} height={24} style={{ marginTop: 4 }} />
            ) : (
              <div className="font-condensed font-bold" style={{ color: gold ? 'var(--nba-gold)' : 'var(--nba-text)', fontSize: '1.4rem', lineHeight: 1.2 }}>
                {value}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function RecentSeriesCard({ series }: { series: ReturnType<typeof useSeries>['series'] }) {
  const completed = series.filter((s) => s.is_complete).slice(-5).reverse()

  return (
    <motion.div
      className="card-hover"
      variants={fadeUpItem}
      initial="hidden"
      animate="show"
      whileHover={{ y: -3, boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}
      style={card}
    >
      <CardTitle>Séries Recentes</CardTitle>

      {completed.length === 0 ? (
        <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.85rem' }}>Nenhuma série encerrada ainda.</p>
      ) : (
        <div>
          {completed.map((s, i) => {
            const winner = s.winner ?? s.home_team
            const loser = s.winner?.id === s.home_team?.id ? s.away_team : s.home_team
            const label = `${s.conference ?? ''} ${ROUND_LABEL[s.round] ?? ''}`.trim()
            const loses = s.games_played - 4

            return (
              <div key={s.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 6px', borderRadius: 6, fontSize: '0.85rem' }}>
                  <span className="font-condensed" style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {label}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="font-condensed font-bold" style={{ color: winner?.primary_color ?? 'var(--nba-text)' }}>
                      {winner?.abbreviation ?? '?'}
                    </span>
                    <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.78rem' }}>4-{loses}</span>
                    <span style={{ color: 'var(--nba-text-muted)' }}>{loser?.abbreviation ?? '?'}</span>
                  </span>
                </div>
                {i < completed.length - 1 && <Divider />}
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

const ROUND_FULL_LABEL: Record<number, string> = { 1: 'Primeira Rodada', 2: 'Segunda Rodada', 3: 'Conf. Finals', 4: 'Finals' }
const ROUND_COLOR: Record<number, string> = { 1: '#4a90d9', 2: '#9b59b6', 3: '#e05c3a', 4: '#c8963c' }

function getBrtDateKey(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: BRT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

function formatBrtTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { timeZone: BRT_TIMEZONE, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

function TeamMark({
  abbr,
  color,
  align = 'left',
  dimmed = false,
}: {
  abbr: string
  color: string
  align?: 'left' | 'right'
  dimmed?: boolean
}) {
  const isRight = align === 'right'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: isRight ? 'flex-end' : 'flex-start',
        gap: 8,
        minWidth: 82,
        opacity: dimmed ? 0.4 : 1,
        flexDirection: isRight ? 'row-reverse' : 'row',
      }}
    >
      <img
        src={getTeamLogoUrl(abbr)}
        alt={abbr}
        onError={(e) => (e.currentTarget.style.display = 'none')}
        style={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.25))' }}
      />
      <span
        className="font-condensed font-bold"
        style={{
          color,
          fontSize: '1.02rem',
          lineHeight: 1,
          minWidth: 32,
          textAlign: isRight ? 'right' : 'left',
        }}
      >
        {abbr}
      </span>
    </span>
  )
}

function TeamShowcase({
  abbr,
  color,
  align = 'left',
  dimmed = false,
  injury,
}: {
  abbr: string
  color: string
  align?: 'left' | 'right'
  dimmed?: boolean
  injury?: InjuryItem
}) {
  const isRight = align === 'right'
  const tone = injury ? getInjuryTone(injury.status) : null

  return (
    <div
      style={{
        minWidth: 0,
        display: 'grid',
        gap: 10,
        padding: '14px 16px',
        borderRadius: 16,
        background: injury ? 'linear-gradient(135deg, rgba(255,255,255,0.045), rgba(231,76,60,0.06))' : 'rgba(255,255,255,0.035)',
        border: `1px solid ${injury ? 'rgba(231,76,60,0.18)' : 'rgba(200,150,60,0.10)'}`,
        opacity: dimmed ? 0.52 : 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isRight ? 'flex-end' : 'flex-start',
          gap: 12,
          flexDirection: isRight ? 'row-reverse' : 'row',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
            flexShrink: 0,
          }}
        >
          <img
            src={getTeamLogoUrl(abbr)}
            alt={abbr}
            onError={(e) => (e.currentTarget.style.display = 'none')}
            style={{ width: 30, height: 30, objectFit: 'contain', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.25))' }}
          />
        </div>

        <div style={{ minWidth: 0, textAlign: isRight ? 'right' : 'left' }}>
          <div
            className="font-condensed font-bold"
            style={{
              color,
              fontSize: '1.48rem',
              lineHeight: 0.95,
              letterSpacing: '0.03em',
            }}
          >
            {abbr}
          </div>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {injury ? 'alerta no elenco' : 'elenco principal ok'}
          </div>
        </div>
      </div>

      {injury ? (
        <div style={{ minWidth: 0, textAlign: isRight ? 'right' : 'left' }}>
          <div style={{ color: tone?.color ?? 'var(--nba-text)', fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.2 }}>
            {injury.player_name}
          </div>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginTop: 4, lineHeight: 1.35 }}>
            {tone?.label} • impacto {injury.impact === 'high' ? 'alto' : injury.impact === 'medium' ? 'moderado' : 'baixo'}
          </div>
        </div>
      ) : (
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.78rem', lineHeight: 1.35, textAlign: isRight ? 'right' : 'left' }}>
          Sem baixa relevante destacada para esta série.
        </div>
      )}
    </div>
  )
}

// Map: seriesId → Map<winnerId, count>
function useSeriesPickStats() {
  const [bySeriesId, setBySeriesId] = useState<Map<string, Map<string, number>>>(new Map())
  useEffect(() => {
    supabase.from('series_picks').select('series_id, winner_id').then(({ data }) => {
      if (!data) return
      const map = new Map<string, Map<string, number>>()
      for (const row of data as { series_id: string; winner_id: string }[]) {
        if (!map.has(row.series_id)) map.set(row.series_id, new Map())
        const inner = map.get(row.series_id)!
        inner.set(row.winner_id, (inner.get(row.winner_id) ?? 0) + 1)
      }
      setBySeriesId(map)
    })
  }, [])
  return bySeriesId
}

function OfficialBracketCard({ series, upcomingGames, participantCount, injuries, injuriesLoading, injuriesAvailable }: {
  series: ReturnType<typeof useSeries>['series']
  upcomingGames: ReturnType<typeof useGameFeed>['upcomingGames']
  participantCount: number
  injuries: InjuryItem[]
  injuriesLoading: boolean
  injuriesAvailable: boolean
}) {
  const pickStats = useSeriesPickStats()
  const completedSeries = series.filter((item) => item.is_complete).length
  const openSeries = Math.max(series.length - completedSeries, 0)
  const finals = series.find((item) => item.id === 'FIN')
  const champion = finals?.is_complete ? finals.winner : null
  const championLabel = champion?.abbreviation ?? (finals?.is_complete ? finals.winner_id ?? 'Definido' : 'Em disputa')

  const today = getBrtDateKey(new Date())
  const todayGames = upcomingGames.filter(
    (g) => g.tip_off_at && getBrtDateKey(new Date(g.tip_off_at)) === today
  )
  const liveGames = upcomingGames.filter(
    (g) => g.tip_off_at && new Date(g.tip_off_at).getTime() <= Date.now() && !g.played
  )
  const liveIds = new Set(liveGames.map((g) => g.id))

  const roundGroups = ([4, 3, 2, 1] as const)
    .map((round) => ({
      round,
      items: series
        .filter((s) => s.round === round && (s.home_team_id != null || s.away_team_id != null))
        .sort((a, b) => (a.conference ?? '').localeCompare(b.conference ?? '')),
    }))
    .filter((g) => g.items.length > 0)

  const topInjuryByTeam = useMemo(() => {
    const byTeam = new Map<string, InjuryItem>()
    const impactWeight = { high: 0, medium: 1, low: 2 }
    const statusWeight = { Out: 0, Doubtful: 1, Questionable: 2 }

    for (const injury of injuries) {
      if (!injury.team) continue
      const current = byTeam.get(injury.team)
      if (!current) {
        byTeam.set(injury.team, injury)
        continue
      }

      const currentImpact = impactWeight[current.impact]
      const nextImpact = impactWeight[injury.impact]
      const currentStatus = statusWeight[current.status as keyof typeof statusWeight] ?? 9
      const nextStatus = statusWeight[injury.status as keyof typeof statusWeight] ?? 9

      if (nextImpact < currentImpact || (nextImpact === currentImpact && nextStatus < currentStatus)) {
        byTeam.set(injury.team, injury)
      }
    }

    return byTeam
  }, [injuries])

  const enhancedRoundGroups = useMemo(() => (
    roundGroups.map(({ round, items }) => ({
      round,
      items: items
        .map((seriesItem) => {
          const homeInjury = seriesItem.home_team_id ? topInjuryByTeam.get(seriesItem.home_team_id) : undefined
          const awayInjury = seriesItem.away_team_id ? topInjuryByTeam.get(seriesItem.away_team_id) : undefined
          const hasTodayGame = todayGames.some((game) => game.series_id === seriesItem.id)
          const impact = getSeriesImpactLabel(homeInjury, awayInjury)
          const impactPriority = impact.label === 'Impacto alto' ? 0 : impact.label === 'Impacto moderado' ? 1 : impact.label === 'Monitorar' ? 2 : 3

          return {
            seriesItem,
            homeInjury,
            awayInjury,
            hasTodayGame,
            impact,
            sortPriority: [
              hasTodayGame ? 0 : 1,
              impactPriority,
              seriesItem.is_complete ? 1 : 0,
              (seriesItem.position ?? 99),
            ] as const,
          }
        })
        .sort((left, right) => {
          for (let index = 0; index < left.sortPriority.length; index += 1) {
            if (left.sortPriority[index] !== right.sortPriority[index]) {
              return left.sortPriority[index] - right.sortPriority[index]
            }
          }
          return (left.seriesItem.conference ?? '').localeCompare(right.seriesItem.conference ?? '')
        }),
    }))
  ), [roundGroups, topInjuryByTeam, todayGames])

  const sectionHeadline = useMemo(() => {
    const spotlight = enhancedRoundGroups.flatMap((group) => group.items).filter((item) => !item.seriesItem.is_complete)
    const activeToday = spotlight.filter((item) => item.hasTodayGame).length
    const highImpact = spotlight.filter((item) => item.impact.label === 'Impacto alto').length
    const watchlist = spotlight.filter((item) => item.impact.label === 'Monitorar' || item.impact.label === 'Impacto moderado').length

    if (activeToday > 0 && highImpact > 0) {
      return `${activeToday} série${activeToday !== 1 ? 's' : ''} em jogo hoje e ${highImpact} confronto${highImpact !== 1 ? 's' : ''} com alerta alto`
    }
    if (highImpact > 0) {
      return `${highImpact} confronto${highImpact !== 1 ? 's' : ''} chegam com desfalques pesados`
    }
    if (watchlist > 0) {
      return `${watchlist} série${watchlist !== 1 ? 's' : ''} pedem monitoramento antes da abertura`
    }
    return 'Chave oficial pronta para acompanhar a rodada real da NBA'
  }, [enhancedRoundGroups])

  return (
    <div style={{ ...card, padding: '1.35rem', background: 'linear-gradient(145deg, rgba(224,92,58,0.16), rgba(200,150,60,0.10) 42%, rgba(19,19,26,1) 100%)', border: '1px solid rgba(200,150,60,0.22)', borderRadius: 18, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 42px rgba(0,0,0,0.16)' }}>
      <CardTitle icon={<Trophy size={14} />}>Resultados reais</CardTitle>

      <div
        style={{
          marginBottom: 16,
          padding: '18px 18px',
          borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(12,12,18,0.56), rgba(74,144,217,0.08))',
          border: '1px solid rgba(200,150,60,0.18)',
        }}
      >
        <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '1.14rem', lineHeight: 1, letterSpacing: '0.04em' }}>
          Radar da chave
        </div>
        <div style={{ color: 'var(--nba-text)', fontSize: '0.95rem', marginTop: 10, lineHeight: 1.5, maxWidth: 760 }}>
          {sectionHeadline}
        </div>
      </div>

      {/* 3 chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Concluídas', value: `${completedSeries}/${series.length}`, color: completedSeries > 0 ? 'var(--nba-success)' : 'var(--nba-text-muted)' },
          { label: 'Em aberto', value: String(openSeries), color: openSeries > 0 ? 'var(--nba-gold)' : 'var(--nba-text-muted)' },
          { label: 'Campeão', value: championLabel, color: champion ? (champion.primary_color ?? 'var(--nba-gold)') : 'var(--nba-text-muted)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '14px 16px', borderRadius: 16, background: 'rgba(12,12,18,0.42)', border: '1px solid rgba(200,150,60,0.14)' }}>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
            <div className="font-condensed font-bold" style={{ color, fontSize: '1.6rem', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Jogos de hoje */}
      {todayGames.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ height: 1, width: 10, background: 'rgba(46,204,113,0.5)', flexShrink: 0 }} />
            <span style={{ color: '#2ecc71', fontSize: '0.64rem', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
              Jogos de hoje
            </span>
            <div style={{ height: 1, flex: 1, background: 'rgba(46,204,113,0.2)' }} />
          </div>
          <div style={{ display: 'grid', gap: 5 }}>
            {todayGames.map((g) => {
              const isLive = liveIds.has(g.id)
              const homeColor = g.home_team?.primary_color ?? 'var(--nba-text)'
              const awayColor = g.away_team?.primary_color ?? 'var(--nba-text)'
              return (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: isLive ? 'rgba(46,204,113,0.07)' : 'rgba(12,12,18,0.42)', border: `1px solid ${isLive ? 'rgba(46,204,113,0.22)' : 'rgba(200,150,60,0.10)'}` }}>
                  <TeamMark abbr={g.home_team?.abbreviation ?? g.home_team_id} color={homeColor} />
                  <span className="font-condensed" style={{ flex: 1, textAlign: 'center', fontSize: '0.82rem', color: 'var(--nba-text-muted)', letterSpacing: '0.08em' }}>
                    {isLive ? '●' : formatBrtTime(g.tip_off_at)}
                  </span>
                  <TeamMark abbr={g.away_team?.abbreviation ?? g.away_team_id} color={awayColor} align="right" />
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, flexShrink: 0,
                    background: isLive ? 'rgba(46,204,113,0.18)' : 'rgba(200,150,60,0.12)',
                    color: isLive ? '#2ecc71' : 'var(--nba-gold)',
                    border: `1px solid ${isLive ? 'rgba(46,204,113,0.3)' : 'rgba(200,150,60,0.2)'}`,
                  }}>
                    {isLive ? 'AO VIVO' : `J${g.game_number}`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Series grouped by round */}
      {roundGroups.length === 0 ? (
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', padding: '8px 0' }}>
          Bracket ainda não foi definido para esta temporada.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {enhancedRoundGroups.map(({ round, items }) => {
            const color = ROUND_COLOR[round]
            return (
              <div key={round}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ height: 1, width: 10, background: `${color}55`, flexShrink: 0 }} />
                  <span style={{ color, fontSize: '0.64rem', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {ROUND_FULL_LABEL[round]}
                  </span>
                  <div style={{ height: 1, flex: 1, background: `${color}28` }} />
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  {items.map(({ seriesItem: s, homeInjury, awayInjury, hasTodayGame, impact }) => {
                    const homeAbbr = s.home_team?.abbreviation ?? s.home_team_id ?? '—'
                    const awayAbbr = s.away_team?.abbreviation ?? s.away_team_id ?? '—'
                    const homeColor = s.home_team?.primary_color ?? 'var(--nba-text)'
                    const awayColor = s.away_team?.primary_color ?? 'var(--nba-text)'
                    const homeWon = s.is_complete && s.winner_id === s.home_team_id
                    const awayWon = s.is_complete && s.winner_id === s.away_team_id
                    const losses = s.games_played - 4
                    const inProgress = !s.is_complete && s.games_played > 0

                    // Acertos do bolão para essa série
                    const seriesPickMap = pickStats.get(s.id)
                    const correctCount = s.winner_id && seriesPickMap ? (seriesPickMap.get(s.winner_id) ?? 0) : 0
                    const totalPicked = seriesPickMap ? Array.from(seriesPickMap.values()).reduce((a, b) => a + b, 0) : 0
                    const headline = getSeriesHeadline({
                      homeAbbr,
                      awayAbbr,
                      homeInjury,
                      awayInjury,
                      hasTodayGame,
                      inProgress,
                      isComplete: s.is_complete,
                      impactLabel: impact.label,
                    })

                    return (
                      <div
                        key={s.id}
                        style={{
                          display: 'grid',
                          gap: 14,
                          padding: '18px',
                          borderRadius: 18,
                          background: hasTodayGame
                            ? 'linear-gradient(135deg, rgba(46,204,113,0.10), rgba(12,12,18,0.44))'
                            : s.is_complete
                            ? 'rgba(12,12,18,0.30)'
                            : 'rgba(12,12,18,0.46)',
                          border: `1px solid ${
                            hasTodayGame
                              ? 'rgba(46,204,113,0.24)'
                              : s.is_complete
                              ? 'rgba(46,204,113,0.12)'
                              : inProgress
                              ? 'rgba(200,150,60,0.18)'
                              : 'rgba(200,150,60,0.08)'
                          }`,
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'stretch', gap: 14 }}>
                          <TeamShowcase
                            abbr={homeAbbr}
                            color={homeWon ? homeColor : awayWon ? 'var(--nba-text-muted)' : homeColor}
                            dimmed={awayWon}
                            injury={!s.is_complete ? homeInjury : undefined}
                          />

                          <div style={{ display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 8, minWidth: 96 }}>
                            <span
                              className="font-condensed font-bold"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 78,
                                padding: s.is_complete ? '8px 14px' : '7px 13px',
                                borderRadius: 999,
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
                                color: s.is_complete ? 'var(--nba-text)' : 'var(--nba-text-muted)',
                                fontSize: s.is_complete ? '1.18rem' : '0.9rem',
                                letterSpacing: '0.1em',
                                border: '1px solid rgba(255,255,255,0.07)',
                              }}
                            >
                              {s.is_complete ? `4 – ${losses}` : inProgress ? `${s.games_played}j` : 'VS'}
                            </span>
                            <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.78rem', textAlign: 'center', lineHeight: 1.25 }}>
                              {s.is_complete ? 'série fechada' : hasTodayGame ? 'abertura hoje' : inProgress ? 'série ativa' : 'aguardando'}
                            </span>
                            {s.is_complete ? (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 8px', borderRadius: 999, flexShrink: 0, background: 'rgba(46,204,113,0.12)', color: '#2ecc71', border: '1px solid rgba(46,204,113,0.22)', whiteSpace: 'nowrap' }}>
                                {participantCount > 0 ? `${correctCount}/${participantCount} ✓` : '✓'}
                              </span>
                            ) : hasTodayGame ? (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 8px', borderRadius: 999, flexShrink: 0, background: 'rgba(46,204,113,0.16)', color: '#2ecc71', border: '1px solid rgba(46,204,113,0.26)', whiteSpace: 'nowrap' }}>
                                hoje
                              </span>
                            ) : inProgress ? (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 8px', borderRadius: 999, flexShrink: 0, background: 'rgba(200,150,60,0.12)', color: 'var(--nba-gold)', border: '1px solid rgba(200,150,60,0.22)', whiteSpace: 'nowrap' }}>
                                {totalPicked > 0 ? `${totalPicked}/${participantCount}` : 'em série'}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 8px', borderRadius: 999, flexShrink: 0, background: 'rgba(136,136,153,0.08)', color: 'var(--nba-text-muted)', border: '1px solid rgba(136,136,153,0.15)', whiteSpace: 'nowrap' }}>
                                {totalPicked > 0 ? `${totalPicked}/${participantCount}` : 'pendente'}
                              </span>
                            )}
                          </div>

                          <TeamShowcase
                            abbr={awayAbbr}
                            color={awayWon ? awayColor : homeWon ? 'var(--nba-text-muted)' : awayColor}
                            align="right"
                            dimmed={homeWon}
                            injury={!s.is_complete ? awayInjury : undefined}
                          />
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gap: 5,
                            padding: '12px 14px',
                            borderRadius: 14,
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1rem', lineHeight: 1.1 }}>
                            {headline.title}
                          </div>
                          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.8rem', lineHeight: 1.45 }}>
                            {headline.detail}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '7px 12px',
                              borderRadius: 999,
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: impact.color,
                              background: impact.background,
                              border: `1px solid ${impact.border}`,
                            }}
                          >
                            {impact.label}
                          </span>
                          <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.78rem', lineHeight: 1.35 }}>
                            {hasTodayGame ? 'Confronto real ativo na agenda de hoje' : inProgress ? 'Série real já começou' : 'Aguardando a bola subir na chave oficial'}
                          </span>
                        </div>

                        {!s.is_complete && !homeInjury && !awayInjury && injuriesLoading && (
                          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem' }}>
                            Carregando radar de lesões...
                          </div>
                        )}
                        {!s.is_complete && !homeInjury && !awayInjury && !injuriesLoading && !injuriesAvailable && (
                          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem' }}>
                            Radar de lesões indisponível.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
        <Link
          to="/official"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '16px 22px',
            minHeight: 56,
            borderRadius: 14,
            textDecoration: 'none',
            background: 'linear-gradient(135deg, rgba(200,150,60,0.20), rgba(224,92,58,0.10))',
            border: '1px solid rgba(200,150,60,0.24)',
            color: 'var(--nba-gold)',
            fontWeight: 700,
            fontSize: '1rem',
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '0.05em',
          }}
        >
          Ver playoff real da NBA
          <ChevronRight size={15} />
        </Link>
      </div>
    </div>
  )
}

function MyPicksCard({
  series,
  picks,
  injuries,
}: {
  series: ReturnType<typeof useSeries>['series']
  picks: ReturnType<typeof useSeries>['picks']
  injuries: InjuryItem[]
}) {
  const recent = [...picks].slice(-3).reverse().map((p) => {
    const s = series.find((sr) => sr.id === p.series_id)
    const pickedTeam = s?.home_team?.id === p.winner_id ? s?.home_team : s?.away_team
    const status = s?.is_complete ? (p.winner_id === s?.winner_id ? 'Acertou' : 'Errou') : 'Aguarda'
    const color = s?.is_complete ? (p.winner_id === s?.winner_id ? 'var(--nba-success)' : 'var(--nba-danger)') : 'var(--nba-text-muted)'
    return { pick: p, series: s, pickedTeam, status, color }
  })

  const completedSeries = picks.filter((pick) => {
    const currentSeries = series.find((item) => item.id === pick.series_id)
    return !!currentSeries?.is_complete
  }).length
  const pendingSeries = Math.max(picks.length - completedSeries, 0)
  const correctSeries = picks.filter((pick) => {
    const currentSeries = series.find((item) => item.id === pick.series_id)
    return !!currentSeries?.is_complete && currentSeries.winner_id === pick.winner_id
  }).length
  const readySeries = series.filter(isSeriesReadyForPick)
  const unpickedReadySeries = readySeries.filter((item) => !picks.some((pick) => pick.series_id === item.id))
  const nextLockSeries = [...unpickedReadySeries]
    .filter((item) => item.tip_off_at)
    .sort((left, right) => new Date(left.tip_off_at!).getTime() - new Date(right.tip_off_at!).getTime())[0]
  const opportunitySeries = unpickedReadySeries.find((item) => {
    const homeAlert = injuries.find((injury) => injury.team === item.home_team_id && injury.impact === 'high')
    const awayAlert = injuries.find((injury) => injury.team === item.away_team_id && injury.impact === 'high')
    return homeAlert || awayAlert
  })
  const insightTitle =
    unpickedReadySeries.length > 0
      ? `${unpickedReadySeries.length} janela${unpickedReadySeries.length !== 1 ? 's' : ''} para atacar`
      : pendingSeries > 0
      ? 'Seus picks seguem vivos'
      : 'Cartela em ordem'
  const insightDetail = opportunitySeries
    ? `${opportunitySeries.home_team?.abbreviation ?? opportunitySeries.home_team_id} x ${opportunitySeries.away_team?.abbreviation ?? opportunitySeries.away_team_id} já abre com contexto sensível de elenco.`
    : nextLockSeries
    ? `Próximo lock: ${nextLockSeries.home_team?.abbreviation ?? nextLockSeries.home_team_id} x ${nextLockSeries.away_team?.abbreviation ?? nextLockSeries.away_team_id} em ${formatShortDateTime(nextLockSeries.tip_off_at)}.`
    : correctSeries > 0
    ? `Você já converteu ${correctSeries} série${correctSeries !== 1 ? 's' : ''} em acerto até aqui.`
    : 'Sua cartela está coberta por enquanto. Agora é acompanhar a rodada e esperar a próxima abertura.'

  return (
    <div className="card-hover" style={card}>
      <CardTitle>Meus Palpites</CardTitle>

      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }} className="grid-cols-2">
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.14)' }}>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Palpites salvos</div>
          <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1.25rem', lineHeight: 1 }}>
            {picks.length}
          </div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(12,12,18,0.34)', border: '1px solid rgba(200,150,60,0.14)' }}>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Ainda em aberto</div>
          <div className="font-condensed font-bold" style={{ color: pendingSeries > 0 ? 'var(--nba-gold)' : 'var(--nba-success)', fontSize: '1.25rem', lineHeight: 1 }}>
            {pendingSeries}
          </div>
        </div>
      </div>

      <div
        style={{
          marginBottom: 12,
          padding: '12px 14px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(74,144,217,0.10), rgba(200,150,60,0.08))',
          border: '1px solid rgba(200,150,60,0.16)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <Sparkles size={13} style={{ color: 'var(--nba-gold)', flexShrink: 0 }} />
          <span className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '0.8rem', letterSpacing: '0.08em' }}>
            Inteligência do bolão
          </span>
        </div>
        <div className="font-condensed font-bold" style={{ color: 'var(--nba-text)', fontSize: '1.05rem', lineHeight: 1.05, marginBottom: 6 }}>
          {insightTitle}
        </div>
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', lineHeight: 1.45 }}>
          {insightDetail}
        </div>
      </div>

      {recent.length === 0 ? (
        <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.85rem' }}>
          Nenhum palpite registrado. <Link to="/bracket" style={{ color: 'var(--nba-gold)' }}>Palpitar →</Link>
        </p>
      ) : (
        <div>
          {recent.map(({ pick, series: s, pickedTeam, status, color }, i) => (
            <div key={pick.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderRadius: 6, fontSize: '0.85rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-condensed font-bold" style={{ color: pickedTeam?.primary_color ?? 'var(--nba-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pickedTeam?.abbreviation ?? '?'}
                  </div>
                  <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem' }}>
                    {s ? `${s.conference ?? ''} ${ROUND_LABEL[s.round] ?? ''}`.trim() : '—'}
                  </div>
                </div>
                <span style={{ color, fontSize: '0.72rem', fontWeight: 700 }}>{status}</span>
              </div>
              {i < recent.length - 1 && <Divider />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NewsAlertPill() {
  const { news, loading } = useAnalysisInsights()
  if (loading || news.length === 0) return null
  return (
    <Link
      to="/analysis"
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, textDecoration: 'none', background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.22)', color: 'var(--nba-danger)' }}
    >
      <Zap size={14} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600 }}>
        {news.length} notícia{news.length !== 1 ? 's' : ''} nova{news.length !== 1 ? 's' : ''} na análise
      </span>
      <span style={{ fontSize: '0.72rem', color: 'var(--nba-text-muted)' }}>ver análise →</span>
    </Link>
  )
}

function HomeQuickDeck({ vertical = false }: { vertical?: boolean }) {
  const quickActions = [
    {
      id: 'bracket-highlight',
      to: '/bracket',
      title: 'Abrir Bracket',
      description: 'palpite série por série',
      icon: <Target size={vertical ? 17 : 15} style={{ color: 'var(--nba-gold)', flexShrink: 0 }} />,
      border: '1px solid rgba(200,150,60,0.2)',
      background: 'rgba(200,150,60,0.08)',
    },
    {
      to: '/games',
      title: 'Ir para Jogos',
      description: 'travar picks e acompanhar o dia',
      icon: <Clock size={vertical ? 17 : 15} style={{ color: 'var(--nba-success)', flexShrink: 0 }} />,
      border: '1px solid rgba(46,204,113,0.18)',
      background: 'rgba(46,204,113,0.06)',
    },
    {
      to: '/analysis',
      title: 'Abrir Análise',
      description: 'odds, notícias e radar da rodada',
      icon: <AlertTriangle size={vertical ? 17 : 15} style={{ color: 'var(--nba-gold)', flexShrink: 0 }} />,
      border: '1px solid rgba(200,150,60,0.18)',
      background: 'rgba(28,28,38,0.9)',
    },
    {
      to: '/compare',
      title: 'Comparar brackets',
      description: 'veja lado a lado os palpites da galera',
      icon: <ArrowLeftRight size={vertical ? 17 : 15} style={{ color: 'var(--nba-east)', flexShrink: 0 }} />,
      border: '1px solid rgba(74,144,217,0.2)',
      background: 'rgba(74,144,217,0.08)',
    },
  ]

  return (
    <motion.div
      variants={fadeUpItem}
      initial="hidden"
      animate="show"
      whileHover={{ y: -3, boxShadow: '0 20px 44px rgba(0,0,0,0.2)' }}
      style={{
        ...card,
        background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(74,144,217,0.08) 48%, rgba(200,150,60,0.08) 100%)',
        padding: vertical ? '1.05rem' : card.padding,
        borderRadius: vertical ? 12 : 8,
      }}
    >
      <CardTitle icon={<Sparkles size={14} />}>Acessos Rápidos</CardTitle>
      <div style={{ color: 'var(--nba-text-muted)', fontSize: vertical ? '0.78rem' : '0.74rem', lineHeight: 1.45, marginBottom: 12 }}>
        {vertical ? 'Atalhos principais do bolão para agir rápido sem sair da Home.' : 'Entradas rápidas para navegar pelo bolão e acompanhar a rodada.'}
      </div>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        style={{ display: 'grid', gap: vertical ? 12 : 10 }}
        className={vertical ? undefined : 'sm:grid-cols-2 lg:grid-cols-4'}
      >
        {quickActions.map((action) => (
          <motion.div key={action.to} variants={fadeUpItem} whileHover={{ y: -3, scale: 1.01 }} whileTap={pressMotion.tap}>
            <Link
              id={action.id}
              to={action.to}
              style={{
                display: 'flex',
                alignItems: vertical ? 'flex-start' : 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: vertical ? '14px 15px' : '11px 14px',
                borderRadius: vertical ? 12 : 10,
                textDecoration: 'none',
                color: 'var(--nba-text)',
                border: action.border,
                background: action.background,
                minHeight: vertical ? 88 : undefined,
                boxShadow: vertical ? 'inset 0 1px 0 rgba(255,255,255,0.03)' : 'none',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <span
                  style={{
                    width: vertical ? 34 : 'auto',
                    height: vertical ? 34 : 'auto',
                    borderRadius: vertical ? 10 : 0,
                    display: 'grid',
                    placeItems: 'center',
                    background: vertical ? 'rgba(255,255,255,0.05)' : 'transparent',
                    flexShrink: 0,
                  }}
                >
                  {action.icon}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: vertical ? '0.88rem' : '0.8rem', lineHeight: 1.2 }}>
                    {action.title}
                  </span>
                  <span style={{ display: 'block', color: 'var(--nba-text-muted)', fontSize: vertical ? '0.73rem' : '0.68rem', lineHeight: 1.45, marginTop: vertical ? 5 : 2 }}>
                    {action.description}
                  </span>
                </span>
              </span>
              <ChevronRight size={vertical ? 16 : 15} style={{ flexShrink: 0, color: 'var(--nba-text-muted)', marginTop: vertical ? 2 : 0 }} />
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}

function ExecutiveSummaryStrip({
  items,
}: {
  items: Array<{ label: string; title: string; detail: string; tone: string }>
}) {
  return (
    <motion.div
      variants={fadeUpItem}
      initial="hidden"
      animate="show"
      style={{
        ...card,
        background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(74,144,217,0.06) 50%, rgba(200,150,60,0.06) 100%)',
        borderRadius: 12,
      }}
    >
      <CardTitle icon={<Sparkles size={14} />}>Resumo do Dia</CardTitle>
      <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(12,12,18,0.34)',
              border: '1px solid rgba(200,150,60,0.14)',
            }}
          >
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>{item.label}</div>
            <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.02rem', lineHeight: 1.05, marginBottom: 6 }}>
              {item.title}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem', lineHeight: 1.45 }}>
              {item.detail}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function PostRoundSummaryStrip({
  items,
}: {
  items: Array<{ label: string; title: string; detail: string; tone: string }>
}) {
  if (items.length === 0) return null

  return (
    <motion.div
      variants={fadeUpItem}
      initial="hidden"
      animate="show"
      style={{
        ...card,
        background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(224,92,58,0.08) 45%, rgba(200,150,60,0.08) 100%)',
        borderRadius: 12,
      }}
    >
      <CardTitle icon={<Trophy size={14} />}>Pós-Rodada</CardTitle>
      <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(12,12,18,0.34)',
              border: '1px solid rgba(200,150,60,0.14)',
            }}
          >
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>{item.label}</div>
            <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.02rem', lineHeight: 1.05, marginBottom: 6 }}>
              {item.title}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem', lineHeight: 1.45 }}>
              {item.detail}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function SmartAlertsStrip({
  items,
}: {
  items: Array<{ label: string; title: string; detail: string; tone: string }>
}) {
  if (items.length === 0) return null

  return (
    <motion.div
      variants={fadeUpItem}
      initial="hidden"
      animate="show"
      style={{
        ...card,
        background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(74,144,217,0.07) 38%, rgba(231,76,60,0.08) 100%)',
        borderRadius: 12,
      }}
    >
      <CardTitle icon={<AlertTriangle size={14} />}>Alertas Inteligentes</CardTitle>
      <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(12,12,18,0.34)',
              border: '1px solid rgba(200,150,60,0.14)',
            }}
          >
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>{item.label}</div>
            <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.02rem', lineHeight: 1.05, marginBottom: 6 }}>
              {item.title}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem', lineHeight: 1.45 }}>
              {item.detail}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function SocialPulseStrip({
  items,
}: {
  items: Array<{ label: string; title: string; detail: string; tone: string }>
}) {
  if (items.length === 0) return null

  return (
    <motion.div
      variants={fadeUpItem}
      initial="hidden"
      animate="show"
      style={{
        ...card,
        background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(155,89,182,0.08) 48%, rgba(200,150,60,0.08) 100%)',
        borderRadius: 12,
      }}
    >
      <CardTitle icon={<Users size={14} />}>Pulso do Bolão</CardTitle>
      <div style={{ display: 'grid', gap: 10 }} className="grid-cols-1 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(12,12,18,0.34)',
              border: '1px solid rgba(200,150,60,0.14)',
            }}
          >
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>{item.label}</div>
            <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.02rem', lineHeight: 1.05, marginBottom: 6 }}>
              {item.title}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem', lineHeight: 1.45 }}>
              {item.detail}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function AdvantageInsightsCard({
  items,
}: {
  items: Array<{ label: string; title: string; detail: string; tone: string }>
}) {
  return (
    <motion.div
      variants={fadeUpItem}
      initial="hidden"
      animate="show"
      className="card-hover"
      style={{
        ...card,
        background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(224,92,58,0.06) 48%, rgba(200,150,60,0.05) 100%)',
        borderRadius: 12,
      }}
    >
      <CardTitle icon={<Target size={14} />}>Onde Você Pode Ganhar</CardTitle>
      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              padding: '11px 12px',
              borderRadius: 10,
              background: 'rgba(12,12,18,0.34)',
              border: '1px solid rgba(200,150,60,0.14)',
            }}
          >
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 5 }}>{item.label}</div>
            <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '0.96rem', lineHeight: 1.05, marginBottom: 6 }}>
              {item.title}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.74rem', lineHeight: 1.45 }}>
              {item.detail}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function Home({ participantId }: Props) {
  const { ranking, loading: rankLoading } = useRanking()
  const { series, picks, loading: seriesLoading } = useSeries(participantId)
  const { recentCompletedGames, upcomingGames, hasRealGames } = useGameFeed()
  const recentGameIds = useMemo(
    () => recentCompletedGames.map((game) => game.nba_game_id).filter((id): id is number => !!id),
    [recentCompletedGames]
  )
  const { highlights, loading: highlightsLoading, provider: highlightsProvider } = useGameHighlights(recentGameIds)
  const { injuries, loading: injuriesLoading, provider: injuriesProvider } = useInjuries()
  const { show, complete } = useOnboarding()
  const highlightsByGameId = useMemo(
    () => Object.fromEntries(highlights.map((item) => [item.game_id, item])),
    [highlights]
  )
  const homeRelevantTeams = useMemo(
    () => new Set(series.flatMap((item) => [item.home_team_id, item.away_team_id]).filter((team): team is string => !!team)),
    [series]
  )
  const homeInjuries = useMemo(
    () => injuries.filter((item) => item.team != null && homeRelevantTeams.has(item.team)),
    [injuries, homeRelevantTeams]
  )
  const todayKey = getBrtDateKey(new Date())
  const todayGamesCount = useMemo(
    () => upcomingGames.filter((game) => game.tip_off_at && getBrtDateKey(new Date(game.tip_off_at)) === todayKey).length,
    [todayKey, upcomingGames]
  )
  const liveGamesCount = useMemo(
    () => upcomingGames.filter((game) => game.tip_off_at && new Date(game.tip_off_at).getTime() <= Date.now() && !game.played).length,
    [upcomingGames]
  )
  const alertSeriesCount = useMemo(() => {
    const teamAlerts = new Set(
      homeInjuries
        .filter((item) => item.impact === 'high' || item.impact === 'medium')
        .map((item) => item.team)
        .filter((team): team is string => !!team)
    )

    return series.filter(
      (item) =>
        !item.is_complete &&
        ((item.home_team_id != null && teamAlerts.has(item.home_team_id)) ||
          (item.away_team_id != null && teamAlerts.has(item.away_team_id)))
    ).length
  }, [homeInjuries, series])

  const myEntry = ranking.find((r) => r.participant_id === participantId)
  const leader = ranking[0]
  const completedSeries = series.filter((s) => s.is_complete).length
  const readySeries = series.filter(isSeriesReadyForPick)
  const readySeriesIds = new Set(readySeries.map((item) => item.id))
  const pickedSeries = picks.filter((pick) => readySeriesIds.has(pick.series_id)).length
  const unpickedReadySeries = readySeries.filter((item) => !picks.some((pick) => pick.series_id === item.id))
  const pressureSeries = series.find((item) => {
    if (item.is_complete) return false
    const homeAlert = homeInjuries.find((injury) => injury.team === item.home_team_id && injury.impact === 'high')
    const awayAlert = homeInjuries.find((injury) => injury.team === item.away_team_id && injury.impact === 'high')
    return homeAlert || awayAlert
  })
  const trackedUpcomingSeries = series.find((item) =>
    !item.is_complete && upcomingGames.some((game) => game.series_id === item.id && game.tip_off_at && getBrtDateKey(new Date(game.tip_off_at)) === todayKey)
  )
  const directHunter = myEntry && myEntry.rank > 1 ? ranking[myEntry.rank - 2] : null
  const socialClimber = ranking
    .filter((entry) => entry.prev_rank != null && entry.prev_rank > entry.rank)
    .sort((left, right) => (right.prev_rank! - right.rank) - (left.prev_rank! - left.rank))[0] ?? null
  const cravadaLeader = ranking
    .slice()
    .sort((left, right) => right.cravadas - left.cravadas || right.total_points - left.total_points)[0] ?? null
  const executiveItems = [
    {
      label: 'Ação imediata',
      title: unpickedReadySeries.length > 0
        ? `${unpickedReadySeries.length} série${unpickedReadySeries.length !== 1 ? 's' : ''} sem pick`
        : 'Cartela sob controle',
      detail: unpickedReadySeries.length > 0
        ? 'Fechar essas séries primeiro mantém você vivo antes do próximo lock.'
        : 'Sem urgência estrutural agora; dá para acompanhar o dia com calma.',
      tone: unpickedReadySeries.length > 0 ? 'var(--nba-gold)' : 'var(--nba-success)',
    },
    {
      label: 'Rodada real',
      title: liveGamesCount > 0
        ? `${liveGamesCount} jogo${liveGamesCount !== 1 ? 's' : ''} ao vivo`
        : todayGamesCount > 0
        ? `${todayGamesCount} confronto${todayGamesCount !== 1 ? 's' : ''} hoje`
        : 'Agenda leve agora',
      detail: trackedUpcomingSeries
        ? `${trackedUpcomingSeries.home_team?.abbreviation ?? trackedUpcomingSeries.home_team_id} x ${trackedUpcomingSeries.away_team?.abbreviation ?? trackedUpcomingSeries.away_team_id} puxa a chave hoje.`
        : 'A próxima mexida da chave oficial entra no radar assim que o calendário apertar.',
      tone: liveGamesCount > 0 ? 'var(--nba-success)' : 'var(--nba-east)',
    },
    {
      label: 'Disputa do bolão',
      title: directHunter && myEntry
        ? `${Math.max(directHunter.total_points - myEntry.total_points, 0)} pts para encostar`
        : myEntry?.rank === 1
        ? 'Você dita o ritmo'
        : 'Ranking em formação',
      detail: directHunter
        ? `${directHunter.participant_name.split(' ')[0]} é sua referência imediata na corrida.`
        : myEntry?.rank === 1
        ? 'A missão agora é defender a dianteira nas próximas séries.'
        : 'Os primeiros fechamentos vão separar melhor o pelotão.',
      tone: directHunter ? 'var(--nba-east)' : 'var(--nba-gold)',
    },
  ]
  const advantageItems = [
    {
      label: 'Janela de ganho',
      title: pressureSeries
        ? `${pressureSeries.home_team?.abbreviation ?? pressureSeries.home_team_id} x ${pressureSeries.away_team?.abbreviation ?? pressureSeries.away_team_id} ficou sensível`
        : 'Sem confronto pressionado agora',
      detail: pressureSeries
        ? 'Lesão relevante e contexto de elenco deixam essa série com mais chance de abrir vantagem para quem ler melhor.'
        : 'Quando houver baixa importante numa série aberta, ela aparece aqui como oportunidade.',
      tone: pressureSeries ? '#ff8c72' : 'var(--nba-text)',
    },
    {
      label: 'Leitura da sua cartela',
      title: pickedSeries < readySeries.length
        ? `Você ainda pode atacar ${readySeries.length - pickedSeries} série${readySeries.length - pickedSeries !== 1 ? 's' : ''}`
        : 'Sua base de picks já está montada',
      detail: pickedSeries < readySeries.length
        ? 'As séries prontas sem pick ainda podem virar diferencial antes da galera reagir.'
        : 'Agora o foco passa a ser acompanhar lesões, locks e o movimento da classificação.',
      tone: pickedSeries < readySeries.length ? 'var(--nba-gold)' : 'var(--nba-success)',
    },
    {
      label: 'Próximo risco',
      title: unpickedReadySeries[0]?.tip_off_at
        ? `Lock em ${formatShortDateTime(unpickedReadySeries[0].tip_off_at)}`
        : 'Sem lock pressionando agora',
      detail: unpickedReadySeries[0]
        ? `${unpickedReadySeries[0].home_team?.abbreviation ?? unpickedReadySeries[0].home_team_id} x ${unpickedReadySeries[0].away_team?.abbreviation ?? unpickedReadySeries[0].away_team_id} é o primeiro ponto de atenção da sua cartela.`
        : 'Sua janela imediata está limpa neste momento.',
      tone: unpickedReadySeries[0] ? 'var(--nba-gold)' : 'var(--nba-text)',
    },
  ]
  const smartAlertItems = [
    {
      label: 'Próximo lock',
      title: unpickedReadySeries[0]
        ? `${unpickedReadySeries[0].home_team?.abbreviation ?? unpickedReadySeries[0].home_team_id} x ${unpickedReadySeries[0].away_team?.abbreviation ?? unpickedReadySeries[0].away_team_id}`
        : 'Nenhum lock crítico agora',
      detail: unpickedReadySeries[0]
        ? `A série trava em ${formatShortDateTime(unpickedReadySeries[0].tip_off_at)} e ainda está aberta na sua cartela.`
        : 'Sua janela imediata está limpa; o foco agora é acompanhar a rodada.',
      tone: unpickedReadySeries[0] ? 'var(--nba-gold)' : 'var(--nba-success)',
    },
    {
      label: 'Lesão no radar',
      title: pressureSeries
        ? `${pressureSeries.home_team?.abbreviation ?? pressureSeries.home_team_id} x ${pressureSeries.away_team?.abbreviation ?? pressureSeries.away_team_id} segue sensível`
        : 'Sem série pressionada agora',
      detail: pressureSeries
        ? 'Baixa relevante ou status incerto mantêm essa chave com risco extra para leitura de mercado.'
        : 'Quando uma ausência pesada mexer na rodada, ela aparece aqui primeiro.',
      tone: pressureSeries ? '#ff8c72' : 'var(--nba-text)',
    },
    {
      label: 'Rival direto',
      title: directHunter && myEntry
        ? `${Math.max(directHunter.total_points - myEntry.total_points, 0)} pts separam você de ${directHunter.participant_name.split(' ')[0]}`
        : myEntry?.rank === 1
        ? 'Você controla a corrida'
        : 'Pelotão ainda embolado',
      detail: directHunter
        ? 'Qualquer cravada nas próximas séries pode virar a ordem entre vocês rapidamente.'
        : myEntry?.rank === 1
        ? 'A pressão agora é defender a liderança nas próximas leituras.'
        : 'Os primeiros fechamentos tendem a clarear quem entra de vez na perseguição.',
      tone: directHunter ? 'var(--nba-east)' : 'var(--nba-gold)',
    },
  ]
  const socialPulseItems = [
    {
      label: 'Nome quente',
      title: socialClimber
        ? `${socialClimber.participant_name.split(' ')[0]} subiu ${socialClimber.prev_rank! - socialClimber.rank} posição${socialClimber.prev_rank! - socialClimber.rank !== 1 ? 'ões' : ''}`
        : 'Sem disparada no momento',
      detail: socialClimber
        ? `A última rodada empurrou ${socialClimber.participant_name.split(' ')[0]} para ${socialClimber.rank}º e ligou o radar da perseguição.`
        : 'O ranking segue comprimido, sem uma arrancada grande nesta janela.',
      tone: socialClimber ? 'var(--nba-success)' : 'var(--nba-text)',
    },
    {
      label: 'Chefe da mesa',
      title: leader ? `${leader.participant_name.split(' ')[0]} dita o ritmo` : 'Liderança em aberto',
      detail: leader
        ? `${leader.total_points} pontos totais e ${leader.cravadas} cravada${leader.cravadas !== 1 ? 's' : ''} sustentam a ponta.`
        : 'O topo ainda não reuniu dados suficientes para um recorte forte.',
      tone: 'var(--nba-gold)',
    },
    {
      label: 'Rei das cravadas',
      title: cravadaLeader ? `${cravadaLeader.participant_name.split(' ')[0]} lidera com ${cravadaLeader.cravadas}` : 'Cravadas zeradas',
      detail: cravadaLeader
        ? 'As cravadas continuam sendo o maior atalho para mexer de verdade na tabela.'
        : 'Quando as séries forem fechando, esse termômetro começa a separar o pelotão.',
      tone: 'var(--nba-east)',
    },
  ]
  const canStartTour = !rankLoading && !seriesLoading && show
  const postRoundItems = useMemo(() => {
    const biggestRise = ranking
      .filter((entry) => entry.prev_rank != null && entry.prev_rank > entry.rank)
      .sort((left, right) => (right.prev_rank! - right.rank) - (left.prev_rank! - left.rank))[0]

    const topCravadas = ranking
      .slice()
      .sort((left, right) => right.cravadas - left.cravadas || right.total_points - left.total_points)[0]

    const gameOfNight = recentCompletedGames[0]
    const gameHighlight = gameOfNight?.nba_game_id ? highlightsByGameId[gameOfNight.nba_game_id] : undefined
    const homeAbbr = gameOfNight?.home_team?.abbreviation ?? gameOfNight?.home_team_id
    const awayAbbr = gameOfNight?.away_team?.abbreviation ?? gameOfNight?.away_team_id

    return [
      {
        label: 'Maior subida',
        title: biggestRise
          ? `${biggestRise.participant_name.split(' ')[0]} subiu ${biggestRise.prev_rank! - biggestRise.rank} posição${biggestRise.prev_rank! - biggestRise.rank !== 1 ? 'ões' : ''}`
          : 'Pelotão ainda estável',
        detail: biggestRise
          ? `A rodada empurrou ${biggestRise.participant_name.split(' ')[0]} para ${biggestRise.rank}º com ${biggestRise.total_points} pontos totais.`
          : 'Ainda não houve movimento grande o bastante para quebrar o bloco principal do ranking.',
        tone: biggestRise ? 'var(--nba-success)' : 'var(--nba-text)',
      },
      {
        label: 'Jogo que mais pesou',
        title: gameOfNight
          ? `${homeAbbr} x ${awayAbbr} virou o centro da noite`
          : 'Sem jogo fechado ainda',
        detail: gameHighlight?.headline
          ? gameHighlight.headline
          : gameOfNight
          ? `O último resultado real fechado foi ${gameOfNight.home_score ?? 0} x ${gameOfNight.away_score ?? 0}, mantendo essa série como referência do momento.`
          : 'Assim que os primeiros placares fecharem, a Home resume aqui o duelo que mais mexeu na rodada.',
        tone: gameOfNight ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
      },
      {
        label: 'Cravada em destaque',
        title: topCravadas
          ? `${topCravadas.participant_name.split(' ')[0]} lidera em cravadas`
          : 'Sem referência de cravadas',
        detail: topCravadas
          ? `${topCravadas.cravadas} cravada${topCravadas.cravadas !== 1 ? 's' : ''} e ${topCravadas.total_points} pontos no total pressionam o resto do bolão.`
          : 'A disputa ainda está muito cedo para separar quem está lendo melhor as séries.',
        tone: topCravadas ? 'var(--nba-east)' : 'var(--nba-text)',
      },
    ]
  }, [highlightsByGameId, ranking, recentCompletedGames])

  return (
    <motion.div
      className="pb-24 pt-4 px-4 mx-auto grid gap-4 xl:gap-5 grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_320px]"
      style={{ maxWidth: 1420 }}
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {canStartTour && <OnboardingTour show={canStartTour} onComplete={complete} />}
      <div className="hidden xl:flex xl:flex-col xl:gap-4 min-w-0">
        <RankingCard ranking={ranking} loading={rankLoading} highlightId={participantId} />
        <StatsGrid participantCount={ranking.length} completedSeries={completedSeries} totalSeries={series.length} myEntry={myEntry} loading={rankLoading || seriesLoading} />
        <HomeQuickDeck vertical />
      </div>

      <div className="flex flex-col gap-4 min-w-0">
        <motion.div variants={fadeUpItem}>
          <LastNightRecap
            games={recentCompletedGames}
            upcomingGames={upcomingGames}
            isRealData={hasRealGames && recentCompletedGames.length > 0}
            loading={seriesLoading}
            highlightsByGameId={highlightsByGameId}
            highlightsLoading={highlightsLoading}
            highlightsAvailable={highlightsProvider.available}
          />
        </motion.div>
        <motion.div variants={scaleInItem}>
          <HeroPanel
            myEntry={myEntry}
            pickedSeries={pickedSeries}
            readySeries={readySeries.length}
            totalSeries={series.length}
            leaderPoints={leader?.total_points ?? 0}
            urgentPicks={readySeries.length - pickedSeries}
            todayGamesCount={todayGamesCount}
            liveGamesCount={liveGamesCount}
            alertSeriesCount={alertSeriesCount}
          />
        </motion.div>
        <ExecutiveSummaryStrip items={executiveItems} />
        <PostRoundSummaryStrip items={postRoundItems} />
        <SmartAlertsStrip items={smartAlertItems} />
        <SocialPulseStrip items={socialPulseItems} />
        <motion.div variants={fadeInItem}><NewsAlertPill /></motion.div>
        <motion.div className="xl:hidden" variants={fadeUpItem}><HomeQuickDeck /></motion.div>

        <div className="xl:hidden flex flex-col gap-4">
          <AdvantageInsightsCard items={advantageItems} />
          <MyPicksCard series={series} picks={picks} injuries={homeInjuries} />
          <RankingCard ranking={ranking} loading={rankLoading} highlightId={participantId} />
          <StatsGrid participantCount={ranking.length} completedSeries={completedSeries} totalSeries={series.length} myEntry={myEntry} loading={rankLoading || seriesLoading} />
          <RecentSeriesCard series={series} />
        </div>

        <OfficialBracketCard
          series={series}
          upcomingGames={upcomingGames}
          participantCount={ranking.length}
          injuries={homeInjuries}
          injuriesLoading={injuriesLoading}
          injuriesAvailable={injuriesProvider.available}
        />
      </div>

      <div className="hidden xl:flex xl:flex-col xl:gap-4 min-w-0">
        <AdvantageInsightsCard items={advantageItems} />
        <MyPicksCard series={series} picks={picks} injuries={homeInjuries} />
        <RecentSeriesCard series={series} />
      </div>
    </motion.div>
  )
}

function getInjuryTone(status: string) {
  if (status === 'Out') return { label: 'fora', color: '#ff8c72' }
  if (status === 'Doubtful') return { label: 'dúvida', color: '#f39c12' }
  if (status === 'Questionable') return { label: 'questionável', color: '#ffd166' }
  return { label: status.toLowerCase(), color: 'var(--nba-text-muted)' }
}

function getSeriesImpactLabel(homeInjury?: InjuryItem, awayInjury?: InjuryItem) {
  const keyAlerts = [homeInjury, awayInjury].filter((item) => item?.impact === 'high').length
  const mediumAlerts = [homeInjury, awayInjury].filter((item) => item?.impact === 'medium').length

  if (keyAlerts >= 2) return { label: 'Impacto alto', color: '#ff8c72', background: 'rgba(255,140,114,0.10)', border: 'rgba(255,140,114,0.24)' }
  if (keyAlerts === 1 || mediumAlerts >= 2) return { label: 'Impacto moderado', color: '#ffd166', background: 'rgba(255,209,102,0.10)', border: 'rgba(255,209,102,0.20)' }
  if (mediumAlerts === 1) return { label: 'Monitorar', color: '#4a90d9', background: 'rgba(74,144,217,0.10)', border: 'rgba(74,144,217,0.20)' }
  return { label: 'Elencos íntegros', color: 'var(--nba-text-muted)', background: 'rgba(136,136,153,0.08)', border: 'rgba(136,136,153,0.16)' }
}

function getSeriesHeadline({
  homeAbbr,
  awayAbbr,
  homeInjury,
  awayInjury,
  hasTodayGame,
  inProgress,
  isComplete,
  impactLabel,
}: {
  homeAbbr: string
  awayAbbr: string
  homeInjury?: InjuryItem
  awayInjury?: InjuryItem
  hasTodayGame: boolean
  inProgress: boolean
  isComplete: boolean
  impactLabel: string
}) {
  if (isComplete) {
    return {
      title: `${homeAbbr} x ${awayAbbr} já teve vencedor definido`,
      detail: 'Série fechada na chave oficial da NBA.',
    }
  }

  if (homeInjury?.impact === 'high' && awayInjury?.impact === 'high') {
    return {
      title: `${homeAbbr} e ${awayAbbr} chegam com baixas pesadas`,
      detail: 'Os dois lados carregam ausências que mudam bastante a leitura do confronto.',
    }
  }

  if (homeInjury?.impact === 'high') {
    return {
      title: `${homeAbbr} chega pressionado por desfalque importante`,
      detail: `${homeInjury.player_name} está ${getInjuryTone(homeInjury.status).label} para a série.`,
    }
  }

  if (awayInjury?.impact === 'high') {
    return {
      title: `${awayAbbr} chega pressionado por desfalque importante`,
      detail: `${awayInjury.player_name} está ${getInjuryTone(awayInjury.status).label} para a série.`,
    }
  }

  if (hasTodayGame) {
    return {
      title: `${homeAbbr} x ${awayAbbr} movimenta a chave hoje`,
      detail: impactLabel === 'Elencos íntegros'
        ? 'Confronto do dia sem alerta relevante de elenco.'
        : 'Vale monitorar a rotação antes da bola subir.',
    }
  }

  if (inProgress) {
    return {
      title: `${homeAbbr} x ${awayAbbr} já entrou em rota de colisão`,
      detail: impactLabel === 'Elencos íntegros'
        ? 'Série em andamento com leitura relativamente limpa.'
        : 'O contexto do elenco ainda pesa no andamento da série.',
    }
  }

  return {
    title: `${homeAbbr} x ${awayAbbr} aguarda a abertura oficial`,
    detail: impactLabel === 'Elencos íntegros'
      ? 'Nenhum alerta importante antes do começo da série.'
      : 'O radar do confronto já aponta pontos de atenção antes do jogo 1.',
  }
}
