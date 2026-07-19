import { appUrl, googleClientId, googleOAuthConfigured } from '@/lib/server/auth'
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
  // Harus IDENTIK dengan Authorized redirect URI di Google Cloud Console
  // dan dengan body token exchange di /api/auth/google/callback
  const redirectUri = `${appUrl()}/api/auth/google/callback`
  const clientId = googleClientId()
  if (!clientId.includes('.apps.googleusercontent.com')) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID tidak valid. Pastikan salin Client ID Web application.' },
      { status: 503 },
    )
  }

  const params = new URLSearchParams({
    client_id: clientId,
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
  // SameSite=Lax wajib agar cookie ikut saat Google redirect kembali (top-level GET)
  response.cookies.set('umkman_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  })
  return response
}
