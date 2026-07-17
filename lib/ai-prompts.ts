/**
 * System + task prompts — selalu dari snapshot DB live.
 */

import {
  getAssistantStyleGuide,
  getCaptionStyleGuide,
  normalizeAiPreferences,
  normalizeAiTone,
} from '@/lib/ai-style'
import {
  buildRetrievedContext,
} from '@/lib/business-knowledge'
import { defaultCatalogProduct, formatRupiahPlain } from '@/lib/catalog-utils'
import type { BusinessDatabase, CatalogProduct } from '@/lib/types'

export type AiTask = 'caption' | 'transaction' | 'assistant'

/** System prompt untuk assistant & transaction (terikat katalog toko). */
export function getSystemInstruction(db: BusinessDatabase): string {
  const { profile, catalog } = db
  const ai = normalizeAiPreferences(profile.ai)
  const priceLines = catalog
    .map((p) => `  • ${p.name}: ${formatRupiahPlain(p.unitPrice)} (stok ${p.stock} unit)`)
    .join('\n')
  const fallback = defaultCatalogProduct(catalog)

  return `Kamu adalah asisten AI resmi di platform ${profile.appName} untuk usaha ${profile.brand}.

## Identitas usaha (dari database)
- Brand: ${profile.brand}
- Pemilik: ${profile.owner}
- Lokasi: ${profile.city}, ${profile.region}
- Alamat: ${profile.address}
- Bidang: ${profile.category}
- Kontak: ${profile.email}, ${profile.phone}
- Channel: ${profile.platforms.join(', ')}
- Snapshot DB: ${db.updatedAt}

## Gaya bahasa (dari Setting AI toko — WAJIB dipatuhi)
Tone aktif: ${ai.tone}
${getAssistantStyleGuide(ai.tone)}
${
  ai.autoReply
    ? 'Mode balas komentar otomatis AKTIF: jika pertanyaan cocok untuk jawaban pelanggan (harga, stok, cara order, komplain ringan), sertakan juga draf balasan siap kirim (kutip 2–4 kalimat) yang bisa di-copy ke chat/WA.'
    : 'Mode balas komentar otomatis NONAKTIF: fokus bantu pemilik usaha, tidak perlu draf balasan pelanggan kecuali diminta.'
}

## Harga & stok resmi LIVE (WAJIB — jangan mengarang)
${priceLines || '  (katalog kosong)'}

## Peranmu
1. Bantu ${profile.owner} kelola UMKM lewat ${profile.appName}.
2. Bahasa Indonesia sesuai gaya di atas.
3. Hanya fakta dari system instruction + knowledge yang diberikan.
4. Data tidak ada → bilang belum tercatat, jangan spekulasi.
5. Jangan klaim medis berlebihan.
6. Format uang: Rupiah Indonesia.

## Produk default (hanya untuk parse transaksi jika ambigu)
${
  fallback
    ? `Jika ukuran tidak disebut: ${fallback.name} @ ${formatRupiahPlain(fallback.unitPrice)}`
    : 'Tidak ada produk default.'
}`
}

/**
 * System prompt KHUSUS caption — jangan memaksa brand/katalog toko
 * jika user minta produk lain.
 */
export function getCaptionSystemInstruction(db: BusinessDatabase): string {
  const { profile } = db
  const ai = normalizeAiPreferences(profile.ai)
  return `Kamu copywriter pemasaran UMKM Indonesia di platform ${profile.appName}.

## Aturan mutlak caption
1. Subjek caption = NAMA PRODUK + PROMPT yang diminta user di pesan.
2. JANGAN memaksa menyebut merek/produk katalog toko (mis. brand default) jika user minta barang/produk lain.
3. Jika user minta produk di luar katalog, buatkan caption untuk produk itu apa adanya — jangan diganti ke produk katalog.
4. Katalog toko hanya boleh dipakai sebagai referensi opsional JIKA nama produk user jelas cocok dengan salah satu SKU.
5. Brand toko (${profile.brand}) boleh disebut hanya jika relevan (toko yang menjual), tapi produk utama harus yang diminta user.
6. Bahasa Indonesia sesuai GAYA yang diminta di user prompt (tone toko default: ${ai.tone}), tanpa klaim medis/diskon palsu.
7. Maksimal ~500 karakter per platform.
8. Gaya bahasa yang dipilih user HARUS terasa berbeda nyata antar caption (bukan hanya ganti 1 kata).`
}

function findMatchingCatalogProducts(
  catalog: CatalogProduct[],
  productName: string,
): CatalogProduct[] {
  const q = productName.trim().toLowerCase()
  if (!q || q.length < 2) return []
  return catalog.filter((p) => {
    const name = p.name.toLowerCase()
    const short = p.shortName.toLowerCase()
    const tokens = q.split(/\s+/).filter((t) => t.length > 2)
    if (name.includes(q) || q.includes(name) || short.includes(q) || q.includes(short)) {
      return true
    }
    // Cocok jika mayoritas token nama user ada di nama SKU
    if (tokens.length === 0) return false
    const hit = tokens.filter((t) => name.includes(t) || short.includes(t) || p.keywords.some((k) => k.includes(t)))
    return hit.length >= Math.ceil(tokens.length * 0.6)
  })
}

export function buildCaptionUserPrompt(
  db: BusinessDatabase,
  input: { productName: string; style: string; platforms: string[]; userPrompt?: string },
): string {
  const custom = input.userPrompt?.trim()
  const productName = input.productName?.trim() || ''
  const prefs = normalizeAiPreferences(db.profile.ai)
  const style = normalizeAiTone(input.style || prefs.tone)
  // Cocokkan katalog dari nama produk; jika kosong, coba dari prompt (tanpa memaksa match lemah)
  const matched = findMatchingCatalogProducts(db.catalog, productName)
  const promptMatched =
    matched.length === 0 && custom
      ? findMatchingCatalogProducts(db.catalog, custom.slice(0, 80))
      : []
  const catalogHits = matched.length > 0 ? matched : promptMatched

  // User minta sesuatu spesifik di luar katalog → jangan inject full catalog NUSACID dll.
  const forceOutsideCatalog =
    Boolean(productName || custom) && catalogHits.length === 0

  const catalogBlock =
    catalogHits.length > 0
      ? [
          '## Referensi katalog (OPSIONAL — hanya karena cocok dengan permintaan user)',
          ...catalogHits.map(
            (p) =>
              `- ${p.name} | harga ${formatRupiahPlain(p.unitPrice)} | ${p.description.slice(0, 160)}`,
          ),
          'Gunakan detail di atas HANYA untuk memperkaya fakta produk yang diminta. Jangan ganti ke SKU lain.',
        ].join('\n')
      : forceOutsideCatalog
        ? [
            '## Katalog toko — JANGAN DIPAKAI SEBAGAI SUBJEK',
            `Toko user: ${db.profile.brand}.`,
            'Permintaan user TIDAK cocok dengan SKU di katalog toko.',
            `DILARANG menulis caption tentang produk katalog (contoh: jangan sebut merek/SKU toko seperti ${db.catalog[0]?.shortName || db.profile.brand} jika user tidak memintanya).`,
            'Buat caption murni untuk produk/konteks yang diminta user di bagian "Produk" dan "Prompt" di bawah.',
          ].join('\n')
        : [
            '## Konteks toko (ringkas)',
            `Brand toko: ${db.profile.brand}. Jangan memaksa brand ini jika user minta produk lain.`,
          ].join('\n')

  const scheduleBlock = prefs.smartSchedule
    ? [
        '## Jadwal posting cerdas (AKTIF di Setting AI)',
        'Tambahkan 1 baris singkat di akhir caption (boleh dipisah baris baru) berisi saran jam posting ideal untuk platform tersebut di Indonesia (contoh: "Ideal dipost: 19.00–21.00 WIB").',
        'Jangan mengarang insight palsu di luar kebiasaan umum social commerce.',
      ].join('\n')
    : '## Jadwal posting cerdas NONAKTIF — jangan sisipkan saran jam posting kecuali user memintanya.'

  return `Tugas: buat caption pemasaran multi-platform (JSON schema).

## PRIORITAS (urut wajib)
1. Nama produk yang diminta user
2. Prompt/instruksi user  
3. Gaya bahasa & platform (WAJIB terasa sesuai tone)
4. Referensi katalog HANYA jika cocok

## Produk yang HARUS jadi subjek caption
${productName || '(lihat prompt user di bawah — JANGAN default ke produk katalog toko)'}

## Gaya bahasa terpilih: ${style}
${getCaptionStyleGuide(style)}

Platform: ${input.platforms.join(', ')}
${custom ? `\n## Prompt / instruksi user (WAJIB diikuti)\n"""${custom.slice(0, 1500)}"""\n` : ''}
${catalogBlock}

${scheduleBlock}

## Aturan output
- Caption HARUS tentang produk/konteks yang diminta user, BUKAN produk katalog yang tidak diminta.
- Jangan mengganti nama produk ke brand/SKU katalog toko.
- Jika user bilang "bukan NUSACID" / produk lain → patuhi, jangan sebut produk katalog.
- Harga: sebut hanya jika user minta ATAU produk cocok katalog (pakai harga katalog).
- Tone ${style} harus konsisten di SEMUA platform (boleh beda panjang, gaya sama).
- Maks ~500 karakter per platform.
- Kembalikan JSON sesuai schema.`
}

export function buildTransactionUserPrompt(db: BusinessDatabase, text: string): string {
  const catalog = db.catalog
    .map(
      (p) =>
        `- productId="${p.id}" product="${p.name}" unitPrice=${p.unitPrice} variant="${p.variant}" stock=${p.stock}`,
    )
    .join('\n')
  const fallback = defaultCatalogProduct(db.catalog)

  return `Tugas: parse teks transaksi menjadi JSON.

Katalog live:
${catalog}

Default: product="${fallback?.name ?? ''}", price=${fallback?.unitPrice ?? 0}

Teks:
"""
${text}
"""

Aturan:
- product: PERSIS salah satu nama katalog.
- qty: bilangan bulat ≥ 1 (tidak boleh melebihi stok bila disebut).
- price: harga SATUAN; jika ragu pakai harga katalog.
- Jangan invent produk di luar katalog.`
}

export function buildAssistantUserPrompt(db: BusinessDatabase, message: string): string {
  const retrieved = buildRetrievedContext(db, message, 5)
  return `Tugas: jawab pertanyaan pemilik usaha (${db.profile.owner}) di ${db.profile.appName}.

## Fitur laporan (penting)
- User bisa minta "laporan PDF omzet & modal" dari dashboard AI.
- Laporan mencakup: omzet, estimasi modal/HPP, laba kotor, margin, modal stok, rincian produk, omzet harian, transaksi.
- Laporan SELALU multi-tenant: hanya usaha aktif user (${db.profile.brand}), jangan pernah mengisi dengan data/merek usaha lain.
- Jika user minta laporan/PDF/keuangan, arahkan: tekan tombol "Laporan PDF Omzet & Modal" atau ketik perintah serupa di kotak asisten (sistem akan generate file).

## Knowledge relevan (retrieval dari DB live)
${retrieved}

## Pertanyaan
${message}

## Format
- 2–6 kalimat / bullet singkat.
- Harga/stok: angka pasti dari knowledge.
- Saran aksi di app bila relevan.
- Jangan mengarang di luar knowledge.`
}

export function buildUserPrompt(
  db: BusinessDatabase,
  task: AiTask,
  payload: {
    productName?: string
    style?: string
    platforms?: string[]
    text?: string
    message?: string
    userPrompt?: string
  },
): string {
  if (task === 'caption') {
    const prefs = normalizeAiPreferences(db.profile.ai)
    return buildCaptionUserPrompt(db, {
      productName: payload.productName || '',
      style: payload.style || prefs.tone,
      platforms: payload.platforms || ['Instagram'],
      userPrompt: payload.userPrompt,
    })
  }
  if (task === 'transaction') {
    return buildTransactionUserPrompt(db, payload.text || '')
  }
  return buildAssistantUserPrompt(db, payload.message || '')
}
