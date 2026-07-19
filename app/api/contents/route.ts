import { getSessionUser, unauthorized } from '@/lib/server/auth'
import { addContents, getSnapshot, updateContent } from '@/lib/server/db'
import { ensureUserBusiness } from '@/lib/server/ensure-business'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function bizId(request: Request, body?: { businessId?: string }) {
  return body?.businessId || request.headers.get('x-business-id')
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  try {
    const wanted = bizId(request)
    const snap = await ensureUserBusiness(user, wanted)
    if (!snap.ok) {
      return NextResponse.json({ error: 'Belum ada usaha. Buat usaha dulu.' }, { status: 400 })
    }
    const db = await getSnapshot(snap.business.id, user.id)
    return NextResponse.json({ businessId: db.id, contents: db.contents })
  } catch (error) {
    console.error('GET /api/contents', error)
    const message = error instanceof Error ? error.message : 'Gagal memuat konten.'
    return NextResponse.json({ error: message }, { status: 500 })
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

    // Pastikan ada usaha (Vercel /tmp sering kosong / businessId client basi)
    const wanted = bizId(request, body)
    const snap = await ensureUserBusiness(user, wanted)
    if (!snap.ok) {
      return NextResponse.json(
        {
          error:
            'Belum ada usaha untuk menyimpan konten. Refresh dashboard (atau logout/login), lalu coba lagi.',
        },
        { status: 400 },
      )
    }

    // Strip data URL raksasa (bisa > body limit Vercel) — simpan path pendek saja
    const normalized = items.map((item: Record<string, unknown>) => {
      const image = typeof item.image === 'string' ? item.image : ''
      if (image.startsWith('data:image/') && image.length > 200_000) {
        return { ...item, image: '/placeholder.svg' }
      }
      return item
    })

    const created = await addContents(user.id, normalized as Parameters<typeof addContents>[1], snap.business.id)
    return NextResponse.json(
      { contents: created, businessId: snap.business.id },
      { status: 201 },
    )
  } catch (error) {
    console.error('POST /api/contents', error)
    const message = error instanceof Error ? error.message : 'Gagal menyimpan konten.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  try {
    const body = await request.json()
    if (!body?.id) return NextResponse.json({ error: 'id wajib.' }, { status: 400 })
    const { id, businessId: _b, ...patch } = body
    const wanted = bizId(request, body)
    const snap = await ensureUserBusiness(user, wanted)
    if (!snap.ok) {
      return NextResponse.json({ error: 'Belum ada usaha.' }, { status: 400 })
    }
    if (typeof patch.image === 'string' && patch.image.startsWith('data:image/') && patch.image.length > 200_000) {
      patch.image = '/placeholder.svg'
    }
    const content = await updateContent(user.id, id, patch, snap.business.id)
    return NextResponse.json({ content, businessId: snap.business.id })
  } catch (error) {
    console.error('PATCH /api/contents', error)
    const message = error instanceof Error ? error.message : 'Gagal memperbarui konten.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
