/**
 * Media storage — file di `storage/uploads` (di luar public).
 * Akses lewat /api/media/file?key=... (butuh login + ownership).
 * Path legacy /uploads/... di public/ tetap didukung baca.
 */

import { promises as fs } from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'

const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'uploads')
const LEGACY_PUBLIC_ROOT = path.join(process.cwd(), 'public', 'uploads')

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
  /** Path aplikasi untuk <img src> — /api/media/file?key=... */
  publicPath: string
  /** Relative key di storage, mis. posters/user-x/biz-y/file.png */
  storageKey: string
  absolutePath: string
  bytes: number
  contentType: string
  sourceUrl?: string
}

export function mediaUrlFromKey(key: string) {
  return `/api/media/file?key=${encodeURIComponent(key)}`
}

/** Parse key dari publicPath atau key mentah. */
export function parseMediaKey(input: string): string | null {
  const raw = (input || '').trim()
  if (!raw) return null
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

export function resolveStorageAbsolute(key: string): { abs: string; legacy: boolean } | null {
  const clean = parseMediaKey(key)
  if (!clean) return null
  const normalized = path.normalize(clean).replace(/^(\.\.(\/|\\|$))+/, '')
  if (normalized.includes('..')) return null
  const primary = path.join(STORAGE_ROOT, normalized)
  const legacy = path.join(LEGACY_PUBLIC_ROOT, normalized)
  return { abs: primary, legacy: false, /* check exists later */ }
}

export async function resolveExistingMediaFile(key: string): Promise<string | null> {
  const clean = parseMediaKey(key)
  if (!clean) return null
  const normalized = path.normalize(clean).replace(/^(\.\.(\/|\\|$))+/, '')
  if (normalized.includes('..')) return null
  const primary = path.join(STORAGE_ROOT, normalized)
  try {
    await fs.access(primary)
    return primary
  } catch {
    // fallthrough
  }
  const legacy = path.join(LEGACY_PUBLIC_ROOT, normalized)
  try {
    await fs.access(legacy)
    return legacy
  } catch {
    return null
  }
}

/** Key format: kind/userId/businessId/filename — userId di segmen 2 */
export function mediaKeyOwnerUserId(key: string): string | null {
  const clean = parseMediaKey(key)
  if (!clean) return null
  const parts = clean.split(/[/\\]/).filter(Boolean)
  // kind / userSeg / bizSeg / file
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

  const dir = path.join(STORAGE_ROOT, kind, userSeg, bizSeg)
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
  }
}

export async function ensureUploadsScaffold() {
  await fs.mkdir(path.join(STORAGE_ROOT, 'posters'), { recursive: true })
  await fs.mkdir(path.join(STORAGE_ROOT, 'misc'), { recursive: true })
  await fs.mkdir(path.join(STORAGE_ROOT, 'products'), { recursive: true })
}
