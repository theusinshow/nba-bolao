import axios from 'axios'

const api = axios.create({
  baseURL: 'https://api.balldontlie.io/v1',
  headers: {
    Authorization: process.env.BALLDONTLIE_API_KEY ?? '',
  },
})

export interface BDLGame {
  id: number
  date: string
  status: string
  period: number
  home_team: { id: number; abbreviation: string }
  visitor_team: { id: number; abbreviation: string }
  home_team_score: number
  visitor_team_score: number
  postseason: boolean
}

export async function fetchPostseasonGames(season: number = 2024): Promise<BDLGame[]> {
  const allGames: BDLGame[] = []
  let cursor: number | null = null

  while (true) {
    const params: Record<string, unknown> = {
      postseason: true,
      seasons: [season],
      per_page: 100,
    }
    if (cursor) params.cursor = cursor

    const { data } = await api.get<{ data: BDLGame[]; meta: { next_cursor?: number } }>('/games', { params })

    allGames.push(...data.data)

    if (!data.meta.next_cursor) break
    cursor = data.meta.next_cursor
  }

  return allGames
}
