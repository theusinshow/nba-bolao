import { supabase } from './supabase'

type TableName =
  | 'series_picks'
  | 'game_picks'
  | 'simulation_series_picks'
  | 'simulation_game_picks'
  | 'participants'
  | 'allowed_emails'

function getOnConflict(table: TableName): string {
  switch (table) {
    case 'allowed_emails':
      return 'email'
    default:
      return 'id'
  }
}

export async function restoreRows(table: TableName, rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) return

  const chunkSize = 100
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize)
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict: getOnConflict(table) })

    if (error) {
      throw new Error(`Failed restoring ${table}: ${error.message}`)
    }
  }
}
