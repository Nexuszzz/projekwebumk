import { getSessionUser, googleOAuthConfigured } from '@/lib/server/auth'
import { ensureUserBusiness } from '@/lib/server/ensure-business'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json(
      { user: null, googleEnabled: googleOAuthConfigured() },
      { status: 401 },
    )
  }
  // Auto-buat usaha minimal di production agar WA/IG tidak “Belum ada usaha”
  const snapshot = await ensureUserBusiness(user)
  return NextResponse.json({
    user,
    googleEnabled: googleOAuthConfigured(),
    needsOnboarding: !snapshot.ok,
    businesses: snapshot.ok ? snapshot.businesses : [],
    business: snapshot.ok ? snapshot.business : null,
  })
}
