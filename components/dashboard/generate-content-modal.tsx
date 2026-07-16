'use client'

import { Modal } from '@/components/ui/modal'
import { useDashboard, type ContentItem, type Platform } from '@/lib/dashboard-store'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Check, Copy, Sparkles, Store, Upload } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { InstagramIcon } from './brand-icons'

type Step = 'upload' | 'processing' | 'result'
type Style = 'Santai' | 'Formal' | 'Promo'

const ALL_PLATFORMS: Platform[] = ['Instagram', 'Tokopedia', 'Lazada']
const STYLES: Style[] = ['Santai', 'Formal', 'Promo']

const PROCESSING_TEXTS = [
  'Menganalisis foto produk...',
  'Menyusun caption...',
  'Menyesuaikan gaya bahasa...',
  'Hampir selesai...',
]

const PLATFORM_ICON: Record<Platform, React.ReactNode> = {
  Instagram: <InstagramIcon className="size-3" />,
  Tokopedia: <Store className="size-3" aria-hidden="true" />,
  Lazada: <span className="text-[9px] font-bold leading-none">L</span>,
}

const PLATFORM_COLOR: Record<Platform, string> = {
  Instagram: 'bg-[#E1306C]',
  Tokopedia: 'bg-[#03AC0E]',
  Lazada: 'bg-[#F36F20]',
}

export function GenerateContentModal() {
  const { contentModal, closeContentModal, addContents, updateContent } = useDashboard()
  const { open, editItem } = contentModal
  const isEdit = Boolean(editItem)

  const [step, setStep] = useState<Step>('upload')
  const [photo, setPhoto] = useState<string | null>(null)
  const [productName, setProductName] = useState('')
  const [platforms, setPlatforms] = useState<Platform[]>(ALL_PLATFORMS)
  const [style, setStyle] = useState<Style>('Santai')
  const [captions, setCaptions] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<Platform | null>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* Reset / prefill setiap kali modal dibuka */
  useEffect(() => {
    if (!open) return
    if (editItem) {
      setStep('result')
      setPhoto(editItem.image)
      setProductName(editItem.title)
      setPlatforms([editItem.platform])
      setStyle('Santai')
      setCaptions({ [editItem.platform]: editItem.description })
    } else {
      setStep('upload')
      setPhoto(null)
      setProductName('')
      setPlatforms(ALL_PLATFORMS)
      setStyle('Santai')
      setCaptions({})
    }
    setCopied(null)
    setError(null)
  }, [open, editItem])

  function handleFile(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => setPhoto(reader.result as string)
    reader.readAsDataURL(file)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0])
  }

  function togglePlatform(p: Platform) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    )
  }

  function startGenerate() {
    setError(null)
    setStep('processing')
  }

  /* Generate through the server route so the API key never reaches the browser. */
  useEffect(() => {
    if (step !== 'processing') return
    const controller = new AbortController()
    async function generate() {
      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: 'caption', productName, style, platforms, image: photo }),
          signal: controller.signal,
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'AI gagal memproses konten.')
        setCaptions(payload.captions ?? {})
        setStep('result')
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'AI gagal memproses konten.')
        setStep('upload')
      }
    }
    void generate()
    return () => controller.abort()
  }, [step, platforms, productName, style, photo])

  async function copyCaption(p: Platform) {
    try {
      await navigator.clipboard.writeText(captions[p] ?? '')
      setCopied(p)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      /* clipboard tidak tersedia — abaikan */
    }
  }

  function save(status: 'Draft' | 'Terposting') {
    if (isEdit && editItem) {
      updateContent(editItem.id, {
        title: productName.trim() || editItem.title,
        description: captions[editItem.platform] ?? editItem.description,
        status,
      })
    } else {
      const items: Omit<ContentItem, 'id' | 'createdAt'>[] = platforms.map((p) => ({
        title: productName.trim() || 'Produk Baru',
        description: captions[p] ?? '',
        image: photo ?? '/placeholder.svg',
        platform: p,
        status,
      }))
      addContents(items)
    }
    closeContentModal()
  }

  return (
    <Modal
      isOpen={open}
      onClose={closeContentModal}
      title={
        step === 'result'
          ? isEdit
            ? 'Edit Konten'
            : 'Konten Siap ✓'
          : step === 'processing'
            ? 'Sedang Diproses'
            : 'Buat Konten Baru'
      }
      subtitle={
        step === 'upload' ? 'Upload foto produk, AI akan buatkan caption otomatis' : undefined
      }
      maxWidth="sm:max-w-xl"
    >
      <AnimatePresence mode="wait" initial={false}>
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-5"
          >
            {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">{error}</p>}
            {/* Drop zone */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`relative flex min-h-44 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed p-4 transition-colors ${
                dragging
                  ? 'border-accent bg-accent/10'
                  : photo
                    ? 'border-accent/40 bg-secondary/40'
                    : 'border-border bg-secondary/40 hover:border-accent/40'
              }`}
            >
              {photo ? (
                <>
                  <Image
                    src={photo || '/placeholder.svg'}
                    alt="Preview foto produk"
                    width={320}
                    height={176}
                    className="max-h-40 w-auto rounded-xl object-contain"
                  />
                  <span className="flex items-center gap-1.5 text-xs font-medium text-accent">
                    <Upload className="size-3.5" aria-hidden="true" />
                    Klik untuk ganti foto
                  </span>
                </>
              ) : (
                <>
                  <span
                    className="flex size-12 items-center justify-center rounded-full bg-accent/15 text-accent"
                    aria-hidden="true"
                  >
                    <Camera className="size-6" />
                  </span>
                  <span className="text-sm font-semibold">
                    Tarik foto ke sini atau klik untuk pilih
                  </span>
                  <span className="text-xs text-muted-foreground">PNG, JPG hingga 10 MB</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="sr-only"
              aria-label="Upload foto produk"
            />

            {/* Nama produk */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="gc-product-name" className="text-xs font-semibold">
                Nama Produk{' '}
                <span className="font-normal text-muted-foreground">
                  (opsional, bantu AI kasih hasil lebih akurat)
                </span>
              </label>
              <input
                id="gc-product-name"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Contoh: Sabun Nusacid 500 ml"
                className="h-10 w-full rounded-xl border border-input bg-background/60 px-3.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </div>

            {/* Platform tujuan */}
            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-semibold">Platform Tujuan</legend>
              <div className="flex flex-wrap gap-2">
                {ALL_PLATFORMS.map((p) => {
                  const active = platforms.includes(p)
                  return (
                    <label
                      key={p}
                      className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all ${
                        active
                          ? 'border-accent bg-accent/10 text-foreground'
                          : 'border-border text-muted-foreground hover:border-accent/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => togglePlatform(p)}
                        className="sr-only"
                      />
                      <span
                        className={`flex size-4.5 items-center justify-center rounded-full text-white ${PLATFORM_COLOR[p]}`}
                        aria-hidden="true"
                      >
                        {PLATFORM_ICON[p]}
                      </span>
                      {p}
                      {active && (
                        <Check className="size-3.5 text-accent" strokeWidth={3} aria-hidden="true" />
                      )}
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {/* Gaya tulisan */}
            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-semibold">Gaya Tulisan</legend>
              <div role="radiogroup" aria-label="Gaya tulisan" className="flex flex-wrap gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={style === s}
                    onClick={() => setStyle(s)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-[0.97] ${
                      style === s
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-border text-muted-foreground hover:border-accent/30 hover:text-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* CTA */}
            <button
              type="button"
              disabled={!photo || platforms.length === 0}
              onClick={startGenerate}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-bold text-accent-foreground transition-all animate-glow-breathe hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              {'Generate dengan AI ✨'}
            </button>
          </motion.div>
        )}

        {step === 'processing' && (
          <ProcessingState key="processing" texts={PROCESSING_TEXTS} durationMs={2500} />
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
            {(isEdit && editItem ? [editItem.platform] : platforms).map((p) => (
              <div
                key={p}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-background/50 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span
                      className={`flex size-5 items-center justify-center rounded-full text-white ${PLATFORM_COLOR[p]}`}
                      aria-hidden="true"
                    >
                      {PLATFORM_ICON[p]}
                    </span>
                    {p}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyCaption(p)}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-all hover:border-accent/40 hover:bg-secondary active:scale-[0.97]"
                  >
                    {copied === p ? (
                      <>
                        <Check className="size-3 text-accent" strokeWidth={3} aria-hidden="true" />
                        Tersalin
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" aria-hidden="true" />
                        Salin Teks
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={captions[p] ?? ''}
                  onChange={(e) =>
                    setCaptions((prev) => ({ ...prev, [p]: e.target.value }))
                  }
                  rows={5}
                  aria-label={`Caption untuk ${p}`}
                  className="w-full resize-y rounded-xl border border-input bg-background/60 p-3 text-sm leading-relaxed outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/25"
                />
              </div>
            ))}

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => save('Draft')}
                className="flex h-11 flex-1 items-center justify-center rounded-full border border-border text-sm font-semibold transition-all hover:border-accent/40 hover:bg-secondary active:scale-[0.98]"
              >
                Simpan sebagai Draft
              </button>
              <button
                type="button"
                onClick={() => save('Terposting')}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-accent text-sm font-bold text-accent-foreground transition-all hover:opacity-90 active:scale-[0.98]"
              >
                <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                Tandai Sudah Diposting
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}

/* ============================================================
   State "processing" — dipakai juga oleh modal transaksi
   ============================================================ */

export function ProcessingState({
  texts,
  durationMs,
}: {
  texts: string[]
  durationMs: number
}) {
  const [textIndex, setTextIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((i) => Math.min(i + 1, texts.length - 1))
    }, 800)
    return () => clearInterval(interval)
  }, [texts.length])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-5 py-12"
      aria-live="polite"
    >
      <motion.span
        animate={{ rotate: 360, scale: [1, 1.15, 1] }}
        transition={{
          rotate: { duration: 3, repeat: Number.POSITIVE_INFINITY, ease: 'linear' },
          scale: { duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' },
        }}
        className="flex size-14 items-center justify-center rounded-full bg-accent/15 text-accent"
        aria-hidden="true"
      >
        <Sparkles className="size-7" />
      </motion.span>

      <AnimatePresence mode="wait">
        <motion.p
          key={textIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="text-sm font-medium text-muted-foreground"
        >
          {texts[textIndex]}
        </motion.p>
      </AnimatePresence>

      {/* Progress bar tipis */}
      <div className="h-1 w-48 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: durationMs / 1000, ease: 'easeInOut' }}
          className="h-full rounded-full bg-accent"
        />
      </div>
    </motion.div>
  )
}
