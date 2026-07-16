'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { FloatingCards } from './floating-cards'

const item = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
}

export function Hero() {
  return (
    <section
      id="beranda"
      className="relative overflow-hidden pb-24 pt-20 md:pt-28"
    >
      {/* Aurora glow behind the headline — slowly drifting */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[720px] w-56 -translate-x-1/2 rotate-[18deg] rounded-full bg-accent/25 blur-[120px] md:w-72"
        animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.08, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-[42%] top-[-5%] h-[520px] w-32 -translate-x-1/2 rotate-[24deg] rounded-full bg-accent/15 blur-[90px]"
        animate={{ opacity: [1, 0.5, 1], x: [0, 30, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Twinkling star specks */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {[
          { left: '12%', top: '22%', d: 3.2, delay: 0 },
          { left: '22%', top: '58%', d: 4.1, delay: 0.8 },
          { left: '78%', top: '18%', d: 3.6, delay: 0.4 },
          { left: '88%', top: '48%', d: 4.5, delay: 1.4 },
          { left: '65%', top: '65%', d: 3.9, delay: 1.0 },
          { left: '35%', top: '12%', d: 4.3, delay: 0.2 },
        ].map((s, i) => (
          <motion.span
            key={i}
            className="absolute size-1 rounded-full bg-foreground/60"
            style={{ left: s.left, top: s.top }}
            animate={{ opacity: [0.1, 0.9, 0.1], scale: [0.6, 1.2, 0.6] }}
            transition={{
              duration: s.d,
              delay: s.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.14 } } }}
        className="relative mx-auto flex max-w-5xl flex-col items-center px-4 text-center"
      >
        <motion.span
          variants={item}
          className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-4 py-1.5 text-xs text-muted-foreground md:text-sm"
        >
          <motion.span
            animate={{ rotate: [0, 20, -12, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex"
          >
            <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
          </motion.span>
          Baru: Terintegrasi Generative AI
        </motion.span>

        <motion.h1
          variants={item}
          className="mt-8 font-display text-4xl font-bold leading-[1.08] tracking-tight text-balance sm:text-5xl md:text-6xl"
        >
          <span className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
            {'UMKM Naik Kelas,'}
          </span>
          <br />
          <span className="animate-shimmer bg-gradient-to-r from-accent via-accent-warm to-accent bg-[length:200%_100%] bg-clip-text text-transparent">
            Ditenagai Kecerdasan Buatan.
          </span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-6 max-w-[550px] text-base leading-relaxed text-muted-foreground md:text-lg text-pretty"
        >
          Buat konten promosi, caption, dan analisis penjualan secara otomatis.
          Satu asisten AI untuk semua kebutuhan digital usaha Anda.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <motion.a
            href="/login"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="group inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-accent-foreground shadow-[0_0_32px_-6px_var(--accent)] transition-shadow hover:shadow-[0_0_48px_-4px_var(--accent)]"
          >
            Coba Gratis
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </motion.a>
          <motion.a
            href="#cara-kerja"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="inline-flex items-center rounded-full border border-foreground/20 px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent/50 hover:bg-foreground/5"
          >
            Lihat Cara Kerja
          </motion.a>
        </motion.div>
      </motion.div>

      <FloatingCards />
    </section>
  )
}
