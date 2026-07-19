'use client'

import { Stagger, StaggerItem } from '@/components/motion'
import { useDashboard } from '@/lib/dashboard-store'
import { ChevronRight, FileText, PackageSearch, Receipt } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import type { DashboardTab } from './dashboard-navbar'

type Task = {
  icon: LucideIcon
  title: string
  meta: string
  description: string
  highlighted?: boolean
  tab: DashboardTab
}

export function PriorityTasks({ onNavigate }: { onNavigate: (tab: DashboardTab) => void }) {
  const { contents, transactions, catalog, profile } = useDashboard()

  const tasks = useMemo(() => {
    const draftCount = contents.filter((c) => c.status === 'Draft').length
    const verifyCount = transactions.filter((t) => t.status === 'Perlu Verifikasi').length
    const low = catalog.filter((p) => p.stock <= p.lowStockAt)
    const list: Task[] = []
    if (draftCount > 0) {
      list.push({
        icon: FileText,
        title: 'Draft Konten Belum Diposting',
        meta: `${draftCount} draft`,
        description: `${draftCount} caption di ${profile?.brand ?? 'usaha'} siap direview.`,
        highlighted: true,
        tab: 'Konten',
      })
    }
    if (verifyCount > 0) {
      list.push({
        icon: Receipt,
        title: 'Transaksi Belum Diverifikasi',
        meta: `${verifyCount} menunggu`,
        description: `${verifyCount} transaksi perlu dicek ulang.`,
        tab: 'Transaksi',
      })
    }
    if (low.length > 0) {
      list.push({
        icon: PackageSearch,
        title: 'Rekomendasi Restock',
        meta: `${low.length} SKU`,
        description: low.map((p) => `${p.shortName} sisa ${p.stock}`).join(' · '),
        tab: 'Ringkasan',
      })
    }
    if (list.length === 0) {
      list.push({
        icon: PackageSearch,
        title: catalog.length === 0 ? 'Tambah produk pertama' : 'Tidak ada tugas mendesak',
        meta: profile?.brand ?? 'Usaha',
        description:
          catalog.length === 0
            ? 'Usaha baru: tambah produk di Pengaturan, lalu catat transaksi.'
            : 'Stok dan konten terlihat aman. Lanjut jualan!',
        highlighted: catalog.length === 0,
        tab: catalog.length === 0 ? 'Pengaturan' : 'Ringkasan',
      })
    }
    return list
  }, [contents, transactions, catalog, profile])

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-background/50 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold tracking-tight">Tugas Prioritas</h2>
        <button type="button" onClick={() => onNavigate('Riwayat')} className="text-xs font-medium text-accent hover:underline">
          Lihat semua
        </button>
      </div>

      <Stagger className="flex flex-col gap-2">
        {tasks.map((task) => (
          <StaggerItem key={task.title}>
            <button
              type="button"
              onClick={() => onNavigate(task.tab)}
              className={`group flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                task.highlighted
                  ? 'border-accent/25 bg-accent/8 hover:bg-accent/12'
                  : 'border-border hover:bg-secondary/60'
              }`}
            >
              <span
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-accent"
                aria-hidden="true"
              >
                <task.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold">{task.title}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{task.meta}</span>
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground text-pretty">
                  {task.description}
                </span>
              </span>
              <ChevronRight
                className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  )
}
