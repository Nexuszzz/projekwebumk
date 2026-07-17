import { clearSessionCookie, getSessionUser, unauthorized } from '@/lib/server/auth'
import { deleteBusinessesForUser } from '@/lib/server/db'
import { deleteUserAccount } from '@/lib/server/users'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/** Hapus akun user + semua usaha miliknya. Wajib confirm: "HAPUS" atau email. */
export async function DELETE(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  let body: { confirm?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Body JSON wajib. Kirim { "confirm": "HAPUS" }.' },
      { status: 400 },
    )
  }

  const confirm = (body.confirm || '').trim()
  if (confirm !== 'HAPUS' && confirm !== user.email) {
    return NextResponse.json(
      { error: 'Konfirmasi wajib. Ketik HAPUS atau email akun Anda.' },
      { status: 400 },
    )
  }

  try {
    const removedBiz = await deleteBusinessesForUser(user.id)
    await deleteUserAccount(user.id)
    const response = NextResponse.json({
      ok: true,
      removedBusinesses: removedBiz,
      message: 'Akun dan data usaha dihapus.',
    })
    clearSessionCookie(response)
    response.cookies.set('umkman_sid', '', { path: '/', maxAge: 0 })
    return response
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal menghapus akun.' },
      { status: 400 },
    )
  }
}
