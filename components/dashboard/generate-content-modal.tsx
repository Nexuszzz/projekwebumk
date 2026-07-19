'use client'

import { Modal } from '@/components/ui/modal'
import { AI_TONES, normalizeAiPreferences, normalizeAiTone, type AiTone } from '@/lib/ai-style'
import { useDashboard, type ContentItem, type Platform } from '@/lib/dashboard-store'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Camera,
  Check,
  Copy,
  Download,
  FileText,
  ImageIcon,
  Layers,
  Sparkles,
  Store,
  Upload,
} from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { InstagramIcon } from './brand-icons'

type Step = 'upload' | 'processing' | 'result'
type Style = AiTone
type PosterAspect = '1:1' | '9:16' | '16:9'
/** Opsi generate: caption Gemini | poster Genity | keduanya */
type GenerateMode = 'caption' | 'poster' | 'both'

const ALL_PLATFORMS: Platform[] = ['Instagram', 'Tokopedia', 'Lazada']
const STYLES: Style[] = [...AI_TONES]
const POSTER_ASPECTS: { key: PosterAspect; label: string; hint: string }[] = [
  { key: '1:1', label: '1:1', hint: 'Feed' },
  { key: '9:16', label: '9:16', hint: 'Story' },
  { key: '16:9', label: '16:9', hint: 'Banner' },
]

const GENERATE_MODES: {
  key: GenerateMode
  label: string
  desc: string
  icon: typeof FileText
}[] = [
  {
    key: 'caption',
    label: 'Caption saja',
    desc: 'Teks via Gemini · tampil di Konten',
    icon: FileText,
  },
  {
    key: 'poster',
    label: 'Poster saja',
    desc: 'Gambar via Genity · simpan ke Konten',
    icon: ImageIcon,
  },
  {
    key: 'both',
    label: 'Caption + Poster',
    desc: 'Gemini teks + Genity gambar',
    icon: Layers,
  },
]

const TEXTS_CAPTION = [
  'Menganalisis produk...',
  'Menyusun caption (Gemini)...',
  'Menyesuaikan gaya bahasa...',
  'Hampir selesai...',
]

const TEXTS_POSTER = [
  'Menganalisis produk...',
  'Merancang poster (Genity)...',
  'Menggambar layout jualan...',
  'Menyimpan ke server...',
  'Hampir selesai...',
]

const TEXTS_BOTH = [
  'Menyiapkan request...',
  'Caption lewat Gemini...',
  'Poster lewat Genity...',
  'Menyimpan gambar ke server...',
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
  const { contentModal, closeContentModal, addContents, updateContent, profile, catalog, businessId } =
    useDashboard()
  const { open, editItem } = contentModal
  const isEdit = Boolean(editItem)

  const [step, setStep] = useState<Step>('upload')
  const [mode, setMode] = useState<GenerateMode>('both')
  const [photo, setPhoto] = useState<string | null>(null)
  const [productName, setProductName] = useState('')
  const [userPrompt, setUserPrompt] = useState('')
  const [platforms, setPlatforms] = useState<Platform[]>(ALL_PLATFORMS)
  const [style, setStyle] = useState<Style>('Santai')
  const [captions, setCaptions] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<Platform | null>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posterAspect, setPosterAspect] = useState<PosterAspect>('1:1')
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [posterStatus, setPosterStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [posterError, setPosterError] = useState<string | null>(null)
  const [imageBusy, setImageBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editImageInputRef = useRef<HTMLInputElement>(null)

  const needCaption = mode === 'caption' || mode === 'both'
  const needPoster = mode === 'poster' || mode === 'both'

  useEffect(() => {
    if (!open) return
    const prefs = normalizeAiPreferences(profile?.ai)
    const defaultStyle = normalizeAiTone(prefs.tone)
    // Caption otomatis ON → default both; OFF → poster saja (user bisa ganti)
    const defaultMode: GenerateMode = prefs.autoCaption ? 'both' : 'poster'
    if (editItem) {
      setStep('result')
      setPhoto(editItem.image)
      setProductName(editItem.title)
      setPlatforms([editItem.platform])
      setStyle(defaultStyle)
      setCaptions({ [editItem.platform]: editItem.description })
      setPosterUrl(
        editItem.image.startsWith('http') || editItem.image.startsWith('/')
          ? editItem.image
          : null,
      )
      setPosterStatus(editItem.image ? 'ready' : 'idle')
      setMode(defaultMode)
      setUserPrompt('')
    } else {
      setStep('upload')
      setMode(defaultMode)
      setPhoto(null)
      setProductName('')
      setUserPrompt('')
      setPlatforms(ALL_PLATFORMS)
      setStyle(defaultStyle)
      setCaptions({})
      setPosterAspect('1:1')
      setPosterUrl(null)
      setPosterStatus('idle')
      setPosterError(null)
    }
    setCopied(null)
    setError(null)
  }, [open, editItem, profile?.ai])

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

  /** Kompres gambar di browser biar lolos body limit Vercel */
  async function compressImageFile(file: File, maxEdge = 1600, quality = 0.82): Promise<Blob> {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas tidak tersedia di browser ini.')
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality),
    )
    if (!blob) throw new Error('Gagal kompres gambar.')
    return blob
  }

  async function parseJsonSafe(res: Response): Promise<Record<string, unknown>> {
    const text = await res.text()
    if (!text) {
      throw new Error(
        res.status === 413
          ? 'Gambar terlalu besar untuk di-upload. Coba foto lebih kecil.'
          : `Server tidak mengirim respons (HTTP ${res.status}). Coba foto lebih kecil atau refresh.`,
      )
    }
    try {
      return JSON.parse(text) as Record<string, unknown>
    } catch {
      throw new Error(
        `Respons server tidak valid (HTTP ${res.status}). Biasanya upload gagal karena ukuran/file. Coba kompres foto.`,
      )
    }
  }

  /** Edit mode: upload gambar baru → simpan ke server (multipart + compress) */
  async function onEditImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !file.type.startsWith('image/')) return
    setImageBusy(true)
    setError(null)
    try {
      // Preview lokal dulu biar UI responsif
      const localPreview = URL.createObjectURL(file)
      setPhoto(localPreview)
      setPosterUrl(localPreview)
      setPosterStatus('ready')

      const compressed = await compressImageFile(file)
      const form = new FormData()
      form.append('file', compressed, 'edit.jpg')
      form.append('kind', 'posters')
      if (businessId) form.append('businessId', businessId)

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: businessId ? { 'x-business-id': businessId } : undefined,
        body: form,
      })
      const payload = await parseJsonSafe(res)
      if (!res.ok) throw new Error(String(payload.error || 'Gagal upload gambar.'))
      const path = String(payload.localPath || payload.url || '')
      if (!path) throw new Error('Upload OK tapi path gambar kosong.')
      URL.revokeObjectURL(localPreview)
      setPosterUrl(path)
      setPhoto(path)
      setPosterStatus('ready')
      setPosterError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal ubah gambar.')
    } finally {
      setImageBusy(false)
    }
  }

  /** Edit mode: generate ulang poster via Genity */
  async function regeneratePosterOnly() {
    setImageBusy(true)
    setError(null)
    setPosterError(null)
    setPosterStatus('loading')
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (businessId) headers['x-business-id'] = businessId
      const catalogMatch = catalog.find(
        (p) =>
          productName &&
          (p.name.toLowerCase().includes(productName.toLowerCase()) ||
            productName.toLowerCase().includes(p.shortName.toLowerCase())),
      )
      // Foto user dulu; catalog image HANYA jika nama produk cocok
      const refPhoto = photo || posterUrl || (catalogMatch ? catalogMatch.image : undefined)
      const safeRef =
        refPhoto &&
        !(refPhoto.startsWith('data:image/') && refPhoto.length > 200_000) &&
        !refPhoto.startsWith('blob:')
          ? refPhoto
          : undefined
      const res = await fetch('/api/ai/poster', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          // Jangan fallback profile.brand / catalog bila user upload produk lain
          productName: productName.trim() || (catalogMatch ? catalogMatch.name : undefined),
          style,
          platform: platforms[0] || editItem?.platform || 'Instagram',
          description: catalogMatch?.description || undefined,
          aspectRatio: posterAspect,
          resolution: '1K',
          userPrompt: userPrompt.trim() || undefined,
          referenceImage: safeRef,
          referenceImageUrl: catalogMatch && !photo ? catalogMatch.image : undefined,
        }),
      })
      const payload = await parseJsonSafe(res)
      if (!res.ok) throw new Error(String(payload.error || 'Gagal generate poster.'))
      const path = String(payload.localPath || payload.url || '')
      if (!path) throw new Error('Poster generated tapi URL kosong.')
      setPosterUrl(path)
      setPhoto(path)
      setPosterStatus('ready')
    } catch (cause) {
      setPosterStatus('error')
      setPosterError(cause instanceof Error ? cause.message : 'Gagal generate poster.')
    } finally {
      setImageBusy(false)
    }
  }

  function togglePlatform(p: Platform) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
  }

  function canStart(): boolean {
    if (platforms.length === 0 && needCaption) return false
    // Minimal: nama produk ATAU prompt ATAU foto
    if (!productName.trim() && !userPrompt.trim() && !photo) return false
    // Caption butuh minimal 1 platform
    if (needCaption && platforms.length === 0) return false
    return true
  }

  function startGenerate() {
    setError(null)
    setPosterError(null)
    setPosterUrl(null)
    setPosterStatus(needPoster ? 'loading' : 'idle')
    setCaptions({})
    setStep('processing')
  }

  /**
   * Caption → Gemini /api/ai
   * Poster  → Genity /api/ai/poster
   */
  useEffect(() => {
    if (step !== 'processing') return
    const controller = new AbortController()

    async function generate() {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (businessId) headers['x-business-id'] = businessId

        const catalogMatch = catalog.find(
          (p) =>
            productName &&
            (p.name.toLowerCase().includes(productName.toLowerCase()) ||
              productName.toLowerCase().includes(p.shortName.toLowerCase())),
        )
        // Foto user = prioritas. Catalog image hanya jika nama cocok (anti-leak multi-tenant).
        // Server resolve data URL / /products/... — jangan paksa brand toko ke produk luar.
        const productPhotoForPoster =
          photo || (catalogMatch ? catalogMatch.image : undefined) || undefined
        const resolvedProductName =
          productName.trim() || (catalogMatch ? catalogMatch.name : '') || undefined

        const captionPromise = needCaption
          ? fetch('/api/ai', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                task: 'caption',
                // Jangan default ke profile.brand saat user upload produk lain
                productName: resolvedProductName || (photo ? 'Produk dari foto' : 'Produk'),
                style,
                platforms: platforms.length ? platforms : ['Instagram'],
                image: photo,
                userPrompt: userPrompt.trim() || undefined,
              }),
              signal: controller.signal,
            }).then(async (response) => {
              const payload = await parseJsonSafe(response)
              if (!response.ok) throw new Error(String(payload.error || 'Gemini gagal membuat caption.'))
              return payload
            })
          : Promise.resolve(null)

        const posterPromise = needPoster
          ? fetch('/api/ai/poster', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                productName: resolvedProductName,
                style,
                platform: platforms[0] || 'Instagram',
                // Deskripsi katalog hanya jika match
                description: catalogMatch?.description,
                aspectRatio: posterAspect,
                resolution: '1K',
                // Jangan kirim data URL raksasa ke Genity lewat body Vercel
                referenceImage:
                  productPhotoForPoster &&
                  !(
                    productPhotoForPoster.startsWith('data:image/') &&
                    productPhotoForPoster.length > 200_000
                  )
                    ? productPhotoForPoster
                    : undefined,
                referenceImageUrl: catalogMatch && !photo ? catalogMatch.image : undefined,
                userPrompt: userPrompt.trim() || undefined,
              }),
              signal: controller.signal,
            }).then(async (response) => {
              const payload = await parseJsonSafe(response)
              if (!response.ok) throw new Error(String(payload.error || 'Genity gagal generate poster.'))
              return payload as { url: string; localPath?: string }
            })
          : Promise.resolve(null)

        const [captionResult, posterResult] = await Promise.allSettled([
          captionPromise,
          posterPromise,
        ])

        // Caption mode: caption wajib berhasil
        if (needCaption) {
          if (captionResult.status === 'rejected') {
            throw captionResult.reason instanceof Error
              ? captionResult.reason
              : new Error('Gemini gagal membuat caption.')
          }
          const caps = captionResult.value?.captions
          setCaptions(
            caps && typeof caps === 'object' && !Array.isArray(caps)
              ? (caps as Record<string, string>)
              : {},
          )
        } else {
          // Poster only: isi deskripsi ringkas dari prompt/nama agar tetap bisa disimpan ke Konten
          const fallbackText =
            userPrompt.trim() ||
            `Poster ${productName || profile?.brand || 'produk'} — dibuat dengan AI.`
          const plat = platforms[0] || 'Instagram'
          setCaptions({ [plat]: fallbackText })
          if (platforms.length === 0) setPlatforms(['Instagram'])
        }

        if (needPoster) {
          if (posterResult.status === 'fulfilled' && posterResult.value?.url) {
            setPosterUrl(posterResult.value.localPath || posterResult.value.url)
            setPosterStatus('ready')
            setPosterError(null)
          } else {
            const msg =
              posterResult.status === 'rejected'
                ? posterResult.reason instanceof Error
                  ? posterResult.reason.message
                  : 'Gagal generate poster.'
                : 'Poster tidak tersedia.'
            // Poster-only: gagal = error total
            if (mode === 'poster') throw new Error(msg)
            setPosterStatus('error')
            setPosterError(msg)
          }
        }

        setStep('result')
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Gagal memproses konten.')
        setStep('upload')
        setPosterStatus('idle')
      }
    }

    void generate()
    return () => controller.abort()
  }, [
    step,
    mode,
    needCaption,
    needPoster,
    platforms,
    productName,
    style,
    photo,
    posterAspect,
    userPrompt,
    businessId,
    catalog,
    profile?.brand,
  ])

  async function copyCaption(p: Platform) {
    try {
      await navigator.clipboard.writeText(captions[p] ?? '')
      setCopied(p)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      /* ignore */
    }
  }

  /** Paksa unduh file gambar (bukan cuma buka tab baru) */
  async function downloadImage(url: string) {
    try {
      const nameFromPath =
        url.split('?')[0].split('/').filter(Boolean).pop() || `poster-${Date.now()}.png`
      const response = await fetch(url)
      if (!response.ok) throw new Error('fetch failed')
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = nameFromPath
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      // Fallback: buka di tab (beberapa host blok unduh silang-origin)
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  async function save(status: 'Draft' | 'Terposting') {
    try {
      setError(null)
      // Jangan kirim data URL raksasa ke API (body limit Vercel)
      let imageForSave = posterUrl || photo || '/placeholder.svg'
      if (
        typeof imageForSave === 'string' &&
        imageForSave.startsWith('data:image/') &&
        imageForSave.length > 200_000
      ) {
        imageForSave = '/placeholder.svg'
      }
      const plats =
        isEdit && editItem
          ? [editItem.platform]
          : platforms.length
            ? platforms
            : (['Instagram'] as Platform[])

      if (isEdit && editItem) {
        await updateContent(editItem.id, {
          title: productName.trim() || editItem.title,
          description: captions[editItem.platform] ?? editItem.description,
          image: imageForSave,
          status,
        })
      } else {
        const items: Omit<ContentItem, 'id' | 'createdAt'>[] = plats.map((p) => ({
          title: productName.trim() || profile?.brand || 'Konten Baru',
          description: captions[p] ?? captions[plats[0]] ?? (userPrompt.trim() || 'Konten AI'),
          image: imageForSave,
          platform: p,
          status,
        }))
        if (!items.length) {
          throw new Error('Pilih minimal 1 platform sebelum menyimpan.')
        }
        await addContents(items)
      }
      closeContentModal()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan konten.')
    }
  }

  const processingTexts =
    mode === 'caption' ? TEXTS_CAPTION : mode === 'poster' ? TEXTS_POSTER : TEXTS_BOTH

  const ctaLabel =
    mode === 'caption'
      ? 'Generate Caption ✨'
      : mode === 'poster'
        ? 'Generate Poster ✨'
        : 'Generate Caption + Poster ✨'

  const resultTitle = isEdit
    ? 'Edit Konten'
    : mode === 'caption'
      ? 'Caption Siap ✓'
      : mode === 'poster'
        ? 'Poster Siap ✓'
        : posterUrl
          ? 'Caption & Poster Siap ✓'
          : 'Konten Siap ✓'

  return (
    <Modal
      isOpen={open}
      onClose={closeContentModal}
      title={
        step === 'result'
          ? resultTitle
          : step === 'processing'
            ? mode === 'caption'
              ? 'Gemini menyusun caption...'
              : mode === 'poster'
                ? 'Genity membuat poster...'
                : 'Gemini + Genity bekerja...'
            : 'Buat Konten Baru'
      }
      subtitle={
        step === 'upload'
          ? 'Pilih mode · Caption = Gemini · Poster = Genity'
          : undefined
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
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            {/* ── 3 opsi generate ── */}
            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-semibold">Apa yang mau digenerate?</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {GENERATE_MODES.map((m) => {
                  const active = mode === m.key
                  const Icon = m.icon
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMode(m.key)}
                      className={`flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition-all active:scale-[0.98] ${
                        active
                          ? 'border-accent bg-accent/10 shadow-[0_0_0_1px_var(--accent)]'
                          : 'border-border hover:border-accent/30'
                      }`}
                    >
                      <span
                        className={`flex size-8 items-center justify-center rounded-lg ${
                          active ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="text-sm font-semibold leading-snug">{m.label}</span>
                      <span className="text-[11px] leading-snug text-muted-foreground">{m.desc}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            {/* Foto — lebih relevan untuk caption; opsional untuk poster */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`relative flex min-h-36 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed p-4 transition-colors ${
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
                    height={144}
                    className="max-h-32 w-auto rounded-xl object-contain"
                  />
                  <span className="flex items-center gap-1.5 text-xs font-medium text-accent">
                    <Upload className="size-3.5" aria-hidden="true" />
                    Klik untuk ganti foto
                  </span>
                </>
              ) : (
                <>
                  <span className="flex size-11 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Camera className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold">Tarik foto atau klik pilih</span>
                  <span className="text-xs text-muted-foreground">
                    {mode === 'poster'
                      ? 'Disarankan — foto kemasan asli biar poster mirip produk (bukan tebak-tebakan)'
                      : 'Opsional — bantu Gemini lebih akurat'}
                  </span>
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

            <div className="flex flex-col gap-1.5">
              <label htmlFor="gc-product-name" className="text-xs font-semibold">
                Nama Produk
              </label>
              <input
                id="gc-product-name"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder={
                  catalog[0]?.shortName
                    ? `Contoh: ${catalog[0].shortName}`
                    : `Contoh: ${profile?.brand ?? 'Produk'} unggulan`
                }
                className="h-10 w-full rounded-xl border border-input bg-background/60 px-3.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </div>

            {/* Prompt bebas */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="gc-user-prompt" className="text-xs font-semibold">
                Prompt / instruksi{' '}
                <span className="font-normal text-muted-foreground">(opsional, ketik bebas)</span>
              </label>
              <textarea
                id="gc-user-prompt"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                rows={3}
                placeholder={
                  mode === 'poster'
                    ? 'Contoh: poster clean putih, botol besar di tengah, suasana kamar mandi modern'
                    : mode === 'caption'
                      ? 'Contoh: tonjolkan harga hemat, ajakan order via WA, hashtag jualan'
                      : 'Contoh: gaya promo Ramadan, teks ramah, poster cerah dengan produk menonjol'
                }
                className="w-full resize-y rounded-xl border border-input bg-background/60 p-3 text-sm leading-relaxed outline-none transition-all placeholder:text-muted-foreground/60 focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </div>

            {/* Platform — penting untuk caption; poster pakai default platform pertama */}
            {(needCaption || needPoster) && (
              <fieldset className="flex flex-col gap-2">
                <legend className="text-xs font-semibold">
                  Platform Tujuan
                  {!needCaption && (
                    <span className="ml-1 font-normal text-muted-foreground">(untuk label konten)</span>
                  )}
                </legend>
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
            )}

            {(needCaption || needPoster) && (
              <fieldset className="flex flex-col gap-2">
                <legend className="text-xs font-semibold">
                  Gaya AI {needCaption && needPoster ? '(Caption + Poster)' : needCaption ? '(Caption · Gemini)' : '(Poster · Genity)'}
                </legend>
                <div role="radiogroup" aria-label="Gaya AI" className="flex flex-wrap gap-2">
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
                <p className="text-[11px] text-muted-foreground">
                  Default dari Setting AI: {normalizeAiTone(profile?.ai?.tone)}. Pilihan di sini dipakai
                  generate ini saja.
                </p>
              </fieldset>
            )}

            {needPoster && (
              <fieldset className="flex flex-col gap-2">
                <legend className="text-xs font-semibold">Rasio Poster (Genity)</legend>
                <div className="flex flex-wrap gap-2">
                  {POSTER_ASPECTS.map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => setPosterAspect(a.key)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                        posterAspect === a.key
                          ? 'border-accent bg-accent/15 text-accent'
                          : 'border-border text-muted-foreground hover:border-accent/30'
                      }`}
                    >
                      {a.label} · {a.hint}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <button
              type="button"
              disabled={!canStart()}
              onClick={startGenerate}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-bold text-accent-foreground transition-all animate-glow-breathe hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              {ctaLabel}
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              Hasil disimpan ke tab <strong>Konten</strong> setelah kamu klik simpan.
            </p>
          </motion.div>
        )}

        {step === 'processing' && (
          <ProcessingState
            key="processing"
            texts={processingTexts}
            durationMs={needPoster ? 45_000 : 2_500}
          />
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

            {/* Gambar / Poster — selalu tampil di edit; di create jika mode poster/both */}
            {(isEdit || needPoster || posterUrl) && (
              <div className="flex flex-col gap-3 rounded-2xl border border-accent/25 bg-accent/[0.06] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <ImageIcon className="size-4 text-accent" aria-hidden="true" />
                    {isEdit ? 'Gambar konten' : 'Poster (Genity)'}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {posterUrl && (
                      <button
                        type="button"
                        onClick={() => void downloadImage(posterUrl)}
                        className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-all hover:border-accent/40 hover:bg-secondary"
                      >
                        <Download className="size-3" aria-hidden="true" />
                        Unduh
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={imageBusy}
                      onClick={() => editImageInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-all hover:border-accent/40 hover:bg-secondary disabled:opacity-50"
                    >
                      <Upload className="size-3" aria-hidden="true" />
                      {imageBusy ? 'Mengunggah…' : 'Ubah gambar'}
                    </button>
                    <button
                      type="button"
                      disabled={imageBusy}
                      onClick={() => void regeneratePosterOnly()}
                      className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent transition-all hover:bg-accent/20 disabled:opacity-50"
                    >
                      <Sparkles className="size-3" aria-hidden="true" />
                      {imageBusy ? 'Memproses…' : 'Generate ulang poster'}
                    </button>
                  </div>
                </div>
                <input
                  ref={editImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => void onEditImageChange(e)}
                  className="sr-only"
                  aria-label="Ubah gambar konten"
                />

                {/* Prompt singkat untuk regenerate di mode edit */}
                {isEdit && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="edit-poster-prompt" className="text-[11px] font-medium text-muted-foreground">
                      Prompt regenerate (opsional)
                    </label>
                    <input
                      id="edit-poster-prompt"
                      type="text"
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder="Contoh: background putih, produk lebih besar"
                      className="h-9 w-full rounded-xl border border-input bg-background/60 px-3 text-xs outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {POSTER_ASPECTS.map((a) => (
                        <button
                          key={a.key}
                          type="button"
                          onClick={() => setPosterAspect(a.key)}
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                            posterAspect === a.key
                              ? 'border-accent bg-accent/15 text-accent'
                              : 'border-border text-muted-foreground'
                          }`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {posterStatus === 'loading' || imageBusy ? (
                  <p className="text-xs text-muted-foreground">Memproses gambar…</p>
                ) : (posterStatus === 'ready' || isEdit) && (posterUrl || photo) ? (
                  <>
                    <div className="relative mx-auto w-full max-w-xs overflow-hidden rounded-xl border border-border bg-background">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={posterUrl || photo || '/placeholder.svg'}
                        alt="Gambar konten"
                        className="h-auto w-full object-contain"
                      />
                    </div>
                    <p className="text-center text-[11px] text-muted-foreground">
                      File:{' '}
                      <span className="break-all font-mono text-foreground/80">
                        {posterUrl || photo}
                      </span>
                    </p>
                  </>
                ) : posterStatus === 'error' ? (
                  <p className="text-xs text-destructive">
                    {posterError || 'Gambar gagal.'}
                    {needCaption ? ' Caption di bawah tetap bisa dipakai.' : ''}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Belum ada gambar. Klik <strong>Ubah gambar</strong> atau{' '}
                    <strong>Generate ulang poster</strong>.
                  </p>
                )}
              </div>
            )}

            {/* Captions — selalu tampil jika mode caption/both, atau deskripsi poster-only */}
            {(needCaption || mode === 'poster') &&
              (isEdit && editItem
                ? [editItem.platform]
                : needCaption
                  ? platforms
                  : platforms.length
                    ? platforms
                    : (['Instagram'] as Platform[])
              ).map((p) => (
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
                      {needCaption ? p : `${p} · catatan konten`}
                    </span>
                    {needCaption && (
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
                    )}
                  </div>
                  <textarea
                    value={captions[p] ?? ''}
                    onChange={(e) => setCaptions((prev) => ({ ...prev, [p]: e.target.value }))}
                    rows={needCaption ? 5 : 3}
                    aria-label={needCaption ? `Caption untuk ${p}` : `Catatan untuk ${p}`}
                    className="w-full resize-y rounded-xl border border-input bg-background/60 p-3 text-sm leading-relaxed outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/25"
                  />
                </div>
              ))}

            <p className="text-center text-[11px] text-muted-foreground">
              Setelah disimpan, buka tab <strong className="text-foreground">Konten</strong> → tombol{' '}
              <strong className="text-[#E1306C]">Post ke IG</strong> untuk salin caption + unduh poster ke
              Instagram.
            </p>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => void save('Draft')}
                className="flex h-11 flex-1 items-center justify-center rounded-full border border-border text-sm font-semibold transition-all hover:border-accent/40 hover:bg-secondary active:scale-[0.98]"
              >
                Simpan ke Konten (Draft)
              </button>
              <button
                type="button"
                onClick={() => void save('Terposting')}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-accent text-sm font-bold text-accent-foreground transition-all hover:opacity-90 active:scale-[0.98]"
              >
                <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                Simpan · Sudah Diposting
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}

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
    }, Math.max(800, durationMs / Math.max(texts.length, 1)))
    return () => clearInterval(interval)
  }, [texts.length, durationMs])

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

      <div className="h-1 w-48 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: Math.min(durationMs / 1000, 60), ease: 'easeInOut' }}
          className="h-full rounded-full bg-accent"
        />
      </div>
    </motion.div>
  )
}
