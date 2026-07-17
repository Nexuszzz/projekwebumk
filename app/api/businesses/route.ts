import { getSessionUser, unauthorized } from '@/lib/server/auth'
import { createBusiness, listBusinesses, setActiveBusiness } from '@/lib/server/db'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  try {
    const businesses = await listBusinesses(user.id)
    return NextResponse.json({ businesses, user })
  } catch (error) {
    console.error('GET /api/businesses', error)
    return NextResponse.json({ error: 'Gagal memuat daftar usaha.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  try {
    const body = await request.json()
    const snapshot = await createBusiness(user.id, {
      brand: body.brand,
      owner: body.owner || user.name,
      city: body.city,
      region: body.region,
      email: body.email || user.email,
      phone: body.phone,
      category: body.category,
      address: body.address,
    })
    const businesses = await listBusinesses(user.id)
    return NextResponse.json({ business: snapshot, businesses }, { status: 201 })
  } catch (error) {
    console.error('POST /api/businesses', error)
    const message = error instanceof Error ? error.message : 'Gagal membuat usaha.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PUT(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  try {
    const body = await request.json()
    if (!body?.businessId) {
      return NextResponse.json({ error: 'businessId wajib.' }, { status: 400 })
    }
    const business = await setActiveBusiness(user.id, body.businessId)
    const businesses = await listBusinesses(user.id)
    return NextResponse.json({ business, businesses })
  } catch (error) {
    console.error('PUT /api/businesses', error)
    const message = error instanceof Error ? error.message : 'Gagal mengganti usaha.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
