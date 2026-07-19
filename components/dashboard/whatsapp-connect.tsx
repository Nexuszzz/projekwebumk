'use client'

import { useDashboard } from '@/lib/dashboard-store'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2,
  Link2Off,
  Loader2,
  MessageCircle,
  QrCode,
  RefreshCw,
  Smartphone,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type StatusPayload = {
  configured: boolean
  gowaBaseUrl: string
  gowaHealthy: boolean
  deviceId: string
  phone: string
  jid: string
  autoReply: boolean
  isConnected: boolean
  isLoggedIn: boolean
  remoteError: string | null
}

export function WhatsAppConnectSection() {
  const { businessId, profile, refresh } = useDashboard()
  const [status, setStatus] = useState<StatusPayload | null>(null)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pairCode, setPairCode] = useState<string | null>(null)
  const [qrLink, setQrLink] = useState<string | null>(null)
  const [instructions, setInstructions] = useState<string | null>(null)
  const [mode, setMode] = useState<'code' | 'qr'>('code')

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
      const res = await fetch(`/api/whatsapp/status${q}`)
      const data = await res.json()
      // Selalu set status (termasuk gowaHealthy) meski needsOnboarding
      if (data && (data.gowaBaseUrl !== undefined || data.gowaHealthy !== undefined)) {
        setStatus(data)
        setPhone((prev) => prev || data.phone || '')
      }
      if (!res.ok && data.error) {
        setError(String(data.error))
        return
      }
      if (!res.ok) throw new Error(data.error || 'Gagal memuat status WhatsApp')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat status')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (profile?.phone && !phone) setPhone(profile.phone)
  }, [profile?.phone, phone])

  // Poll status saat menunggu pairing
  useEffect(() => {
    if (!pairCode && !qrLink) return
    if (status?.isLoggedIn) return
    const t = window.setInterval(() => {
      void loadStatus()
    }, 4000)
    return () => window.clearInterval(t)
  }, [pairCode, qrLink, status?.isLoggedIn, loadStatus])

  async function connect(nextMode: 'code' | 'qr') {
    setBusy(true)
    setError(null)
    setPairCode(null)
    setQrLink(null)
    setInstructions(null)
    setMode(nextMode)
    try {
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          phone: phone.trim(),
          mode: nextMode,
          autoReply: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menghubungkan WhatsApp')
      setInstructions(data.instructions || null)
      if (data.pairCode) setPairCode(data.pairCode)
      if (data.qrLink) setQrLink(data.qrLink)
      await loadStatus()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal connect')
    } finally {
      setBusy(false)
    }
  }

  async function disconnect() {
    if (!window.confirm('Putuskan WhatsApp dari usaha ini?')) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memutus WhatsApp')
      setPairCode(null)
      setQrLink(null)
      setInstructions(null)
      await loadStatus()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal disconnect')
    } finally {
      setBusy(false)
    }
  }

  const loggedIn = Boolean(status?.isLoggedIn)

  return (
    <motion.section
      id="whatsapp"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-border bg-card p-5 sm:p-6 card-gradient-border"
    >
      <div className="mb-1 flex items-center gap-2">
        <MessageCircle className="size-4 text-accent" aria-hidden="true" />
        <h3 className="font-display text-base font-bold">WhatsApp Chatbot</h3>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Hubungkan nomor WhatsApp toko lewat GOWA. Pelanggan chat → AI balas otomatis (harga, stok,
        order).
      </p>

      {/* Gateway status */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${
            status?.gowaHealthy
              ? 'border-accent/30 bg-accent/10 text-accent'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${status?.gowaHealthy ? 'bg-accent' : 'bg-destructive'}`}
          />
          {loading && !status
            ? 'Memuat…'
            : status?.gowaHealthy
              ? 'Gateway GOWA online'
              : 'Gateway GOWA offline'}
        </span>
        {status?.gowaBaseUrl && (
          <span className="font-mono text-[11px] text-muted-foreground">{status.gowaBaseUrl}</span>
        )}
        <button
          type="button"
          onClick={() => void loadStatus()}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 font-semibold text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!status?.gowaHealthy && (
        <div className="mb-4 rounded-xl border border-accent-warm/30 bg-accent-warm/10 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">Gateway GOWA offline</p>
          {status?.gowaBaseUrl &&
          (status.gowaBaseUrl.includes('railway') || status.gowaBaseUrl.startsWith('https://')) ? (
            <ol className="mt-1.5 list-decimal space-y-1 pl-4">
              <li>
                Cek Railway service <strong>gowa</strong> masih Online
              </li>
              <li>
                URL: <code className="break-all text-accent">{status.gowaBaseUrl}</code>
              </li>
              <li>Klik Refresh di atas. Kalau tetap offline, redeploy service gowa di Railway</li>
            </ol>
          ) : (
            <ol className="mt-1.5 list-decimal space-y-1 pl-4">
              <li>
                Lokal: <code className="text-accent">docker compose up -d gowa</code>
              </li>
              <li>
                Production: set env Vercel <code className="text-accent">GOWA_BASE_URL</code> ke URL
                Railway gowa
              </li>
              <li>Refresh halaman, isi nomor HP, lalu Hubungkan</li>
            </ol>
          )}
        </div>
      )}

      {loggedIn ? (
        <div className="flex flex-col gap-3 rounded-xl border border-accent/25 bg-accent/8 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">WhatsApp terhubung</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Nomor: <span className="font-mono text-foreground">{status?.phone || '—'}</span>
              </p>
              {status?.jid && (
                <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                  JID: {status.jid}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Auto-reply AI: {status?.autoReply ? 'Aktif' : 'Nonaktif'} · Device:{' '}
                <span className="font-mono">{status?.deviceId}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void disconnect()}
            className="flex min-h-10 items-center justify-center gap-2 rounded-full border border-destructive/40 px-4 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Link2Off className="size-3.5" />
            Putuskan WhatsApp
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Nomor HP WhatsApp toko
            </span>
            <span className="relative">
              <Smartphone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="tel"
                inputMode="tel"
                placeholder="081234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background/60 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </span>
            <span className="text-[11px] text-muted-foreground">
              Boleh 08…, 8…, atau 62…. Kode pairing akan muncul di sini — masukkan di HP.
            </span>
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={busy || !status?.gowaHealthy || !phone.trim()}
              onClick={() => void connect('code')}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-accent text-sm font-bold text-accent-foreground disabled:opacity-50"
            >
              {busy && mode === 'code' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Smartphone className="size-4" />
              )}
              Hubungkan via Nomor HP
            </button>
            <button
              type="button"
              disabled={busy || !status?.gowaHealthy}
              onClick={() => void connect('qr')}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-border text-sm font-semibold hover:border-accent/40 disabled:opacity-50"
            >
              {busy && mode === 'qr' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <QrCode className="size-4" />
              )}
              Atau scan QR
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {(pairCode || qrLink) && !loggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 rounded-xl border border-accent/30 bg-accent/5 p-4"
          >
            {instructions && (
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{instructions}</p>
            )}
            {pairCode && (
              <div className="text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Kode pairing
                </p>
                <p className="mt-2 font-mono text-3xl font-bold tracking-[0.2em] text-accent sm:text-4xl">
                  {pairCode}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Di HP: WhatsApp → ⋮ / Settings → Linked devices → Link with phone number
                </p>
              </div>
            )}
            {qrLink && (
              <div className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrLink}
                  alt="QR WhatsApp"
                  className="size-48 rounded-xl border border-border bg-white p-2"
                />
                <p className="text-[11px] text-muted-foreground">Scan QR dengan WhatsApp di HP</p>
              </div>
            )}
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Menunggu perangkat tertaut… status di-refresh otomatis.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {status?.remoteError && !error && (
        <p className="mt-3 text-xs text-muted-foreground">Catatan: {status.remoteError}</p>
      )}
    </motion.section>
  )
}
