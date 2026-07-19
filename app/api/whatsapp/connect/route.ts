import { appUrl, getSessionUser, unauthorized } from '@/lib/server/auth'
import { updateProfile } from '@/lib/server/db'
import { ensureUserBusiness } from '@/lib/server/ensure-business'
import {
  deviceIdForBusiness,
  ensureDevice,
  gowaHealth,
  loginWithPairCode,
  loginWithQr,
  normalizeWaPhone,
} from '@/lib/server/gowa-client'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Mulai pairing WhatsApp.
 * Body:
 *  - businessId?: string
 *  - phone: string (untuk mode pair-code) — contoh 0812... / 62812...
 *  - mode?: 'code' | 'qr'  (default: code)
 */
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const body = (await request.json().catch(() => ({}))) as {
    businessId?: string
    phone?: string
    mode?: 'code' | 'qr'
    autoReply?: boolean
  }

  const snap = await ensureUserBusiness(user, body.businessId, {
    phone: body.phone,
  })
  if (!snap.ok) {
    return NextResponse.json(
      { error: 'Belum bisa menyiapkan usaha. Refresh dashboard lalu coba lagi.' },
      { status: 400 },
    )
  }

  const healthy = await gowaHealth()
  if (!healthy) {
    const base = process.env.GOWA_BASE_URL || ''
    return NextResponse.json(
      {
        error: base
          ? `Gateway WhatsApp (GOWA) tidak terjangkau di ${base.replace(/\/$/, '')}. Cek service Railway/Docker masih online.`
          : 'Gateway WhatsApp (GOWA) belum dikonfigurasi. Set GOWA_BASE_URL di Vercel, atau lokal: docker compose up -d gowa.',
      },
      { status: 503 },
    )
  }

  const bizId = snap.businesses.find((b) => b.isActive)?.id || body.businessId || ''
  const deviceId =
    snap.business.profile.whatsapp?.deviceId || deviceIdForBusiness(bizId)

  const mode = body.mode === 'qr' ? 'qr' : 'code'
  const phoneRaw = (body.phone || snap.business.profile.whatsapp?.phone || snap.business.profile.phone || '').trim()

  if (mode === 'code' && !phoneRaw) {
    return NextResponse.json(
      { error: 'Masukkan nomor HP WhatsApp toko (contoh: 081234567890).' },
      { status: 400 },
    )
  }

  const phone = phoneRaw ? normalizeWaPhone(phoneRaw) : ''
  if (mode === 'code' && phone.length < 10) {
    return NextResponse.json(
      { error: 'Nomor HP tidak valid. Gunakan format 08… atau 62…' },
      { status: 400 },
    )
  }

  // Webhook per device → Next.js (production: NEXT_PUBLIC_APP_URL)
  const webhookUrl = `${appUrl()}/api/whatsapp/webhook`

  try {
    await ensureDevice(deviceId, webhookUrl)

    await updateProfile(
      user.id,
      {
        whatsapp: {
          ...(snap.business.profile.whatsapp || {}),
          deviceId,
          phone: phone || snap.business.profile.whatsapp?.phone,
          autoReply: body.autoReply !== false,
        },
        ...(phone ? { phone: phone.startsWith('62') ? `0${phone.slice(2)}` : phone } : {}),
      },
      bizId,
    )

    if (mode === 'qr') {
      const qr = await loginWithQr(deviceId)
      return NextResponse.json({
        mode: 'qr',
        deviceId,
        phone: phone || null,
        qrLink: qr.qr_link,
        qrDuration: qr.qr_duration,
        instructions:
          'Buka WhatsApp di HP → Perangkat tertaut → Tautkan perangkat → Pindai QR di bawah.',
      })
    }

    const code = await loginWithPairCode(deviceId, phone)
    return NextResponse.json({
      mode: 'code',
      deviceId,
      phone,
      pairCode: code.pair_code,
      instructions:
        'Buka WhatsApp di HP → Perangkat tertaut → Tautkan perangkat → Tautkan dengan nomor telepon → masukkan kode di bawah.',
    })
  } catch (error) {
    console.error('[whatsapp/connect]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal memulai pairing WhatsApp.' },
      { status: 500 },
    )
  }
}
