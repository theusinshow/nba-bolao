// Seed data for 2025 NBA Playoffs
export const SERIES_SEED = [
  // === WEST R1 ===
  { id: 'W1-1', round: 1, conference: 'West', position: 1, home_team_id: 'OKC', away_team_id: 'MEM', winner_id: 'OKC', games_played: 4, is_complete: true, nba_series_id: null },
  { id: 'W1-2', round: 1, conference: 'West', position: 2, home_team_id: 'GSW', away_team_id: 'HOU', winner_id: 'GSW', games_played: 5, is_complete: true, nba_series_id: null },
  { id: 'W1-3', round: 1, conference: 'West', position: 3, home_team_id: 'DEN', away_team_id: 'LAC', winner_id: 'DEN', games_played: 7, is_complete: true, nba_series_id: null },
  { id: 'W1-4', round: 1, conference: 'West', position: 4, home_team_id: 'MIN', away_team_id: 'LAL', winner_id: 'MIN', games_played: 6, is_complete: true, nba_series_id: null },
  // === EAST R1 ===
  { id: 'E1-1', round: 1, conference: 'East', position: 1, home_team_id: 'CLE', away_team_id: 'ORL', winner_id: 'CLE', games_played: 5, is_complete: true, nba_series_id: null },
  { id: 'E1-2', round: 1, conference: 'East', position: 2, home_team_id: 'BOS', away_team_id: 'MIA', winner_id: 'BOS', games_played: 5, is_complete: true, nba_series_id: null },
  { id: 'E1-3', round: 1, conference: 'East', position: 3, home_team_id: 'NYK', away_team_id: 'DET', winner_id: 'NYK', games_played: 5, is_complete: true, nba_series_id: null },
  { id: 'E1-4', round: 1, conference: 'East', position: 4, home_team_id: 'IND', away_team_id: 'MIL', winner_id: 'IND', games_played: 6, is_complete: true, nba_series_id: null },
  // === WEST R2 ===
  { id: 'W2-1', round: 2, conference: 'West', position: 1, home_team_id: 'OKC', away_team_id: 'GSW', winner_id: 'OKC', games_played: 5, is_complete: true, nba_series_id: null },
  { id: 'W2-2', round: 2, conference: 'West', position: 2, home_team_id: 'DEN', away_team_id: 'MIN', winner_id: 'DEN', games_played: 5, is_complete: true, nba_series_id: null },
  // === EAST R2 ===
  { id: 'E2-1', round: 2, conference: 'East', position: 1, home_team_id: 'CLE', away_team_id: 'BOS', winner_id: 'CLE', games_played: 5, is_complete: true, nba_series_id: null },
  { id: 'E2-2', round: 2, conference: 'East', position: 2, home_team_id: 'IND', away_team_id: 'NYK', winner_id: 'IND', games_played: 6, is_complete: true, nba_series_id: null },
  // === CONF FINALS ===
  { id: 'WCF', round: 3, conference: 'West', position: 1, home_team_id: 'OKC', away_team_id: 'DEN', winner_id: 'OKC', games_played: 5, is_complete: true, nba_series_id: null },
  { id: 'ECF', round: 3, conference: 'East', position: 1, home_team_id: 'IND', away_team_id: 'CLE', winner_id: 'IND', games_played: 7, is_complete: true, nba_series_id: null },
  // === FINALS ===
  { id: 'FIN', round: 4, conference: null, position: 1, home_team_id: 'OKC', away_team_id: 'IND', winner_id: 'OKC', games_played: 7, is_complete: true, nba_series_id: null },
]
