// Seed data for 2025 NBA Playoffs
export const SERIES_SEED = [
  // === WEST R1 ===
  { slot: 'W-R1-1', round: 1, conference: 'West', team_a_id: 'OKC', team_b_id: 'MEM', winner_id: 'OKC', games_played: 4, is_complete: true },
  { slot: 'W-R1-2', round: 1, conference: 'West', team_a_id: 'GSW', team_b_id: 'HOU', winner_id: 'GSW', games_played: 5, is_complete: true },
  { slot: 'W-R1-3', round: 1, conference: 'West', team_a_id: 'DEN', team_b_id: 'LAC', winner_id: 'DEN', games_played: 7, is_complete: true },
  { slot: 'W-R1-4', round: 1, conference: 'West', team_a_id: 'MIN', team_b_id: 'LAL', winner_id: 'MIN', games_played: 6, is_complete: true },
  // === EAST R1 ===
  { slot: 'E-R1-1', round: 1, conference: 'East', team_a_id: 'CLE', team_b_id: 'ORL', winner_id: 'CLE', games_played: 5, is_complete: true },
  { slot: 'E-R1-2', round: 1, conference: 'East', team_a_id: 'BOS', team_b_id: 'MIA', winner_id: 'BOS', games_played: 5, is_complete: true },
  { slot: 'E-R1-3', round: 1, conference: 'East', team_a_id: 'NYK', team_b_id: 'DET', winner_id: 'NYK', games_played: 5, is_complete: true },
  { slot: 'E-R1-4', round: 1, conference: 'East', team_a_id: 'IND', team_b_id: 'MIL', winner_id: 'IND', games_played: 6, is_complete: true },
  // === WEST R2 ===
  { slot: 'W-R2-1', round: 2, conference: 'West', team_a_id: 'OKC', team_b_id: 'GSW', winner_id: 'OKC', games_played: 5, is_complete: true },
  { slot: 'W-R2-2', round: 2, conference: 'West', team_a_id: 'DEN', team_b_id: 'MIN', winner_id: 'DEN', games_played: 5, is_complete: true },
  // === EAST R2 ===
  { slot: 'E-R2-1', round: 2, conference: 'East', team_a_id: 'CLE', team_b_id: 'BOS', winner_id: 'CLE', games_played: 5, is_complete: true },
  { slot: 'E-R2-2', round: 2, conference: 'East', team_a_id: 'IND', team_b_id: 'NYK', winner_id: 'IND', games_played: 6, is_complete: true },
  // === CONF FINALS ===
  { slot: 'W-CF', round: 3, conference: 'West', team_a_id: 'OKC', team_b_id: 'DEN', winner_id: 'OKC', games_played: 5, is_complete: true },
  { slot: 'E-CF', round: 3, conference: 'East', team_a_id: 'IND', team_b_id: 'CLE', winner_id: 'IND', games_played: 7, is_complete: true },
  // === FINALS ===
  { slot: 'FINALS', round: 4, conference: null, team_a_id: 'OKC', team_b_id: 'IND', winner_id: 'OKC', games_played: 7, is_complete: true },
]
