/** Pure helpers untuk katalog — tidak hardcode data produk. */

import type { CatalogProduct } from '@/lib/types'

export function formatRupiahPlain(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}

export function resolveProductImage(catalog: CatalogProduct[], productName: string): string {
  const lower = productName.toLowerCase()
  if (lower.includes('1500')) {
    return catalog.find((p) => p.variant.includes('1500'))?.image ?? catalog[0]?.image ?? '/placeholder.svg'
  }
  if (lower.includes('1000')) {
    return catalog.find((p) => p.variant.includes('1000'))?.image ?? catalog[0]?.image ?? '/placeholder.svg'
  }
  if (lower.includes('500')) {
    return catalog.find((p) => p.variant.includes('500'))?.image ?? catalog[0]?.image ?? '/placeholder.svg'
  }
  const match = catalog.find(
    (item) =>
      lower.includes(item.name.toLowerCase()) ||
      lower.includes(item.shortName.toLowerCase()) ||
      lower.includes(item.variant.toLowerCase()),
  )
  return match?.image ?? catalog[0]?.image ?? '/placeholder.svg'
}

export function findCatalogProduct(
  catalog: CatalogProduct[],
  query: string,
): CatalogProduct | undefined {
  const lower = query.toLowerCase()
  return (
    catalog.find((item) => lower.includes(item.name.toLowerCase())) ||
    catalog.find((item) => lower.includes(item.variant.toLowerCase().replace(/\s/g, ''))) ||
    catalog.find((item) => item.keywords.some((k) => lower.includes(k))) ||
    catalog.find((item) => lower.includes(item.shortName.toLowerCase()))
  )
}

export function defaultCatalogProduct(catalog: CatalogProduct[]): CatalogProduct | undefined {
  return catalog.find((p) => p.variant.includes('500')) ?? catalog[0]
}
