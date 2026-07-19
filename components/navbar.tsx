'use client'

import { Menu, X, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ThemeToggle } from './theme-toggle'

const menu = [
  { label: 'Beranda', href: '#beranda' },
  { label: 'Fitur', href: '#fitur' },
  { label: 'Cara Kerja', href: '#cara-kerja' },
  { label: 'Studi Kasus', href: '#studi-kasus' },
  { label: 'Harga', href: '#harga' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <nav
        aria-label="Navigasi utama"
        className="safe-px mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 sm:h-16 md:px-6"
      >
        <a href="#beranda" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent">
            <Zap className="size-4 text-accent-foreground" aria-hidden="true" />
          </span>
          <span className="font-display text-base font-bold tracking-tight sm:text-lg">
            UMKMan
          </span>
        </a>

        <ul className="hidden items-center gap-6 lg:gap-8 md:flex">
          {menu.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <a
            href="/login"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Masuk
          </a>
          <a
            href="/login"
            className="rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 sm:px-5 sm:text-sm"
          >
            Coba Gratis
          </a>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
            aria-label={open ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-border bg-background/95 backdrop-blur-xl md:hidden">
          <ul className="safe-px mx-auto flex max-w-6xl flex-col gap-1 py-3">
            {menu.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li className="mt-1 border-t border-border pt-2 sm:hidden">
              <a
                href="/login"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                Masuk
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}
