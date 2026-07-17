import {
  appUrl,
  createSessionToken,
  googleOAuthConfigured,
  setSessionCookie,
} from '@/lib/server/auth'
import { upsertGoogleUser } from '@/lib/server/users'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (!googleOAuthConfigured()) {
    return NextResponse.redirect(`${appUrl()}/login?error=google_not_configured`)
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieState = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('umkman_oauth_state='))
    ?.split('=')[1]

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(`${appUrl()}/login?error=google_state`)
  }

  const redirectUri = `${appUrl()}/api/auth/google/callback`

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokenJson = await tokenRes.json()
    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error('Google token error', tokenJson)
      return NextResponse.redirect(`${appUrl()}/login?error=google_token`)
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    })
    const profile = await profileRes.json()
    if (!profileRes.ok || !profile.email) {
      return NextResponse.redirect(`${appUrl()}/login?error=google_profile`)
    }

    const { user, sessionVersion } = await upsertGoogleUser({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name || profile.email,
      picture: profile.picture,
    })

    const token = await createSessionToken(user, sessionVersion)
    const response = NextResponse.redirect(`${appUrl()}/dashboard`)
    setSessionCookie(response, token)
    response.cookies.set('umkman_oauth_state', '', { path: '/', maxAge: 0 })
    return response
  } catch (error) {
    console.error('Google callback error', error)
    return NextResponse.redirect(`${appUrl()}/login?error=google_failed`)
  }
}
