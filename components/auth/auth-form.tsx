'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Eye, EyeOff, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useId, useState, type ReactNode } from 'react'

type Mode = 'login' | 'signup'

/* ---------- Small pieces ---------- */

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

function SocialButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
      <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.985 }}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-input bg-transparent text-sm font-medium text-foreground transition-colors hover:bg-secondary"
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

/* ---------- Form ---------- */

const swap = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
}

export function AuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [business, setBusiness] = useState('')
  const [name, setName] = useState('')
  const [agreed, setAgreed] = useState(false)

  const loginValid = email.trim() !== '' && password.trim() !== ''
  const signupValid =
    loginValid &&
    business.trim() !== '' &&
    name.trim() !== '' &&
    confirm.trim() !== '' &&
    agreed
  const valid = mode === 'login' ? loginValid : signupValid

  return (
    <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
      {/* Logo */}
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
          <h1 className="font-display text-3xl font-bold tracking-tight text-balance">
            {mode === 'login' ? 'Selamat Datang Kembali' : 'Buat Akun Baru'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {mode === 'login'
              ? 'Masuk untuk lanjutkan kelola konten dan transaksimu'
              : 'Mulai otomatiskan konten dan pencatatan UMKM-mu hari ini'}
          </p>

          <div className="mt-7 flex flex-col gap-3">
            <SocialButton icon={<GoogleIcon />} label="Lanjutkan dengan Google" onClick={() => window.alert('Login Google belum tersedia pada mode demo. Gunakan form email untuk masuk.')} />
          </div>

          <div className="my-6 flex items-center gap-4" role="separator">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">atau</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (valid) router.push('/dashboard')
            }}
          >
            {mode === 'signup' && (
              <>
                <Field
                  label="Nama Usaha"
                  value={business}
                  onChange={setBusiness}
                  placeholder="Contoh: Kopi Senja"
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

            <div className="flex items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={mode === 'signup' ? agreed : undefined}
                  onChange={
                    mode === 'signup'
                      ? (e) => setAgreed(e.target.checked)
                      : undefined
                  }
                  className="size-4 rounded border-input accent-[var(--accent)]"
                />
                {mode === 'login' ? (
                  'Ingat saya'
                ) : (
                  <span>
                    Saya setuju dengan{' '}
                    <button type="button" onClick={() => window.alert('Halaman Syarat & Ketentuan belum tersedia pada mode demo.')} className="font-medium text-accent hover:underline">
                      Syarat &amp; Ketentuan
                    </button>
                  </span>
                )}
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => window.alert('Reset kata sandi belum tersedia pada mode demo.')}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Lupa kata sandi?
                </button>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={!valid}
              whileHover={valid ? { y: -1 } : undefined}
              whileTap={valid ? { scale: 0.985 } : undefined}
              className="mt-1 h-12 w-full rounded-xl bg-foreground text-sm font-semibold text-background transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {mode === 'login' ? 'Masuk' : 'Buat Akun'}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
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
