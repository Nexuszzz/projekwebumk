/**
 * Upload gambar → storage privat (bukan public/).
 * URL hasil: /api/media/file?key=...
 *
 * Body JSON: { dataUrl, businessId?, kind? }
 * Atau multipart form: field "file" (+ businessId, kind)
 */
import { getSessionUser, unauthorized } from '@/lib/server/auth'
import { ensureUserBusiness } from '@/lib/server/ensure-business'
import { ensureUploadsScaffold, saveBufferImage } from '@/lib/server/media-store'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/** Vercel body ~4.5MB — base64 ~33% lebih besar, jadi cap buffer 3.5MB */
const MAX_BYTES = 3.5 * 1024 * 1024

function jsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status })
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/)
  if (!match) return null
  try {
    const buffer = Buffer.from(match[2], 'base64')
    return { mime: match[1], buffer }
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  try {
    const contentType = request.headers.get('content-type') || ''
    let mime = 'image/jpeg'
    let buffer: Buffer | null = null
    let businessId: string | undefined
    let kindRaw = 'posters'

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('file')
      businessId = String(form.get('businessId') || request.headers.get('x-business-id') || '') || undefined
      kindRaw = String(form.get('kind') || 'posters')
      if (!(file instanceof File)) {
        return jsonResponse({ error: 'Field file wajib (multipart).' }, 400)
      }
      if (!file.type.startsWith('image/')) {
        return jsonResponse({ error: 'File harus gambar (PNG/JPG/WebP).' }, 400)
      }
      mime = file.type || 'image/jpeg'
      const ab = await file.arrayBuffer()
      buffer = Buffer.from(ab)
    } else {
      let body: { dataUrl?: string; businessId?: string; kind?: string }
      try {
        body = await request.json()
      } catch {
        return jsonResponse(
          {
            error:
              'Body JSON tidak valid / kosong. Biasanya gambar terlalu besar untuk upload. Coba foto lebih kecil.',
          },
          400,
        )
      }
      businessId = body.businessId || request.headers.get('x-business-id') || undefined
      kindRaw = body.kind || 'posters'
      const parsed = parseDataUrl(body.dataUrl || '')
      if (!parsed) {
        return jsonResponse({ error: 'Format gambar tidak valid. Upload PNG/JPG/WebP.' }, 400)
      }
      mime = parsed.mime
      buffer = parsed.buffer
    }

    if (!buffer || buffer.length < 32) {
      return jsonResponse({ error: 'File terlalu kecil atau kosong.' }, 400)
    }
    if (buffer.length > MAX_BYTES) {
      return jsonResponse(
        {
          error: `Gambar terlalu besar (${Math.round(buffer.length / 1024)} KB). Maks ~3.5 MB. Kompres dulu.`,
        },
        413,
      )
    }

    const snap = await ensureUserBusiness(user, businessId)
    if (!snap.ok) {
      return jsonResponse(
        { error: 'Belum ada usaha. Refresh dashboard lalu coba upload lagi.' },
        403,
      )
    }
    const ownedBusinessId = snap.business.id

    const kind =
      kindRaw === 'products' ? 'products' : kindRaw === 'misc' || kindRaw === 'logos' ? 'misc' : 'posters'

    await ensureUploadsScaffold()
    const saved = await saveBufferImage(buffer, mime, 'upload', {
      userId: user.id,
      businessId: ownedBusinessId,
      kind,
      filenamePrefix: 'upload',
    })

    return jsonResponse({
      url: saved.publicPath,
      localPath: saved.publicPath,
      key: saved.storageKey,
      bytes: saved.bytes,
      saved: true,
      permanent: Boolean(saved.permanent),
      businessId: ownedBusinessId,
    })
  } catch (error) {
    console.error('[media/upload]', error)
    const message =
      error instanceof Error
        ? error.message
        : 'Gagal upload gambar di server. Coba foto lebih kecil.'
    // EROFS / permission → pesan ramah
    if (/EROFS|read-only|EACCES|ENOENT/i.test(message)) {
      return jsonResponse(
        { error: 'Storage server tidak bisa menulis file. Coba lagi atau hubungi admin.' },
        500,
      )
    }
    return jsonResponse({ error: message }, 500)
  }
}
