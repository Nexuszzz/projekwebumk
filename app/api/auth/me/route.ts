import { getSessionUser, googleOAuthConfigured } from '@/lib/server/auth'
import { getSnapshotForUser } from '@/lib/server/db'
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
  const snapshot = await getSnapshotForUser(user.id)
  return NextResponse.json({
    user,
    googleEnabled: googleOAuthConfigured(),
    needsOnboarding: !snapshot.ok,
    businesses: snapshot.ok ? snapshot.businesses : [],
    business: snapshot.ok ? snapshot.business : null,
  })
}
