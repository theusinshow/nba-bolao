export type Conference = 'West' | 'East'

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
  slot: string
  round: 1 | 2 | 3 | 4
  conference: Conference | null
  home_team_id: string | null
  away_team_id: string | null
  winner_id: string | null
  games_played: number
  is_complete: boolean
  tip_off_at: string | null
  // joined from teams table
  home_team?: Team | null
  away_team?: Team | null
  winner?: Team | null
}

export interface Game {
  id: string
  series_id: string
  game_number: number
  round: 1 | 2 | 3 | 4
  team_a_id: string
  team_b_id: string
  winner_id: string | null
  home_team_id: string
  score_a: number | null
  score_b: number | null
  played: boolean
  tip_off_at: string | null
  balldontlie_id: number | null
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
  points: number
}

export interface GamePick {
  id: string
  participant_id: string
  game_id: string
  winner_id: string
  points: number
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

// Bracket slot IDs
export type BracketSlot =
  | 'W-R1-1' | 'W-R1-2' | 'W-R1-3' | 'W-R1-4'
  | 'W-R2-1' | 'W-R2-2'
  | 'W-CF'
  | 'E-R1-1' | 'E-R1-2' | 'E-R1-3' | 'E-R1-4'
  | 'E-R2-1' | 'E-R2-2'
  | 'E-CF'
  | 'FINALS'
