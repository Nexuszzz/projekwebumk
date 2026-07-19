import { appUrl, getSessionUser, unauthorized } from '@/lib/server/auth'
import { getSnapshotForUser, updateContent } from '@/lib/server/db'
import {
  aiograpiHealth,
  aiograpiUploadPhoto,
  aiograpiVerifySession,
  fetchImageBuffer,
  normalizeSessionId,
} from '@/lib/server/aiograpi-client'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Post feed lewat aiograpi-rest (private API) memakai session usaha.
 * Body: { contentId, businessId?, caption? }
 */
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const body = (await request.json().catch(() => ({}))) as {
    contentId?: string
    businessId?: string
    caption?: string
  }

  if (!body.contentId) {
    return NextResponse.json({ error: 'contentId wajib.' }, { status: 400 })
  }

  const healthy = await aiograpiHealth()
  if (!healthy) {
    const base = process.env.AIOGRAPI_BASE_URL || ''
    return NextResponse.json(
      {
        error: base
          ? `Gateway Instagram private offline (${base.replace(/\/$/, '')}).`
          : 'Gateway Instagram private belum dikonfigurasi (AIOGRAPI_BASE_URL). Atau pakai mode Graph API / bantu di Pengaturan Instagram.',
      },
      { status: 503 },
    )
  }

  const snap = await getSnapshotForUser(user.id, body.businessId)
  if (!snap.ok) {
    return NextResponse.json({ error: 'Belum ada usaha.' }, { status: 400 })
  }

  const sessionId = normalizeSessionId(
    snap.business.profile.instagram?.privateSessionId || '',
  )
  if (!sessionId || sessionId.includes('•')) {
    return NextResponse.json(
      {
        error:
          'Belum ada session private API yang valid. Pengaturan → Instagram → Demo Private API → tempel sessionid lagi.',
      },
      { status: 400 },
    )
  }

  // Cek session masih hidup sebelum upload (hindari error samar)
  const alive = await aiograpiVerifySession(sessionId)
  if (!alive.ok) {
    return NextResponse.json(
      {
        error: alive.error,
        hint: 'Session hangus. Ambil sessionid baru: Chrome → instagram.com → F12 → Application → Cookies → sessionid → salin Value (boleh yang ada %3A, kami decode otomatis).',
      },
      { status: 401 },
    )
  }

  const item = snap.business.contents.find((c) => c.id === body.contentId)
  if (!item) {
    return NextResponse.json({ error: 'Konten tidak ditemukan.' }, { status: 404 })
  }

  const caption = (body.caption ?? item.description ?? item.title).trim()
  let imageUrl = item.image || ''
  if (imageUrl.startsWith('/')) {
    imageUrl = `${appUrl()}${imageUrl}`
  }

  // Selalu kirim multipart JPEG valid (bukan URL mentah / webp / file auth-protected)
  let result: Awaited<ReturnType<typeof aiograpiUploadPhoto>>
  try {
    const file = await fetchImageBuffer(item.image || imageUrl)
    result = await aiograpiUploadPhoto({
      sessionId,
      imageBuffer: file.buffer,
      contentType: 'image/jpeg',
      filename: 'umkman-ig.jpg',
      caption,
    })
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : 'Gagal menyiapkan gambar',
        hint: 'Poster harus file gambar valid. Coba generate ulang poster di tab Konten, lalu post lagi.',
      },
      { status: 400 },
    )
  }

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        hint: /login_required/i.test(result.error)
          ? 'Session hangus — tempel sessionid baru di Pengaturan → Instagram.'
          : /identify image|cannot identify/i.test(result.error)
            ? 'Gambar tidak dikenali gateway. Sudah dikonversi ke JPEG — restart npm run dev + coba lagi. Atau unduh poster manual.'
            : 'Cek session IG + format gambar. Jangan pakai akun penting (risiko ban).',
      },
      { status: 502 },
    )
  }

  await updateContent(
    user.id,
    item.id,
    { status: 'Terposting', platform: 'Instagram' },
    body.businessId,
  )

  return NextResponse.json({
    ok: true,
    mode: 'private_api',
    message: 'Berhasil diunggah via private API (demo). Cek feed Instagram.',
    media: result.media,
    disclaimer: 'Unofficial — risiko ban. Jangan untuk akun client production.',
  })
}
