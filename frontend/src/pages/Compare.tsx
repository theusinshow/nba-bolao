import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BracketSVG } from '../components/BracketSVG'
import { useSeries } from '../hooks/useSeries'
import type { Participant, SeriesPick } from '../types'

export function Compare() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [leftId, setLeftId] = useState('')
  const [rightId, setRightId] = useState('')
  const [leftPicks, setLeftPicks] = useState<SeriesPick[]>([])
  const [rightPicks, setRightPicks] = useState<SeriesPick[]>([])
  const { series } = useSeries()

  useEffect(() => {
    supabase.from('participants').select('*').then(({ data }) => {
      if (data) setParticipants(data as Participant[])
    })
  }, [])

  async function fetchPicks(participantId: string): Promise<SeriesPick[]> {
    const { data } = await supabase
      .from('series_picks')
      .select('*')
      .eq('participant_id', participantId)
    return (data as SeriesPick[]) ?? []
  }

  async function handleLeftChange(id: string) {
    setLeftId(id)
    if (id) setLeftPicks(await fetchPicks(id))
    else setLeftPicks([])
  }

  async function handleRightChange(id: string) {
    setRightId(id)
    if (id) setRightPicks(await fetchPicks(id))
    else setRightPicks([])
  }

  const selectClass =
    'bg-nba-surface border border-nba-border text-nba-text rounded-lg px-3 py-2 text-sm outline-none focus:border-nba-gold w-full'

  return (
    <div className="pb-20 pt-4 px-4">
      <h1 className="title text-4xl text-nba-gold mb-1">Comparar</h1>
      <p className="text-nba-muted text-sm mb-4">Compare os brackets de dois participantes</p>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <label className="text-nba-muted text-xs mb-1 block">Participante 1</label>
          <select className={selectClass} value={leftId} onChange={(e) => handleLeftChange(e.target.value)}>
            <option value="">Selecionar...</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-nba-muted text-xs mb-1 block">Participante 2</label>
          <select className={selectClass} value={rightId} onChange={(e) => handleRightChange(e.target.value)}>
            <option value="">Selecionar...</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {leftId && (
        <div className="mb-6">
          <h2 className="title text-xl text-nba-text mb-2">
            {participants.find((p) => p.id === leftId)?.name}
          </h2>
          <BracketSVG series={series} picks={leftPicks} />
        </div>
      )}

      {rightId && (
        <div>
          <h2 className="title text-xl text-nba-text mb-2">
            {participants.find((p) => p.id === rightId)?.name}
          </h2>
          <BracketSVG series={series} picks={rightPicks} />
        </div>
      )}

      {!leftId && !rightId && (
        <div className="text-center text-nba-muted py-12">
          Selecione dois participantes para comparar seus brackets
        </div>
      )}
    </div>
  )
}
