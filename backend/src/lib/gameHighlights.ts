import axios from 'axios'

export interface GameHighlightsProviderStatus {
  provider: 'balldontlie-game-player-stats'
  configured: boolean
  available: boolean
  reason?: string
}

export interface GameHighlightLeader {
  player_name: string
  team: string | null
  value: number
}

export interface GameHighlightItem {
  game_id: number
  headline: string | null
  best_line: string | null
  leaders: {
    points: GameHighlightLeader | null
    rebounds: GameHighlightLeader | null
    assists: GameHighlightLeader | null
  }
}

interface BDLStatResponse {
  data: BDLGameStat[]
  meta?: {
    next_cursor?: number | null
    per_page?: number
  }
}

interface BDLGameStat {
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  min?: string | null
  player?: {
    id: number
    first_name?: string | null
    last_name?: string | null
  } | null
  team?: {
    abbreviation?: string | null
  } | null
  game?: {
    id: number
  } | null
}

const ballDontLieApi = axios.create({
  baseURL: 'https://api.balldontlie.io/v1',
  timeout: 10000,
})

const HIGHLIGHTS_CACHE_TTL_MS = 10 * 60 * 1000
const highlightsCache = new Map<number, { expiresAt: number; value: GameHighlightItem }>()

function getBallDontLieApiKey(): string | null {
  const apiKey = process.env.BALLDONTLIE_API_KEY?.trim()
  return apiKey ? apiKey : null
}

function getPlayerName(stat: BDLGameStat) {
  const parts = [stat.player?.first_name?.trim(), stat.player?.last_name?.trim()].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : null
}

function formatBestLine(stat: BDLGameStat) {
  const parts = [`${stat.pts} pts`]
  if (stat.reb >= 5) parts.push(`${stat.reb} reb`)
  if (stat.ast >= 5) parts.push(`${stat.ast} ast`)
  if (stat.stl >= 2) parts.push(`${stat.stl} stl`)
  if (stat.blk >= 2) parts.push(`${stat.blk} blk`)
  return parts.join(' • ')
}

function buildHeadline(pointsLeader: BDLGameStat | undefined, reboundsLeader: BDLGameStat | undefined, assistsLeader: BDLGameStat | undefined) {
  if (pointsLeader) {
    const playerName = getPlayerName(pointsLeader)
    if (playerName && pointsLeader.pts >= 30) {
      return `${playerName} comandou com ${pointsLeader.pts} pts`
    }
  }

  if (assistsLeader) {
    const playerName = getPlayerName(assistsLeader)
    if (playerName && assistsLeader.ast >= 10) {
      return `${playerName} organizou tudo com ${assistsLeader.ast} assistências`
    }
  }

  if (reboundsLeader) {
    const playerName = getPlayerName(reboundsLeader)
    if (playerName && reboundsLeader.reb >= 12) {
      return `${playerName} dominou os rebotes com ${reboundsLeader.reb}`
    }
  }

  if (pointsLeader) {
    const playerName = getPlayerName(pointsLeader)
    if (playerName) {
      return `${playerName} foi o cestinha da partida`
    }
  }

  return null
}

function toLeader(stat: BDLGameStat | undefined): GameHighlightLeader | null {
  const playerName = stat ? getPlayerName(stat) : null
  if (!stat || !playerName) return null

  const value = Math.max(stat.pts, stat.reb, stat.ast)
  return {
    player_name: playerName,
    team: stat.team?.abbreviation?.trim() ?? null,
    value,
  }
}

function buildHighlight(gameId: number, stats: BDLGameStat[]): GameHighlightItem | null {
  if (stats.length === 0) return null

  const pointsLeader = [...stats].sort((a, b) => b.pts - a.pts || b.ast - a.ast || b.reb - a.reb)[0]
  const reboundsLeader = [...stats].sort((a, b) => b.reb - a.reb || b.pts - a.pts || b.ast - a.ast)[0]
  const assistsLeader = [...stats].sort((a, b) => b.ast - a.ast || b.pts - a.pts || b.reb - a.reb)[0]

  return {
    game_id: gameId,
    headline: buildHeadline(pointsLeader, reboundsLeader, assistsLeader),
    best_line: pointsLeader ? formatBestLine(pointsLeader) : null,
    leaders: {
      points: pointsLeader
        ? {
            player_name: getPlayerName(pointsLeader) ?? '—',
            team: pointsLeader.team?.abbreviation?.trim() ?? null,
            value: pointsLeader.pts,
          }
        : null,
      rebounds: reboundsLeader
        ? {
            player_name: getPlayerName(reboundsLeader) ?? '—',
            team: reboundsLeader.team?.abbreviation?.trim() ?? null,
            value: reboundsLeader.reb,
          }
        : null,
      assists: assistsLeader
        ? {
            player_name: getPlayerName(assistsLeader) ?? '—',
            team: assistsLeader.team?.abbreviation?.trim() ?? null,
            value: assistsLeader.ast,
          }
        : null,
    },
  }
}

async function fetchStatsForGameIds(apiKey: string, gameIds: number[]) {
  const allStats: BDLGameStat[] = []
  let cursor: number | null = null

  while (true) {
    const params: Record<string, unknown> = {
      per_page: 100,
      game_ids: gameIds,
    }

    if (cursor != null) params.cursor = cursor

    const { data } = await ballDontLieApi.get<BDLStatResponse>('/stats', {
      params,
      headers: {
        Authorization: apiKey,
      },
    })

    allStats.push(...(data.data ?? []))

    if (!data.meta?.next_cursor) break
    cursor = data.meta.next_cursor
  }

  return allStats
}

export async function fetchNBAGameHighlights(gameIds: number[]): Promise<{ status: GameHighlightsProviderStatus; highlights: GameHighlightItem[] }> {
  const apiKey = getBallDontLieApiKey()
  if (!apiKey) {
    return {
      status: {
        provider: 'balldontlie-game-player-stats',
        configured: false,
        available: false,
        reason: 'BALLDONTLIE_API_KEY não configurada.',
      },
      highlights: [],
    }
  }

  const targetIds = Array.from(new Set(gameIds.filter((id) => Number.isFinite(id) && id > 0)))
  if (targetIds.length === 0) {
    return {
      status: {
        provider: 'balldontlie-game-player-stats',
        configured: true,
        available: true,
      },
      highlights: [],
    }
  }

  const now = Date.now()
  const cachedHighlights = targetIds
    .map((id) => highlightsCache.get(id))
    .filter((entry): entry is { expiresAt: number; value: GameHighlightItem } => !!entry && entry.expiresAt > now)
    .map((entry) => entry.value)

  const cachedIds = new Set(cachedHighlights.map((item) => item.game_id))
  const missingIds = targetIds.filter((id) => !cachedIds.has(id))

  try {
    let freshHighlights: GameHighlightItem[] = []

    if (missingIds.length > 0) {
      const stats = await fetchStatsForGameIds(apiKey, missingIds)
      const statsByGame = new Map<number, BDLGameStat[]>()

      for (const stat of stats) {
        const gameId = stat.game?.id
        if (!gameId) continue
        const current = statsByGame.get(gameId) ?? []
        current.push(stat)
        statsByGame.set(gameId, current)
      }

      freshHighlights = missingIds
        .map((gameId) => buildHighlight(gameId, statsByGame.get(gameId) ?? []))
        .filter((item): item is GameHighlightItem => item != null)

      for (const item of freshHighlights) {
        highlightsCache.set(item.game_id, {
          expiresAt: now + HIGHLIGHTS_CACHE_TTL_MS,
          value: item,
        })
      }
    }

    const highlights = [...cachedHighlights, ...freshHighlights].sort((a, b) => targetIds.indexOf(a.game_id) - targetIds.indexOf(b.game_id))

    return {
      status: {
        provider: 'balldontlie-game-player-stats',
        configured: true,
        available: true,
      },
      highlights,
    }
  } catch (error: unknown) {
    const statusCode = axios.isAxiosError(error) ? error.response?.status : undefined
    const responseBody = axios.isAxiosError(error) ? error.response?.data : undefined
    const errorMessage = error instanceof Error ? error.message : String(error)

    console.error('[game-highlights] BallDontLie request failed', {
      statusCode,
      message: errorMessage,
      body: responseBody,
      gameIds: targetIds,
    })

    const reason = statusCode === 401
      ? 'Plano atual da Ball Don\'t Lie não tem acesso ao endpoint de game player stats.'
      : statusCode === 404
      ? 'Endpoint de game player stats não foi encontrado na Ball Don\'t Lie.'
      : statusCode === 429
      ? 'Limite do provedor Ball Don\'t Lie atingido para game player stats.'
      : 'Falha ao carregar destaques individuais dos jogos.'

    return {
      status: {
        provider: 'balldontlie-game-player-stats',
        configured: true,
        available: false,
        reason,
      },
      highlights: cachedHighlights,
    }
  }
}
