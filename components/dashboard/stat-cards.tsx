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

    const contentStat: Stat = monthly.hasPreviousContents
      ? {
          label: 'Konten Dibuat Bulan Ini',
          pillar: 'Pemasaran',
          value: monthly.contentCount,
          delta: `${monthly.contentDelta >= 0 ? '+' : ''}${monthly.contentDelta}`,
          deltaPositive: monthly.contentDelta >= 0,
          compare: `Dibanding ${monthly.previousContentCount} (bulan lalu)`,
        }
      : {
          label: 'Konten Dibuat Bulan Ini',
          pillar: 'Pemasaran',
          value: monthly.contentCount,
          delta: 'Baru dimulai',
          deltaPositive: true,
          compare: 'Belum ada data bulan lalu',
        }

    const transactionStat: Stat = monthly.hasPreviousTransactions
      ? {
          label: 'Transaksi Tercatat',
          pillar: 'Operasional',
          value: monthly.transactionCount,
          delta: `${monthly.transactionDelta >= 0 ? '+' : ''}${monthly.transactionDelta}`,
          deltaPositive: monthly.transactionDelta >= 0,
          compare: `Dibanding ${monthly.previousTransactionCount} (bulan lalu)`,
        }
      : {
          label: 'Transaksi Tercatat',
          pillar: 'Operasional',
          value: monthly.transactionCount,
          delta: 'Baru dimulai',
          deltaPositive: true,
          compare: 'Belum ada data bulan lalu',
        }

    const revenueStat: Stat =
      monthly.revenueGrowth === null || !monthly.hasPreviousRevenue
        ? {
            label: 'Omzet Bulan Ini',
            pillar: 'Operasional',
            value: monthly.revenue,
            prefix: 'Rp ',
            delta: 'Data pertama',
            deltaPositive: true,
            // Samakan panjang dengan kartu lain biar footer sejajar
            compare: 'Belum ada data bulan lalu',
          }
        : {
            label: 'Omzet Bulan Ini',
            pillar: 'Operasional',
            value: monthly.revenue,
            prefix: 'Rp ',
            delta: `${monthly.revenueGrowth >= 0 ? '+' : ''}${(Math.round(monthly.revenueGrowth * 10) / 10).toLocaleString('id-ID')}%`,
            deltaPositive: monthly.revenueGrowth >= 0,
            compare: 'Dari data transaksi tercatat',
          }

    return [contentStat, transactionStat, revenueStat]
  }, [contents, transactions])

  return (
    <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <StaggerItem
          key={stat.label}
          className="flex h-full min-w-0 flex-col rounded-2xl border border-border bg-background/50 p-4 sm:p-5"
        >
          {/* Header: label + badge — tinggi konsisten */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 pr-1">
              <p className="text-sm font-medium leading-snug text-pretty">{stat.label}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                {stat.pillar}
              </p>
            </div>
            <span
              title={stat.delta}
              className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold leading-5 sm:text-xs ${
                stat.deltaPositive
                  ? 'bg-accent/15 text-accent'
                  : 'bg-destructive/15 text-destructive'
              }`}
            >
              {stat.delta}
            </span>
          </div>

          {/* Nilai — stack vertikal biar omzet Rp tidak desak teks banding */}
          <div className="mt-3 min-w-0">
            <CountUp
              value={stat.value}
              prefix={stat.prefix}
              className="block max-w-full font-display text-2xl font-bold tracking-tight tabular-nums sm:text-[1.65rem] lg:text-3xl"
            />
          </div>

          {/* Footer banding — min-height seragam antar kartu */}
          <p className="mt-2 min-h-[2rem] text-xs leading-snug text-muted-foreground text-pretty">
            {stat.compare}
          </p>
        </StaggerItem>
      ))}
    </Stagger>
  )
}
