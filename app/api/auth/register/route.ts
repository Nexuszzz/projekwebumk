import { createSessionToken, setSessionCookie } from '@/lib/server/auth'
import { createBusiness } from '@/lib/server/db'
import { registerWithPassword } from '@/lib/server/users'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = String(body.email || '')
    const password = String(body.password || '')
    const name = String(body.name || '')
    const businessName = String(body.business || body.brand || '').trim()

    if (body.confirm && password !== body.confirm) {
      return NextResponse.json({ error: 'Konfirmasi kata sandi tidak cocok.' }, { status: 400 })
    }

    const { user, sessionVersion } = await registerWithPassword({ email, password, name })

    let business = null
    if (businessName) {
      business = await createBusiness(user.id, {
        brand: businessName,
        owner: name,
        email,
        city: body.city,
        category: body.category,
      })
    }

    const token = await createSessionToken(user, sessionVersion)
    const response = NextResponse.json({ user, business, needsOnboarding: !business })
    setSessionCookie(response, token)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal daftar.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
