'use client'

import { Stagger, StaggerItem } from '@/components/motion'
import { ChevronRight, FileText, Mic, PackageSearch } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DashboardTab } from './dashboard-navbar'

type Task = {
  icon: LucideIcon
  title: string
  meta: string
  description: string
  highlighted?: boolean
  tab: DashboardTab
}

const TASKS: Task[] = [
  {
    icon: FileText,
    title: 'Draft Konten Belum Diposting',
    meta: '2 draft siap',
    description: '2 caption siap, belum dipublikasikan ke Tokopedia.',
    highlighted: true,
    tab: 'Konten',
  },
  {
    icon: Mic,
    title: 'Transaksi Belum Diverifikasi',
    meta: '3 menunggu',
    description: '3 transaksi hasil input suara perlu dicek ulang.',
    tab: 'Transaksi',
  },
  {
    icon: PackageSearch,
    title: 'Rekomendasi Restock',
    meta: 'Prediksi AI',
    description: 'Nusacid Anti Bakteri diprediksi habis dalam 4 hari berdasarkan tren transaksi.',
    tab: 'Ringkasan',
  },
]

export function PriorityTasks({ onNavigate }: { onNavigate: (tab: DashboardTab) => void }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-background/50 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold tracking-tight">Tugas Prioritas</h2>
        <button type="button" onClick={() => onNavigate('Riwayat')} className="text-xs font-medium text-accent hover:underline">
          Lihat semua
        </button>
      </div>

      <Stagger className="flex flex-col gap-2">
        {TASKS.map((task) => (
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
