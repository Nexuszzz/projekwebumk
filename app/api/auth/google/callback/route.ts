import {
  appUrl,
  createSessionToken,
  googleClientId,
  googleClientSecret,
  googleOAuthConfigured,
  setSessionCookie,
} from '@/lib/server/auth'
import { createBusiness, getSnapshotForUser } from '@/lib/server/db'
import { upsertGoogleUser } from '@/lib/server/users'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

function loginError(code: string) {
  return NextResponse.redirect(`${appUrl()}/login?error=${encodeURIComponent(code)}`)
}

export async function GET(request: NextRequest) {
  if (!googleOAuthConfigured()) {
    return loginError('google_not_configured')
  }

  const url = request.nextUrl
  const oauthError = url.searchParams.get('error')
  if (oauthError) {
    // Mis. access_denied saat user batal / app masih testing-mode tanpa test user
    console.error('Google OAuth error param', oauthError, url.searchParams.get('error_description'))
    if (oauthError === 'access_denied') return loginError('google_denied')
    return loginError('google_failed')
  }

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieState = request.cookies.get('umkman_oauth_state')?.value

  if (!code || !state || !cookieState || state !== cookieState) {
    console.error('Google OAuth state mismatch', {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasCookie: Boolean(cookieState),
    })
    return loginError('google_state')
  }

  // HARUS sama persis dengan redirect_uri di /api/auth/google
  const redirectUri = `${appUrl()}/api/auth/google/callback`

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId(),
        client_secret: googleClientSecret(),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string
      error?: string
      error_description?: string
    }
    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error('Google token error', {
        status: tokenRes.status,
        error: tokenJson.error,
        description: tokenJson.error_description,
        redirectUri,
      })
      // redirect_uri_mismatch / invalid_client biasanya dari Console / env
      if (tokenJson.error === 'invalid_client') return loginError('google_client')
      if (tokenJson.error_description?.toLowerCase().includes('redirect')) {
        return loginError('google_redirect')
      }
      return loginError('google_token')
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    })
    const profile = (await profileRes.json()) as {
      sub?: string
      email?: string
      name?: string
      picture?: string
    }
    if (!profileRes.ok || !profile.email || !profile.sub) {
      console.error('Google profile error', profile)
      return loginError('google_profile')
    }

    const { user, sessionVersion } = await upsertGoogleUser({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name || profile.email,
      picture: profile.picture,
    })

    // Pastikan user punya usaha (Vercel /tmp / Postgres kosong → "Belum ada usaha")
    try {
      const snap = await getSnapshotForUser(user.id)
      if (!snap.ok) {
        const brand =
          (profile.name || profile.email.split('@')[0] || 'Usaha Saya').trim().slice(0, 60) ||
          'Usaha Saya'
        await createBusiness(user.id, {
          brand,
          owner: profile.name || profile.email,
          email: profile.email,
          category: 'UMKM',
        })
      }
    } catch (e) {
      console.error('Google login: auto-create business failed', e)
    }

    const token = await createSessionToken(user, sessionVersion)
    const response = NextResponse.redirect(`${appUrl()}/dashboard`)
    setSessionCookie(response, token)
    response.cookies.set('umkman_oauth_state', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    })
    return response
  } catch (error) {
    console.error('Google callback error', error)
    return loginError('google_failed')
  }
}
