'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { MoreVertical, Search, Store, X } from 'lucide-react'
import Image from 'next/image'
import { InstagramIcon } from './brand-icons'
import { useMemo, useState } from 'react'
import { useDashboard, type ContentItem, type TransactionItem } from '@/lib/dashboard-store'
import { formatRupiah } from '@/lib/utils'

type RowKind = 'konten' | 'transaksi'

type Row = {
  id: string
  createdAt: string
  kind: RowKind
  product: string
  variant: string
  image: string
  type: string
  typeIcon?: 'instagram' | 'tokopedia'
  date: string
  value: string
  status: 'Draft' | 'Terposting' | 'Tersimpan' | 'Perlu Verifikasi'
}

/* Store-backed adapter; no independent activity dataset. */
function mapRows(contents: ContentItem[], transactions: TransactionItem[]): Row[] {
  return [...contents.map((item) => ({
    id: item.id, createdAt: item.createdAt, kind: 'konten' as const, product: item.title, variant: item.platform, image: item.image,
    type: item.platform, typeIcon: item.platform === 'Instagram' ? 'instagram' as const : 'tokopedia' as const,
    date: new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), value: '—', status: item.status,
  })), ...transactions.map((item) => ({
    id: item.id, createdAt: item.createdAt, kind: 'transaksi' as const, product: item.product, variant: item.variant, image: item.image,
    type: 'Transaksi', date: new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    value: formatRupiah(item.total), status: item.status,
  }))].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
}

const FILTERS = [
  { key: 'semua', label: 'Semua' },
  { key: 'konten', label: 'Konten' },
  { key: 'transaksi', label: 'Transaksi' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

const STATUS_STYLE: Record<Row['status'], string> = {
  Draft: 'border-border text-muted-foreground',
  Terposting: 'border-accent/30 bg-accent/10 text-accent',
  Tersimpan: 'border-accent/30 bg-accent/10 text-accent',
  'Perlu Verifikasi': 'border-accent-warm/40 bg-accent-warm/10 text-accent-warm',
}

function countFor(rows: Row[], key: FilterKey) {
  if (key === 'semua') return rows.length
  return rows.filter((r) => r.kind === key).length
}

export function ActivityTable() {
  const { contents, transactions } = useDashboard()
  const [filter, setFilter] = useState<FilterKey>('semua')
  const [query, setQuery] = useState('')
  const allRows = useMemo(() => mapRows(contents, transactions).slice(0, 8), [contents, transactions])
  const rows = allRows.filter((row) => {
    if (filter !== 'semua' && row.kind !== filter) return false
    return !query || `${row.product} ${row.type}`.toLowerCase().includes(query.toLowerCase())
  })

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background/50 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Aktivitas Konten &amp; Transaksi
        </h2>
        <div className="flex items-center gap-2">
          {query !== '' && <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari aktivitas" className="h-8 w-36 rounded-full border border-input bg-background px-3 text-xs outline-none focus:border-accent" />}
          <button type="button" onClick={() => setQuery((value) => value === '' ? ' ' : '')} aria-label="Cari aktivitas" className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground">
            {query === '' ? <Search className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div role="tablist" aria-label="Filter aktivitas" className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = f.key === filter
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
              <span
                className={`flex size-4.5 items-center justify-center rounded-full font-mono text-[10px] font-bold ${
                  active ? 'bg-accent-foreground/15' : 'bg-secondary'
                }`}
              >
                {countFor(allRows, f.key)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="-mx-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <Search className="size-5 text-accent" aria-hidden="true" />
            Belum ada aktivitas. Buat konten atau catat transaksi pertamamu.
          </div>
        )}
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="pb-3 pr-4 font-medium">
                Produk
              </th>
              <th scope="col" className="pb-3 pr-4 font-medium">
                Jenis
              </th>
              <th scope="col" className="pb-3 pr-4 font-medium">
                Tanggal
              </th>
              <th scope="col" className="pb-3 pr-4 font-medium">
                Nilai
              </th>
              <th scope="col" className="pb-3 pr-4 font-medium">
                Status
              </th>
              <th scope="col" className="pb-3">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((row) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="py-3.5 pr-4">
                    <span className="flex items-center gap-3">
                      <Image
                        src={row.image || '/placeholder.svg'}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 shrink-0 rounded-lg border border-border object-cover"
                      />
                      <span>
                        <span className="block font-semibold">{row.product}</span>
                        <span className="block text-xs text-muted-foreground">{row.variant}</span>
                      </span>
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      {row.typeIcon === 'instagram' && <InstagramIcon className="size-3.5" />}
                      {row.typeIcon === 'tokopedia' && (
                        <Store className="size-3.5" aria-hidden="true" />
                      )}
                      {row.type}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs text-muted-foreground">
                    {row.date}
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs">{row.value}</td>
                  <td className="py-3.5 pr-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[row.status]}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      type="button"
                      aria-label={`Aksi untuk ${row.product}`}
                      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <MoreVertical className="size-4" aria-hidden="true" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </section>
  )
}
