import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Game, GamePick, Team } from '../types'
import { CountdownTimer } from '../components/CountdownTimer'

interface GameWithTeams extends Game {
  team_a?: Team | null
  team_b?: Team | null
}

interface Props {
  participantId: string
}

function dateKeyBrasilia(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

function formatDateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Sao_Paulo',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

export function Games({ participantId }: Props) {
  const [games, setGames] = useState<GameWithTeams[]>([])
  const [picks, setPicks] = useState<GamePick[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (games.length > 0) fetchPicks()
  }, [games, participantId])

  async function fetchAll() {
    setLoading(true)
    const [{ data: gamesData }, { data: teamsData }] = await Promise.all([
      supabase.from('games').select('*').order('tip_off_at', { ascending: true }),
      supabase.from('teams').select('*'),
    ])
    const teamMap = Object.fromEntries((teamsData ?? []).map((t) => [t.id, t]))
    const merged = (gamesData ?? []).map((g) => ({
      ...g,
      team_a: teamMap[g.team_a_id] ?? null,
      team_b: teamMap[g.team_b_id] ?? null,
    }))
    setGames(merged as GameWithTeams[])
    setLoading(false)
  }

  async function fetchPicks() {
    if (!participantId || games.length === 0) return
    const gameIds = games.map((g) => g.id)
    const { data } = await supabase
      .from('game_picks')
      .select('*')
      .eq('participant_id', participantId)
      .in('game_id', gameIds)
    if (data) setPicks(data as GamePick[])
  }

  async function savePick(gameId: string, winnerId: string) {
    const game = games.find((g) => g.id === gameId)
    if (!game?.tip_off_at || new Date(game.tip_off_at) <= new Date()) return

    const existing = picks.find((p) => p.game_id === gameId)
    if (existing) {
      const { data } = await supabase
        .from('game_picks')
        .update({ winner_id: winnerId })
        .eq('id', existing.id)
        .select()
        .single()
      if (data) setPicks((prev) => prev.map((p) => (p.id === existing.id ? (data as GamePick) : p)))
    } else {
      const { data } = await supabase
        .from('game_picks')
        .insert({ participant_id: participantId, game_id: gameId, winner_id: winnerId })
        .select()
        .single()
      if (data) setPicks((prev) => [...prev, data as GamePick])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-nba-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-4">
        <p className="font-title text-4xl text-nba-gold tracking-widest">JOGOS</p>
        <p className="text-nba-muted text-sm">
          Os jogos serão exibidos quando os playoffs começarem (18 de abril)
        </p>
      </div>
    )
  }

  // Group games by date in Brasília timezone
  const grouped = new Map<string, { label: string; games: GameWithTeams[] }>()
  for (const g of games) {
    if (!g.tip_off_at) continue
    const key = dateKeyBrasilia(g.tip_off_at)
    if (!grouped.has(key)) {
      grouped.set(key, { label: formatDateLabel(g.tip_off_at), games: [] })
    }
    grouped.get(key)!.games.push(g)
  }

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      <h1 className="font-title text-3xl text-nba-gold tracking-widest mb-6">JOGOS</h1>

      {[...grouped.entries()].map(([key, { label, games: dayGames }]) => (
        <div key={key} className="mb-8">
          <h2
            className="font-condensed uppercase tracking-wider text-sm mb-3 capitalize"
            style={{ color: 'var(--nba-text-muted)' }}
          >
            {label}
          </h2>
          <div className="flex flex-col gap-3">
            {dayGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                pick={picks.find((p) => p.game_id === game.id)}
                onPick={savePick}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

interface CardProps {
  game: GameWithTeams
  pick: GamePick | undefined
  onPick: (gameId: string, winnerId: string) => void
}

function GameCard({ game, pick, onPick }: CardProps) {
  const locked = game.tip_off_at ? new Date(game.tip_off_at) <= new Date() : true
  const tA = game.team_a
  const tB = game.team_b

  function selectedBorder(teamId: string): string {
    if (!pick || pick.winner_id !== teamId) return '2px solid transparent'
    if (game.played && game.winner_id) {
      return game.winner_id === teamId
        ? '2px solid var(--nba-success)'
        : '2px solid var(--nba-danger)'
    }
    return '2px solid var(--nba-gold)'
  }

  function selectedBg(teamId: string): string {
    if (!pick || pick.winner_id !== teamId) return 'transparent'
    return 'var(--nba-surface-2)'
  }

  return (
    <div
      style={{
        background: 'var(--nba-surface)',
        border: '1px solid var(--nba-border)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {/* Teams row */}
      <div className="flex items-stretch min-h-[80px]">
        {/* Team A */}
        <button
          disabled={locked}
          onClick={() => onPick(game.id, game.team_a_id)}
          style={{
            flex: 1,
            background: selectedBg(game.team_a_id),
            border: selectedBorder(game.team_a_id),
            borderRadius: '6px 0 0 0',
            cursor: locked ? 'default' : 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          className="flex flex-col items-center justify-center py-4 gap-1"
        >
          <span
            className="font-condensed text-2xl font-bold"
            style={{ color: tA?.primary_color ?? 'var(--nba-text)' }}
          >
            {tA?.abbreviation ?? '?'}
          </span>
          <span className="text-xs" style={{ color: 'var(--nba-text-muted)' }}>
            {tA?.name ?? '—'}
          </span>
        </button>

        {/* Center divider */}
        <div
          className="flex flex-col items-center justify-center px-3 gap-1 shrink-0"
          style={{ borderLeft: '1px solid var(--nba-border)', borderRight: '1px solid var(--nba-border)' }}
        >
          <span className="font-title text-nba-muted text-lg leading-none">×</span>
          {game.tip_off_at && (
            <span className="font-condensed text-xs" style={{ color: 'var(--nba-text-muted)' }}>
              {formatTime(game.tip_off_at)}
            </span>
          )}
        </div>

        {/* Team B */}
        <button
          disabled={locked}
          onClick={() => onPick(game.id, game.team_b_id)}
          style={{
            flex: 1,
            background: selectedBg(game.team_b_id),
            border: selectedBorder(game.team_b_id),
            borderRadius: '0 6px 0 0',
            cursor: locked ? 'default' : 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          className="flex flex-col items-center justify-center py-4 gap-1"
        >
          <span
            className="font-condensed text-2xl font-bold"
            style={{ color: tB?.primary_color ?? 'var(--nba-text)' }}
          >
            {tB?.abbreviation ?? '?'}
          </span>
          <span className="text-xs" style={{ color: 'var(--nba-text-muted)' }}>
            {tB?.name ?? '—'}
          </span>
        </button>
      </div>

      {/* Bottom status bar */}
      <div
        className="flex items-center justify-center py-2 px-4"
        style={{ borderTop: '1px solid var(--nba-border)' }}
      >
        {locked ? (
          <span className="text-xs" style={{ color: 'var(--nba-text-muted)' }}>
            {game.played ? 'Encerrado' : 'Encerrado para palpites'}
          </span>
        ) : game.tip_off_at ? (
          <CountdownTimer targetDate={game.tip_off_at} label="Até o tip-off" />
        ) : null}
      </div>
    </div>
  )
}
