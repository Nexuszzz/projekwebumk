import type { ContentItem, TransactionItem } from '@/lib/dashboard-store'

const DAY_MS = 86_400_000

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfPreviousMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1)
}

function isWithin(date: string, start: Date, end: Date) {
  const value = new Date(date).getTime()
  return value >= start.getTime() && value < end.getTime()
}

export function getMonthlyStats(contents: ContentItem[], transactions: TransactionItem[], now = new Date()) {
  const currentStart = startOfMonth(now)
  const previousStart = startOfPreviousMonth(now)
  const currentContents = contents.filter((item) => isWithin(item.createdAt, currentStart, now))
  const previousContents = contents.filter((item) => isWithin(item.createdAt, previousStart, currentStart))
  const currentTransactions = transactions.filter((item) => isWithin(item.createdAt, currentStart, now))
  const previousTransactions = transactions.filter((item) => isWithin(item.createdAt, previousStart, currentStart))
  const currentRevenue = currentTransactions.reduce((sum, item) => sum + item.total, 0)
  const previousRevenue = previousTransactions.reduce((sum, item) => sum + item.total, 0)

  return {
    contentCount: currentContents.length,
    contentDelta: currentContents.length - previousContents.length,
    transactionCount: currentTransactions.length,
    transactionDelta: currentTransactions.length - previousTransactions.length,
    revenue: currentRevenue,
    revenueGrowth: previousRevenue === 0 ? (currentRevenue > 0 ? 100 : 0) : ((currentRevenue - previousRevenue) / previousRevenue) * 100,
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
  const needsVerification = currentTransactions.filter((item) => item.status === 'Perlu Verifikasi').length

  return { total, average, previousAverage, highest, previousHighest, needsVerification, count: currentTransactions.length }
}

export type DailyRevenue = { date: Date; actual: number; projected: number }

export function getDailyRevenueForChart(transactions: TransactionItem[], days = 30, now = new Date()): DailyRevenue[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(today.getTime() - (days - 1) * DAY_MS)
  const totals = new Map<string, number>()

  for (const transaction of transactions) {
    const date = new Date(transaction.createdAt)
    const key = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().slice(0, 10)
    totals.set(key, (totals.get(key) ?? 0) + transaction.total)
  }

  const historical = Array.from(totals.values()).filter((value) => value > 0)
  const baseline = historical.length ? historical.reduce((sum, value) => sum + value, 0) / historical.length : 0
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start.getTime() + index * DAY_MS)
    const key = date.toISOString().slice(0, 10)
    const actual = totals.get(key) ?? 0
    // Deterministic variation keeps the projection stable across renders.
    const variation = 1.05 + ((date.getDate() * 17 + date.getMonth() * 7) % 11) / 100
    return { date, actual, projected: date > today ? Math.round(baseline * variation) : 0 }
  })
}
