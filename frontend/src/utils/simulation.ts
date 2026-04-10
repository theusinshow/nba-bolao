import { TEAMS_2025, TEAM_MAP } from '../data/teams2025'
import type { Game, GamePick, Participant, Series, SeriesPick } from '../types'
import { buildRankingState } from './ranking'

export interface SimulationState {
  version: 1
  scenarioName: string
  createdAt: string
  revealedAt: string | null
  resultsRevealed: boolean
  series: Series[]
  games: Game[]
}

interface BaseSeriesTemplate {
  id: Series['id']
  round: Series['round']
  conference: Series['conference']
  position: number | null
  home_team_id: string | null
  away_team_id: string | null
}

const SERIES_TEMPLATE: BaseSeriesTemplate[] = [
  { id: 'W1-1', round: 1, conference: 'West', position: 1, home_team_id: 'OKC', away_team_id: 'MEM' },
  { id: 'W1-2', round: 1, conference: 'West', position: 2, home_team_id: 'HOU', away_team_id: 'LAL' },
  { id: 'W1-3', round: 1, conference: 'West', position: 3, home_team_id: 'DEN', away_team_id: 'LAC' },
  { id: 'W1-4', round: 1, conference: 'West', position: 4, home_team_id: 'MIN', away_team_id: 'GSW' },
  { id: 'E1-1', round: 1, conference: 'East', position: 1, home_team_id: 'CLE', away_team_id: 'ORL' },
  { id: 'E1-2', round: 1, conference: 'East', position: 2, home_team_id: 'BOS', away_team_id: 'MIA' },
  { id: 'E1-3', round: 1, conference: 'East', position: 3, home_team_id: 'NYK', away_team_id: 'DET' },
  { id: 'E1-4', round: 1, conference: 'East', position: 4, home_team_id: 'IND', away_team_id: 'MIL' },
  { id: 'W2-1', round: 2, conference: 'West', position: 1, home_team_id: null, away_team_id: null },
  { id: 'W2-2', round: 2, conference: 'West', position: 2, home_team_id: null, away_team_id: null },
  { id: 'E2-1', round: 2, conference: 'East', position: 1, home_team_id: null, away_team_id: null },
  { id: 'E2-2', round: 2, conference: 'East', position: 2, home_team_id: null, away_team_id: null },
  { id: 'WCF', round: 3, conference: 'West', position: 1, home_team_id: null, away_team_id: null },
  { id: 'ECF', round: 3, conference: 'East', position: 1, home_team_id: null, away_team_id: null },
  { id: 'FIN', round: 4, conference: null, position: 1, home_team_id: null, away_team_id: null },
]

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function buildSeries(): Series[] {
  return SERIES_TEMPLATE.map((item) => ({
    ...item,
    winner_id: null,
    games_played: 0,
    is_complete: false,
    nba_series_id: null,
    home_team: item.home_team_id ? TEAM_MAP[item.home_team_id] ?? null : null,
    away_team: item.away_team_id ? TEAM_MAP[item.away_team_id] ?? null : null,
    winner: null,
  }))
}

function buildGames(): Game[] {
  const start = new Date()
  start.setUTCDate(start.getUTCDate() + 1)
  start.setUTCHours(22, 0, 0, 0)

  const roundOneSeries = SERIES_TEMPLATE.filter((item) => item.round === 1)

  return roundOneSeries.flatMap((series, seriesIndex) => {
    const firstGame = new Date(start)
    firstGame.setUTCDate(start.getUTCDate() + seriesIndex)

    return [1, 2].map((gameNumber) => {
      const tipOff = new Date(firstGame)
      tipOff.setUTCHours(firstGame.getUTCHours() + (gameNumber - 1))

      return {
        id: `sim-${series.id}-g${gameNumber}`,
        series_id: series.id,
        game_number: gameNumber,
        home_team_id: series.home_team_id!,
        away_team_id: series.away_team_id!,
        winner_id: null,
        home_score: null,
        away_score: null,
        played: false,
        tip_off_at: tipOff.toISOString(),
        nba_game_id: null,
        round: 1,
      }
    })
  })
}

export function createSimulationState(): SimulationState {
  return {
    version: 1,
    scenarioName: 'Primeira rodada fictícia dos playoffs',
    createdAt: new Date().toISOString(),
    revealedAt: null,
    resultsRevealed: false,
    series: buildSeries(),
    games: buildGames(),
  }
}

export function revealSimulationResults(state: SimulationState): SimulationState {
  if (state.resultsRevealed) return state

  const series = state.series.map((item) => {
    if (item.round !== 1 || !item.home_team_id || !item.away_team_id) return item

    const winnerId = pickRandom([item.home_team_id, item.away_team_id])
    const gamesPlayed = pickRandom([4, 5, 6, 7])

    return {
      ...item,
      winner_id: winnerId,
      games_played: gamesPlayed,
      is_complete: true,
      winner: TEAM_MAP[winnerId] ?? null,
    }
  })

  const games = state.games.map((game) => {
    const homeWon = Math.random() >= 0.5
    const winningScore = 100 + Math.floor(Math.random() * 21)
    const losingScore = winningScore - (4 + Math.floor(Math.random() * 12))

    return {
      ...game,
      winner_id: homeWon ? game.home_team_id : game.away_team_id,
      home_score: homeWon ? winningScore : losingScore,
      away_score: homeWon ? losingScore : winningScore,
      played: true,
    }
  })

  return {
    ...state,
    series,
    games,
    resultsRevealed: true,
    revealedAt: new Date().toISOString(),
  }
}

export function buildSimulationRanking(
  state: SimulationState,
  participants: Participant[],
  seriesPicks: SeriesPick[],
  gamePicks: GamePick[]
) {
  return buildRankingState({
    participants,
    series: state.series,
    games: state.games,
    seriesPicks,
    gamePicks,
    teams: TEAMS_2025,
  })
}
