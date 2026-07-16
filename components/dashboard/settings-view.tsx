'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Bell,
  Bot,
  Camera,
  Check,
  ChevronRight,
  CreditCard,
  Download,
  Globe,
  KeyRound,
  Languages,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Monitor,
  Moon,
  Phone,
  Plus,
  Shield,
  Smartphone,
  Sparkles,
  Store,
  Sun,
  Trash2,
  User,
  Zap,
} from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { useTheme } from '@/components/theme-provider'
import { InstagramIcon } from './brand-icons'

function unavailable(feature: string) {
  window.alert(`${feature} belum tersedia pada mode demo.`)
}

/* ================= Types & data ================= */

type SectionId = 'profil' | 'integrasi' | 'notifikasi' | 'ai' | 'keamanan' | 'tampilan' | 'langganan'

const SECTIONS: { id: SectionId; label: string; icon: typeof User; desc: string }[] = [
  { id: 'profil', label: 'Profil Usaha', icon: Store, desc: 'Identitas & info toko' },
  { id: 'integrasi', label: 'Integrasi', icon: Zap, desc: 'Platform terhubung' },
  { id: 'notifikasi', label: 'Notifikasi', icon: Bell, desc: 'Preferensi pemberitahuan' },
  { id: 'ai', label: 'AI & Otomatisasi', icon: Bot, desc: 'Asisten cerdas' },
  { id: 'keamanan', label: 'Keamanan', icon: Shield, desc: 'Kata sandi & sesi' },
  { id: 'tampilan', label: 'Tampilan & Bahasa', icon: Monitor, desc: 'Tema & lokal' },
  { id: 'langganan', label: 'Langganan', icon: CreditCard, desc: 'Paket & penggunaan' },
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
  defaultValue,
  type = 'text',
}: {
  label: string
  icon?: typeof Mail
  defaultValue: string
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
          defaultValue={defaultValue}
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
  const [saved, setSaved] = useState(false)

  return (
    <SectionCard id="profil" title="Profil Usaha" desc="Informasi ini tampil di konten dan invoice yang dibuat UMKMan.">
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <div className="group relative">
          <Image
            src="/placeholder-user.jpg"
            alt="Logo usaha Kopi Rina"
            width={72}
            height={72}
            className="size-[72px] rounded-2xl object-cover ring-2 ring-border"
          />
          <button
            type="button"
            onClick={() => unavailable('Upload logo')}
            aria-label="Ganti logo usaha"
            className="absolute -bottom-1.5 -right-1.5 flex size-7 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md transition-transform hover:scale-110"
          >
            <Camera className="size-3.5" aria-hidden="true" />
          </button>
        </div>
        <div>
          <p className="font-display text-lg font-bold">Kopi Rina</p>
          <p className="text-xs text-muted-foreground">Bergabung sejak Maret 2025</p>
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
            <span className="size-1.5 rounded-full bg-accent animate-pulse-dot" aria-hidden="true" />
            Terverifikasi
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nama Usaha" icon={Store} defaultValue="Kopi Rina" />
        <Field label="Pemilik" icon={User} defaultValue="Rina Wijaya" />
        <Field label="Email" icon={Mail} type="email" defaultValue="rina@kopirina.id" />
        <Field label="Telepon / WhatsApp" icon={Phone} type="tel" defaultValue="+62 812-3456-7890" />
        <div className="sm:col-span-2">
          <Field label="Alamat" icon={MapPin} defaultValue="Jl. Melati No. 12, Bandung, Jawa Barat" />
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
              Tersimpan
            </motion.span>
          )}
        </AnimatePresence>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            setSaved(true)
            setTimeout(() => setSaved(false), 2200)
          }}
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-shadow hover:animate-glow-pulse-subtle"
        >
          Simpan Perubahan
        </motion.button>
      </div>
    </SectionCard>
  )
}

const INTEGRATIONS = [
  {
    name: 'Instagram',
    handle: '@kopirina.id',
    color: 'bg-[#E1306C]',
    icon: 'instagram' as const,
    connected: true,
  },
  {
    name: 'Tokopedia',
    handle: 'Kopi Rina Official',
    color: 'bg-[#03AC0E]',
    icon: 'store' as const,
    connected: true,
  },
  {
    name: 'Lazada',
    handle: 'kopirina',
    color: 'bg-[#F36F20]',
    icon: 'letter' as const,
    connected: true,
  },
  {
    name: 'Shopee',
    handle: null,
    color: 'bg-[#EE4D2D]',
    icon: 'letter-s' as const,
    connected: false,
  },
  {
    name: 'TikTok Shop',
    handle: null,
    color: 'bg-[#111111]',
    icon: 'letter-t' as const,
    connected: false,
  },
] as const

function IntegrationIcon({ type, name }: { type: string; name: string }) {
  if (type === 'instagram') return <InstagramIcon className="size-4" />
  if (type === 'store') return <Store className="size-4" aria-hidden="true" />
  return <span className="text-xs font-bold">{name.charAt(0)}</span>
}

function IntegrationsSection() {
  const [connections, setConnections] = useState<Record<string, boolean>>(
    Object.fromEntries(INTEGRATIONS.map((i) => [i.name, i.connected])),
  )

  return (
    <SectionCard
      id="integrasi"
      title="Integrasi Platform"
      desc="Hubungkan toko online dan media sosial agar data tersinkron otomatis."
    >
      <ul className="flex flex-col divide-y divide-border">
        {INTEGRATIONS.map((item, i) => {
          const isConnected = connections[item.name]
          return (
            <motion.li
              key={item.name}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-between gap-3 py-3.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white ${item.color}`}
                >
                  <IntegrationIcon type={item.icon} name={item.name} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{item.name}</p>
                  {isConnected && item.handle ? (
                    <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                      {item.handle}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Belum terhubung</p>
                  )}
                </div>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  setConnections((prev) => ({ ...prev, [item.name]: !prev[item.name] }))
                }
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  isConnected
                    ? 'border border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive'
                    : 'bg-accent text-accent-foreground hover:animate-glow-pulse-subtle'
                }`}
              >
                {isConnected ? 'Putuskan' : 'Hubungkan'}
              </motion.button>
            </motion.li>
          )
        })}
      </ul>
      <button
        type="button"
        onClick={() => unavailable('Katalog integrasi')}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Jelajahi integrasi lainnya
      </button>
    </SectionCard>
  )
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    orders: true,
    stock: true,
    ai: true,
    weekly: false,
    wa: true,
    email: false,
  })
  const set = (key: keyof typeof prefs) => (v: boolean) => setPrefs((p) => ({ ...p, [key]: v }))

  return (
    <SectionCard
      id="notifikasi"
      title="Notifikasi"
      desc="Atur kapan dan lewat mana UMKMan mengabari kamu."
    >
      <div className="flex flex-col divide-y divide-border">
        <SettingRow icon={CreditCard} title="Transaksi baru" desc="Setiap ada pesanan atau pembayaran masuk">
          <Toggle checked={prefs.orders} onChange={set('orders')} label="Notifikasi transaksi baru" />
        </SettingRow>
        <SettingRow icon={AlertTriangle} title="Stok menipis" desc="Saat stok produk di bawah ambang batas">
          <Toggle checked={prefs.stock} onChange={set('stock')} label="Notifikasi stok menipis" />
        </SettingRow>
        <SettingRow icon={Sparkles} title="Saran AI" desc="Rekomendasi konten dan waktu posting terbaik">
          <Toggle checked={prefs.ai} onChange={set('ai')} label="Notifikasi saran AI" />
        </SettingRow>
        <SettingRow icon={Mail} title="Ringkasan mingguan" desc="Laporan performa dikirim tiap Senin pagi">
          <Toggle checked={prefs.weekly} onChange={set('weekly')} label="Notifikasi ringkasan mingguan" />
        </SettingRow>
      </div>

      <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Saluran
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => set('wa')(!prefs.wa)}
          aria-pressed={prefs.wa}
          className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
            prefs.wa ? 'border-accent/50 bg-accent/[0.06]' : 'border-border hover:border-accent/30'
          }`}
        >
          <MessageSquare className={`size-5 ${prefs.wa ? 'text-accent' : 'text-muted-foreground'}`} aria-hidden="true" />
          <span className="flex-1">
            <span className="block text-sm font-medium">WhatsApp</span>
            <span className="block text-xs text-muted-foreground">+62 812-3456-7890</span>
          </span>
          {prefs.wa && <Check className="size-4 text-accent" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={() => set('email')(!prefs.email)}
          aria-pressed={prefs.email}
          className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
            prefs.email ? 'border-accent/50 bg-accent/[0.06]' : 'border-border hover:border-accent/30'
          }`}
        >
          <Mail className={`size-5 ${prefs.email ? 'text-accent' : 'text-muted-foreground'}`} aria-hidden="true" />
          <span className="flex-1">
            <span className="block text-sm font-medium">Email</span>
            <span className="block text-xs text-muted-foreground">rina@kopirina.id</span>
          </span>
          {prefs.email && <Check className="size-4 text-accent" aria-hidden="true" />}
        </button>
      </div>
    </SectionCard>
  )
}

const AI_TONES = ['Santai', 'Profesional', 'Persuasif'] as const

function AiSection() {
  const [auto, setAuto] = useState({ caption: true, schedule: true, reply: false })
  const [tone, setTone] = useState<(typeof AI_TONES)[number]>('Santai')
  const set = (key: keyof typeof auto) => (v: boolean) => setAuto((p) => ({ ...p, [key]: v }))

  return (
    <SectionCard
      id="ai"
      title="AI & Otomatisasi"
      desc="Kendalikan seberapa jauh asisten AI membantu operasional harianmu."
    >
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-accent/25 bg-accent/[0.06] p-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Sparkles className="size-4 animate-sparkle-sway" aria-hidden="true" />
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Asisten AI aktif dan telah menghemat{' '}
          <span className="font-semibold text-foreground">±12 jam</span> kerja bulan ini lewat
          otomatisasi caption dan penjadwalan.
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border">
        <SettingRow icon={Sparkles} title="Caption otomatis" desc="AI menyusun draf caption untuk tiap produk baru">
          <Toggle checked={auto.caption} onChange={set('caption')} label="Caption otomatis" />
        </SettingRow>
        <SettingRow icon={Bot} title="Jadwal posting cerdas" desc="Posting di jam dengan engagement tertinggi">
          <Toggle checked={auto.schedule} onChange={set('schedule')} label="Jadwal posting cerdas" />
        </SettingRow>
        <SettingRow icon={MessageSquare} title="Balas komentar otomatis" desc="AI membalas pertanyaan umum pelanggan">
          <Toggle checked={auto.reply} onChange={set('reply')} label="Balas komentar otomatis" />
        </SettingRow>
      </div>

      <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Gaya bahasa AI
      </p>
      <div className="flex flex-wrap gap-2">
        {AI_TONES.map((t) => {
          const active = t === tone
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              aria-pressed={active}
              className={`relative rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                active ? 'text-accent-foreground' : 'border border-border text-muted-foreground hover:text-foreground'
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
    </SectionCard>
  )
}

const SESSIONS = [
  { device: 'Chrome — MacBook Pro', location: 'Bandung, ID', current: true, icon: Monitor },
  { device: 'Aplikasi UMKMan — iPhone 15', location: 'Bandung, ID', current: false, icon: Smartphone },
] as const

function SecuritySection() {
  const [twoFa, setTwoFa] = useState(true)

  return (
    <SectionCard id="keamanan" title="Keamanan" desc="Lindungi akun dan data usahamu.">
      <div className="flex flex-col divide-y divide-border">
        <SettingRow icon={KeyRound} title="Kata sandi" desc="Terakhir diganti 3 bulan lalu">
          <button
            type="button"
            onClick={() => unavailable('Ganti kata sandi')}
            className="shrink-0 rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
          >
            Ganti
          </button>
        </SettingRow>
        <SettingRow icon={Shield} title="Verifikasi 2 langkah" desc="Kode OTP dikirim ke WhatsApp saat login">
          <Toggle checked={twoFa} onChange={setTwoFa} label="Verifikasi dua langkah" />
        </SettingRow>
      </div>

      <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Sesi aktif
      </p>
      <ul className="flex flex-col gap-2.5">
        {SESSIONS.map((s) => (
          <li
            key={s.device}
            className="flex items-center justify-between gap-3 rounded-xl border border-border p-3.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <s.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.device}</p>
                <p className="text-xs text-muted-foreground">{s.location}</p>
              </div>
            </div>
            {s.current ? (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
                <span className="size-1.5 rounded-full bg-accent animate-pulse-dot" aria-hidden="true" />
                Sesi ini
              </span>
            ) : (
              <button
                type="button"
                onClick={() => unavailable('Kelola sesi')}
                className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
              >
                <LogOut className="size-3.5" aria-hidden="true" />
                Keluarkan
              </button>
            )}
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

function AppearanceSection() {
  const { theme, toggleTheme } = useTheme()
  const [lang, setLang] = useState<'id' | 'en'>('id')

  return (
    <SectionCard
      id="tampilan"
      title="Tampilan & Bahasa"
      desc="Sesuaikan tema dan bahasa antarmuka."
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
        Bahasa
      </p>
      <div className="flex flex-col divide-y divide-border">
        <SettingRow icon={Languages} title="Bahasa antarmuka" desc="Bahasa yang dipakai di seluruh aplikasi">
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
                  onClick={() => setLang(l.key)}
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
        <SettingRow icon={Globe} title="Zona waktu" desc="WIB (GMT+7) — Jakarta, Bandung">
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </SettingRow>
      </div>
    </SectionCard>
  )
}

const USAGE = [
  { label: 'Konten AI dibuat', used: 42, total: 60 },
  { label: 'Platform terhubung', used: 3, total: 5 },
  { label: 'Penyimpanan media', used: 1.8, total: 5, unit: 'GB' },
] as const

function SubscriptionSection() {
  return (
    <SectionCard
      id="langganan"
      title="Langganan"
      desc="Paket aktif dan pemakaian kuota bulan ini."
    >
      <div className="relative mb-5 overflow-hidden rounded-xl border border-accent/30 bg-tech-grid p-4">
        <div
          className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-accent/15 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-accent-foreground">
              <Zap className="size-3" aria-hidden="true" />
              UMKM Pro
            </span>
            <p className="text-xs text-muted-foreground">
              Perpanjangan otomatis pada <span className="font-medium text-foreground">1 Agustus 2026</span>
            </p>
          </div>
          <p className="font-display text-xl font-bold">
            Rp99.000<span className="text-xs font-normal text-muted-foreground">/bulan</span>
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {USAGE.map((u, i) => {
          const pct = Math.round((u.used / u.total) * 100)
          return (
            <div key={u.label}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium">{u.label}</span>
                <span className="font-mono text-muted-foreground">
                  {u.used}
                  {'unit' in u ? ` ${u.unit}` : ''} / {u.total}
                  {'unit' in u ? ` ${u.unit}` : ''}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, delay: 0.15 * i, ease: [0.22, 1, 0.36, 1] }}
                  className={`h-full rounded-full ${pct > 80 ? 'bg-accent-warm' : 'bg-accent'}`}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => unavailable('Upgrade paket')}
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-shadow hover:animate-glow-pulse-subtle"
        >
          Upgrade Paket
        </button>
        <button
          type="button"
          onClick={() => unavailable('Riwayat tagihan')}
          className="flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Download className="size-4" aria-hidden="true" />
          Riwayat Tagihan
        </button>
      </div>
    </SectionCard>
  )
}

function DangerSection() {
  const [confirming, setConfirming] = useState(false)

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
            Semua konten, transaksi, dan integrasi akan dihapus selamanya.
          </p>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {confirming ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => unavailable('Hapus akun')}
                className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex items-center gap-1.5 rounded-full bg-destructive px-4 py-1.5 text-xs font-semibold text-white"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Ya, Hapus Permanen
              </button>
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
        <IntegrationsSection />
        <NotificationsSection />
        <AiSection />
        <SecuritySection />
        <AppearanceSection />
        <SubscriptionSection />
        <DangerSection />
      </div>
    </div>
  )
}
