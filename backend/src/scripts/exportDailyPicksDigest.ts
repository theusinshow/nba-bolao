import 'dotenv/config'
import { exportDailyPicksDigest } from '../digest/exportDailyPicksDigest'

function readArg(flag: '--target-date'): string {
  const index = process.argv.indexOf(flag)
  if (index === -1) return ''
  return process.argv[index + 1]?.trim() ?? ''
}

async function main() {
  const targetDate = readArg('--target-date')
  const result = await exportDailyPicksDigest(targetDate || undefined)

  console.log('[daily-digest] Resumo diário gerado com sucesso.')
  console.log('[daily-digest] Pasta:', result.outputDir)
  console.log('[daily-digest] Arquivos:')
  console.log(' -', result.files.whatsappTxt)
  console.log(' -', result.files.summaryMd)
  console.log(' -', result.files.payloadJson)
}

main().catch((error) => {
  console.error('[daily-digest] Falha ao gerar resumo diário:', error)
  process.exitCode = 1
})
