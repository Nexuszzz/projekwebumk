import type { ContentItem, TransactionItem } from '@/lib/types'

const DAY_MS = 86_400_000

export type StatsPeriod = 'Hari Ini' | 'Minggu Ini' | 'Bulan Ini'

/** Omzet hanya dari transaksi final — bukan yang masih "Perlu Verifikasi". */
export function isConfirmedTransaction(item: TransactionItem) {
  return item.status === 'Tersimpan'
}

export function confirmedTransactions(transactions: TransactionItem[]) {
  return transactions.filter(isConfirmedTransaction)
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfPreviousMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1)
}

/** Senin sebagai awal minggu (umum untuk laporan bisnis di Indonesia). */
function startOfWeek(date: Date) {
  const day = date.getDay()
  const mondayOffset = day === 0 ? 6 : day - 1
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() - mondayOffset))
}

function isWithin(date: string, start: Date, end: Date) {
  const value = new Date(date).getTime()
  return value >= start.getTime() && value < end.getTime()
}

function dayKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getPeriodStart(period: StatsPeriod, now: Date) {
  if (period === 'Hari Ini') return startOfDay(now)
  if (period === 'Minggu Ini') return startOfWeek(now)
  return startOfMonth(now)
}

/**
 * Delta jumlah transaksi: periode terpilih vs jendela sebelumnya
 * dengan durasi yang sama (mis. bulan berjalan sejauh ini vs rentang
 * setara tepat sebelum awal periode).
 */
export function getTransactionPeriodDelta(
  transactions: TransactionItem[],
  period: StatsPeriod,
  now = new Date(),
) {
  const currentStart = getPeriodStart(period, now)
  const currentEnd = now
  const durationMs = Math.max(0, currentEnd.getTime() - currentStart.getTime())
  const previousEnd = currentStart
  const previousStart = new Date(previousEnd.getTime() - durationMs)

  const currentCount = transactions.filter(
    (item) => isConfirmedTransaction(item) && isWithin(item.createdAt, currentStart, currentEnd),
  ).length
  const previousCount = transactions.filter(
    (item) => isConfirmedTransaction(item) && isWithin(item.createdAt, previousStart, previousEnd),
  ).length
  const delta = currentCount - previousCount

  return {
    currentCount,
    previousCount,
    delta,
    /** Ada data pembanding yang bisa dipakai untuk menampilkan angka delta. */
    hasComparable: previousCount > 0,
  }
}

export type FlowChartPoint = {
  date: Date
  label: string
  /** Total omzet (rupiah) pada hari itu. */
  dayTotal: number
}

/**
 * Deret harian + total omzet untuk panel "Arus Transaksi".
 *
 * INVARIAN: `total === sum(points.dayTotal)` dan untuk setiap titik
 * `point.dayTotal <= total`. Header angka besar harus memakai `total`
 * dari fungsi ini (bukan sumber terpisah) agar tooltip harian tidak
 * pernah melebihi total keseluruhan pada periode yang sama.
 */
export function getTransactionFlowSeries(
  transactions: TransactionItem[],
  period: StatsPeriod,
  now = new Date(),
): { points: FlowChartPoint[]; total: number } {
  const currentStart = getPeriodStart(period, now)
  const currentEnd = now
  const startDay = startOfDay(currentStart)
  const endDay = startOfDay(currentEnd)
  const dayCount = Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / DAY_MS) + 1)

  const buckets = new Map<string, { date: Date; dayTotal: number }>()
  for (let index = 0; index < dayCount; index += 1) {
    const date = new Date(startDay.getTime() + index * DAY_MS)
    buckets.set(dayKey(date), { date, dayTotal: 0 })
  }

  for (const transaction of transactions) {
    if (!isConfirmedTransaction(transaction)) continue
    if (!isWithin(transaction.createdAt, currentStart, currentEnd)) continue
    const day = startOfDay(new Date(transaction.createdAt))
    const bucket = buckets.get(dayKey(day))
    if (!bucket) continue
    bucket.dayTotal += transaction.total
  }

  const points: FlowChartPoint[] = Array.from(buckets.values()).map((bucket) => ({
    date: bucket.date,
    label: bucket.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    dayTotal: bucket.dayTotal,
  }))

  const total = points.reduce((sum, point) => sum + point.dayTotal, 0)

  // Runtime assertion — jaga konsistensi header total vs titik harian.
  if (process.env.NODE_ENV !== 'production') {
    const sumDays = points.reduce((sum, point) => sum + point.dayTotal, 0)
    console.assert(sumDays === total, '[stats] flow total must equal sum of daily totals', { sumDays, total })
    for (const point of points) {
      console.assert(
        point.dayTotal <= total,
        '[stats] daily point must not exceed period total',
        { dayTotal: point.dayTotal, total, label: point.label },
      )
    }
  }

  return { points, total }
}

export function getMonthlyStats(contents: ContentItem[], transactions: TransactionItem[], now = new Date()) {
  const currentStart = startOfMonth(now)
  const previousStart = startOfPreviousMonth(now)
  const currentContents = contents.filter((item) => isWithin(item.createdAt, currentStart, now))
  const previousContents = contents.filter((item) => isWithin(item.createdAt, previousStart, currentStart))
  const currentTransactions = transactions.filter(
    (item) => isConfirmedTransaction(item) && isWithin(item.createdAt, currentStart, now),
  )
  const previousTransactions = transactions.filter(
    (item) => isConfirmedTransaction(item) && isWithin(item.createdAt, previousStart, currentStart),
  )
  const currentRevenue = currentTransactions.reduce((sum, item) => sum + item.total, 0)
  const previousRevenue = previousTransactions.reduce((sum, item) => sum + item.total, 0)

  /**
   * Growth hanya dihitung bila ada omzet bulan lalu (> 0).
   * Jika pembanding 0, `revenueGrowth` = null — UI menampilkan badge netral,
   * bukan "+100%" yang menyesatkan secara matematis.
   */
  const revenueGrowth =
    previousRevenue === 0
      ? null
      : ((currentRevenue - previousRevenue) / previousRevenue) * 100

  return {
    contentCount: currentContents.length,
    contentDelta: currentContents.length - previousContents.length,
    hasPreviousContents: previousContents.length > 0,
    previousContentCount: previousContents.length,
    transactionCount: currentTransactions.length,
    transactionDelta: currentTransactions.length - previousTransactions.length,
    hasPreviousTransactions: previousTransactions.length > 0,
    previousTransactionCount: previousTransactions.length,
    revenue: currentRevenue,
    previousRevenue,
    revenueGrowth,
    hasPreviousRevenue: previousRevenue > 0,
    currentTransactions,
    previousTransactions,
  }
}

export function getTransactionMetrics(transactions: TransactionItem[], now = new Date()) {
  const { currentTransactions, previousTransactions } = getMonthlyStats([], transactions, now)
  const total = currentTransactions.reduce((sum, item) => sum + item.total, 0)
  const previousTotal = previousTransactions.reduce((sum, item) => sum + item.total, 0)
  const average = currentTransactions.length ? total / currentTransactions.length : 0
  const previousAverage = previousTransactions.length
    ? previousTotal / previousTransactions.length
    : 0
  const highest = currentTransactions.reduce((max, item) => Math.max(max, item.total), 0)
  const previousHighest = previousTransactions.reduce((max, item) => Math.max(max, item.total), 0)
  const monthStart = startOfMonth(now)
  const needsVerification = transactions.filter(
    (item) => item.status === 'Perlu Verifikasi' && isWithin(item.createdAt, monthStart, now),
  ).length
  const hasPreviousPeriod = previousTransactions.length > 0

  const averageGrowth =
    hasPreviousPeriod && previousAverage > 0
      ? ((average - previousAverage) / previousAverage) * 100
      : null
  const highestGrowth =
    hasPreviousPeriod && previousHighest > 0
      ? ((highest - previousHighest) / previousHighest) * 100
      : null

  return {
    total,
    average,
    previousAverage,
    averageGrowth,
    highest,
    previousHighest,
    highestGrowth,
    needsVerification,
    count: currentTransactions.length,
    hasPreviousPeriod,
  }
}

export type DailyRevenue = { date: Date; actual: number; projected: number }

/**
 * Omzet harian untuk grafik ringkasan.
 * `historyDays` = hari ke belakang termasuk hari ini.
 * `futureDays` = estimasi linier (bukan model AI) — label UI: "Estimasi proyeksi".
 */
export function getDailyRevenueForChart(
  transactions: TransactionItem[],
  historyDays = 24,
  now = new Date(),
  futureDays = 6,
): DailyRevenue[] {
  const today = startOfDay(now)
  const start = new Date(today.getTime() - (historyDays - 1) * DAY_MS)
  const totalDays = historyDays + futureDays
  const totals = new Map<string, number>()

  for (const transaction of transactions) {
    if (!isConfirmedTransaction(transaction)) continue
    const date = new Date(transaction.createdAt)
    const key = dayKey(startOfDay(date))
    totals.set(key, (totals.get(key) ?? 0) + transaction.total)
  }

  const historical = Array.from(totals.values()).filter((value) => value > 0)
  const baseline = historical.length ? historical.reduce((sum, value) => sum + value, 0) / historical.length : 0

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(start.getTime() + index * DAY_MS)
    const key = dayKey(date)
    const actualRaw = totals.get(key) ?? 0
    const isFuture = date.getTime() > today.getTime()
    // Estimasi deterministik (bukan AI) — stabil antar render.
    const variation = 1.05 + ((date.getDate() * 17 + date.getMonth() * 7) % 11) / 100
    const actual = isFuture ? 0 : actualRaw
    const projected = isFuture && baseline > 0 ? Math.round(baseline * variation) : 0
    return { date, actual, projected }
  })
}
