'use client'

import { useDashboard } from '@/lib/dashboard-store'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Link2Off,
  Loader2,
  RefreshCw,
  Shield,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { InstagramIcon } from './brand-icons'

type IgStatus = {
  connected: boolean
  username: string | null
  accountIdMasked: string | null
  hasToken: boolean
  connectedAt: string | null
  apiAvailable: boolean
  credentialSource: 'business' | 'env' | null
}

type Tab = 'graph' | 'private'

export function InstagramConnectSection() {
  const { businessId, profile, refresh } = useDashboard()
  const [tab, setTab] = useState<Tab>('private')
  const [status, setStatus] = useState<IgStatus | null>(null)
  const [gatewayOk, setGatewayOk] = useState<boolean | null>(null)
  const [gatewayBase, setGatewayBase] = useState<string>('')

  // Graph API fields
  const [accountId, setAccountId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [username, setUsername] = useState('')
  const [showToken, setShowToken] = useState(false)

  // Private API fields
  const [igUser, setIgUser] = useState('')
  const [igPass, setIgPass] = useState('')
  const [ig2fa, setIg2fa] = useState('')
  const [sessionCookie, setSessionCookie] = useState('')
  const [showPass, setShowPass] = useState(false)

  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const privateConnected = Boolean(
    profile?.instagram?.privateMode && profile?.instagram?.privateSessionId,
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
      const [res, gw] = await Promise.all([
        fetch(`/api/instagram/connect${q}`),
        fetch('/api/instagram/private/login'),
      ])
      const data = await res.json().catch(() => ({}))
      const gwData = await gw.json().catch(() => ({}))
      // Gateway status harus tetap di-set meski status usaha error
      setGatewayOk(Boolean(gwData.gatewayHealthy))
      setGatewayBase(String(gwData.baseUrl || gwData.docsUrl || '').replace(/\/docs$/, ''))
      if (!res.ok && data.error) {
        // Soft fail — jangan blok status gateway
        setError(String(data.error))
      } else {
        setStatus({
          connected: Boolean(data.connected),
          username: data.username,
          accountIdMasked: data.accountIdMasked,
          hasToken: Boolean(data.hasToken),
          connectedAt: data.connectedAt,
          apiAvailable: Boolean(data.apiAvailable),
          credentialSource: data.credentialSource,
        })
        if (data.username) setUsername(data.username)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (profile?.instagram?.username) {
      setUsername(profile.instagram.username)
      setIgUser(profile.instagram.username)
    }
  }, [profile?.instagram?.username])

  async function connectGraph() {
    setBusy(true)
    setError(null)
    setOkMsg(null)
    try {
      const res = await fetch('/api/instagram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          accountId: accountId.trim(),
          accessToken: accessToken.trim(),
          username: username.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menghubungkan Instagram')
      setOkMsg(data.message || 'Terhubung')
      setAccessToken('')
      setAccountId('')
      await load()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal connect')
    } finally {
      setBusy(false)
    }
  }

  async function connectPrivate() {
    setBusy(true)
    setError(null)
    setOkMsg(null)
    try {
      const res = await fetch('/api/instagram/private/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          username: igUser.trim() || undefined,
          password: igPass || undefined,
          verificationCode: ig2fa.trim() || undefined,
          sessionCookie: sessionCookie.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login private API gagal')
      setOkMsg(data.message || 'Session tersimpan')
      if (data.disclaimer) setOkMsg(`${data.message} — ${data.disclaimer}`)
      setIgPass('')
      setIg2fa('')
      setSessionCookie('')
      await load()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal login private')
    } finally {
      setBusy(false)
    }
  }

  async function disconnectGraph() {
    if (!window.confirm('Putuskan token Graph API dari usaha ini?')) return
    setBusy(true)
    setError(null)
    try {
      const q = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
      const res = await fetch(`/api/instagram/connect${q}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memutus')
      setOkMsg(data.message || 'Terputus')
      await load()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal disconnect')
    } finally {
      setBusy(false)
    }
  }

  async function disconnectPrivate() {
    if (!window.confirm('Hapus session private API dari usaha ini?')) return
    setBusy(true)
    setError(null)
    try {
      const q = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ''
      const res = await fetch(`/api/instagram/private/login${q}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal')
      setOkMsg(data.message || 'Session dihapus')
      await load()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal')
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.section
      id="instagram"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="card-gradient-border rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="mb-1 flex items-center gap-2">
        <InstagramIcon className="size-4 text-[#E1306C]" />
        <h3 className="font-display text-base font-bold">Instagram usaha</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Hubungkan IG <strong>per usaha/client</strong>. Post caption + poster dari tab Konten.
      </p>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-full border border-border bg-background/60 p-1">
        <button
          type="button"
          onClick={() => setTab('private')}
          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            tab === 'private' ? 'bg-[#E1306C] text-white' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Demo Private API
        </button>
        <button
          type="button"
          onClick={() => setTab('graph')}
          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            tab === 'graph' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Graph API (resmi)
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 font-semibold text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {tab === 'private' && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-accent-warm/40 bg-accent-warm/10 px-3.5 py-3 text-[11px] leading-relaxed text-muted-foreground">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
              <AlertTriangle className="size-3.5 text-accent-warm" />
              DEMO ONLY — unofficial (aiograpi-rest)
            </p>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>Login username+password seperti app mobile Instagram</li>
              <li>
                <strong>Risiko ban / challenge / melanggar ToS Meta</strong>
              </li>
              <li>Password tidak disimpan — hanya session id di server</li>
              <li>Jangan pakai password IG client production</li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${
                gatewayOk
                  ? 'border-accent/30 bg-accent/10 text-accent'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              }`}
            >
              <span className={`size-1.5 rounded-full ${gatewayOk ? 'bg-accent' : 'bg-destructive'}`} />
              {gatewayOk === null
                ? 'Cek gateway…'
                : gatewayOk
                  ? 'aiograpi-rest online'
                  : 'aiograpi-rest offline'}
            </span>
            {gatewayBase && (
              <span className="max-w-full truncate font-mono text-[11px] text-muted-foreground">
                {gatewayBase}
              </span>
            )}
            {privateConnected && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 font-medium text-accent">
                <CheckCircle2 className="size-3" />
                Session aktif
                {profile?.instagram?.username ? ` @${profile.instagram.username}` : ''}
              </span>
            )}
          </div>

          {!gatewayOk && (
            <p className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              {gatewayBase?.includes('railway') || gatewayBase?.startsWith('https://') ? (
                <>
                  Gateway production offline. Cek Railway service <strong>aiograpi</strong> Online,
                  lalu refresh. URL: <span className="font-mono break-all">{gatewayBase}</span>
                </>
              ) : (
                <>
                  Lokal: <span className="font-mono">docker compose up -d aiograpi</span>
                  <br />
                  Production: set env Vercel{' '}
                  <span className="font-mono">AIOGRAPI_BASE_URL</span> ke URL Railway aiograpi.
                </>
              )}
            </p>
          )}

          {privateConnected ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void disconnectPrivate()}
              className="flex min-h-10 items-center justify-center gap-2 rounded-full border border-destructive/40 px-4 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Link2Off className="size-3.5" />}
              Hapus session private
            </button>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Username IG</span>
                <input
                  value={igUser}
                  onChange={(e) => setIgUser(e.target.value)}
                  placeholder="kopag.id"
                  className="h-10 rounded-xl border border-input bg-background/60 px-3 text-sm outline-none focus:border-accent"
                  autoComplete="off"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Password IG</span>
                <span className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={igPass}
                    onChange={(e) => setIgPass(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 w-full rounded-xl border border-input bg-background/60 py-2 pl-3 pr-10 text-sm outline-none focus:border-accent"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                  >
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Kode 2FA (jika diminta)
                </span>
                <input
                  value={ig2fa}
                  onChange={(e) => setIg2fa(e.target.value)}
                  placeholder="123456"
                  className="h-10 rounded-xl border border-input bg-background/60 px-3 font-mono text-sm outline-none focus:border-accent"
                />
              </label>
              <div className="relative py-1 text-center text-[10px] text-muted-foreground">
                <span className="bg-card px-2">atau</span>
                <span className="absolute inset-x-0 top-1/2 h-px -z-10 bg-border" />
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Cookie <code className="text-accent">sessionid</code> dari browser (disarankan)
                </span>
                <input
                  value={sessionCookie}
                  onChange={(e) => setSessionCookie(e.target.value)}
                  placeholder="41314749538:xxxx:13:AYg...  (boleh ada %3A, auto-decode)"
                  className="h-10 rounded-xl border border-input bg-background/60 px-3 font-mono text-xs outline-none focus:border-accent"
                />
                <span className="text-[10px] leading-relaxed text-muted-foreground">
                  Chrome → buka instagram.com (pastikan masih login) → F12 → Application → Cookies →
                  instagram.com → baris <strong>sessionid</strong> → salin <strong>Value</strong>.
                  Jangan salin Name. Setelah simpan, coba Post ke IG lagi. Jika muncul{' '}
                  <code className="text-destructive">login_required</code>, session sudah hangus —
                  ambil value baru.
                </span>
              </label>
              <button
                type="button"
                disabled={
                  busy ||
                  !gatewayOk ||
                  (!sessionCookie.trim() && (!igUser.trim() || !igPass))
                }
                onClick={() => void connectPrivate()}
                className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#E1306C] text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <InstagramIcon className="size-4" />}
                Login & simpan session (demo)
              </button>
            </>
          )}
        </div>
      )}

      {tab === 'graph' && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-border bg-secondary/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <p className="mb-1 flex items-center gap-1 font-semibold text-foreground">
              <Shield className="size-3.5 text-accent" />
              Graph API resmi Meta (Business/Creator + token)
            </p>
            <p>
              Tanpa token: tetap bisa <strong>Post ke IG</strong> mode bantu (salin + unduh).
            </p>
          </div>

          {status?.connected ? (
            <div className="flex flex-col gap-3 rounded-xl border border-accent/25 bg-accent/8 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-accent" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {status.username ? `@${status.username}` : 'Instagram Business'}
                  </p>
                  {status.accountIdMasked && (
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      Account ID: {status.accountIdMasked}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void disconnectGraph()}
                className="flex min-h-10 items-center justify-center gap-2 rounded-full border border-destructive/40 px-4 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Link2Off className="size-3.5" />}
                Putuskan Graph API
              </button>
            </div>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">@username (opsional)</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-10 rounded-xl border border-input bg-background/60 px-3 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Instagram Business Account ID *
                </span>
                <input
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="17841400…"
                  className="h-10 rounded-xl border border-input bg-background/60 px-3 font-mono text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Access Token *</span>
                <span className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="h-10 w-full rounded-xl border border-input bg-background/60 py-2 pl-3 pr-10 font-mono text-sm outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                  >
                    {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </span>
              </label>
              <button
                type="button"
                disabled={busy || !accountId.trim() || !accessToken.trim()}
                onClick={() => void connectGraph()}
                className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent text-sm font-bold text-accent-foreground disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <InstagramIcon className="size-4" />}
                Hubungkan Graph API
              </button>
            </>
          )}
        </div>
      )}

      <AnimatePresence>
        {(error || okMsg) && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-3 rounded-xl px-3 py-2 text-xs ${
              error
                ? 'border border-destructive/30 bg-destructive/10 text-destructive'
                : 'border border-accent/30 bg-accent/10 text-accent'
            }`}
            role="status"
          >
            {error || okMsg}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
