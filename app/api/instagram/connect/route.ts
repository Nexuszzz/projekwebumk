import { getSessionUser, unauthorized } from '@/lib/server/auth'
import { updateProfile } from '@/lib/server/db'
import { ensureUserBusiness } from '@/lib/server/ensure-business'
import {
  publicInstagramStatus,
  sanitizeProfileForClient,
  verifyInstagramCredentials,
} from '@/lib/server/instagram'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * GET — status koneksi IG usaha aktif (tanpa bocor token).
 */
export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const businessId = new URL(request.url).searchParams.get('businessId')
  const snap = await ensureUserBusiness(user, businessId)
  if (!snap.ok) {
    return NextResponse.json({
      connected: false,
      username: null,
      accountIdMasked: null,
      hasToken: false,
      connectedAt: null,
      apiAvailable: false,
      credentialSource: null,
      needsOnboarding: true,
      businessId: null,
    })
  }

  return NextResponse.json({
    ...publicInstagramStatus(snap.business.profile),
    needsOnboarding: false,
    businessId: snap.businesses.find((b) => b.isActive)?.id || businessId,
  })
}

/**
 * POST — hubungkan IG client (per usaha).
 * Body: { accountId, accessToken, username?, businessId? }
 */
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const body = (await request.json().catch(() => ({}))) as {
    accountId?: string
    accessToken?: string
    username?: string
    businessId?: string
  }

  const accountId = String(body.accountId || '').trim()
  const accessToken = String(body.accessToken || '').trim()
  if (!accountId || !accessToken) {
    return NextResponse.json(
      { error: 'Account ID (IG User ID) dan Access Token wajib diisi.' },
      { status: 400 },
    )
  }

  const snap = await ensureUserBusiness(user, body.businessId)
  if (!snap.ok) {
    return NextResponse.json(
      { error: 'Belum bisa membuat usaha. Coba refresh dashboard lalu ulangi.' },
      { status: 400 },
    )
  }
  const bizId = snap.businesses.find((b) => b.isActive)?.id || body.businessId

  const verified = await verifyInstagramCredentials({ accountId, accessToken })
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 })
  }

  const username =
    body.username?.replace(/^@/, '').trim() || verified.username || undefined

  const profile = await updateProfile(
    user.id,
    {
      instagram: {
        accountId,
        accessToken,
        username,
        enabled: true,
        connectedAt: new Date().toISOString(),
      },
    },
    bizId,
  )

  return NextResponse.json({
    ok: true,
    message: username
      ? `Instagram @${username} terhubung untuk usaha ini.`
      : 'Instagram terhubung untuk usaha ini.',
    profile: sanitizeProfileForClient(profile),
    status: publicInstagramStatus(profile),
  })
}

export async function DELETE(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const businessId = new URL(request.url).searchParams.get('businessId')
  const snap = await ensureUserBusiness(user, businessId)
  if (!snap.ok) {
    return NextResponse.json({ error: 'Belum ada usaha.' }, { status: 400 })
  }
  const bizId = snap.businesses.find((b) => b.isActive)?.id || businessId
  const profile = await updateProfile(
    user.id,
    {
      instagram: {
        ...(snap.business.profile.instagram || {}),
        accountId: '',
        accessToken: '',
        username: snap.business.profile.instagram?.username,
        enabled: false,
        connectedAt: '',
      },
    },
    bizId,
  )
  return NextResponse.json({
    ok: true,
    message: 'Token Graph API dilepas dari usaha ini.',
    profile: sanitizeProfileForClient(profile),
  })
}
