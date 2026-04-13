import axios from 'axios'

export interface InjuriesProviderStatus {
  provider: 'sportsdataio'
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
}

interface SportsDataIoPlayer {
  PlayerID?: number
  Name?: string
  FirstName?: string
  LastName?: string
  Team?: string | null
  Position?: string | null
  InjuryStatus?: string | null
  InjuryBodyPart?: string | null
  InjuryNotes?: string | null
}

const sportsDataIoApi = axios.create({
  baseURL: process.env.SPORTSDATAIO_BASE_URL ?? 'https://api.sportsdata.io/v3/nba/scores/json',
})

function getConfiguredSportsDataIoKey(): string | null {
  const apiKey = process.env.SPORTSDATAIO_API_KEY?.trim()
  return apiKey ? apiKey : null
}

function getPlayerName(player: SportsDataIoPlayer): string {
  return player.Name
    ?? [player.FirstName, player.LastName].filter(Boolean).join(' ').trim()
    ?? 'Jogador'
}

function normalizeInjuryStatus(value?: string | null): string | null {
  const normalized = value?.trim()
  if (!normalized) return null
  if (normalized.toLowerCase() === 'active') return null
  return normalized
}

function buildInjuryDetail(player: SportsDataIoPlayer): string | null {
  const pieces = [player.InjuryBodyPart, player.InjuryNotes].filter(Boolean)
  return pieces.length ? pieces.join(' - ') : null
}

export async function fetchNBAInjuries(): Promise<{ status: InjuriesProviderStatus; injuries: AnalysisInjuryItem[] }> {
  const apiKey = getConfiguredSportsDataIoKey()
  if (!apiKey) {
    return {
      status: {
        provider: 'sportsdataio',
        configured: false,
        available: false,
        reason: 'SPORTSDATAIO_API_KEY não configurada.',
      },
      injuries: [],
    }
  }

  try {
    const response = await sportsDataIoApi.get<SportsDataIoPlayer[]>('/Players', {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    })

    const injuries = response.data
      .map((player) => {
        const status = normalizeInjuryStatus(player.InjuryStatus)
        if (!status) return null

        return {
          id: String(player.PlayerID ?? `${player.Team ?? 'NBA'}-${getPlayerName(player)}`),
          player_name: getPlayerName(player),
          team: player.Team ?? null,
          status,
          detail: buildInjuryDetail(player),
          position: player.Position ?? null,
        }
      })
      .filter((item): item is AnalysisInjuryItem => item != null)

    return {
      status: {
        provider: 'sportsdataio',
        configured: true,
        available: true,
      },
      injuries,
    }
  } catch (error: unknown) {
    const statusCode = axios.isAxiosError(error) ? error.response?.status : undefined
    const reason = statusCode === 401
      ? 'SportsDataIO rejeitou a chave atual.'
      : statusCode === 403
      ? 'Plano atual da SportsDataIO não tem acesso ao endpoint de jogadores.'
      : statusCode === 404
      ? 'Endpoint de jogadores da SportsDataIO não foi encontrado. Verifique SPORTSDataIO_BASE_URL.'
      : 'Falha ao carregar lesões na SportsDataIO.'

    return {
      status: {
        provider: 'sportsdataio',
        configured: true,
        available: false,
        reason,
      },
      injuries: [],
    }
  }
}
