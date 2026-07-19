'use client'

import { Stagger, StaggerItem } from '@/components/motion'
import { downloadFinancialPdf } from '@/lib/client/financial-pdf'
import type { ReportPeriodKey } from '@/lib/financial-report'
import { useDashboard } from '@/lib/dashboard-store'
import { BarChart3, FileDown, ImagePlus, Receipt, Search, Send } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import type { DashboardTab } from './dashboard-navbar'

type QuickAction = {
  icon: LucideIcon
  label: string
  feature: string
  action?: 'content' | 'transaction' | 'summary' | 'history' | 'report-pdf'
}

const ACTIONS: QuickAction[] = [
  { icon: ImagePlus, label: 'Caption + Poster AI', feature: 'Generator Konten', action: 'content' },
  { icon: Receipt, label: 'Catat Transaksi Baru', feature: 'Pencatatan Transaksi', action: 'transaction' },
  { icon: FileDown, label: 'Laporan PDF Omzet & Modal', feature: 'Laporan AI lengkap', action: 'report-pdf' },
  { icon: BarChart3, label: 'Lihat Ringkasan Omzet', feature: 'Dashboard grafik', action: 'summary' },
  { icon: Search, label: 'Cari Konten Lama', feature: 'Riwayat Konten', action: 'history' },
]

const PERIODS: { key: ReportPeriodKey; label: string }[] = [
  { key: '7d', label: '7 hari' },
  { key: '30d', label: '30 hari' },
  { key: 'month', label: 'Bulan ini' },
  { key: 'all', label: 'Semua' },
]

function wantsPdfReport(command: string) {
  const c = command.toLowerCase()
  const mentionsReport =
    c.includes('laporan') ||
    c.includes('pdf') ||
    c.includes('report') ||
    c.includes('unduh omzet') ||
    c.includes('export')
  const mentionsFinance =
    c.includes('omzet') ||
    c.includes('modal') ||
    c.includes('laba') ||
    c.includes('keuangan') ||
    c.includes('penghasilan') ||
    c.includes('pendapatan') ||
    c.includes('hpp') ||
    mentionsReport
  return (
    mentionsReport ||
    (c.includes('buat') && mentionsFinance) ||
    (c.includes('generate') && mentionsFinance)
  )
}

function periodFromCommand(command: string): ReportPeriodKey {
  const c = command.toLowerCase()
  if (c.includes('7 hari') || c.includes('seminggu') || c.includes('minggu ini')) return '7d'
  if (c.includes('30 hari') || c.includes('sebulan') || c.includes('30d')) return '30d'
  if (c.includes('semua') || c.includes('all time') || c.includes('seluruh')) return 'all'
  return 'month'
}

export function AiAssistant({ onNavigate }: { onNavigate: (tab: DashboardTab) => void }) {
  const { openContentModal, openTransactionModal, profile, catalog, businessId } = useDashboard()
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [reportPeriod, setReportPeriod] = useState<ReportPeriodKey>('month')
  const [lastPdfName, setLastPdfName] = useState<string | null>(null)

  async function generateFinancialPdf(period: ReportPeriodKey = reportPeriod) {
    setLoading(true)
    setError(null)
    setAnswer(null)
    setLastPdfName(null)
    try {
      if (!businessId) {
        throw new Error('Belum ada usaha aktif. Buat/ pilih usaha dulu di dashboard.')
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-business-id': businessId,
      }
      const response = await fetch('/api/reports/financial', {
        method: 'POST',
        headers,
        body: JSON.stringify({ period, ai: true, businessId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Gagal membuat laporan.')

      // Guard multi-tenant: PDF harus milik usaha yang sedang aktif
      const reportBrand = String(payload.report?.business?.brand || payload.brand || '')
      const reportBizId = String(payload.report?.businessId || payload.businessId || '')
      if (reportBizId && reportBizId !== businessId) {
        throw new Error('Laporan tidak cocok dengan usaha aktif. Muat ulang halaman lalu coba lagi.')
      }
      if (
        profile?.brand &&
        reportBrand &&
        reportBrand.trim().toLowerCase() !== profile.brand.trim().toLowerCase()
      ) {
        throw new Error(
          `Laporan untuk "${reportBrand}" ditolak — usaha aktif Anda "${profile.brand}".`,
        )
      }

      const filename = await downloadFinancialPdf(payload.report, payload.narrative || '')
      setLastPdfName(filename)
      const s = payload.report.summary
      setAnswer(
        [
          `Laporan PDF untuk ${reportBrand || profile?.brand || 'usaha Anda'} siap: ${filename}`,
          '',
          `Usaha: ${reportBrand} · Periode: ${payload.report.periodLabel}`,
          `Produk di katalog: ${payload.tenant?.productCount ?? '—'} · Transaksi total DB: ${payload.tenant?.transactionCount ?? '—'}`,
          `Omzet ${formatShort(s.omzet)} · Modal/HPP ${formatShort(s.modalHpp)} · Laba kotor ${formatShort(s.labaKotor)} (${s.marginPercent}%)`,
          '',
          payload.narrative || '',
        ].join('\n'),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal membuat laporan PDF.')
    } finally {
      setLoading(false)
    }
  }

  function handleAction(action?: QuickAction['action']) {
    if (action === 'content') openContentModal()
    else if (action === 'transaction') openTransactionModal()
    else if (action === 'summary') onNavigate('Ringkasan')
    else if (action === 'history') onNavigate('Riwayat')
    else if (action === 'report-pdf') void generateFinancialPdf(reportPeriod)
  }

  async function submitCommand() {
    const command = query.trim().toLowerCase()
    if (!command) return
    setError(null)
    setAnswer(null)
    const original = query.trim()

    if (wantsPdfReport(command)) {
      setQuery('')
      await generateFinancialPdf(periodFromCommand(command))
      return
    }

    const isPriceOrStock =
      command.includes('harga') ||
      command.includes('stok') ||
      command.includes('stock') ||
      command.includes('berapa') ||
      command.includes('ready')
    if (!isPriceOrStock && (command.includes('konten') || command.includes('caption'))) {
      openContentModal()
      setQuery('')
      return
    }
    if (
      !isPriceOrStock &&
      (command.includes('catat transaksi') || command.startsWith('jual '))
    ) {
      openTransactionModal()
      setQuery('')
      return
    }
    if (!isPriceOrStock && (command.includes('riwayat') || command === 'cari')) {
      onNavigate('Riwayat')
      setQuery('')
      return
    }

    setLoading(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (businessId) headers['x-business-id'] = businessId
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers,
        body: JSON.stringify({ task: 'assistant', message: original }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'AI gagal menjawab.')
      setAnswer(payload.text)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AI gagal menjawab.')
    } finally {
      setLoading(false)
    }
    setQuery('')
  }

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-accent/20 bg-secondary/40 p-3.5 sm:gap-4 sm:p-5">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Hai, {profile?.owner ?? 'Pemilik'} 👋
          {catalog.length > 0 && (
            <span className="mt-0.5 block text-[11px] text-muted-foreground/80 text-break-safe">
              {profile?.brand ? `${profile.brand} · ` : ''}
              {catalog.length} produk · stok total{' '}
              {catalog.reduce((s, p) => s + p.stock, 0)} unit
            </span>
          )}
        </p>
        <h2 className="mt-1 font-display text-lg font-bold tracking-tight text-balance sm:text-xl">
          Ada yang bisa dibantu?
        </h2>
      </div>

      {/* Periode laporan PDF */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span className="w-full text-center text-[11px] font-medium text-muted-foreground sm:w-auto">
          Periode laporan:
        </span>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setReportPeriod(p.key)}
            aria-pressed={reportPeriod === p.key}
            className={`min-h-8 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              reportPeriod === p.key
                ? 'bg-accent text-accent-foreground'
                : 'border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <Stagger className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:gap-2.5" staggerChildren={0.08}>
        {ACTIONS.map((action) => (
          <StaggerItem key={action.label}>
            <button
              type="button"
              disabled={loading && action.action === 'report-pdf'}
              onClick={() => handleAction(action.action)}
              className="flex h-full w-full min-h-11 flex-col gap-2 rounded-xl border border-border bg-background/60 p-3 text-left transition-colors hover:border-accent/40 hover:bg-background disabled:opacity-60 sm:gap-2.5 sm:p-3.5"
            >
              <span
                className="flex size-8 items-center justify-center rounded-lg bg-accent/15 text-accent"
                aria-hidden="true"
              >
                <action.icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold leading-snug text-pretty">
                  {action.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {action.feature}
                </span>
              </span>
            </button>
          </StaggerItem>
        ))}
      </Stagger>

      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault()
          void submitCommand()
        }}
        aria-label="Kirim perintah ke asisten AI"
      >
        <label htmlFor="assistant-input" className="sr-only">
          Ketik kebutuhanmu
        </label>
        <input
          id="assistant-input"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Contoh: buat laporan pdf omzet & modal bulan ini"
          className="h-11 w-full rounded-full border border-input bg-background/60 pl-4 pr-11 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        <button
          type="submit"
          aria-label="Kirim perintah"
          disabled={!query.trim() || loading}
          className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-accent-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="size-3.5" aria-hidden="true" />
        </button>
      </form>
      {(loading || answer || error) && (
        <div
          className="rounded-xl border border-accent/20 bg-background/50 p-3 text-sm leading-relaxed whitespace-pre-wrap"
          aria-live="polite"
        >
          {loading && (
            <p className="text-muted-foreground">
              AI menyusun laporan omzet & modal...
            </p>
          )}
          {answer && <p>{answer}</p>}
          {lastPdfName && (
            <p className="mt-2 text-xs font-medium text-accent">
              File: {lastPdfName} (cek folder Unduhan browser)
            </p>
          )}
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  )
}

function formatShort(n: number) {
  return `Rp${Math.round(n).toLocaleString('id-ID')}`
}
