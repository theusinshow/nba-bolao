import axios from 'axios'
import { BRT_TIMEZONE } from './constants'

export interface InjuriesProviderStatus {
  provider: 'rapidapi-nba-injuries'
  configured: boolean
  available: boolean
  reason?: string
}

export interface AnalysisInjuryItem {
  id: string
  player_name: string
  team: string | null
  status: string
  detail: string | null
  position: string | null
  impact: 'high' | 'medium' | 'low'
}

interface RapidApiInjuryItem {
  date?: string
  team?: string | null
  player?: string | null
  status?: string | null
  reason?: string | null
  reportTime?: string | null
}

interface RankedInjuryItem extends AnalysisInjuryItem {
  is_key_player: boolean
  key_rank: number | null
  impact: 'high' | 'medium' | 'low'
  severity: number
}

const rapidApiInjuries = axios.create({
  baseURL: 'https://nba-injuries-reports.p.rapidapi.com',
  timeout: 10000,
})

const TEAM_ABBREVIATION_BY_NAME: Record<string, string> = {
  'Atlanta Hawks': 'ATL',
  'Boston Celtics': 'BOS',
  'Brooklyn Nets': 'BKN',
  'Charlotte Hornets': 'CHA',
  'Chicago Bulls': 'CHI',
  'Cleveland Cavaliers': 'CLE',
  'Dallas Mavericks': 'DAL',
  'Denver Nuggets': 'DEN',
  'Detroit Pistons': 'DET',
  'Golden State Warriors': 'GSW',
  'Houston Rockets': 'HOU',
  'Indiana Pacers': 'IND',
  'LA Clippers': 'LAC',
  'Los Angeles Clippers': 'LAC',
  'Los Angeles Lakers': 'LAL',
  'Memphis Grizzlies': 'MEM',
  'Miami Heat': 'MIA',
  'Milwaukee Bucks': 'MIL',
  'Minnesota Timberwolves': 'MIN',
  'New Orleans Pelicans': 'NOP',
  'New York Knicks': 'NYK',
  'Oklahoma City Thunder': 'OKC',
  'Orlando Magic': 'ORL',
  'Philadelphia 76ers': 'PHI',
  'Phoenix Suns': 'PHX',
  'Portland Trail Blazers': 'POR',
  'Sacramento Kings': 'SAC',
  'San Antonio Spurs': 'SAS',
  'Toronto Raptors': 'TOR',
  'Utah Jazz': 'UTA',
  'Washington Wizards': 'WAS',
}

const KEY_PLAYERS_BY_TEAM: Record<string, string[]> = {
  ATL: ['Trae Young', 'Jalen Johnson', 'Dyson Daniels', 'Onyeka Okongwu', 'Zaccharie Risacher'],
  BOS: ['Jayson Tatum', 'Jaylen Brown', 'Kristaps Porzingis', 'Derrick White', 'Jrue Holiday', 'Al Horford'],
  CLE: ['Donovan Mitchell', 'Evan Mobley', 'Darius Garland', 'Jarrett Allen', 'Max Strus', 'DeAndre Hunter'],
  DEN: ['Nikola Jokic', 'Jamal Murray', 'Aaron Gordon', 'Michael Porter Jr.', 'Christian Braun'],
  DET: ['Cade Cunningham', 'Jalen Duren', 'Ausar Thompson', 'Tobias Harris', 'Malik Beasley'],
  GSW: ['Stephen Curry', 'Jimmy Butler', 'Draymond Green', 'Brandin Podziemski', 'Jonathan Kuminga'],
  HOU: ['Alperen Sengun', 'Amen Thompson', 'Jalen Green', 'Fred VanVleet', 'Jabari Smith Jr.', 'Dillon Brooks'],
  IND: ['Tyrese Haliburton', 'Pascal Siakam', 'Myles Turner', 'Andrew Nembhard', 'Aaron Nesmith', 'Bennedict Mathurin'],
  LAC: ['Kawhi Leonard', 'James Harden', 'Ivica Zubac', 'Norman Powell', 'Kris Dunn'],
  LAL: ['Luka Doncic', 'LeBron James', 'Austin Reaves', 'Rui Hachimura', 'Dorian Finney-Smith', 'Jarred Vanderbilt'],
  MEM: ['Ja Morant', 'Jaren Jackson Jr.', 'Desmond Bane', 'Zach Edey', 'Brandon Clarke'],
  MIA: ['Bam Adebayo', 'Tyler Herro', 'Andrew Wiggins', 'Terry Rozier', 'Kel\'el Ware'],
  MIL: ['Giannis Antetokounmpo', 'Damian Lillard', 'Khris Middleton', 'Brook Lopez', 'Bobby Portis'],
  MIN: ['Anthony Edwards', 'Julius Randle', 'Rudy Gobert', 'Jaden McDaniels', 'Naz Reid', 'Mike Conley'],
  NOP: ['Zion Williamson', 'Dejounte Murray', 'Trey Murphy III', 'CJ McCollum', 'Herb Jones', 'Jose Alvarado'],
  NYK: ['Jalen Brunson', 'Karl-Anthony Towns', 'OG Anunoby', 'Mikal Bridges', 'Josh Hart', 'Mitchell Robinson'],
  OKC: ['Shai Gilgeous-Alexander', 'Jalen Williams', 'Chet Holmgren', 'Isaiah Hartenstein', 'Alex Caruso', 'Lu Dort'],
  ORL: ['Paolo Banchero', 'Franz Wagner', 'Jalen Suggs', 'Wendell Carter Jr.', 'Kentavious Caldwell-Pope'],
  PHI: ['Joel Embiid', 'Tyrese Maxey', 'Paul George', 'Kelly Oubre Jr.', 'Jared McCain'],
  TOR: ['Scottie Barnes', 'RJ Barrett', 'Immanuel Quickley', 'Jakob Poeltl', 'Gradey Dick'],
}

const RELEVANT_STATUSES = new Set(['Out', 'Questionable', 'Doubtful'])
const EXCLUDED_REASON_PATTERNS = [
  'g league',
  'two-way',
  'two way',
  'not with team',
]

function getRapidApiKey(): string | null {
  const apiKey = process.env.RAPIDAPI_NBA_INJURIES_KEY?.trim()
  return apiKey ? apiKey : null
}

function getTodayBrtIsoDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

function normalizeStatus(value?: string | null): string | null {
  const normalized = value?.trim()
  if (!normalized) return null
  if (!RELEVANT_STATUSES.has(normalized)) return null
  return normalized
}

function normalizeReason(value?: string | null): string | null {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  return normalized ? normalized : null
}

function shouldExcludeReason(reason: string | null) {
  if (!reason) return false
  const normalized = reason.toLowerCase()
  return EXCLUDED_REASON_PATTERNS.some((pattern) => normalized.includes(pattern))
}

function getTeamAbbreviation(teamName?: string | null) {
  if (!teamName) return null
  return TEAM_ABBREVIATION_BY_NAME[teamName.trim()] ?? null
}

function getSeverity(status: string) {
  if (status === 'Out') return 0
  if (status === 'Doubtful') return 1
  if (status === 'Questionable') return 2
  return 9
}

function isKeyPlayer(team: string | null, playerName: string) {
  if (!team) return false
  return (KEY_PLAYERS_BY_TEAM[team] ?? []).includes(playerName)
}

function getKeyRank(team: string | null, playerName: string) {
  if (!team) return null
  const rank = (KEY_PLAYERS_BY_TEAM[team] ?? []).indexOf(playerName)
  return rank === -1 ? null : rank
}

function getImpact(status: string, keyRank: number | null): 'high' | 'medium' | 'low' {
  if (keyRank != null && keyRank <= 2) return 'high'
  if (status === 'Out' && keyRank != null) return 'high'
  if (status === 'Out') return 'medium'
  if (keyRank != null) return 'medium'
  return 'low'
}

function buildDetail(item: RapidApiInjuryItem) {
  const parts = [normalizeReason(item.reason), item.reportTime?.trim()].filter(Boolean)
  return parts.length > 0 ? parts.join(' - ') : null
}

export async function fetchNBAInjuries(): Promise<{ status: InjuriesProviderStatus; injuries: AnalysisInjuryItem[] }> {
  const apiKey = getRapidApiKey()
  if (!apiKey) {
    return {
      status: {
        provider: 'rapidapi-nba-injuries',
        configured: false,
        available: false,
        reason: 'RAPIDAPI_NBA_INJURIES_KEY não configurada.',
      },
      injuries: [],
    }
  }

  try {
    const targetDate = getTodayBrtIsoDate()
    const response = await rapidApiInjuries.get<RapidApiInjuryItem[]>(`/injuries/nba/${targetDate}`, {
      headers: {
        'x-rapidapi-host': 'nba-injuries-reports.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
    })

    const normalized = response.data
      .map<RankedInjuryItem | null>((item) => {
        const playerName = item.player?.trim()
        const status = normalizeStatus(item.status)
        const reason = normalizeReason(item.reason)
        const team = getTeamAbbreviation(item.team)

        if (!playerName || !status) return null
        if (shouldExcludeReason(reason)) return null

        return {
          id: `${team ?? item.team ?? 'NBA'}-${playerName}`,
          player_name: playerName,
          team,
          status,
          detail: buildDetail(item),
          position: null,
          impact: getImpact(status, getKeyRank(team, playerName)),
          is_key_player: isKeyPlayer(team, playerName),
          key_rank: getKeyRank(team, playerName),
          severity: getSeverity(status),
        }
      })
      .filter((item): item is RankedInjuryItem => item != null)

    const grouped = new Map<string, RankedInjuryItem[]>()

    for (const item of normalized) {
      const key = item.team ?? 'UNKNOWN'
      const current = grouped.get(key) ?? []
      current.push(item)
      grouped.set(key, current)
    }

    const injuries = Array.from(grouped.values())
      .flatMap((teamItems) =>
        teamItems
          .sort((a, b) => {
            const rankA = a.key_rank ?? 999
            const rankB = b.key_rank ?? 999
            if (rankA !== rankB) return rankA - rankB
            if (a.severity !== b.severity) return a.severity - b.severity
            if (a.impact !== b.impact) {
              const impactOrder = { high: 0, medium: 1, low: 2 }
              return impactOrder[a.impact] - impactOrder[b.impact]
            }
            return a.player_name.localeCompare(b.player_name, 'pt-BR')
          })
          .filter((item, index, current) => {
            const hasKeyPlayers = current.some((entry) => entry.is_key_player)
            if (item.is_key_player) return true
            if (hasKeyPlayers) return item.status === 'Out' && index < 2
            return item.status === 'Out' ? index < 2 : index < 1
          })
          .map(({ is_key_player: _isKeyPlayer, key_rank: _keyRank, severity: _severity, ...item }) => item)
      )
      .sort((a, b) => {
        const severityDiff = getSeverity(a.status) - getSeverity(b.status)
        if (severityDiff !== 0) return severityDiff
        if ((a.team ?? '') !== (b.team ?? '')) return (a.team ?? '').localeCompare(b.team ?? '', 'pt-BR')
        return a.player_name.localeCompare(b.player_name, 'pt-BR')
      })

    return {
      status: {
        provider: 'rapidapi-nba-injuries',
        configured: true,
        available: true,
      },
      injuries,
    }
  } catch (error: unknown) {
    const statusCode = axios.isAxiosError(error) ? error.response?.status : undefined
    const reason = statusCode === 401
      ? 'RapidAPI rejeitou a chave atual de injuries.'
      : statusCode === 403
      ? 'Plano atual da RapidAPI não tem acesso ao endpoint de injuries.'
      : statusCode === 404
      ? 'Endpoint de injuries não foi encontrado na RapidAPI.'
      : 'Falha ao carregar lesões na RapidAPI.'

    return {
      status: {
        provider: 'rapidapi-nba-injuries',
        configured: true,
        available: false,
        reason,
      },
      injuries: [],
    }
  }
}
