import { getSessionUser, unauthorized } from '@/lib/server/auth'
import { createCatalogProduct, getSnapshot, updateCatalogProduct } from '@/lib/server/db'
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
    return NextResponse.json({
      businessId: db.id,
      catalog: db.catalog,
      updatedAt: db.updatedAt,
    })
  } catch (error) {
    console.error('GET /api/catalog', error)
    return NextResponse.json({ error: 'Gagal memuat katalog.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  try {
    const body = await request.json()
    const product = await createCatalogProduct(
      user.id,
      {
        name: body.name,
        shortName: body.shortName,
        variant: body.variant,
        image: body.image,
        unitPrice: Number(body.unitPrice),
        description: body.description,
        stock: Number(body.stock ?? 0),
        lowStockAt: Number(body.lowStockAt ?? 10),
        sku: body.sku,
        keywords: body.keywords,
        rating: body.rating,
        sold: body.sold,
      },
      bizId(request, body),
    )
    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('POST /api/catalog', error)
    const message = error instanceof Error ? error.message : 'Gagal menambah produk.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  try {
    const body = await request.json()
    if (!body?.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'id produk wajib.' }, { status: 400 })
    }
    const { id, businessId: _b, stockDelta, ...patch } = body

    // stockDelta: +N restock tanpa hitung di client (lebih aman)
    if (stockDelta != null && Number.isFinite(Number(stockDelta))) {
      const delta = Math.round(Number(stockDelta))
      const snap = await getSnapshot(bizId(request, body), user.id)
      const current = snap.catalog.find((p) => p.id === id)
      if (!current) {
        return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 })
      }
      patch.stock = Math.max(0, current.stock + delta)
    }

    const product = await updateCatalogProduct(user.id, id, patch, bizId(request, body))
    return NextResponse.json({ product })
  } catch (error) {
    console.error('PATCH /api/catalog', error)
    const message = error instanceof Error ? error.message : 'Gagal memperbarui produk.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
