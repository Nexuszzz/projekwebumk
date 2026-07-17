'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Bell,
  Bot,
  Camera,
  Check,
  ChevronRight,
  Globe,
  KeyRound,
  Languages,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Monitor,
  Moon,
  Package,
  Phone,
  Plus,
  Receipt,
  Shield,
  Sparkles,
  Store,
  Sun,
  Trash2,
  User,
} from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/components/theme-provider'
import { AI_TONES, normalizeAiPreferences, type AiPreferences, type AiTone } from '@/lib/ai-style'
import { useDashboard } from '@/lib/dashboard-store'
import { normalizeLocale, normalizeNotifications } from '@/lib/preferences'
import type { NotificationPreferences } from '@/lib/types'

/* ================= Types & data ================= */

type SectionId = 'profil' | 'katalog' | 'notifikasi' | 'ai' | 'keamanan' | 'tampilan'

const SECTIONS: { id: SectionId; label: string; icon: typeof User; desc: string }[] = [
  { id: 'profil', label: 'Profil Usaha', icon: Store, desc: 'Identitas & info toko' },
  { id: 'katalog', label: 'Katalog Produk', icon: Package, desc: 'Harga & stok live' },
  { id: 'notifikasi', label: 'Notifikasi', icon: Bell, desc: 'Peringatan di aplikasi' },
  { id: 'ai', label: 'AI & Otomatisasi', icon: Bot, desc: 'Asisten cerdas' },
  { id: 'keamanan', label: 'Keamanan', icon: Shield, desc: 'Kata sandi & sesi' },
  { id: 'tampilan', label: 'Tampilan & Bahasa', icon: Monitor, desc: 'Tema & lokal' },
]

/* ================= Primitives ================= */

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${
        checked ? 'bg-accent' : 'bg-secondary border border-border'
      }`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={`absolute top-0.5 size-5 rounded-full shadow-sm ${
          checked ? 'right-0.5 bg-accent-foreground' : 'left-0.5 bg-muted-foreground'
        }`}
      />
    </button>
  )
}

function SettingRow({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon?: typeof Bell
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function SectionCard({
  id,
  title,
  desc,
  children,
  danger = false,
}: {
  id?: string
  title: string
  desc: string
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-2xl border p-5 sm:p-6 ${
        danger ? 'border-destructive/30 bg-destructive/[0.04]' : 'card-gradient-border bg-card'
      }`}
    >
      <div className="mb-1 flex items-center gap-2">
        {danger && <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />}
        <h3 className={`font-display text-base font-bold ${danger ? 'text-destructive' : ''}`}>
          {title}
        </h3>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">{desc}</p>
      {children}
    </motion.section>
  )
}

function Field({
  label,
  icon: Icon,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  icon?: typeof Mail
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border border-input bg-background/60 py-2.5 pr-3 text-sm transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20 ${
            Icon ? 'pl-9' : 'pl-3'
          }`}
        />
      </span>
    </label>
  )
}

/* ================= Sections ================= */

function ProfileSection() {
  const { profile, catalog, businessId, updateProfile } = useDashboard()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    brand: '',
    owner: '',
    email: '',
    phone: '',
    address: '',
  })

  useEffect(() => {
    if (!profile) return
    setForm({
      brand: profile.brand,
      owner: profile.owner,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
    })
  }, [profile])

  const logo =
    profile?.logo ||
    catalog[0]?.image ||
    'data:image/svg+xml,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect fill="#e8efe0" width="72" height="72" rx="16"/><text x="36" y="42" text-anchor="middle" font-size="14" fill="#5a7040" font-family="sans-serif">${(form.brand || 'UMKM').slice(0, 8)}</text></svg>`,
      )

  async function saveProfile() {
    setSaving(true)
    try {
      await updateProfile({
        brand: form.brand,
        owner: form.owner,
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.address.includes(',')
          ? form.address.split(',')[0].trim()
          : profile?.city,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : 'Gagal menyimpan profil.')
    } finally {
      setSaving(false)
    }
  }

  async function onLogoSelected(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return
    setLogoBusy(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('Gagal membaca file.'))
        reader.readAsDataURL(file)
      })
      const uploadRes = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(businessId ? { 'x-business-id': businessId } : {}),
        },
        body: JSON.stringify({ dataUrl, kind: 'logos', businessId }),
      })
      const uploaded = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploaded.error || 'Gagal upload logo.')
      await updateProfile({ logo: uploaded.localPath || uploaded.url })
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : 'Gagal upload logo.')
    } finally {
      setLogoBusy(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  return (
    <SectionCard id="profil" title="Profil Usaha" desc="Data ini disimpan di server dan dipakai AI + invoice UMKMan.">
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <div className="group relative">
          <Image
            src={logo}
            alt={`Logo ${form.brand || 'usaha'}`}
            width={72}
            height={72}
            className="size-[72px] rounded-2xl object-cover ring-2 ring-border"
            unoptimized={
              logo.startsWith('data:') ||
              logo.startsWith('/uploads/') ||
              logo.startsWith('/api/media/')
            }
          />
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void onLogoSelected(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={logoBusy}
            onClick={() => logoInputRef.current?.click()}
            aria-label="Ganti logo usaha"
            className="absolute -bottom-1.5 -right-1.5 flex size-7 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md transition-transform hover:scale-110 disabled:opacity-60"
          >
            <Camera className="size-3.5" aria-hidden="true" />
          </button>
        </div>
        <div>
          <p className="font-display text-lg font-bold">{form.brand || '—'}</p>
          <p className="text-xs text-muted-foreground">
            {profile?.category ?? 'UMKM'} · {form.address || profile?.city}
          </p>
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
            <span className="size-1.5 rounded-full bg-accent animate-pulse-dot" aria-hidden="true" />
            Data live server
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nama Usaha" icon={Store} value={form.brand} onChange={(v) => setForm((f) => ({ ...f, brand: v }))} />
        <Field label="Pemilik" icon={User} value={form.owner} onChange={(v) => setForm((f) => ({ ...f, owner: v }))} />
        <Field label="Email" icon={Mail} type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
        <Field label="Telepon / WhatsApp" icon={Phone} type="tel" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
        <div className="sm:col-span-2">
          <Field label="Alamat" icon={MapPin} value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        <AnimatePresence>
          {saved && (
            <motion.span
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs font-medium text-accent"
            >
              <Check className="size-3.5" aria-hidden="true" />
              Tersimpan ke server
            </motion.span>
          )}
        </AnimatePresence>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          disabled={saving}
          onClick={() => void saveProfile()}
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-shadow hover:animate-glow-pulse-subtle disabled:opacity-50"
        >
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </motion.button>
      </div>
    </SectionCard>
  )
}

function CatalogSection() {
  const { catalog, profile, addProduct } = useDashboard()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    shortName: '',
    variant: '',
    unitPrice: '',
    stock: '',
    description: '',
  })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await addProduct({
        name: form.name,
        shortName: form.shortName || form.name,
        variant: form.variant || '-',
        unitPrice: Number(form.unitPrice),
        stock: Number(form.stock || 0),
        description: form.description,
      })
      setForm({ name: '', shortName: '', variant: '', unitPrice: '', stock: '', description: '' })
      setMessage('Produk ditambahkan. AI & stok langsung pakai data ini.')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Gagal menambah produk.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard
      id="katalog"
      title="Katalog Produk"
      desc={`Produk milik ${profile?.brand ?? 'usaha aktif'} — harga & stok dipakai transaksi + AI. Client lain punya katalog sendiri.`}
    >
      {catalog.length === 0 ? (
        <p className="mb-4 rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          Katalog masih kosong. Tambah produk pertama untuk mulai mencatat penjualan.
        </p>
      ) : (
        <ul className="mb-5 divide-y divide-border rounded-xl border border-border">
          {catalog.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3.5 py-3 text-sm">
              <span className="min-w-0">
                <span className="block font-semibold">{p.shortName}</span>
                <span className="block text-xs text-muted-foreground">
                  {p.sku} · {p.variant}
                </span>
              </span>
              <span className="shrink-0 text-right font-mono text-xs">
                <span className="block font-semibold">Rp {p.unitPrice.toLocaleString('id-ID')}</span>
                <span className="text-muted-foreground">stok {p.stock}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(e) => void onSubmit(e)} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nama produk" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
        <Field label="Nama pendek" value={form.shortName} onChange={(v) => setForm((f) => ({ ...f, shortName: v }))} />
        <Field label="Varian / ukuran" value={form.variant} onChange={(v) => setForm((f) => ({ ...f, variant: v }))} />
        <Field label="Harga satuan (Rp)" value={form.unitPrice} onChange={(v) => setForm((f) => ({ ...f, unitPrice: v }))} type="number" />
        <Field label="Stok awal" value={form.stock} onChange={(v) => setForm((f) => ({ ...f, stock: v }))} type="number" />
        <div className="sm:col-span-2">
          <Field label="Deskripsi" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
        </div>
        <div className="sm:col-span-2 flex items-center justify-between gap-3">
          {message && <p className="text-xs text-muted-foreground">{message}</p>}
          <button
            type="submit"
            disabled={saving || !form.name || !form.unitPrice}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-40"
          >
            <Plus className="size-4" />
            {saving ? 'Menyimpan...' : 'Tambah produk'}
          </button>
        </div>
      </form>
    </SectionCard>
  )
}

function NotificationsSection() {
  const { profile, updateProfile } = useDashboard()
  const [prefs, setPrefs] = useState<NotificationPreferences>(normalizeNotifications(null))
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    setPrefs(normalizeNotifications(profile?.notifications))
  }, [profile?.notifications])

  async function persist(next: NotificationPreferences) {
    const clean = normalizeNotifications(next)
    setPrefs(clean)
    try {
      await updateProfile({ notifications: clean })
      setHint('Preferensi lonceng in-app disimpan')
      window.setTimeout(() => setHint(null), 2000)
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : 'Gagal menyimpan notifikasi.')
      setPrefs(normalizeNotifications(profile?.notifications))
    }
  }

  const set =
    (key: 'orders' | 'stock' | 'ai' | 'weekly') => (v: boolean) =>
      void persist({ ...prefs, [key]: v })

  return (
    <SectionCard
      id="notifikasi"
      title="Notifikasi in-app"
      desc="Mengatur lonceng di dashboard. Tidak ada pengiriman WhatsApp/email di versi ini."
    >
      <div className="flex flex-col divide-y divide-border">
        <SettingRow icon={Receipt} title="Transaksi" desc="Tampilkan transaksi yang perlu verifikasi">
          <Toggle checked={prefs.orders} onChange={set('orders')} label="Notifikasi transaksi" />
        </SettingRow>
        <SettingRow icon={AlertTriangle} title="Stok menipis" desc="Saat stok di bawah ambang batas">
          <Toggle checked={prefs.stock} onChange={set('stock')} label="Notifikasi stok menipis" />
        </SettingRow>
        <SettingRow icon={Sparkles} title="Draft konten" desc="Pengingat caption/poster masih draft">
          <Toggle checked={prefs.ai} onChange={set('ai')} label="Notifikasi draft konten" />
        </SettingRow>
        <SettingRow icon={Mail} title="Ringkasan status" desc="Tampilkan ringkasan “semua aman” jika kosong">
          <Toggle checked={prefs.weekly} onChange={set('weekly')} label="Ringkasan status" />
        </SettingRow>
      </div>
      {hint && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-accent" aria-live="polite">
          <Check className="size-3.5" aria-hidden="true" />
          {hint}
        </p>
      )}
    </SectionCard>
  )
}

function AiSection() {
  const { profile, updateProfile } = useDashboard()
  const [tone, setTone] = useState<AiTone>('Santai')
  const [auto, setAuto] = useState({
    autoCaption: true,
    smartSchedule: true,
    autoReply: false,
  })
  const [saving, setSaving] = useState(false)
  const [savedHint, setSavedHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const prefs = normalizeAiPreferences(profile?.ai)
    setTone(prefs.tone)
    setAuto({
      autoCaption: prefs.autoCaption,
      smartSchedule: prefs.smartSchedule,
      autoReply: prefs.autoReply,
    })
  }, [profile?.ai])

  async function persist(next: Partial<AiPreferences> & { tone?: AiTone }) {
    setSaving(true)
    setError(null)
    try {
      const ai = normalizeAiPreferences({
        tone: next.tone ?? tone,
        autoCaption: next.autoCaption ?? auto.autoCaption,
        smartSchedule: next.smartSchedule ?? auto.smartSchedule,
        autoReply: next.autoReply ?? auto.autoReply,
      })
      await updateProfile({ ai })
      setTone(ai.tone)
      setAuto({
        autoCaption: ai.autoCaption,
        smartSchedule: ai.smartSchedule,
        autoReply: ai.autoReply,
      })
      setSavedHint('Tersimpan — dipakai AI caption, poster & asisten')
      window.setTimeout(() => setSavedHint(null), 2400)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan preferensi AI.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard
      id="ai"
      title="AI & Otomatisasi"
      desc="Pengaturan ini disimpan per usaha dan benar-benar mengubah perilaku Gemini & Genity."
    >
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-accent/25 bg-accent/[0.06] p-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Sparkles className="size-4 animate-sparkle-sway" aria-hidden="true" />
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Gaya <span className="font-semibold text-foreground">{tone}</span> jadi default saat generate
          caption/poster. Toggle di bawah mengubah instruksi AI (jadwal posting, draf balasan
          pelanggan, mode default generator).
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border">
        <SettingRow
          icon={Sparkles}
          title="Caption otomatis"
          desc="Saat buka generator, default ikut sertakan caption (bukan poster saja)"
        >
          <Toggle
            checked={auto.autoCaption}
            onChange={(v) => {
              setAuto((p) => ({ ...p, autoCaption: v }))
              void persist({ autoCaption: v })
            }}
            label="Caption otomatis"
          />
        </SettingRow>
        <SettingRow
          icon={Bot}
          title="Jadwal posting cerdas"
          desc="Caption menyertakan saran jam posting ideal per platform"
        >
          <Toggle
            checked={auto.smartSchedule}
            onChange={(v) => {
              setAuto((p) => ({ ...p, smartSchedule: v }))
              void persist({ smartSchedule: v })
            }}
            label="Jadwal posting cerdas"
          />
        </SettingRow>
        <SettingRow
          icon={MessageSquare}
          title="Balas komentar otomatis"
          desc="Asisten AI menyertakan draf balasan pelanggan siap kirim"
        >
          <Toggle
            checked={auto.autoReply}
            onChange={(v) => {
              setAuto((p) => ({ ...p, autoReply: v }))
              void persist({ autoReply: v })
            }}
            label="Balas komentar otomatis"
          />
        </SettingRow>
      </div>

      <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Gaya bahasa AI
      </p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Gaya bahasa AI">
        {AI_TONES.map((t) => {
          const active = t === tone
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={saving}
              onClick={() => {
                if (active) return
                setTone(t)
                void persist({ tone: t })
              }}
              className={`relative rounded-full px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                active
                  ? 'text-accent-foreground'
                  : 'border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="ai-tone-pill"
                  className="absolute inset-0 rounded-full bg-accent"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative">{t}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        {tone === 'Santai' && 'Bahasa kasual, ramah, cocok Instagram & chat.'}
        {tone === 'Profesional' && 'Baku & percaya diri — cocok marketplace & B2B.'}
        {tone === 'Persuasif' && 'Storytelling soft-sell: masalah → solusi → CTA.'}
        {tone === 'Promo' && 'Energi tinggi, urgensi, CTA kuat (tanpa diskon palsu).'}
      </p>

      <AnimatePresence>
        {savedHint && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-accent"
            aria-live="polite"
          >
            <Check className="size-3.5" aria-hidden="true" />
            {savedHint}
          </motion.p>
        )}
      </AnimatePresence>
      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </SectionCard>
  )
}

function SecuritySection() {
  const [hasPassword, setHasPassword] = useState(true)
  const [passwordChangedAt, setPasswordChangedAt] = useState<string | null>(null)
  const [currentDevice, setCurrentDevice] = useState('Browser')
  const [pwOpen, setPwOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadSecurity() {
    try {
      const res = await fetch('/api/auth/security', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memuat keamanan.')
      setHasPassword(Boolean(data.hasPassword))
      setPasswordChangedAt(data.passwordChangedAt || null)
      const current = (data.sessions || []).find((s: { current?: boolean }) => s.current)
      if (current?.device) setCurrentDevice(current.device)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat keamanan.')
    }
  }

  useEffect(() => {
    void loadSecurity()
  }, [])

  async function revokeOthers() {
    try {
      const res = await fetch('/api/auth/security', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revokeOthers: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengeluarkan sesi lain.')
      setHint(data.message || 'Perangkat lain dikeluarkan. Sesi ini tetap aktif.')
      window.setTimeout(() => setHint(null), 2800)
      await loadSecurity()
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : 'Gagal mengeluarkan sesi.')
    }
  }

  async function submitPassword() {
    setPwBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, nextPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal ganti kata sandi.')
      setPwOpen(false)
      setCurrentPassword('')
      setNextPassword('')
      setPasswordChangedAt(new Date().toISOString())
      setHint(data.message || 'Kata sandi diganti. Sesi perangkat lain dikeluarkan.')
      window.setTimeout(() => setHint(null), 2800)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal ganti kata sandi.')
    } finally {
      setPwBusy(false)
    }
  }

  const passwordDesc = !hasPassword
    ? 'Akun Google — sandi lokal opsional'
    : passwordChangedAt
      ? `Terakhir diganti ${new Date(passwordChangedAt).toLocaleDateString('id-ID')}`
      : 'Belum pernah diganti di UMKMan'

  return (
    <SectionCard id="keamanan" title="Keamanan" desc="Kata sandi dan kontrol sesi login.">
      <div className="flex flex-col divide-y divide-border">
        <SettingRow icon={KeyRound} title="Kata sandi" desc={passwordDesc}>
          <button
            type="button"
            disabled={!hasPassword}
            onClick={() => setPwOpen((o) => !o)}
            className="shrink-0 rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground disabled:opacity-50"
          >
            {pwOpen ? 'Tutup' : 'Ganti'}
          </button>
        </SettingRow>
        <SettingRow
          icon={LogOut}
          title="Logout perangkat lain"
          desc="Membatalkan semua sesi kecuali browser ini"
        >
          <button
            type="button"
            onClick={() => void revokeOthers()}
            className="shrink-0 rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
          >
            Keluarkan
          </button>
        </SettingRow>
      </div>

      <AnimatePresence>
        {pwOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden rounded-xl border border-border p-3.5"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-medium text-muted-foreground">Sandi saat ini</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="rounded-xl border border-input bg-background/60 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs">
                <span className="font-medium text-muted-foreground">Sandi baru (min. 8)</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={nextPassword}
                  onChange={(e) => setNextPassword(e.target.value)}
                  className="rounded-xl border border-input bg-background/60 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={pwBusy || currentPassword.length < 1 || nextPassword.length < 8}
              onClick={() => void submitPassword()}
              className="mt-3 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50"
            >
              {pwBusy ? 'Menyimpan...' : 'Simpan kata sandi'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-5 rounded-xl border border-border p-3.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sesi ini</p>
        <p className="mt-1.5 text-sm font-medium">{currentDevice}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Aktif di browser ini</p>
      </div>
      {hint && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-accent" aria-live="polite">
          <Check className="size-3.5" aria-hidden="true" />
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </SectionCard>
  )
}

const TIMEZONES = [
  'WIB (GMT+7)',
  'WITA (GMT+8)',
  'WIT (GMT+9)',
  'GMT+7',
] as const

function AppearanceSection() {
  const { theme, toggleTheme } = useTheme()
  const { profile, updateProfile } = useDashboard()
  const [lang, setLang] = useState<'id' | 'en'>('id')
  const [timezone, setTimezone] = useState('WIB (GMT+7)')
  const [tzOpen, setTzOpen] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    const nextLang = normalizeLocale(profile?.locale)
    setLang(nextLang)
    setTimezone(profile?.timezone || 'WIB (GMT+7)')
    if (typeof document !== 'undefined') {
      document.documentElement.lang = nextLang
    }
  }, [profile?.locale, profile?.timezone])

  async function saveLocale(next: 'id' | 'en') {
    setLang(next)
    document.documentElement.lang = next
    try {
      await updateProfile({ locale: next })
      setHint(next === 'id' ? 'Bahasa disimpan: Indonesia' : 'Language saved: English')
      window.setTimeout(() => setHint(null), 2000)
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : 'Gagal menyimpan bahasa.')
    }
  }

  async function saveTimezone(next: string) {
    setTimezone(next)
    setTzOpen(false)
    try {
      await updateProfile({ timezone: next })
      setHint(`Zona waktu: ${next}`)
      window.setTimeout(() => setHint(null), 2000)
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : 'Gagal menyimpan zona waktu.')
    }
  }

  return (
    <SectionCard
      id="tampilan"
      title="Tampilan & Bahasa"
      desc="Tema langsung berubah; bahasa & zona waktu disimpan ke usaha."
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tema</p>
      <div className="mb-5 grid grid-cols-2 gap-3">
        {(
          [
            { key: 'dark', label: 'Gelap', icon: Moon },
            { key: 'light', label: 'Terang', icon: Sun },
          ] as const
        ).map((opt) => {
          const active = theme === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => !active && toggleTheme()}
              aria-pressed={active}
              className={`relative overflow-hidden rounded-xl border p-4 text-left transition-colors ${
                active ? 'border-accent/60 bg-accent/[0.06]' : 'border-border hover:border-accent/30'
              }`}
            >
              <span
                className={`mb-6 block h-12 rounded-lg border border-border ${
                  opt.key === 'dark' ? 'bg-[#0a0d09]' : 'bg-[#f7f9f1]'
                }`}
                aria-hidden="true"
              >
                <span
                  className={`mx-2 mt-2 block h-1.5 w-1/2 rounded-full ${
                    opt.key === 'dark' ? 'bg-[#d6ff4a]/70' : 'bg-[#517d00]/70'
                  }`}
                />
                <span
                  className={`mx-2 mt-1 block h-1.5 w-3/4 rounded-full ${
                    opt.key === 'dark' ? 'bg-white/10' : 'bg-black/10'
                  }`}
                />
              </span>
              <span className="flex items-center gap-2">
                <opt.icon
                  className={`size-4 ${active ? 'text-accent' : 'text-muted-foreground'}`}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">{opt.label}</span>
                {active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto flex size-5 items-center justify-center rounded-full bg-accent text-accent-foreground"
                  >
                    <Check className="size-3" aria-hidden="true" />
                  </motion.span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Bahasa & zona
      </p>
      <div className="flex flex-col divide-y divide-border">
        <SettingRow
          icon={Languages}
          title={lang === 'en' ? 'Interface language' : 'Bahasa antarmuka'}
          desc={lang === 'en' ? 'Saved per business profile' : 'Disimpan per profil usaha'}
        >
          <div className="flex shrink-0 rounded-full border border-border p-0.5">
            {(
              [
                { key: 'id', label: 'ID' },
                { key: 'en', label: 'EN' },
              ] as const
            ).map((l) => {
              const active = lang === l.key
              return (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => void saveLocale(l.key)}
                  aria-pressed={active}
                  className={`relative rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    active ? 'text-accent-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="lang-pill"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <span className="relative">{l.label}</span>
                </button>
              )
            })}
          </div>
        </SettingRow>
        <div className="relative">
          <SettingRow icon={Globe} title="Zona waktu" desc={timezone}>
            <button
              type="button"
              onClick={() => setTzOpen((o) => !o)}
              aria-expanded={tzOpen}
              className="flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Ubah
              <ChevronRight className={`size-3.5 transition-transform ${tzOpen ? 'rotate-90' : ''}`} />
            </button>
          </SettingRow>
          <AnimatePresence>
            {tzOpen && (
              <motion.ul
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 z-20 mt-1 min-w-44 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl"
              >
                {TIMEZONES.map((tz) => (
                  <li key={tz}>
                    <button
                      type="button"
                      onClick={() => void saveTimezone(tz)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium ${
                        tz === timezone
                          ? 'bg-accent/10 text-accent'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      {tz}
                      {tz === timezone && <Check className="size-3" strokeWidth={3} />}
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
      {hint && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-accent" aria-live="polite">
          <Check className="size-3.5" aria-hidden="true" />
          {hint}
        </p>
      )}
    </SectionCard>
  )
}

function DangerSection() {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  async function deleteAccount() {
    if (confirmText !== 'HAPUS') {
      window.alert('Ketik HAPUS (huruf besar) untuk konfirmasi.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: confirmText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus akun.')
      window.location.href = '/login?deleted=1'
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : 'Gagal menghapus akun.')
      setBusy(false)
    }
  }

  return (
    <SectionCard
      title="Zona Berbahaya"
      desc="Tindakan di bawah ini permanen dan tidak bisa dibatalkan."
      danger
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Hapus akun & seluruh data</p>
          <p className="text-xs text-muted-foreground">
            Semua usaha, konten, transaksi, dan katalog milik akun ini dihapus.
          </p>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {confirming ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[240px]"
            >
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='Ketik HAPUS'
                className="rounded-xl border border-input bg-background/60 px-3 py-2 text-sm"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setConfirming(false)
                    setConfirmText('')
                  }}
                  className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={busy || confirmText !== 'HAPUS'}
                  onClick={() => void deleteAccount()}
                  className="flex items-center gap-1.5 rounded-full bg-destructive px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  {busy ? 'Menghapus...' : 'Ya, Hapus Permanen'}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="initial"
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1.5 rounded-full border border-destructive/40 px-4 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Hapus Akun
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </SectionCard>
  )
}

/* ================= Main view ================= */

export function SettingsView() {
  const [activeSection, setActiveSection] = useState<SectionId>('profil')

  const scrollTo = (id: SectionId) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
      {/* Section navigation */}
      <motion.aside
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="lg:w-64 lg:shrink-0"
      >
        <div className="lg:sticky lg:top-6">
          <h2 className="mb-1 font-display text-xl font-bold tracking-tight">Pengaturan</h2>
          <p className="mb-4 text-xs text-muted-foreground">Kelola akun & preferensi usahamu</p>

          <nav aria-label="Bagian pengaturan" className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {SECTIONS.map((s) => {
              const active = s.id === activeSection
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  aria-current={active ? 'true' : undefined}
                  className={`relative flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="settings-nav-pill"
                      className="absolute inset-0 rounded-xl bg-secondary"
                      transition={{ type: 'spring', bounce: 0.18, duration: 0.5 }}
                    />
                  )}
                  <span
                    className={`relative flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      active ? 'bg-accent text-accent-foreground' : 'bg-secondary'
                    }`}
                  >
                    <s.icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="relative hidden min-w-0 lg:block">
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{s.desc}</span>
                  </span>
                  <span className="relative text-sm font-medium whitespace-nowrap lg:hidden">
                    {s.label}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>
      </motion.aside>

      {/* Sections */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <ProfileSection />
        <CatalogSection />
        <NotificationsSection />
        <AiSection />
        <SecuritySection />
        <AppearanceSection />
        <DangerSection />
      </div>
    </div>
  )
}
