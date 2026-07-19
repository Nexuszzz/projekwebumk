'use client'

import { useDashboard } from '@/lib/dashboard-store'
import { motion } from 'framer-motion'
import { Building2, LogOut, Sparkles } from 'lucide-react'
import { useState } from 'react'

/** Ditampilkan jika user login tapi belum punya usaha — isolasi multi-tenant. */
export function OnboardingPanel() {
  const { user, createBusiness, logout } = useDashboard()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    brand: '',
    owner: user?.name || '',
    city: '',
    category: '',
  })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createBusiness({
        brand: form.brand,
        owner: form.owner || user?.name || 'Pemilik',
        city: form.city,
        category: form.category,
        email: user?.email,
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal membuat usaha.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-lg flex-col gap-5 rounded-2xl border border-border bg-background/60 p-4 sm:rounded-3xl sm:p-6 md:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Hai, {user?.name ?? 'Pengguna'} 👋</p>
          <h2 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
            Buat usaha pertamamu
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            Akun ini masih kosong. Setiap client hanya melihat usahanya sendiri — data usaha
            lain <strong>tidak tercampur</strong>. Kamu mulai dari nol.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-3.5" />
          Keluar
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-accent/25 bg-accent/8 px-3.5 py-3 text-xs text-muted-foreground">
        <Sparkles className="size-4 shrink-0 text-accent" />
        Setelah usaha dibuat, tambah produk di Pengaturan → Katalog, lalu catat transaksi.
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Nama brand / usaha
          <input
            required
            value={form.brand}
            onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
            placeholder="Nama brand / toko kamu"
            className="h-11 rounded-xl border border-input bg-card px-3.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Nama pemilik
          <input
            required
            value={form.owner}
            onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
            className="h-11 rounded-xl border border-input bg-card px-3.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Kota
          <input
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            placeholder="Kota usaha"
            className="h-11 rounded-xl border border-input bg-card px-3.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Kategori
          <input
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="Mis. F&B, fashion, jasa, retail…"
            className="h-11 rounded-xl border border-input bg-card px-3.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-2 flex h-12 items-center justify-center gap-2 rounded-full bg-accent text-sm font-bold text-accent-foreground disabled:opacity-50"
        >
          <Building2 className="size-4" />
          {saving ? 'Membuat...' : 'Buat usaha saya'}
        </button>
      </form>
    </motion.section>
  )
}
