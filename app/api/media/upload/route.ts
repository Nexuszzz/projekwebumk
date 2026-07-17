/**
 * Upload gambar → storage privat (bukan public/).
 * URL hasil: /api/media/file?key=...
 */
import { getSessionUser, unauthorized } from '@/lib/server/auth'
import { getSnapshot } from '@/lib/server/db'
import { ensureUploadsScaffold, saveBufferImage } from '@/lib/server/media-store'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MAX_BYTES = 12 * 1024 * 1024

function jsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  let body: { dataUrl?: string; businessId?: string; kind?: string }
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Permintaan tidak valid.' }, 400)
  }

  const dataUrl = body.dataUrl || ''
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) {
    return jsonResponse({ error: 'Format gambar tidak valid. Upload PNG/JPG/WebP.' }, 400)
  }

  const mime = match[1]
  const base64 = match[2]
  let buffer: Buffer
  try {
    buffer = Buffer.from(base64, 'base64')
  } catch {
    return jsonResponse({ error: 'Data gambar rusak.' }, 400)
  }
  if (buffer.length < 32) return jsonResponse({ error: 'File terlalu kecil.' }, 400)
  if (buffer.length > MAX_BYTES) return jsonResponse({ error: 'Maksimal 12 MB.' }, 413)

  const requestedBiz = body.businessId || request.headers.get('x-business-id')
  let ownedBusinessId = 'general'
  try {
    const db = await getSnapshot(requestedBiz, user.id)
    ownedBusinessId = db.id
  } catch {
    return jsonResponse({ error: 'Usaha tidak ditemukan atau bukan milik Anda.' }, 403)
  }

  const kind =
    body.kind === 'products' ? 'products' : body.kind === 'misc' || body.kind === 'logos' ? 'misc' : 'posters'

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
    businessId: ownedBusinessId,
  })
}
