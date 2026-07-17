import { getSessionUser, unauthorized } from '@/lib/server/auth'
import { addContents, getSnapshot, updateContent } from '@/lib/server/db'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function bizId(request: Request, body?: { businessId?: string }) {
  return body?.businessId || request.headers.get('x-business-id')
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  try {
    const db = await getSnapshot(bizId(request), user.id)
    return NextResponse.json({ businessId: db.id, contents: db.contents })
  } catch (error) {
    console.error('GET /api/contents', error)
    return NextResponse.json({ error: 'Gagal memuat konten.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  try {
    const body = await request.json()
    const items = Array.isArray(body?.items) ? body.items : body?.item ? [body.item] : null
    if (!items?.length) {
      return NextResponse.json({ error: 'items wajib (array).' }, { status: 400 })
    }
    const created = await addContents(user.id, items, bizId(request, body))
    return NextResponse.json({ contents: created }, { status: 201 })
  } catch (error) {
    console.error('POST /api/contents', error)
    return NextResponse.json({ error: 'Gagal menyimpan konten.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  try {
    const body = await request.json()
    if (!body?.id) return NextResponse.json({ error: 'id wajib.' }, { status: 400 })
    const { id, businessId: _b, ...patch } = body
    const content = await updateContent(user.id, id, patch, bizId(request, body))
    return NextResponse.json({ content })
  } catch (error) {
    console.error('PATCH /api/contents', error)
    const message = error instanceof Error ? error.message : 'Gagal memperbarui konten.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
