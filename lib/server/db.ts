/**
 * Data layer multi-tenant.
 * - DATABASE_URL=postgresql://...  → Postgres (Prisma)
 * - tanpa DATABASE_URL             → file JSON (data/*.json) untuk dev lokal
 */

import { usePostgres } from '@/lib/server/prisma'

export type { SnapshotResult, CreateTransactionInput } from '@/lib/server/db-file'

async function backend() {
  if (usePostgres()) return import('@/lib/server/db-pg')
  return import('@/lib/server/db-file')
}

export async function listBusinesses(...args: Parameters<typeof import('@/lib/server/db-file').listBusinesses>) {
  const m = await backend()
  return m.listBusinesses(...args)
}

export async function getSnapshotForUser(
  ...args: Parameters<typeof import('@/lib/server/db-file').getSnapshotForUser>
) {
  const m = await backend()
  return m.getSnapshotForUser(...args)
}

export async function getSnapshot(...args: Parameters<typeof import('@/lib/server/db-file').getSnapshot>) {
  const m = await backend()
  return m.getSnapshot(...args)
}

export async function setActiveBusiness(
  ...args: Parameters<typeof import('@/lib/server/db-file').setActiveBusiness>
) {
  const m = await backend()
  return m.setActiveBusiness(...args)
}

export async function createBusiness(
  ...args: Parameters<typeof import('@/lib/server/db-file').createBusiness>
) {
  const m = await backend()
  return m.createBusiness(...args)
}

export async function updateProfile(
  ...args: Parameters<typeof import('@/lib/server/db-file').updateProfile>
) {
  const m = await backend()
  return m.updateProfile(...args)
}

export async function deleteBusinessesForUser(
  ...args: Parameters<typeof import('@/lib/server/db-file').deleteBusinessesForUser>
) {
  const m = await backend()
  return m.deleteBusinessesForUser(...args)
}

export async function updateCatalogProduct(
  ...args: Parameters<typeof import('@/lib/server/db-file').updateCatalogProduct>
) {
  const m = await backend()
  return m.updateCatalogProduct(...args)
}

export async function createCatalogProduct(
  ...args: Parameters<typeof import('@/lib/server/db-file').createCatalogProduct>
) {
  const m = await backend()
  return m.createCatalogProduct(...args)
}

export { findProduct } from '@/lib/server/db-file'

export async function createTransaction(
  ...args: Parameters<typeof import('@/lib/server/db-file').createTransaction>
) {
  const m = await backend()
  return m.createTransaction(...args)
}

export async function updateTransactionStatus(
  ...args: Parameters<typeof import('@/lib/server/db-file').updateTransactionStatus>
) {
  const m = await backend()
  return m.updateTransactionStatus(...args)
}

export async function addContents(...args: Parameters<typeof import('@/lib/server/db-file').addContents>) {
  const m = await backend()
  return m.addContents(...args)
}

export async function updateContent(
  ...args: Parameters<typeof import('@/lib/server/db-file').updateContent>
) {
  const m = await backend()
  return m.updateContent(...args)
}

export async function findBusinessByWhatsAppDevice(
  ...args: Parameters<typeof import('@/lib/server/db-file').findBusinessByWhatsAppDevice>
) {
  const m = await backend()
  return m.findBusinessByWhatsAppDevice(...args)
}

export const NUSACID_OWNER_USER_ID = 'user-nusacid-naufal'
