'use client'

import { defaultCatalogProduct, findCatalogProduct, resolveProductImage } from '@/lib/catalog-utils'
import type {
  AuthUser,
  BusinessProfile,
  BusinessSummary,
  CatalogProduct,
  ContentItem,
  ContentStatus,
  CreateBusinessInput,
  Platform,
  TransactionItem,
  TxStatus,
} from '@/lib/types'
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type { CatalogProduct, ContentItem, ContentStatus, Platform, TransactionItem, TxStatus }
export { resolveProductImage, findCatalogProduct, defaultCatalogProduct }

type DashboardStore = {
  ready: boolean
  loading: boolean
  error: string | null
  user: AuthUser | null
  needsOnboarding: boolean
  businessId: string | null
  businesses: BusinessSummary[]
  profile: BusinessProfile | null
  catalog: CatalogProduct[]
  contents: ContentItem[]
  transactions: TransactionItem[]
  refresh: () => Promise<void>
  logout: () => Promise<void>
  switchBusiness: (businessId: string) => Promise<void>
  createBusiness: (input: CreateBusinessInput) => Promise<void>
  addProduct: (input: {
    name: string
    shortName?: string
    variant?: string
    unitPrice: number
    stock?: number
    description?: string
    sku?: string
    image?: string
  }) => Promise<CatalogProduct>
  /** Update field produk (harga, stok absolut, dll.) */
  updateProduct: (
    id: string,
    patch: Partial<Omit<CatalogProduct, 'id'>>,
  ) => Promise<CatalogProduct>
  /** Tambah stok (delta positif), mis. restock barang masuk */
  addStock: (id: string, amount: number) => Promise<CatalogProduct>
  addContents: (items: Omit<ContentItem, 'id' | 'createdAt'>[]) => Promise<void>
  updateContent: (id: string, patch: Partial<Omit<ContentItem, 'id'>>) => Promise<void>
  addTransaction: (input: {
    product?: string
    productId?: string
    qty: number
    unitPrice?: number
    status?: TxStatus
  }) => Promise<TransactionItem>
  updateTransaction: (
    id: string,
    action: 'verify' | 'reject',
  ) => Promise<{ transaction: TransactionItem | null; removed?: boolean }>
  updateProfile: (patch: Partial<BusinessProfile>) => Promise<BusinessProfile>
  contentModal: { open: boolean; editItem: ContentItem | null }
  transactionModalOpen: boolean
  openContentModal: (editItem?: ContentItem) => void
  closeContentModal: () => void
  openTransactionModal: () => void
  closeTransactionModal: () => void
}

const DashboardContext = createContext<DashboardStore | null>(null)

function bizHeaders(businessId: string | null): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (businessId) headers['x-business-id'] = businessId
  return headers
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([])
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [catalog, setCatalog] = useState<CatalogProduct[]>([])
  const [contents, setContents] = useState<ContentItem[]>([])
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [contentModal, setContentModal] = useState<{ open: boolean; editItem: ContentItem | null }>({
    open: false,
    editItem: null,
  })
  const [transactionModalOpen, setTransactionModalOpen] = useState(false)

  const applySnapshot = useCallback((payload: {
    id?: string
    profile?: BusinessProfile
    catalog?: CatalogProduct[]
    contents?: ContentItem[]
    transactions?: TransactionItem[]
    needsOnboarding?: boolean
    user?: AuthUser
    businesses?: BusinessSummary[]
  }) => {
    if (payload.user) setUser(payload.user)
    if (payload.needsOnboarding) {
      setNeedsOnboarding(true)
      setBusinessId(null)
      setProfile(null)
      setCatalog([])
      setContents([])
      setTransactions([])
      setBusinesses([])
      return
    }
    setNeedsOnboarding(false)
    if (payload.id) setBusinessId(payload.id)
    if (payload.profile) setProfile(payload.profile)
    setCatalog(payload.catalog ?? [])
    setContents(payload.contents ?? [])
    setTransactions(payload.transactions ?? [])
    if (payload.businesses) setBusinesses(payload.businesses)
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const bizRes = await fetch('/api/business', {
        cache: 'no-store',
        headers: bizHeaders(businessId),
      })
      if (bizRes.status === 401) {
        window.location.href = '/login'
        return
      }
      const payload = await bizRes.json()
      if (!bizRes.ok) throw new Error(payload.error || 'Gagal memuat data usaha.')
      applySnapshot(payload)
      if (!payload.needsOnboarding && payload.businesses) {
        setBusinesses(payload.businesses)
      } else if (payload.needsOnboarding) {
        const listRes = await fetch('/api/businesses', { cache: 'no-store' })
        const listPayload = await listRes.json()
        if (listRes.ok) setBusinesses(listPayload.businesses ?? [])
      }
      setReady(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat data usaha.')
    } finally {
      setLoading(false)
    }
  }, [applySnapshot, businessId])

  const refresh = useCallback(async () => {
    await loadAll()
  }, [loadAll])

  useEffect(() => {
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }, [])

  const switchBusiness = useCallback(
    async (id: string) => {
      const response = await fetch('/api/businesses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: id }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Gagal ganti usaha.')
      applySnapshot(payload.business)
      setBusinesses(payload.businesses ?? [])
    },
    [applySnapshot],
  )

  const createBusiness = useCallback(
    async (input: CreateBusinessInput) => {
      const response = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Gagal membuat usaha.')
      setNeedsOnboarding(false)
      applySnapshot({ ...payload.business, businesses: payload.businesses, needsOnboarding: false })
      setBusinesses(payload.businesses ?? [])
    },
    [applySnapshot],
  )

  const addProduct = useCallback(
    async (input: {
      name: string
      shortName?: string
      variant?: string
      unitPrice: number
      stock?: number
      description?: string
      sku?: string
      image?: string
    }) => {
      const response = await fetch('/api/catalog', {
        method: 'POST',
        headers: bizHeaders(businessId),
        body: JSON.stringify({ ...input, businessId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Gagal menambah produk.')
      const product = payload.product as CatalogProduct
      setCatalog((prev) => [...prev, product])
      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === businessId
            ? {
                ...b,
                productCount: b.productCount + 1,
                stockTotal: b.stockTotal + (product.stock || 0),
              }
            : b,
        ),
      )
      return product
    },
    [businessId],
  )

  const updateProduct = useCallback(
    async (id: string, patch: Partial<Omit<CatalogProduct, 'id'>>) => {
      const response = await fetch('/api/catalog', {
        method: 'PATCH',
        headers: bizHeaders(businessId),
        body: JSON.stringify({ id, businessId, ...patch }),
      })
      const text = await response.text()
      let payload: { error?: string; product?: CatalogProduct } = {}
      if (text) {
        try {
          payload = JSON.parse(text)
        } catch {
          throw new Error(`Gagal update produk (HTTP ${response.status}).`)
        }
      }
      if (!response.ok) throw new Error(payload.error || 'Gagal memperbarui produk.')
      const product = payload.product
      if (!product) throw new Error('Respons update produk kosong.')
      setCatalog((prev) => {
        const next = prev.map((p) => (p.id === product.id ? product : p))
        setBusinesses((bs) =>
          bs.map((b) =>
            b.id === businessId
              ? { ...b, stockTotal: next.reduce((s, p) => s + p.stock, 0) }
              : b,
          ),
        )
        return next
      })
      return product
    },
    [businessId],
  )

  const addStock = useCallback(
    async (id: string, amount: number) => {
      const qty = Math.max(0, Math.round(Number(amount) || 0))
      if (qty < 1) throw new Error('Jumlah stok masuk minimal 1.')
      const response = await fetch('/api/catalog', {
        method: 'PATCH',
        headers: bizHeaders(businessId),
        body: JSON.stringify({ id, businessId, stockDelta: qty }),
      })
      const text = await response.text()
      let payload: { error?: string; product?: CatalogProduct } = {}
      if (text) {
        try {
          payload = JSON.parse(text)
        } catch {
          throw new Error(`Gagal menambah stok (HTTP ${response.status}).`)
        }
      }
      if (!response.ok) throw new Error(payload.error || 'Gagal menambah stok.')
      const product = payload.product
      if (!product) throw new Error('Respons stok kosong.')
      setCatalog((prev) => {
        const next = prev.map((p) => (p.id === product.id ? product : p))
        setBusinesses((bs) =>
          bs.map((b) =>
            b.id === businessId
              ? { ...b, stockTotal: next.reduce((s, p) => s + p.stock, 0) }
              : b,
          ),
        )
        return next
      })
      return product
    },
    [businessId],
  )

  const addContents = useCallback(
    async (items: Omit<ContentItem, 'id' | 'createdAt'>[]) => {
      const response = await fetch('/api/contents', {
        method: 'POST',
        headers: bizHeaders(businessId),
        body: JSON.stringify({ items, businessId }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          payload.error ||
            (response.status === 413
              ? 'Gambar terlalu besar untuk disimpan. Coba tanpa foto / generate ulang poster.'
              : 'Gagal menyimpan konten.'),
        )
      }
      const created = payload.contents as ContentItem[]
      if (payload.businessId && payload.businessId !== businessId) {
        setBusinessId(payload.businessId)
      }
      setContents((prev) => [...created, ...prev])
    },
    [businessId],
  )

  const updateContent = useCallback(
    async (id: string, patch: Partial<Omit<ContentItem, 'id'>>) => {
      // Jangan kirim data:/blob: raksasa ke API
      const safePatch = { ...patch }
      if (
        typeof safePatch.image === 'string' &&
        (safePatch.image.startsWith('data:image/') || safePatch.image.startsWith('blob:')) &&
        safePatch.image.length > 200_000
      ) {
        // biarkan server/path yang sudah di-upload; kalau masih blob, strip
        if (safePatch.image.startsWith('blob:')) {
          delete safePatch.image
        } else {
          safePatch.image = '/placeholder.svg'
        }
      }
      const response = await fetch('/api/contents', {
        method: 'PATCH',
        headers: bizHeaders(businessId),
        body: JSON.stringify({ id, businessId, ...safePatch }),
      })
      const text = await response.text()
      let payload: { error?: string; content?: ContentItem; businessId?: string } = {}
      if (text) {
        try {
          payload = JSON.parse(text)
        } catch {
          throw new Error(
            response.status === 413
              ? 'Gambar terlalu besar saat menyimpan.'
              : `Gagal memperbarui konten (HTTP ${response.status}).`,
          )
        }
      } else if (!response.ok) {
        throw new Error(`Gagal memperbarui konten (HTTP ${response.status}).`)
      }
      if (!response.ok) throw new Error(payload.error || 'Gagal memperbarui konten.')
      const content = payload.content as ContentItem
      if (payload.businessId && payload.businessId !== businessId) {
        setBusinessId(payload.businessId)
      }
      setContents((prev) => prev.map((item) => (item.id === id ? content : item)))
    },
    [businessId],
  )

  const addTransaction = useCallback(
    async (input: {
      product?: string
      productId?: string
      qty: number
      unitPrice?: number
      status?: TxStatus
    }) => {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: bizHeaders(businessId),
        body: JSON.stringify({ ...input, businessId }),
      })
      const text = await response.text()
      let payload: {
        error?: string
        transaction?: TransactionItem
        catalog?: CatalogProduct[]
        businessId?: string
      } = {}
      if (text) {
        try {
          payload = JSON.parse(text)
        } catch {
          throw new Error(`Gagal menyimpan transaksi (HTTP ${response.status}).`)
        }
      }
      if (!response.ok) throw new Error(payload.error || 'Gagal menyimpan transaksi.')
      const transaction = payload.transaction
      if (!transaction) throw new Error('Transaksi tersimpan tapi respons kosong.')
      const nextCatalog = payload.catalog || []
      setTransactions((prev) => [transaction, ...prev])
      setCatalog(nextCatalog)
      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === (payload.businessId || businessId)
            ? { ...b, stockTotal: nextCatalog.reduce((s, p) => s + p.stock, 0) }
            : b,
        ),
      )
      return transaction
    },
    [businessId],
  )

  const updateTransaction = useCallback(
    async (id: string, action: 'verify' | 'reject') => {
      const response = await fetch('/api/transactions', {
        method: 'PATCH',
        headers: bizHeaders(businessId),
        body: JSON.stringify({ id, action }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Gagal memperbarui transaksi.')
      const nextCatalog = (payload.catalog as CatalogProduct[]) || []
      if (nextCatalog.length) {
        setCatalog(nextCatalog)
        setBusinesses((prev) =>
          prev.map((b) =>
            b.id === (payload.businessId || businessId)
              ? { ...b, stockTotal: nextCatalog.reduce((s, p) => s + p.stock, 0) }
              : b,
          ),
        )
      }
      if (payload.removed) {
        setTransactions((prev) => prev.filter((t) => t.id !== id))
        return { transaction: null, removed: true as const }
      }
      const transaction = payload.transaction as TransactionItem
      setTransactions((prev) => prev.map((t) => (t.id === transaction.id ? transaction : t)))
      return { transaction, removed: false as const }
    },
    [businessId],
  )

  const updateProfile = useCallback(
    async (patch: Partial<BusinessProfile>) => {
      const response = await fetch('/api/business', {
        method: 'PATCH',
        headers: bizHeaders(businessId),
        body: JSON.stringify({ profile: patch }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Gagal menyimpan pengaturan.')
      const next = payload.profile as BusinessProfile
      setProfile(next)
      if (patch.brand || patch.owner || patch.city || patch.category) {
        setBusinesses((prev) =>
          prev.map((b) =>
            b.id === businessId
              ? {
                  ...b,
                  brand: next.brand,
                  owner: next.owner,
                  city: next.city,
                  category: next.category,
                }
              : b,
          ),
        )
      }
      return next
    },
    [businessId],
  )

  const openContentModal = useCallback((editItem?: ContentItem) => {
    setContentModal({ open: true, editItem: editItem ?? null })
  }, [])
  const closeContentModal = useCallback(() => {
    setContentModal((prev) => ({ ...prev, open: false }))
  }, [])
  const openTransactionModal = useCallback(() => setTransactionModalOpen(true), [])
  const closeTransactionModal = useCallback(() => setTransactionModalOpen(false), [])

  const value = useMemo<DashboardStore>(
    () => ({
      ready,
      loading,
      error,
      user,
      needsOnboarding,
      businessId,
      businesses,
      profile,
      catalog,
      contents,
      transactions,
      refresh,
      logout,
      switchBusiness,
      createBusiness,
      addProduct,
      updateProduct,
      addStock,
      addContents,
      updateContent,
      addTransaction,
      updateTransaction,
      updateProfile,
      contentModal,
      transactionModalOpen,
      openContentModal,
      closeContentModal,
      openTransactionModal,
      closeTransactionModal,
    }),
    [
      ready,
      loading,
      error,
      user,
      needsOnboarding,
      businessId,
      businesses,
      profile,
      catalog,
      contents,
      transactions,
      refresh,
      logout,
      switchBusiness,
      createBusiness,
      addProduct,
      updateProduct,
      addStock,
      addContents,
      updateContent,
      addTransaction,
      updateTransaction,
      updateProfile,
      contentModal,
      transactionModalOpen,
      openContentModal,
      closeContentModal,
      openTransactionModal,
      closeTransactionModal,
    ],
  )

  return <DashboardContext value={value}>{children}</DashboardContext>
}

export function useDashboard() {
  const ctx = use(DashboardContext)
  if (!ctx) {
    throw new Error('useDashboard harus dipakai di dalam <DashboardProvider>')
  }
  return ctx
}
