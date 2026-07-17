/**
 * Laporan keuangan UMKM: omzet, estimasi modal (HPP), laba, stok.
 * Sumber: transaksi + katalog live (multi-tenant).
 */

import type { BusinessProfile, CatalogProduct, TransactionItem } from '@/lib/types'

const DAY_MS = 86_400_000

/** Estimasi HPP bila produk belum punya costPrice (default 65% harga jual). */
export const DEFAULT_COST_RATIO = 0.65

export type ReportPeriodKey = '7d' | '30d' | 'month' | 'all'

export type FinancialReportInput = {
  /** Wajib — isolasi multi-tenant */
  businessId: string
  profile: BusinessProfile
  catalog: CatalogProduct[]
  transactions: TransactionItem[]
  period?: ReportPeriodKey
  now?: Date
  /** Override rasio HPP 0–1 */
  costRatio?: number
}

export type ProductReportRow = {
  productId: string
  product: string
  variant: string
  qtySold: number
  omzet: number
  modalHpp: number
  laba: number
  unitPrice: number
  costPerUnit: number
  stock: number
  modalStok: number
}

export type DailyOmzetRow = {
  date: string
  label: string
  omzet: number
  transaksi: number
}

export type FinancialReport = {
  generatedAt: string
  periodKey: ReportPeriodKey
  periodLabel: string
  periodStart: string
  periodEnd: string
  /** ID usaha multi-tenant — laporan HANYA untuk usaha ini */
  businessId: string
  business: {
    brand: string
    owner: string
    city: string
    address: string
    email: string
    phone: string
    category: string
  }
  summary: {
    omzet: number
    modalHpp: number
    labaKotor: number
    marginPercent: number
    transaksiCount: number
    avgTicket: number
    qtySold: number
    modalStok: number
    nilaiStokJual: number
    previousOmzet: number
    omzetGrowthPercent: number | null
  }
  byProduct: ProductReportRow[]
  daily: DailyOmzetRow[]
  recentTransactions: {
    date: string
    time: string
    product: string
    qty: number
    total: number
    status: string
  }[]
  methodology: string[]
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function dayKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function resolvePeriod(period: ReportPeriodKey, now: Date) {
  const end = now
  if (period === 'all') {
    return {
      start: new Date(0),
      end,
      label: 'Semua waktu',
      previousStart: new Date(0),
      previousEnd: new Date(0),
    }
  }
  if (period === 'month') {
    const start = startOfMonth(now)
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return {
      start,
      end,
      label: now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      previousStart: prevStart,
      previousEnd: start,
    }
  }
  const days = period === '7d' ? 7 : 30
  const start = new Date(startOfDay(now).getTime() - (days - 1) * DAY_MS)
  const prevEnd = start
  const prevStart = new Date(prevEnd.getTime() - days * DAY_MS)
  return {
    start,
    end,
    label: period === '7d' ? '7 hari terakhir' : '30 hari terakhir',
    previousStart: prevStart,
    previousEnd: prevEnd,
  }
}

function inRange(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t <= end.getTime()
}

/** Harga modal per unit: costPrice eksplisit, atau estimasi rasio. */
export function unitCost(
  product: CatalogProduct | undefined,
  unitPrice: number,
  costRatio = DEFAULT_COST_RATIO,
) {
  const explicit = (product as CatalogProduct & { costPrice?: number })?.costPrice
  if (typeof explicit === 'number' && explicit >= 0) return explicit
  return Math.round(unitPrice * costRatio)
}

export function buildFinancialReport(input: FinancialReportInput): FinancialReport {
  const businessId = (input.businessId || '').trim()
  if (!businessId) {
    throw new Error('businessId wajib untuk laporan multi-tenant.')
  }
  const now = input.now ?? new Date()
  const periodKey = input.period ?? 'month'
  const costRatio = input.costRatio ?? DEFAULT_COST_RATIO
  const { start, end, label, previousStart, previousEnd } = resolvePeriod(periodKey, now)

  const catalogById = new Map(input.catalog.map((p) => [p.id, p]))
  const catalogByName = new Map(input.catalog.map((p) => [p.name.toLowerCase(), p]))

  // Hanya transaksi final — pending verifikasi tidak masuk omzet/HPP
  const confirmed = input.transactions.filter((t) => t.status === 'Tersimpan')
  const periodTx = confirmed.filter((t) => inRange(t.createdAt, start, end))
  const previousTx =
    periodKey === 'all' ? [] : confirmed.filter((t) => inRange(t.createdAt, previousStart, previousEnd))

  const productMap = new Map<string, ProductReportRow>()

  function ensureProduct(tx: TransactionItem): ProductReportRow {
    const key = tx.productId || tx.product
    let row = productMap.get(key)
    if (row) return row
    const product =
      catalogById.get(tx.productId) ||
      catalogByName.get(tx.product.toLowerCase()) ||
      input.catalog.find((p) => p.name === tx.product)
    const unitPrice = tx.unitPrice || product?.unitPrice || 0
    const cost = unitCost(product, unitPrice, costRatio)
    const stock = product?.stock ?? 0
    row = {
      productId: product?.id || tx.productId || key,
      product: product?.name || tx.product,
      variant: product?.variant || tx.variant || '—',
      qtySold: 0,
      omzet: 0,
      modalHpp: 0,
      laba: 0,
      unitPrice,
      costPerUnit: cost,
      stock,
      modalStok: stock * cost,
    }
    productMap.set(key, row)
    return row
  }

  for (const tx of periodTx) {
    const row = ensureProduct(tx)
    row.qtySold += tx.qty
    row.omzet += tx.total
    row.modalHpp += tx.qty * row.costPerUnit
    row.laba = row.omzet - row.modalHpp
  }

  // Produk dengan stok tapi belum terjual di periode — tetap tampil di modal stok
  for (const product of input.catalog) {
    const exists = Array.from(productMap.values()).some((r) => r.productId === product.id)
    if (exists) continue
    const cost = unitCost(product, product.unitPrice, costRatio)
    productMap.set(product.id, {
      productId: product.id,
      product: product.name,
      variant: product.variant,
      qtySold: 0,
      omzet: 0,
      modalHpp: 0,
      laba: 0,
      unitPrice: product.unitPrice,
      costPerUnit: cost,
      stock: product.stock,
      modalStok: product.stock * cost,
    })
  }

  const byProduct = Array.from(productMap.values()).sort((a, b) => b.omzet - a.omzet)

  const omzet = periodTx.reduce((s, t) => s + t.total, 0)
  const modalHpp = byProduct.reduce((s, r) => s + r.modalHpp, 0)
  const labaKotor = omzet - modalHpp
  const qtySold = periodTx.reduce((s, t) => s + t.qty, 0)
  const previousOmzet = previousTx.reduce((s, t) => s + t.total, 0)
  const modalStok = byProduct.reduce((s, r) => s + r.modalStok, 0)
  const nilaiStokJual = byProduct.reduce((s, r) => s + r.stock * r.unitPrice, 0)

  // Daily series (max 62 points for readability)
  const dailyMap = new Map<string, DailyOmzetRow>()
  if (periodKey !== 'all' || periodTx.length < 200) {
    for (const tx of periodTx) {
      const d = startOfDay(new Date(tx.createdAt))
      const key = dayKey(d)
      const row = dailyMap.get(key) || {
        date: key,
        label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        omzet: 0,
        transaksi: 0,
      }
      row.omzet += tx.total
      row.transaksi += 1
      dailyMap.set(key, row)
    }
  }
  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  const recentTransactions = [...periodTx]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 40)
    .map((t) => ({
      date: t.date,
      time: t.time,
      product: t.product,
      qty: t.qty,
      total: t.total,
      status: t.status,
    }))

  return {
    generatedAt: now.toISOString(),
    periodKey,
    periodLabel: label,
    periodStart: start.getTime() === 0 ? '—' : dayKey(startOfDay(start)),
    periodEnd: dayKey(startOfDay(end)),
    businessId,
    business: {
      brand: input.profile.brand || 'Usaha',
      owner: input.profile.owner || 'Pemilik',
      city: input.profile.city || '',
      address: input.profile.address || '',
      email: input.profile.email || '',
      phone: input.profile.phone || '',
      category: input.profile.category || 'UMKM',
    },
    summary: {
      omzet,
      modalHpp,
      labaKotor,
      marginPercent: omzet > 0 ? Math.round((labaKotor / omzet) * 1000) / 10 : 0,
      transaksiCount: periodTx.length,
      avgTicket: periodTx.length ? Math.round(omzet / periodTx.length) : 0,
      qtySold,
      modalStok,
      nilaiStokJual,
      previousOmzet,
      omzetGrowthPercent:
        previousOmzet > 0 ? Math.round(((omzet - previousOmzet) / previousOmzet) * 1000) / 10 : null,
    },
    byProduct,
    daily,
    recentTransactions,
    methodology: [
      'Omzet = total transaksi berstatus Tersimpan (bukan Perlu Verifikasi).',
      `Modal/HPP = ESTIMASI: qty terjual × ${Math.round(costRatio * 100)}% harga jual (bukan HPP akuntansi resmi).`,
      'Laba kotor = Omzet − Modal/HPP (belum ongkir, iklan, sewa, gaji).',
      'Modal stok = stok gudang × estimasi modal per unit.',
      'Sumber: database live usaha Anda di UMKMan saja (multi-tenant).',
    ],
  }
}

export function formatRp(n: number) {
  return `Rp${Math.round(n).toLocaleString('id-ID')}`
}

/** System prompt khusus laporan — tidak memuat katalog seed / merek lain. */
export function getReportSystemInstruction(report: FinancialReport): string {
  const allowedProducts = report.byProduct.map((p) => p.product).filter(Boolean)
  return `Kamu analis laporan keuangan untuk SATU usaha multi-tenant di platform UMKMan.

## Usaha yang dilayani (SATU-SATUNYA)
- Brand: ${report.business.brand}
- Pemilik: ${report.business.owner}
- Lokasi: ${report.business.city}
- Kategori: ${report.business.category}
- businessId: ${report.businessId}

## Aturan anti-kebocoran (WAJIB)
1. Hanya tulis tentang usaha "${report.business.brand}" dan produk di daftar data laporan.
2. JANGAN menyebut merek, SKU, atau contoh usaha lain (termasuk NUSACID, pembersih kerak, atau brand seed demo) kecuali nama itu PERSIS muncul di data laporan di bawah.
3. JANGAN mengisi laporan kosong dengan contoh fiktif produk/merek.
4. Jika omzet 0 / katalog kosong: bilang data belum ada untuk usaha ini, jangan ganti ke usaha lain.
5. Angka harus sama persis dengan data yang diberikan.
6. Bahasa Indonesia, netral, profesional.

Produk yang boleh disebut (dari DB usaha ini saja):
${allowedProducts.length ? allowedProducts.map((n) => `• ${n}`).join('\n') : '• (belum ada produk di katalog / penjualan)'}
`
}

export function buildReportNarrativePrompt(report: FinancialReport) {
  const s = report.summary
  const top = report.byProduct.filter((p) => p.omzet > 0).slice(0, 5)
  const stockOnly = report.byProduct.filter((p) => p.omzet === 0 && p.stock > 0).slice(0, 5)
  return `Buat narasi laporan keuangan UMKM singkat untuk PDF (Bahasa Indonesia).

## Usaha (wajib jadi subjek tunggal)
${report.business.brand} · pemilik ${report.business.owner} · ${report.business.city}
businessId=${report.businessId}
Periode: ${report.periodLabel} (${report.periodStart} s/d ${report.periodEnd})

## Angka (WAJIB akurat, jangan diubah)
- Omzet: ${formatRp(s.omzet)}
- Modal/HPP: ${formatRp(s.modalHpp)}
- Laba kotor: ${formatRp(s.labaKotor)} (${s.marginPercent}%)
- Transaksi: ${s.transaksiCount} · Rata-rata tiket: ${formatRp(s.avgTicket)}
- Qty terjual: ${s.qtySold}
- Modal mengendap di stok: ${formatRp(s.modalStok)}
- Omzet periode sebelumnya: ${formatRp(s.previousOmzet)}${
    s.omzetGrowthPercent !== null ? ` · pertumbuhan ${s.omzetGrowthPercent}%` : ''
  }

## Produk dengan penjualan di periode ini
${top.map((p) => `- ${p.product}: omzet ${formatRp(p.omzet)}, laba ${formatRp(p.laba)}, qty ${p.qtySold}`).join('\n') || '(belum ada penjualan tercatat)'}

## Produk berstok tanpa penjualan periode ini (opsional sebut)
${stockOnly.map((p) => `- ${p.product}: stok ${p.stock}, modal stok ${formatRp(p.modalStok)}`).join('\n') || '(tidak ada / tidak perlu)'}

## Format output (teks polos, tanpa markdown heading #)
1) Ringkasan eksekutif (3–5 kalimat) — sebut nama usaha "${report.business.brand}"
2) Sorotan omzet & modal (2–4 bullet pakai • )
3) Rekomendasi aksi (3 bullet konkret untuk ${report.business.owner || 'pemilik'})

## Larangan
- Jangan sebut NUSACID / merek lain yang tidak ada di data di atas.
- Jangan mengarang produk, diskon, atau angka baru.
- Jangan memakai contoh generik dari usaha demo.`
}

/** Buang sebutan merek asing dari narasi AI jika lolos (jaring pengaman). */
export function sanitizeReportNarrative(narrative: string, report: FinancialReport): string {
  let text = (narrative || '').trim()
  if (!text) return text

  const brand = (report.business.brand || '').trim()
  const allowed = new Set(
    [
      brand.toLowerCase(),
      ...report.byProduct.map((p) => p.product.toLowerCase()),
      ...report.byProduct.map((p) => p.product.split(/\s+/)[0]?.toLowerCase() || ''),
      report.business.owner?.toLowerCase() || '',
      report.business.city?.toLowerCase() || '',
    ].filter((x) => x.length >= 3),
  )

  // Merek demo/seed yang sering bocor dari model — hapus kalimat yang menyebutnya
  // kecuali brand usaha client memang sama.
  const blockedBrands = ['nusacid', 'nusa acid']
  for (const blocked of blockedBrands) {
    if (allowed.has(blocked)) continue
    if (!text.toLowerCase().includes(blocked)) continue
    text = text
      .split(/(?<=[.!?])\s+|\n+/)
      .filter((sentence) => !sentence.toLowerCase().includes(blocked))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    if (!text) {
      text = `Laporan ${brand || 'usaha ini'} disusun dari data transaksi dan katalog milik akun Anda saja. Tidak ada data usaha lain yang dimasukkan.`
    }
  }
  return text
}
