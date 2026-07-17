'use client'

import { Modal } from '@/components/ui/modal'
import { defaultCatalogProduct, findCatalogProduct, useDashboard } from '@/lib/dashboard-store'
import { formatRupiah } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ProcessingState } from './generate-content-modal'

type Step = 'input' | 'processing' | 'result'

const PROCESSING_TEXTS = [
  'Memahami kalimat...',
  'Mengekstrak nama produk...',
  'Menghitung total...',
]

export function AddTransactionModal() {
  const { transactionModalOpen, closeTransactionModal, addTransaction, catalog, profile } = useDashboard()
  const fallback = defaultCatalogProduct(catalog)
  const brandHint = profile?.brand || 'produk'

  const [step, setStep] = useState<Step>('input')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [product, setProduct] = useState('')
  const [qty, setQty] = useState(1)
  const [price, setPrice] = useState(0)
  const total = qty * price

  useEffect(() => {
    if (!transactionModalOpen) return
    setStep('input')
    setText('')
    setError(null)
    setSaving(false)
    setProduct(fallback?.name ?? '')
    setPrice(fallback?.unitPrice ?? 0)
    setQty(1)
  }, [transactionModalOpen, fallback?.name, fallback?.unitPrice])

  useEffect(() => {
    if (step !== 'processing') return
    const controller = new AbortController()
    async function parseTransaction() {
      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: 'transaction', text }),
          signal: controller.signal,
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'AI gagal membaca transaksi.')
        const parsedProduct = String(payload.product || '').trim()
        const catalogHit = findCatalogProduct(catalog, parsedProduct)
        setProduct(catalogHit?.name ?? fallback?.name ?? parsedProduct)
        setQty(Math.max(1, Math.round(payload.qty)))
        setPrice(
          Math.max(
            0,
            Math.round(payload.price || catalogHit?.unitPrice || fallback?.unitPrice || 0),
          ),
        )
        setStep('result')
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'AI gagal membaca transaksi.')
        setStep('input')
      }
    }
    void parseTransaction()
    return () => controller.abort()
  }, [step, text, catalog, fallback?.name, fallback?.unitPrice])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const catalogHit = findCatalogProduct(catalog, product) ?? fallback
      await addTransaction({
        productId: catalogHit?.id,
        product: catalogHit?.name ?? product,
        qty,
        unitPrice: price,
        status: 'Tersimpan',
      })
      closeTransactionModal()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan transaksi.')
    } finally {
      setSaving(false)
    }
  }

  const canProcess = text.trim().length > 0

  return (
    <Modal
      isOpen={transactionModalOpen}
      onClose={closeTransactionModal}
      title={
        step === 'result'
          ? 'Transaksi Terdeteksi'
          : step === 'processing'
            ? 'Sedang Diproses'
            : 'Catat Transaksi Baru'
      }
      subtitle={
        step === 'input'
          ? 'Ketik detail penjualan — stok gudang akan berkurang otomatis'
          : undefined
      }
      maxWidth="sm:max-w-md"
    >
      <AnimatePresence mode="wait" initial={false}>
        {step === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-5"
          >
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            {catalog.length > 0 && (
              <ul className="rounded-xl border border-border bg-secondary/40 px-3.5 py-3 text-xs text-muted-foreground">
                {catalog.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2 py-0.5">
                    <span>{p.shortName}</span>
                    <span className="font-mono">
                      {formatRupiah(p.unitPrice)} · stok {p.stock}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="tx-text" className="text-xs font-semibold">
                Detail transaksi
              </label>
              <textarea
                id="tx-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder={`Contoh: jual ${brandHint} 3 pcs`}
                className="w-full resize-y rounded-2xl border border-input bg-background/60 p-4 text-sm leading-relaxed outline-none transition-all placeholder:text-muted-foreground/60 focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </div>

            <button
              type="button"
              disabled={!canProcess}
              onClick={() => setStep('processing')}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-bold text-accent-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Proses dengan AI
            </button>
          </motion.div>
        )}

        {step === 'processing' && (
          <ProcessingState key="processing" texts={PROCESSING_TEXTS} durationMs={2000} />
        )}

        {step === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-4"
          >
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="tx-product" className="text-xs font-semibold">
                Nama Produk
              </label>
              <select
                id="tx-product"
                value={product}
                onChange={(e) => {
                  const name = e.target.value
                  setProduct(name)
                  const hit = findCatalogProduct(catalog, name)
                  if (hit) setPrice(hit.unitPrice)
                }}
                className="h-10 w-full rounded-xl border border-input bg-background/60 px-3.5 text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/25"
              >
                {catalog.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.shortName} — stok {p.stock}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tx-qty" className="text-xs font-semibold">
                  Jumlah
                </label>
                <input
                  id="tx-qty"
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  className="h-10 w-full rounded-xl border border-input bg-background/60 px-3.5 font-mono text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/25"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tx-price" className="text-xs font-semibold">
                  Harga Satuan (Rp)
                </label>
                <input
                  id="tx-price"
                  type="number"
                  min={0}
                  step={100}
                  value={price}
                  onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
                  className="h-10 w-full rounded-xl border border-input bg-background/60 px-3.5 font-mono text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/25"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/8 px-4 py-3.5">
              <span className="text-sm font-semibold">Total</span>
              <output className="font-mono text-xl font-bold tracking-tight text-accent">
                {formatRupiah(total)}
              </output>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-bold text-accent-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              <Check className="size-4" strokeWidth={3} aria-hidden="true" />
              {saving ? 'Menyimpan...' : 'Simpan & Kurangi Stok'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}
