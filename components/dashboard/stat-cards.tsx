'use client'

import { CountUp, Stagger, StaggerItem } from '@/components/motion'
import { useDashboard } from '@/lib/dashboard-store'
import { getMonthlyStats } from '@/lib/stats'
import { useMemo } from 'react'

type Stat = {
  label: string
  pillar: string
  value: number
  prefix?: string
  delta: string
  deltaPositive: boolean
  compare: string
}

export function StatCards() {
  const { contents, transactions } = useDashboard()
  const stats = useMemo<Stat[]>(() => {
    const monthly = getMonthlyStats(contents, transactions)
    const previousContent = monthly.contentCount - monthly.contentDelta
    const previousTransactions = monthly.transactionCount - monthly.transactionDelta
    const growth = Math.round(monthly.revenueGrowth * 10) / 10
    return [
      {
        label: 'Konten Dibuat Bulan Ini', pillar: 'Pemasaran', value: monthly.contentCount,
        delta: `${monthly.contentDelta >= 0 ? '+' : ''}${monthly.contentDelta}`,
        deltaPositive: monthly.contentDelta >= 0, compare: `Dibanding ${previousContent} (bulan lalu)`,
      },
      {
        label: 'Transaksi Tercatat', pillar: 'Operasional', value: monthly.transactionCount,
        delta: `${monthly.transactionDelta >= 0 ? '+' : ''}${monthly.transactionDelta}`,
        deltaPositive: monthly.transactionDelta >= 0, compare: `Dibanding ${previousTransactions} (bulan lalu)`,
      },
      {
        label: 'Omzet Bulan Ini', pillar: 'Operasional', value: monthly.revenue, prefix: 'Rp ',
        delta: `${growth >= 0 ? '+' : ''}${growth.toLocaleString('id-ID')}%`,
        deltaPositive: growth >= 0, compare: 'Dari data transaksi tercatat',
      },
    ]
  }, [contents, transactions])

  return (
    <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <StaggerItem
          key={stat.label}
          className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-background/50 p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{stat.label}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                {stat.pillar}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-xs font-semibold ${
                stat.deltaPositive
                  ? 'bg-accent/15 text-accent'
                  : 'bg-destructive/15 text-destructive'
              }`}
            >
              {stat.delta}
            </span>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
            <CountUp
              value={stat.value}
              prefix={stat.prefix}
              className="whitespace-nowrap font-display text-2xl font-bold tracking-tight sm:text-3xl"
            />
            <p className="text-xs leading-snug text-muted-foreground text-pretty sm:text-right">
              {stat.compare}
            </p>
          </div>
        </StaggerItem>
      ))}
    </Stagger>
  )
}
