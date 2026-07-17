import { getSessionUser, unauthorized } from '@/lib/server/auth'
import { createTransaction, getSnapshot, updateTransactionStatus } from '@/lib/server/db'
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
      transactions: db.transactions,
      catalog: db.catalog,
    })
  } catch (error) {
    console.error('GET /api/transactions', error)
    return NextResponse.json({ error: 'Gagal memuat transaksi.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  try {
    const body = await request.json()
    const qty = Number(body?.qty)
    if (!Number.isFinite(qty) || qty < 1) {
      return NextResponse.json({ error: 'qty minimal 1.' }, { status: 400 })
    }
    if (!body?.productId && !body?.product) {
      return NextResponse.json({ error: 'productId atau product wajib.' }, { status: 400 })
    }

    const result = await createTransaction(user.id, {
      productId: body.productId,
      product: body.product,
      qty,
      unitPrice: body.unitPrice != null ? Number(body.unitPrice) : undefined,
      status: body.status === 'Perlu Verifikasi' ? 'Perlu Verifikasi' : 'Tersimpan',
      businessId: bizId(request, body),
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('POST /api/transactions', error)
    const message = error instanceof Error ? error.message : 'Gagal menyimpan transaksi.'
    const status = message.includes('Stok') || message.includes('tidak ditemukan') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/** Verifikasi / batalkan transaksi. */
export async function PATCH(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  try {
    const body = await request.json()
    const id = String(body?.id || '')
    const action = String(body?.action || body?.status || '')
    if (!id) {
      return NextResponse.json({ error: 'id transaksi wajib.' }, { status: 400 })
    }

    let nextStatus: 'Tersimpan' | 'Perlu Verifikasi' | 'Dibatalkan'
    if (action === 'verify' || action === 'Tersimpan') nextStatus = 'Tersimpan'
    else if (action === 'reject' || action === 'Dibatalkan' || action === 'batal') nextStatus = 'Dibatalkan'
    else if (action === 'Perlu Verifikasi') nextStatus = 'Perlu Verifikasi'
    else {
      return NextResponse.json(
        { error: 'action wajib: verify | reject | Tersimpan | Dibatalkan' },
        { status: 400 },
      )
    }

    const result = await updateTransactionStatus(user.id, id, nextStatus, bizId(request, body))
    return NextResponse.json(result)
  } catch (error) {
    console.error('PATCH /api/transactions', error)
    const message = error instanceof Error ? error.message : 'Gagal memperbarui transaksi.'
    const status = message.includes('Stok') || message.includes('tidak ditemukan') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
