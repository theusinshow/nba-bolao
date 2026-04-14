import type { Team } from '../types'

export const TEAMS_2025: Team[] = [
  { id: 'OKC', name: 'Oklahoma City Thunder', abbreviation: 'OKC', conference: 'West', seed: 1, primary_color: '#007AC1' },
  { id: 'HOU', name: 'Houston Rockets', abbreviation: 'HOU', conference: 'West', seed: 2, primary_color: '#CE1141' },
  { id: 'GSW', name: 'Golden State Warriors', abbreviation: 'GSW', conference: 'West', seed: 3, primary_color: '#1D428A' },
  { id: 'DEN', name: 'Denver Nuggets', abbreviation: 'DEN', conference: 'West', seed: 4, primary_color: '#FFC627' },
  { id: 'LAC', name: 'LA Clippers', abbreviation: 'LAC', conference: 'West', seed: 5, primary_color: '#C8102E' },
  { id: 'LAL', name: 'Los Angeles Lakers', abbreviation: 'LAL', conference: 'West', seed: 6, primary_color: '#552583' },
  { id: 'MIN', name: 'Minnesota Timberwolves', abbreviation: 'MIN', conference: 'West', seed: 7, primary_color: '#78BE20' },
  { id: 'MEM', name: 'Memphis Grizzlies', abbreviation: 'MEM', conference: 'West', seed: 8, primary_color: '#5D76A9' },
  { id: 'CLE', name: 'Cleveland Cavaliers', abbreviation: 'CLE', conference: 'East', seed: 1, primary_color: '#860038' },
  { id: 'BOS', name: 'Boston Celtics', abbreviation: 'BOS', conference: 'East', seed: 2, primary_color: '#007A33' },
  { id: 'NYK', name: 'New York Knicks', abbreviation: 'NYK', conference: 'East', seed: 3, primary_color: '#F58426' },
  { id: 'IND', name: 'Indiana Pacers', abbreviation: 'IND', conference: 'East', seed: 4, primary_color: '#FDBB30' },
  { id: 'MIL', name: 'Milwaukee Bucks', abbreviation: 'MIL', conference: 'East', seed: 5, primary_color: '#00B04F' },
  { id: 'DET', name: 'Detroit Pistons', abbreviation: 'DET', conference: 'East', seed: 6, primary_color: '#C8102E' },
  { id: 'MIA', name: 'Miami Heat', abbreviation: 'MIA', conference: 'East', seed: 7, primary_color: '#98002E' },
  { id: 'ORL', name: 'Orlando Magic', abbreviation: 'ORL', conference: 'East', seed: 8, primary_color: '#0077C0' },
]

export const TEAM_MAP: Record<string, Team> = Object.fromEntries(
  TEAMS_2025.map((t) => [t.id, t])
)

export function getTeam(id: string | null): Team | undefined {
  if (!id) return undefined
  return TEAM_MAP[id]
}
