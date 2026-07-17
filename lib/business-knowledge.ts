/**
 * Knowledge / RAG builder — data selalu dari snapshot DB (bukan hardcode).
 */

import { formatRupiahPlain } from '@/lib/catalog-utils'
import type { BusinessDatabase, BusinessProfile, CatalogProduct } from '@/lib/types'

export type KnowledgeChunk = {
  id: string
  title: string
  content: string
  keywords: string[]
}

function productChunk(product: CatalogProduct): KnowledgeChunk {
  const status =
    product.stock <= 0 ? 'HABIS' : product.stock <= product.lowStockAt ? 'STOK MENIPIS' : 'TERSEDIA'
  return {
    id: `product-${product.id}`,
    title: product.name,
    content: [
      `Produk: ${product.name}`,
      `Nama pendek: ${product.shortName}`,
      `SKU: ${product.sku}`,
      `Varian/ukuran: ${product.variant}`,
      `Harga satuan resmi: ${formatRupiahPlain(product.unitPrice)} (${product.unitPrice} rupiah)`,
      `Stok saat ini: ${product.stock} unit (${status})`,
      `Ambang stok menipis: ≤ ${product.lowStockAt} unit`,
      `Rating: ${product.rating}/5`,
      `Unit terjual (akumulasi saat transaksi final): ${product.sold}`,
      `Deskripsi: ${product.description}`,
      `Gambar: ${product.image}`,
    ].join('\n'),
    keywords: [
      ...product.keywords,
      product.name.toLowerCase(),
      product.shortName.toLowerCase(),
      product.variant.toLowerCase(),
      product.sku.toLowerCase(),
      'harga',
      'stok',
      'produk',
    ],
  }
}

export function getAllKnowledgeChunks(db: BusinessDatabase): KnowledgeChunk[] {
  const { profile, catalog } = db
  const ownerKey = profile.owner.toLowerCase()
  const cityKey = profile.city.toLowerCase()

  const profileChunk: KnowledgeChunk = {
    id: 'business-profile',
    title: `Profil Usaha ${profile.brand}`,
    content: [
      `Brand: ${profile.brand}`,
      `Pemilik: ${profile.owner}`,
      `Lokasi: ${profile.city}, ${profile.region}, ${profile.country}`,
      `Alamat: ${profile.address}`,
      `Kategori: ${profile.category}`,
      `Kontak: ${profile.email} · ${profile.phone}`,
      `Channel jual: ${profile.platforms.join(', ')}`,
      `Mata uang: ${profile.currency}`,
      `Zona waktu: ${profile.timezone}`,
      `Platform software: ${profile.appName} — ${profile.tagline}`,
      `Data diperbarui: ${db.updatedAt}`,
      'Peran AI: bantu pemilik UMKM catat transaksi, buat caption, cek harga/stok, saran operasional.',
    ].join('\n'),
    keywords: [
      ownerKey,
      cityKey,
      profile.brand.toLowerCase(),
      'usaha',
      'toko',
      'profil',
      'kontak',
      'alamat',
      'pemilik',
      'brand',
      'umkm',
      'umkman',
      'bisnis',
      'client',
    ],
  }

  const priceList: KnowledgeChunk = {
    id: 'price-list',
    title: 'Daftar Harga Resmi (live dari database)',
    content: [
      `Daftar harga satuan resmi ${profile.brand} — sumber: database toko:`,
      ...catalog.map(
        (p) =>
          `- ${p.name}: ${formatRupiahPlain(p.unitPrice)} | stok ${p.stock} unit | rating ${p.rating}`,
      ),
      'Jawab harga HANYA dari daftar ini. Total = harga_satuan × jumlah.',
    ].join('\n'),
    keywords: ['harga', 'price', 'berapa', 'rp', 'rupiah', 'tarif', 'biaya', 'katalog', 'pricelist'],
  }

  const stock: KnowledgeChunk = {
    id: 'stock-overview',
    title: 'Ringkasan Stok (live)',
    content: [
      `Stok gudang ${profile.brand} (live database, unit generik):`,
      ...catalog.map((p) => {
        const flag = p.stock <= p.lowStockAt ? '⚠ menipis' : '✓ aman'
        return `- ${p.shortName}: ${p.stock} unit ${flag}`
      }),
      `Total unit stok: ${catalog.reduce((s, p) => s + p.stock, 0)}`,
      'Restock prioritaskan SKU menipis + penjualan tinggi.',
    ].join('\n'),
    keywords: ['stok', 'stock', 'inventory', 'habis', 'menipis', 'restock', 'gudang', 'tersedia', 'ready'],
  }

  const ops: KnowledgeChunk = {
    id: 'app-ops',
    title: `Cara pakai ${profile.appName}`,
    content: [
      `Fitur utama ${profile.appName} untuk ${profile.owner}:`,
      '1) Generator konten: upload foto → caption multi-platform.',
      '2) Catat transaksi: ketik detail jualan → AI parse → stok berkurang otomatis.',
      '3) Dashboard: omzet, riwayat, prioritas.',
      '4) Asisten AI: tanya harga/stok dari database live.',
      'Status transaksi: Tersimpan | Perlu Verifikasi. Konten: Draft | Terposting.',
    ].join('\n'),
    keywords: [
      'cara',
      'pakai',
      'fitur',
      'caption',
      'konten',
      'transaksi',
      'dashboard',
      'riwayat',
      'bantuan',
      'help',
      'umkman',
    ],
  }

  const safety: KnowledgeChunk = {
    id: 'safety-policy',
    title: 'Kebijakan jawaban AI',
    content: [
      'Jangan klaim medis berlebihan di luar deskripsi resmi produk.',
      'Jangan mengarang diskon/stok/harga di luar database.',
      'Jika data tidak ada: bilang belum tercatat di sistem.',
      'Bahasa Indonesia, singkat, praktis. Format uang Rupiah.',
    ].join('\n'),
    keywords: ['jangan', 'klaim', 'aturan', 'kebijakan', 'aman', 'medis'],
  }

  return [profileChunk, priceList, stock, ops, safety, ...catalog.map(productChunk)]
}

export function retrieveKnowledge(db: BusinessDatabase, query: string, topK = 5): KnowledgeChunk[] {
  const q = query.toLowerCase()
  const tokens = q.split(/[^a-z0-9à-ÿ]+/i).filter((t) => t.length > 1)
  const chunks = getAllKnowledgeChunks(db)

  const scored = chunks.map((chunk) => {
    let score = 0
    const hay = `${chunk.title} ${chunk.content} ${chunk.keywords.join(' ')}`.toLowerCase()
    for (const token of tokens) {
      if (hay.includes(token)) score += 2
    }
    for (const kw of chunk.keywords) {
      if (q.includes(kw)) score += 3
    }
    if (chunk.id === 'price-list' || chunk.id === 'stock-overview') score += 0.5
    if (chunk.id === 'business-profile') score += 0.25
    return { chunk, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const top = scored.filter((s) => s.score > 0).slice(0, topK).map((s) => s.chunk)
  if (top.length === 0) {
    return chunks.filter((c) => ['business-profile', 'price-list', 'stock-overview'].includes(c.id))
  }
  return top
}

export function buildRetrievedContext(db: BusinessDatabase, query: string, topK = 5): string {
  return retrieveKnowledge(db, query, topK)
    .map((c, i) => `### [${i + 1}] ${c.title}\n${c.content}`)
    .join('\n\n')
}

export function buildFullCatalogContext(db: BusinessDatabase): string {
  const { profile, catalog } = db
  return [
    `Usaha: ${profile.brand} · Pemilik ${profile.owner} · ${profile.city}`,
    `Update DB: ${db.updatedAt}`,
    'Katalog & harga resmi (live):',
    ...catalog.map(
      (p) =>
        `- id=${p.id} | ${p.name} | harga ${p.unitPrice} | stok ${p.stock} | SKU ${p.sku} | ${p.description}`,
    ),
  ].join('\n')
}

export function profileSummary(profile: BusinessProfile) {
  return profile
}
