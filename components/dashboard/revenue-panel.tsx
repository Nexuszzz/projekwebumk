'use client'

import { Reveal } from '@/components/motion'
import { downloadFinancialPdf } from '@/lib/client/financial-pdf'
import { useDashboard } from '@/lib/dashboard-store'
import { getDailyRevenueForChart } from '@/lib/stats'
import { downloadCsv } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Download, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Data grafik: jumlah dot per hari (1 dot = ~Rp 60rb omzet tercatat).
 * `actual` bersumber dari transaksi store via getDailyRevenueForChart,
 * `projected` = estimasi linier ke depan (bukan model AI).
 */
const DOT_VALUE = 60_000
/** Delay dasar per kolom agar entrance terasa seperti gelombang kiri → kanan */
const COLUMN_STAGGER = 0.05
/** Delay tambahan per dot dalam satu kolom (bawah → atas) */
const DOT_STAGGER = 0.035

type MetricKey = 'omzet'
type RangeKey = '7+3' | '14+4' | '24+6' | '30+7'

const METRIC_OPTIONS: { key: MetricKey; label: string }[] = [
  { key: 'omzet', label: 'Omzet' },
]

const RANGE_OPTIONS: { key: RangeKey; label: string; historyDays: number; futureDays: number }[] = [
  { key: '7+3', label: '7+3 Hari', historyDays: 7, futureDays: 3 },
  { key: '14+4', label: '14+4 Hari', historyDays: 14, futureDays: 4 },
  { key: '24+6', label: '24+6 Hari', historyDays: 24, futureDays: 6 },
  { key: '30+7', label: '30+7 Hari', historyDays: 30, futureDays: 7 },
]

function formatRb(dots: number) {
  return `${Math.round(dots * 60)}rb`
}

function formatMoney(n: number) {
  return `Rp${Math.round(n).toLocaleString('id-ID')}`
}

function formatAxisLabel(dots: number) {
  if (dots <= 0) return '0'
  const rb = Math.round(dots * 60)
  if (rb >= 1000) {
    const jt = rb / 1000
    return `${Number.isInteger(jt) ? jt : jt.toFixed(1)}jt`
  }
  return `${rb}rb`
}

function DotColumn({
  label,
  dayOfMonth,
  actual,
  projected,
  highlighted,
  columnIndex,
  maxDots,
}: {
  label: string
  dayOfMonth: number
  actual: number
  projected: number
  highlighted: boolean
  columnIndex: number
  maxDots: number
}) {
  const baseDelay = columnIndex * COLUMN_STAGGER
  const total = actual + projected
  // Cap visual stack height so dots never overflow the chart box.
  const scale = maxDots > 0 ? Math.min(1, 14 / maxDots) : 1
  const shownActual = Math.max(0, Math.round(actual * scale))
  const shownProjected = Math.max(0, Math.round(projected * scale))

  return (
    <div className="group/col relative flex h-full flex-1 flex-col-reverse items-center gap-1 sm:gap-1.5">
      {/* Hover tooltip: total omzet kolom — di atas area chart, tidak tumpang-tindih label */}
      <div
        className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 -translate-x-1/2 scale-90 whitespace-nowrap rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground opacity-0 shadow-lg transition-all duration-200 group-hover/col:scale-100 group-hover/col:opacity-100"
        aria-hidden="true"
      >
        {formatRb(total)}
        {projected > 0 && <span className="ml-1 font-normal text-muted-foreground">AI</span>}
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 inset-y-0 rounded-full bg-accent/0 transition-colors duration-200 group-hover/col:bg-accent/5"
        aria-hidden="true"
      />

      <span className="sr-only">
        {`${label}: ${formatRb(total)}${projected > 0 ? ' (proyeksi AI)' : ''}`}
      </span>

      {Array.from({ length: shownActual }, (_, i) => (
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
      {Array.from({ length: shownProjected }, (_, i) => (
        <span
          key={`p-${i}`}
          style={
            {
              '--dot-delay': `${baseDelay + (shownActual + i) * DOT_STAGGER}s`,
              '--twinkle-delay': `${(dayOfMonth % 5) * 0.3 + i * 0.12}s`,
            } as React.CSSProperties
          }
          className="animate-dot-pop-twinkle size-1.5 rounded-full bg-accent/25 transition-transform duration-200 group-hover/col:scale-125 sm:size-2.5"
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

function MiniDropdown<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T
  options: { key: T; label: string }[]
  onChange: (value: T) => void
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const active = options.find((option) => option.key === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    function onOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
      >
        {active.label}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={ariaLabel}
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full z-40 mt-1.5 min-w-36 origin-top-right overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl"
          >
            {options.map((option) => (
              <li key={option.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.key === value}
                  onClick={() => {
                    onChange(option.key)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                    option.key === value
                      ? 'bg-accent/10 text-accent'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {option.label}
                  {option.key === value && (
                    <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export function RevenuePanel() {
  const { transactions, businessId } = useDashboard()
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryText, setSummaryText] = useState<string | null>(null)
  const [summaryBusy, setSummaryBusy] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [metric, setMetric] = useState<MetricKey>('omzet')
  const [rangeKey, setRangeKey] = useState<RangeKey>('24+6')

  const range = RANGE_OPTIONS.find((option) => option.key === rangeKey) ?? RANGE_OPTIONS[2]

  const days = useMemo(
    () =>
      getDailyRevenueForChart(transactions, range.historyDays, new Date(), range.futureDays).map(
        (item) => ({
          key: item.date.toISOString().slice(0, 10),
          dayOfMonth: item.date.getDate(),
          label: item.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          shortLabel: String(item.date.getDate()),
          actual: Math.round(item.actual / DOT_VALUE),
          projected: Math.round(item.projected / DOT_VALUE),
        }),
      ),
    [transactions, range.historyDays, range.futureDays],
  )

  const highlight = useMemo(
    () => [...days].reverse().find((day) => day.actual > 0),
    [days],
  )

  const maxDots = useMemo(() => {
    const peak = Math.max(1, ...days.map((day) => day.actual + day.projected))
    // Round up ke kelipatan yang rapi untuk tick Y.
    if (peak <= 5) return 5
    if (peak <= 10) return 10
    if (peak <= 15) return 15
    if (peak <= 20) return 20
    return Math.ceil(peak / 5) * 5
  }, [days])

  const yTicks = useMemo(
    () => [maxDots, Math.round(maxDots / 2), 0],
    [maxDots],
  )

  // Maksimal 4 label X supaya "24 Jun" tidak tumpang-tindih antar kolom sempit.
  const labelIndexes = useMemo(() => {
    const last = days.length - 1
    if (last <= 0) return new Set([0])
    if (last <= 3) return new Set(days.map((_, i) => i))
    const mid1 = Math.round(last / 3)
    const mid2 = Math.round((2 * last) / 3)
    return new Set([0, mid1, mid2, last])
  }, [days])

  const productsWithoutContentHint =
    'Produk dengan caption terbaru biasanya terjual lebih cepat. 3 produkmu belum ada konten baru minggu ini.'

  async function createAiReportPdf() {
    setSummaryBusy(true)
    setSummaryError(null)
    setSummaryOpen(true)
    try {
      if (!businessId) throw new Error('Belum ada usaha aktif.')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-business-id': businessId,
      }
      const response = await fetch('/api/reports/financial', {
        method: 'POST',
        headers,
        body: JSON.stringify({ period: 'month', ai: true, businessId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Gagal membuat laporan.')
      if (payload.report?.businessId && payload.report.businessId !== businessId) {
        throw new Error('Laporan tidak cocok dengan usaha aktif.')
      }
      const filename = await downloadFinancialPdf(payload.report, payload.narrative || '')
      const s = payload.report.summary
      const brand = payload.report.business?.brand || payload.brand || 'Usaha Anda'
      setSummaryText(
        [
          `PDF untuk ${brand}: ${filename}`,
          `Omzet ${formatMoney(s.omzet)} · Modal/HPP ${formatMoney(s.modalHpp)} · Laba ${formatMoney(s.labaKotor)} (${s.marginPercent}%)`,
          '',
          payload.narrative || '',
        ].join('\n'),
      )
    } catch (cause) {
      setSummaryError(cause instanceof Error ? cause.message : 'Gagal membuat laporan PDF.')
    } finally {
      setSummaryBusy(false)
    }
  }

  return (
    <Reveal className="flex flex-col gap-5 rounded-2xl border border-border bg-background/50 p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Ringkasan Omzet &amp; Estimasi
        </h2>
        <div className="relative z-30 flex items-center gap-2">
          <MiniDropdown
            value={metric}
            options={METRIC_OPTIONS}
            onChange={setMetric}
            ariaLabel="Pilih metrik grafik"
          />
          <MiniDropdown
            value={rangeKey}
            options={RANGE_OPTIONS}
            onChange={setRangeKey}
            ariaLabel="Pilih rentang hari grafik"
          />
          <motion.button
            type="button"
            onClick={() =>
              downloadCsv('omzet-proyeksi.csv', [
                ['Tanggal', 'Aktual', 'Estimasi'],
                ...days.map((day) => [
                  day.label,
                  day.actual * DOT_VALUE,
                  day.projected * DOT_VALUE,
                ]),
              ])
            }
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
              Estimasi (bukan AI)
            </motion.li>
          </ul>

          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl border border-accent/25 bg-accent/8 p-3.5"
          >
            <p className="text-xs leading-relaxed text-pretty text-foreground/90">
              <Sparkles
                className="animate-sparkle-sway mr-1.5 inline size-3.5 text-accent"
                aria-hidden="true"
              />
              {productsWithoutContentHint}
            </p>
          </motion.div>

          <motion.button
            type="button"
            disabled={summaryBusy}
            onClick={() => void createAiReportPdf()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            className="animate-glow-breathe mt-auto flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Sparkles className="animate-sparkle-sway size-4" aria-hidden="true" />
            {summaryBusy ? 'Menyusun PDF...' : 'Laporan PDF Omzet & Modal'}
          </motion.button>
          {summaryOpen && (
            <div
              className="rounded-xl border border-accent/25 bg-accent/8 p-3.5 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap"
              aria-live="polite"
            >
              {summaryBusy && <p>AI menghitung omzet, modal, laba & menyiapkan PDF...</p>}
              {summaryError && <p className="text-destructive">{summaryError}</p>}
              {!summaryBusy && !summaryError && summaryText && <p>{summaryText}</p>}
              {!summaryBusy && !summaryError && !summaryText && (
                <p>
                  {transactions.length === 0
                    ? 'Belum ada transaksi untuk diringkas.'
                    : `${transactions.length} transaksi tercatat dengan total ${transactions
                        .reduce((sum, item) => sum + item.total, 0)
                        .toLocaleString('id-ID')} rupiah.`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right: dot-matrix chart */}
        <div className="min-w-0 flex-1">
          {transactions.length === 0 && (
            <p className="mb-3 rounded-xl border border-dashed border-border px-4 py-3 text-center text-sm text-muted-foreground">
              Belum ada omzet. Catat transaksi pertamamu untuk melihat grafik.
            </p>
          )}

          {/* pt-8: ruang untuk tooltip / badge highlight agar tidak tabrakan label */}
          <div className="overflow-x-auto pb-1 pt-8 [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] sm:overflow-visible sm:[mask-image:none]">
            <div className="flex min-w-[640px] gap-3 sm:min-w-0">
              {/* Y axis — dinamis mengikuti puncak data */}
              <div
                className="flex h-40 w-10 shrink-0 flex-col justify-between py-0.5 text-right font-mono text-[10px] leading-none text-muted-foreground sm:h-52 sm:w-11"
                aria-hidden="true"
              >
                {yTicks.map((tick, i) => (
                  <span key={`y-${i}`} className="tabular-nums">
                    {formatAxisLabel(tick)}
                  </span>
                ))}
              </div>

              <div className="relative min-w-0 flex-1">
                <div className="relative flex h-40 items-end gap-1 border-b border-border pb-1 sm:h-52 sm:gap-1.5">
                  {/* Highlight marker — badge di atas chart, tidak menutupi sumbu */}
                  {highlight && (
                    <div
                      className="pointer-events-none absolute inset-y-0 z-10 hidden lg:block"
                      style={{
                        left: `${((days.indexOf(highlight) + 0.5) / days.length) * 100}%`,
                      }}
                      aria-hidden="true"
                    >
                      <motion.span
                        initial={{ opacity: 0, y: 8, scale: 0.7 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 1.1, type: 'spring', stiffness: 300, damping: 18 }}
                        className="absolute -top-7 left-1/2 -translate-x-1/2"
                      >
                        <span className="animate-float-bob block whitespace-nowrap rounded-md bg-accent px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent-foreground shadow-[0_0_14px_-2px_var(--accent)]">
                          {formatRb(highlight.actual)}
                        </span>
                      </motion.span>
                      <span className="animate-line-draw absolute inset-y-0 left-0 border-l border-dashed border-accent/40" />
                    </div>
                  )}

                  {days.map((d, i) => (
                    <DotColumn
                      key={d.key}
                      label={d.label}
                      dayOfMonth={d.dayOfMonth}
                      actual={d.actual}
                      projected={d.projected}
                      highlighted={d === highlight}
                      columnIndex={i}
                      maxDots={maxDots}
                    />
                  ))}
                </div>

                {/* X axis — label absolut di posisi kolom terpilih, anti-overlap */}
                <div className="relative mt-2 h-5" aria-hidden="true">
                  {days.map((d, i) => {
                    if (!labelIndexes.has(i)) return null
                    const left = ((i + 0.5) / days.length) * 100
                    const isFirst = i === 0
                    const isLast = i === days.length - 1
                    return (
                      <motion.span
                        key={d.key}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 + i * COLUMN_STAGGER, duration: 0.3 }}
                        className={`absolute top-0 whitespace-nowrap font-mono text-[10px] tabular-nums text-muted-foreground ${
                          isFirst
                            ? 'left-0 translate-x-0'
                            : isLast
                              ? 'right-0 left-auto translate-x-0'
                              : 'left-0 -translate-x-1/2'
                        }`}
                        style={
                          isFirst || isLast
                            ? undefined
                            : { left: `${left}%` }
                        }
                      >
                        {d.label}
                      </motion.span>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <p className="sr-only">
            Grafik omzet harian: data aktual dari transaksi tercatat, dilanjutkan proyeksi AI
            beberapa hari ke depan. Rentang: {range.label}.
          </p>
        </div>
      </div>
    </Reveal>
  )
}
