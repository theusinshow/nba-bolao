export type Conference = 'West' | 'East'
export type RoundNumber = 1 | 2 | 3 | 4

export interface Team {
  id: string
  name: string
  abbreviation: string
  conference: Conference
  seed: number
  primary_color: string
}

export interface Series {
  id: string
  slot?: string | null
  round: RoundNumber
  conference: Conference | null
  position: number | null
  home_team_id: string | null
  away_team_id: string | null
  winner_id: string | null
  games_played: number
  is_complete: boolean
  nba_series_id: number | null
  tip_off_at?: string | null
  // joined from teams table
  home_team?: Team | null
  away_team?: Team | null
  winner?: Team | null
}

export interface Game {
  id: string
  series_id: string
  game_number: number
  home_team_id: string
  away_team_id: string
  winner_id: string | null
  home_score: number | null
  away_score: number | null
  played: boolean
  tip_off_at: string | null
  nba_game_id: number | null
  round?: RoundNumber
  team_a_id?: string
  team_b_id?: string
  score_a?: number | null
  score_b?: number | null
  balldontlie_id?: number | null
  team_a?: Team | null
  team_b?: Team | null
}

export interface Participant {
  id: string
  user_id: string
  name: string
  email: string
  is_admin: boolean
}

export interface SeriesPick {
  id: string
  participant_id: string
  series_id: string
  winner_id: string
  games_count: number
  points?: number
}

export interface GamePick {
  id: string
  participant_id: string
  game_id: string
  winner_id: string
  points?: number
}

export interface RankingEntry {
  participant_id: string
  participant_name: string
  total_points: number
  round1_points: number
  round2_points: number
  round3_points: number
  round4_points: number
  cravadas: number
  series_correct: number
  series_total: number
  games_correct: number
  games_total: number
  rank: number
  prev_rank: number | null
}

export interface ScoreBreakdownSummary {
  total_points: number
  series_points: number
  game_points: number
  round_points: [number, number, number, number]
  cravadas: number
  series_correct: number
  series_total: number
  games_correct: number
  games_total: number
}

export interface SeriesScoreBreakdownItem {
  id: string
  series_id: string
  event_date: string | null
  round: RoundNumber
  conference: 'East' | 'West' | 'Finals' | null
  position: number | null
  matchup_label: string
  picked_winner_id: string
  picked_winner_label: string
  actual_winner_id: string | null
  actual_winner_label: string | null
  picked_games_count: number
  actual_games_played: number
  status: 'cravada' | 'winner' | 'wrong' | 'pending'
  points: number
}

export interface GameScoreBreakdownItem {
  id: string
  game_id: string
  series_id: string
  event_date: string | null
  round: RoundNumber
  conference: 'East' | 'West' | 'Finals' | null
  game_number: number
  matchup_label: string
  picked_winner_id: string
  picked_winner_label: string
  actual_winner_id: string | null
  actual_winner_label: string | null
  status: 'correct' | 'wrong' | 'pending'
  points: number
  played: boolean
}

export interface ParticipantScoreBreakdown {
  participant: Participant
  summary: ScoreBreakdownSummary
  series_breakdown: SeriesScoreBreakdownItem[]
  game_breakdown: GameScoreBreakdownItem[]
}

// Bracket slot IDs
export type BracketSlot =
  | 'W1-1' | 'W1-2' | 'W1-3' | 'W1-4'
  | 'W2-1' | 'W2-2'
  | 'WCF'
  | 'E1-1' | 'E1-2' | 'E1-3' | 'E1-4'
  | 'E2-1' | 'E2-2'
  | 'ECF'
  | 'FIN'
