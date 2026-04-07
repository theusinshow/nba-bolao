import { useState } from 'react'
import { X, Check } from 'lucide-react'
import type { Series, SeriesPick } from '../types'
import { getTeam } from '../data/teams2025'
import { useUIStore } from '../store/useUIStore'

interface Props {
  series: Series
  existingPick?: SeriesPick
  onSave: (seriesId: string, winnerId: string, gamesCount: number) => Promise<void>
  onClose: () => void
  readOnly?: boolean
}

const GAMES_OPTIONS = [4, 5, 6, 7] as const

export function SeriesModal({ series, existingPick, onSave, onClose, readOnly }: Props) {
  const [selectedWinner, setSelectedWinner] = useState<string>(existingPick?.winner_id ?? '')
  const [selectedGames, setSelectedGames] = useState<number>(existingPick?.games_count ?? 0)
  const [saving, setSaving] = useState(false)
  const { addToast } = useUIStore()

  const teamA = series.home_team ?? getTeam(series.home_team_id)
  const teamB = series.away_team ?? getTeam(series.away_team_id)

  const roundLabel = ['R1', 'R2', 'Conf Finals', 'NBA Finals'][series.round - 1]
  const confLabel = series.conference ?? ''

  const canSave = selectedWinner !== '' && selectedGames !== 0 && !readOnly && !series.is_complete

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

        {/* Team picker */}
        <p className="text-nba-muted text-xs mb-2">Quem vai vencer?</p>
        <div className="flex gap-2 mb-4">
          {[teamA, teamB].map((team) => {
            if (!team) return null
            const isSelected = selectedWinner === team.id
            const isWinner = series.is_complete && series.winner_id === team.id
            return (
              <button
                key={team.id}
                disabled={readOnly || series.is_complete}
                onClick={() => setSelectedWinner(team.id)}
                className={`flex-1 py-3 px-2 rounded-lg border text-center transition-all ${
                  isSelected
                    ? 'border-nba-gold bg-nba-surface-2'
                    : 'border-nba-border hover:border-nba-gold/40'
                } ${series.is_complete && isWinner ? 'border-nba-success' : ''}`}
              >
                <div className="font-bebas text-xl" style={{ color: team.primary_color }}>{team.abbreviation}</div>
                <div className="text-xs text-nba-muted truncate">{team.name.split(' ').slice(-1)[0]}</div>
                {isSelected && !series.is_complete && <Check size={12} className="mx-auto mt-1 text-nba-gold" />}
                {series.is_complete && isWinner && <Check size={12} className="mx-auto mt-1 text-nba-success" />}
              </button>
            )
          })}
        </div>

        {/* Games picker */}
        <p className="text-nba-muted text-xs mb-2">Em quantos jogos?</p>
        <div className="flex gap-2 mb-6">
          {GAMES_OPTIONS.map((n) => (
            <button
              key={n}
              disabled={readOnly || series.is_complete}
              onClick={() => setSelectedGames(n)}
              className={`flex-1 py-2 rounded-lg border font-condensed text-lg transition-all ${
                selectedGames === n
                  ? 'border-nba-gold bg-nba-surface-2 text-nba-gold'
                  : 'border-nba-border text-nba-muted hover:border-nba-gold/40'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Result display */}
        {series.is_complete && (
          <div className="mb-4 p-3 rounded-lg bg-nba-surface-2 text-center">
            <span className="text-nba-muted text-xs">Resultado: </span>
            <span className="font-condensed font-bold text-nba-text">
              {getTeam(series.winner_id)?.abbreviation} 4x{series.games_played - 4}
            </span>
          </div>
        )}

        {!readOnly && !series.is_complete && (
          <button
            className="btn-primary w-full"
            onClick={handleSave}
            disabled={!canSave || saving}
          >
            {saving ? 'Salvando...' : existingPick ? 'Atualizar Palpite' : 'Salvar Palpite'}
          </button>
        )}
      </div>
    </div>
  )
}
