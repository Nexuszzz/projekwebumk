'use client'

import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  MessageSquareText,
  Sparkles,
  Zap,
} from 'lucide-react'
import { CountUp, Reveal, Stagger, StaggerItem } from './motion'

/* ============ Statistik strip ============ */

const stats = [
  { value: 64, suffix: ' juta+', label: 'pelaku UMKM di Indonesia' },
  { value: 12, suffix: '%', label: 'yang sudah go digital' },
  { value: 44, suffix: '%', label: 'belum paham iklan digital' },
]

export function StatsStrip() {
  return (
    <section className="border-y border-border">
      <Stagger className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-border px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 md:px-6">
        {stats.map((s) => (
          <StaggerItem key={s.label} className="py-10 text-center">
            <p className="font-mono text-3xl font-bold text-accent md:text-4xl">
              <CountUp value={s.value} suffix={s.suffix} />
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  )
}

/* ============ Fitur ============ */

const features = [
  {
    icon: Sparkles,
    title: 'Konten Otomatis',
    desc: 'Caption, poster, dan ide promosi dibuat AI dalam hitungan detik — langsung siap posting ke semua platform.',
  },
  {
    icon: MessageSquareText,
    title: 'Asisten Chat Pembeli',
    desc: 'Balas pertanyaan pelanggan 24 jam nonstop dengan jawaban yang sesuai gaya bahasa toko Anda.',
  },
  {
    icon: BarChart3,
    title: 'Analisis Penjualan',
    desc: 'Pantau tren penjualan dan dapatkan rekomendasi harga serta stok berdasarkan data usaha Anda.',
  },
]

export function Features() {
  return (
    <section id="fitur" className="mx-auto max-w-6xl px-4 py-16 sm:py-20 md:px-6 md:py-24">
      <Reveal className="mx-auto max-w-xl text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl text-balance">
          Semua yang UMKM butuhkan, dalam satu aplikasi
        </h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Tidak perlu tim marketing atau jago teknologi. Cukup foto produk,
          sisanya UMKMan yang kerjakan.
        </p>
      </Reveal>

      <Stagger className="mt-14 grid gap-6 md:grid-cols-3">
        {features.map((f) => (
          <StaggerItem key={f.title}>
            <motion.article
              whileHover={{ y: -8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="group h-full rounded-2xl border border-border bg-card p-7 transition-colors hover:border-accent/40"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent/15 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                <f.icon className="size-5 text-accent" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </motion.article>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  )
}

/* ============ Cara kerja ============ */

const steps = [
  {
    num: '01',
    title: 'Daftarkan usaha Anda',
    desc: 'Isi nama toko, jenis produk, dan target pasar dalam 2 menit.',
  },
  {
    num: '02',
    title: 'Unggah foto produk',
    desc: 'AI mengenali produk dan menyiapkan materi promosi otomatis.',
  },
  {
    num: '03',
    title: 'Posting & pantau hasil',
    desc: 'Sebar ke 3 platform sekaligus dan lihat penjualan naik.',
  },
]

export function HowItWorks() {
  return (
    <section id="cara-kerja" className="mx-auto max-w-6xl px-4 pb-16 sm:pb-20 md:px-6 md:pb-24">
      <Reveal>
        <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl text-balance">
          Mulai dalam 3 langkah
        </h2>
      </Reveal>

      <div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
        {/* Connector line draws itself */}
        <motion.div
          aria-hidden="true"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.3 }}
          className="absolute left-0 right-0 top-6 hidden h-px origin-left bg-gradient-to-r from-accent/60 via-border to-border md:block"
        />
        {steps.map((s, i) => (
          <Reveal key={s.num} delay={i * 0.18} className="relative">
            <motion.span
              whileHover={{ scale: 1.12, rotate: -4 }}
              transition={{ type: 'spring', stiffness: 350, damping: 15 }}
              className="relative z-10 inline-flex size-12 items-center justify-center rounded-xl border border-accent/30 bg-card font-mono text-sm font-bold text-accent"
            >
              {s.num}
            </motion.span>
            <h3 className="mt-5 font-display text-lg font-bold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {s.desc}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ============ Studi kasus ============ */

export function CaseStudy() {
  return (
    <section id="studi-kasus" className="mx-auto max-w-6xl px-4 pb-16 sm:pb-20 md:px-6 md:pb-24">
      <Reveal>
        <div className="grid overflow-hidden rounded-2xl border border-border bg-card sm:rounded-3xl md:grid-cols-2">
          <div className="flex flex-col justify-center p-6 sm:p-8 md:p-12">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              Studi Kasus
            </span>
            <h2 className="mt-5 font-display text-2xl font-bold tracking-tight md:text-3xl text-balance">
              UMKM naik kelas: omzet naik 2x dalam 3 bulan
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
              Banyak pemilik usaha yang dulu cuma jualan lewat chat. Setelah memakai
              UMKMan, konten promosi dibuat otomatis, stok & transaksi rapi, dan
              penjualan online tumbuh konsisten tiap minggu — cocok untuk F&amp;B,
              fashion, jasa, retail, dan jenis UMKM lain.
            </p>
            <a
              href="/login"
              className="group mt-7 inline-flex w-fit items-center gap-2 text-sm font-semibold text-accent hover:underline"
            >
              Baca cerita lengkapnya
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </a>
          </div>

          <div className="border-t border-border bg-background/50 p-6 sm:p-8 md:border-l md:border-t-0 md:p-12">
            <p className="text-xs text-muted-foreground">
              Contoh dashboard UMKM — 90 hari terakhir
            </p>
            <p className="mt-3 font-mono text-4xl font-bold text-accent">
              <CountUp value={104} prefix="+" suffix="%" />
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              pertumbuhan omzet
            </p>
            <div className="mt-7 flex flex-col gap-4">
              {[
                { label: 'Konten dibuat AI', value: '312' },
                { label: 'Pesan pembeli terbalas', value: '1.840' },
                { label: 'Jam kerja dihemat / minggu', value: '11 jam' },
              ].map((row, i) => (
                <motion.div
                  key={row.label}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + i * 0.15, duration: 0.55 }}
                  className="flex items-center justify-between border-b border-border pb-3 text-sm"
                >
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-mono font-bold text-foreground">
                    {row.value}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/* ============ CTA band ============ */

export function CtaBand() {
  return (
    <section id="harga" className="relative overflow-hidden border-t border-border">
      {/* Ambient glow */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[100px]"
        animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.15, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <Reveal className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-16 text-center sm:py-20 md:py-24">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl md:text-5xl text-balance">
          Siap membawa usaha Anda naik kelas?
        </h2>
        <p className="mt-4 max-w-md text-muted-foreground leading-relaxed">
          Gratis 14 hari, tanpa kartu kredit. Batalkan kapan saja.
        </p>
        <motion.a
          href="/login"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className="group mt-9 inline-flex items-center gap-2 rounded-full bg-accent px-8 py-4 text-sm font-semibold text-accent-foreground shadow-[0_0_36px_-8px_var(--accent)] transition-shadow hover:shadow-[0_0_56px_-4px_var(--accent)]"
        >
          Coba Gratis Sekarang
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </motion.a>
      </Reveal>
    </section>
  )
}

/* ============ Footer ============ */

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row md:px-6">
        <a href="#beranda" className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-accent">
            <Zap className="size-3.5 text-accent-foreground" aria-hidden="true" />
          </span>
          <span className="font-display font-bold">UMKMan</span>
        </a>
        <p className="text-xs text-muted-foreground">
          {'© 2026 UMKMan. Semua hak dilindungi.'}
        </p>
      </div>
    </footer>
  )
}
