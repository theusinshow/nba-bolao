import { removeParticipantCompletely } from '../admin/removeParticipant'

function readArg(flag: '--participant-id' | '--email' | '--user-id'): string {
  const index = process.argv.indexOf(flag)
  if (index === -1) return ''
  return process.argv[index + 1]?.trim() ?? ''
}

async function main() {
  const participantId = readArg('--participant-id')
  const email = readArg('--email').toLowerCase()
  const userId = readArg('--user-id')

  const provided = [participantId, email, userId].filter(Boolean)

  if (provided.length !== 1) {
    throw new Error('Use exatamente um identificador: --participant-id, --email ou --user-id.')
  }

  const result = participantId
    ? await removeParticipantCompletely({ participantId })
    : email
    ? await removeParticipantCompletely({ email })
    : await removeParticipantCompletely({ userId })

  console.log('')
  console.log('[removeParticipant] Participante removido com sucesso')
  console.log(`- Nome: ${result.participant.name}`)
  console.log(`- Email: ${result.participant.email}`)
  console.log(`- ID: ${result.participant.id}`)
  console.log(`- Series picks removidos: ${result.deleted.series_picks}`)
  console.log(`- Game picks removidos: ${result.deleted.game_picks}`)
  console.log(`- Simulation series picks removidos: ${result.deleted.simulation_series_picks}`)
  console.log(`- Simulation game picks removidos: ${result.deleted.simulation_game_picks}`)
  console.log(`- Registros em participants removidos: ${result.deleted.participants}`)
  console.log(`- Emails removidos de allowed_emails: ${result.deleted.allowed_emails}`)
}

main().catch((error) => {
  console.error('[removeParticipant] Falha:', error)
  process.exit(1)
})
