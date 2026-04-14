import type { Team } from '../types'

export const TEAMS_2025: Team[] = [
  // ── WEST ──────────────────────────────────────────────────────────────────
  { id: 'OKC', name: 'Oklahoma City Thunder', abbreviation: 'OKC', conference: 'West', seed: 1,
    primary_color: '#007AC1', secondary_color: '#EF3B24' },   // Thunder Blue / Orange

  { id: 'HOU', name: 'Houston Rockets',       abbreviation: 'HOU', conference: 'West', seed: 2,
    primary_color: '#CE1141', secondary_color: '#000000' },   // Rocket Red / Black

  { id: 'GSW', name: 'Golden State Warriors', abbreviation: 'GSW', conference: 'West', seed: 3,
    primary_color: '#FFC72C', secondary_color: '#1D428A' },   // Warriors Gold / Royal Blue

  { id: 'DEN', name: 'Denver Nuggets',        abbreviation: 'DEN', conference: 'West', seed: 4,
    primary_color: '#236AB9', secondary_color: '#FEC524' },   // Midnight Navy (legível) / Nuggets Gold

  { id: 'LAC', name: 'LA Clippers',           abbreviation: 'LAC', conference: 'West', seed: 5,
    primary_color: '#C8102E', secondary_color: '#1D428A' },   // Clippers Red / Blue

  { id: 'LAL', name: 'Los Angeles Lakers',    abbreviation: 'LAL', conference: 'West', seed: 6,
    primary_color: '#FDB927', secondary_color: '#552583' },   // Lakers Gold / Purple

  { id: 'MIN', name: 'Minnesota Timberwolves',abbreviation: 'MIN', conference: 'West', seed: 7,
    primary_color: '#236192', secondary_color: '#78BE20' },   // Royal Blue / Aurora Green

  { id: 'MEM', name: 'Memphis Grizzlies',     abbreviation: 'MEM', conference: 'West', seed: 8,
    primary_color: '#5D76A9', secondary_color: '#F5B112' },   // Beale Street Blue / Gold

  // ── EAST ──────────────────────────────────────────────────────────────────
  { id: 'CLE', name: 'Cleveland Cavaliers',   abbreviation: 'CLE', conference: 'East', seed: 1,
    primary_color: '#FDBB30', secondary_color: '#860038' },   // Cavaliers Gold / Wine

  { id: 'BOS', name: 'Boston Celtics',        abbreviation: 'BOS', conference: 'East', seed: 2,
    primary_color: '#007A33', secondary_color: '#BA9653' },   // Celtics Green / Gold

  { id: 'NYK', name: 'New York Knicks',       abbreviation: 'NYK', conference: 'East', seed: 3,
    primary_color: '#F58426', secondary_color: '#006BB6' },   // Knicks Orange / Blue

  { id: 'IND', name: 'Indiana Pacers',        abbreviation: 'IND', conference: 'East', seed: 4,
    primary_color: '#FDBB30', secondary_color: '#002D62' },   // Pacers Gold / Navy

  { id: 'MIL', name: 'Milwaukee Bucks',       abbreviation: 'MIL', conference: 'East', seed: 5,
    primary_color: '#00B04F', secondary_color: '#EEE1C6' },   // Good Land Green / Cream

  { id: 'DET', name: 'Detroit Pistons',       abbreviation: 'DET', conference: 'East', seed: 6,
    primary_color: '#C8102E', secondary_color: '#1D42BA' },   // Pistons Red / Blue

  { id: 'MIA', name: 'Miami Heat',            abbreviation: 'MIA', conference: 'East', seed: 7,
    primary_color: '#F9A01B', secondary_color: '#98002E' },   // Heat Gold / Red

  { id: 'ORL', name: 'Orlando Magic',         abbreviation: 'ORL', conference: 'East', seed: 8,
    primary_color: '#0077C0', secondary_color: '#000000' },   // Magic Blue / Black
]

export const TEAM_MAP: Record<string, Team> = Object.fromEntries(
  TEAMS_2025.map((t) => [t.id, t])
)

export function getTeam(id: string | null): Team | undefined {
  if (!id) return undefined
  return TEAM_MAP[id]
}
