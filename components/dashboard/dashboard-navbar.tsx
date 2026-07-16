'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CheckCheck, FileText, Mic, Moon, PackageSearch, Plus, Settings, Store, Sun, Zap } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { useEffect, useRef, useState } from 'react'
import { InstagramIcon } from './brand-icons'

const TABS = ['Ringkasan', 'Konten', 'Transaksi', 'Riwayat'] as const
export type DashboardTab = (typeof TABS)[number] | 'Pengaturan'

const NOTIFICATIONS: { id: string; title: string; detail: string; time: string; tab: DashboardTab; icon: typeof Bell }[] = [
  { id: 'draft', title: '2 draft siap diposting', detail: 'Konten Tokopedia menunggu review kamu.', time: '5 mnt', tab: 'Konten', icon: FileText },
  { id: 'verify', title: 'Transaksi perlu verifikasi', detail: 'Input suara Kopi Arabika Gayo perlu dicek.', time: '32 mnt', tab: 'Transaksi', icon: Mic },
  { id: 'stock', title: 'Stok Nusacid menipis', detail: 'Prediksi stok habis dalam 4 hari.', time: '2 jam', tab: 'Ringkasan', icon: PackageSearch },
]

function IntegrationDot({
  label,
  className,
  children,
}: {
  label: string
  className: string
  children: React.ReactNode
}) {
  return (
    <span
      title={label}
      className={`flex size-7 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-card ${className}`}
    >
      {children}
      <span className="sr-only">{label}</span>
    </span>
  )
}

function ThemeToggle() {
  const { theme, toggleTheme, isTransitioning } = useTheme()
  const isDark = theme === 'dark'

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      disabled={isTransitioning}
      whileTap={{ scale: 0.9 }}
      aria-label={isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
      title={isDark ? 'Mode terang' : 'Mode gelap'}
      className="relative flex size-9 items-center justify-center overflow-hidden rounded-full border border-border text-muted-foreground transition-colors hover:border-accent/50 hover:bg-secondary hover:text-foreground disabled:opacity-70"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="sun"
            initial={{ y: 14, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -14, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex"
          >
            <Sun className="size-4" aria-hidden="true" />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ y: 14, opacity: 0, rotate: 90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -14, opacity: 0, rotate: -90 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex"
          >
            <Moon className="size-4" aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

export function DashboardNavbar({
  activeTab,
  onTabChange,
}: {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [read, setRead] = useState<Set<string>>(new Set())
  const notificationRef = useRef<HTMLDivElement>(null)
  const unreadCount = NOTIFICATIONS.filter((notification) => !read.has(notification.id)).length

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!notificationRef.current?.contains(event.target as Node)) setNotificationsOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setNotificationsOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  function openNotification(notification: (typeof NOTIFICATIONS)[number]) {
    setRead((current) => new Set(current).add(notification.id))
    setNotificationsOpen(false)
    onTabChange(notification.tab)
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      {/* Left: logo + integrations */}
      <div className="flex items-center gap-4">
        <a href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent">
            <Zap className="size-4 text-accent-foreground" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">UMKMan</span>
        </a>

        <div className="flex items-center">
          <div className="flex -space-x-1.5">
            <IntegrationDot label="Instagram" className="bg-[#E1306C]">
              <InstagramIcon className="size-3.5" />
            </IntegrationDot>
            <IntegrationDot label="Tokopedia" className="bg-[#03AC0E]">
              <Store className="size-3.5" aria-hidden="true" />
            </IntegrationDot>
            <IntegrationDot label="Lazada" className="bg-[#F36F20]">
              L
            </IntegrationDot>
          </div>
          <button
            type="button"
            onClick={() => onTabChange('Pengaturan')}
            aria-label="Tambah integrasi"
            className="ml-2 flex size-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Center: tabs */}
      <nav
        aria-label="Navigasi dashboard"
        className="order-last flex w-full items-center gap-1 overflow-x-auto rounded-full border border-border bg-background/60 p-1 md:order-none md:w-auto"
      >
        {TABS.map((tab) => {
          const active = tab === activeTab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              aria-current={active ? 'page' : undefined}
              className={`relative rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                active ? 'text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="dash-tab-pill"
                  className="absolute inset-0 rounded-full bg-accent"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative">{tab}</span>
            </button>
          )
        })}
      </nav>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          aria-label="Pengaturan"
          aria-pressed={activeTab === 'Pengaturan'}
          onClick={() => onTabChange('Pengaturan')}
          className={`flex size-9 items-center justify-center rounded-full border transition-colors ${
            activeTab === 'Pengaturan'
              ? 'border-accent/60 bg-accent text-accent-foreground'
              : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          <Settings
            className={`size-4 transition-transform duration-500 ${activeTab === 'Pengaturan' ? 'rotate-90' : ''}`}
            aria-hidden="true"
          />
        </button>
        <div ref={notificationRef} className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((open) => !open)}
            aria-label="Notifikasi"
            aria-expanded={notificationsOpen}
            aria-haspopup="dialog"
            className="relative flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Bell className="size-4" aria-hidden="true" />
            {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 flex min-w-3.5 items-center justify-center rounded-full bg-accent px-1 font-mono text-[9px] font-bold text-accent-foreground" aria-label={`${unreadCount} notifikasi belum dibaca`}>{unreadCount}</span>}
          </button>
          <AnimatePresence>
            {notificationsOpen && (
              <motion.section
                role="dialog"
                aria-label="Notifikasi"
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="absolute right-0 top-[calc(100%+0.6rem)] z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div><h2 className="font-display text-sm font-bold">Notifikasi</h2><p className="text-xs text-muted-foreground">{unreadCount ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}</p></div>
                  {unreadCount > 0 && <button type="button" onClick={() => setRead(new Set(NOTIFICATIONS.map((notification) => notification.id)))} className="flex min-h-9 items-center gap-1 text-xs font-semibold text-accent hover:underline"><CheckCheck className="size-3.5" aria-hidden="true" />Tandai semua</button>}
                </div>
                <ul className="max-h-[min(60dvh,24rem)] overflow-y-auto p-1.5">
                  {NOTIFICATIONS.map((notification) => {
                    const Icon = notification.icon
                    const unread = !read.has(notification.id)
                    return <li key={notification.id}><button type="button" onClick={() => openNotification(notification)} className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-secondary ${unread ? 'bg-accent/[0.05]' : ''}`}>
                      <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${unread ? 'bg-accent/15 text-accent' : 'bg-secondary text-muted-foreground'}`}><Icon className="size-4" aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><span className="text-sm font-semibold leading-snug">{notification.title}</span><span className="shrink-0 font-mono text-[10px] text-muted-foreground">{notification.time}</span></span><span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{notification.detail}</span></span>
                      {unread && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />}
                    </button></li>
                  })}
                </ul>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
