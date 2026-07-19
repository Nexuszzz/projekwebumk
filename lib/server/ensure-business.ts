/**
 * Pastikan user punya minimal 1 usaha.
 * Di Vercel (tanpa Postgres) data /tmp sering kosong → "Belum ada usaha".
 * Dengan Postgres: juga pastikan baris User ada (FK owner).
 */

import type { AuthUser } from '@/lib/types'
import { createBusiness, getSnapshotForUser } from '@/lib/server/db'
import { ensureUserFromAuth } from '@/lib/server/users'

export async function ensureUserBusiness(
  user: AuthUser,
  businessId?: string | null,
  extras?: { phone?: string; brandHint?: string },
) {
  // 0) User harus ada di DB (hindari FK businesses_ownerUserId_fkey)
  let resolved = user
  try {
    resolved = await ensureUserFromAuth(user)
  } catch (error) {
    console.error('[ensureUserBusiness] ensureUserFromAuth failed', error)
  }

  // 1) Coba dengan businessId client
  let snap = await getSnapshotForUser(resolved.id, businessId)
  if (snap.ok) return snap

  // 2) businessId basi / tidak ada — coba usaha lain milik user
  if (businessId) {
    snap = await getSnapshotForUser(resolved.id, null)
    if (snap.ok) return snap
  }

  // 3) Buat usaha default
  const brand =
    (extras?.brandHint || resolved.name || resolved.email?.split('@')[0] || 'Usaha Saya')
      .replace(/^@/, '')
      .trim()
      .slice(0, 60) || 'Usaha Saya'

  try {
    await createBusiness(resolved.id, {
      brand,
      owner: resolved.name || resolved.email || brand,
      email: resolved.email || undefined,
      phone: extras?.phone,
      category: 'UMKM',
    })
  } catch (error) {
    console.error('[ensureUserBusiness] create failed', error)
  }

  return getSnapshotForUser(resolved.id, null)
}
