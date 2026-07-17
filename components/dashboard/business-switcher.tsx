'use client'

import { useDashboard } from '@/lib/dashboard-store'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, Check, ChevronDown, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function BusinessSwitcher() {
  const { businesses, businessId, profile, switchBusiness, createBusiness } = useDashboard()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    brand: '',
    owner: '',
    city: '',
    category: '',
    email: '',
  })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  async function handleSwitch(id: string) {
    if (id === businessId) {
      setOpen(false)
      return
    }
    setError(null)
    try {
      await switchBusiness(id)
      setOpen(false)
      setCreating(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal ganti usaha.')
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createBusiness({
        brand: form.brand,
        owner: form.owner,
        city: form.city,
        category: form.category,
        email: form.email,
      })
      setForm({ brand: '', owner: '', city: '', category: '', email: '' })
      setCreating(false)
      setOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal membuat usaha.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[14rem] items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-left transition-colors hover:border-accent/40"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Building2 className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">{profile?.brand ?? 'Pilih usaha'}</span>
          <span className="block truncate text-[10px] text-muted-foreground">
            {profile?.owner ?? '—'} · {businesses.length} usaha
          </span>
        </span>
        <ChevronDown className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 top-full z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-popover p-2 shadow-2xl"
          >
            <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Usaha di UMKMan
            </p>
            <ul role="listbox" className="max-h-52 overflow-y-auto">
              {businesses.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={b.id === businessId}
                    onClick={() => void handleSwitch(b.id)}
                    className={`flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors ${
                      b.id === businessId ? 'bg-accent/10 text-accent' : 'hover:bg-secondary'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{b.brand}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {b.owner} · {b.productCount} produk · stok {b.stockTotal}
                      </span>
                    </span>
                    {b.id === businessId && <Check className="mt-0.5 size-3.5 shrink-0" strokeWidth={3} />}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-1 border-t border-border pt-2">
              {!creating ? (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold text-accent hover:bg-accent/10"
                >
                  <Plus className="size-4" />
                  Buat usaha baru
                </button>
              ) : (
                <form onSubmit={(e) => void handleCreate(e)} className="flex flex-col gap-2 p-1">
                  <p className="text-xs font-semibold">Usaha client baru</p>
                  <input
                    required
                    placeholder="Nama usaha / brand"
                    value={form.brand}
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                    className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs outline-none focus:border-accent"
                  />
                  <input
                    required
                    placeholder="Nama pemilik"
                    value={form.owner}
                    onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
                    className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs outline-none focus:border-accent"
                  />
                  <input
                    placeholder="Kota"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs outline-none focus:border-accent"
                  />
                  <input
                    placeholder="Kategori (kopi, fashion, dll.)"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs outline-none focus:border-accent"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs outline-none focus:border-accent"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCreating(false)}
                      className="h-9 flex-1 rounded-lg border border-border text-xs font-semibold"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="h-9 flex-1 rounded-lg bg-accent text-xs font-bold text-accent-foreground disabled:opacity-50"
                    >
                      {saving ? 'Membuat...' : 'Buat'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-2 px-2 text-xs text-destructive">
                {error}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
