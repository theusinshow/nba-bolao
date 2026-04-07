// Seed data for 2025 NBA Playoffs — used to populate the DB and for testing scoring
// Run this from the admin panel or from the backend seed route

export const SERIES_SEED = [
  // === WEST R1 ===
  { slot: 'W-R1-1', round: 1, conference: 'West', home_team_id: 'OKC', away_team_id: 'MEM', winner_id: 'OKC', games_played: 4, is_complete: true },
  { slot: 'W-R1-2', round: 1, conference: 'West', home_team_id: 'GSW', away_team_id: 'HOU', winner_id: 'GSW', games_played: 5, is_complete: true },
  { slot: 'W-R1-3', round: 1, conference: 'West', home_team_id: 'DEN', away_team_id: 'LAC', winner_id: 'DEN', games_played: 7, is_complete: true },
  { slot: 'W-R1-4', round: 1, conference: 'West', home_team_id: 'MIN', away_team_id: 'LAL', winner_id: 'MIN', games_played: 6, is_complete: true },
  // === EAST R1 ===
  { slot: 'E-R1-1', round: 1, conference: 'East', home_team_id: 'CLE', away_team_id: 'ORL', winner_id: 'CLE', games_played: 5, is_complete: true },
  { slot: 'E-R1-2', round: 1, conference: 'East', home_team_id: 'BOS', away_team_id: 'MIA', winner_id: 'BOS', games_played: 5, is_complete: true },
  { slot: 'E-R1-3', round: 1, conference: 'East', home_team_id: 'NYK', away_team_id: 'DET', winner_id: 'NYK', games_played: 5, is_complete: true },
  { slot: 'E-R1-4', round: 1, conference: 'East', home_team_id: 'IND', away_team_id: 'MIL', winner_id: 'IND', games_played: 6, is_complete: true },
  // === WEST R2 ===
  { slot: 'W-R2-1', round: 2, conference: 'West', home_team_id: 'OKC', away_team_id: 'GSW', winner_id: 'OKC', games_played: 5, is_complete: true },
  { slot: 'W-R2-2', round: 2, conference: 'West', home_team_id: 'DEN', away_team_id: 'MIN', winner_id: 'DEN', games_played: null, is_complete: true },
  // === EAST R2 ===
  { slot: 'E-R2-1', round: 2, conference: 'East', home_team_id: 'CLE', away_team_id: 'BOS', winner_id: 'CLE', games_played: null, is_complete: true },
  { slot: 'E-R2-2', round: 2, conference: 'East', home_team_id: 'IND', away_team_id: 'NYK', winner_id: 'IND', games_played: 6, is_complete: true },
  // === CONF FINALS ===
  { slot: 'W-CF', round: 3, conference: 'West', home_team_id: 'OKC', away_team_id: 'DEN', winner_id: 'OKC', games_played: 5, is_complete: true },
  { slot: 'E-CF', round: 3, conference: 'East', home_team_id: 'IND', away_team_id: 'CLE', winner_id: 'IND', games_played: 7, is_complete: true },
  // === FINALS ===
  { slot: 'FINALS', round: 4, conference: null, home_team_id: 'OKC', away_team_id: 'IND', winner_id: 'OKC', games_played: 7, is_complete: true },
]

// Bracket connections: which slot feeds into which
export const BRACKET_FEEDS: Record<string, [string, string]> = {
  'W-R2-1': ['W-R1-1', 'W-R1-2'],
  'W-R2-2': ['W-R1-3', 'W-R1-4'],
  'W-CF':   ['W-R2-1', 'W-R2-2'],
  'E-R2-1': ['E-R1-1', 'E-R1-2'],
  'E-R2-2': ['E-R1-3', 'E-R1-4'],
  'E-CF':   ['E-R2-1', 'E-R2-2'],
  'FINALS': ['W-CF', 'E-CF'],
}
