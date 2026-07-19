'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Eye, EyeOff, Zap } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useId, useMemo, useState, type ReactNode } from 'react'

type Mode = 'login' | 'signup'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4.5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.53 5.53 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.27a12 12 0 0 0 0 10.76l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.35.6 4.6 1.8l3.44-3.45A12 12 0 0 0 1.27 6.62l4.01 3.09C6.22 6.87 8.87 4.76 12 4.76Z"
      />
    </svg>
  )
}

function SocialButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.985 }}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-input bg-transparent text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {label}
    </motion.button>
  )
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  const id = useId()
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="group flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-medium text-muted-foreground transition-colors group-focus-within:text-accent"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-xl border border-input bg-secondary/50 px-3.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
    </div>
  )
}

const swap = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
}

const ERROR_MAP: Record<string, string> = {
  google_not_configured:
    'Login Google belum dikonfigurasi di server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).',
  google_state: 'Sesi Google tidak valid atau kedaluwarsa. Coba lagi (buka ulang tombol Google).',
  google_token:
    'Gagal menukar kode Google. Cek Client ID/Secret dan Authorized redirect URI di Google Cloud Console.',
  google_redirect:
    'Redirect URI tidak cocok. Di Google Console wajib ada: https://umkman.vercel.app/api/auth/google/callback',
  google_client:
    'Client ID/Secret Google tidak cocok. Pastikan secret di Vercel sama dengan di Google Console.',
  google_denied: 'Login Google dibatalkan, atau email kamu belum ditambahkan sebagai Test user.',
  google_profile: 'Gagal membaca profil Google.',
  google_failed:
    'Login Google gagal di server. Coba lagi sekali; jika berulang, hubungi admin (simpan akun / session).',
}

export function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [business, setBusiness] = useState('')
  const [name, setName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const urlError = searchParams.get('error')
  const displayError = error || (urlError ? ERROR_MAP[urlError] || urlError : null)

  const loginValid = email.trim() !== '' && password.trim() !== ''
  const signupValid =
    loginValid &&
    business.trim() !== '' &&
    name.trim() !== '' &&
    confirm.trim() !== '' &&
    password.length >= 8 &&
    password === confirm &&
    agreed
  const valid = mode === 'login' ? loginValid : signupValid

  const nextPath = useMemo(() => searchParams.get('next') || '/dashboard', [searchParams])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || loading) return
    setLoading(true)
    setError(null)
    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error || 'Gagal masuk.')
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            confirm,
            name,
            business,
          }),
        })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error || 'Gagal daftar.')
      }
      router.push(nextPath)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Terjadi kesalahan.')
    } finally {
      setLoading(false)
    }
  }

  function loginWithGoogle() {
    window.location.href = '/api/auth/google'
  }

  return (
    <div className="flex w-full min-w-0 flex-col justify-center px-4 py-8 sm:px-8 sm:py-10 md:px-10 lg:px-14">
      <motion.a
        href="/"
        className="flex items-center gap-2.5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent">
          <Zap className="size-4.5 text-accent-foreground" aria-hidden="true" />
        </span>
        <span className="font-display text-xl font-bold tracking-tight">UMKMan</span>
      </motion.a>

      <AnimatePresence mode="wait">
        <motion.div key={mode} {...swap} className="mt-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            {mode === 'login' ? 'Selamat Datang Kembali' : 'Buat Akun Baru'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            {mode === 'login'
              ? 'Masuk ke akunmu — data usaha terisolasi per akun.'
              : 'Daftar akun baru. Setiap akun terisolasi — data client lain tidak tercampur.'}
          </p>

          {displayError && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
            >
              {displayError}
            </p>
          )}

          <div className="mt-7 flex flex-col gap-3">
            <SocialButton
              icon={<GoogleIcon />}
              label="Lanjutkan dengan Google"
              onClick={loginWithGoogle}
              disabled={loading}
            />
          </div>

          <div className="my-6 flex items-center gap-4" role="separator">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">atau</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form className="flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)}>
            {mode === 'signup' && (
              <>
                <Field
                  label="Nama Usaha"
                  value={business}
                  onChange={setBusiness}
                  placeholder="Nama brand / usaha kamu"
                />
                <Field
                  label="Nama Lengkap"
                  value={name}
                  onChange={setName}
                  placeholder="Nama pemilik usaha"
                  autoComplete="name"
                />
              </>
            )}

            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="nama@usahamu.com"
              autoComplete="email"
            />
            <Field
              label="Kata Sandi"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Minimal 8 karakter"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />

            {mode === 'signup' && (
              <Field
                label="Konfirmasi Kata Sandi"
                type="password"
                value={confirm}
                onChange={setConfirm}
                placeholder="Ulangi kata sandi"
                autoComplete="new-password"
              />
            )}

            {mode === 'signup' && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="size-4 rounded border-input accent-[var(--accent)]"
                />
                <span>Saya setuju membuat akun UMKMan untuk usaha saya sendiri.</span>
              </label>
            )}

            <motion.button
              type="submit"
              disabled={!valid || loading}
              whileHover={valid && !loading ? { y: -1 } : undefined}
              whileTap={valid && !loading ? { scale: 0.985 } : undefined}
              className="mt-1 h-12 w-full rounded-xl bg-foreground text-sm font-semibold text-background transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Buat Akun'}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login')
                setError(null)
              }}
              className="font-semibold text-accent hover:underline"
            >
              {mode === 'login' ? 'Daftar' : 'Masuk'}
            </button>
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
