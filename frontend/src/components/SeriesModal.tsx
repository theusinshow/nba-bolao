import { useState } from 'react'
import { X, Check } from 'lucide-react'
import type { Series, SeriesPick } from '../types'
import { getTeam, getTeamLogoUrl } from '../data/teams2025'
import { useUIStore } from '../store/useUIStore'
import { getSeriesTeamDisplay, isSeriesReadyForPick } from '../utils/bracket'
import { teamAbbrStyle } from '../utils/teamColors'

interface Props {
  series: Series
  existingPick?: SeriesPick
  onSave: (seriesId: string, winnerId: string, gamesCount: number) => Promise<void>
  onClose: () => void
  readOnly?: boolean
}

const GAMES_OPTIONS = [4, 5, 6, 7] as const
const GAMES_HINTS: Record<number, string> = { 4: 'Sweep', 5: '5 jogos', 6: '6 jogos', 7: 'Máximo' }

export function SeriesModal({ series, existingPick, onSave, onClose, readOnly }: Props) {
  const [selectedWinner, setSelectedWinner] = useState<string>(existingPick?.winner_id ?? '')
  const [selectedGames, setSelectedGames] = useState<number>(existingPick?.games_count ?? 0)
  const [saving, setSaving] = useState(false)
  const { addToast } = useUIStore()

  const teamA = series.home_team ?? getTeam(series.home_team_id)
  const teamB = series.away_team ?? getTeam(series.away_team_id)
  const teamADisplay = getSeriesTeamDisplay(series, 'home')
  const teamBDisplay = getSeriesTeamDisplay(series, 'away')
  const matchupReady = isSeriesReadyForPick(series)
  const seriesLocked = !!series.tip_off_at && new Date(series.tip_off_at) <= new Date()

  const roundLabel = ['R1', 'R2', 'Conf Finals', 'NBA Finals'][series.round - 1]
  const confLabel = series.conference ?? ''

  const canSave = selectedWinner !== '' && selectedGames !== 0 && !readOnly && !series.is_complete && matchupReady && !seriesLocked

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave(series.id, selectedWinner, selectedGames)
      addToast('Palpite salvo!', 'success')
      onClose()
    } catch {
      addToast('Erro ao salvar palpite', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-nba-muted hover:text-nba-text"
        >
          <X size={20} />
        </button>

        <p className="text-nba-muted text-xs font-condensed uppercase mb-1">{confLabel} — {roundLabel}</p>
        <h2 className="title text-2xl text-nba-gold mb-4">Palpite da Série</h2>

        {!matchupReady && (
          <div className="mb-4 p-3 rounded-lg border border-nba-gold/20 bg-nba-surface-2">
            <div className="text-nba-gold text-xs font-condensed uppercase mb-1">Aguardando definição</div>
            <div className="text-nba-text text-sm">
              {teamADisplay.abbreviation} vs {teamBDisplay.name}
            </div>
            <div className="text-nba-muted text-xs mt-2">
              Os palpites desta série serão liberados quando o adversário do play-in estiver confirmado.
            </div>
          </div>
        )}

        {seriesLocked && !series.is_complete && (
          <div className="mb-4 p-3 rounded-lg border border-nba-danger/30 bg-nba-surface-2">
            <div className="text-nba-danger text-xs font-condensed uppercase mb-1">Palpite travado</div>
            <div className="text-nba-text text-sm">
              Esta série já começou e não aceita mais alterações de palpite.
            </div>
          </div>
        )}

        {/* Team picker */}
        <p className="text-nba-muted text-xs mb-2">Quem vai vencer?</p>
        <div className="flex gap-2 mb-5">
          {[teamA, teamB].map((team) => {
            if (!team) return null
            const isSelected = selectedWinner === team.id
            const isWinner = series.is_complete && series.winner_id === team.id
            const accentColor = team.secondary_color ?? team.primary_color
            return (
              <button
                key={team.id}
                disabled={readOnly || series.is_complete || !matchupReady || seriesLocked}
                onClick={() => setSelectedWinner(team.id)}
                style={{
                  flex: 1,
                  padding: '18px 8px 14px',
                  borderRadius: 10,
                  border: isWinner
                    ? '2px solid var(--nba-success)'
                    : isSelected
                    ? `2px solid ${accentColor}`
                    : '1px solid var(--nba-border)',
                  background: isSelected
                    ? `${accentColor}14`
                    : 'rgba(12,12,18,0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: (readOnly || series.is_complete || !matchupReady || seriesLocked) ? 'default' : 'pointer',
                  transition: 'border-color 0.18s ease, background 0.18s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Barra topo com cor do time */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: 3,
                  background: accentColor,
                  opacity: isSelected ? 1 : 0.35,
                  transition: 'opacity 0.18s ease',
                }} />
                <img
                  src={getTeamLogoUrl(team.abbreviation)}
                  alt={team.abbreviation}
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                  style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 6 }}
                />
                <div
                  className="font-condensed font-bold"
                  style={{
                    ...teamAbbrStyle(team.primary_color),
                    fontSize: '1.5rem',
                    lineHeight: 1,
                    marginBottom: 3,
                  }}
                >
                  {team.abbreviation}
                </div>
                <div style={{ color: 'var(--nba-text-muted)', fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {team.name.split(' ').slice(-1)[0]}
                </div>
                {isSelected && !series.is_complete && (
                  <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center' }}>
                    <Check size={13} style={{ color: 'var(--nba-gold)' }} />
                  </div>
                )}
                {series.is_complete && isWinner && (
                  <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center' }}>
                    <Check size={13} style={{ color: 'var(--nba-success)' }} />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Games picker */}
        <p className="text-nba-muted text-xs mb-2">Em quantos jogos?</p>
        <div className="flex gap-2 mb-6">
          {GAMES_OPTIONS.map((n) => {
            const isSelected = selectedGames === n
            const isEdge = n === 4 || n === 7
            return (
              <button
                key={n}
                disabled={readOnly || series.is_complete || !matchupReady || seriesLocked}
                onClick={() => setSelectedGames(n)}
                style={{
                  flex: 1,
                  paddingTop: 10,
                  paddingBottom: 10,
                  borderRadius: 10,
                  border: isSelected
                    ? '2px solid var(--nba-gold)'
                    : '1px solid var(--nba-border)',
                  background: isSelected
                    ? 'rgba(200,150,60,0.14)'
                    : 'rgba(12,12,18,0.3)',
                  cursor: (readOnly || series.is_complete || !matchupReady || seriesLocked) ? 'default' : 'pointer',
                  transition: 'border-color 0.18s ease, background 0.18s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <span
                  className="font-condensed font-bold"
                  style={{
                    fontSize: '1.5rem',
                    lineHeight: 1,
                    color: isSelected ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
                    transition: 'color 0.18s ease',
                  }}
                >
                  {n}
                </span>
                {isEdge && (
                  <span
                    style={{
                      fontSize: '0.58rem',
                      color: isSelected ? 'var(--nba-gold)' : 'var(--nba-text-muted)',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      letterSpacing: '0.04em',
                      lineHeight: 1,
                      opacity: isEdge ? 1 : 0,
                    }}
                  >
                    {GAMES_HINTS[n]}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Result display */}
        {series.is_complete && (
          <div className="mb-4 p-3 rounded-lg bg-nba-surface-2 text-center">
            <span className="text-nba-muted text-xs">Resultado: </span>
            <span className="font-condensed font-bold text-nba-text">
              {(series.winner ?? getTeam(series.winner_id))?.abbreviation ?? series.winner_id} 4x{series.games_played - 4}
            </span>
          </div>
        )}

        {!readOnly && !series.is_complete && !seriesLocked && matchupReady && (
          (() => {
            const missingWinner = selectedWinner === ''
            const missingGames = selectedGames === 0
            if (missingWinner || missingGames) {
              return (
                <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(200,150,60,0.07)', border: '1px solid rgba(200,150,60,0.16)', color: 'var(--nba-text-muted)', fontSize: '0.76rem', lineHeight: 1.45 }}>
                  {missingWinner && missingGames
                    ? 'Escolha o vencedor e o número de jogos para salvar.'
                    : missingWinner
                    ? 'Falta escolher quem vai vencer.'
                    : 'Falta escolher em quantos jogos.'}
                </div>
              )
            }
            return null
          })()
        )}

        {!readOnly && !series.is_complete && (
          <button
            className="btn-primary w-full"
            onClick={handleSave}
            disabled={!canSave || saving}
          >
            {saving ? 'Salvando...' : !matchupReady ? 'Aguardando definição do confronto' : seriesLocked ? 'Palpite travado' : existingPick ? 'Atualizar Palpite' : 'Salvar Palpite'}
          </button>
        )}
      </div>
    </div>
  )
}
