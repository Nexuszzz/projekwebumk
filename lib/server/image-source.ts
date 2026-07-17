/**
 * Resolve product photos for AI (Gemini vision).
 * Supports: data URL, public local path (/products/.., /uploads/..), localhost URLs.
 * Genity cloud CANNOT fetch localhost — use Gemini describe instead for local images.
 */

import { promises as fs } from 'fs'
import path from 'path'

export type ResolvedImage = {
  mimeType: string
  base64: string
  /** true if this is a URL Genity's servers can fetch */
  isPublicRemote: boolean
  publicUrl?: string
  source: 'data-url' | 'local-file' | 'remote'
}

const PUBLIC_ROOT = path.join(process.cwd(), 'public')
const MAX_BYTES = 8 * 1024 * 1024

function mimeFromExt(ext: string) {
  const e = ext.toLowerCase().replace(/^\./, '')
  if (e === 'png') return 'image/png'
  if (e === 'webp') return 'image/webp'
  if (e === 'gif') return 'image/gif'
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg'
  return 'image/png'
}

function isLocalhostUrl(url: string) {
  try {
    const u = new URL(url)
    return (
      u.hostname === 'localhost' ||
      u.hostname === '127.0.0.1' ||
      u.hostname === '0.0.0.0' ||
      u.hostname.endsWith('.local')
    )
  } catch {
    return false
  }
}

/** Strip origin → path for localhost, e.g. http://localhost:3000/products/x.webp → /products/x.webp */
function localhostToPath(url: string): string | null {
  try {
    const u = new URL(url)
    if (!isLocalhostUrl(url)) return null
    return u.pathname || null
  } catch {
    return null
  }
}

async function readLocalPublicPath(publicPath: string): Promise<ResolvedImage | null> {
  const clean = publicPath.split('?')[0].split('#')[0]
  if (!clean.startsWith('/') || clean.includes('..')) return null
  const absolute = path.resolve(PUBLIC_ROOT, clean.replace(/^\//, '').replace(/\//g, path.sep))
  const rootResolved = path.resolve(PUBLIC_ROOT)
  // Must stay under public/ (Windows-safe)
  if (absolute !== rootResolved && !absolute.startsWith(rootResolved + path.sep)) return null
  try {
    const buffer = await fs.readFile(absolute)
    if (buffer.length < 32 || buffer.length > MAX_BYTES) return null
    const ext = path.extname(absolute)
    return {
      mimeType: mimeFromExt(ext),
      base64: buffer.toString('base64'),
      isPublicRemote: false,
      source: 'local-file',
    }
  } catch {
    return null
  }
}

/**
 * Resolve any image source the client might send into bytes for Gemini vision.
 */
export async function resolveImageSource(input?: string | null): Promise<ResolvedImage | null> {
  if (!input || typeof input !== 'string') return null
  const raw = input.trim()
  if (!raw) return null

  // data:image/...;base64,...
  if (raw.startsWith('data:image/')) {
    const match = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    if (!match) return null
    const mimeType = match[1]
    const base64 = match[2]
    if (base64.length < 32) return null
    // rough size check (base64 ~ 4/3 of bytes)
    if ((base64.length * 3) / 4 > MAX_BYTES) return null
    return {
      mimeType,
      base64,
      isPublicRemote: false,
      source: 'data-url',
    }
  }

  // Absolute http(s)
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    const localPath = localhostToPath(raw)
    if (localPath) {
      return readLocalPublicPath(localPath)
    }
    // Public remote — Genity can use this URL; also fetch for vision if needed
    try {
      const res = await fetch(raw, { signal: AbortSignal.timeout(20_000) })
      if (!res.ok) return null
      const contentType = res.headers.get('content-type') || 'image/jpeg'
      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length < 32 || buffer.length > MAX_BYTES) return null
      const mimeType = contentType.startsWith('image/')
        ? contentType.split(';')[0]
        : mimeFromExt(raw.split('?')[0].split('.').pop() || 'jpg')
      return {
        mimeType,
        base64: buffer.toString('base64'),
        isPublicRemote: true,
        publicUrl: raw,
        source: 'remote',
      }
    } catch {
      return null
    }
  }

  // Private media API path: /api/media/file?key=kind/user/biz/file.png
  if (raw.startsWith('/api/media/file') || raw.includes('key=')) {
    try {
      const { resolveExistingMediaFile, parseMediaKey } = await import('@/lib/server/media-store')
      const key = parseMediaKey(raw)
      if (key) {
        const abs = await resolveExistingMediaFile(key)
        if (abs) {
          const buffer = await fs.readFile(abs)
          if (buffer.length >= 32 && buffer.length <= MAX_BYTES) {
            return {
              mimeType: mimeFromExt(path.extname(abs)),
              base64: buffer.toString('base64'),
              isPublicRemote: false,
              source: 'local-file',
            }
          }
        }
      }
    } catch {
      // fallthrough
    }
  }

  // Relative public path: /products/... or legacy /uploads/...
  if (raw.startsWith('/')) {
    return readLocalPublicPath(raw)
  }

  return null
}

/** Only URLs Genity cloud can fetch (not localhost / data URL). */
export function isGenityFetchableUrl(url?: string | null): boolean {
  if (!url?.startsWith('http')) return false
  return !isLocalhostUrl(url)
}
