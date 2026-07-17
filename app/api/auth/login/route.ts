import { createSessionToken, setSessionCookie } from '@/lib/server/auth'
import { loginWithPassword } from '@/lib/server/users'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = String(body.email || '')
    const password = String(body.password || '')
    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan kata sandi wajib.' }, { status: 400 })
    }
    const { user, sessionVersion } = await loginWithPassword(email, password)
    const token = await createSessionToken(user, sessionVersion)
    const response = NextResponse.json({ user })
    setSessionCookie(response, token)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal masuk.'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
