import { Router } from 'express'
import axios from 'axios'

const router = Router()

// ---------------------------------------------------------------------------
// BDL API client (same key used by syncNBA)
// ---------------------------------------------------------------------------

const bdlApi = axios.create({
  baseURL: 'https://api.balldontlie.io/v1',
  headers: { Authorization: process.env.BALLDONTLIE_API_KEY ?? '' },
  timeout: 10_000,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamContextData {
  abbreviation: string
  wins: number
  losses: number
  homeWins: number
  homeLosses: number
  awayWins: number
  awayLosses: number
}

interface SeriesContextData {
  home: TeamContextData
  away: TeamContextData
  headToHead: { homeWins: number; awayWins: number }
}

// ---------------------------------------------------------------------------
// In-memory cache — season-regular data never changes after playoffs start
// ---------------------------------------------------------------------------

const contextCache = new Map<string, SeriesContextData>()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseRecord(record: unknown): [number, number] {
  if (typeof record !== 'string') return [0, 0]
  const parts = record.split('-').map(Number)
  return [parts[0] ?? 0, parts[1] ?? 0]
}

interface BDLStanding {
  team: { id: number; abbreviation: string }
  wins: number
  losses: number
  home_record?: string
  visitor_record?: string
}

interface BDLGame {
  home_team: { id: number }
  visitor_team: { id: number }
  home_team_score: number
  visitor_team_score: number
  status: string
}

async function fetchStandings(season: number): Promise<BDLStanding[]> {
  const { data } = await bdlApi.get<{ data: BDLStanding[] }>('/standings', {
    params: { season },
  })
  return data.data ?? []
}

async function fetchAllRegularSeasonGames(
  teamId1: number,
  teamId2: number,
  season: number,
): Promise<BDLGame[]> {
  const allGames: BDLGame[] = []
  let cursor: number | null = null

  while (true) {
    const params: Record<string, unknown> = {
      'seasons[]': season,
      'team_ids[]': [teamId1, teamId2],
      postseason: false,
      per_page: 100,
    }
    if (cursor) params.cursor = cursor

    const { data } = await bdlApi.get<{
      data: BDLGame[]
      meta: { next_cursor?: number }
    }>('/games', { params })

    // Keep only matchups between these two specific teams
    const h2h = (data.data ?? []).filter((g) => {
      const ids = new Set([g.home_team.id, g.visitor_team.id])
      return ids.has(teamId1) && ids.has(teamId2)
    })

    allGames.push(...h2h)

    if (!data.meta.next_cursor) break
    cursor = data.meta.next_cursor
  }

  return allGames
}

// ---------------------------------------------------------------------------
// GET /api/series-context/:homeId/:awayId
// homeId / awayId: team abbreviations (e.g. "OKC", "IND")
// ---------------------------------------------------------------------------

router.get('/:homeId/:awayId', async (req, res) => {
  const homeId = (req.params.homeId ?? '').toUpperCase()
  const awayId = (req.params.awayId ?? '').toUpperCase()

  if (!homeId || !awayId) {
    return res.status(400).json({ ok: false, error: 'Missing team IDs' })
  }

  const cacheKey = [homeId, awayId].sort().join('-')

  if (contextCache.has(cacheKey)) {
    return res.json({ ok: true, ...contextCache.get(cacheKey) })
  }

  try {
    const season = Number(process.env.BALLDONTLIE_SEASON ?? 2024)
    const standings = await fetchStandings(season)

    // Build abbreviation → standing map from live response — no hardcoded IDs
    const byAbbr = new Map<string, BDLStanding>()
    for (const s of standings) {
      byAbbr.set(s.team.abbreviation.toUpperCase(), s)
    }

    const homeStanding = byAbbr.get(homeId)
    const awayStanding = byAbbr.get(awayId)

    if (!homeStanding || !awayStanding) {
      return res.status(404).json({
        ok: false,
        error: `Team not found in standings: ${!homeStanding ? homeId : awayId}`,
      })
    }

    const [homeHomeW, homeHomeL] = parseRecord(homeStanding.home_record)
    const [homeAwayW, homeAwayL] = parseRecord(homeStanding.visitor_record)
    const [awayHomeW, awayHomeL] = parseRecord(awayStanding.home_record)
    const [awayAwayW, awayAwayL] = parseRecord(awayStanding.visitor_record)

    const h2hGames = await fetchAllRegularSeasonGames(
      homeStanding.team.id,
      awayStanding.team.id,
      season,
    )

    let h2hHomeWins = 0
    let h2hAwayWins = 0

    for (const g of h2hGames) {
      if (!/final/i.test(g.status)) continue
      const homeWon = g.home_team.id === homeStanding.team.id
        ? g.home_team_score > g.visitor_team_score
        : g.visitor_team_score > g.home_team_score

      if (homeWon) h2hHomeWins++
      else h2hAwayWins++
    }

    const result: SeriesContextData = {
      home: {
        abbreviation: homeId,
        wins: homeStanding.wins,
        losses: homeStanding.losses,
        homeWins: homeHomeW,
        homeLosses: homeHomeL,
        awayWins: homeAwayW,
        awayLosses: homeAwayL,
      },
      away: {
        abbreviation: awayId,
        wins: awayStanding.wins,
        losses: awayStanding.losses,
        homeWins: awayHomeW,
        homeLosses: awayHomeL,
        awayWins: awayAwayW,
        awayLosses: awayAwayL,
      },
      headToHead: { homeWins: h2hHomeWins, awayWins: h2hAwayWins },
    }

    contextCache.set(cacheKey, result)

    return res.json({ ok: true, ...result })
  } catch (err: unknown) {
    console.error('[series-context] Error:', err)
    return res.status(502).json({ ok: false, error: 'Failed to fetch series context from BDL' })
  }
})

export default router
