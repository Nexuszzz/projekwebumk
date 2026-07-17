import { appUrl, googleOAuthConfigured } from '@/lib/server/auth'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'

export async function GET() {
  if (!googleOAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          'Login Google belum dikonfigurasi. Set GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET di .env.local',
      },
      { status: 503 },
    )
  }

  const state = randomBytes(16).toString('hex')
  const redirectUri = `${appUrl()}/api/auth/google/callback`
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    include_granted_scopes: 'true',
    state,
    prompt: 'select_account',
  })

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  )
  response.cookies.set('umkman_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  })
  return response
}
