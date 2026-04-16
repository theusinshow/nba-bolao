import { supabase } from '../lib/supabase'
import { BRT_TIMEZONE } from '../lib/constants'

interface ParticipantRow {
  id: string
  name: string
}

interface TeamRow {
  id: string
  abbreviation: string
}

interface GameRow {
  id: string
  series_id: string
  game_number: number
  home_team_id: string
  away_team_id: string
  tip_off_at: string | null
  played: boolean
}

interface GamePickRow {
  participant_id: string
  game_id: string
}

export interface DailyReminderResult {
  targetDate: string
  generatedAt: string
  whatsappText: string
  todayGames: number
  totalParticipants: number
  gamesWithMissingPicks: Array<{
    gameId: string
    gameNumber: number
    matchup: string
    tipOff: string
    missing: string[]
    picked: number
  }>
}

function getBrtDateKey(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: BRT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

function formatTipOff(value: string | null): string {
  if (!value) return 'Sem horário'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatHumanDate(isoDate: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRT_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${isoDate}T12:00:00Z`))
}

export async function exportDailyReminder(targetDate = getBrtDateKey(new Date())): Promise<DailyReminderResult> {
  const [
    { data: participants },
    { data: teams },
    { data: games },
    { data: gamePicks },
  ] = await Promise.all([
    supabase.from('participants').select('id, name').order('name', { ascending: true }),
    supabase.from('teams').select('id, abbreviation'),
    supabase.from('games').select('id, series_id, game_number, home_team_id, away_team_id, tip_off_at, played').order('tip_off_at', { ascending: true }),
    supabase.from('game_picks').select('participant_id, game_id'),
  ])

  if (!participants || !teams || !games || !gamePicks) {
    throw new Error('Não foi possível carregar os dados para gerar o lembrete.')
  }

  const teamsById = Object.fromEntries((teams as TeamRow[]).map((t) => [t.id, t]))
  const abbr = (id: string | null) => (id ? teamsById[id]?.abbreviation ?? id : '?')

  // Games of the target date that haven't been played yet
  const todayGames = (games as GameRow[]).filter(
    (g) => g.tip_off_at && getBrtDateKey(new Date(g.tip_off_at)) === targetDate && !g.played
  )

  const participantList = participants as ParticipantRow[]
  const pickSet = new Set((gamePicks as GamePickRow[]).map((p) => `${p.participant_id}:${p.game_id}`))

  const gamesWithMissingPicks = todayGames.map((game) => {
    const missing = participantList
      .filter((p) => !pickSet.has(`${p.id}:${game.id}`))
      .map((p) => p.name)

    return {
      gameId: game.id,
      gameNumber: game.game_number,
      matchup: `${abbr(game.home_team_id)} x ${abbr(game.away_team_id)}`,
      tipOff: formatTipOff(game.tip_off_at),
      missing,
      picked: participantList.length - missing.length,
    }
  })

  const humanDate = formatHumanDate(targetDate)
  const now = new Date()
  const generatedAt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(now)

  // Build WhatsApp text
  const lines: string[] = [
    `⏰ *Lembrete do Bolão NBA – ${humanDate}*`,
    `_Gerado às ${generatedAt} BRT_`,
    '',
  ]

  if (todayGames.length === 0) {
    lines.push('Nenhum jogo pendente para hoje.')
  } else {
    for (const g of gamesWithMissingPicks) {
      lines.push(`*Jogo ${g.gameNumber} – ${g.matchup}* (${g.tipOff})`)
      lines.push(`Palpites: ${g.picked}/${participantList.length}`)

      if (g.missing.length === 0) {
        lines.push('✅ Todos palpitaram!')
      } else {
        lines.push(`⚠️ Faltam: ${g.missing.join(', ')}`)
      }
      lines.push('')
    }
  }

  const whatsappText = lines.join('\n').trimEnd()

  return {
    targetDate,
    generatedAt,
    whatsappText,
    todayGames: todayGames.length,
    totalParticipants: participantList.length,
    gamesWithMissingPicks,
  }
}
