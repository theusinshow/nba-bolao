import { createHash } from 'crypto'
import { mkdir, readFile, stat, writeFile } from 'fs/promises'
import path from 'path'
import { BRT_TIMEZONE } from './constants'

export type ArtifactKind = 'csv' | 'json' | 'md' | 'txt'

export interface ArtifactDefinition {
  key: string
  label: string
  path: string
  kind: ArtifactKind
}

export interface ArtifactDescriptor {
  key: string
  label: string
  path: string
  kind: ArtifactKind
  sizeBytes: number
  checksumSha256: string
  storageBucket?: string | null
  storagePath?: string | null
  storageStatus?: 'uploaded' | 'skipped' | 'failed'
  storageError?: string | null
  downloadUrl?: string | null
}

export interface ArtifactValidation {
  ok: boolean
  fileCount: number
  totalBytes: number
  verifiedAt: string
  missingFiles: string[]
}

export function getRepoRoot() {
  return path.resolve(__dirname, '../../..')
}

export function formatTimestampParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: BRT_TIMEZONE,
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

export async function writeJsonFile(filePath: string, data: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

async function computeSha256(filePath: string) {
  const buffer = await readFile(filePath)
  return createHash('sha256').update(buffer).digest('hex')
}

export async function describeArtifact(definition: ArtifactDefinition): Promise<ArtifactDescriptor> {
  const fileStats = await stat(definition.path)

  return {
    key: definition.key,
    label: definition.label,
    path: definition.path,
    kind: definition.kind,
    sizeBytes: fileStats.size,
    checksumSha256: await computeSha256(definition.path),
  }
}

export async function describeArtifacts(definitions: ArtifactDefinition[]) {
  return Promise.all(definitions.map((definition) => describeArtifact(definition)))
}

export function validateArtifacts(artifacts: ArtifactDescriptor[]): ArtifactValidation {
  return {
    ok: artifacts.length > 0 && artifacts.every((artifact) => artifact.sizeBytes > 0),
    fileCount: artifacts.length,
    totalBytes: artifacts.reduce((sum, artifact) => sum + artifact.sizeBytes, 0),
    verifiedAt: new Date().toISOString(),
    missingFiles: [],
  }
}
