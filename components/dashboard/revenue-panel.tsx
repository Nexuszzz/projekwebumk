'use client'

import { Reveal } from '@/components/motion'
import { useDashboard } from '@/lib/dashboard-store'
import { getDailyRevenueForChart } from '@/lib/stats'
import { downloadCsv } from '@/lib/utils'
import { motion } from 'framer-motion'
import { ChevronDown, Download, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'

/**
 * Data grafik: jumlah dot per hari (1 dot = ~Rp 60rb omzet tercatat).
 * `actual` bersumber dari Asisten Pencatatan Transaksi,
 * `projected` adalah proyeksi AI untuk sisa bulan berjalan.
 */
const X_LABELS = new Set([1, 5, 10, 14, 19, 24])

/** Delay dasar per kolom agar entrance terasa seperti gelombang kiri → kanan */
const COLUMN_STAGGER = 0.05
/** Delay tambahan per dot dalam satu kolom (bawah → atas) */
const DOT_STAGGER = 0.035

function formatRb(dots: number) {
  return `${dots * 60}rb`
}

function DotColumn({
  day,
  actual,
  projected,
  highlighted,
  columnIndex,
}: {
  day: number
  actual: number
  projected: number
  highlighted: boolean
  columnIndex: number
}) {
  const baseDelay = columnIndex * COLUMN_STAGGER
  const total = actual + projected

  return (
    <div className="group/col relative flex flex-1 flex-col-reverse items-center gap-1 self-stretch sm:gap-1.5">
      {/* Hover tooltip: total omzet kolom */}
      <div
        className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 scale-90 whitespace-nowrap rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground opacity-0 shadow-lg transition-all duration-200 group-hover/col:scale-100 group-hover/col:opacity-100"
        aria-hidden="true"
      >
        {formatRb(total)}
        {projected > 0 && <span className="ml-1 font-normal text-muted-foreground">AI</span>}
      </div>

      {/* Hover hit area + subtle column glow */}
      <div
        className="pointer-events-none absolute inset-x-0 inset-y-0 rounded-full bg-accent/0 transition-colors duration-200 group-hover/col:bg-accent/5"
        aria-hidden="true"
      />

      <span className="sr-only">{`Tanggal ${day} Juli: ${formatRb(total)}${projected > 0 ? ' (termasuk proyeksi AI)' : ''}`}</span>

      {Array.from({ length: actual }, (_, i) => (
        <span
          key={`a-${i}`}
          style={{ '--dot-delay': `${baseDelay + i * DOT_STAGGER}s` } as React.CSSProperties}
          className={`animate-dot-pop size-1.5 rounded-full transition-transform duration-200 group-hover/col:scale-125 sm:size-2.5 ${
            highlighted
              ? 'bg-accent shadow-[0_0_6px_0_color-mix(in_oklch,var(--accent)_60%,transparent)]'
              : 'bg-accent/80'
          }`}
          aria-hidden="true"
        />
      ))}
      {Array.from({ length: projected }, (_, i) => (
        <span
          key={`p-${i}`}
          style={
            {
              '--dot-delay': `${baseDelay + (actual + i) * DOT_STAGGER}s`,
              '--twinkle-delay': `${(day % 5) * 0.3 + i * 0.12}s`,
            } as React.CSSProperties
          }
          className="animate-dot-pop-twinkle size-1.5 rounded-full bg-accent/25 transition-transform duration-200 group-hover/col:scale-125 sm:size-2.5"
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

export function RevenuePanel() {
  const { transactions } = useDashboard()
  const [summaryOpen, setSummaryOpen] = useState(false)
  const days = useMemo(
    () => getDailyRevenueForChart(transactions).map((item) => ({
      day: item.date.getDate(),
      label: item.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      actual: Math.round(item.actual / 60_000),
      projected: Math.round(item.projected / 60_000),
    })),
    [transactions],
  )
  const highlight = useMemo(() => [...days].reverse().find((day) => day.actual > 0), [days])
  return (
    <Reveal className="flex flex-col gap-5 rounded-2xl border border-border bg-background/50 p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Ringkasan Omzet &amp; Proyeksi AI
        </h2>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
          >
            Omzet
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </span>
          <span
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
          >
            30 Hari Terakhir
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </span>
          <motion.button
            type="button"
            onClick={() => downloadCsv('omzet-30-hari.csv', [
              ['Tanggal', 'Aktual', 'Proyeksi AI'],
              ...days.map((day) => [day.label, day.actual * 60_000, day.projected * 60_000]),
            ])}
            whileHover={{ rotate: 0, y: -1 }}
            whileTap={{ scale: 0.92, y: 1 }}
            aria-label="Unduh data"
            className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
          >
            <Download className="size-3.5" aria-hidden="true" />
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left: legend + AI callout */}
        <div className="flex shrink-0 flex-col gap-4 lg:w-56">
          <ul className="flex gap-5 text-sm lg:flex-col lg:gap-2">
            <motion.li
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.35 }}
              className="flex items-center gap-2"
            >
              <span className="size-2.5 rounded-full bg-accent" aria-hidden="true" />
              Aktual
            </motion.li>
            <motion.li
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.35 }}
              className="flex items-center gap-2"
            >
              <span
                className="animate-dot-twinkle size-2.5 rounded-full bg-accent/25"
                aria-hidden="true"
              />
              Proyeksi AI
            </motion.li>
          </ul>

          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl border border-accent/25 bg-accent/8 p-3.5"
          >
            <p className="text-xs leading-relaxed text-foreground/90 text-pretty">
              <Sparkles
                className="animate-sparkle-sway mr-1.5 inline size-3.5 text-accent"
                aria-hidden="true"
              />
              Produk dengan caption terbaru biasanya terjual lebih cepat. 3 produkmu belum ada
              konten baru minggu ini.
            </p>
          </motion.div>

          <motion.button
            type="button"
            onClick={() => setSummaryOpen((open) => !open)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            className="animate-glow-breathe mt-auto flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            <Sparkles className="animate-sparkle-sway size-4" aria-hidden="true" />
            Buat Ringkasan AI
          </motion.button>
          {summaryOpen && (
            <p className="rounded-xl border border-accent/25 bg-accent/8 p-3.5 text-xs leading-relaxed text-muted-foreground" aria-live="polite">
              {transactions.length === 0
                ? 'Belum ada transaksi untuk diringkas.'
                : `${transactions.length} transaksi tercatat dengan total ${transactions.reduce((sum, item) => sum + item.total, 0).toLocaleString('id-ID')} rupiah.`}
            </p>
          )}
        </div>

        {/* Right: dot-matrix chart */}
        <div className="min-w-0 flex-1">
          {transactions.length === 0 && (
            <p className="mb-3 rounded-xl border border-dashed border-border px-4 py-3 text-center text-sm text-muted-foreground">
              Belum ada omzet. Catat transaksi pertamamu untuk melihat grafik.
            </p>
          )}
          <div className="overflow-x-auto pb-2 [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] sm:overflow-visible sm:[mask-image:none]">
          <div className="flex min-w-[700px] gap-3 sm:min-w-0">
            {/* Y axis */}
            <div
              className="flex h-40 flex-col justify-between py-0.5 text-right font-mono text-[10px] text-muted-foreground sm:h-52"
              aria-hidden="true"
            >
              <span>800rb</span>
              <span>400rb</span>
              <span>0</span>
            </div>

            <div className="relative flex h-40 flex-1 items-end gap-1 border-b border-border pb-1 sm:h-52 sm:gap-1.5">
              {/* Highlight marker */}
              {highlight && <div
                className="pointer-events-none absolute inset-y-0 hidden lg:block"
                style={{ left: `${((days.indexOf(highlight) + 0.5) / days.length) * 100}%` }}
                aria-hidden="true"
              >
                <motion.span
                  initial={{ opacity: 0, y: 8, scale: 0.7 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 1.1, type: 'spring', stiffness: 300, damping: 18 }}
                  className="absolute -top-1 left-0 block"
                >
                  <span className="animate-float-bob absolute left-0 block whitespace-nowrap rounded-md bg-accent px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent-foreground shadow-[0_0_14px_-2px_var(--accent)]">
                    {formatRb(highlight.actual)}
                  </span>
                </motion.span>
                <span className="animate-line-draw absolute inset-y-3 left-0 border-l border-dashed border-accent/40" />
              </div>}

              {days.map((d, i) => (
                <DotColumn
                  key={d.day}
                  day={d.day}
                  actual={d.actual}
                  projected={d.projected}
                  highlighted={d === highlight}
                  columnIndex={i}
                />
              ))}
            </div>
          </div>

          {/* X axis */}
          <div className="ml-10 mt-2 flex gap-1 sm:gap-1.5" aria-hidden="true">
            {days.map((d, i) => (
              <motion.span
                key={d.day}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * COLUMN_STAGGER, duration: 0.3 }}
                className="flex-1 text-center font-mono text-[10px] text-muted-foreground"
              >
                {X_LABELS.has(d.day) ? d.label : ''}
              </motion.span>
            ))}
          </div>
          </div>
          <p className="sr-only">
            Grafik omzet harian bulan Juli: data aktual dari transaksi tercatat hingga tanggal 15,
            dilanjutkan proyeksi AI hingga tanggal 24.
          </p>
        </div>
      </div>
    </Reveal>
  )
}
