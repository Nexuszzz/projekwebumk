import { appUrl, getSessionUser, unauthorized } from '@/lib/server/auth'
import { getSnapshotForUser, updateContent } from '@/lib/server/db'
import {
  instagramApiConfigured,
  publicInstagramStatus,
  publishImageToInstagram,
} from '@/lib/server/instagram'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * POST { contentId, businessId?, mode?: 'api' | 'assisted', caption? }
 */
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const body = (await request.json().catch(() => ({}))) as {
    contentId?: string
    businessId?: string
    mode?: 'api' | 'assisted'
    caption?: string
  }

  if (!body.contentId) {
    return NextResponse.json({ error: 'contentId wajib.' }, { status: 400 })
  }

  const snap = await getSnapshotForUser(user.id, body.businessId)
  if (!snap.ok) {
    return NextResponse.json({ error: 'Belum ada usaha.' }, { status: 400 })
  }

  const item = snap.business.contents.find((c) => c.id === body.contentId)
  if (!item) {
    return NextResponse.json({ error: 'Konten tidak ditemukan.' }, { status: 404 })
  }

  const caption = (body.caption ?? item.description ?? item.title).trim()
  const mode = body.mode === 'api' ? 'api' : 'assisted'
  const profile = snap.business.profile

  let imageUrl = item.image || ''
  if (imageUrl.startsWith('/')) {
    imageUrl = `${appUrl()}${imageUrl}`
  }

  if (mode === 'api') {
    if (!instagramApiConfigured(profile)) {
      return NextResponse.json(
        {
          error:
            'Instagram belum dihubungkan untuk usaha ini. Buka Pengaturan → Instagram, atau pakai mode bantu.',
          apiConfigured: false,
          status: publicInstagramStatus(profile),
        },
        { status: 503 },
      )
    }

    const result = await publishImageToInstagram({
      imageUrl,
      caption,
      profile,
    })
    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          apiConfigured: true,
          imageUrl,
          status: publicInstagramStatus(profile),
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
      mode: 'api',
      mediaId: result.mediaId,
      source: result.source,
      message:
        result.source === 'business'
          ? 'Berhasil diposting ke Instagram usaha ini.'
          : 'Berhasil diposting (token global server).',
    })
  }

  await updateContent(
    user.id,
    item.id,
    { status: 'Terposting', platform: item.platform === 'Instagram' ? 'Instagram' : item.platform },
    body.businessId,
  )

  return NextResponse.json({
    ok: true,
    mode: 'assisted',
    message: 'Ditandai terposting. Pastikan sudah di-upload di Instagram.',
  })
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const businessId = new URL(request.url).searchParams.get('businessId')
  const snap = await getSnapshotForUser(user.id, businessId)
  if (!snap.ok) {
    return NextResponse.json({
      apiConfigured: false,
      status: null,
      note: 'Belum ada usaha.',
    })
  }

  const status = publicInstagramStatus(snap.business.profile)
  return NextResponse.json({
    apiConfigured: status.apiAvailable,
    status,
    note: status.connected
      ? 'Pakai token Instagram usaha ini untuk post otomatis.'
      : 'Hubungkan IG di Pengaturan, atau pakai mode bantu (salin + unduh).',
  })
}
