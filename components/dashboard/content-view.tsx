'use client'

import { CountUp } from '@/components/motion'
import { useDashboard, type ContentItem, type ContentStatus, type Platform } from '@/lib/dashboard-store'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Pencil, RefreshCw, Send, Sparkles, Store } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { InstagramIcon } from './brand-icons'

type Status = ContentStatus

const FILTERS = [
  { key: 'semua', label: 'Semua' },
  { key: 'draft', label: 'Draft' },
  { key: 'terposting', label: 'Terposting' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

function countFor(items: ContentItem[], key: FilterKey) {
  if (key === 'semua') return items.length
  const status: Status = key === 'draft' ? 'Draft' : 'Terposting'
  return items.filter((i) => i.status === status).length
}

const PLATFORM_STYLE: Record<Platform, { className: string; icon: React.ReactNode }> = {
  Instagram: {
    className: 'bg-[#E1306C]',
    icon: <InstagramIcon className="size-3" />,
  },
  Tokopedia: {
    className: 'bg-[#03AC0E]',
    icon: <Store className="size-3" aria-hidden="true" />,
  },
  Lazada: {
    className: 'bg-[#F36F20]',
    icon: <span className="text-[9px] font-bold leading-none">L</span>,
  },
}

function PlatformBadge({ platform }: { platform: Platform }) {
  const style = PLATFORM_STYLE[platform]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary py-1 pl-1 pr-2.5 text-xs font-medium text-secondary-foreground">
      <span
        className={`flex size-4.5 items-center justify-center rounded-full text-white ${style.className}`}
        aria-hidden="true"
      >
        {style.icon}
      </span>
      {platform}
    </span>
  )
}

function StatusBadge({ status }: { status: Status }) {
  if (status === 'Draft') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <span className="size-1.5 rounded-full bg-accent-warm animate-pulse-dot" aria-hidden="true" />
        Draft
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
      <motion.span
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.35 }}
        className="flex"
        aria-hidden="true"
      >
        <Check className="size-3" strokeWidth={3} />
      </motion.span>
      Terposting
    </span>
  )
}

function ContentCard({
  item,
  index,
  onEdit,
  onPost,
}: {
  item: ContentItem
  index: number
  onEdit: (item: ContentItem) => void
  onPost: (item: ContentItem) => void
}) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.18 } }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.06, 0.5),
        ease: [0.22, 1, 0.36, 1],
        layout: { duration: 0.3, delay: 0 },
      }}
      whileHover={{ y: -4 }}
      className="group flex flex-col gap-4 rounded-2xl border border-border bg-background/50 p-4 transition-[border-color,box-shadow] duration-300 hover:border-accent/40 hover:shadow-[0_0_24px_-4px_color-mix(in_oklch,var(--accent)_30%,transparent)]"
    >
      <div className="flex gap-4">
        {/* Product photo with sheen + zoom */}
        <div className="sheen-sweep size-24 shrink-0 rounded-xl border border-border">
          <Image
            src={item.image || '/placeholder.svg'}
            alt={item.title}
            width={96}
            height={96}
            className="size-full rounded-xl object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="font-display text-base font-bold tracking-tight text-balance">
            {item.title}
          </h3>
          <PlatformBadge platform={item.platform} />
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={item.status} />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground transition-all duration-150 hover:border-accent/40 hover:bg-secondary active:scale-[0.97]"
          >
            <Pencil className="size-3" aria-hidden="true" />
            Edit
          </button>
          {item.status === 'Draft' ? (
            <button
              type="button"
              onClick={() => onPost(item)}
              className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-bold text-accent-foreground transition-all duration-150 animate-glow-pulse-subtle hover:opacity-90 active:scale-[0.97]"
            >
              <Send className="size-3" aria-hidden="true" />
              Tandai terposting
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-1.5 text-xs font-bold text-accent transition-all duration-150 hover:bg-accent/20 active:scale-[0.97]"
            >
              <RefreshCw className="size-3" aria-hidden="true" />
              Buat Ulang
            </button>
          )}
        </div>
      </div>
    </motion.article>
  )
}

export function ContentView() {
  const { contents, openContentModal, updateContent } = useDashboard()
  const [filter, setFilter] = useState<FilterKey>('semua')
  const items =
    filter === 'semua'
      ? contents
      : contents.filter((i) => i.status === (filter === 'draft' ? 'Draft' : 'Terposting'))

  return (
    <section className="relative flex flex-col gap-5">
      {/* Faint tech grid backdrop */}
      <div
        className="pointer-events-none absolute -inset-4 rounded-3xl bg-tech-grid opacity-60 [mask-image:radial-gradient(ellipse_80%_70%_at_50%_20%,black,transparent)]"
        aria-hidden="true"
      />

      {/* Header */}
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Semua Konten
        </h2>
        <button
          type="button"
          onClick={() => openContentModal()}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground transition-all duration-150 animate-glow-breathe hover:opacity-90 active:scale-[0.97]"
        >
          <Sparkles className="size-4 animate-sparkle-sway" aria-hidden="true" />
          Buat Konten Baru
        </button>
      </div>

      {/* Filter pills */}
      <div role="tablist" aria-label="Filter konten" className="relative flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = f.key === filter
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
                active
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-border text-muted-foreground hover:border-accent/30 hover:text-foreground'
              }`}
            >
              {f.label}
              <span
                className={`flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold ${
                  active ? 'bg-accent-foreground/15' : 'bg-secondary'
                }`}
              >
                <CountUp value={countFor(contents, f.key)} duration={0.8} />
              </span>
            </button>
          )
        })}
      </div>

      {/* Cards grid */}
      <motion.div layout className="relative grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => (
            <ContentCard
              key={item.id}
              item={item}
              index={index}
              onEdit={openContentModal}
              onPost={(content) => updateContent(content.id, { status: 'Terposting' })}
            />
          ))}
        </AnimatePresence>
      </motion.div>
      {items.length === 0 && (
        <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-5 py-10 text-center">
          <Sparkles className="size-6 text-accent" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Belum ada konten. Buat konten pertamamu!</p>
          <button type="button" onClick={() => openContentModal()} className="min-h-11 rounded-full bg-accent px-5 text-sm font-bold text-accent-foreground">Buat Konten</button>
        </div>
      )}
    </section>
  )
}
