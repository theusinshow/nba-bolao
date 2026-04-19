import { supabase } from '../lib/supabase'
import { BADGE_IDS, type BadgeId } from './definitions'

const BRT_TIMEZONE = 'America/Sao_Paulo'

function getBrtDateKey(iso: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: BRT_TIMEZONE,
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date(iso))
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

interface GameRow   { id: string; series_id: string; tip_off_at: string | null; played: boolean; winner_id: string | null }
interface SeriesRow { id: string; round: number; winner_id: string | null; games_played: number; is_complete: boolean }
interface GamePickRow   { participant_id: string; game_id: string; winner_id: string }
interface SeriesPickRow { participant_id: string; series_id: string; winner_id: string; games_count: number }

async function fetchData() {
  const [
    { data: participants },
    { data: games },
    { data: series },
    { data: gamePicks },
    { data: seriesPicks },
  ] = await Promise.all([
    supabase.from('participants').select('id'),
    supabase.from('games').select('id, series_id, tip_off_at, played, winner_id').order('tip_off_at', { ascending: true }),
    supabase.from('series').select('id, round, winner_id, games_played, is_complete'),
    supabase.from('game_picks').select('participant_id, game_id, winner_id'),
    supabase.from('series_picks').select('participant_id, series_id, winner_id, games_count'),
  ])
  if (!participants || !games || !series || !gamePicks || !seriesPicks) {
    throw new Error('[badges] Failed to load data')
  }
  return {
    participants: participants as { id: string }[],
    games: games as GameRow[],
    series: series as SeriesRow[],
    gamePicks: gamePicks as GamePickRow[],
    seriesPicks: seriesPicks as SeriesPickRow[],
  }
}

function computeBadges(
  participantId: string,
  data: Awaited<ReturnType<typeof fetchData>>
): Set<BadgeId> {
  const earned = new Set<BadgeId>()
  const { games, series, gamePicks, seriesPicks } = data

  const myGamePicks = gamePicks.filter((p) => p.participant_id === participantId)
  const mySeriesPicks = seriesPicks.filter((p) => p.participant_id === participantId)

  const playedGames = games.filter((g) => g.played && g.winner_id)
  const completeSeries = series.filter((s) => s.is_complete && s.winner_id)

  // ── prophet: primeira cravada ─────────────────────────────────────────────
  const hasCravada = mySeriesPicks.some((sp) => {
    const s = completeSeries.find((s) => s.id === sp.series_id)
    return s && sp.winner_id === s.winner_id && sp.games_count === s.games_played
  })
  if (hasCravada) earned.add('prophet')

  // ── legendary: 3+ cravadas na mesma rodada ────────────────────────────────
  const cravadasByRound: Record<number, number> = {}
  for (const sp of mySeriesPicks) {
    const s = completeSeries.find((s) => s.id === sp.series_id)
    if (s && sp.winner_id === s.winner_id && sp.games_count === s.games_played) {
      cravadasByRound[s.round] = (cravadasByRound[s.round] ?? 0) + 1
    }
  }
  if (Object.values(cravadasByRound).some((n) => n >= 3)) earned.add('legendary')

  // ── visionary: acertou o campeão (Finals = round 4) ───────────────────────
  const finals = completeSeries.find((s) => s.round === 4)
  if (finals) {
    const pick = mySeriesPicks.find((p) => p.series_id === finals.id)
    if (pick && pick.winner_id === finals.winner_id) earned.add('visionary')
  }

  // ── contrarian: acertou sendo minoria (≤40%) ─────────────────────────────
  for (const game of playedGames) {
    const myPick = myGamePicks.find((p) => p.game_id === game.id)
    if (!myPick || myPick.winner_id !== game.winner_id) continue
    const allPicks = gamePicks.filter((p) => p.game_id === game.id)
    if (allPicks.length < 3) continue
    const myVotes = allPicks.filter((p) => p.winner_id === myPick.winner_id).length
    if (myVotes / allPicks.length <= 0.4) {
      earned.add('contrarian')
      break
    }
  }

  // ── perfect_day: acertou todos os jogos do dia (≥2 jogos) ────────────────
  const gamesByDay = new Map<string, GameRow[]>()
  for (const game of playedGames) {
    if (!game.tip_off_at) continue
    const key = getBrtDateKey(game.tip_off_at)
    const existing = gamesByDay.get(key) ?? []
    existing.push(game)
    gamesByDay.set(key, existing)
  }
  for (const dayGames of gamesByDay.values()) {
    if (dayGames.length < 2) continue
    const allCorrect = dayGames.every((g) => {
      const pick = myGamePicks.find((p) => p.game_id === g.id)
      return pick && pick.winner_id === g.winner_id
    })
    if (allCorrect) { earned.add('perfect_day'); break }
  }

  // ── on_fire: 3 jogos certos consecutivos ─────────────────────────────────
  const orderedPlayed = playedGames.filter((g) => g.tip_off_at).sort(
    (a, b) => new Date(a.tip_off_at!).getTime() - new Date(b.tip_off_at!).getTime()
  )
  let streak = 0
  for (const game of orderedPlayed) {
    const pick = myGamePicks.find((p) => p.game_id === game.id)
    if (pick && pick.winner_id === game.winner_id) {
      streak++
      if (streak >= 3) { earned.add('on_fire'); break }
    } else {
      streak = pick ? 0 : streak // no pick doesn't break streak
    }
  }

  return earned
}

export async function computeAndSaveBadges(): Promise<{ awarded: number; participants: number }> {
  const data = await fetchData()

  const { data: existingBadges } = await supabase
    .from('participant_badges')
    .select('participant_id, badge_id')

  const alreadyEarned = new Set(
    (existingBadges ?? []).map((r: { participant_id: string; badge_id: string }) => `${r.participant_id}:${r.badge_id}`)
  )

  const toInsert: Array<{ participant_id: string; badge_id: BadgeId }> = []

  for (const { id: participantId } of data.participants) {
    const earned = computeBadges(participantId, data)
    for (const badgeId of BADGE_IDS) {
      if (earned.has(badgeId) && !alreadyEarned.has(`${participantId}:${badgeId}`)) {
        toInsert.push({ participant_id: participantId, badge_id: badgeId })
      }
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('participant_badges').insert(toInsert)
    if (error) throw new Error(`[badges] Insert failed: ${error.message}`)
  }

  console.log(`[badges] ${toInsert.length} new badge(s) awarded across ${data.participants.length} participants`)
  return { awarded: toInsert.length, participants: data.participants.length }
}
