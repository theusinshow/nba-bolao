import axios from 'axios'

export interface InjuriesProviderStatus {
  provider: 'balldontlie-nba-injuries'
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

interface BDLInjuryPlayer {
  id: number
  first_name?: string | null
  last_name?: string | null
  position?: string | null
  team_id?: number | null
}

interface BDLInjuryItem {
  player?: BDLInjuryPlayer | null
  return_date?: string | null
  description?: string | null
  status?: string | null
}

interface BDLInjuriesResponse {
  data: BDLInjuryItem[]
  meta?: {
    next_cursor?: number | null
    per_page?: number
  }
}

interface RankedInjuryItem extends AnalysisInjuryItem {
  is_key_player: boolean
  key_rank: number | null
  severity: number
}

const ballDontLieApi = axios.create({
  baseURL: 'https://api.balldontlie.io/v1',
  timeout: 10000,
})

const TEAM_ABBREVIATION_BY_ID: Record<number, string> = {
  1: 'ATL',
  2: 'BOS',
  3: 'BKN',
  4: 'CHA',
  5: 'CHI',
  6: 'CLE',
  7: 'DAL',
  8: 'DEN',
  9: 'DET',
  10: 'GSW',
  11: 'HOU',
  12: 'IND',
  13: 'LAC',
  14: 'LAL',
  15: 'MEM',
  16: 'MIA',
  17: 'MIL',
  18: 'MIN',
  19: 'NOP',
  20: 'NYK',
  21: 'OKC',
  22: 'ORL',
  23: 'PHI',
  24: 'PHX',
  25: 'POR',
  26: 'SAC',
  27: 'SAS',
  28: 'TOR',
  29: 'UTA',
  30: 'WAS',
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

const RELEVANT_STATUSES = ['Out', 'Questionable', 'Doubtful'] as const
const EXCLUDED_REASON_PATTERNS = ['g league', 'two-way', 'two way', 'not with team']
const IMPACT_ORDER = { high: 0, medium: 1, low: 2 }

function getBallDontLieApiKey(): string | null {
  const apiKey = process.env.BALLDONTLIE_API_KEY?.trim()
  return apiKey ? apiKey : null
}

function normalizeWhitespace(value?: string | null) {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  return normalized ? normalized : null
}

function inferStatus(rawStatus?: string | null, description?: string | null): string | null {
  const normalizedStatus = normalizeWhitespace(rawStatus)?.toLowerCase()
  const normalizedDescription = normalizeWhitespace(description)?.toLowerCase()
  const haystack = `${normalizedStatus ?? ''} ${normalizedDescription ?? ''}`.trim()

  if (!haystack) return null
  if (haystack.includes('questionable')) return 'Questionable'
  if (haystack.includes('doubtful')) return 'Doubtful'
  if (haystack.includes(' out') || haystack.startsWith('out') || haystack.includes(' listed as out')) return 'Out'
  return null
}

function isRelevantStatus(status: string): status is typeof RELEVANT_STATUSES[number] {
  return (RELEVANT_STATUSES as readonly string[]).includes(status)
}

function shouldExcludeDetail(detail: string | null) {
  if (!detail) return false
  const normalized = detail.toLowerCase()
  return EXCLUDED_REASON_PATTERNS.some((pattern) => normalized.includes(pattern))
}

function getTeamAbbreviation(teamId?: number | null) {
  if (!teamId) return null
  return TEAM_ABBREVIATION_BY_ID[teamId] ?? null
}

function getSeverity(status: string) {
  if (status === 'Out') return 0
  if (status === 'Doubtful') return 1
  if (status === 'Questionable') return 2
  return 9
}

function getPlayerName(player?: BDLInjuryPlayer | null) {
  const parts = [normalizeWhitespace(player?.first_name), normalizeWhitespace(player?.last_name)].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : null
}

function getKeyRank(team: string | null, playerName: string) {
  if (!team) return null
  const rank = (KEY_PLAYERS_BY_TEAM[team] ?? []).indexOf(playerName)
  return rank === -1 ? null : rank
}

function isKeyPlayer(team: string | null, playerName: string) {
  return getKeyRank(team, playerName) != null
}

function getImpact(status: string, keyRank: number | null): 'high' | 'medium' | 'low' {
  if (keyRank != null && keyRank <= 2) return 'high'
  if (status === 'Out' && keyRank != null) return 'high'
  if (status === 'Out') return 'medium'
  if (keyRank != null) return 'medium'
  return 'low'
}

function buildDetail(item: BDLInjuryItem) {
  const description = normalizeWhitespace(item.description)
  const returnDate = normalizeWhitespace(item.return_date)
  if (description && returnDate && !description.toLowerCase().includes(returnDate.toLowerCase())) {
    return `${description} - Return date: ${returnDate}`
  }
  return description ?? (returnDate ? `Return date: ${returnDate}` : null)
}

async function fetchAllInjuries(apiKey: string): Promise<BDLInjuryItem[]> {
  const allInjuries: BDLInjuryItem[] = []
  let cursor: number | null = null

  while (true) {
    const params: Record<string, unknown> = { per_page: 100 }
    if (cursor != null) params.cursor = cursor

    const { data } = await ballDontLieApi.get<BDLInjuriesResponse>('/player_injuries', {
      params,
      headers: {
        Authorization: apiKey,
      },
    })

    allInjuries.push(...(data.data ?? []))

    if (!data.meta?.next_cursor) break
    cursor = data.meta.next_cursor
  }

  return allInjuries
}

export async function fetchNBAInjuries(): Promise<{ status: InjuriesProviderStatus; injuries: AnalysisInjuryItem[] }> {
  const apiKey = getBallDontLieApiKey()
  if (!apiKey) {
    return {
      status: {
        provider: 'balldontlie-nba-injuries',
        configured: false,
        available: false,
        reason: 'BALLDONTLIE_API_KEY não configurada.',
      },
      injuries: [],
    }
  }

  try {
    const responseItems = await fetchAllInjuries(apiKey)

    const normalized = responseItems
      .map<RankedInjuryItem | null>((item) => {
        const playerName = getPlayerName(item.player)
        const team = getTeamAbbreviation(item.player?.team_id)
        const detail = buildDetail(item)
        const status = inferStatus(item.status, detail)

        if (!playerName || !status || !isRelevantStatus(status)) return null
        if (shouldExcludeDetail(detail)) return null

        const keyRank = getKeyRank(team, playerName)

        return {
          id: `${team ?? item.player?.team_id ?? 'NBA'}-${item.player?.id ?? playerName}`,
          player_name: playerName,
          team,
          status,
          detail,
          position: normalizeWhitespace(item.player?.position),
          impact: getImpact(status, keyRank),
          is_key_player: isKeyPlayer(team, playerName),
          key_rank: keyRank,
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
            if (a.impact !== b.impact) return IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact]
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
        provider: 'balldontlie-nba-injuries',
        configured: true,
        available: true,
      },
      injuries,
    }
  } catch (error: unknown) {
    const statusCode = axios.isAxiosError(error) ? error.response?.status : undefined
    const responseBody = axios.isAxiosError(error) ? error.response?.data : undefined
    const errorMessage = error instanceof Error ? error.message : String(error)

    console.error('[injuries] BallDontLie request failed', {
      statusCode,
      message: errorMessage,
      body: responseBody,
    })

    const reason = statusCode === 401
      ? 'Plano atual da Ball Don\'t Lie não tem acesso ao endpoint de player injuries.'
      : statusCode === 404
      ? 'Endpoint de player injuries não foi encontrado na Ball Don\'t Lie.'
      : statusCode === 429
      ? 'Limite do provedor Ball Don\'t Lie atingido para player injuries.'
      : 'Falha ao carregar lesões na Ball Don\'t Lie.'

    return {
      status: {
        provider: 'balldontlie-nba-injuries',
        configured: true,
        available: false,
        reason,
      },
      injuries: [],
    }
  }
}
