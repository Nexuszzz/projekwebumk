'use client'

import { motion } from 'framer-motion'
import { Package, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

const cardBase =
  'rounded-2xl border border-foreground/10 bg-card/80 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.6)] backdrop-blur-md'

/* Entrance + continuous gentle float + hover lift for each card */
function FloatCard({
  children,
  className,
  delay = 0,
  floatDuration = 5,
}: {
  children: ReactNode
  className?: string
  delay?: number
  floatDuration?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.92 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -10, scale: 1.03, zIndex: 40 }}
      className={className}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: floatDuration,
          delay: delay + 1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="h-full"
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

export function FloatingCards() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto mt-16 flex w-full max-w-6xl flex-col items-center gap-4 px-4 md:mt-20 md:flex-row md:items-end md:justify-center md:gap-0 md:px-0"
    >
      {/* 1 — sparkline card, tilted left */}
      <FloatCard
        delay={0.1}
        floatDuration={5.4}
        className="w-full max-w-xs md:z-10 md:w-64 md:-rotate-6 md:translate-y-2 md:-mr-6"
      >
        <div className={`${cardBase} p-5`}>
          <p className="text-sm font-medium text-foreground">
            Konten dibuat 14 hari terakhir
          </p>
          <svg
            viewBox="0 0 220 64"
            className="mt-4 h-16 w-full"
            preserveAspectRatio="none"
          >
            <motion.polyline
              points="0,50 25,38 50,44 75,26 100,34 125,18 150,28 175,12 200,20 220,6"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.8, delay: 0.6, ease: 'easeOut' }}
            />
          </svg>
          <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
            <span>1 Jul</span>
            <span>14 Jul</span>
          </div>
        </div>
      </FloatCard>

      {/* 2 — product card, slightly behind center */}
      <FloatCard
        delay={0.22}
        floatDuration={6.2}
        className="w-full max-w-xs md:z-20 md:w-60 md:-rotate-2 md:translate-y-5 md:-mr-8"
      >
        <div className={`${cardBase} p-5`}>
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent/15">
              <Package className="size-4 text-accent" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                NUSACID 1000 ml
              </p>
              <p className="text-xs text-muted-foreground">Pembersih kerak · Sidoarjo</p>
            </div>
          </div>
          <p className="mt-4 font-mono text-2xl font-bold text-foreground">
            Rp16.300
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] text-accent">
            <motion.span
              className="size-1.5 rounded-full bg-accent"
              animate={{ opacity: [1, 0.2, 1], scale: [1, 0.7, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            AI sedang membuat caption
          </span>
        </div>
      </FloatCard>

      {/* 3 — center card, elevated, gradient, glowing */}
      <FloatCard
        delay={0.34}
        floatDuration={4.6}
        className="z-30 w-full max-w-xs md:w-64 md:-translate-y-8"
      >
        <motion.div
          animate={{
            boxShadow: [
              '0 32px 64px -16px rgba(0,0,0,0.7), 0 0 24px -8px var(--accent)',
              '0 32px 64px -16px rgba(0,0,0,0.7), 0 0 44px -6px var(--accent)',
              '0 32px 64px -16px rgba(0,0,0,0.7), 0 0 24px -8px var(--accent)',
            ],
          }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-2xl border border-accent/25 bg-gradient-to-b from-accent/15 to-card p-6 text-center"
        >
          <motion.span
            className="mx-auto flex size-11 items-center justify-center rounded-full bg-accent/15"
            animate={{ rotate: [0, 12, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="size-5 text-accent" />
          </motion.span>
          <p className="mt-4 font-display text-lg font-bold text-foreground">
            {'Caption siap ✓'}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {'Instagram · TikTok · WhatsApp'}
          </p>
          <span className="mt-4 inline-block rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent">
            3 platform sekaligus
          </span>
        </motion.div>
      </FloatCard>

      {/* 4 — growth card, mirror of #2 */}
      <FloatCard
        delay={0.46}
        floatDuration={5.8}
        className="w-full max-w-xs md:z-20 md:w-60 md:rotate-2 md:translate-y-5 md:-ml-8"
      >
        <div className={`${cardBase} p-5`}>
          <p className="text-xs text-muted-foreground">Penjualan minggu ini</p>
          <p className="mt-2 font-mono text-4xl font-bold text-accent">+12%</p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] text-accent">
            <motion.span
              className="size-1.5 rounded-full bg-accent"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            Tren naik
          </span>
        </div>
      </FloatCard>

      {/* 5 — task list card, tilted right */}
      <FloatCard
        delay={0.58}
        floatDuration={6.6}
        className="w-full max-w-xs md:z-10 md:w-64 md:rotate-6 md:translate-y-2 md:-ml-6"
      >
        <div className={`${cardBase} p-5`}>
          <ul className="flex flex-col gap-3.5">
            {[
              { color: 'bg-accent', label: 'Poster promo Jumat', status: 'Selesai' },
              { color: 'bg-accent-warm', label: 'Balasan chat pembeli', status: 'Selesai' },
              { color: 'bg-foreground/50', label: 'Laporan bulanan', status: 'Tersimpan' },
            ].map((task, i) => (
              <motion.li
                key={task.label}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.9 + i * 0.18, duration: 0.5 }}
                className="flex items-center justify-between gap-3"
              >
                <span className="flex items-center gap-2 text-xs text-foreground">
                  <span className={`size-2 rounded-full ${task.color}`} />
                  {task.label}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {task.status}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </FloatCard>
    </div>
  )
}
