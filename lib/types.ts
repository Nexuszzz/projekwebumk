/** Shared domain types — multi-tenant (banyak usaha / client) */

import type { AiPreferences, AiTone } from '@/lib/ai-style'

export type { AiPreferences, AiTone }
export type Platform = 'Instagram' | 'Tokopedia' | 'Lazada'
export type ContentStatus = 'Draft' | 'Terposting'
export type TxStatus = 'Tersimpan' | 'Perlu Verifikasi'

export type CatalogProduct = {
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
  keywords: string[]
}

export type NotificationPreferences = {
  orders: boolean
  stock: boolean
  ai: boolean
  weekly: boolean
  wa: boolean
  email: boolean
}

export type BusinessProfile = {
  brand: string
  owner: string
  city: string
  region: string
  country: string
  email: string
  phone: string
  address: string
  category: string
  platforms: string[]
  currency: string
  timezone: string
  /** Nama platform software (UMKMan) — global, bisa di-override */
  appName: string
  tagline: string
  /** Logo usaha (path /uploads/... atau /products/...) */
  logo?: string
  /**
   * Preferensi AI per usaha (gaya bahasa + otomasi).
   * Opsional di data lama — dinormalisasi saat load.
   */
  ai?: AiPreferences
  /** Preferensi notifikasi in-app (disimpan per usaha) */
  notifications?: NotificationPreferences
  /** Bahasa antarmuka */
  locale?: 'id' | 'en'
}

/** Satu usaha / tenant — dimiliki satu user (ownerUserId) */
export type BusinessRecord = {
  id: string
  slug: string
  /** User yang punya usaha ini — data tidak bocor ke user lain */
  ownerUserId: string
  createdAt: string
  updatedAt: string
  profile: BusinessProfile
  catalog: CatalogProduct[]
  contents: ContentItem[]
  transactions: TransactionItem[]
}

export type AuthUser = {
  id: string
  email: string
  name: string
  picture?: string | null
}

export type UserSessionRecord = {
  id: string
  device: string
  location: string
  lastActiveAt: string
  current?: boolean
}

export type UserRecord = {
  id: string
  email: string
  name: string
  /** null jika hanya login Google */
  passwordHash: string | null
  googleId: string | null
  picture: string | null
  createdAt: string
  passwordChangedAt?: string | null
  /**
   * Naikkan untuk invalidate semua JWT lama (ganti sandi / logout perangkat lain).
   * JWT menyimpan claim `sv` yang harus cocok.
   */
  sessionVersion?: number
  sessions?: UserSessionRecord[]
}

export type UsersDatabase = {
  version: number
  updatedAt: string
  users: UserRecord[]
}

export type ContentItem = {
  id: string
  createdAt: string
  title: string
  description: string
  image: string
  platform: Platform
  status: ContentStatus
}

export type TransactionItem = {
  id: string
  createdAt: string
  productId: string
  product: string
  variant: string
  image: string
  qty: number
  unitPrice: number
  total: number
  status: TxStatus
  date: string
  time: string
}

/**
 * Snapshot usaha aktif — bentuk yang dipakai AI & dashboard.
 * (bukan seluruh platform DB)
 */
export type BusinessDatabase = {
  id: string
  slug: string
  version: number
  updatedAt: string
  profile: BusinessProfile
  catalog: CatalogProduct[]
  contents: ContentItem[]
  transactions: TransactionItem[]
}

/** Ringkasan usaha untuk daftar switcher */
export type BusinessSummary = {
  id: string
  slug: string
  brand: string
  owner: string
  city: string
  category: string
  productCount: number
  stockTotal: number
  isActive: boolean
}

/** Root file store: multi-tenant */
export type PlatformDatabase = {
  version: number
  updatedAt: string
  activeBusinessId: string
  businesses: BusinessRecord[]
}

/** Input buat usaha baru (client mana pun) */
export type CreateBusinessInput = {
  brand: string
  owner: string
  city?: string
  region?: string
  email?: string
  phone?: string
  category?: string
  address?: string
}
