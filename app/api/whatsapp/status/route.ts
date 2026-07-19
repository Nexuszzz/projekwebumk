import { getSessionUser, unauthorized } from '@/lib/server/auth'
import { updateProfile } from '@/lib/server/db'
import { ensureUserBusiness } from '@/lib/server/ensure-business'
import {
  deviceIdForBusiness,
  getDeviceStatus,
  gowaConfigured,
  gowaHealth,
  publicGowaBaseUrl,
} from '@/lib/server/gowa-client'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const url = new URL(request.url)
  const businessIdParam = url.searchParams.get('businessId')

  // Health dulu — jangan digagalkan hanya karena belum ada usaha
  const healthy = await gowaHealth()
  const baseUrl = publicGowaBaseUrl()
  const configured = gowaConfigured()

  const snap = await ensureUserBusiness(user, businessIdParam)
  if (!snap.ok) {
    return NextResponse.json({
      configured,
      gowaBaseUrl: baseUrl,
      gowaHealthy: healthy,
      deviceId: '',
      phone: '',
      jid: '',
      autoReply: true,
      isConnected: false,
      isLoggedIn: false,
      remoteError: null,
      needsOnboarding: true,
      error: 'Belum ada usaha. Buat usaha dulu di dashboard.',
    })
  }

  const bizId = snap.businesses.find((b) => b.isActive)?.id || businessIdParam || ''
  const resolvedDeviceId =
    snap.business.profile.whatsapp?.deviceId || deviceIdForBusiness(bizId)

  let remote: Awaited<ReturnType<typeof getDeviceStatus>> | null = null
  let remoteError: string | null = null
  if (healthy && resolvedDeviceId) {
    try {
      remote = await getDeviceStatus(resolvedDeviceId)
      if (remote.is_logged_in && remote.jid && remote.jid !== snap.business.profile.whatsapp?.jid) {
        await updateProfile(
          user.id,
          {
            whatsapp: {
              ...(snap.business.profile.whatsapp || {}),
              deviceId: resolvedDeviceId,
              jid: remote.jid,
              autoReply: snap.business.profile.whatsapp?.autoReply !== false,
              connectedAt:
                snap.business.profile.whatsapp?.connectedAt || new Date().toISOString(),
            },
          },
          bizId,
        )
      }
    } catch (e) {
      remoteError = e instanceof Error ? e.message : 'Gagal cek status device'
    }
  }

  return NextResponse.json({
    configured,
    gowaBaseUrl: baseUrl,
    gowaHealthy: healthy,
    deviceId: resolvedDeviceId,
    phone: snap.business.profile.whatsapp?.phone || snap.business.profile.phone || '',
    jid: remote?.jid || snap.business.profile.whatsapp?.jid || '',
    autoReply: snap.business.profile.whatsapp?.autoReply !== false,
    isConnected: Boolean(remote?.is_connected),
    isLoggedIn: Boolean(remote?.is_logged_in),
    remoteError,
    needsOnboarding: false,
    businessId: bizId,
  })
}
