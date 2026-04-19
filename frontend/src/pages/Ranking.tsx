import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BarChart2, Crown, Flame, FlaskConical, Info, Medal, Trophy, X } from 'lucide-react'
import { RankingTable } from '../components/RankingTable'
import { RankingChart } from '../components/RankingChart'
import { SimulatorPanel } from '../components/SimulatorPanel'
import { LoadingBasketball } from '../components/LoadingBasketball'
import { SkeletonCard } from '../components/SkeletonCard'
import { useRanking } from '../hooks/useRanking'
import { useAllGamePickDots } from '../hooks/useAllGamePickDots'
import { useParticipantBadges } from '../hooks/useParticipantBadges'
import { SCORING_CONFIG } from '../utils/scoring'
import { ROUND_LABELS } from '../utils/constants'
import { fadeUpItem, premiumTween, pressMotion, scaleInItem, softStaggerContainer, staggerContainer } from '../lib/motion'

interface Props {
  participantId: string
}


function TopThreeCards({
  ranking,
  participantId,
}: {
  ranking: ReturnType<typeof useRanking>['ranking']
  participantId: string
}) {
  const topThree = ranking.slice(0, 3)
  if (topThree.length === 0) return null

  const styles = [
    { label: 'Líder', icon: <Crown size={16} />, color: '#ffd166', glow: 'rgba(255,209,102,0.18)', glowClass: 'podium-gold' },
    { label: 'Vice', icon: <Medal size={16} />, color: '#c9d1d9', glow: 'rgba(201,209,217,0.14)', glowClass: 'podium-silver' },
    { label: '3º lugar', icon: <Trophy size={16} />, color: '#d68c45', glow: 'rgba(214,140,69,0.14)', glowClass: 'podium-bronze' },
  ]

  return (
    <motion.div variants={softStaggerContainer} initial="hidden" animate="show" style={{ display: 'grid', gap: 12 }} className="grid-cols-1 sm:grid-cols-3">
      {topThree.map((entry, index) => {
        const style = styles[index]
        const isMe = entry.participant_id === participantId

        const enterClass = index === 0 ? 'podium-enter-center' : index === 1 ? 'podium-enter-right' : 'podium-enter-left'

        return (
          <motion.div
            key={entry.participant_id}
            variants={scaleInItem}
            className={`${style.glowClass} ${enterClass}`}
            whileHover={{ y: -5, scale: 1.012, boxShadow: `0 24px 48px ${style.glow}` }}
            whileTap={pressMotion.tap}
            style={{
              background: `linear-gradient(180deg, ${style.glow}, rgba(19,19,26,0.96))`,
              border: `1px solid ${style.color}33`,
              borderRadius: 12,
              padding: '1rem',
              minHeight: 180,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: isMe ? '0 0 0 1px rgba(200,150,60,0.28) inset' : 'none',
              transition: 'transform 0.22s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: style.color, fontSize: '0.78rem', fontWeight: 700 }}>
                {style.icon}
                {style.label}
              </span>
              <span className="font-condensed font-bold" style={{ color: style.color, fontSize: '1rem' }}>
                #{entry.rank}
              </span>
            </div>

            <div style={{ color: isMe ? 'var(--nba-gold)' : 'var(--nba-text)', fontWeight: 700, fontSize: '0.96rem', marginBottom: 6 }}>
              {entry.participant_name}
            </div>
            <div className="font-condensed font-bold" style={{ color: style.color, fontSize: '2.2rem', lineHeight: 1, marginBottom: 10 }}>
              {entry.total_points}
            </div>

            <div style={{ display: 'grid', gap: 6, fontSize: '0.76rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--nba-text-muted)' }}>
                <span>Cravadas</span>
                <strong style={{ color: 'var(--nba-text)' }}>{entry.cravadas}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--nba-text-muted)' }}>
                <span>Acertos de série</span>
                <strong style={{ color: 'var(--nba-text)' }}>{entry.series_correct}/{entry.series_total}</strong>
              </div>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

function TopThreeCardsSkeleton() {
  return (
    <div style={{ display: 'grid', gap: 12 }} className="grid-cols-1 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          style={{
            background: 'var(--nba-surface)',
            border: '1px solid var(--nba-border)',
            borderRadius: 12,
            padding: '1rem',
            minHeight: 180,
            display: 'grid',
            gap: 10,
          }}
        >
          <SkeletonCard width="45%" height={14} />
          <SkeletonCard width="68%" height={18} />
          <SkeletonCard width={74} height={38} />
          <SkeletonCard width="100%" height={12} />
          <SkeletonCard width="84%" height={12} />
        </div>
      ))}
    </div>
  )
}

function RankingHero({
  ranking,
  participantId,
}: {
  ranking: ReturnType<typeof useRanking>['ranking']
  participantId: string
}) {
  const myEntry = ranking.find((entry) => entry.participant_id === participantId)
  const leader = ranking[0]
  const myGap = myEntry && leader ? Math.max(leader.total_points - myEntry.total_points, 0) : null

  return (
    <motion.div
      id="ranking-hero-tour"
      variants={scaleInItem}
      initial="hidden"
      animate="show"
      whileHover={{ y: -3, boxShadow: '0 22px 44px rgba(0,0,0,0.2)' }}
      style={{
        background: 'linear-gradient(135deg, rgba(200,150,60,0.18), rgba(74,144,217,0.10) 55%, rgba(19,19,26,1) 100%)',
        border: '1px solid rgba(200,150,60,0.22)',
        borderRadius: 12,
        padding: '1rem',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 18,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at top right, rgba(232,180,90,0.18), transparent 35%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nba-gold)' }}>
          <Flame size={15} />
          <span className="font-condensed" style={{ fontSize: '0.78rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Corrida pelo topo
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <BarChart2 size={20} style={{ color: 'var(--nba-gold)' }} />
              <h1 className="title" style={{ color: 'var(--nba-gold)', fontSize: '2rem', lineHeight: 1, margin: 0 }}>
                Ranking
              </h1>
            </div>
            <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', margin: 0 }}>
              Atualizado em tempo real via Supabase Realtime
            </p>
          </div>

          <div
            style={{
              minWidth: 190,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(12,12,18,0.34)',
              border: '1px solid rgba(200,150,60,0.16)',
            }}
          >
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 6 }}>Seu cenário atual</div>
            <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '1.1rem', lineHeight: 1 }}>
              {myEntry ? `#${myEntry.rank} com ${myEntry.total_points} pts` : 'Aguardando pontuação'}
            </div>
            <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 4 }}>
              {myGap == null ? 'Entre na disputa para aparecer aqui.' : myGap === 0 ? 'Você está empatado na liderança.' : `${myGap} ponto${myGap !== 1 ? 's' : ''} para alcançar o topo`}
            </div>
          </div>
        </div>

        <motion.div variants={softStaggerContainer} initial="hidden" animate="show" style={{ display: 'grid', gap: 10 }} className="grid-cols-1 sm:grid-cols-3">
          {[
            { label: 'Participantes', value: ranking.length, tone: 'var(--nba-text)' },
            { label: 'Líder atual', value: leader ? leader.participant_name.split(' ')[0] : '—', tone: 'var(--nba-gold)' },
            { label: 'Maior pontuação', value: leader?.total_points ?? 0, tone: 'var(--nba-success)' },
          ].map((item) => (
            <motion.div
              key={item.label}
              variants={fadeUpItem}
              whileHover={{ y: -2, scale: 1.015 }}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(12,12,18,0.34)',
                border: '1px solid rgba(200,150,60,0.16)',
              }}
            >
              <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.7rem' }}>{item.label}</div>
              <div className="font-condensed font-bold" style={{ color: item.tone, fontSize: '1.65rem', lineHeight: 1.1 }}>
                {item.value}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  )
}

function ScoringGuide({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const [showTiebreakInfo, setShowTiebreakInfo] = useState(false)

  return (
    <div
      style={{
        background: 'var(--nba-surface)',
        border: '1px solid var(--nba-border)',
        borderRadius: 8,
        padding: '1rem',
        position: mobile ? 'relative' : 'sticky',
        top: mobile ? undefined : 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Info size={16} style={{ color: 'var(--nba-gold)' }} />
          <h2
            className="title"
            style={{
              color: 'var(--nba-gold)',
              fontSize: '1rem',
              letterSpacing: '0.1em',
            }}
          >
            Pontuação
          </h2>
        </div>

        {mobile && onClose && (
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--nba-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.82rem', marginBottom: 12 }}>
        Acertar o vencedor do jogo ou da série gera pontos. Se acertar também em quantos jogos a série termina, vira cravada.
      </p>

      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setShowTiebreakInfo((current) => !current)}
          aria-label="Explicar o critério de desempate"
          style={{
            width: 22,
            height: 22,
            borderRadius: '999px',
            border: '1px solid rgba(200,150,60,0.35)',
            background: 'rgba(200,150,60,0.14)',
            color: 'var(--nba-gold)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Info size={12} />
        </button>

        {showTiebreakInfo && (
          <div
            style={{
              marginTop: 10,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(12,12,18,0.96)',
              border: '1px solid rgba(200,150,60,0.26)',
              color: 'var(--nba-text)',
              fontSize: '0.78rem',
              lineHeight: 1.45,
            }}
          >
            Critério de desempate:
            <br />
            1. total de pontos
            <br />
            2. cravadas
            <br />
            3. acertos de série
            <br />
            4. acertos de jogo
            <br />
            5. ordem alfabética
          </div>
        )}
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 44px 54px', gap: 4, marginBottom: 4 }}>
        <div />
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.62rem', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textAlign: 'center', textTransform: 'uppercase' }}>Jogo</div>
        <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.62rem', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textAlign: 'center', textTransform: 'uppercase' }}>Série</div>
        <div style={{ color: '#ffd166', fontSize: '0.62rem', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.06em', textAlign: 'center', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Flame size={9} />Cravada
        </div>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        {([1, 2, 3, 4] as const).map((round) => (
          <div
            key={round}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 44px 44px 54px',
              alignItems: 'center',
              gap: 4,
              padding: '9px 10px',
              borderRadius: 8,
              background: 'var(--nba-surface-2)',
              border: '1px solid var(--nba-border)',
            }}
          >
            <div style={{ color: 'var(--nba-text)', fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ROUND_LABELS[round]}
            </div>
            <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '0.95rem', textAlign: 'center', lineHeight: 1 }}>
              {SCORING_CONFIG.pointsPerGame[round]}
            </div>
            <div className="font-condensed font-bold" style={{ color: 'var(--nba-gold)', fontSize: '0.95rem', textAlign: 'center', lineHeight: 1 }}>
              {SCORING_CONFIG.pointsPerSeries[round]}
            </div>
            <div
              className="font-condensed font-bold"
              style={{
                color: '#ffd166',
                fontSize: '0.95rem',
                textAlign: 'center',
                lineHeight: 1,
                background: 'rgba(255,209,102,0.09)',
                borderRadius: 6,
                padding: '4px 0',
              }}
            >
              {SCORING_CONFIG.pointsPerCravada[round]}
            </div>
          </div>
        ))}
      </div>

      <p style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', marginTop: 12 }}>
        Cravada substitui a pontuação da série, ela não soma por cima.
      </p>
    </div>
  )
}

export function Ranking({ participantId }: Props) {
  const { ranking, breakdowns, rawSeries, rawSeriesPicks, loading, error } = useRanking()
  const { dotsById } = useAllGamePickDots()
  const { badgesByParticipant } = useParticipantBadges()
  const [mobileScoringOpen, setMobileScoringOpen] = useState(false)
  const [simOpen, setSimOpen] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const previousOrderRef = useRef('')

  const hasOpenSeries = rawSeries.some((s) => !s.is_complete && s.home_team_id != null)

const navigate = useNavigate()

  useEffect(() => {
    const currentOrder = ranking.map((entry) => entry.participant_id).join('|')
    if (!currentOrder) return
    if (previousOrderRef.current && previousOrderRef.current !== currentOrder) {
      setIsReordering(true)
      const timeout = window.setTimeout(() => setIsReordering(false), 700)
      previousOrderRef.current = currentOrder
      return () => window.clearTimeout(timeout)
    }
    previousOrderRef.current = currentOrder
    return undefined
  }, [ranking])

  function handleParticipantClick(id: string) {
    navigate(`/profile/${id}`)
  }

  return (
    <motion.div className="pb-24 pt-4 px-4 mx-auto" style={{ maxWidth: 1180 }} variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={scaleInItem}><RankingHero ranking={ranking} participantId={participantId} /></motion.div>

      {error && (
        <div style={{ margin: '16px 0', padding: '12px 16px', borderRadius: 8, background: 'rgba(231,76,60,0.10)', border: '1px solid rgba(231,76,60,0.3)', color: 'var(--nba-danger)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <>
          <div
            className="grid lg:grid-cols-[280px_minmax(0,1fr)]"
            style={{ gap: 16, alignItems: 'start' }}
          >
            <aside className="hidden lg:block">
              <div
                className={isReordering ? 'ranking-reorder' : undefined}
                style={{
                  background: 'var(--nba-surface)',
                  border: '1px solid var(--nba-border)',
                  borderRadius: 8,
                  padding: '1rem',
                  display: 'grid',
                  gap: 10,
                }}
              >
                <SkeletonCard width="46%" height={20} />
                <SkeletonCard width="100%" height={12} />
                <SkeletonCard width="100%" height={12} />
                {Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonCard key={index} width="100%" height={52} radius={8} />
                ))}
              </div>
            </aside>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
              <TopThreeCardsSkeleton />

              <div style={{ background: 'var(--nba-surface)', border: '1px solid var(--nba-border)', borderRadius: 8, padding: '1rem' }}>
                <SkeletonCard width="40%" height={18} style={{ marginBottom: 16 }} />
                <SkeletonCard width="100%" height={250} radius={8} />
              </div>

              <div style={{ background: 'var(--nba-surface)', border: '1px solid var(--nba-border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--nba-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <SkeletonCard width={140} height={16} />
                  <SkeletonCard width={90} height={12} />
                </div>
                <div style={{ padding: '14px 16px', display: 'grid', gap: 10 }}>
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '34px 1fr 60px', gap: 10, alignItems: 'center' }}>
                      <SkeletonCard width={24} height={14} />
                      <SkeletonCard width="100%" height={14} />
                      <SkeletonCard width={48} height={14} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 24 }}>
            <LoadingBasketball size={22} />
          </div>
        </>
      ) : (
        <>
          <div className="lg:hidden" style={{ marginBottom: 16 }}>
            <button
              onClick={() => setMobileScoringOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: 'var(--nba-surface)',
                border: '1px solid var(--nba-border)',
                borderRadius: 8,
                color: 'var(--nba-gold)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Info size={15} />
              Ver pontuação
            </button>
          </div>

          <AnimatePresence>
          {mobileScoringOpen && (
            <div className="lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileScoringOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.65)',
                  zIndex: 40,
                }}
              />
              <motion.div
                initial={{ opacity: 0, x: -36 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -36 }}
                transition={premiumTween}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: 'min(88vw, 320px)',
                  padding: 16,
                  zIndex: 41,
                  overflowY: 'auto',
                }}
              >
                <ScoringGuide mobile onClose={() => setMobileScoringOpen(false)} />
              </motion.div>
            </div>
          )}
          </AnimatePresence>

          <div
            className="grid lg:grid-cols-[280px_minmax(0,1fr)]"
            style={{ gap: 16, alignItems: 'start' }}
          >
            <aside className="hidden lg:block">
              <ScoringGuide />
            </aside>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr)',
                gap: 16,
              }}
            >
              <CompetitivePulse ranking={ranking} participantId={participantId} />
              <motion.div variants={fadeUpItem}><TopThreeCards ranking={ranking} participantId={participantId} /></motion.div>

              {/* Chart card */}
              <motion.div
                id="ranking-table-tour"
                variants={fadeUpItem}
                whileHover={{ y: -2, boxShadow: '0 18px 38px rgba(0,0,0,0.18)' }}
                style={{
                  background: 'var(--nba-surface)',
                  border: '1px solid var(--nba-border)',
                  borderRadius: 8,
                  padding: '1rem',
                }}
              >
                <h2
                  className="title"
                  style={{
                    color: 'var(--nba-gold)',
                    fontSize: '1rem',
                    letterSpacing: '0.1em',
                    marginBottom: 16,
                  }}
                >
                  Corrida de Pontuação
                </h2>
                <RankingChart ranking={ranking} breakdowns={breakdowns} />
              </motion.div>

              {/* Table card */}
              <motion.div
                variants={fadeUpItem}
                whileHover={{ y: -2, boxShadow: '0 18px 38px rgba(0,0,0,0.18)' }}
                style={{
                  background: 'var(--nba-surface)',
                  border: '1px solid var(--nba-border)',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                {/* Table header strip */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--nba-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <h2
                    className="title"
                    style={{ color: 'var(--nba-gold)', fontSize: '1rem', letterSpacing: '0.1em' }}
                  >
                    Classificação
                  </h2>
                  <span style={{ color: 'var(--nba-text-muted)', fontSize: '0.75rem' }}>
                    {ranking.length} participante{ranking.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <RankingTable
                  ranking={ranking}
                  highlightId={participantId}
                  onParticipantClick={handleParticipantClick}
                  dotsById={dotsById}
                  badgesByParticipant={badgesByParticipant}
                />

                {/* E se... — abaixo da tabela */}
                {hasOpenSeries && (
                  <div
                    style={{
                      borderTop: '1px solid var(--nba-border)',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="font-condensed font-bold"
                        style={{ color: 'var(--nba-text)', fontSize: '0.88rem', letterSpacing: '0.04em' }}
                      >
                        Simulador de cenários
                      </div>
                      <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.72rem', marginTop: 3 }}>
                        Veja como o ranking mudaria dependendo dos próximos resultados
                      </div>
                    </div>
                    <motion.button
                      onClick={() => setSimOpen((v) => !v)}
                      title="Simule resultados das séries abertas e veja como o ranking seria afetado"
                      whileHover={{ y: -1, scale: 1.015 }}
                      whileTap={pressMotion.tap}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '9px 16px',
                        borderRadius: 8,
                        border: simOpen
                          ? '1px solid rgba(200,150,60,0.5)'
                          : '1px solid rgba(200,150,60,0.22)',
                        background: simOpen
                          ? 'rgba(200,150,60,0.14)'
                          : 'rgba(200,150,60,0.06)',
                        color: 'var(--nba-gold)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        flexShrink: 0,
                      }}
                    >
                      <FlaskConical size={14} />
                      {simOpen ? 'Fechar simulador' : 'E se...'}
                    </motion.button>
                  </div>
                )}
              </motion.div>

              {/* Simulator panel */}
              {simOpen && (
                <SimulatorPanel
                  ranking={ranking}
                  rawSeries={rawSeries}
                  rawSeriesPicks={rawSeriesPicks}
                  onClose={() => setSimOpen(false)}
                />
              )}

            </div>
          </div>
        </>
      )}

    </motion.div>
  )
}

function CompetitivePulse({
  ranking,
  participantId,
}: {
  ranking: ReturnType<typeof useRanking>['ranking']
  participantId: string
}) {
  const myIndex = ranking.findIndex((entry) => entry.participant_id === participantId)
  const myEntry = myIndex >= 0 ? ranking[myIndex] : null
  const leader = ranking[0] ?? null
  const podiumTarget = ranking[2] ?? null
  const hunter = myIndex > 0 ? ranking[myIndex - 1] : null
  const chaser = myIndex >= 0 && myIndex < ranking.length - 1 ? ranking[myIndex + 1] : null
  const hottestEntry = [...ranking].sort((left, right) => {
    const leftRise = (left.prev_rank ?? left.rank) - left.rank
    const rightRise = (right.prev_rank ?? right.rank) - right.rank
    return rightRise - leftRise
  })[0]

  const cards = [
    {
      label: 'Linha do pódio',
      title: myEntry && podiumTarget
        ? myEntry.rank <= 3
          ? 'Você já está no top 3'
          : `${Math.abs(podiumTarget.total_points - myEntry.total_points)} pts da zona do pódio`
        : 'Pódio em formação',
      detail: myEntry && podiumTarget
        ? myEntry.rank <= 3
          ? 'Agora a pressão é segurar a posição nas próximas séries.'
          : `${podiumTarget.participant_name.split(' ')[0]} hoje fecha a referência do top 3.`
        : 'A classificação vai ganhar corpo conforme as primeiras séries fecharem.',
      tone: 'var(--nba-gold)',
    },
    {
      label: 'Rival imediato',
      title: hunter
        ? `${hunter.participant_name.split(' ')[0]} está logo acima`
        : myEntry?.rank === 1
        ? 'Você dita o ritmo lá na frente'
        : 'Ainda sem rival imediato',
      detail: hunter && myEntry
        ? `${Math.max(hunter.total_points - myEntry.total_points, 0)} ponto${Math.max(hunter.total_points - myEntry.total_points, 0) !== 1 ? 's' : ''} separam vocês hoje.`
        : chaser && myEntry
        ? `${Math.max(myEntry.total_points - chaser.total_points, 0)} ponto${Math.max(myEntry.total_points - chaser.total_points, 0) !== 1 ? 's' : ''} de margem para quem vem atrás.`
        : 'A tabela ainda está muito curta para desenhar perseguição.',
      tone: 'var(--nba-east)',
    },
    {
      label: 'Momento quente',
      title: hottestEntry
        ? `${hottestEntry.participant_name.split(' ')[0]} é o nome em alta`
        : 'Momento neutro',
      detail: hottestEntry
        ? (hottestEntry.prev_rank ?? hottestEntry.rank) > hottestEntry.rank
          ? `Subiu ${Math.max((hottestEntry.prev_rank ?? hottestEntry.rank) - hottestEntry.rank, 1)} posição${Math.max((hottestEntry.prev_rank ?? hottestEntry.rank) - hottestEntry.rank, 1) !== 1 ? 'ões' : ''} no último movimento do ranking.`
          : leader
          ? `${leader.participant_name.split(' ')[0]} segue como referência da corrida.`
          : 'A corrida ainda está começando.'
        : 'A tabela ainda está estável.',
      tone: 'var(--nba-success)',
    },
  ]

  return (
    <motion.div variants={fadeUpItem} initial="hidden" animate="show" style={{ display: 'grid', gap: 12, marginBottom: 16 }} className="grid-cols-1 lg:grid-cols-3">
      {cards.map((card) => (
        <motion.div
          key={card.label}
          variants={fadeUpItem}
          whileHover={{ y: -2, scale: 1.01 }}
          style={{
            background: 'linear-gradient(135deg, rgba(19,19,26,1), rgba(74,144,217,0.06) 52%, rgba(200,150,60,0.06) 100%)',
            border: '1px solid rgba(200,150,60,0.14)',
            borderRadius: 12,
            padding: '0.95rem',
          }}
        >
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', marginBottom: 8 }}>{card.label}</div>
          <div className="font-condensed font-bold" style={{ color: card.tone, fontSize: '1.05rem', lineHeight: 1.05, marginBottom: 8 }}>
            {card.title}
          </div>
          <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.76rem', lineHeight: 1.5 }}>
            {card.detail}
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
