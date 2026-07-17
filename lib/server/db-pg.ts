/**
 * Postgres multi-tenant store (Prisma).
 * Isolasi ketat via ownerUserId + businessId.
 */

import { DEFAULT_AI_PREFERENCES, normalizeAiPreferences } from '@/lib/ai-style'
import { normalizeLocale, normalizeNotifications } from '@/lib/preferences'
import { getPrisma } from '@/lib/server/prisma'
import type {
  BusinessDatabase,
  BusinessProfile,
  BusinessSummary,
  CatalogProduct,
  ContentItem,
  CreateBusinessInput,
  TransactionItem,
  TxStatus,
} from '@/lib/types'
import type { Prisma } from '@prisma/client'

const DEFAULT_APP = {
  appName: 'UMKMan',
  tagline: 'UMKM Naik Kelas, Ditenagai Kecerdasan Buatan',
  currency: 'IDR',
  timezone: 'WIB (GMT+7)',
  country: 'Indonesia',
  platforms: ['Instagram', 'Tokopedia', 'Lazada', 'WhatsApp'],
} as const

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
  const { plan: _p, ...rest } = profile as BusinessProfile & { plan?: unknown }
  return {
    ...rest,
    ai: normalizeAiPreferences(rest.ai),
    notifications: normalizeNotifications(rest.notifications),
    locale: normalizeLocale(rest.locale),
    logo: typeof rest.logo === 'string' && rest.logo.trim() ? rest.logo.trim() : rest.logo,
  }
}

function asProfile(raw: unknown): BusinessProfile {
  return normalizeProfile((raw || {}) as BusinessProfile)
}

function mapProduct(p: {
  id: string
  name: string
  shortName: string
  variant: string
  image: string
  unitPrice: number
  rating: number
  sold: number
  description: string
  stock: number
  lowStockAt: number
  sku: string
  keywords: unknown
}): CatalogProduct {
  return {
    id: p.id,
    name: p.name,
    shortName: p.shortName,
    variant: p.variant,
    image: p.image,
    unitPrice: p.unitPrice,
    rating: p.rating,
    sold: p.sold,
    description: p.description,
    stock: p.stock,
    lowStockAt: p.lowStockAt,
    sku: p.sku,
    keywords: Array.isArray(p.keywords) ? (p.keywords as string[]) : [],
  }
}

function mapContent(c: {
  id: string
  createdAt: Date
  title: string
  description: string
  image: string
  platform: string
  status: string
}): ContentItem {
  return {
    id: c.id,
    createdAt: c.createdAt.toISOString(),
    title: c.title,
    description: c.description,
    image: c.image,
    platform: c.platform as ContentItem['platform'],
    status: c.status as ContentItem['status'],
  }
}

function mapTx(t: {
  id: string
  createdAt: Date
  productId: string
  product: string
  variant: string
  image: string
  qty: number
  unitPrice: number
  total: number
  status: string
  date: string
  time: string
}): TransactionItem {
  return {
    id: t.id,
    createdAt: t.createdAt.toISOString(),
    productId: t.productId,
    product: t.product,
    variant: t.variant,
    image: t.image,
    qty: t.qty,
    unitPrice: t.unitPrice,
    total: t.total,
    status: t.status as TxStatus,
    date: t.date,
    time: t.time,
  }
}

type BizFull = {
  id: string
  slug: string
  ownerUserId: string
  createdAt: Date
  updatedAt: Date
  profile: unknown
  products: Parameters<typeof mapProduct>[0][]
  contents: Parameters<typeof mapContent>[0][]
  transactions: Parameters<typeof mapTx>[0][]
}

function toSnapshot(biz: BizFull): BusinessDatabase {
  return {
    id: biz.id,
    slug: biz.slug,
    version: 1,
    updatedAt: biz.updatedAt.toISOString(),
    profile: asProfile(biz.profile),
    catalog: biz.products.map(mapProduct),
    contents: biz.contents.map(mapContent),
    transactions: biz.transactions.map(mapTx),
  }
}

const includeAll = {
  products: { orderBy: { name: 'asc' as const } },
  contents: { orderBy: { createdAt: 'desc' as const } },
  transactions: { orderBy: { createdAt: 'desc' as const } },
}

async function requireOwned(userId: string, businessId?: string | null) {
  const prisma = getPrisma()
  const mine = await prisma.business.findMany({
    where: { ownerUserId: userId },
    include: includeAll,
    orderBy: { createdAt: 'asc' },
  })
  if (mine.length === 0) throw new Error('Belum ada usaha. Buat usaha baru dulu.')
  if (businessId) {
    const hit = mine.find((b) => b.id === businessId)
    if (!hit) throw new Error('Usaha tidak ditemukan atau bukan milik akun Anda.')
    return hit
  }
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user?.activeBusinessId) {
    const active = mine.find((b) => b.id === user.activeBusinessId)
    if (active) return active
  }
  return mine[0]
}

async function summariesFor(userId: string, activeId: string): Promise<BusinessSummary[]> {
  const prisma = getPrisma()
  const list = await prisma.business.findMany({
    where: { ownerUserId: userId },
    include: { products: { select: { stock: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return list.map((b) => {
    const profile = asProfile(b.profile)
    return {
      id: b.id,
      slug: b.slug,
      brand: profile.brand,
      owner: profile.owner,
      city: profile.city,
      category: profile.category,
      productCount: b.products.length,
      stockTotal: b.products.reduce((s, p) => s + p.stock, 0),
      isActive: b.id === activeId,
    }
  })
}

export type SnapshotResult =
  | { ok: true; business: BusinessDatabase; businesses: BusinessSummary[] }
  | { ok: false; needsOnboarding: true; businesses: [] }

export async function getSnapshotForUser(
  userId: string,
  businessId?: string | null,
): Promise<SnapshotResult> {
  const prisma = getPrisma()
  const count = await prisma.business.count({ where: { ownerUserId: userId } })
  if (count === 0) return { ok: false, needsOnboarding: true, businesses: [] }
  const biz = await requireOwned(userId, businessId)
  const businesses = await summariesFor(userId, biz.id)
  return { ok: true, business: toSnapshot(biz), businesses }
}

export async function getSnapshot(businessId?: string | null, userId?: string | null) {
  if (!userId) throw new Error('Autentikasi wajib.')
  const result = await getSnapshotForUser(userId, businessId)
  if (!result.ok) throw new Error('Belum ada usaha.')
  return result.business
}

export async function listBusinesses(userId: string): Promise<BusinessSummary[]> {
  const prisma = getPrisma()
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const mine = await prisma.business.findMany({
    where: { ownerUserId: userId },
    include: { products: { select: { stock: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const activeHint = user?.activeBusinessId || mine[0]?.id
  return mine.map((b) => {
    const profile = asProfile(b.profile)
    return {
      id: b.id,
      slug: b.slug,
      brand: profile.brand,
      owner: profile.owner,
      city: profile.city,
      category: profile.category,
      productCount: b.products.length,
      stockTotal: b.products.reduce((s, p) => s + p.stock, 0),
      isActive: b.id === activeHint,
    }
  })
}

export async function setActiveBusiness(userId: string, businessId: string): Promise<BusinessDatabase> {
  const prisma = getPrisma()
  const biz = await requireOwned(userId, businessId)
  await prisma.user.update({
    where: { id: userId },
    data: { activeBusinessId: businessId },
  })
  return toSnapshot(biz)
}

export async function createBusiness(
  userId: string,
  input: CreateBusinessInput,
): Promise<BusinessDatabase> {
  const prisma = getPrisma()
  const brand = (input.brand || '').trim()
  const owner = (input.owner || '').trim()
  if (!brand || !owner) throw new Error('Nama usaha dan pemilik wajib diisi.')

  let slug = slugify(brand)
  const clash = await prisma.business.findFirst({ where: { ownerUserId: userId, slug } })
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`

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

  const id = `biz-${Date.now().toString(36)}`
  const created = await prisma.business.create({
    data: {
      id,
      slug,
      ownerUserId: userId,
      profile: profile as unknown as Prisma.InputJsonValue,
    },
    include: includeAll,
  })
  await prisma.user.update({
    where: { id: userId },
    data: { activeBusinessId: id },
  })
  return toSnapshot(created)
}

export async function updateProfile(
  userId: string,
  patch: Partial<BusinessProfile>,
  businessId?: string | null,
): Promise<BusinessProfile> {
  const prisma = getPrisma()
  const biz = await requireOwned(userId, businessId)
  const current = asProfile(biz.profile)
  const nextAi =
    patch.ai !== undefined
      ? normalizeAiPreferences({ ...normalizeAiPreferences(current.ai), ...patch.ai })
      : normalizeAiPreferences(current.ai)
  const nextNotifications =
    patch.notifications !== undefined
      ? normalizeNotifications({
          ...normalizeNotifications(current.notifications),
          ...patch.notifications,
        })
      : normalizeNotifications(current.notifications)
  const { ai: _a, notifications: _n, ...rest } = patch
  const next = normalizeProfile({
    ...current,
    ...rest,
    ai: nextAi,
    notifications: nextNotifications,
    locale: patch.locale !== undefined ? normalizeLocale(patch.locale) : current.locale,
  })
  await prisma.business.update({
    where: { id: biz.id },
    data: { profile: next as unknown as Prisma.InputJsonValue },
  })
  return next
}

export async function deleteBusinessesForUser(userId: string): Promise<number> {
  const prisma = getPrisma()
  const result = await prisma.business.deleteMany({ where: { ownerUserId: userId } })
  await prisma.user.update({
    where: { id: userId },
    data: { activeBusinessId: null },
  })
  return result.count
}

export async function updateCatalogProduct(
  userId: string,
  id: string,
  patch: Partial<Omit<CatalogProduct, 'id'>>,
  businessId?: string | null,
): Promise<CatalogProduct> {
  const prisma = getPrisma()
  const biz = await requireOwned(userId, businessId)
  const existing = biz.products.find((p) => p.id === id)
  if (!existing) throw new Error(`Produk ${id} tidak ditemukan di usaha ini.`)
  const updated = await prisma.product.update({
    where: { id },
    data: {
      name: patch.name ?? existing.name,
      shortName: patch.shortName ?? existing.shortName,
      variant: patch.variant ?? existing.variant,
      image: patch.image ?? existing.image,
      unitPrice: patch.unitPrice ?? existing.unitPrice,
      rating: patch.rating ?? existing.rating,
      sold: patch.sold ?? existing.sold,
      description: patch.description ?? existing.description,
      stock: patch.stock ?? existing.stock,
      lowStockAt: patch.lowStockAt ?? existing.lowStockAt,
      sku: patch.sku ?? existing.sku,
      keywords: (patch.keywords ??
        (Array.isArray(existing.keywords) ? existing.keywords : [])) as Prisma.InputJsonValue,
    },
  })
  return mapProduct(updated)
}

export async function createCatalogProduct(
  userId: string,
  input: Omit<CatalogProduct, 'id' | 'sold' | 'rating'> & { sold?: number; rating?: number },
  businessId?: string | null,
): Promise<CatalogProduct> {
  const prisma = getPrisma()
  const biz = await requireOwned(userId, businessId)
  const name = (input.name || '').trim()
  if (!name) throw new Error('Nama produk wajib.')
  if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0) {
    throw new Error('Harga satuan tidak valid.')
  }
  const keywords = Array.isArray(input.keywords)
    ? input.keywords
    : name
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter((t) => t.length > 1)
        .slice(0, 12)
  const product = await prisma.product.create({
    data: {
      id: `prod-${Date.now().toString(36)}`,
      businessId: biz.id,
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
      keywords: keywords as Prisma.InputJsonValue,
    },
  })
  return mapProduct(product)
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
  return { createdAt: now, date, time }
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
  const prisma = getPrisma()
  const biz = await requireOwned(userId, input.businessId)
  const catalog = biz.products.map(mapProduct)
  const qty = Math.max(1, Math.round(Number(input.qty) || 1))
  const product = findProduct(catalog, {
    productId: input.productId,
    productName: input.product,
  })
  if (!product) throw new Error('Produk tidak ditemukan di katalog usaha ini. Tambah produk dulu.')
  if (product.stock < qty) {
    throw new Error(`Stok ${product.shortName} tidak cukup. Tersedia ${product.stock}, diminta ${qty}.`)
  }

  const unitPrice =
    typeof input.unitPrice === 'number' && Number.isFinite(input.unitPrice) && input.unitPrice >= 0
      ? Math.round(input.unitPrice)
      : product.unitPrice
  const status: TxStatus = input.status === 'Perlu Verifikasi' ? 'Perlu Verifikasi' : 'Tersimpan'
  const stamp = nowStamp()
  const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  const tx = await prisma.$transaction(async (client) => {
    const created = await client.transaction.create({
      data: {
        id,
        businessId: biz.id,
        createdAt: stamp.createdAt,
        productId: product.id,
        product: product.name,
        variant: product.variant,
        image: product.image,
        qty,
        unitPrice,
        total: unitPrice * qty,
        status,
        date: stamp.date,
        time: stamp.time,
      },
    })
    if (status === 'Tersimpan') {
      await client.product.update({
        where: { id: product.id },
        data: { stock: { decrement: qty }, sold: { increment: qty } },
      })
    }
    return created
  })

  const products = await prisma.product.findMany({ where: { businessId: biz.id } })
  return {
    transaction: mapTx(tx),
    catalog: products.map(mapProduct),
    businessId: biz.id,
  }
}

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
  const prisma = getPrisma()
  const biz = await requireOwned(userId, businessId)
  const tx = await prisma.transaction.findFirst({
    where: { id: transactionId, businessId: biz.id },
  })
  if (!tx) throw new Error('Transaksi tidak ditemukan.')
  const product = await prisma.product.findFirst({
    where: { id: tx.productId, businessId: biz.id },
  })

  if (nextStatus === 'Dibatalkan') {
    await prisma.$transaction(async (txClient) => {
      if (tx.status === 'Tersimpan' && product) {
        await txClient.product.update({
          where: { id: product.id },
          data: {
            stock: { increment: tx.qty },
            sold: { decrement: tx.qty },
          },
        })
      }
      await txClient.transaction.delete({ where: { id: tx.id } })
    })
    const products = await prisma.product.findMany({ where: { businessId: biz.id } })
    return {
      transaction: null,
      catalog: products.map(mapProduct),
      businessId: biz.id,
      removed: true,
    }
  }

  if (nextStatus === 'Tersimpan' && tx.status === 'Perlu Verifikasi') {
    if (!product) throw new Error('Produk transaksi tidak ada di katalog.')
    if (product.stock < tx.qty) {
      throw new Error(
        `Stok ${product.shortName} tidak cukup untuk verifikasi. Tersedia ${product.stock}, diminta ${tx.qty}.`,
      )
    }
    const updated = await prisma.$transaction(async (client) => {
      const row = await client.transaction.update({
        where: { id: tx.id },
        data: { status: 'Tersimpan' },
      })
      await client.product.update({
        where: { id: product.id },
        data: { stock: { decrement: tx.qty }, sold: { increment: tx.qty } },
      })
      return row
    })
    const products = await prisma.product.findMany({ where: { businessId: biz.id } })
    return {
      transaction: mapTx(updated),
      catalog: products.map(mapProduct),
      businessId: biz.id,
    }
  }

  if (nextStatus === 'Perlu Verifikasi' && tx.status === 'Tersimpan') {
    const updated = await prisma.$transaction(async (client) => {
      const row = await client.transaction.update({
        where: { id: tx.id },
        data: { status: 'Perlu Verifikasi' },
      })
      if (product) {
        await client.product.update({
          where: { id: product.id },
          data: { stock: { increment: tx.qty }, sold: { decrement: tx.qty } },
        })
      }
      return row
    })
    const products = await prisma.product.findMany({ where: { businessId: biz.id } })
    return {
      transaction: mapTx(updated),
      catalog: products.map(mapProduct),
      businessId: biz.id,
    }
  }

  const products = await prisma.product.findMany({ where: { businessId: biz.id } })
  return {
    transaction: mapTx(tx),
    catalog: products.map(mapProduct),
    businessId: biz.id,
  }
}

export async function addContents(
  userId: string,
  items: Omit<ContentItem, 'id' | 'createdAt'>[],
  businessId?: string | null,
): Promise<ContentItem[]> {
  const prisma = getPrisma()
  const biz = await requireOwned(userId, businessId)
  const createdAt = new Date()
  const data = items.map((item, index) => ({
    id: `c-${Date.now()}-${index}`,
    businessId: biz.id,
    createdAt,
    title: item.title,
    description: item.description,
    image: item.image,
    platform: item.platform,
    status: item.status,
  }))
  await prisma.content.createMany({ data })
  const rows = await prisma.content.findMany({
    where: { id: { in: data.map((d) => d.id) } },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(mapContent)
}

export async function updateContent(
  userId: string,
  id: string,
  patch: Partial<Omit<ContentItem, 'id'>>,
  businessId?: string | null,
): Promise<ContentItem> {
  const prisma = getPrisma()
  const biz = await requireOwned(userId, businessId)
  const existing = await prisma.content.findFirst({ where: { id, businessId: biz.id } })
  if (!existing) throw new Error(`Konten ${id} tidak ditemukan.`)
  const updated = await prisma.content.update({
    where: { id },
    data: {
      title: patch.title ?? existing.title,
      description: patch.description ?? existing.description,
      image: patch.image ?? existing.image,
      platform: patch.platform ?? existing.platform,
      status: patch.status ?? existing.status,
      createdAt: patch.createdAt ? new Date(patch.createdAt) : undefined,
    },
  })
  return mapContent(updated)
}
