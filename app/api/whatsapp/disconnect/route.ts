import { getSessionUser, unauthorized } from '@/lib/server/auth'
import { getSnapshotForUser, updateProfile } from '@/lib/server/db'
import { deviceIdForBusiness, logoutDevice } from '@/lib/server/gowa-client'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const body = (await request.json().catch(() => ({}))) as { businessId?: string }
  const snap = await getSnapshotForUser(user.id, body.businessId)
  if (!snap.ok) {
    return NextResponse.json({ error: 'Belum ada usaha.' }, { status: 400 })
  }

  const bizId = snap.businesses.find((b) => b.isActive)?.id || body.businessId || ''
  const deviceId =
    snap.business.profile.whatsapp?.deviceId || deviceIdForBusiness(bizId)

  try {
    await logoutDevice(deviceId)
  } catch (error) {
    // Tetap clear local state
    console.warn('[whatsapp/disconnect] logout remote failed', error)
  }

  await updateProfile(
    user.id,
    {
      whatsapp: {
        deviceId,
        phone: snap.business.profile.whatsapp?.phone,
        jid: undefined,
        autoReply: snap.business.profile.whatsapp?.autoReply !== false,
        connectedAt: undefined,
      },
    },
    bizId,
  )

  return NextResponse.json({ ok: true, deviceId })
}
