import { supabase } from '../lib/supabase'
import { restoreRows } from '../lib/rollback'

type RemoveParticipantLookup =
  | { participantId: string; email?: never; userId?: never }
  | { participantId?: never; email: string; userId?: never }
  | { participantId?: never; email?: never; userId: string }

export interface RemoveParticipantResult {
  participant: {
    id: string
    name: string
    email: string
    user_id: string
  }
  deleted: {
    series_picks: number
    game_picks: number
    simulation_series_picks: number
    simulation_game_picks: number
    participants: number
    allowed_emails: number
  }
}

interface ParticipantRow {
  id: string
  name: string
  email: string
  user_id: string
  is_admin?: boolean | null
}

async function deleteByParticipantId(table: string, participantId: string): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq('participant_id', participantId)
    .select('id')

  if (error) {
    throw new Error(`Failed deleting ${table}: ${error.message}`)
  }

  return data?.length ?? 0
}

async function snapshotByParticipantId(table: 'series_picks' | 'game_picks' | 'simulation_series_picks' | 'simulation_game_picks', participantId: string) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('participant_id', participantId)

  if (error) {
    throw new Error(`Failed snapshotting ${table}: ${error.message}`)
  }

  return (data ?? []) as Record<string, unknown>[]
}

export async function removeParticipantCompletely(lookup: RemoveParticipantLookup): Promise<RemoveParticipantResult> {
  let query = supabase
    .from('participants')
    .select('*')

  if (lookup.participantId) {
    query = query.eq('id', lookup.participantId)
  } else if (lookup.email) {
    query = query.eq('email', lookup.email)
  } else {
    query = query.eq('user_id', lookup.userId)
  }

  const { data: participant, error: participantError } = await query.maybeSingle()

  if (participantError) {
    throw new Error(`Failed loading participant: ${participantError.message}`)
  }

  if (!participant) {
    throw new Error('Participant not found for the provided identifier.')
  }

  const participantRow = participant as ParticipantRow
  const snapshots = {
    participants: [participant as unknown as Record<string, unknown>],
    allowed_emails: participantRow.email ? [{ email: participantRow.email }] as Record<string, unknown>[] : [],
    series_picks: await snapshotByParticipantId('series_picks', participantRow.id),
    game_picks: await snapshotByParticipantId('game_picks', participantRow.id),
    simulation_series_picks: await snapshotByParticipantId('simulation_series_picks', participantRow.id),
    simulation_game_picks: await snapshotByParticipantId('simulation_game_picks', participantRow.id),
  }

  try {
    const deletedSeriesPicks = await deleteByParticipantId('series_picks', participantRow.id)
    const deletedGamePicks = await deleteByParticipantId('game_picks', participantRow.id)
    const deletedSimulationSeriesPicks = await deleteByParticipantId('simulation_series_picks', participantRow.id)
    const deletedSimulationGamePicks = await deleteByParticipantId('simulation_game_picks', participantRow.id)

    const { data: deletedParticipants, error: deleteParticipantError } = await supabase
      .from('participants')
      .delete()
      .eq('id', participantRow.id)
      .select('id')

    if (deleteParticipantError) {
      throw new Error(`Failed deleting participant: ${deleteParticipantError.message}`)
    }

    const { data: deletedAllowedEmails, error: deleteAllowedEmailError } = await supabase
      .from('allowed_emails')
      .delete()
      .eq('email', participantRow.email)
      .select('email')

    if (deleteAllowedEmailError) {
      throw new Error(`Failed deleting allowed email: ${deleteAllowedEmailError.message}`)
    }

    return {
      participant: participantRow,
      deleted: {
        series_picks: deletedSeriesPicks,
        game_picks: deletedGamePicks,
        simulation_series_picks: deletedSimulationSeriesPicks,
        simulation_game_picks: deletedSimulationGamePicks,
        participants: deletedParticipants?.length ?? 0,
        allowed_emails: deletedAllowedEmails?.length ?? 0,
      },
    }
  } catch (error) {
    try {
      await restoreRows('participants', snapshots.participants)
      await restoreRows('allowed_emails', snapshots.allowed_emails)
      await restoreRows('series_picks', snapshots.series_picks)
      await restoreRows('game_picks', snapshots.game_picks)
      await restoreRows('simulation_series_picks', snapshots.simulation_series_picks)
      await restoreRows('simulation_game_picks', snapshots.simulation_game_picks)
    } catch (rollbackError) {
      console.error('[removeParticipant] Rollback failed:', rollbackError)
    }
    throw error
  }
}
