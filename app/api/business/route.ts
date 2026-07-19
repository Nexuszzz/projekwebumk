import { getSessionUser, unauthorized } from '@/lib/server/auth'
import { getSnapshotForUser, updateProfile } from '@/lib/server/db'
import { sanitizeProfileForClient } from '@/lib/server/instagram'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function businessIdFrom(request: Request) {
  return request.headers.get('x-business-id')
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  try {
    const { searchParams } = new URL(request.url)
    // reset massal dihapus — berbahaya untuk multi-tenant
    const id = searchParams.get('id') || businessIdFrom(request)
    const snapshot = await getSnapshotForUser(user.id, id)
    if (!snapshot.ok) {
      return NextResponse.json({
        needsOnboarding: true,
        businesses: [],
        user,
      })
    }
    const business = {
      ...snapshot.business,
      profile: sanitizeProfileForClient(snapshot.business.profile),
    }
    return NextResponse.json({
      ...business,
      businesses: snapshot.businesses,
      needsOnboarding: false,
      user,
    })
  } catch (error) {
    console.error('GET /api/business', error)
    const message = error instanceof Error ? error.message : 'Gagal memuat data usaha.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  try {
    const body = await request.json()
    if (!body?.profile || typeof body.profile !== 'object') {
      return NextResponse.json({ error: 'Body.profile wajib diisi.' }, { status: 400 })
    }
    // Jangan izinkan client overwrite secrets via PATCH generik dengan placeholder
    const patch = { ...body.profile }
    if (patch.instagram?.accessToken === '••••••••') {
      delete patch.instagram.accessToken
    }
    if (patch.instagram?.privateSessionId === '••••••••') {
      delete patch.instagram.privateSessionId
    }
    const id = body.businessId || businessIdFrom(request)
    const profile = await updateProfile(user.id, patch, id)
    return NextResponse.json({ profile: sanitizeProfileForClient(profile) })
  } catch (error) {
    console.error('PATCH /api/business', error)
    return NextResponse.json({ error: 'Gagal memperbarui profil.' }, { status: 500 })
  }
}
