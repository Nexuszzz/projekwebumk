/**
 * Generate PDF laporan omzet & modal di browser (jspdf).
 * Dipakai dari dashboard AI / tombol unduh laporan.
 */

import type { FinancialReport } from '@/lib/financial-report'
import { formatRp } from '@/lib/financial-report'

function money(n: number) {
  return formatRp(n)
}

function wrapLines(doc: import('jspdf').jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[]
}

function ensureSpace(doc: import('jspdf').jsPDF, y: number, need: number, margin = 16) {
  const pageH = doc.internal.pageSize.getHeight()
  if (y + need > pageH - margin) {
    doc.addPage()
    return margin + 4
  }
  return y
}

export async function downloadFinancialPdf(report: FinancialReport, narrative: string) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 16
  const contentW = pageW - margin * 2
  let y = margin

  // Header
  doc.setFillColor(35, 55, 20)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Laporan Omzet & Modal', margin, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`${report.business.brand} · ${report.periodLabel}`, margin, 20)
  doc.text(
    new Date(report.generatedAt).toLocaleString('id-ID'),
    pageW - margin,
    20,
    { align: 'right' },
  )

  y = 36
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(report.business.brand, margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(70, 70, 70)
  const meta = [
    `Pemilik: ${report.business.owner}`,
    `Lokasi: ${report.business.city}${report.business.address ? ` · ${report.business.address}` : ''}`,
    `Kontak: ${report.business.phone || '—'} · ${report.business.email || '—'}`,
    `Periode: ${report.periodStart} s/d ${report.periodEnd} (${report.periodLabel})`,
    `Bidang: ${report.business.category || 'UMKM'}`,
  ]
  for (const line of meta) {
    doc.text(line, margin, y)
    y += 4.5
  }

  // Summary boxes
  y += 4
  y = ensureSpace(doc, y, 32)
  const s = report.summary
  const cards: { label: string; value: string }[] = [
    { label: 'Omzet', value: money(s.omzet) },
    { label: 'Modal / HPP', value: money(s.modalHpp) },
    { label: 'Laba Kotor', value: money(s.labaKotor) },
    { label: 'Margin', value: `${s.marginPercent}%` },
  ]
  const cardW = contentW / 4 - 2
  cards.forEach((card, i) => {
    const x = margin + i * (cardW + 2.5)
    doc.setFillColor(i === 2 ? 230 : 245, i === 2 ? 245 : 245, i === 2 ? 230 : 240)
    doc.roundedRect(x, y, cardW, 18, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setTextColor(90, 90, 90)
    doc.text(card.label, x + 2.5, y + 6)
    doc.setFontSize(9)
    doc.setTextColor(20, 20, 20)
    doc.setFont('helvetica', 'bold')
    const valueLines = wrapLines(doc, card.value, cardW - 4)
    doc.text(valueLines[0] || card.value, x + 2.5, y + 13)
    doc.setFont('helvetica', 'normal')
  })
  y += 24

  // Extra KPIs
  doc.setFontSize(9)
  doc.setTextColor(50, 50, 50)
  const kpis = [
    `Transaksi: ${s.transaksiCount} · Rata-rata tiket: ${money(s.avgTicket)} · Qty terjual: ${s.qtySold}`,
    `Modal di stok: ${money(s.modalStok)} · Nilai jual stok: ${money(s.nilaiStokJual)}`,
    s.omzetGrowthPercent === null
      ? 'Pertumbuhan omzet: belum ada pembanding periode sebelumnya'
      : `Pertumbuhan omzet vs periode sebelumnya: ${s.omzetGrowthPercent}% (sebelumnya ${money(s.previousOmzet)})`,
  ]
  for (const line of kpis) {
    y = ensureSpace(doc, y, 6)
    doc.text(line, margin, y)
    y += 5
  }

  // AI narrative
  y += 4
  y = ensureSpace(doc, y, 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(35, 55, 20)
  doc.text('Analisis AI', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(40, 40, 40)
  for (const para of narrative.split(/\n+/)) {
    if (!para.trim()) {
      y += 2
      continue
    }
    const lines = wrapLines(doc, para.trim(), contentW)
    for (const line of lines) {
      y = ensureSpace(doc, y, 5)
      doc.text(line, margin, y)
      y += 4.4
    }
    y += 1.5
  }

  // Product table
  y += 4
  y = ensureSpace(doc, y, 16)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(35, 55, 20)
  doc.text('Rincian per Produk', margin, y)
  y += 6

  const col = {
    name: margin,
    qty: margin + 72,
    omzet: margin + 90,
    modal: margin + 118,
    laba: margin + 148,
  }

  function drawTableHeader() {
    doc.setFillColor(240, 244, 232)
    doc.rect(margin, y - 4, contentW, 7, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 40)
    doc.text('Produk', col.name, y)
    doc.text('Qty', col.qty, y)
    doc.text('Omzet', col.omzet, y)
    doc.text('Modal', col.modal, y)
    doc.text('Laba', col.laba, y)
    y += 6
    doc.setFont('helvetica', 'normal')
  }

  drawTableHeader()
  const productRows = report.byProduct.filter((p) => p.omzet > 0 || p.stock > 0).slice(0, 25)
  for (const row of productRows) {
    y = ensureSpace(doc, y, 8)
    if (y < margin + 10) drawTableHeader()
    doc.setFontSize(7.5)
    doc.setTextColor(30, 30, 30)
    const name = row.product.length > 36 ? `${row.product.slice(0, 34)}…` : row.product
    doc.text(name, col.name, y)
    doc.text(String(row.qtySold), col.qty, y)
    doc.text(money(row.omzet), col.omzet, y)
    doc.text(money(row.modalHpp), col.modal, y)
    doc.text(money(row.laba), col.laba, y)
    y += 4.8
    doc.setTextColor(110, 110, 110)
    doc.setFontSize(6.5)
    doc.text(
      `stok ${row.stock} · modal stok ${money(row.modalStok)} · hpp/unit ${money(row.costPerUnit)}`,
      col.name,
      y,
    )
    y += 5
    doc.setTextColor(30, 30, 30)
  }

  // Daily omzet (if any)
  if (report.daily.length > 0) {
    y += 3
    y = ensureSpace(doc, y, 16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(35, 55, 20)
    doc.text('Omzet Harian', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(40, 40, 40)
    for (const day of report.daily.slice(-31)) {
      y = ensureSpace(doc, y, 5)
      doc.text(
        `${day.label}  ·  ${day.transaksi} trx  ·  ${money(day.omzet)}`,
        margin,
        y,
      )
      y += 4.5
    }
  }

  // Recent transactions
  if (report.recentTransactions.length > 0) {
    y += 4
    y = ensureSpace(doc, y, 16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(35, 55, 20)
    doc.text('Transaksi Terbaru', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(40, 40, 40)
    for (const tx of report.recentTransactions.slice(0, 20)) {
      y = ensureSpace(doc, y, 5)
      const line = `${tx.date} ${tx.time} · ${tx.product} ×${tx.qty} · ${money(tx.total)} · ${tx.status}`
      const lines = wrapLines(doc, line, contentW)
      for (const l of lines) {
        y = ensureSpace(doc, y, 4.2)
        doc.text(l, margin, y)
        y += 4
      }
    }
  }

  // Methodology
  y += 5
  y = ensureSpace(doc, y, 24)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(35, 55, 20)
  doc.text('Catatan Metodologi', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(80, 80, 80)
  for (const note of report.methodology) {
    const lines = wrapLines(doc, `• ${note}`, contentW)
    for (const line of lines) {
      y = ensureSpace(doc, y, 4)
      doc.text(line, margin, y)
      y += 3.8
    }
  }

  y += 6
  y = ensureSpace(doc, y, 14)
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  const footLines = wrapLines(
    doc,
    `Dibuat otomatis oleh UMKMan untuk ${report.business.brand} (ID usaha: ${report.businessId}). Data hanya dari akun & katalog usaha ini — bukan usaha lain. Laporan internal UMKM · Bukan dokumen pajak resmi.`,
    contentW,
  )
  for (const line of footLines) {
    y = ensureSpace(doc, y, 4)
    doc.text(line, margin, y)
    y += 3.6
  }

  // Empty-state page note if no sales
  if (report.summary.transaksiCount === 0) {
    y += 4
    y = ensureSpace(doc, y, 12)
    doc.setFontSize(8)
    doc.setTextColor(90, 90, 90)
    const empty = wrapLines(
      doc,
      `Belum ada transaksi pada periode ini untuk ${report.business.brand}. Omzet/modal penjualan = 0. Isi katalog & catat transaksi agar laporan terisi — tanpa menampilkan data usaha lain.`,
      contentW,
    )
    for (const line of empty) {
      doc.text(line, margin, y)
      y += 4
    }
  }

  const safeBrand = (report.business.brand || 'usaha')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'usaha'
  const filename = `laporan-omzet-modal-${safeBrand}-${report.periodEnd}.pdf`
  doc.save(filename)
  return filename
}
