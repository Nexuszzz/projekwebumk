'use client'

import { CountUp, Stagger, StaggerItem } from '@/components/motion'
import { useDashboard, type TransactionItem, type TxStatus } from '@/lib/dashboard-store'
import {
  getTransactionFlowSeries,
  getTransactionMetrics,
  getTransactionPeriodDelta,
  type FlowChartPoint,
  type StatsPeriod,
} from '@/lib/stats'
import { downloadCsv, formatRupiah } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  Download,
  MoreHorizontal,
  MoreVertical,
  Plus,
  SlidersHorizontal,
} from 'lucide-react'
import Image from 'next/image'
import { useMemo, useState } from 'react'

/* ============================================================
   Data dummy — konsisten dengan produk yang sudah ada
   ============================================================ */

const STATUS_STYLE: Record<TxStatus, string> = {
  Tersimpan: 'border-accent/30 bg-accent/10 text-accent',
  'Perlu Verifikasi': 'border-accent-warm/40 bg-accent-warm/10 text-accent-warm',
}

/* ============================================================
   Row 4 kartu statistik
   ============================================================ */

type Stat = {
  label: string
  value: number
  prefix?: string
  delta: string
  tone: 'positive' | 'negative' | 'warm'
  compare: string
}

const DELTA_TONE: Record<Stat['tone'], string> = {
  positive: 'bg-accent/15 text-accent',
  negative: 'bg-destructive/15 text-destructive',
  warm: 'bg-accent-warm/15 text-accent-warm',
}

function growthBadge(growth: number | null): { delta: string; tone: Stat['tone']; compare: string } {
  if (growth === null) {
    return { delta: 'Baru', tone: 'positive', compare: 'Belum ada data bulan lalu' }
  }
  return {
    delta: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`,
    tone: growth >= 0 ? 'positive' : 'negative',
    compare: 'Dibanding bulan lalu',
  }
}

function TransactionStats({ transactions }: { transactions: TransactionItem[] }) {
  const metrics = useMemo(() => getTransactionMetrics(transactions), [transactions])
  const avg = growthBadge(metrics.averageGrowth)
  const high = growthBadge(metrics.highestGrowth)
  const stats: Stat[] = [
    {
      label: 'Total Transaksi Bulan Ini',
      value: metrics.count,
      delta: metrics.hasPreviousPeriod ? `${metrics.count}` : 'Baru',
      tone: 'positive',
      compare: 'Dari data bulan berjalan',
    },
    {
      label: 'Rata-rata Nilai Transaksi',
      value: Math.round(metrics.average),
      prefix: 'Rp ',
      delta: avg.delta,
      tone: avg.tone,
      compare: avg.compare,
    },
    {
      label: 'Transaksi Tertinggi',
      value: metrics.highest,
      prefix: 'Rp ',
      delta: high.delta,
      tone: high.tone,
      compare: high.compare,
    },
    {
      label: 'Perlu Verifikasi',
      value: metrics.needsVerification,
      delta: String(metrics.needsVerification),
      tone: 'warm',
      compare: 'Transaksi yang perlu dicek',
    },
  ]
  return (
    <Stagger className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      {stats.map((stat) => (
        <StaggerItem
          key={stat.label}
          className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-background/50 p-4 transition-colors duration-300 hover:border-accent/30 sm:p-5"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 text-sm font-medium text-pretty">{stat.label}</p>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold sm:text-xs ${DELTA_TONE[stat.tone]}`}
            >
              {stat.delta}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <CountUp
              value={stat.value}
              prefix={stat.prefix}
              className="block max-w-full font-display text-2xl font-bold tracking-tight tabular-nums sm:text-3xl"
            />
            <p className="text-xs leading-snug text-muted-foreground text-pretty">
              {stat.compare}
            </p>
          </div>
        </StaggerItem>
      ))}
    </Stagger>
  )
}

/* ============================================================
   Panel kiri: "Arus Transaksi" — line chart omzet harian
   Data 100% dari getTransactionFlowSeries (bukan hardcode).
   ============================================================ */

const CHART_W = 640
const CHART_H = 220
const PAD_X = 12
const PAD_Y = 18

function chartScale(points: FlowChartPoint[]) {
  const maxRaw = Math.max(1, ...points.map((p) => p.dayTotal))
  // Padding visual agar garis tidak menempel tepi atas.
  const maxY = maxRaw * 1.15
  const last = Math.max(points.length - 1, 1)
  const toX = (i: number) => PAD_X + (i / last) * (CHART_W - PAD_X * 2)
  const toY = (v: number) => CHART_H - PAD_Y - (v / maxY) * (CHART_H - PAD_Y * 2)
  const linePath = () =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.dayTotal)}`).join(' ')
  return { toX, toY, linePath, maxY }
}

const PERIODS: StatsPeriod[] = ['Hari Ini', 'Minggu Ini', 'Bulan Ini']

function PeriodDropdown({
  period,
  onPeriodChange,
}: {
  period: StatsPeriod
  onPeriodChange: (period: StatsPeriod) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
      >
        {period}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Pilih periode"
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full z-20 mt-1.5 min-w-32 origin-top-right overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl"
          >
            {PERIODS.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  role="option"
                  aria-selected={p === period}
                  onClick={() => {
                    onPeriodChange(p)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                    p === period
                      ? 'bg-accent/10 text-accent'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {p}
                  {p === period && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

function FlowChart({ points }: { points: FlowChartPoint[] }) {
  const safePoints = points.length > 0 ? points : [{ date: new Date(), label: '—', dayTotal: 0 }]
  const { toX, toY, linePath } = chartScale(safePoints)
  const defaultHover = Math.max(
    0,
    safePoints.reduce((best, p, i) => (p.dayTotal >= (safePoints[best]?.dayTotal ?? 0) ? i : best), 0),
  )
  const [hovered, setHovered] = useState(defaultHover)
  const activeIndex = Math.min(hovered, safePoints.length - 1)
  const point = safePoints[activeIndex]
  const xPct = (toX(activeIndex) / CHART_W) * 100
  const yPct = (toY(Math.max(point.dayTotal, 1)) / CHART_H) * 100
  const slotWidth = (CHART_W - PAD_X * 2) / Math.max(safePoints.length - 1, 1)

  return (
    <div className="min-w-0">
      <div className="relative">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="h-44 w-full sm:h-56"
          role="img"
          aria-label={`Grafik arus transaksi: total periode ${formatRupiah(
            safePoints.reduce((s, p) => s + p.dayTotal, 0),
          )}.`}
        >
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={PAD_X}
              x2={CHART_W - PAD_X}
              y1={CHART_H * f}
              y2={CHART_H * f}
              className="stroke-border"
              strokeDasharray="3 6"
              strokeWidth="1"
            />
          ))}

          <motion.path
            d={`${linePath()} L ${toX(safePoints.length - 1)} ${CHART_H - PAD_Y} L ${toX(0)} ${CHART_H - PAD_Y} Z`}
            fill="var(--accent)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.07 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          />

          <motion.path
            d={linePath()}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          />

          <motion.line
            x1={toX(activeIndex)}
            x2={toX(activeIndex)}
            y1={PAD_Y - 6}
            y2={CHART_H - PAD_Y}
            stroke="var(--accent)"
            strokeOpacity="0.35"
            strokeDasharray="4 4"
            strokeWidth="1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          />

          {safePoints.map((p, i) => (
            <g key={`${p.label}-${i}`}>
              <motion.circle
                cx={toX(i)}
                cy={toY(p.dayTotal)}
                r={activeIndex === i ? 5 : 3}
                fill="var(--accent)"
                stroke="var(--card)"
                strokeWidth={activeIndex === i ? 2 : 0}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.03, type: 'spring', stiffness: 300, damping: 16 }}
              />
              <rect
                x={toX(i) - slotWidth / 2}
                y={0}
                width={slotWidth}
                height={CHART_H}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
                onFocus={() => setHovered(i)}
                tabIndex={-1}
                aria-hidden="true"
              />
            </g>
          ))}
        </svg>

        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, y: 6, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          style={{ left: `${xPct}%`, top: `${yPct}%` }}
          className={`pointer-events-none absolute z-10 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-lg border border-accent/40 bg-card px-2.5 py-1.5 shadow-[0_0_18px_-4px_color-mix(in_oklch,var(--accent)_45%,transparent)] ${
            activeIndex > safePoints.length - 3 ? '-translate-x-full' : '-translate-x-1/2'
          }`}
          aria-hidden="true"
        >
          <p className="font-mono text-[10px] text-muted-foreground">{point.label}</p>
          <p className="font-mono text-xs font-bold text-foreground">{formatRupiah(point.dayTotal)}</p>
        </motion.div>
      </div>

      <div className="mt-2 flex justify-between px-1" aria-hidden="true">
        {safePoints.map((p, i) => {
          const showLabel =
            safePoints.length <= 8 ||
            i === 0 ||
            i === safePoints.length - 1 ||
            i % Math.ceil(safePoints.length / 6) === 0
          return (
            <motion.span
              key={`${p.label}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.02 }}
              className={`font-mono text-[10px] ${
                activeIndex === i ? 'font-bold text-accent' : 'text-muted-foreground'
              }`}
            >
              {showLabel ? p.label : ''}
            </motion.span>
          )
        })}
      </div>
    </div>
  )
}

function TransactionFlowPanel({ transactions }: { transactions: TransactionItem[] }) {
  const [period, setPeriod] = useState<StatsPeriod>('Bulan Ini')
  // Header total = sum titik harian pada periode yang sama (satu sumber: getTransactionFlowSeries).
  const flow = useMemo(() => getTransactionFlowSeries(transactions, period), [transactions, period])
  const periodDelta = useMemo(
    () => getTransactionPeriodDelta(transactions, period),
    [transactions, period],
  )

  const showDelta = periodDelta.hasComparable && periodDelta.delta !== 0
  const deltaLabel = !showDelta
    ? 'Transaksi periode ini'
    : periodDelta.delta > 0
      ? `+${periodDelta.delta} transaksi baru periode ini`
      : `${periodDelta.delta} transaksi periode ini`

  return (
    <section className="flex min-w-0 flex-col gap-5 rounded-2xl border border-border bg-background/50 p-5 sm:p-6 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">Arus Transaksi</h2>
          <CountUp
            value={flow.total}
            prefix="Rp "
            className="mt-1 block font-display text-3xl font-bold tracking-tight sm:text-4xl"
          />
          <p
            className={`mt-1 flex items-center gap-1 text-xs font-medium ${
              showDelta
                ? periodDelta.delta > 0
                  ? 'text-accent'
                  : 'text-destructive'
                : 'text-muted-foreground'
            }`}
          >
            {showDelta && periodDelta.delta > 0 && (
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            )}
            {deltaLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodDropdown period={period} onPeriodChange={setPeriod} />
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            aria-label="Ganti tampilan grafik"
            className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
          >
            <BarChart3 className="size-3.5" aria-hidden="true" />
          </motion.button>
        </div>
      </div>

      <ul className="flex gap-5 text-xs">
        <motion.li
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <span className="h-0.5 w-5 rounded-full bg-accent" aria-hidden="true" />
          Omzet harian
        </motion.li>
      </ul>

      <FlowChart points={flow.points} />
    </section>
  )
}

/* ============================================================
   Panel kanan: "Transaksi Terbaru" — timeline list
   ============================================================ */

function RecentTransactionsPanel({ transactions }: { transactions: TransactionItem[] }) {
  const recent = useMemo(
    () => transactions.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 3),
    [transactions],
  )
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background/50 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold tracking-tight">Transaksi Terbaru</h2>
      </div>

      <Stagger staggerChildren={0.1} className="relative flex flex-1 flex-col gap-4">
        {/* Garis timeline vertikal */}
        <span
          className="absolute bottom-3 left-[13px] top-3 w-px bg-border"
          aria-hidden="true"
        />
        {recent.map((tx) => {
          const date = new Date(tx.createdAt)
          return <StaggerItem key={tx.id} className="relative flex items-center gap-3.5">
            {/* Dot tanggal */}
            <div className="relative z-10 flex w-7 shrink-0 flex-col items-center gap-1">
              <span className="font-mono text-xs font-bold leading-none">{date.getDate()}</span>
              <span className="text-[9px] uppercase leading-none text-muted-foreground">
                {date.toLocaleDateString('id-ID', { weekday: 'short' })}
              </span>
              <span
                className={`mt-0.5 size-2 rounded-full ring-4 ring-card ${
                  tx.status === 'Tersimpan' ? 'bg-accent' : 'bg-accent-warm animate-pulse-dot'
                }`}
                aria-hidden="true"
              />
            </div>

            {/* Card mini */}
            <motion.div
              whileHover={{ x: 3 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
              className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 transition-colors hover:border-accent/30"
            >
              <p className="truncate text-sm font-medium">{tx.product}</p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-xs font-semibold ${
                  tx.status === 'Tersimpan'
                    ? 'bg-accent/12 text-accent'
                    : 'bg-accent-warm/12 text-accent-warm'
                }`}
              >
                {formatRupiah(tx.total)}
              </span>
            </motion.div>
          </StaggerItem>
        })}
      </Stagger>

      {recent.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Belum ada transaksi terbaru.</p>}

      <motion.button
        type="button"
        onClick={() => document.getElementById('transaction-table')?.scrollIntoView({ behavior: 'smooth' })}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="mt-auto flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-border text-sm font-semibold text-foreground transition-colors hover:border-accent/50 hover:bg-secondary"
      >
        Lihat Semua
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </motion.button>
    </section>
  )
}

/* ============================================================
   Panel bawah: "Data Transaksi Lengkap" — tabel detail
   ============================================================ */

const DATE_RANGES = [
  { key: '7', label: '7 Hari Terakhir', days: 7 },
  { key: '15', label: '15 Hari Terakhir', days: 15 },
  { key: '30', label: '30 Hari Terakhir', days: 30 },
  { key: 'all', label: 'Semua Waktu', days: null },
] as const

type DateRangeKey = (typeof DATE_RANGES)[number]['key']

const TRANSACTION_STATUSES: TxStatus[] = ['Tersimpan', 'Perlu Verifikasi']

function TransactionTable() {
  const { transactions, updateTransaction } = useDashboard()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [range, setRange] = useState<DateRangeKey>('15')
  const [rangeOpen, setRangeOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [statusFilters, setStatusFilters] = useState<Set<TxStatus>>(new Set())
  const activeRange = DATE_RANGES.find((option) => option.key === range) ?? DATE_RANGES[1]
  const filteredTransactions = useMemo(() => {
    const start = activeRange.days === null || transactions.length === 0
      ? Number.NEGATIVE_INFINITY
      : Math.max(...transactions.map((item) => new Date(item.createdAt).getTime())) - (activeRange.days - 1) * 86_400_000
    return transactions.filter((item) => {
      const inDateRange = new Date(item.createdAt).getTime() >= start
      const statusMatches = statusFilters.size === 0 || statusFilters.has(item.status)
      return inDateRange && statusMatches
    })
  }, [activeRange.days, statusFilters, transactions])
  const dateFilteredTransactions = useMemo(() => {
    if (activeRange.days === null || transactions.length === 0) return transactions
    const latest = Math.max(...transactions.map((item) => new Date(item.createdAt).getTime()))
    const start = latest - (activeRange.days - 1) * 86_400_000
    return transactions.filter((item) => new Date(item.createdAt).getTime() >= start)
  }, [activeRange.days, transactions])
  const activeFilterCount = statusFilters.size
  const visibleSelected = filteredTransactions.filter((item) => selected.has(item.id)).length
  const allSelected = filteredTransactions.length > 0 && visibleSelected === filteredTransactions.length

  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current)
      for (const item of filteredTransactions) {
        if (allSelected) next.delete(item.id)
        else next.add(item.id)
      }
      return next
    })
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleStatus(status: TxStatus) {
    setStatusFilters((current) => {
      const next = new Set(current)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  return (
    <section id="transaction-table" className="flex min-w-0 scroll-mt-6 flex-col gap-4 rounded-2xl border border-border bg-background/50 p-4 sm:p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <h2 className="min-w-0 font-display text-base font-bold tracking-tight sm:text-lg">
          Data Transaksi Lengkap
        </h2>
          <div className="relative flex flex-wrap items-center gap-2">
          <div className="relative">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setRangeOpen((open) => !open)}
              aria-expanded={rangeOpen}
              aria-haspopup="listbox"
              className="flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
            >
              <Calendar className="size-3.5" aria-hidden="true" />
              {activeRange.label}
              <motion.span animate={{ rotate: rangeOpen ? 180 : 0 }}><ChevronDown className="size-3" aria-hidden="true" /></motion.span>
            </motion.button>
            <AnimatePresence>
              {rangeOpen && (
                <motion.ul
                  role="listbox"
                  aria-label="Filter rentang tanggal transaksi"
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl"
                >
                  {DATE_RANGES.map((option) => (
                    <li key={option.key}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={range === option.key}
                        onClick={() => { setRange(option.key); setRangeOpen(false) }}
                        className={`flex min-h-9 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${range === option.key ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                      >
                        {option.label}
                        {range === option.key && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => downloadCsv('transaksi.csv', [
              ['Produk', 'Varian', 'Total', 'Status', 'Tanggal'],
              ...filteredTransactions.map((item) => [item.product, item.variant, item.total, item.status, item.createdAt]),
            ])}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
          >
            <Download className="size-3.5" aria-hidden="true" />
            Export
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-haspopup="dialog"
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
          >
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            Filter Lainnya{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </motion.button>
          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                role="dialog"
                aria-label="Filter transaksi lainnya"
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="absolute right-0 z-30 mt-12 w-[min(16rem,calc(100vw-2rem))] rounded-2xl border border-border bg-popover p-4 shadow-xl sm:right-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Filter Transaksi</h3>
                  {activeFilterCount > 0 && <button type="button" onClick={() => { setStatusFilters(new Set()) }} className="text-xs font-semibold text-accent hover:underline">Reset</button>}
                </div>
                <fieldset className="mt-4">
                  <legend className="text-xs font-medium text-muted-foreground">Status</legend>
                  <div className="mt-2 flex flex-col gap-2">
                    {TRANSACTION_STATUSES.map((status) => <label key={status} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs hover:bg-secondary"><input type="checkbox" checked={statusFilters.has(status)} onChange={() => toggleStatus(status)} className="size-4 accent-[var(--accent)]" />{status}</label>)}
                  </div>
                </fieldset>
                <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{filteredTransactions.length} dari {dateFilteredTransactions.length} transaksi ditampilkan</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="scroll-x-soft -mx-4 px-4 sm:-mx-6 sm:px-6">
        {filteredTransactions.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <Plus className="size-5 text-accent" aria-hidden="true" />
            Belum ada transaksi. Catat transaksi pertamamu!
          </div>
        )}
        <table className="w-full min-w-[640px] border-collapse text-sm md:min-w-[760px]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="w-10 pb-3 pr-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Pilih semua transaksi"
                  className="size-4 cursor-pointer rounded border-border accent-[var(--accent)]"
                />
              </th>
              <th scope="col" className="pb-3 pr-4 font-medium">
                Produk
              </th>
              <th scope="col" className="pb-3 pr-4 font-medium">
                Nilai
              </th>
              <th scope="col" className="pb-3 pr-4 font-medium">
                Status
              </th>
              <th scope="col" className="pb-3 pr-4 font-medium">
                Tanggal &amp; Waktu
              </th>
              <th scope="col" className="pb-3">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((row, i) => {
              const isSelected = selected.has(row.id)
              return (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className={`group/row relative border-b border-border/60 shadow-[inset_2px_0_0_transparent] transition-colors duration-200 last:border-0 hover:bg-secondary/40 hover:shadow-[inset_2px_0_0_var(--accent)] ${
                    isSelected ? 'bg-accent/5' : ''
                  }`}
                >
                  <td className="py-3.5 pl-1 pr-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(row.id)}
                      aria-label={`Pilih transaksi ${row.product}`}
                      className="size-4 cursor-pointer rounded border-border accent-[var(--accent)]"
                    />
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className="flex items-center gap-3">
                      <Image
                        src={row.image || '/placeholder.svg'}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 shrink-0 rounded-lg border border-border object-cover transition-transform duration-300 group-hover/row:scale-105"
                      />
                      <span>
                        <span className="block font-semibold">{row.product}</span>
                        <span className="block text-xs text-muted-foreground">{row.variant}</span>
                      </span>
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs font-semibold">
                    {formatRupiah(row.total)}
                  </td>
                  <td className="py-3.5 pr-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[row.status]}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs text-muted-foreground">
                    {row.date}, {row.time}
                  </td>
                  <td className="py-3.5 text-right">
                    {row.status === 'Perlu Verifikasi' ? (
                      <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => {
                            setBusyId(row.id)
                            void updateTransaction(row.id, 'verify')
                              .catch((e) =>
                                window.alert(e instanceof Error ? e.message : 'Gagal verifikasi'),
                              )
                              .finally(() => setBusyId(null))
                          }}
                          className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground disabled:opacity-50"
                        >
                          Verifikasi
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => {
                            if (!window.confirm('Batalkan transaksi ini?')) return
                            setBusyId(row.id)
                            void updateTransaction(row.id, 'reject')
                              .catch((e) =>
                                window.alert(e instanceof Error ? e.message : 'Gagal batalkan'),
                              )
                              .finally(() => setBusyId(null))
                          }}
                          className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-destructive disabled:opacity-50"
                        >
                          Batalkan
                        </button>
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Final</span>
                    )}
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {visibleSelected > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className="text-xs font-medium text-accent"
            aria-live="polite"
          >
            {visibleSelected} transaksi dipilih
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  )
}

/* ============================================================
   View utama
   ============================================================ */

export function TransactionView() {
  const { openTransactionModal, transactions } = useDashboard()

  return (
    <section className="relative flex flex-col gap-5 lg:gap-6">
      {/* Faint tech grid backdrop — konsisten dengan content-view */}
      <div
        className="pointer-events-none absolute -inset-4 rounded-3xl bg-tech-grid opacity-60 [mask-image:radial-gradient(ellipse_80%_70%_at_50%_20%,black,transparent)]"
        aria-hidden="true"
      />

      {/* Header dengan CTA — konsisten dengan content-view */}
      <div className="relative flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
          Transaksi
        </h2>
        <button
          type="button"
          onClick={openTransactionModal}
          className="flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition-all duration-150 animate-glow-breathe hover:opacity-90 active:scale-[0.97] sm:px-5"
        >
          <Plus className="size-4" aria-hidden="true" />
          <span className="sm:hidden">Catat</span>
          <span className="hidden sm:inline">Catat Transaksi Baru</span>
        </button>
      </div>

      <div className="relative">
        <TransactionStats transactions={transactions} />
      </div>

      <div className="relative grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
        <TransactionFlowPanel transactions={transactions} />
        <RecentTransactionsPanel transactions={transactions} />
      </div>

      <div className="relative">
        <TransactionTable />
      </div>
    </section>
  )
}
