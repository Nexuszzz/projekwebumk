'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Columns3,
  Copy,
  Keyboard,
  Mic,
  Pencil,
  Receipt,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Store,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import { InstagramIcon } from './brand-icons'
import { useDashboard, type ContentItem, type Platform, type TransactionItem, type TxMethod } from '@/lib/dashboard-store'
import { formatRupiah } from '@/lib/utils'

/* ================= Types & data ================= */

type Kind = 'konten' | 'transaksi'
type Status = 'selesai' | 'menunggu' | 'gagal'

type HistoryRow = {
  id: string
  createdAt: string
  kind: Kind
  direction: 'in' | 'out'
  date: string
  fullDate: string
  time: string
  product: string
  image: string
  type: string
  platform: Platform | 'Transaksi'
  value: number | null
  status: Status
  statusNote: string
  fullText: string
  inputMethod?: TxMethod
}

function mapStoreRows(contents: ContentItem[], transactions: TransactionItem[]): HistoryRow[] {
  const contentRows: HistoryRow[] = contents.map((item) => {
    const date = new Date(item.createdAt)
    return {
      id: `content-${item.id}`, createdAt: item.createdAt, kind: 'konten', direction: 'in',
      date: `${date.getDate()} ${date.toLocaleDateString('id-ID', { month: 'short' })}`,
      fullDate: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      time: date.toLocaleTimeString('id-ID'), product: item.title, image: item.image,
      type: item.platform === 'Instagram' ? 'Caption Instagram' : `Deskripsi ${item.platform}`,
      platform: item.platform, value: null, status: item.status === 'Terposting' ? 'selesai' : 'menunggu',
      statusNote: item.status === 'Terposting' ? 'Dipublikasikan' : 'Draft — menunggu review kamu', fullText: item.description,
    }
  })
  const transactionRows: HistoryRow[] = transactions.map((item) => {
    const date = new Date(item.createdAt)
    return {
      id: `transaction-${item.id}`, createdAt: item.createdAt, kind: 'transaksi', direction: 'in',
      date: `${date.getDate()} ${date.toLocaleDateString('id-ID', { month: 'short' })}`,
      fullDate: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      time: date.toLocaleTimeString('id-ID'), product: item.product, image: item.image, type: 'Transaksi',
      platform: 'Transaksi', value: item.total, status: item.status === 'Tersimpan' ? 'selesai' : 'menunggu',
      statusNote: item.status === 'Tersimpan' ? 'Terverifikasi' : 'Menunggu verifikasi kamu',
      fullText: `${item.product} — ${item.variant}`, inputMethod: item.method,
    }
  })
  return [...contentRows, ...transactionRows].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
}

/*
  {
    id: 'h1',
    kind: 'transaksi',
    direction: 'in',
    date: '15 Jul',
    fullDate: '15 Juli 2026',
    time: '14:32:08',
    product: 'Kopi Arabika Gayo',
    image: '/products/kopi.png',
    type: 'Transaksi',
    platform: 'transaksi',
    value: 192000,
    status: 'menunggu',
    statusNote: 'Menunggu verifikasi kamu',
    fullText: 'Terjual 2 pack Kopi Arabika Gayo 250 g ke pelanggan tetap, dibayar tunai.',
    inputMethod: 'Suara',
  },
  {
    id: 'h2',
    kind: 'konten',
    direction: 'in',
    date: '15 Jul',
    fullDate: '15 Juli 2026',
    time: '11:05:41',
    product: 'Nusacid Anti Bakteri',
    image: '/products/nusacid.png',
    type: 'Caption Instagram',
    platform: 'instagram',
    value: null,
    status: 'selesai',
    statusNote: 'Dipublikasikan 3 jam lalu',
    fullText:
      'Kulit sehat dimulai dari kebersihan! Nusacid Anti Bakteri hadir dengan bahan alami khas Nusantara yang lembut di kulit tapi ampuh melawan kuman. Wanginya segar tahan lama, cocok untuk seluruh keluarga. Yuk stok sekarang sebelum kehabisan — cek link di bio! #NusacidBersih #SabunAlami #UMKMLokal',
  },
  {
    id: 'h3',
    kind: 'transaksi',
    direction: 'in',
    date: '14 Jul',
    fullDate: '14 Juli 2026',
    time: '16:48:22',
    product: 'Keripik Singkong Renyah',
    image: '/products/keripik.png',
    type: 'Transaksi',
    platform: 'transaksi',
    value: 135000,
    status: 'selesai',
    statusNote: 'Terverifikasi otomatis',
    fullText: 'Pesanan 9 pouch Keripik Singkong Renyah balado via Tokopedia, sudah dikirim.',
    inputMethod: 'Teks',
  },
  {
    id: 'h4',
    kind: 'konten',
    direction: 'in',
    date: '14 Jul',
    fullDate: '14 Juli 2026',
    time: '09:21:37',
    product: 'Keripik Singkong Renyah',
    image: '/products/keripik.png',
    type: 'Deskripsi Tokopedia',
    platform: 'tokopedia',
    value: null,
    status: 'selesai',
    statusNote: 'Terpasang di etalase toko',
    fullText:
      'Keripik Singkong Renyah — camilan legendaris dengan bumbu balado pedas manis yang meresap sempurna. Dibuat dari singkong pilihan yang diiris tipis dan digoreng dengan minyak baru, menghasilkan tekstur ekstra renyah di setiap gigitan. Kemasan pouch 200 g kedap udara menjaga kerenyahan hingga 3 bulan. Cocok untuk teman nonton, oleh-oleh, maupun stok jajanan di rumah.',
  },
  {
    id: 'h5',
    kind: 'konten',
    direction: 'out',
    date: '13 Jul',
    fullDate: '13 Juli 2026',
    time: '19:54:10',
    product: 'Madu Hutan Murni',
    image: '/products/madu.png',
    type: 'Caption Instagram',
    platform: 'instagram',
    value: null,
    status: 'gagal',
    statusNote: 'Gagal terposting — koneksi Instagram terputus',
    fullText:
      'Manisnya alami, khasiatnya nyata. Madu Hutan Murni dipanen langsung dari lebah liar di pedalaman Sumatera tanpa campuran apa pun. Satu sendok setiap pagi untuk daya tahan tubuh keluarga. Order sekarang, stok panen bulan ini terbatas! #MaduHutan #MaduMurni #SehatAlami',
  },
  {
    id: 'h6',
    kind: 'transaksi',
    direction: 'out',
    date: '13 Jul',
    fullDate: '13 Juli 2026',
    time: '13:17:55',
    product: 'Tas Anyaman Rotan',
    image: '/products/tas.png',
    type: 'Transaksi',
    platform: 'transaksi',
    value: -85000,
    status: 'selesai',
    statusNote: 'Refund pesanan diproses',
    fullText: 'Refund 1 pcs Tas Anyaman Rotan karena pembeli membatalkan pesanan sebelum kirim.',
    inputMethod: 'Teks',
  },
  {
    id: 'h7',
    kind: 'transaksi',
    direction: 'in',
    date: '12 Jul',
    fullDate: '12 Juli 2026',
    time: '10:02:19',
    product: 'Nusacid Anti Bakteri',
    image: '/products/nusacid.png',
    type: 'Transaksi',
    platform: 'transaksi',
    value: 240000,
    status: 'selesai',
    statusNote: 'Terverifikasi otomatis',
    fullText: 'Penjualan grosir 12 botol Nusacid Anti Bakteri 500 ml ke warung langganan.',
    inputMethod: 'Suara',
  },
  {
    id: 'h8',
    kind: 'konten',
    direction: 'in',
    date: '11 Jul',
    fullDate: '11 Juli 2026',
    time: '08:44:03',
    product: 'Kopi Arabika Gayo',
    image: '/products/kopi.png',
    type: 'Deskripsi Tokopedia',
    platform: 'tokopedia',
    value: null,
    status: 'menunggu',
    statusNote: 'Draft — menunggu review kamu',
    fullText:
      'Kopi Arabika Gayo single origin dari dataran tinggi Aceh, dipetik merah dan diproses semi-washed untuk menjaga karakter aslinya. Aroma floral dengan aftertaste karamel yang khas, cocok untuk seduhan manual brew maupun espresso. Roasting medium, dikemas dalam standing pouch 250 g dengan one-way valve agar kesegaran terjaga.',
  },
]
*/
/* ================= Helpers ================= */

const STATUS_META: Record<
  Status,
  { label: string; icon: typeof CheckCircle2; className: string; badge: string }
> = {
  selesai: {
    label: 'Selesai',
    icon: CheckCircle2,
    className: 'text-accent',
    badge: 'border-accent/30 bg-accent/10 text-accent',
  },
  menunggu: {
    label: 'Menunggu',
    icon: Clock,
    className: 'text-accent-warm',
    badge: 'border-accent-warm/40 bg-accent-warm/10 text-accent-warm',
  },
  gagal: {
    label: 'Gagal',
    icon: XCircle,
    className: 'text-destructive',
    badge: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
}

const PLATFORM_META: Record<Platform | 'Transaksi',
  { label: string; className: string; icon: React.ReactNode }
> = {
  Instagram: {
    label: 'Instagram',
    className: 'bg-[#E1306C]',
    icon: <InstagramIcon className="size-3" />,
  },
  Tokopedia: {
    label: 'Tokopedia',
    className: 'bg-[#03AC0E]',
    icon: <Store className="size-3" aria-hidden="true" />,
  },
  Lazada: {
    label: 'Lazada',
    className: 'bg-[#F36F20]',
    icon: <span className="text-[9px] font-bold">L</span>,
  },
  Transaksi: {
    label: 'Transaksi',
    className: 'bg-accent text-accent-foreground',
    icon: <Receipt className="size-3" aria-hidden="true" />,
  },
}

/* ================= Small pieces ================= */

function StatusDot({ status, delay = 0 }: { status: Status; delay?: number }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 20, delay }}
      className={`flex ${meta.className}`}
      title={meta.label}
    >
      <Icon className="size-4.5" aria-hidden="true" />
      <span className="sr-only">{meta.label}</span>
    </motion.span>
  )
}

function DirectionIcon({ direction, status }: { direction: 'in' | 'out'; status: Status }) {
  const positive = direction === 'in' && status !== 'gagal'
  return (
    <span
      className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
        positive ? 'bg-accent/12 text-accent' : 'bg-secondary text-muted-foreground'
      }`}
      aria-hidden="true"
    >
      {direction === 'in' ? (
        <ArrowUpRight className="size-3.5" />
      ) : (
        <ArrowDownLeft className="size-3.5" />
      )}
    </span>
  )
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      }}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-[0.97] ${
        copied
          ? 'border-accent/40 bg-accent/10 text-accent'
          : 'border-border text-muted-foreground hover:border-accent/40 hover:text-foreground'
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex"
          >
            <Check className="size-3" strokeWidth={3} aria-hidden="true" />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex"
          >
            <Copy className="size-3" aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
      {copied ? 'Tersalin' : label}
    </button>
  )
}

/* ================= Detail panel content ================= */

const sectionStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.12 } },
}

const sectionItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
}

function DetailContent({ row, onClose }: { row: HistoryRow; onClose: () => void }) {
  const status = STATUS_META[row.status]
  const platform = PLATFORM_META[row.platform]
  const StatusIcon = status.icon

  return (
    <motion.div
      key={row.id}
      variants={sectionStagger}
      initial="hidden"
      animate="show"
      className="flex h-full flex-col gap-5 overflow-y-auto p-5 sm:p-6"
    >
      {/* Header */}
      <motion.div variants={sectionItem} className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold tracking-tight">Detail Riwayat</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup detail riwayat"
          className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </motion.div>

      {/* Type + main value */}
      <motion.div variants={sectionItem} className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary py-1.5 pl-1.5 pr-3 text-xs font-medium text-secondary-foreground">
          <span
            className={`flex size-6 items-center justify-center rounded-full text-white ${platform.className}`}
            aria-hidden="true"
          >
            {platform.icon}
          </span>
          {row.type}
        </span>

        {row.kind === 'transaksi' && row.value !== null ? (
          <p
            className={`font-display text-3xl font-bold tracking-tight sm:text-4xl ${
              row.value < 0 ? 'text-muted-foreground' : 'text-accent'
            }`}
          >
            {formatRupiah(row.value)}
          </p>
        ) : (
          <p className="font-display text-lg font-bold leading-snug tracking-tight text-balance sm:text-xl">
            {'\u201C'}
            {row.fullText.slice(0, 72)}
            {'\u2026\u201D'}
          </p>
        )}
      </motion.div>

      {/* Status */}
      <motion.div variants={sectionItem} className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Status</p>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${status.badge}`}
          >
            <StatusIcon className="size-3.5" aria-hidden="true" />
            {status.label}
          </span>
          <span className="text-xs text-muted-foreground">{row.statusNote}</span>
        </div>
      </motion.div>

      {/* Waktu */}
      <motion.div variants={sectionItem} className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">Waktu</p>
        <p className="font-mono text-sm">
          {row.time}
          <span className="text-muted-foreground">{` · ${row.fullDate}`}</span>
        </p>
      </motion.div>

      {/* Produk */}
      <motion.div variants={sectionItem} className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Produk</p>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3">
          <Image
            src={row.image || '/placeholder.svg'}
            alt=""
            width={44}
            height={44}
            className="size-11 shrink-0 rounded-lg border border-border object-cover"
          />
          <p className="text-sm font-semibold">{row.product}</p>
        </div>
      </motion.div>

      {/* Konten: full text + copy */}
      {row.kind === 'konten' && (
        <motion.div variants={sectionItem} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              {row.platform === 'Instagram' ? 'Teks Caption' : 'Teks Deskripsi'}
            </p>
            <CopyButton text={row.fullText} label="Salin Teks" />
          </div>
          <div className="rounded-xl border border-border bg-background/50 p-4">
            <p className="text-sm leading-relaxed text-foreground/90">{row.fullText}</p>
          </div>
        </motion.div>
      )}

      {/* Transaksi: input method + catatan + verifikasi */}
      {row.kind === 'transaksi' && (
        <motion.div variants={sectionItem} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">Metode Input</p>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
              {row.inputMethod === 'Suara' ? (
                <Mic className="size-3" aria-hidden="true" />
              ) : (
                <Keyboard className="size-3" aria-hidden="true" />
              )}
              {row.inputMethod}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">Catatan Transaksi</p>
            <div className="rounded-xl border border-border bg-background/50 p-4">
              <p className="text-sm leading-relaxed text-foreground/90">{row.fullText}</p>
            </div>
          </div>
          {row.status === 'menunggu' && (
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground transition-all duration-150 animate-glow-pulse-subtle hover:opacity-90 active:scale-[0.97]"
            >
              <BadgeCheck className="size-4" aria-hidden="true" />
              Verifikasi Sekarang
            </button>
          )}
        </motion.div>
      )}

      {/* Bottom actions */}
      <motion.div
        variants={sectionItem}
        className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-4"
      >
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold transition-all duration-150 hover:border-accent/40 hover:bg-secondary active:scale-[0.97]"
        >
          <Pencil className="size-3" aria-hidden="true" />
          Edit
        </button>
        {row.kind === 'konten' ? (
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-bold text-accent transition-all duration-150 hover:bg-accent/20 active:scale-[0.97]"
          >
            <RefreshCw className="size-3" aria-hidden="true" />
            Posting Ulang
          </button>
        ) : (
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-destructive/40 px-4 py-2 text-xs font-semibold text-destructive transition-all duration-150 hover:bg-destructive/10 active:scale-[0.97]"
          >
            <Trash2 className="size-3" aria-hidden="true" />
            Hapus dari Riwayat
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}

/* ================= Filter dropdown ================= */

const SORT_OPTIONS = ['Terbaru', 'Terlama', 'Nilai Tertinggi'] as const
type SortKey = (typeof SORT_OPTIONS)[number]

const KIND_FILTERS = [
  { key: 'semua', label: 'Semua' },
  { key: 'konten', label: 'Konten' },
  { key: 'transaksi', label: 'Transaksi' },
] as const
type KindFilter = (typeof KIND_FILTERS)[number]['key']

const STATUS_FILTERS = [
  { key: 'semua', label: 'Semua Status' },
  { key: 'selesai', label: 'Selesai' },
  { key: 'menunggu', label: 'Menunggu' },
  { key: 'gagal', label: 'Gagal' },
] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]['key']

/* ================= Main component ================= */

export function HistoryView() {
  const { contents, transactions, openContentModal, openTransactionModal } = useDashboard()
  const historyRows = useMemo(() => mapStoreRows(contents, transactions), [contents, transactions])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('Terbaru')
  const [sortOpen, setSortOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [kindFilter, setKindFilter] = useState<KindFilter>('semua')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('semua')
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const rows = useMemo(() => {
    let out = historyRows.filter((r) => {
      if (kindFilter !== 'semua' && r.kind !== kindFilter) return false
      if (statusFilter !== 'semua' && r.status !== statusFilter) return false
      if (query) {
        const q = query.toLowerCase()
        return (
          r.product.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          r.fullText.toLowerCase().includes(q)
        )
      }
      return true
    })
    if (sort === 'Terlama') out = [...out].reverse()
    if (sort === 'Nilai Tertinggi')
      out = [...out].sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
    return out
  }, [historyRows, query, sort, kindFilter, statusFilter])

  const selected = selectedId ? historyRows.find((r) => r.id === selectedId) ?? null : null
  const allChecked = rows.length > 0 && rows.every((r) => checked.has(r.id))

  function toggleAll() {
    setChecked((prev) => {
      if (rows.every((r) => prev.has(r.id))) return new Set()
      return new Set(rows.map((r) => r.id))
    })
  }

  function toggleOne(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className="relative flex flex-col gap-5">
      {/* Faint tech grid backdrop */}
      <div
        className="pointer-events-none absolute -inset-4 rounded-3xl bg-tech-grid opacity-60 [mask-image:radial-gradient(ellipse_80%_70%_at_50%_20%,black,transparent)]"
        aria-hidden="true"
      />

      {/* Header */}
      <div className="relative flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Semua Riwayat
          </h2>
          <p className="text-sm text-muted-foreground">{`${historyRows.length} aktivitas tercatat`}</p>
        </div>
        <button
          type="button"
          onClick={() => openContentModal()}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground transition-all duration-150 animate-glow-breathe hover:opacity-90 active:scale-[0.97]"
        >
          <Sparkles className="size-4 animate-sparkle-sway" aria-hidden="true" />
          Buat Konten Baru
        </button>
      </div>

      {/* Toolbar */}
      <div className="relative flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari produk, caption, atau transaksi..."
            aria-label="Cari riwayat"
            className="w-full rounded-full border border-border bg-background/60 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-accent/50"
          />
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            type="button"
            aria-expanded={sortOpen}
            aria-haspopup="listbox"
            onClick={() => {
              setSortOpen((v) => !v)
              setFilterOpen(false)
            }}
            className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:border-accent/40 hover:bg-secondary"
          >
            {sort}
            <ChevronDown
              className={`size-3.5 text-muted-foreground transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          <AnimatePresence>
            {sortOpen && (
              <motion.ul
                role="listbox"
                aria-label="Urutkan riwayat"
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="absolute right-0 top-full z-20 mt-2 w-44 origin-top-right overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl"
              >
                {SORT_OPTIONS.map((opt) => (
                  <li key={opt}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={opt === sort}
                      onClick={() => {
                        setSort(opt)
                        setSortOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        opt === sort
                          ? 'bg-accent/10 font-semibold text-accent'
                          : 'text-foreground hover:bg-secondary'
                      }`}
                    >
                      {opt}
                      {opt === sort && <Check className="size-3.5" aria-hidden="true" />}
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* More filters */}
        <div className="relative">
          <button
            type="button"
            aria-expanded={filterOpen}
            onClick={() => {
              setFilterOpen((v) => !v)
              setSortOpen(false)
            }}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
              kindFilter !== 'semua' || statusFilter !== 'semua'
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-border hover:border-accent/40 hover:bg-secondary'
            }`}
          >
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            Filter Lainnya
          </button>
          <AnimatePresence>
            {filterOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="absolute right-0 top-full z-20 mt-2 flex w-60 origin-top-right flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-xl"
              >
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Jenis</p>
                  <div className="flex flex-wrap gap-1.5">
                    {KIND_FILTERS.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setKindFilter(f.key)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          kindFilter === f.key
                            ? 'border-accent bg-accent text-accent-foreground'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_FILTERS.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setStatusFilter(f.key)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          statusFilter === f.key
                            ? 'border-accent bg-accent text-accent-foreground'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          aria-label="Atur kolom tabel"
          title="Atur kolom tabel"
          className="flex size-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-accent/40 hover:bg-secondary hover:text-foreground"
        >
          <Columns3 className="size-4" aria-hidden="true" />
        </button>
      </div>

      {/* Table + detail panel */}
      <div className="relative flex items-stretch gap-0 lg:gap-0">
        {/* Table card */}
        <div className="min-w-0 flex-1 rounded-2xl border border-border bg-background/50">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="py-3 pl-4 pr-2 sm:pl-5">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      aria-label="Pilih semua baris"
                      className="size-4 cursor-pointer rounded border-border accent-[var(--accent)]"
                    />
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Waktu
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Produk
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Jenis
                  </th>
                  <th scope="col" className="py-3 pr-4 text-right font-medium">
                    Nilai
                  </th>
                  <th scope="col" className="py-3 pr-4 text-center font-medium sm:pr-5">
                    <span className="sr-only">Status</span>
                  </th>
                </tr>
              </thead>
              <motion.tbody
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
              >
                <AnimatePresence initial={false}>
                  {rows.map((row, i) => {
                    const active = row.id === selectedId
                    const platform = PLATFORM_META[row.platform]
                    return (
                      <motion.tr
                        key={row.id}
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          show: {
                            opacity: 1,
                            y: 0,
                            transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
                          },
                        }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        onClick={() => setSelectedId(active ? null : row.id)}
                        className={`cursor-pointer border-b border-border/60 shadow-[inset_2px_0_0_0_transparent] transition-colors duration-300 last:border-b-0 ${
                          active
                            ? 'bg-accent/5 shadow-[inset_2px_0_0_0_var(--accent)]'
                            : 'hover:bg-secondary/40'
                        }`}
                      >
                        <td className="py-3.5 pl-4 pr-2 sm:pl-5">
                          <input
                            type="checkbox"
                            checked={checked.has(row.id)}
                            onChange={() => toggleOne(row.id)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Pilih ${row.product}`}
                            className="size-4 cursor-pointer rounded border-border accent-[var(--accent)]"
                          />
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="flex items-center gap-2.5">
                            <DirectionIcon direction={row.direction} status={row.status} />
                            <span>
                              <span className="block font-mono text-xs font-semibold">
                                {row.date}
                              </span>
                              <span className="block text-[11px] text-muted-foreground">
                                {row.kind === 'konten' ? 'Konten' : 'Transaksi'}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="block max-w-40 truncate font-semibold xl:max-w-56">
                            {row.product}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span
                              className={`flex size-4.5 shrink-0 items-center justify-center rounded-full text-white ${platform.className}`}
                              aria-hidden="true"
                            >
                              {platform.icon}
                            </span>
                            <span className="hidden truncate xl:inline">{row.type}</span>
                            <span className="truncate xl:hidden">{platform.label}</span>
                          </span>
                        </td>
                        <td
                          className={`py-3.5 pr-4 text-right font-mono text-xs ${
                            row.value === null
                              ? 'text-muted-foreground'
                              : row.value < 0
                                ? 'text-muted-foreground'
                                : 'text-foreground'
                          }`}
                        >
                          {row.value === null ? '—' : formatRupiah(row.value)}
                        </td>
                        <td className="py-3.5 pr-4 sm:pr-5">
                          <span className="flex justify-center">
                            <StatusDot status={row.status} delay={0.15 + i * 0.05} />
                          </span>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </motion.tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-5 py-10 text-center text-sm text-muted-foreground">
              <Search className="size-5 text-accent" aria-hidden="true" />
              {historyRows.length === 0 ? 'Belum ada riwayat. Mulai dari konten atau transaksi pertamamu.' : 'Tidak ada riwayat yang cocok dengan pencarian atau filter kamu.'}
            </div>
          )}
        </div>

        {/* Desktop detail panel: slides in from the right, table shrinks with it */}
        <AnimatePresence mode="popLayout">
          {selected && (
            <motion.aside
              key="detail-desktop"
              initial={{ width: 0, opacity: 0, x: 48 }}
              animate={{ width: 400, opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: 48 }}
              transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }}
              className="hidden shrink-0 overflow-hidden lg:block"
              aria-label="Detail riwayat"
            >
              <div className="ml-5 h-full w-[380px] rounded-2xl border border-border bg-background/50">
                <DetailContent row={selected} onClose={() => setSelectedId(null)} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile detail: bottom sheet */}
      <AnimatePresence>
        {selected && (
          <div className="lg:hidden">
            <motion.button
              key="detail-backdrop"
              type="button"
              aria-label="Tutup detail riwayat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedId(null)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              key="detail-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Detail riwayat"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-hidden rounded-t-3xl border-t border-border bg-card"
            >
              <div
                className="mx-auto mt-3 h-1 w-10 rounded-full bg-border"
                aria-hidden="true"
              />
              <div className="max-h-[calc(88dvh-1.75rem)] overflow-y-auto">
                <DetailContent row={selected} onClose={() => setSelectedId(null)} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
