/**
 * Pure helpers untuk katalog multi-tenant.
 * JANGAN hardcode merek / SKU / ukuran demo (NUSACID, ml, dll).
 * Semua resolusi dari katalog usaha aktif yang di-pass caller.
 */

import type { CatalogProduct } from '@/lib/types'

export function formatRupiahPlain(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}

/** Cocokkan query teks bebas ke entri katalog usaha (nama/short/variant/keyword). */
export function findCatalogProduct(
  catalog: CatalogProduct[],
  query: string,
): CatalogProduct | undefined {
  const q = (query || '').trim().toLowerCase()
  if (!q || catalog.length === 0) return undefined

  // Exact name / shortName
  const exact =
    catalog.find((item) => item.name.toLowerCase() === q) ||
    catalog.find((item) => item.shortName.toLowerCase() === q)
  if (exact) return exact

  // Contains either direction
  const contains =
    catalog.find(
      (item) =>
        q.includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(q) ||
        q.includes(item.shortName.toLowerCase()) ||
        item.shortName.toLowerCase().includes(q),
    ) ||
    catalog.find((item) => {
      const v = (item.variant || '').toLowerCase().replace(/\s/g, '')
      if (!v || v === '-') return false
      return q.includes(v) || v.includes(q.replace(/\s/g, ''))
    }) ||
    catalog.find((item) =>
      (item.keywords || []).some((k) => {
        const kk = String(k).toLowerCase()
        return kk && (q.includes(kk) || kk.includes(q))
      }),
    )

  return contains
}

/** Produk default = entri pertama katalog usaha (tanpa preferensi SKU tertentu). */
export function defaultCatalogProduct(catalog: CatalogProduct[]): CatalogProduct | undefined {
  return catalog[0]
}

/** Gambar produk dari katalog usaha; fallback placeholder generik. */
export function resolveProductImage(catalog: CatalogProduct[], productName: string): string {
  const match = findCatalogProduct(catalog, productName)
  return match?.image || catalog[0]?.image || '/placeholder.svg'
}

/** Placeholder contoh di UI — dari brand/katalog client, bukan merek seed. */
export function exampleProductLabel(
  catalog: CatalogProduct[],
  brand?: string | null,
): string {
  if (catalog[0]?.shortName) return catalog[0].shortName
  if (catalog[0]?.name) return catalog[0].name
  if (brand?.trim()) return brand.trim()
  return 'produk unggulan'
}
