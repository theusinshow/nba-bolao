const SLOT_ALIASES: Record<string, string> = {
  'W-R1-1': 'W1-1',
  'W-R1-2': 'W1-2',
  'W-R1-3': 'W1-3',
  'W-R1-4': 'W1-4',
  'W-R2-1': 'W2-1',
  'W-R2-2': 'W2-2',
  'W-CF': 'WCF',
  'E-R1-1': 'E1-1',
  'E-R1-2': 'E1-2',
  'E-R1-3': 'E1-3',
  'E-R1-4': 'E1-4',
  'E-R2-1': 'E2-1',
  'E-R2-2': 'E2-2',
  'E-CF': 'ECF',
  FINALS: 'FIN',
}

export function normalizeSeriesSlot(value?: string | null): string | null {
  if (!value) return null
  return SLOT_ALIASES[value] ?? value
}

export function inferRoundFromSeriesId(seriesId?: string | null): 1 | 2 | 3 | 4 | undefined {
  const slot = normalizeSeriesSlot(seriesId)
  if (!slot) return undefined
  if (slot.startsWith('W1') || slot.startsWith('E1')) return 1
  if (slot.startsWith('W2') || slot.startsWith('E2')) return 2
  if (slot === 'WCF' || slot === 'ECF') return 3
  if (slot === 'FIN') return 4
  return undefined
}
