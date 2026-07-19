/**
 * Laporan keuangan omzet + modal + laba (JSON + narasi AI opsional).
 * Multi-tenant: HANYA data usaha milik user + businessId aktif.
 */
import {
  buildFinancialReport,
  buildReportNarrativePrompt,
  getReportSystemInstruction,
  sanitizeReportNarrative,
  type ReportPeriodKey,
} from '@/lib/financial-report'
import { envTrim, getSessionUser, unauthorized } from '@/lib/server/auth'
import { getSnapshot } from '@/lib/server/db'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const PERIODS = new Set<ReportPeriodKey>(['7d', '30d', 'month', 'all'])

function jsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status })
}

async function generateNarrative(report: ReturnType<typeof buildFinancialReport>) {
  const key = envTrim('GEMINI_API_KEY')
  if (!key || !key.startsWith('AIza')) {
    return sanitizeReportNarrative(buildFallbackNarrative(report), report)
  }

  const model = envTrim('GEMINI_MODEL') || 'gemini-2.5-flash'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`

  try {
    // System prompt HANYA konteks usaha di report — jangan inject katalog seed/global.
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: getReportSystemInstruction(report) }],
        },
        contents: [{ role: 'user', parts: [{ text: buildReportNarrativePrompt(report) }] }],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 1_200,
        },
      }),
      signal: AbortSignal.timeout(25_000),
    })
    const payload = await upstream.json()
    if (!upstream.ok) {
      console.error('Gemini report narrative failed', upstream.status)
      return sanitizeReportNarrative(buildFallbackNarrative(report), report)
    }
    const text = payload?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? '')
      .join('')
      .trim()
    return sanitizeReportNarrative(text || buildFallbackNarrative(report), report)
  } catch (error) {
    console.error('Gemini report narrative error', error)
    return sanitizeReportNarrative(buildFallbackNarrative(report), report)
  }
}

function buildFallbackNarrative(report: ReturnType<typeof buildFinancialReport>) {
  const s = report.summary
  const brand = report.business.brand
  const growth =
    s.omzetGrowthPercent === null
      ? 'Belum ada pembanding periode sebelumnya untuk usaha ini.'
      : `Omzet ${s.omzetGrowthPercent >= 0 ? 'naik' : 'turun'} ${Math.abs(s.omzetGrowthPercent)}% vs periode sebelumnya.`

  const topProduct = report.byProduct.find((p) => p.omzet > 0)?.product

  if (s.transaksiCount === 0 && report.byProduct.every((p) => p.stock === 0)) {
    return [
      `Ringkasan eksekutif: ${brand} belum memiliki transaksi atau stok tercatat pada ${report.periodLabel}. Laporan ini khusus untuk usaha Anda — data usaha lain tidak ditampilkan.`,
      '',
      'Sorotan omzet & modal:',
      '• Omzet 0 · Modal/HPP 0 · Laba 0.',
      '• Mulai catat transaksi dan isi katalog agar laporan terisi otomatis.',
      '',
      'Rekomendasi aksi:',
      '• Tambah produk di Pengaturan → Katalog.',
      '• Catat transaksi penjualan pertama.',
      '• Generate ulang laporan setelah ada data.',
    ].join('\n')
  }

  return [
    `Ringkasan eksekutif: ${brand} mencatat omzet ${format(s.omzet)} pada ${report.periodLabel}, dengan estimasi modal/HPP ${format(s.modalHpp)} dan laba kotor ${format(s.labaKotor)} (margin ${s.marginPercent}%). ${growth}`,
    '',
    'Sorotan omzet & modal:',
    `• ${s.transaksiCount} transaksi · rata-rata ${format(s.avgTicket)} per transaksi · ${s.qtySold} unit terjual.`,
    `• Modal mengendap di stok gudang: ${format(s.modalStok)} (nilai jual stok ~${format(s.nilaiStokJual)}).`,
    `• Produk teratas: ${topProduct || 'belum ada penjualan di periode ini'}.`,
    '',
    'Rekomendasi aksi:',
    `• Dorong produk margin tertinggi ${brand} lewat caption & poster AI minggu ini.`,
    '• Pantau stok menipis agar omzet tidak putus.',
    '• Catat semua transaksi agar laporan omzet & modal makin akurat.',
  ].join('\n')
}

function format(n: number) {
  return `Rp${Math.round(n).toLocaleString('id-ID')}`
}

async function buildOwnedReport(
  userId: string,
  businessId: string | null,
  period: ReportPeriodKey,
  withAi: boolean,
) {
  const db = await getSnapshot(businessId, userId)
  // Snapshot sudah diisolasi per ownerUserId — jangan campur tenant lain.
  const report = buildFinancialReport({
    businessId: db.id,
    profile: db.profile,
    catalog: db.catalog,
    transactions: db.transactions,
    period,
  })

  // Guard: jika client minta businessId tertentu, pastikan cocok
  if (businessId && db.id !== businessId) {
    throw new Error('Usaha tidak cocok dengan akun Anda.')
  }

  const narrative = withAi ? await generateNarrative(report) : sanitizeReportNarrative(buildFallbackNarrative(report), report)

  return {
    report,
    narrative,
    ai: withAi,
    businessId: db.id,
    brand: db.profile.brand,
    /** Transparan multi-tenant */
    tenant: {
      businessId: db.id,
      brand: db.profile.brand,
      owner: db.profile.owner,
      productCount: db.catalog.length,
      transactionCount: db.transactions.length,
    },
  }
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const url = new URL(request.url)
  const periodParam = (url.searchParams.get('period') || 'month') as ReportPeriodKey
  const period = PERIODS.has(periodParam) ? periodParam : 'month'
  const withAi = url.searchParams.get('ai') !== '0'
  const businessId = request.headers.get('x-business-id')

  try {
    const payload = await buildOwnedReport(user.id, businessId, period, withAi)
    return jsonResponse(payload)
  } catch (error) {
    console.error('GET /api/reports/financial', error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Gagal membuat laporan.' },
      400,
    )
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  let body: { period?: ReportPeriodKey; ai?: boolean; businessId?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const period = PERIODS.has(body.period as ReportPeriodKey) ? (body.period as ReportPeriodKey) : 'month'
  const withAi = body.ai !== false
  const businessId = body.businessId || request.headers.get('x-business-id')

  try {
    const payload = await buildOwnedReport(user.id, businessId, period, withAi)
    return jsonResponse(payload)
  } catch (error) {
    console.error('POST /api/reports/financial', error)
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Gagal membuat laporan.' },
      400,
    )
  }
}
