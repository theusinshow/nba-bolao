import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { supabase } from '../lib/supabase'
import { inferRoundFromSeriesId } from '../utils/bracket'
import { calculateGamePickPoints, calculateSeriesPickPoints, compareRankingEntries } from '../scoring/rules'

interface ParticipantRow {
  id: string
  name: string
  email: string
  user_id: string
  is_admin: boolean
}

interface TeamRow {
  id: string
  name: string
  abbreviation: string
}

interface SeriesRow {
  id: string
  round: number | null
  conference: string | null
  position: number | null
  home_team_id: string | null
  away_team_id: string | null
  winner_id: string | null
  games_played: number
  is_complete: boolean
}

interface SeriesPickRow {
  id: string
  participant_id: string
  series_id: string
  winner_id: string
  games_count: number
}

interface GameRow {
  id: string
  series_id: string
  game_number: number
  home_team_id: string
  away_team_id: string
  winner_id: string | null
  home_score: number | null
  away_score: number | null
  played: boolean
  tip_off_at: string | null
  nba_game_id: number | null
}

interface GamePickRow {
  id: string
  participant_id: string
  game_id: string
  winner_id: string
}

interface RankingBackupRow {
  rank: number
  participant_id: string
  participant_name: string
  participant_email: string
  total_points: number
  series_points: number
  game_points: number
  cravadas: number
  series_correct: number
  series_total: number
  games_correct: number
  games_total: number
}

interface BackupData {
  participants: ParticipantRow[]
  teams: TeamRow[]
  series: SeriesRow[]
  seriesPicks: SeriesPickRow[]
  games: GameRow[]
  gamePicks: GamePickRow[]
}

interface BackupResult {
  outputDir: string
  files: {
    seriesPicksCsv: string
    gamePicksCsv: string
    rankingCsv: string
    summaryMd: string
  }
}

function formatTimestampParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  )

  const dateStamp = `${parts.year}-${parts.month}-${parts.day}`
  const timeStamp = `${parts.hour}-${parts.minute}-${parts.second}`
  const human = `${dateStamp} ${parts.hour}:${parts.minute}:${parts.second} BRT`

  return { dateStamp, timeStamp, human }
}

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const raw = String(value)
  if (raw.includes('"') || raw.includes(',') || raw.includes('\n') || raw.includes('\r')) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

function buildCsv(headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>): string {
  const lines = [headers.map(csvCell).join(',')]
  for (const row of rows) {
    lines.push(row.map(csvCell).join(','))
  }
  return `${lines.join('\n')}\n`
}

function teamLabel(teamId: string | null | undefined, teamsById: Record<string, TeamRow | undefined>): string {
  if (!teamId) return '—'
  return teamsById[teamId]?.abbreviation ?? teamId
}

function teamName(teamId: string | null | undefined, teamsById: Record<string, TeamRow | undefined>): string {
  if (!teamId) return 'A definir'
  return teamsById[teamId]?.name ?? teamId
}

function seriesMatchup(series: SeriesRow, teamsById: Record<string, TeamRow | undefined>): string {
  return `${teamLabel(series.home_team_id, teamsById)} vs ${teamLabel(series.away_team_id, teamsById)}`
}

function roundLabel(round: number | null | undefined): string {
  switch (round) {
    case 1: return 'R1'
    case 2: return 'R2'
    case 3: return 'Finais de conferencia'
    case 4: return 'NBA Finals'
    default: return '—'
  }
}

async function fetchBackupData(): Promise<BackupData> {
  const [
    { data: participants },
    { data: teams },
    { data: series },
    { data: seriesPicks },
    { data: games },
    { data: gamePicks },
  ] = await Promise.all([
    supabase.from('participants').select('id, name, email, user_id, is_admin').order('name', { ascending: true }),
    supabase.from('teams').select('id, name, abbreviation').order('abbreviation', { ascending: true }),
    supabase.from('series').select('*').order('round', { ascending: true }).order('position', { ascending: true }),
    supabase.from('series_picks').select('*'),
    supabase.from('games').select('*').order('tip_off_at', { ascending: true }).order('game_number', { ascending: true }),
    supabase.from('game_picks').select('*'),
  ])

  if (!participants || !teams || !series || !seriesPicks || !games || !gamePicks) {
    throw new Error('Falha ao carregar dados suficientes para o backup operacional')
  }

  return {
    participants: participants as ParticipantRow[],
    teams: teams as TeamRow[],
    series: series as SeriesRow[],
    seriesPicks: seriesPicks as SeriesPickRow[],
    games: games as GameRow[],
    gamePicks: gamePicks as GamePickRow[],
  }
}

function buildRankingRows(data: BackupData): RankingBackupRow[] {
  const seriesById = Object.fromEntries(data.series.map((series) => [series.id, series]))
  const gamesById = Object.fromEntries(data.games.map((game) => [game.id, game]))

  const rows = data.participants.map((participant) => {
    const participantSeriesPicks = data.seriesPicks.filter((pick) => pick.participant_id === participant.id)
    const participantGamePicks = data.gamePicks.filter((pick) => pick.participant_id === participant.id)

    let seriesPoints = 0
    let gamePoints = 0
    let cravadas = 0
    let seriesCorrect = 0
    let gamesCorrect = 0

    for (const pick of participantSeriesPicks) {
      const series = seriesById[pick.series_id]
      if (!series) continue

      const round = series.round ?? inferRoundFromSeriesId(series.id)
      if (!round) continue

      const points = calculateSeriesPickPoints(
        { winnerId: pick.winner_id, gamesCount: pick.games_count },
        {
          winnerId: series.winner_id,
          gamesPlayed: series.games_played,
          isComplete: series.is_complete,
          round,
        }
      )

      seriesPoints += points
      if (points > 0) {
        seriesCorrect += 1
        if (pick.games_count === series.games_played) cravadas += 1
      }
    }

    for (const pick of participantGamePicks) {
      const game = gamesById[pick.game_id]
      if (!game) continue

      const round = seriesById[game.series_id]?.round ?? inferRoundFromSeriesId(game.series_id)
      const points = calculateGamePickPoints(
        { winnerId: pick.winner_id },
        { winnerId: game.winner_id, played: game.played, round }
      )

      gamePoints += points
      if (points > 0) gamesCorrect += 1
    }

    return {
      rank: 0,
      participant_id: participant.id,
      participant_name: participant.name,
      participant_email: participant.email,
      total_points: seriesPoints + gamePoints,
      series_points: seriesPoints,
      game_points: gamePoints,
      cravadas,
      series_correct: seriesCorrect,
      series_total: participantSeriesPicks.length,
      games_correct: gamesCorrect,
      games_total: participantGamePicks.length,
    }
  })

  rows.sort((left, right) => compareRankingEntries(
    {
      participantName: left.participant_name,
      totalPoints: left.total_points,
      cravadas: left.cravadas,
      seriesCorrect: left.series_correct,
      gamesCorrect: left.games_correct,
    },
    {
      participantName: right.participant_name,
      totalPoints: right.total_points,
      cravadas: right.cravadas,
      seriesCorrect: right.series_correct,
      gamesCorrect: right.games_correct,
    }
  ))

  return rows.map((row, index) => ({ ...row, rank: index + 1 }))
}

function buildSeriesPicksCsv(data: BackupData): string {
  const teamsById = Object.fromEntries(data.teams.map((team) => [team.id, team]))
  const participantsById = Object.fromEntries(data.participants.map((participant) => [participant.id, participant]))
  const seriesById = Object.fromEntries(data.series.map((series) => [series.id, series]))

  const rows = data.seriesPicks
    .map((pick) => {
      const participant = participantsById[pick.participant_id]
      const series = seriesById[pick.series_id]
      const round = series?.round ?? inferRoundFromSeriesId(pick.series_id) ?? null

      return [
        participant?.id ?? pick.participant_id,
        participant?.name ?? 'Participante removido',
        participant?.email ?? '',
        pick.series_id,
        roundLabel(round),
        series ? seriesMatchup(series, teamsById) : pick.series_id,
        teamLabel(pick.winner_id, teamsById),
        pick.games_count,
        series ? teamLabel(series.winner_id, teamsById) : '',
        series?.games_played ?? '',
        series?.is_complete ?? false,
      ]
    })
    .sort((left, right) => String(left[1]).localeCompare(String(right[1]), 'pt-BR', { sensitivity: 'base' }))

  return buildCsv(
    [
      'participant_id',
      'participant_name',
      'participant_email',
      'series_id',
      'round',
      'matchup',
      'picked_winner',
      'picked_games_count',
      'actual_winner',
      'actual_games_played',
      'series_is_complete',
    ],
    rows
  )
}

function buildGamePicksCsv(data: BackupData): string {
  const teamsById = Object.fromEntries(data.teams.map((team) => [team.id, team]))
  const participantsById = Object.fromEntries(data.participants.map((participant) => [participant.id, participant]))
  const seriesById = Object.fromEntries(data.series.map((series) => [series.id, series]))

  const rows = data.gamePicks
    .map((pick) => {
      const participant = participantsById[pick.participant_id]
      const game = data.games.find((item) => item.id === pick.game_id)
      const round = game ? (seriesById[game.series_id]?.round ?? inferRoundFromSeriesId(game.series_id) ?? null) : null

      return [
        participant?.id ?? pick.participant_id,
        participant?.name ?? 'Participante removido',
        participant?.email ?? '',
        game?.series_id ?? '',
        roundLabel(round),
        game?.id ?? pick.game_id,
        game?.game_number ?? '',
        game?.tip_off_at ?? '',
        game ? `${teamLabel(game.home_team_id, teamsById)} vs ${teamLabel(game.away_team_id, teamsById)}` : pick.game_id,
        teamLabel(pick.winner_id, teamsById),
        game ? teamLabel(game.winner_id, teamsById) : '',
        game?.played ?? false,
        game?.home_score ?? '',
        game?.away_score ?? '',
      ]
    })
    .sort((left, right) => {
      const byParticipant = String(left[1]).localeCompare(String(right[1]), 'pt-BR', { sensitivity: 'base' })
      if (byParticipant !== 0) return byParticipant
      return String(left[5]).localeCompare(String(right[5]), 'pt-BR', { sensitivity: 'base' })
    })

  return buildCsv(
    [
      'participant_id',
      'participant_name',
      'participant_email',
      'series_id',
      'round',
      'game_id',
      'game_number',
      'tip_off_at',
      'matchup',
      'picked_winner',
      'actual_winner',
      'played',
      'home_score',
      'away_score',
    ],
    rows
  )
}

function buildRankingCsv(rows: RankingBackupRow[]): string {
  return buildCsv(
    [
      'rank',
      'participant_id',
      'participant_name',
      'participant_email',
      'total_points',
      'series_points',
      'game_points',
      'cravadas',
      'series_correct',
      'series_total',
      'games_correct',
      'games_total',
    ],
    rows.map((row) => [
      row.rank,
      row.participant_id,
      row.participant_name,
      row.participant_email,
      row.total_points,
      row.series_points,
      row.game_points,
      row.cravadas,
      row.series_correct,
      row.series_total,
      row.games_correct,
      row.games_total,
    ])
  )
}

function buildSummaryMarkdown(data: BackupData, rankingRows: RankingBackupRow[], generatedAt: string): string {
  const teamsById = Object.fromEntries(data.teams.map((team) => [team.id, team]))
  const completedSeries = data.series.filter((series) => series.is_complete)
  const openGames = data.games
    .filter((game) => !game.played && game.tip_off_at)
    .sort((left, right) => new Date(left.tip_off_at ?? 0).getTime() - new Date(right.tip_off_at ?? 0).getTime())
    .slice(0, 10)

  const participantCoverage = rankingRows.map((row) => {
    const participantSeriesPicks = data.seriesPicks.filter((pick) => pick.participant_id === row.participant_id).length
    const participantGamePicks = data.gamePicks.filter((pick) => pick.participant_id === row.participant_id).length
    return `| ${row.rank} | ${row.participant_name} | ${row.total_points} | ${participantSeriesPicks} | ${participantGamePicks} |`
  })

  const completedSeriesRows = completedSeries
    .slice(0, 16)
    .map((series) => {
      const winner = teamLabel(series.winner_id, teamsById)
      return `| ${series.id} | ${roundLabel(series.round)} | ${seriesMatchup(series, teamsById)} | ${winner} | 4-${Math.max(series.games_played - 4, 0)} |`
    })

  const nextGamesRows = openGames.map((game) => {
    const round = data.series.find((series) => series.id === game.series_id)?.round ?? inferRoundFromSeriesId(game.series_id)
    return `| ${game.series_id} | ${roundLabel(round)} | Jogo ${game.game_number} | ${teamLabel(game.home_team_id, teamsById)} vs ${teamLabel(game.away_team_id, teamsById)} | ${game.tip_off_at ?? 'Sem horario'} |`
  })

  return [
    '# Backup Operacional do Bolao NBA',
    '',
    `Gerado em: ${generatedAt}`,
    '',
    '## Resumo rapido',
    '',
    `- Participantes: ${data.participants.length}`,
    `- Series cadastradas: ${data.series.length}`,
    `- Series concluidas: ${completedSeries.length}`,
    `- Jogos cadastrados: ${data.games.length}`,
    `- Jogos ainda abertos: ${data.games.filter((game) => !game.played).length}`,
    `- Palpites de series exportados: ${data.seriesPicks.length}`,
    `- Palpites de jogos exportados: ${data.gamePicks.length}`,
    '',
    '## Ranking consolidado',
    '',
    '| Rank | Participante | Pontos | Palpites de series | Palpites de jogos |',
    '| --- | --- | ---: | ---: | ---: |',
    ...participantCoverage,
    '',
    '## Series concluidas',
    '',
    '| Serie | Rodada | Confronto | Vencedor | Fechamento |',
    '| --- | --- | --- | --- | --- |',
    ...(completedSeriesRows.length > 0 ? completedSeriesRows : ['| - | - | Nenhuma serie concluida ainda | - | - |']),
    '',
    '## Proximos jogos ainda abertos',
    '',
    '| Serie | Rodada | Jogo | Confronto | Tip-off |',
    '| --- | --- | --- | --- | --- |',
    ...(nextGamesRows.length > 0 ? nextGamesRows : ['| - | - | - | Nenhum jogo aberto encontrado | - |']),
    '',
    '## Como continuar o bolao manualmente',
    '',
    '- Use `palpites-series-*.csv` para consultar e validar os vencedores e numero de jogos escolhidos por cada participante.',
    '- Use `palpites-jogos-*.csv` para conferir os palpites jogo a jogo, inclusive em caso de desempate ou conferencia manual.',
    '- Use `ranking-*.csv` como placar oficial congelado daquele momento.',
    '- Se o app cair, compartilhe este resumo no grupo e use os CSVs como fonte de verdade para conferir os palpites.',
    '',
  ].join('\n')
}

export async function exportOperationalSnapshot(): Promise<BackupResult> {
  const data = await fetchBackupData()
  const rankingRows = buildRankingRows(data)
  const now = new Date()
  const { dateStamp, timeStamp, human } = formatTimestampParts(now)

  const repoRoot = path.resolve(__dirname, '../../..')
  const outputDir = path.join(repoRoot, 'backups', `${dateStamp}_${timeStamp}`)
  await mkdir(outputDir, { recursive: true })

  const files = {
    seriesPicksCsv: path.join(outputDir, `palpites-series-${dateStamp}.csv`),
    gamePicksCsv: path.join(outputDir, `palpites-jogos-${dateStamp}.csv`),
    rankingCsv: path.join(outputDir, `ranking-${dateStamp}.csv`),
    summaryMd: path.join(outputDir, `resumo-rodada-${dateStamp}.md`),
  }

  await Promise.all([
    writeFile(files.seriesPicksCsv, buildSeriesPicksCsv(data), 'utf8'),
    writeFile(files.gamePicksCsv, buildGamePicksCsv(data), 'utf8'),
    writeFile(files.rankingCsv, buildRankingCsv(rankingRows), 'utf8'),
    writeFile(files.summaryMd, buildSummaryMarkdown(data, rankingRows, human), 'utf8'),
  ])

  return { outputDir, files }
}
