/**
 * Client HTTP untuk aiograpi-rest (Instagram Private API gateway).
 *
 * DEMO / INTERNAL ONLY:
 * - Tidak resmi Meta
 * - Risiko ban, challenge, 2FA
 * - Jangan minta password client production — simpan hanya session id
 *
 * Docker: docker compose up -d aiograpi
 * Docs:   http://localhost:8000/docs
 */

import { envTrim } from '@/lib/server/auth'

function baseUrl() {
  return (envTrim('AIOGRAPI_BASE_URL') || 'http://127.0.0.1:8000').replace(/\/$/, '')
}

export function aiograpiConfigured() {
  // Selalu "tersedia" di dev jika URL diset; health dicek terpisah
  return Boolean(envTrim('AIOGRAPI_BASE_URL') || process.env.NODE_ENV === 'development')
}

export function aiograpiBaseUrl() {
  return baseUrl()
}

export async function aiograpiHealth(): Promise<boolean> {
  const base = baseUrl()
  if (
    process.env.VERCEL &&
    (base.includes('127.0.0.1') || base.includes('localhost'))
  ) {
    return false
  }
  // openapi.json besar — prefer /docs (ringan). Timeout longgar dari Vercel → Railway.
  const paths = ['/docs', '/', '/openapi.json']
  for (const path of paths) {
    try {
      const res = await fetch(`${base}${path}`, {
        cache: 'no-store',
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(12_000),
      })
      if (res.ok || (res.status >= 300 && res.status < 400)) return true
      if (res.status === 401 || res.status === 403) return true
    } catch {
      // coba path berikutnya
    }
  }
  return false
}

/**
 * Normalisasi session id / cookie Instagram:
 * - trim & buang kutip
 * - decode %3A → : (cookie browser sering URL-encoded)
 * - jangan pakai placeholder UI
 */
export function normalizeSessionId(raw: string): string {
  let s = (raw || '').trim().replace(/^["']|["']$/g, '')
  if (!s || s === '••••••••' || s.includes('•')) return ''
  // Decode berulang sampai stabil (kadang double-encoded)
  for (let i = 0; i < 3; i++) {
    try {
      const d = decodeURIComponent(s)
      if (d === s) break
      s = d
    } catch {
      break
    }
  }
  return s.trim()
}

function sessionHeaders(sessionId: string): HeadersInit {
  return {
    Accept: 'application/json',
    'X-Session-ID': normalizeSessionId(sessionId),
  }
}

function extractSessionFromResponse(text: string): string {
  let parsed: unknown = text
  try {
    parsed = JSON.parse(text)
  } catch {
    /* plain string body */
  }
  let sessionId = ''
  if (typeof parsed === 'string') {
    sessionId = parsed
  } else if (parsed && typeof parsed === 'object') {
    const o = parsed as Record<string, unknown>
    sessionId = String(
      o.sessionid || o.session_id || o.sessionId || o.id || o.detail || '',
    )
  }
  if (!sessionId) sessionId = text
  return normalizeSessionId(sessionId)
}

/** Pastikan session masih valid di gateway (GET /account) */
export async function aiograpiVerifySession(
  sessionId: string,
): Promise<{ ok: true; username?: string } | { ok: false; error: string }> {
  const sid = normalizeSessionId(sessionId)
  if (!sid) return { ok: false, error: 'Session id kosong.' }
  try {
    const res = await fetch(`${baseUrl()}/account`, {
      headers: sessionHeaders(sid),
      cache: 'no-store',
    })
    const text = await res.text()
    let data: Record<string, unknown> = {}
    try {
      data = JSON.parse(text) as Record<string, unknown>
    } catch {
      data = { raw: text }
    }
    if (!res.ok) {
      const detail = data.detail ?? data.message ?? text
      const msg = typeof detail === 'string' ? detail : JSON.stringify(detail)
      if (/login_required/i.test(msg)) {
        return {
          ok: false,
          error:
            'login_required: session IG sudah tidak valid / kadaluarsa. Ambil sessionid baru dari browser (logout-login IG), lalu tempel lagi.',
        }
      }
      return { ok: false, error: msg.slice(0, 400) || `HTTP ${res.status}` }
    }
    const username = String(data.username || data.full_name || '')
    return { ok: true, username: username || undefined }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Gagal verifikasi session',
    }
  }
}

/**
 * Login username+password → session id (string).
 * Response aiograpi-rest: sering plain string session id, kadang JSON.
 */
export async function aiograpiLogin(input: {
  username: string
  password: string
  verificationCode?: string
}): Promise<{ sessionId: string; raw?: unknown }> {
  const body = new URLSearchParams()
  body.set('username', input.username.replace(/^@/, '').trim())
  body.set('password', input.password)
  if (input.verificationCode?.trim()) {
    body.set('verification_code', input.verificationCode.trim())
  }

  let res: Response
  try {
    res = await fetch(`${baseUrl()}/auth/login`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      cache: 'no-store',
    })
  } catch (error) {
    throw new Error(
      `aiograpi-rest tidak terjangkau di ${baseUrl()}. Jalankan: docker compose up -d aiograpi. ${
        error instanceof Error ? error.message : ''
      }`,
    )
  }

  const text = await res.text()
  let parsed: unknown = text
  try {
    parsed = JSON.parse(text)
  } catch {
    // plain session string
  }

  if (!res.ok) {
    const msg =
      typeof parsed === 'object' && parsed && 'detail' in parsed
        ? JSON.stringify((parsed as { detail: unknown }).detail)
        : text.slice(0, 400)
    throw new Error(
      msg ||
        `Login IG gagal (HTTP ${res.status}). Cek username/password, 2FA, atau challenge Instagram.`,
    )
  }

  const sessionId = extractSessionFromResponse(text)
  if (!sessionId || sessionId.length < 8) {
    throw new Error('Gateway tidak mengembalikan session id yang valid.')
  }

  // Verifikasi session benar-benar hidup di gateway
  const check = await aiograpiVerifySession(sessionId)
  if (!check.ok) {
    throw new Error(check.error)
  }

  return { sessionId, raw: parsed }
}

/** Login lewat cookie sessionid Instagram (lebih aman daripada password berulang) */
export async function aiograpiLoginBySessionCookie(sessionid: string): Promise<string> {
  const cookie = normalizeSessionId(sessionid)
  if (!cookie) throw new Error('Session cookie kosong atau tidak valid.')

  const body = new URLSearchParams()
  // Field wajib: sessionid (cookie Instagram, sudah di-decode)
  body.set('sessionid', cookie)

  const res = await fetch(`${baseUrl()}/auth/login/by/sessionid`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    cache: 'no-store',
  })
  const text = await res.text()
  if (!res.ok) {
    let detail = text.slice(0, 400)
    try {
      const j = JSON.parse(text)
      detail = JSON.stringify(j.detail || j)
    } catch {
      /* ignore */
    }
    throw new Error(
      detail ||
        `Import session gagal (HTTP ${res.status}). Ambil sessionid baru dari browser yang masih login IG.`,
    )
  }

  // Response = session id untuk header X-Session-ID (bisa sama dengan cookie)
  let sessionId = extractSessionFromResponse(text)
  // Beberapa build mengembalikan boolean true — fallback pakai cookie yang di-import
  if (!sessionId || sessionId === 'true' || sessionId === 'false') {
    sessionId = cookie
  }

  const check = await aiograpiVerifySession(sessionId)
  if (!check.ok) {
    // Coba verifikasi pakai cookie mentah (decode)
    const check2 = await aiograpiVerifySession(cookie)
    if (!check2.ok) {
      throw new Error(
        `${check.error} Session cookie sering kadaluarsa — login ulang di Chrome, salin sessionid lagi.`,
      )
    }
    return cookie
  }

  return sessionId
}

export async function aiograpiUploadPhoto(input: {
  sessionId: string
  /** Remote HTTPS URL or path that gateway can fetch */
  imageUrl?: string
  /** Raw image bytes as Blob/Buffer path — use FormData file */
  imageBuffer?: Buffer
  filename?: string
  contentType?: string
  caption: string
}): Promise<{ ok: true; media?: unknown } | { ok: false; error: string }> {
  try {
    // Prefer by URL when public HTTPS
    if (input.imageUrl && /^https:\/\//i.test(input.imageUrl)) {
      const body = new URLSearchParams()
      body.set('url', input.imageUrl)
      body.set('caption', input.caption.slice(0, 2200))
      const res = await fetch(`${baseUrl()}/photo/upload/by/url`, {
        method: 'POST',
        headers: {
          ...sessionHeaders(input.sessionId),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail =
          (data as { detail?: unknown }).detail ??
          (data as { message?: unknown }).message ??
          data
        const msg =
          typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 400)
        if (/login_required/i.test(msg)) {
          return {
            ok: false,
            error:
              'login_required — session Instagram hangus. Tempel sessionid baru di Pengaturan → Instagram.',
          }
        }
        return {
          ok: false,
          error: msg || `Upload gagal HTTP ${res.status}`,
        }
      }
      return { ok: true, media: data }
    }

    if (!input.imageBuffer) {
      return {
        ok: false,
        error: 'Butuh imageUrl HTTPS publik atau file buffer untuk upload private API.',
      }
    }

    const form = new FormData()
    const blob = new Blob([new Uint8Array(input.imageBuffer)], {
      type: input.contentType || 'image/jpeg',
    })
    form.append('file', blob, input.filename || 'upload.jpg')
    form.append('caption', input.caption.slice(0, 2200))

    const res = await fetch(`${baseUrl()}/photo/upload`, {
      method: 'POST',
      headers: sessionHeaders(input.sessionId),
      body: form,
      cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const detail =
        (data as { detail?: unknown }).detail ??
        (data as { message?: unknown }).message ??
        data
      const msg =
        typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 400)
      if (/login_required/i.test(msg)) {
        return {
          ok: false,
          error:
            'login_required — session Instagram sudah hangus. Buka Pengaturan → Instagram → Demo Private API → tempel sessionid baru dari browser (Application → Cookies → sessionid).',
        }
      }
      return {
        ok: false,
        error: msg || `Upload gagal HTTP ${res.status}`,
      }
    }
    return { ok: true, media: data }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Upload private API error',
    }
  }
}

/**
 * Deteksi magic bytes gambar.
 * File non-image (HTML/JSON error dari /api/media tanpa cookie) sering jadi penyebab
 * "cannot identify image file" di Pillow.
 */
function sniffImage(buf: Buffer): { ok: true; kind: 'jpeg' | 'png' | 'webp' | 'gif' } | { ok: false } {
  if (buf.length < 12) return { ok: false }
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ok: true, kind: 'jpeg' }
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { ok: true, kind: 'png' }
  }
  // GIF
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return { ok: true, kind: 'gif' }
  // WEBP: RIFF....WEBP
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return { ok: true, kind: 'webp' }
  }
  return { ok: false }
}

/**
 * Baca gambar konten + konversi ke JPEG (IG/Pillow-friendly).
 * - Prefer baca dari disk (storage/public) — hindari fetch /api/media tanpa cookie
 * - Support data URL
 * - Konversi PNG/WebP → JPEG via sharp
 */
export async function fetchImageBuffer(imageUrl: string): Promise<{
  buffer: Buffer
  contentType: string
  filename: string
}> {
  const { resolveExistingMediaFile, parseMediaKey } = await import('@/lib/server/media-store')
  const { promises: fsp } = await import('fs')
  const path = await import('path')

  let raw: Buffer | null = null

  // 1) data URL
  if (imageUrl.startsWith('data:image/')) {
    const m = /^data:image\/[a-zA-Z0-9+.-]+;base64,([\s\S]+)$/.exec(imageUrl)
    if (!m) throw new Error('Data URL gambar tidak valid.')
    raw = Buffer.from(m[1], 'base64')
  }

  // 2) local storage / public path
  if (!raw) {
    const key = parseMediaKey(imageUrl)
    if (key) {
      const abs = await resolveExistingMediaFile(key)
      if (abs) raw = await fsp.readFile(abs)
    }
  }

  // 3) /products/... public
  if (!raw && imageUrl.startsWith('/products/')) {
    const abs = path.join(process.cwd(), 'public', imageUrl.replace(/^\//, ''))
    try {
      raw = await fsp.readFile(abs)
    } catch {
      /* continue */
    }
  }

  // 4) absolute file under public/uploads
  if (!raw && imageUrl.startsWith('/uploads/')) {
    const abs = path.join(process.cwd(), 'public', imageUrl.replace(/^\//, ''))
    try {
      raw = await fsp.readFile(abs)
    } catch {
      /* continue */
    }
  }

  // 5) HTTP(S) last — only if looks like real remote URL
  if (!raw && /^https?:\/\//i.test(imageUrl)) {
    let url = imageUrl.replace('host.docker.internal', '127.0.0.1')
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`Gagal unduh gambar sumber (${res.status})`)
    raw = Buffer.from(await res.arrayBuffer())
  }

  // 6) relative app URL /api/media — coba parse key lagi dengan full path
  if (!raw && imageUrl.includes('/api/media/file')) {
    try {
      const u = new URL(imageUrl, 'http://local')
      const key = u.searchParams.get('key')
      if (key) {
        const abs = await resolveExistingMediaFile(key)
        if (abs) raw = await fsp.readFile(abs)
      }
    } catch {
      /* ignore */
    }
  }

  if (!raw || raw.length < 32) {
    throw new Error(
      'Gambar konten tidak ditemukan di disk. Generate ulang poster, atau pastikan file media masih ada.',
    )
  }

  // Validasi magic bytes — deteksi HTML/JSON error page
  const sniff = sniffImage(raw)
  if (!sniff.ok) {
    const head = raw.subarray(0, 80).toString('utf8')
    if (head.includes('{') || head.includes('<!DOCTYPE') || head.includes('<html')) {
      throw new Error(
        'File sumber bukan gambar (dapat HTML/JSON). Biasanya /api/media tanpa auth. Coba generate poster lagi.',
      )
    }
    throw new Error('File gambar korup atau format tidak dikenali.')
  }

  // Konversi ke JPEG (Instagram private API / Pillow paling stabil dengan JPG)
  try {
    const sharp = (await import('sharp')).default
    let pipeline = sharp(raw).rotate() // honor EXIF
    const meta = await pipeline.metadata()
    // IG suka rasio wajar; jangan crop agresif — hanya pastikan min size
    const w = meta.width || 1080
    const h = meta.height || 1080
    if (w < 320 || h < 320) {
      pipeline = pipeline.resize({
        width: Math.max(w, 1080),
        height: Math.max(h, 1080),
        fit: 'inside',
        withoutEnlargement: false,
      })
    }
    const jpeg = await pipeline
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer()

    if (!sniffImage(jpeg).ok) {
      throw new Error('Konversi JPEG gagal.')
    }

    return {
      buffer: jpeg,
      contentType: 'image/jpeg',
      filename: 'umkman-ig.jpg',
    }
  } catch (error) {
    // Fallback tanpa sharp: kirim original hanya jika JPEG murni
    if (sniff.ok && sniff.kind === 'jpeg') {
      return {
        buffer: raw,
        contentType: 'image/jpeg',
        filename: 'umkman-ig.jpg',
      }
    }
    throw new Error(
      `Gagal siapkan JPEG untuk Instagram: ${
        error instanceof Error ? error.message : 'unknown'
      }. Install sharp: npm i sharp`,
    )
  }
}
