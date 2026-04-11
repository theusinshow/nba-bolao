import type {
  Game,
  GamePick,
  GameScoreBreakdownItem,
  Participant,
  ParticipantScoreBreakdown,
  RankingEntry,
  Series,
  SeriesScoreBreakdownItem,
  SeriesPick,
  Team,
} from '../types'
import { normalizeGame } from './bracket'
import { calculateGamePickPoints, calculateSeriesPickPoints } from './scoring'

export function compareRankingEntries(a: RankingEntry, b: RankingEntry): number {
  if (b.total_points !== a.total_points) {
    return b.total_points - a.total_points
  }

  return a.participant_name.localeCompare(b.participant_name, 'pt-BR', { sensitivity: 'base' })
}

function getTeamLabel(teamId: string | null | undefined, teamsById: Record<string, Team | undefined>): string | null {
  if (!teamId) return null
  return teamsById[teamId]?.abbreviation ?? teamId
}

function normalizeBreakdownConference(conference: string | null | undefined): 'East' | 'West' | 'Finals' | null {
  if (conference === 'East' || conference === 'West' || conference === 'Finals') return conference
  return null
}

function getMatchupLabel(series: Series, teamsById: Record<string, Team | undefined>): string {
  const home = getTeamLabel(series.home_team_id, teamsById) ?? '—'
  const away = getTeamLabel(series.away_team_id, teamsById) ?? '—'
  return `${home} vs ${away}`
}

function getSeriesEventDate(series: Series, games: Game[]): string | null {
  const seriesGames = games
    .filter((game) => game.series_id === series.id && !!game.tip_off_at)
    .sort((left, right) => new Date(left.tip_off_at!).getTime() - new Date(right.tip_off_at!).getTime())

  const playedGames = seriesGames.filter((game) => game.played)
  const latestPlayed = playedGames[playedGames.length - 1]
  if (latestPlayed?.tip_off_at) return latestPlayed.tip_off_at

  const latestScheduled = seriesGames[seriesGames.length - 1]
  if (latestScheduled?.tip_off_at) return latestScheduled.tip_off_at

  return series.tip_off_at ?? null
}

interface RankingComputationInput {
  participants: Participant[]
  series: Series[]
  games: Game[]
  seriesPicks: SeriesPick[]
  gamePicks: GamePick[]
  teams?: Team[]
  previousRanking?: RankingEntry[]
}

export function buildRankingState({
  participants,
  series,
  games,
  seriesPicks,
  gamePicks,
  teams = [],
  previousRanking = [],
}: RankingComputationInput): {
  ranking: RankingEntry[]
  breakdowns: Record<string, ParticipantScoreBreakdown>
} {
  const teamsById = Object.fromEntries(teams.map((team) => [team.id, team]))
  const seriesMap = Object.fromEntries(
    series.map((item) => [
      item.id,
      {
        ...item,
        home_team: item.home_team ?? teamsById[item.home_team_id ?? ''] ?? null,
        away_team: item.away_team ?? teamsById[item.away_team_id ?? ''] ?? null,
        winner: item.winner ?? teamsById[item.winner_id ?? ''] ?? null,
      },
    ])
  ) as Record<string, Series>

  const normalizedGames = games.map((game) => normalizeGame(game, seriesMap[game.series_id]?.round))
  const gameMap = Object.fromEntries(normalizedGames.map((game) => [game.id, game]))
  const breakdowns: Record<string, ParticipantScoreBreakdown> = {}

  for (const participant of participants) {
    const mySeriesPicks = seriesPicks.filter((pick) => pick.participant_id === participant.id)
    const myGamePicks = gamePicks.filter((pick) => pick.participant_id === participant.id)

    const roundPoints: [number, number, number, number] = [0, 0, 0, 0]
    let seriesPoints = 0
    let gamePoints = 0
    let cravadas = 0
    let seriesCorrect = 0
    let gamesCorrect = 0

    const seriesBreakdown = mySeriesPicks
      .map((pick) => {
        const currentSeries = seriesMap[pick.series_id]
        if (!currentSeries) return null

        const points = calculateSeriesPickPoints(
          { winnerId: pick.winner_id, gamesCount: pick.games_count },
          {
            winnerId: currentSeries.winner_id ?? undefined,
            gamesPlayed: currentSeries.games_played,
            isComplete: currentSeries.is_complete,
            round: currentSeries.round,
          }
        )

        const status: SeriesScoreBreakdownItem['status'] =
          !currentSeries.is_complete || !currentSeries.winner_id
            ? 'pending'
            : pick.winner_id !== currentSeries.winner_id
            ? 'wrong'
            : pick.games_count === currentSeries.games_played
            ? 'cravada'
            : 'winner'

        if (points > 0) {
          roundPoints[currentSeries.round - 1] += points
          seriesPoints += points
          seriesCorrect += 1
          if (status === 'cravada') cravadas += 1
        }

        return {
          id: pick.id,
          series_id: pick.series_id,
          event_date: getSeriesEventDate(currentSeries, normalizedGames),
          round: currentSeries.round,
          conference: currentSeries.round === 4 ? 'Finals' : normalizeBreakdownConference(currentSeries.conference),
          position: currentSeries.position,
          matchup_label: getMatchupLabel(currentSeries, teamsById),
          picked_winner_id: pick.winner_id,
          picked_winner_label: getTeamLabel(pick.winner_id, teamsById) ?? pick.winner_id,
          actual_winner_id: currentSeries.winner_id,
          actual_winner_label: getTeamLabel(currentSeries.winner_id, teamsById),
          picked_games_count: pick.games_count,
          actual_games_played: currentSeries.games_played,
          status,
          points,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((left, right) => {
        if (left.round !== right.round) return left.round - right.round
        return (left.position ?? 999) - (right.position ?? 999)
      })

    const gameBreakdown = myGamePicks
      .map((pick) => {
        const game = gameMap[pick.game_id]
        if (!game) return null
        const currentSeries = seriesMap[game.series_id]

        const points = calculateGamePickPoints(
          { winnerId: pick.winner_id },
          {
            winnerId: game.winner_id ?? undefined,
            played: game.played,
            round: game.round,
          }
        )

        const status: GameScoreBreakdownItem['status'] =
          !game.played || !game.winner_id ? 'pending' : pick.winner_id === game.winner_id ? 'correct' : 'wrong'
        if (points > 0) {
          roundPoints[game.round! - 1] += points
          gamePoints += points
          gamesCorrect += 1
        }

        return {
          id: pick.id,
          game_id: pick.game_id,
          series_id: game.series_id,
          event_date: game.tip_off_at,
          round: game.round!,
          conference: game.round === 4 ? 'Finals' : normalizeBreakdownConference(currentSeries?.conference),
          game_number: game.game_number,
          matchup_label: `${getTeamLabel(game.home_team_id, teamsById) ?? '—'} vs ${getTeamLabel(game.away_team_id, teamsById) ?? '—'}`,
          picked_winner_id: pick.winner_id,
          picked_winner_label: getTeamLabel(pick.winner_id, teamsById) ?? pick.winner_id,
          actual_winner_id: game.winner_id,
          actual_winner_label: getTeamLabel(game.winner_id, teamsById),
          status,
          points,
          played: game.played,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((left, right) => {
        if (left.round !== right.round) return left.round - right.round
        if (left.series_id !== right.series_id) return left.series_id.localeCompare(right.series_id)
        return left.game_number - right.game_number
      })

    breakdowns[participant.id] = {
      participant,
      summary: {
        total_points: seriesPoints + gamePoints,
        series_points: seriesPoints,
        game_points: gamePoints,
        round_points: roundPoints,
        cravadas,
        series_correct: seriesCorrect,
        series_total: mySeriesPicks.length,
        games_correct: gamesCorrect,
        games_total: myGamePicks.length,
      },
      series_breakdown: seriesBreakdown,
      game_breakdown: gameBreakdown,
    }
  }

  const previousByParticipant = Object.fromEntries(previousRanking.map((entry) => [entry.participant_id, entry]))

  const ranking = participants
    .map((participant) => {
      const breakdown = breakdowns[participant.id]
      return {
        participant_id: participant.id,
        participant_name: participant.name,
        total_points: breakdown.summary.total_points,
        round1_points: breakdown.summary.round_points[0],
        round2_points: breakdown.summary.round_points[1],
        round3_points: breakdown.summary.round_points[2],
        round4_points: breakdown.summary.round_points[3],
        cravadas: breakdown.summary.cravadas,
        series_correct: breakdown.summary.series_correct,
        series_total: breakdown.summary.series_total,
        games_correct: breakdown.summary.games_correct,
        games_total: breakdown.summary.games_total,
        rank: 0,
        prev_rank: previousByParticipant[participant.id]?.rank ?? null,
      }
    })
    .sort(compareRankingEntries)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))

  return { ranking, breakdowns }
}
