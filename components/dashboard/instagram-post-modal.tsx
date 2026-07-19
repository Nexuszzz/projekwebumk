'use client'

import { Modal } from '@/components/ui/modal'
import { useDashboard, type ContentItem } from '@/lib/dashboard-store'
import { Check, Copy, Download, ExternalLink, Loader2, Send } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { InstagramIcon } from './brand-icons'

type Props = {
  item: ContentItem | null
  isOpen: boolean
  onClose: () => void
}

export function InstagramPostModal({ item, isOpen, onClose }: Props) {
  const { businessId, refresh, profile } = useDashboard()
  const [caption, setCaption] = useState('')
  const [copied, setCopied] = useState(false)
  const [apiConfigured, setApiConfigured] = useState(false)
  const [privateSession, setPrivateSession] = useState(false)
  const [busy, setBusy] = useState<'api' | 'private' | 'assisted' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!item) return
    setCaption(item.description || item.title || '')
    setCopied(false)
    setError(null)
    setSuccess(null)
  }, [item])

  useEffect(() => {
    if (!isOpen) return
    const q = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
    void fetch(`/api/instagram/publish${q}`)
      .then((r) => r.json())
      .then((d) => setApiConfigured(Boolean(d.apiConfigured)))
      .catch(() => setApiConfigured(false))
    setPrivateSession(
      Boolean(profile?.instagram?.privateMode && profile?.instagram?.privateSessionId),
    )
  }, [isOpen, businessId, profile?.instagram?.privateMode, profile?.instagram?.privateSessionId])

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Gagal salin caption. Salin manual dari kotak teks.')
    }
  }

  async function downloadImage() {
    if (!item?.image) return
    try {
      const res = await fetch(item.image)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `umkman-ig-${item.id.slice(0, 8)}.${blob.type.includes('png') ? 'png' : 'jpg'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // fallback open
      window.open(item.image, '_blank', 'noopener,noreferrer')
    }
  }

  function openInstagram() {
    // App deep link fallback ke web
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer')
  }

  async function publishApi() {
    if (!item) return
    setBusy('api')
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: item.id,
          businessId,
          mode: 'api',
          caption,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal post ke Instagram')
      setSuccess(data.message || 'Berhasil diposting!')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal post API')
    } finally {
      setBusy(null)
    }
  }

  async function publishPrivate() {
    if (!item) return
    setBusy('private')
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/instagram/private/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: item.id,
          businessId,
          caption,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.hint || 'Gagal post private API')
      setSuccess(data.message || 'Berhasil diunggah (private API demo).')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal private post')
    } finally {
      setBusy(null)
    }
  }

  async function markAssistedDone() {
    if (!item) return
    setBusy('assisted')
    setError(null)
    try {
      const res = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: item.id,
          businessId,
          mode: 'assisted',
          caption,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menandai')
      setSuccess(data.message || 'Ditandai terposting')
      await refresh()
      window.setTimeout(() => onClose(), 900)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal')
    } finally {
      setBusy(null)
    }
  }

  if (!item) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Posting ke Instagram"
      subtitle="Pakai caption + poster yang sudah dibuat AI. Mode bantu (salin & unduh) selalu tersedia."
      maxWidth="sm:max-w-lg"
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-border">
            <Image
              src={item.image || '/placeholder.svg'}
              alt=""
              fill
              className="object-cover"
              sizes="96px"
              unoptimized
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[#E1306C]">
              <InstagramIcon className="size-3.5" />
              Feed Instagram
            </p>
            <p className="mt-1 font-display text-sm font-bold text-balance">{item.title}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {privateSession
                ? 'Session private API aktif (demo) — bisa unggah otomatis via aiograpi-rest.'
                : apiConfigured
                  ? 'Graph API usaha terhubung — post otomatis (butuh gambar HTTPS publik).'
                  : 'Belum login IG di Pengaturan → mode bantu, atau tab Demo Private API.'}
            </p>
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Caption</span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={5}
            className="w-full resize-y rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>

        {/* Assisted steps */}
        <ol className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/30 p-3 text-xs leading-relaxed text-muted-foreground">
          <li className="font-semibold text-foreground">Mode bantu (disarankan di laptop/HP):</li>
          <li>1. Salin caption</li>
          <li>2. Unduh poster</li>
          <li>3. Buka Instagram → pos baru → pilih poster → tempel caption → bagikan</li>
          <li>4. Kembali ke sini → “Sudah saya posting”</li>
        </ol>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => void copyCaption()}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-border text-xs font-semibold hover:border-accent/40"
          >
            {copied ? <Check className="size-3.5 text-accent" /> : <Copy className="size-3.5" />}
            {copied ? 'Tersalin' : 'Salin caption'}
          </button>
          <button
            type="button"
            onClick={() => void downloadImage()}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-border text-xs font-semibold hover:border-accent/40"
          >
            <Download className="size-3.5" />
            Unduh poster
          </button>
          <button
            type="button"
            onClick={openInstagram}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-[#E1306C]/40 bg-[#E1306C]/10 text-xs font-semibold text-[#E1306C] hover:bg-[#E1306C]/15"
          >
            <ExternalLink className="size-3.5" />
            Buka Instagram
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {privateSession && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void publishPrivate()}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#E1306C] text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === 'private' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Post otomatis (Private API demo)
            </button>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            {apiConfigured && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void publishApi()}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-[#E1306C]/50 text-sm font-bold text-[#E1306C] disabled:opacity-50"
              >
                {busy === 'api' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Post Graph API
              </button>
            )}
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void markAssistedDone()}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-accent text-sm font-bold text-accent-foreground disabled:opacity-50"
            >
              {busy === 'assisted' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Sudah saya posting
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-medium text-accent">
            {success}
          </p>
        )}
      </div>
    </Modal>
  )
}
