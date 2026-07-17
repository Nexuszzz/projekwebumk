import { createSessionToken, getSessionUser, setSessionCookie, unauthorized } from '@/lib/server/auth'
import { changePassword } from '@/lib/server/users'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  let body: { currentPassword?: string; nextPassword?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 })
  }

  try {
    const { sessionVersion } = await changePassword(
      user.id,
      body.currentPassword || '',
      body.nextPassword || '',
    )
    // Re-issue session for this browser; all others invalidated via sessionVersion
    const token = await createSessionToken(user, sessionVersion)
    const response = NextResponse.json({
      ok: true,
      message: 'Kata sandi diganti. Sesi perangkat lain dikeluarkan.',
    })
    setSessionCookie(response, token)
    return response
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal ganti kata sandi.' },
      { status: 400 },
    )
  }
}
