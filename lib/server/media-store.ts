/**
 * Media storage:
 * - Production (BLOB_READ_WRITE_TOKEN): Vercel Blob — URL publik permanen
 * - Lokal: storage/uploads (disk)
 * - Fallback serverless tanpa token: /tmp (ephemeral, jangan andalkan)
 *
 * publicPath bisa:
 * - https://….public.blob.vercel-storage.com/…  (permanen)
 * - /api/media/file?key=…                       (disk lokal/tmp)
 */

import { promises as fs } from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'
import { put } from '@vercel/blob'
import { envTrim } from '@/lib/server/auth'
import { isServerlessEphemeral } from '@/lib/server/data-paths'

const LEGACY_PUBLIC_ROOT = path.join(/* turbopackIgnore: true */ process.cwd(), 'public', 'uploads')
const LOCAL_STORAGE_ROOT = path.join(/* turbopackIgnore: true */ process.cwd(), 'storage', 'uploads')
const TMP_STORAGE_ROOT = path.join('/tmp', 'umkman-uploads')

export function blobConfigured() {
  // Static token (CLI/local) ATAU OIDC di Vercel (BLOB_STORE_ID + VERCEL_OIDC_TOKEN)
  return Boolean(envTrim('BLOB_READ_WRITE_TOKEN') || envTrim('BLOB_STORE_ID'))
}

/** Root writable untuk write disk. */
export function storageRoot() {
  return isServerlessEphemeral() ? TMP_STORAGE_ROOT : LOCAL_STORAGE_ROOT
}

function readRoots() {
  return [storageRoot(), LOCAL_STORAGE_ROOT, LEGACY_PUBLIC_ROOT]
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'default'
}

function extFromContentType(contentType: string | null, fallbackUrl: string) {
  const ct = (contentType || '').toLowerCase()
  if (ct.includes('png')) return 'png'
  if (ct.includes('webp')) return 'webp'
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg'
  if (ct.includes('gif')) return 'gif'
  const fromUrl = fallbackUrl.split('?')[0].split('.').pop()?.toLowerCase()
  if (fromUrl && ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(fromUrl)) {
    return fromUrl === 'jpeg' ? 'jpg' : fromUrl
  }
  return 'png'
}

export type SavedMedia = {
  /** URL/path untuk <img src> — blob URL atau /api/media/file?key=… */
  publicPath: string
  /** Relative key di storage, mis. posters/user-x/biz-y/file.png */
  storageKey: string
  absolutePath: string
  bytes: number
  contentType: string
  sourceUrl?: string
  /** true jika disimpan di Vercel Blob (permanen) */
  permanent?: boolean
}

export function mediaUrlFromKey(key: string) {
  return `/api/media/file?key=${encodeURIComponent(key)}`
}

export function isPermanentMediaUrl(url: string): boolean {
  const u = (url || '').trim()
  return (
    u.startsWith('https://') &&
    (u.includes('.public.blob.vercel-storage.com') ||
      u.includes('blob.vercel-storage.com') ||
      u.includes('amazonaws.com') ||
      u.includes('r2.cloudflarestorage.com'))
  )
}

/** Parse key dari publicPath atau key mentah. */
export function parseMediaKey(input: string): string | null {
  const raw = (input || '').trim()
  if (!raw) return null
  if (raw.startsWith('http://') || raw.startsWith('https://')) return null
  if (raw.startsWith('/api/media/file')) {
    try {
      const u = new URL(raw, 'http://local')
      return u.searchParams.get('key')
    } catch {
      return null
    }
  }
  if (raw.startsWith('/uploads/')) {
    return raw.replace(/^\/uploads\//, '')
  }
  if (!raw.includes('..') && !path.isAbsolute(raw)) {
    return raw.replace(/^\/+/, '')
  }
  return null
}

function normalizeKey(key: string): string | null {
  const clean = parseMediaKey(key)
  if (!clean) return null
  const normalized = path.normalize(clean).replace(/^(\.\.(\/|\\|$))+/, '')
  if (normalized.includes('..')) return null
  return normalized
}

export function resolveStorageAbsolute(key: string): { abs: string; legacy: boolean } | null {
  const normalized = normalizeKey(key)
  if (!normalized) return null
  const primary = path.join(storageRoot(), normalized)
  return { abs: primary, legacy: false }
}

export async function resolveExistingMediaFile(key: string): Promise<string | null> {
  const normalized = normalizeKey(key)
  if (!normalized) return null
  for (const root of readRoots()) {
    const abs = path.join(root, normalized)
    try {
      await fs.access(abs)
      return abs
    } catch {
      // try next
    }
  }
  return null
}

/** Key format: kind/userId/businessId/filename — userId di segmen 2 */
export function mediaKeyOwnerUserId(key: string): string | null {
  const clean = parseMediaKey(key)
  if (!clean) return null
  const parts = clean.split(/[/\\]/).filter(Boolean)
  if (parts.length < 3) return null
  return parts[1] || null
}

export async function saveRemoteImage(
  remoteUrl: string,
  options: {
    userId: string
    businessId?: string | null
    kind?: 'posters' | 'products' | 'misc'
    filenamePrefix?: string
  },
): Promise<SavedMedia> {
  if (!remoteUrl.startsWith('http://') && !remoteUrl.startsWith('https://')) {
    throw new Error('URL gambar tidak valid.')
  }

  // Sudah permanent public URL — tidak perlu re-upload
  if (isPermanentMediaUrl(remoteUrl)) {
    return {
      publicPath: remoteUrl,
      storageKey: remoteUrl,
      absolutePath: '',
      bytes: 0,
      contentType: 'image/*',
      sourceUrl: remoteUrl,
      permanent: true,
    }
  }

  const response = await fetch(remoteUrl, {
    signal: AbortSignal.timeout(60_000),
  })
  if (!response.ok) {
    throw new Error(`Gagal mengunduh gambar (${response.status}).`)
  }

  const contentType = response.headers.get('content-type') || 'image/png'
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length < 32) throw new Error('File gambar kosong atau rusak.')
  if (buffer.length > 25 * 1024 * 1024) throw new Error('Gambar terlalu besar (>25MB).')

  return saveBufferImage(buffer, contentType, remoteUrl, options)
}

export async function saveBufferImage(
  buffer: Buffer,
  contentType: string,
  sourceLabel: string,
  options: {
    userId: string
    businessId?: string | null
    kind?: 'posters' | 'products' | 'misc'
    filenamePrefix?: string
  },
): Promise<SavedMedia> {
  const kind = options.kind || 'posters'
  const userSeg = safeSegment(options.userId)
  const bizSeg = options.businessId ? safeSegment(options.businessId) : 'general'
  const ext = extFromContentType(contentType, sourceLabel)
  const stamp = Date.now()
  const rand = randomBytes(4).toString('hex')
  const prefix = safeSegment(options.filenamePrefix || 'poster')
  const filename = `${prefix}-${stamp}-${rand}.${ext}`
  const storageKey = `${kind}/${userSeg}/${bizSeg}/${filename}`

  // 1) Vercel Blob — permanen, cocok production multi-tenant
  if (blobConfigured()) {
    const putOpts: Parameters<typeof put>[2] = {
      access: 'public',
      contentType: contentType.startsWith('image/')
        ? contentType
        : `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      addRandomSuffix: false,
    }
    const rw = envTrim('BLOB_READ_WRITE_TOKEN')
    if (rw) putOpts.token = rw
    // Tanpa token: SDK pakai OIDC (BLOB_STORE_ID + VERCEL_OIDC_TOKEN di Vercel)
    const storeId = envTrim('BLOB_STORE_ID')
    if (storeId && !rw) putOpts.storeId = storeId

    const blob = await put(storageKey, buffer, putOpts)
    return {
      publicPath: blob.url,
      storageKey,
      absolutePath: '',
      bytes: buffer.length,
      contentType,
      sourceUrl: sourceLabel.startsWith('http') ? sourceLabel : undefined,
      permanent: true,
    }
  }

  // 2) Disk (lokal /tmp)
  if (isServerlessEphemeral() && !blobConfigured()) {
    console.warn(
      '[media-store] BLOB_READ_WRITE_TOKEN belum di-set — gambar disimpan di /tmp (bisa hilang).',
    )
  }

  const root = storageRoot()
  const dir = path.join(root, kind, userSeg, bizSeg)
  await fs.mkdir(dir, { recursive: true })
  const absolutePath = path.join(dir, filename)
  await fs.writeFile(absolutePath, buffer)

  return {
    publicPath: mediaUrlFromKey(storageKey),
    storageKey,
    absolutePath,
    bytes: buffer.length,
    contentType,
    sourceUrl: sourceLabel.startsWith('http') ? sourceLabel : undefined,
    permanent: false,
  }
}

export async function ensureUploadsScaffold() {
  if (blobConfigured()) return
  const root = storageRoot()
  await fs.mkdir(path.join(root, 'posters'), { recursive: true })
  await fs.mkdir(path.join(root, 'misc'), { recursive: true })
  await fs.mkdir(path.join(root, 'products'), { recursive: true })
}
