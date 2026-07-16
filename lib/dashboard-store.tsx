'use client'

import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react'

/* ============================================================
   Tipe data bersama untuk dashboard (in-memory, tanpa backend)
   ============================================================ */

export type Platform = 'Instagram' | 'Tokopedia' | 'Lazada'
export type ContentStatus = 'Draft' | 'Terposting'

export type ContentItem = {
  id: string
  createdAt: string
  title: string
  description: string
  image: string
  platform: Platform
  status: ContentStatus
}

export type TxStatus = 'Tersimpan' | 'Perlu Verifikasi'
export type TxMethod = 'Teks' | 'Suara'

export type TransactionItem = {
  id: string
  createdAt: string
  product: string
  variant: string
  image: string
  total: number
  method: TxMethod
  status: TxStatus
  date: string
  time: string
}

/* ============================================================
   Seed data — dipindah dari content-view & transaction-view
   ============================================================ */

const SEED_CONTENTS: ContentItem[] = [
  {
    id: 'c1',
    createdAt: '2026-07-15T11:05:41+07:00',
    title: 'Sabun Nusacid',
    description:
      'Sabun anti bakteri dengan bahan alami khas Nusantara, lembut di kulit dan wangi tahan lama.',
    image: '/products/nusacid.png',
    platform: 'Instagram',
    status: 'Terposting',
  },
  {
    id: 'c2',
    createdAt: '2026-07-14T09:21:37+07:00',
    title: 'Kopi Arabika Gayo',
    description:
      'Kopi arabika Gayo single origin dengan aroma floral dan aftertaste karamel yang khas.',
    image: '/products/kopi.png',
    platform: 'Tokopedia',
    status: 'Draft',
  },
  {
    id: 'c3',
    createdAt: '2026-07-12T10:30:00+07:00',
    title: 'Keripik Singkong',
    description:
      'Keripik singkong renyah dengan bumbu balado pedas manis, digoreng dengan minyak baru.',
    image: '/products/keripik.png',
    platform: 'Lazada',
    status: 'Terposting',
  },
  {
    id: 'c4',
    createdAt: '2026-07-11T08:44:03+07:00',
    title: 'Madu Hutan Murni',
    description:
      'Madu hutan asli tanpa campuran, dipanen langsung dari lebah liar di hutan Sumatera.',
    image: '/products/madu.png',
    platform: 'Lazada',
    status: 'Draft',
  },
  {
    id: 'c5',
    createdAt: '2026-07-09T14:20:00+07:00',
    title: 'Kopi Bubuk Premium',
    description:
      'Kopi bubuk giling halus untuk seduhan tubruk maupun filter, dikemas kedap udara.',
    image: '/products/kopi.png',
    platform: 'Instagram',
    status: 'Terposting',
  },
  {
    id: 'c6',
    createdAt: '2026-07-07T16:30:00+07:00',
    title: 'Tas Anyaman Rotan',
    description:
      'Tas anyaman rotan buatan tangan pengrajin lokal, kuat dan cocok untuk gaya kasual.',
    image: '/products/tas.png',
    platform: 'Tokopedia',
    status: 'Draft',
  },
  {
    id: 'c7',
    createdAt: '2026-07-05T09:30:00+07:00',
    title: 'Sabun Nusacid Travel',
    description:
      'Kemasan travel 50 g, praktis dibawa bepergian dengan perlindungan anti bakteri yang sama.',
    image: '/products/nusacid.png',
    platform: 'Lazada',
    status: 'Terposting',
  },
  {
    id: 'c8',
    createdAt: '2026-07-03T13:45:00+07:00',
    title: 'Madu Sachet Praktis',
    description:
      'Madu murni dalam kemasan sachet sekali pakai, pas untuk bekal dan minuman hangat.',
    image: '/products/madu.png',
    platform: 'Instagram',
    status: 'Terposting',
  },
  {
    id: 'c9',
    createdAt: '2026-07-01T10:15:00+07:00',
    title: 'Keripik Varian Keju',
    description:
      'Varian baru rasa keju gurih, dibuat dari singkong pilihan dengan taburan keju asli.',
    image: '/products/keripik.png',
    platform: 'Tokopedia',
    status: 'Draft',
  },
]

const SEED_TRANSACTIONS: TransactionItem[] = [
  {
    id: 't1',
    createdAt: '2026-07-15T14:30:00+07:00',
    product: 'Nusacid Anti Bakteri',
    variant: 'Botol spray 500 ml',
    image: '/products/nusacid.png',
    total: 145_000,
    method: 'Teks',
    status: 'Tersimpan',
    date: '15 Jul 2026',
    time: '14.30',
  },
  {
    id: 't2',
    createdAt: '2026-07-14T19:12:00+07:00',
    product: 'Kopi Arabika Gayo',
    variant: 'Kemasan 250 g',
    image: '/products/kopi.png',
    total: 96_000,
    method: 'Suara',
    status: 'Perlu Verifikasi',
    date: '14 Jul 2026',
    time: '19.12',
  },
  {
    id: 't3',
    createdAt: '2026-07-14T10:05:00+07:00',
    product: 'Keripik Singkong Renyah',
    variant: 'Pouch 200 g',
    image: '/products/keripik.png',
    total: 54_000,
    method: 'Teks',
    status: 'Tersimpan',
    date: '14 Jul 2026',
    time: '10.05',
  },
  {
    id: 't4',
    createdAt: '2026-07-13T16:48:00+07:00',
    product: 'Tas Anyaman Rotan',
    variant: 'Handmade — ukuran M',
    image: '/products/tas.png',
    total: 320_000,
    method: 'Suara',
    status: 'Perlu Verifikasi',
    date: '13 Jul 2026',
    time: '16.48',
  },
  {
    id: 't5',
    createdAt: '2026-07-12T09:20:00+07:00',
    product: 'Madu Hutan Murni',
    variant: 'Botol kaca 350 ml',
    image: '/products/madu.png',
    total: 128_000,
    method: 'Teks',
    status: 'Tersimpan',
    date: '12 Jul 2026',
    time: '09.20',
  },
]

/* ============================================================
   Context
   ============================================================ */

type DashboardStore = {
  contents: ContentItem[]
  transactions: TransactionItem[]
  addContents: (items: Omit<ContentItem, 'id' | 'createdAt'>[]) => void
  updateContent: (id: string, patch: Partial<Omit<ContentItem, 'id'>>) => void
  addTransaction: (tx: Omit<TransactionItem, 'id' | 'createdAt' | 'date' | 'time'>) => void
  /* Modal control (dipakai lintas komponen: content-view, ai-assistant, dll.) */
  contentModal: { open: boolean; editItem: ContentItem | null }
  transactionModalOpen: boolean
  openContentModal: (editItem?: ContentItem) => void
  closeContentModal: () => void
  openTransactionModal: () => void
  closeTransactionModal: () => void
}

const DashboardContext = createContext<DashboardStore | null>(null)

let idCounter = 0
function nextId(prefix: string) {
  idCounter += 1
  return `${prefix}-${Date.now()}-${idCounter}`
}

function nowStamp() {
  const now = new Date()
  const date = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  const time = now
    .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    .replace(':', '.')
  return { createdAt: now.toISOString(), date, time }
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [contents, setContents] = useState<ContentItem[]>(SEED_CONTENTS)
  const [transactions, setTransactions] = useState<TransactionItem[]>(SEED_TRANSACTIONS)
  const [contentModal, setContentModal] = useState<{ open: boolean; editItem: ContentItem | null }>(
    { open: false, editItem: null },
  )
  const [transactionModalOpen, setTransactionModalOpen] = useState(false)

  const addContents = useCallback((items: Omit<ContentItem, 'id' | 'createdAt'>[]) => {
    const createdAt = new Date().toISOString()
    setContents((prev) => [...items.map((item) => ({ ...item, id: nextId('c'), createdAt })), ...prev])
  }, [])

  const updateContent = useCallback((id: string, patch: Partial<Omit<ContentItem, 'id'>>) => {
    setContents((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  const addTransaction = useCallback((tx: Omit<TransactionItem, 'id' | 'createdAt' | 'date' | 'time'>) => {
    setTransactions((prev) => [{ ...tx, id: nextId('t'), ...nowStamp() }, ...prev])
  }, [])

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
      contents,
      transactions,
      addContents,
      updateContent,
      addTransaction,
      contentModal,
      transactionModalOpen,
      openContentModal,
      closeContentModal,
      openTransactionModal,
      closeTransactionModal,
    }),
    [
      contents,
      transactions,
      addContents,
      updateContent,
      addTransaction,
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
