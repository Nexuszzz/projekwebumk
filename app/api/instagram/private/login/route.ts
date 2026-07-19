import { envTrim, getSessionUser, unauthorized } from '@/lib/server/auth'
import { updateProfile } from '@/lib/server/db'
import { ensureUserBusiness } from '@/lib/server/ensure-business'
import {
  aiograpiBaseUrl,
  aiograpiHealth,
  aiograpiLogin,
  aiograpiLoginBySessionCookie,
  normalizeSessionId,
} from '@/lib/server/aiograpi-client'
import { sanitizeProfileForClient } from '@/lib/server/instagram'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * DEMO ONLY — login Instagram private API (aiograpi-rest).
 * Body: { username, password, verificationCode?, businessId? }
 *    or { sessionCookie, username?, businessId? }
 *
 * Password TIDAK disimpan — hanya session id di profil usaha.
 */
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const body = (await request.json().catch(() => ({}))) as {
    username?: string
    password?: string
    verificationCode?: string
    sessionCookie?: string
    businessId?: string
  }

  const healthy = await aiograpiHealth()
  if (!healthy) {
    const base = envTrim('AIOGRAPI_BASE_URL') || aiograpiBaseUrl()
    return NextResponse.json(
      {
        error: envTrim('AIOGRAPI_BASE_URL')
          ? `Gateway Instagram private (aiograpi) offline di ${base}. Cek Railway service aiograpi masih Online.`
          : 'Gateway Instagram private belum dikonfigurasi. Set AIOGRAPI_BASE_URL di Vercel ke URL Railway aiograpi.',
        baseUrl: base,
      },
      { status: 503 },
    )
  }

  const snap = await ensureUserBusiness(user, body.businessId, {
    brandHint: body.username || undefined,
  })
  if (!snap.ok) {
    return NextResponse.json(
      {
        error:
          'Belum bisa menyiapkan usaha untuk akun ini. Refresh dashboard, buat usaha lewat switcher, lalu coba lagi.',
      },
      { status: 400 },
    )
  }
  const bizId = snap.businesses.find((b) => b.isActive)?.id || body.businessId

  try {
    let sessionId = ''
    let username = (body.username || '').replace(/^@/, '').trim()

    if (body.sessionCookie?.trim()) {
      // Cookie browser sering URL-encoded (%3A) — dinormalisasi di client helper
      sessionId = await aiograpiLoginBySessionCookie(
        normalizeSessionId(body.sessionCookie),
      )
    } else {
      if (!username || !body.password) {
        return NextResponse.json(
          { error: 'Username + password IG, atau session cookie, wajib diisi.' },
          { status: 400 },
        )
      }
      const login = await aiograpiLogin({
        username,
        password: body.password,
        verificationCode: body.verificationCode,
      })
      sessionId = login.sessionId
    }

    if (!username) username = snap.business.profile.instagram?.username || 'ig-session'

    const profile = await updateProfile(
      user.id,
      {
        instagram: {
          ...(snap.business.profile.instagram || {}),
          username,
          privateSessionId: sessionId,
          privateMode: true,
          privateConnectedAt: new Date().toISOString(),
          enabled: true,
        },
      },
      bizId,
    )

    return NextResponse.json({
      ok: true,
      message: `Session IG @${username} tersimpan untuk usaha ini (private API / demo).`,
      disclaimer:
        'Unofficial Instagram API — risiko ban, challenge, dan melanggar ToS Meta. Jangan pakai password client production.',
      profile: sanitizeProfileForClient(profile),
      privateConnected: true,
      username,
    })
  } catch (error) {
    console.error('[instagram/private/login]', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Login private API gagal.',
        hint: 'Jika ada 2FA, isi verificationCode. Atau ekspor cookie sessionid dari browser.',
      },
      { status: 400 },
    )
  }
}

export async function GET() {
  const healthy = await aiograpiHealth()
  const baseUrl = aiograpiBaseUrl()
  return NextResponse.json({
    gatewayHealthy: healthy,
    configured: Boolean(envTrim('AIOGRAPI_BASE_URL')),
    baseUrl,
    docsUrl: `${baseUrl}/docs`,
    disclaimer:
      'Private API DEMO ONLY. Meta melarang minta password IG di app pihak ketiga. Risiko ban tinggi.',
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
        privateSessionId: '',
        privateMode: false,
        privateConnectedAt: '',
      },
    },
    bizId,
  )
  return NextResponse.json({
    ok: true,
    message: 'Session private API dihapus.',
    profile: sanitizeProfileForClient(profile),
  })
}
