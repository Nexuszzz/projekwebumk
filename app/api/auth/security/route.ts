import {
  createSessionToken,
  getSessionUser,
  setSessionCookie,
  unauthorized,
} from '@/lib/server/auth'
import {
  getUserSecurity,
  revokeOtherSessions,
  touchUserSession,
} from '@/lib/server/users'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function parseDevice(ua: string) {
  const lower = ua.toLowerCase()
  if (lower.includes('edg/')) return 'Edge'
  if (lower.includes('chrome/')) return 'Chrome'
  if (lower.includes('firefox/')) return 'Firefox'
  if (lower.includes('safari/') && !lower.includes('chrome')) return 'Safari'
  return 'Browser'
}

function parseOs(ua: string) {
  const lower = ua.toLowerCase()
  if (lower.includes('windows')) return 'Windows'
  if (lower.includes('android')) return 'Android'
  if (lower.includes('iphone') || lower.includes('ipad')) return 'iOS'
  if (lower.includes('mac os')) return 'macOS'
  if (lower.includes('linux')) return 'Linux'
  return 'Perangkat'
}

function sessionIdFromRequest(request: Request) {
  const cookie = request.headers.get('cookie') || ''
  const match = cookie.match(/(?:^|;\s*)umkman_sid=([^;]+)/)
  if (match?.[1]) return match[1]
  return `sid-${Date.now().toString(36)}`
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const ua = request.headers.get('user-agent') || ''
  const device = `${parseDevice(ua)} — ${parseOs(ua)}`
  const sid = sessionIdFromRequest(request)
  await touchUserSession(user.id, {
    id: sid,
    device,
    location: 'Sesi browser',
  })

  const security = await getUserSecurity(user.id)
  const sessions = (security.sessions || []).map((s) => ({
    ...s,
    current: s.id === sid,
  }))

  const response = NextResponse.json({
    ...security,
    sessions,
    currentSessionId: sid,
  })
  if (!(request.headers.get('cookie') || '').includes('umkman_sid=')) {
    response.cookies.set('umkman_sid', sid, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
  }
  return response
}

/** Logout perangkat lain — naikkan sessionVersion + re-issue cookie sesi ini. */
export async function PATCH(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  let body: { revokeOthers?: boolean } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  if (!body.revokeOthers) {
    return NextResponse.json({ error: 'Gunakan { "revokeOthers": true }.' }, { status: 400 })
  }

  try {
    const ua = request.headers.get('user-agent') || ''
    const device = `${parseDevice(ua)} — ${parseOs(ua)}`
    const sid = sessionIdFromRequest(request)
    const { sessionVersion } = await revokeOtherSessions(user.id, {
      id: sid,
      device,
      location: 'Sesi browser',
    })
    const token = await createSessionToken(user, sessionVersion)
    const response = NextResponse.json({
      ok: true,
      message: 'Semua perangkat lain dikeluarkan. Sesi ini tetap aktif.',
      sessionVersion,
    })
    setSessionCookie(response, token)
    return response
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal mengeluarkan sesi.' },
      { status: 400 },
    )
  }
}
