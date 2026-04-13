import axios from 'axios'

export interface OddsProviderStatus {
  provider: 'the-odds-api'
  configured: boolean
  available: boolean
  reason?: string
}

export interface AnalysisOddsItem {
  id: string
  home_team_name: string
  away_team_name: string
  commence_time: string
  bookmaker: string
  updated_at: string | null
  moneyline: {
    home: number | null
    away: number | null
  }
  spread: {
    home_line: number | null
    home_odds: number | null
    away_line: number | null
    away_odds: number | null
  }
  total: {
    points: number | null
    over_odds: number | null
    under_odds: number | null
  }
}

interface OddsOutcome {
  name: string
  price: number
  point?: number
}

interface OddsMarket {
  key: string
  outcomes: OddsOutcome[]
  last_update?: string
}

interface OddsBookmaker {
  key: string
  title: string
  last_update?: string
  markets: OddsMarket[]
}

interface OddsEvent {
  id: string
  home_team: string
  away_team: string
  commence_time: string
  bookmakers?: OddsBookmaker[]
}

const oddsApi = axios.create({
  baseURL: 'https://api.the-odds-api.com/v4',
})

const BOOKMAKER_PRIORITY = ['draftkings', 'fanduel', 'betmgm', 'bet365']

function getConfiguredOddsApiKey(): string | null {
  const apiKey = process.env.ODDS_API_KEY?.trim()
  return apiKey ? apiKey : null
}

function pickPreferredBookmaker(bookmakers: OddsBookmaker[] = []): OddsBookmaker | null {
  const sorted = [...bookmakers].sort((left, right) => {
    const leftRank = BOOKMAKER_PRIORITY.indexOf(left.key)
    const rightRank = BOOKMAKER_PRIORITY.indexOf(right.key)
    const normalizedLeft = leftRank === -1 ? Number.MAX_SAFE_INTEGER : leftRank
    const normalizedRight = rightRank === -1 ? Number.MAX_SAFE_INTEGER : rightRank
    return normalizedLeft - normalizedRight
  })

  return sorted[0] ?? null
}

function getMarket(bookmaker: OddsBookmaker | null, key: string): OddsMarket | null {
  return bookmaker?.markets.find((market) => market.key === key) ?? null
}

function getOutcome(market: OddsMarket | null, name: string): OddsOutcome | null {
  return market?.outcomes.find((outcome) => outcome.name === name) ?? null
}

function mapOddsEvent(event: OddsEvent): AnalysisOddsItem | null {
  const bookmaker = pickPreferredBookmaker(event.bookmakers)
  if (!bookmaker) return null

  const h2h = getMarket(bookmaker, 'h2h')
  const spreads = getMarket(bookmaker, 'spreads')
  const totals = getMarket(bookmaker, 'totals')

  const homeMoneyline = getOutcome(h2h, event.home_team)
  const awayMoneyline = getOutcome(h2h, event.away_team)
  const homeSpread = getOutcome(spreads, event.home_team)
  const awaySpread = getOutcome(spreads, event.away_team)
  const over = getOutcome(totals, 'Over')
  const under = getOutcome(totals, 'Under')

  return {
    id: event.id,
    home_team_name: event.home_team,
    away_team_name: event.away_team,
    commence_time: event.commence_time,
    bookmaker: bookmaker.title,
    updated_at: totals?.last_update ?? spreads?.last_update ?? h2h?.last_update ?? bookmaker.last_update ?? null,
    moneyline: {
      home: homeMoneyline?.price ?? null,
      away: awayMoneyline?.price ?? null,
    },
    spread: {
      home_line: homeSpread?.point ?? null,
      home_odds: homeSpread?.price ?? null,
      away_line: awaySpread?.point ?? null,
      away_odds: awaySpread?.price ?? null,
    },
    total: {
      points: over?.point ?? under?.point ?? null,
      over_odds: over?.price ?? null,
      under_odds: under?.price ?? null,
    },
  }
}

export async function fetchNBAGameOdds(): Promise<{ status: OddsProviderStatus; odds: AnalysisOddsItem[] }> {
  const apiKey = getConfiguredOddsApiKey()
  if (!apiKey) {
    return {
      status: {
        provider: 'the-odds-api',
        configured: false,
        available: false,
        reason: 'ODDS_API_KEY não configurada.',
      },
      odds: [],
    }
  }

  try {
    const response = await oddsApi.get<OddsEvent[]>('/sports/basketball_nba/odds', {
      params: {
        apiKey,
        regions: process.env.ODDS_API_REGIONS ?? 'us',
        markets: process.env.ODDS_API_MARKETS ?? 'h2h,spreads,totals',
        oddsFormat: 'american',
      },
    })

    return {
      status: {
        provider: 'the-odds-api',
        configured: true,
        available: true,
      },
      odds: response.data.map(mapOddsEvent).filter((item): item is AnalysisOddsItem => item != null),
    }
  } catch (error: unknown) {
    const statusCode = axios.isAxiosError(error) ? error.response?.status : undefined
    const reason = statusCode === 401
      ? 'The Odds API rejeitou a chave atual.'
      : statusCode === 429
      ? 'The Odds API atingiu limite de requisições.'
      : 'Falha ao carregar odds na The Odds API.'

    return {
      status: {
        provider: 'the-odds-api',
        configured: true,
        available: false,
        reason,
      },
      odds: [],
    }
  }
}
