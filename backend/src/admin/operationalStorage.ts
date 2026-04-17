import path from 'path'
import { readFile } from 'fs/promises'
import { supabase } from '../lib/supabase'
import type { ArtifactDescriptor } from '../lib/operationalArtifacts'

const STORAGE_BUCKET = process.env.OPERATIONAL_ARTIFACTS_BUCKET ?? 'operational-artifacts'

let bucketReady: boolean | null = null

function getContentType(kind: ArtifactDescriptor['kind']) {
  switch (kind) {
    case 'csv': return 'text/csv; charset=utf-8'
    case 'json': return 'application/json; charset=utf-8'
    case 'md': return 'text/markdown; charset=utf-8'
    case 'txt': return 'text/plain; charset=utf-8'
    default: return 'application/octet-stream'
  }
}

async function ensureBucket() {
  if (bucketReady != null) return bucketReady

  try {
    const { data, error } = await supabase.storage.getBucket(STORAGE_BUCKET)
    if (!error && data) {
      bucketReady = true
      return true
    }

    const created = await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: false,
      fileSizeLimit: '20MB',
    })

    if (created.error) {
      bucketReady = false
      console.warn(`[operational-storage] Failed to ensure bucket ${STORAGE_BUCKET}: ${created.error.message}`)
      return false
    }

    bucketReady = true
    return true
  } catch (error) {
    bucketReady = false
    console.warn('[operational-storage] Unexpected bucket setup error:', error)
    return false
  }
}

async function buildSignedUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 12)

  if (error) {
    return null
  }

  return data.signedUrl
}

export async function hydrateArtifactDownloadUrls(artifacts: ArtifactDescriptor[]) {
  return Promise.all(artifacts.map(async (artifact) => {
    if (!artifact.storagePath || artifact.storageStatus !== 'uploaded') {
      return artifact
    }

    return {
      ...artifact,
      downloadUrl: await buildSignedUrl(artifact.storagePath),
    }
  }))
}

export async function enrichArtifactsWithStorage(scope: string, artifacts: ArtifactDescriptor[]): Promise<ArtifactDescriptor[]> {
  const enabled = await ensureBucket()
  if (!enabled) {
    return artifacts.map((artifact) => ({
      ...artifact,
      storageBucket: STORAGE_BUCKET,
      storagePath: null,
      storageStatus: 'skipped',
      storageError: 'Bucket operacional indisponível',
      downloadUrl: null,
    }))
  }

  return Promise.all(artifacts.map(async (artifact) => {
    const buffer = await readFile(artifact.path)
    const storagePath = `${scope}/${path.basename(artifact.path)}`
    const upload = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: getContentType(artifact.kind),
        upsert: true,
      })

    if (upload.error) {
      return {
        ...artifact,
        storageBucket: STORAGE_BUCKET,
        storagePath,
        storageStatus: 'failed' as const,
        storageError: upload.error.message,
        downloadUrl: null,
      }
    }

    return {
      ...artifact,
      storageBucket: STORAGE_BUCKET,
      storagePath,
      storageStatus: 'uploaded' as const,
      storageError: null,
      downloadUrl: await buildSignedUrl(storagePath),
    }
  }))
}

export async function verifyStorageArtifact(artifact: ArtifactDescriptor) {
  if (!artifact.storagePath || artifact.storageStatus !== 'uploaded') {
    return {
      ok: artifact.storageStatus === 'skipped',
      error: artifact.storageStatus === 'skipped' ? null : 'Artefato sem caminho válido no Storage',
    }
  }

  const download = await supabase.storage
    .from(artifact.storageBucket ?? STORAGE_BUCKET)
    .download(artifact.storagePath)

  if (download.error || !download.data) {
    return {
      ok: false,
      error: download.error?.message ?? 'Não foi possível baixar o artefato do Storage',
    }
  }

  return {
    ok: true,
    error: null,
  }
}
