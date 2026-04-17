import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { describeArtifact, getRepoRoot } from '../lib/operationalArtifacts'
import type { ArtifactDescriptor } from '../lib/operationalArtifacts'
import type { BackupManifest } from './exportOperationalSnapshot'
import { verifyStorageArtifact } from '../admin/operationalStorage'

export interface VerifiedArtifact extends ArtifactDescriptor {
  localExists: boolean
  sizeMatches: boolean
  checksumMatches: boolean
  storageOk: boolean | null
  problems: string[]
}

export interface BackupVerificationResult {
  ok: boolean
  backupId: string
  outputDir: string
  verifiedAt: string
  manifestPath: string
  artifactsChecked: number
  storageArtifactsChecked: number
  problems: string[]
  artifacts: VerifiedArtifact[]
}

async function resolveManifestPath(outputDir: string) {
  const entries = await readdir(outputDir)
  const manifestFile = entries.find((entry) => entry.startsWith('manifesto-operacional-') && entry.endsWith('.json'))

  if (!manifestFile) {
    throw new Error(`Nenhum manifesto operacional encontrado em ${outputDir}`)
  }

  return path.join(outputDir, manifestFile)
}

function inferBackupIdFromOutputDir(outputDir: string) {
  return path.basename(outputDir)
}

export async function verifyOperationalSnapshot(input: { backupId?: string | null; outputDir?: string | null }) : Promise<BackupVerificationResult> {
  const outputDir = input.outputDir
    ? path.resolve(input.outputDir)
    : path.join(getRepoRoot(), 'backups', input.backupId ?? '')

  const manifestPath = await resolveManifestPath(outputDir)
  const manifestRaw = await readFile(manifestPath, 'utf8')
  const manifest = JSON.parse(manifestRaw) as BackupManifest
  const backupId = input.backupId ?? manifest.backupId ?? inferBackupIdFromOutputDir(outputDir)

  const verifiedArtifacts = await Promise.all(manifest.artifacts.map(async (artifact) => {
    const problems: string[] = []
    let localExists = false
    let sizeMatches = false
    let checksumMatches = false

    try {
      const current = await describeArtifact({
        key: artifact.key,
        label: artifact.label,
        path: artifact.path,
        kind: artifact.kind,
      })
      localExists = true
      sizeMatches = current.sizeBytes === artifact.sizeBytes
      checksumMatches = current.checksumSha256 === artifact.checksumSha256

      if (!sizeMatches) problems.push('Tamanho divergente')
      if (!checksumMatches) problems.push('Checksum divergente')
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error))
    }

    const storageCheck = await verifyStorageArtifact(artifact)
    if (artifact.storageStatus === 'uploaded' && !storageCheck.ok) {
      problems.push(storageCheck.error ?? 'Falha ao validar Storage')
    }

    return {
      ...artifact,
      localExists,
      sizeMatches,
      checksumMatches,
      storageOk: artifact.storageStatus === 'uploaded' ? storageCheck.ok : null,
      problems,
    }
  }))

  const allProblems = verifiedArtifacts.flatMap((artifact) => artifact.problems)

  return {
    ok: allProblems.length === 0,
    backupId,
    outputDir,
    verifiedAt: new Date().toISOString(),
    manifestPath,
    artifactsChecked: verifiedArtifacts.length,
    storageArtifactsChecked: verifiedArtifacts.filter((artifact) => artifact.storageStatus === 'uploaded').length,
    problems: allProblems,
    artifacts: verifiedArtifacts,
  }
}
