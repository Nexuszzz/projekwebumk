'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CheckCheck, FileText, LogOut, Moon, PackageSearch, Plus, Receipt, Settings, Store, Sun, Zap } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { useDashboard } from '@/lib/dashboard-store'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BusinessSwitcher } from './business-switcher'
import { InstagramIcon } from './brand-icons'

const TABS = ['Ringkasan', 'Konten', 'Transaksi', 'Riwayat'] as const
export type DashboardTab = (typeof TABS)[number] | 'Pengaturan'

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
  const { catalog, contents, transactions, profile, logout, user } = useDashboard()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [read, setRead] = useState<Set<string>>(new Set())
  const notificationRef = useRef<HTMLDivElement>(null)

  const notifications = useMemo(() => {
    const prefs = profile?.notifications
    const showDraft = prefs?.ai !== false
    const showOrders = prefs?.orders !== false
    const showStock = prefs?.stock !== false
    const showOk = prefs?.weekly !== false

    const draftCount = contents.filter((c) => c.status === 'Draft').length
    const verifyCount = transactions.filter((t) => t.status === 'Perlu Verifikasi').length
    const lowStock = catalog.filter((p) => p.stock <= p.lowStockAt)
    const items: { id: string; title: string; detail: string; time: string; tab: DashboardTab; icon: typeof Bell }[] = []
    if (showDraft && draftCount > 0) {
      items.push({
        id: 'draft',
        title: `${draftCount} draft siap ditandai terposting`,
        detail: 'Status lokal di UMKMan (belum publish ke marketplace).',
        time: 'baru',
        tab: 'Konten',
        icon: FileText,
      })
    }
    if (showOrders && verifyCount > 0) {
      items.push({
        id: 'verify',
        title: 'Transaksi perlu verifikasi',
        detail: `${verifyCount} transaksi di ${profile?.brand ?? 'usaha'} — stok belum dipotong.`,
        time: 'baru',
        tab: 'Transaksi',
        icon: Receipt,
      })
    }
    if (showStock && lowStock.length > 0) {
      items.push({
        id: 'stock',
        title: 'Stok menipis',
        detail: lowStock.map((p) => `${p.shortName} (${p.stock})`).join(', '),
        time: 'live',
        tab: 'Ringkasan',
        icon: PackageSearch,
      })
    }
    if (items.length === 0 && showOk) {
      items.push({
        id: 'ok',
        title: 'Semua aman',
        detail: `${profile?.brand ?? 'Usaha'} siap dioperasikan.`,
        time: '—',
        tab: 'Ringkasan',
        icon: CheckCheck,
      })
    }
    return items
  }, [catalog, contents, transactions, profile])

  const unreadCount = notifications.filter((notification) => !read.has(notification.id)).length

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

  function openNotification(notification: (typeof notifications)[number]) {
    setRead((current) => new Set(current).add(notification.id))
    setNotificationsOpen(false)
    onTabChange(notification.tab)
  }

  return (
    <header className="flex min-w-0 flex-col gap-3 sm:gap-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3 md:gap-4">
          <a href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent">
              <Zap className="size-4 text-accent-foreground" aria-hidden="true" />
            </span>
            <span className="font-display text-base font-bold tracking-tight sm:text-lg">UMKMan</span>
          </a>
          <BusinessSwitcher />
          <div className="hidden items-center md:flex">
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

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {user && (
            <span
              className="hidden max-w-[10rem] truncate text-xs text-muted-foreground lg:inline"
              title={user.email}
            >
              {user.email}
            </span>
          )}
          <ThemeToggle />
          <button
            type="button"
            aria-label="Keluar"
            onClick={() => void logout()}
            title="Keluar"
            className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
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
              {unreadCount > 0 && (
                <span
                  className="absolute right-1.5 top-1.5 flex min-w-3.5 items-center justify-center rounded-full bg-accent px-1 font-mono text-[9px] font-bold text-accent-foreground"
                  aria-label={`${unreadCount} notifikasi belum dibaca`}
                >
                  {unreadCount}
                </span>
              )}
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
                  className="absolute right-0 top-[calc(100%+0.6rem)] z-40 w-[min(22rem,calc(100vw-1.25rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 sm:px-4">
                    <div className="min-w-0">
                      <h2 className="font-display text-sm font-bold">Notifikasi</h2>
                      <p className="text-xs text-muted-foreground">
                        {unreadCount ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setRead(new Set(notifications.map((n) => n.id)))}
                        className="flex min-h-9 shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:underline"
                      >
                        <CheckCheck className="size-3.5" aria-hidden="true" />
                        <span className="hidden sm:inline">Tandai semua</span>
                      </button>
                    )}
                  </div>
                  <ul className="max-h-[min(60dvh,24rem)] overflow-y-auto p-1.5">
                    {notifications.map((notification) => {
                      const Icon = notification.icon
                      const unread = !read.has(notification.id)
                      return (
                        <li key={notification.id}>
                          <button
                            type="button"
                            onClick={() => openNotification(notification)}
                            className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-secondary ${unread ? 'bg-accent/[0.05]' : ''}`}
                          >
                            <span
                              className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${unread ? 'bg-accent/15 text-accent' : 'bg-secondary text-muted-foreground'}`}
                            >
                              <Icon className="size-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-2">
                                <span className="text-sm font-semibold leading-snug text-break-safe">
                                  {notification.title}
                                </span>
                                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                                  {notification.time}
                                </span>
                              </span>
                              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground text-break-safe">
                                {notification.detail}
                              </span>
                            </span>
                            {unread && (
                              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Tabs — scroll di HP, merata di tablet+ */}
      <nav
        aria-label="Navigasi dashboard"
        className="scroll-x-soft -mx-0.5 flex w-full items-center gap-1 rounded-full border border-border bg-background/60 p-1 sm:overflow-visible"
      >
        {TABS.map((tab) => {
          const active = tab === activeTab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              aria-current={active ? 'page' : undefined}
              className={`relative min-h-10 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors sm:min-h-10 sm:flex-1 sm:px-4 sm:text-sm ${
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
    </header>
  )
}
