import assert from 'node:assert/strict'
import {
  calculateSeriesPickPoints,
  calculateGamePickPoints,
  compareRankingEntries,
} from './rules'

function runScoringTests() {
  assert.equal(
    calculateSeriesPickPoints(
      { winnerId: 'OKC', gamesCount: 6 },
      { winnerId: 'OKC', gamesPlayed: 6, isComplete: true, round: 2 }
    ),
    12
  )

  assert.equal(
    calculateSeriesPickPoints(
      { winnerId: 'OKC', gamesCount: 5 },
      { winnerId: 'OKC', gamesPlayed: 6, isComplete: true, round: 2 }
    ),
    6
  )

  assert.equal(
    calculateSeriesPickPoints(
      { winnerId: 'BOS', gamesCount: 6 },
      { winnerId: 'OKC', gamesPlayed: 6, isComplete: true, round: 2 }
    ),
    0
  )

  assert.equal(
    calculateSeriesPickPoints(
      { winnerId: 'OKC', gamesCount: 6 },
      { winnerId: null, gamesPlayed: 0, isComplete: false, round: 2 }
    ),
    0
  )

  assert.equal(
    calculateGamePickPoints(
      { winnerId: 'IND' },
      { winnerId: 'IND', played: true, round: 3 }
    ),
    3
  )

  assert.equal(
    calculateGamePickPoints(
      { winnerId: 'BOS' },
      { winnerId: 'IND', played: true, round: 3 }
    ),
    0
  )

  assert.equal(
    calculateGamePickPoints(
      { winnerId: 'IND' },
      { winnerId: null, played: false, round: 3 }
    ),
    0
  )
}

function runRankingTests() {
  const rows = [
    { participantName: 'Zeca', totalPoints: 10 },
    { participantName: 'Ana', totalPoints: 15 },
    { participantName: 'Bruno', totalPoints: 15 },
  ]

  rows.sort(compareRankingEntries)

  assert.deepEqual(
    rows.map((row) => row.participantName),
    ['Ana', 'Bruno', 'Zeca']
  )
}

function main() {
  runScoringTests()
  runRankingTests()
  console.log('[test:scoring] All scoring tests passed.')
}

main()
