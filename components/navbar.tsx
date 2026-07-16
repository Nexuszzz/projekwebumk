import { Zap } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'

const menu = [
  { label: 'Beranda', href: '#beranda' },
  { label: 'Fitur', href: '#fitur' },
  { label: 'Cara Kerja', href: '#cara-kerja' },
  { label: 'Studi Kasus', href: '#studi-kasus' },
  { label: 'Harga', href: '#harga' },
]

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl">
      <nav
        aria-label="Navigasi utama"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6"
      >
        <a href="#beranda" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-accent">
            <Zap className="size-4 text-accent-foreground" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            UMKMan
          </span>
        </a>

        <ul className="hidden items-center gap-8 md:flex">
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

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <a
            href="/login"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Masuk
          </a>
          <a
            href="/login"
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Coba Gratis
          </a>
        </div>
      </nav>
    </header>
  )
}
