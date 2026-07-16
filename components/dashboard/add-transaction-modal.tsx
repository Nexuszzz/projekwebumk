'use client'

import { Modal } from '@/components/ui/modal'
import { useDashboard } from '@/lib/dashboard-store'
import { formatRupiah } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Keyboard, Mic, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ProcessingState } from './generate-content-modal'

type Mode = 'teks' | 'suara'
type Step = 'input' | 'processing' | 'result'

const PROCESSING_TEXTS = [
  'Memahami kalimat...',
  'Mengekstrak nama produk...',
  'Menghitung total...',
]

const VOICE_TRANSCRIPT = 'jual kopi arabika gayo dua bungkus empat puluh delapan ribu'

/* Parsing dummy sederhana: ambil angka + tebak produk dari teks input */
function parseInput(text: string) {
  const lower = text.toLowerCase()
  let product = 'Produk Baru'
  if (lower.includes('sabun') || lower.includes('nusacid')) product = 'Sabun Nusacid'
  else if (lower.includes('kopi')) product = 'Kopi Arabika Gayo'
  else if (lower.includes('keripik')) product = 'Keripik Singkong Renyah'
  else if (lower.includes('madu')) product = 'Madu Hutan Murni'
  else if (lower.includes('tas') || lower.includes('rotan')) product = 'Tas Anyaman Rotan'

  const numbers = text.match(/\d[\d.,]*/g)?.map((n) => Number(n.replace(/[.,]/g, ''))) ?? []
  let qty = 1
  let price = 25_000
  if (numbers.length >= 2) {
    qty = Math.min(numbers[0], 999) || 1
    price = numbers[numbers.length - 1]
    if (price < 1000) price *= 1000
  } else if (numbers.length === 1) {
    price = numbers[0] < 1000 ? numbers[0] * 1000 : numbers[0]
  } else if (lower.includes('dua')) {
    qty = 2
    price = 24_000
  } else if (lower.includes('tiga')) {
    qty = 3
    price = 18_500
  }
  return { product, qty, price }
}

const PRODUCT_IMAGE: Record<string, string> = {
  'Sabun Nusacid': '/products/nusacid.png',
  'Kopi Arabika Gayo': '/products/kopi.png',
  'Keripik Singkong Renyah': '/products/keripik.png',
  'Madu Hutan Murni': '/products/madu.png',
  'Tas Anyaman Rotan': '/products/tas.png',
}

export function AddTransactionModal() {
  const { transactionModalOpen, closeTransactionModal, addTransaction } = useDashboard()

  const [mode, setMode] = useState<Mode>('teks')
  const [step, setStep] = useState<Step>('input')
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  /* Hasil parsing (editable) */
  const [product, setProduct] = useState('')
  const [qty, setQty] = useState(1)
  const [price, setPrice] = useState(0)
  const total = qty * price

  /* Reset saat modal dibuka */
  useEffect(() => {
    if (!transactionModalOpen) return
    setMode('teks')
    setStep('input')
    setText('')
    setRecording(false)
    setTranscript('')
    setError(null)
  }, [transactionModalOpen])

  /* Simulasi rekam suara: pulsing beberapa detik lalu isi transkrip dummy */
  useEffect(() => {
    if (!recording) return
    const timer = setTimeout(() => {
      setTranscript(VOICE_TRANSCRIPT)
      setRecording(false)
    }, 2800)
    return () => clearTimeout(timer)
  }, [recording])

  /* Parse through the server route; API credentials remain server-only. */
  useEffect(() => {
    if (step !== 'processing') return
    const source = mode === 'suara' ? transcript : text
    const controller = new AbortController()
    async function parseTransaction() {
      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: 'transaction', text: source }),
          signal: controller.signal,
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'AI gagal membaca transaksi.')
        setProduct(payload.product)
        setQty(Math.max(1, Math.round(payload.qty)))
        setPrice(Math.max(0, Math.round(payload.price)))
        setStep('result')
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'AI gagal membaca transaksi.')
        setStep('input')
      }
    }
    void parseTransaction()
    return () => controller.abort()
  }, [step, mode, text, transcript])

  function save() {
    addTransaction({
      product: product.trim() || 'Produk Baru',
      variant: mode === 'suara' ? 'Input suara' : 'Input teks',
      image: PRODUCT_IMAGE[product.trim()] ?? '/placeholder.svg',
      total,
      method: mode === 'suara' ? 'Suara' : 'Teks',
      status: mode === 'suara' ? 'Perlu Verifikasi' : 'Tersimpan',
    })
    closeTransactionModal()
  }

  const canProcess = mode === 'teks' ? text.trim().length > 0 : transcript.length > 0

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
      subtitle={step === 'input' ? 'Ketik atau ucapkan detail transaksi' : undefined}
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
            {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">{error}</p>}
            {/* Toggle mode */}
            <div
              role="tablist"
              aria-label="Metode input transaksi"
              className="flex gap-1.5 rounded-full border border-border bg-secondary/40 p-1"
            >
              {(
                [
                  { key: 'teks', label: 'Ketik', icon: Keyboard },
                  { key: 'suara', label: 'Ucapkan', icon: Mic },
                ] as const
              ).map((m) => {
                const active = mode === m.key
                return (
                  <button
                    key={m.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setMode(m.key)}
                    className={`flex h-9 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all active:scale-[0.98] ${
                      active
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <m.icon className="size-4" aria-hidden="true" />
                    {m.label}
                  </button>
                )
              })}
            </div>

            {mode === 'teks' ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tx-text" className="sr-only">
                  Detail transaksi
                </label>
                <textarea
                  id="tx-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  placeholder="Contoh: jual sabun nusacid 3 botol 18.500"
                  className="w-full resize-y rounded-2xl border border-input bg-background/60 p-4 text-sm leading-relaxed outline-none transition-all placeholder:text-muted-foreground/60 focus:border-accent focus:ring-2 focus:ring-accent/25"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-2">
                {/* Tombol mic besar dengan ring pulsing saat "merekam" */}
                <div className="relative flex items-center justify-center">
                  {recording && (
                    <>
                      <motion.span
                        animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
                        transition={{
                          duration: 1.4,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: 'easeOut',
                        }}
                        className="absolute size-20 rounded-full bg-accent-warm/40"
                        aria-hidden="true"
                      />
                      <motion.span
                        animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                        transition={{
                          duration: 1.4,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: 'easeOut',
                          delay: 0.35,
                        }}
                        className="absolute size-20 rounded-full bg-accent-warm/50"
                        aria-hidden="true"
                      />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setTranscript('')
                      setRecording(true)
                    }}
                    disabled={recording}
                    aria-label={recording ? 'Sedang merekam' : 'Mulai rekam suara'}
                    className={`relative flex size-20 items-center justify-center rounded-full transition-all active:scale-[0.95] ${
                      recording
                        ? 'bg-accent-warm text-white'
                        : 'bg-accent text-accent-foreground hover:opacity-90'
                    }`}
                  >
                    <Mic className="size-8" aria-hidden="true" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {recording
                    ? 'Mendengarkan... ucapkan detail transaksimu'
                    : transcript
                      ? 'Transkrip siap — cek hasilnya di bawah'
                      : 'Ketuk untuk mulai bicara'}
                </p>

                <AnimatePresence>
                  {transcript && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="w-full"
                    >
                      <label htmlFor="tx-transcript" className="sr-only">
                        Hasil transkrip suara
                      </label>
                      <textarea
                        id="tx-transcript"
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        rows={2}
                        className="w-full resize-none rounded-2xl border border-accent-warm/40 bg-accent-warm/5 p-3.5 text-sm italic leading-relaxed outline-none transition-all focus:border-accent-warm focus:ring-2 focus:ring-accent-warm/25"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

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
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tx-product" className="text-xs font-semibold">
                Nama Produk
              </label>
              <input
                id="tx-product"
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="h-10 w-full rounded-xl border border-input bg-background/60 px-3.5 text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
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
                  step={500}
                  value={price}
                  onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
                  className="h-10 w-full rounded-xl border border-input bg-background/60 px-3.5 font-mono text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/25"
                />
              </div>
            </div>

            {/* Total otomatis */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/8 px-4 py-3.5">
              <span className="text-sm font-semibold">Total</span>
              <output
                htmlFor="tx-qty tx-price"
                className="font-mono text-xl font-bold tracking-tight text-accent"
              >
                {formatRupiah(total)}
              </output>
            </div>

            <button
              type="button"
              onClick={save}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-bold text-accent-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <Check className="size-4" strokeWidth={3} aria-hidden="true" />
              Simpan Transaksi
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}
