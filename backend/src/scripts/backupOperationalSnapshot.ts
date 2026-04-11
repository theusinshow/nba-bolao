import 'dotenv/config'
import { exportOperationalSnapshot } from '../backup/exportOperationalSnapshot'

async function main() {
  const result = await exportOperationalSnapshot()

  console.log('[backup] Snapshot operacional gerado com sucesso.')
  console.log('[backup] Pasta:', result.outputDir)
  console.log('[backup] Arquivos:')
  console.log(' -', result.files.seriesPicksCsv)
  console.log(' -', result.files.gamePicksCsv)
  console.log(' -', result.files.rankingCsv)
  console.log(' -', result.files.summaryMd)
}

main().catch((error) => {
  console.error('[backup] Falha ao gerar snapshot operacional:', error)
  process.exitCode = 1
})
