/**
 * Multi-tenant FILE store — isolasi per user (ownerUserId).
 * Dipakai saat DATABASE_URL tidak di-set (dev lokal tanpa Docker Postgres).
 */

import { promises as fs } from 'fs'
import path from 'path'
import { DEFAULT_AI_PREFERENCES, normalizeAiPreferences } from '@/lib/ai-style'
import { normalizeLocale, normalizeNotifications } from '@/lib/preferences'
import type {
  BusinessDatabase,
  BusinessProfile,
  BusinessRecord,
  BusinessSummary,
  CatalogProduct,
  ContentItem,
  CreateBusinessInput,
  PlatformDatabase,
  TransactionItem,
  TxStatus,
} from '@/lib/types'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'business-db.json')
const SEED_PATH = path.join(DATA_DIR, 'seed.json')

/** Akun seed NUSACID — harus cocok users-seed.json */
export const NUSACID_OWNER_USER_ID = 'user-nusacid-naufal'

const DEFAULT_APP = {
  appName: 'UMKMan',
  tagline: 'UMKM Naik Kelas, Ditenagai Kecerdasan Buatan',
  currency: 'IDR',
  timezone: 'WIB (GMT+7)',
  country: 'Indonesia',
  platforms: ['Instagram', 'Tokopedia', 'Lazada', 'WhatsApp'],
} as const

let writeChain: Promise<unknown> = Promise.resolve()

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn)
  writeChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

async function pathExists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || `usaha-${Date.now().toString(36)}`
  )
}

function normalizeProfile(profile: BusinessProfile): BusinessProfile {
  const { plan: _removedPlan, ...rest } = profile as BusinessProfile & { plan?: unknown }
  return {
    ...rest,
    ai: normalizeAiPreferences(rest.ai),
    notifications: normalizeNotifications(rest.notifications),
    locale: normalizeLocale(rest.locale),
    logo: typeof rest.logo === 'string' && rest.logo.trim() ? rest.logo.trim() : rest.logo,
  }
}

function toSnapshot(biz: BusinessRecord, platformVersion: number): BusinessDatabase {
  return {
    id: biz.id,
    slug: biz.slug,
    version: platformVersion,
    updatedAt: biz.updatedAt,
    profile: normalizeProfile(biz.profile),
    catalog: biz.catalog,
    contents: biz.contents,
    transactions: biz.transactions,
  }
}

function ownedBy(db: PlatformDatabase, userId: string): BusinessRecord[] {
  return db.businesses.filter((b) => b.ownerUserId === userId)
}

function migrateIfNeeded(raw: unknown): PlatformDatabase {
  const data = raw as Record<string, unknown>
  if (Array.isArray(data.businesses)) {
    const platform = data as unknown as PlatformDatabase
    // Pastikan ownerUserId ada di tiap usaha
    platform.businesses = platform.businesses.map((b) => {
      // Jangan assign owner ke NUSACID secara diam-diam; biarkan kosong error di requireOwned
      const ownerUserId = b.ownerUserId || ''
      return {
        ...b,
        ownerUserId,
        profile: normalizeProfile(b.profile || ({} as BusinessProfile)),
      }
    })
    return platform
  }
  if (data.profile && data.catalog) {
    const legacy = data as {
      version?: number
      updatedAt?: string
      profile: BusinessProfile
      catalog: CatalogProduct[]
      contents?: ContentItem[]
      transactions?: TransactionItem[]
    }
    const id = 'biz-legacy'
    const record: BusinessRecord = {
      id,
      slug: slugify(legacy.profile.brand || 'usaha'),
      ownerUserId: NUSACID_OWNER_USER_ID,
      createdAt: legacy.updatedAt || new Date().toISOString(),
      updatedAt: legacy.updatedAt || new Date().toISOString(),
      profile: legacy.profile,
      catalog: legacy.catalog || [],
      contents: legacy.contents || [],
      transactions: legacy.transactions || [],
    }
    return {
      version: legacy.version || 1,
      updatedAt: record.updatedAt,
      activeBusinessId: id,
      businesses: [record],
    }
  }
  throw new Error('Format database tidak dikenali.')
}

async function ensureDbFile() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  if (await pathExists(DB_PATH)) return
  const seedRaw = await fs.readFile(SEED_PATH, 'utf8')
  await fs.writeFile(DB_PATH, seedRaw, 'utf8')
}

async function readPlatform(): Promise<PlatformDatabase> {
  await ensureDbFile()
  const raw = await fs.readFile(DB_PATH, 'utf8')
  return migrateIfNeeded(JSON.parse(raw))
}

async function writePlatform(db: PlatformDatabase) {
  db.updatedAt = new Date().toISOString()
  db.version = (db.version || 0) + 1
  await fs.mkdir(DATA_DIR, { recursive: true })
  const tmp = `${DB_PATH}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf8')
  await fs.rename(tmp, DB_PATH)
}

function requireOwnedBusiness(
  db: PlatformDatabase,
  userId: string,
  businessId?: string | null,
): BusinessRecord {
  const mine = ownedBy(db, userId)
  if (mine.length === 0) {
    throw new Error('Belum ada usaha. Buat usaha baru dulu — data usaha lain tidak ditampilkan.')
  }
  if (businessId) {
    const biz = mine.find((b) => b.id === businessId)
    if (!biz) throw new Error('Usaha tidak ditemukan atau bukan milik akun Anda.')
    return biz
  }
  return mine[0]
}

function touchBusiness(biz: BusinessRecord) {
  biz.updatedAt = new Date().toISOString()
}

/* ================= Public API (selalu butuh userId) ================= */

export async function listBusinesses(userId: string): Promise<BusinessSummary[]> {
  const db = await readPlatform()
  const activeHint = db.activeBusinessId
  return ownedBy(db, userId).map((b) => ({
    id: b.id,
    slug: b.slug,
    brand: b.profile.brand,
    owner: b.profile.owner,
    city: b.profile.city,
    category: b.profile.category,
    productCount: b.catalog.length,
    stockTotal: b.catalog.reduce((s, p) => s + p.stock, 0),
    isActive: b.id === activeHint || ownedBy(db, userId)[0]?.id === b.id,
  }))
}

export type SnapshotResult =
  | { ok: true; business: BusinessDatabase; businesses: BusinessSummary[] }
  | { ok: false; needsOnboarding: true; businesses: [] }

export async function getSnapshotForUser(
  userId: string,
  businessId?: string | null,
): Promise<SnapshotResult> {
  const db = await readPlatform()
  const mine = ownedBy(db, userId)
  if (mine.length === 0) {
    return { ok: false, needsOnboarding: true, businesses: [] }
  }
  let biz = businessId ? mine.find((b) => b.id === businessId) : undefined
  if (!biz) biz = mine[0]
  const businesses = mine.map((b) => ({
    id: b.id,
    slug: b.slug,
    brand: b.profile.brand,
    owner: b.profile.owner,
    city: b.profile.city,
    category: b.profile.category,
    productCount: b.catalog.length,
    stockTotal: b.catalog.reduce((s, p) => s + p.stock, 0),
    isActive: b.id === biz!.id,
  }))
  return { ok: true, business: toSnapshot(biz, db.version), businesses }
}

/** @deprecated gunakan getSnapshotForUser — tetap ada untuk AI setelah auth */
export async function getSnapshot(businessId?: string | null, userId?: string | null) {
  if (!userId) {
    // Legacy path: jangan bocorkan NUSACID ke caller anonim
    throw new Error('Autentikasi wajib.')
  }
  const result = await getSnapshotForUser(userId, businessId)
  if (!result.ok) throw new Error('Belum ada usaha.')
  return result.business
}

export async function setActiveBusiness(userId: string, businessId: string): Promise<BusinessDatabase> {
  return withLock(async () => {
    const db = await readPlatform()
    const biz = requireOwnedBusiness(db, userId, businessId)
    db.activeBusinessId = businessId
    await writePlatform(db)
    return toSnapshot(biz, db.version)
  })
}

export async function createBusiness(
  userId: string,
  input: CreateBusinessInput,
): Promise<BusinessDatabase> {
  return withLock(async () => {
    const db = await readPlatform()
    const brand = (input.brand || '').trim()
    const owner = (input.owner || '').trim()
    if (!brand || !owner) throw new Error('Nama usaha dan pemilik wajib diisi.')

    let slug = slugify(brand)
    const existing = new Set(db.businesses.map((b) => b.slug))
    if (existing.has(slug)) slug = `${slug}-${Date.now().toString(36).slice(-4)}`

    const now = new Date().toISOString()
    const profile: BusinessProfile = {
      brand,
      owner,
      city: (input.city || '').trim() || 'Indonesia',
      region: (input.region || '').trim() || '',
      country: DEFAULT_APP.country,
      email: (input.email || '').trim() || `${slug}@umkman.local`,
      phone: (input.phone || '').trim() || '',
      address: (input.address || input.city || '').trim() || '',
      category: (input.category || '').trim() || 'UMKM',
      platforms: [...DEFAULT_APP.platforms],
      currency: DEFAULT_APP.currency,
      timezone: DEFAULT_APP.timezone,
      appName: DEFAULT_APP.appName,
      tagline: DEFAULT_APP.tagline,
      ai: { ...DEFAULT_AI_PREFERENCES },
      notifications: normalizeNotifications(null),
      locale: 'id',
    }

    const record: BusinessRecord = {
      id: `biz-${Date.now().toString(36)}`,
      slug,
      ownerUserId: userId,
      createdAt: now,
      updatedAt: now,
      profile,
      catalog: [],
      contents: [],
      transactions: [],
    }

    db.businesses.push(record)
    db.activeBusinessId = record.id
    await writePlatform(db)
    return toSnapshot(record, db.version)
  })
}

export async function updateProfile(
  userId: string,
  patch: Partial<BusinessProfile>,
  businessId?: string | null,
): Promise<BusinessProfile> {
  return withLock(async () => {
    const db = await readPlatform()
    const biz = requireOwnedBusiness(db, userId, businessId)
    const nextAi =
      patch.ai !== undefined
        ? normalizeAiPreferences({
            ...normalizeAiPreferences(biz.profile.ai),
            ...patch.ai,
          })
        : normalizeAiPreferences(biz.profile.ai)
    const nextNotifications =
      patch.notifications !== undefined
        ? normalizeNotifications({
            ...normalizeNotifications(biz.profile.notifications),
            ...patch.notifications,
          })
        : normalizeNotifications(biz.profile.notifications)
    const { ai: _a, notifications: _n, ...rest } = patch
    biz.profile = normalizeProfile({
      ...biz.profile,
      ...rest,
      ai: nextAi,
      notifications: nextNotifications,
      locale: patch.locale !== undefined ? normalizeLocale(patch.locale) : biz.profile.locale,
    })
    touchBusiness(biz)
    await writePlatform(db)
    return biz.profile
  })
}

/** Hapus semua usaha milik user (dipakai saat hapus akun). */
export async function deleteBusinessesForUser(userId: string): Promise<number> {
  return withLock(async () => {
    const db = await readPlatform()
    const before = db.businesses.length
    db.businesses = db.businesses.filter((b) => b.ownerUserId !== userId)
    const removed = before - db.businesses.length
    if (db.businesses.some((b) => b.id === db.activeBusinessId) === false) {
      db.activeBusinessId = db.businesses[0]?.id || ''
    }
    await writePlatform(db)
    return removed
  })
}

export async function updateCatalogProduct(
  userId: string,
  id: string,
  patch: Partial<Omit<CatalogProduct, 'id'>>,
  businessId?: string | null,
): Promise<CatalogProduct> {
  return withLock(async () => {
    const db = await readPlatform()
    const biz = requireOwnedBusiness(db, userId, businessId)
    const index = biz.catalog.findIndex((p) => p.id === id)
    if (index < 0) throw new Error(`Produk ${id} tidak ditemukan di usaha ini.`)
    biz.catalog[index] = { ...biz.catalog[index], ...patch, id }
    touchBusiness(biz)
    await writePlatform(db)
    return biz.catalog[index]
  })
}

export async function createCatalogProduct(
  userId: string,
  input: Omit<CatalogProduct, 'id' | 'sold' | 'rating'> & { sold?: number; rating?: number },
  businessId?: string | null,
): Promise<CatalogProduct> {
  return withLock(async () => {
    const db = await readPlatform()
    const biz = requireOwnedBusiness(db, userId, businessId)
    const name = (input.name || '').trim()
    if (!name) throw new Error('Nama produk wajib.')
    if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0) {
      throw new Error('Harga satuan tidak valid.')
    }

    const product: CatalogProduct = {
      id: `prod-${Date.now().toString(36)}`,
      name,
      shortName: (input.shortName || name).trim().slice(0, 48),
      variant: (input.variant || '-').trim(),
      image: input.image || '/placeholder.svg',
      unitPrice: Math.round(input.unitPrice),
      rating: input.rating ?? 0,
      sold: input.sold ?? 0,
      description: (input.description || '').trim(),
      stock: Math.max(0, Math.round(input.stock || 0)),
      lowStockAt: Math.max(0, Math.round(input.lowStockAt ?? 10)),
      sku: (input.sku || `SKU-${Date.now().toString(36).toUpperCase()}`).trim(),
      keywords: Array.isArray(input.keywords)
        ? input.keywords
        : name
            .toLowerCase()
            .split(/[^a-z0-9]+/i)
            .filter((t) => t.length > 1)
            .slice(0, 12),
    }

    biz.catalog.push(product)
    touchBusiness(biz)
    await writePlatform(db)
    return product
  })
}

export function findProduct(
  catalog: CatalogProduct[],
  query: { productId?: string; productName?: string },
): CatalogProduct | undefined {
  if (query.productId) {
    const byId = catalog.find((p) => p.id === query.productId)
    if (byId) return byId
  }
  if (!query.productName) return undefined
  const lower = query.productName.toLowerCase()
  return (
    catalog.find((p) => p.name.toLowerCase() === lower) ||
    catalog.find((p) => lower.includes(p.variant.toLowerCase().replace(/\s/g, ''))) ||
    catalog.find((p) => lower.includes(p.variant.toLowerCase())) ||
    catalog.find((p) => p.keywords.some((k) => lower.includes(k))) ||
    catalog.find((p) => lower.includes(p.shortName.toLowerCase())) ||
    catalog.find((p) => lower.includes(p.name.toLowerCase()))
  )
}

function nowStamp() {
  const now = new Date()
  const date = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  const time = now
    .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    .replace(':', '.')
  return { createdAt: now.toISOString(), date, time }
}

export type CreateTransactionInput = {
  productId?: string
  product?: string
  qty: number
  unitPrice?: number
  status?: TxStatus
  businessId?: string | null
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput,
): Promise<{
  transaction: TransactionItem
  catalog: CatalogProduct[]
  businessId: string
}> {
  return withLock(async () => {
    const db = await readPlatform()
    const biz = requireOwnedBusiness(db, userId, input.businessId)
    const qty = Math.max(1, Math.round(Number(input.qty) || 1))
    const product = findProduct(biz.catalog, {
      productId: input.productId,
      productName: input.product,
    })
    if (!product) {
      throw new Error('Produk tidak ditemukan di katalog usaha ini. Tambah produk dulu.')
    }
    if (product.stock < qty) {
      throw new Error(
        `Stok ${product.shortName} tidak cukup. Tersedia ${product.stock}, diminta ${qty}.`,
      )
    }

    const unitPrice =
      typeof input.unitPrice === 'number' && Number.isFinite(input.unitPrice) && input.unitPrice >= 0
        ? Math.round(input.unitPrice)
        : product.unitPrice

    const status: TxStatus =
      input.status === 'Perlu Verifikasi' ? 'Perlu Verifikasi' : 'Tersimpan'
    const stamp = nowStamp()
    const transaction: TransactionItem = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...stamp,
      productId: product.id,
      product: product.name,
      variant: product.variant,
      image: product.image,
      qty,
      unitPrice,
      total: unitPrice * qty,
      status,
    }

    // Stok & sold hanya berubah saat status final "Tersimpan"
    if (status === 'Tersimpan') {
      product.stock -= qty
      product.sold += qty
    }
    biz.transactions = [transaction, ...biz.transactions]
    touchBusiness(biz)
    await writePlatform(db)
    return { transaction, catalog: biz.catalog, businessId: biz.id }
  })
}

/**
 * Verifikasi / batalkan transaksi.
 * - Perlu Verifikasi → Tersimpan: kurangi stok
 * - Tersimpan → dibatalkan (hapus): kembalikan stok
 * - Perlu Verifikasi → dibatalkan: hapus tanpa sentuh stok
 */
export async function updateTransactionStatus(
  userId: string,
  transactionId: string,
  nextStatus: TxStatus | 'Dibatalkan',
  businessId?: string | null,
): Promise<{
  transaction: TransactionItem | null
  catalog: CatalogProduct[]
  businessId: string
  removed?: boolean
}> {
  return withLock(async () => {
    const db = await readPlatform()
    const biz = requireOwnedBusiness(db, userId, businessId)
    const index = biz.transactions.findIndex((t) => t.id === transactionId)
    if (index < 0) throw new Error('Transaksi tidak ditemukan.')
    const tx = biz.transactions[index]
    const product = biz.catalog.find((p) => p.id === tx.productId)

    if (nextStatus === 'Dibatalkan') {
      if (tx.status === 'Tersimpan' && product) {
        product.stock += tx.qty
        product.sold = Math.max(0, product.sold - tx.qty)
      }
      biz.transactions.splice(index, 1)
      touchBusiness(biz)
      await writePlatform(db)
      return { transaction: null, catalog: biz.catalog, businessId: biz.id, removed: true }
    }

    if (nextStatus === 'Tersimpan' && tx.status === 'Perlu Verifikasi') {
      if (!product) throw new Error('Produk transaksi tidak ada di katalog.')
      if (product.stock < tx.qty) {
        throw new Error(
          `Stok ${product.shortName} tidak cukup untuk verifikasi. Tersedia ${product.stock}, diminta ${tx.qty}.`,
        )
      }
      product.stock -= tx.qty
      product.sold += tx.qty
      tx.status = 'Tersimpan'
      touchBusiness(biz)
      await writePlatform(db)
      return { transaction: tx, catalog: biz.catalog, businessId: biz.id }
    }

    if (nextStatus === 'Perlu Verifikasi' && tx.status === 'Tersimpan') {
      // Kembalikan ke pending: restore stock
      if (product) {
        product.stock += tx.qty
        product.sold = Math.max(0, product.sold - tx.qty)
      }
      tx.status = 'Perlu Verifikasi'
      touchBusiness(biz)
      await writePlatform(db)
      return { transaction: tx, catalog: biz.catalog, businessId: biz.id }
    }

    // No-op same status
    return { transaction: tx, catalog: biz.catalog, businessId: biz.id }
  })
}

export async function addContents(
  userId: string,
  items: Omit<ContentItem, 'id' | 'createdAt'>[],
  businessId?: string | null,
): Promise<ContentItem[]> {
  return withLock(async () => {
    const db = await readPlatform()
    const biz = requireOwnedBusiness(db, userId, businessId)
    const createdAt = new Date().toISOString()
    const created: ContentItem[] = items.map((item, index) => ({
      ...item,
      id: `c-${Date.now()}-${index}`,
      createdAt,
    }))
    biz.contents = [...created, ...biz.contents]
    touchBusiness(biz)
    await writePlatform(db)
    return created
  })
}

export async function updateContent(
  userId: string,
  id: string,
  patch: Partial<Omit<ContentItem, 'id'>>,
  businessId?: string | null,
): Promise<ContentItem> {
  return withLock(async () => {
    const db = await readPlatform()
    const biz = requireOwnedBusiness(db, userId, businessId)
    const index = biz.contents.findIndex((c) => c.id === id)
    if (index < 0) throw new Error(`Konten ${id} tidak ditemukan.`)
    biz.contents[index] = { ...biz.contents[index], ...patch, id }
    touchBusiness(biz)
    await writePlatform(db)
    return biz.contents[index]
  })
}

export async function resetDbFromSeed(): Promise<PlatformDatabase> {
  return withLock(async () => {
    const seedRaw = await fs.readFile(SEED_PATH, 'utf8')
    const migrated = migrateIfNeeded(JSON.parse(seedRaw))
    await writePlatform(migrated)
    // Also reset users from seed
    const usersSeed = path.join(DATA_DIR, 'users-seed.json')
    const usersPath = path.join(DATA_DIR, 'users.json')
    if (await pathExists(usersSeed)) {
      await fs.copyFile(usersSeed, usersPath)
    }
    return migrated
  })
}
