'use client'

import { motion } from 'framer-motion'
import { Camera, Check, Sparkles, Tag } from 'lucide-react'

const stars = [
  { top: '8%', left: '12%', d: 2.8, s: 2 },
  { top: '16%', left: '78%', d: 3.4, s: 3 },
  { top: '30%', left: '6%', d: 2.4, s: 2 },
  { top: '42%', left: '90%', d: 3.8, s: 2 },
  { top: '64%', left: '8%', d: 3.0, s: 3 },
  { top: '78%', left: '85%', d: 2.6, s: 2 },
  { top: '88%', left: '20%', d: 3.6, s: 2 },
  { top: '55%', left: '94%', d: 2.9, s: 2 },
]

function float(duration: number, y = 10, delay = 0) {
  return {
    animate: { y: [0, -y, 0] },
    transition: {
      duration,
      delay,
      repeat: Number.POSITIVE_INFINITY,
      ease: 'easeInOut' as const,
    },
  }
}

export function AuthVisual() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-b from-[#12160d] to-[#0a0d09] lg:block lg:rounded-[64px_28px_28px_28px]">
      {/* Aurora glow */}
      <motion.div
        aria-hidden="true"
        className="absolute -top-24 left-1/2 h-[420px] w-[520px] -translate-x-1/2 rotate-[-18deg] rounded-full bg-[#d6ff4a]/14 blur-3xl"
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />

      {/* Stars */}
      {stars.map((st, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="absolute rounded-full bg-[#f3f6ec]"
          style={{ top: st.top, left: st.left, width: st.s, height: st.s }}
          animate={{ opacity: [0.15, 0.8, 0.15] }}
          transition={{
            duration: st.d,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
            delay: i * 0.35,
          }}
        />
      ))}

      {/* Overlay copy */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 px-10 pt-12 text-right font-display text-2xl font-bold leading-snug text-[#f3f6ec] text-balance xl:text-[1.7rem]"
      >
        Ubah foto produkmu jadi konten yang menjual,{' '}
        <span className="text-[#d6ff4a]">dalam hitungan detik.</span>
      </motion.p>

      {/* Portal */}
      <div className="relative z-10 mt-10 flex justify-center pb-14">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {/* Portal frame */}
          <motion.div
            className="relative w-[300px] rounded-t-[150px] rounded-b-3xl border border-[#d6ff4a]/35 bg-[#0f140d]/80 p-5 pt-16 shadow-[0_0_80px_-20px_#d6ff4a55]"
            animate={{
              boxShadow: [
                '0 0 60px -24px rgba(214,255,74,0.35)',
                '0 0 90px -18px rgba(214,255,74,0.55)',
                '0 0 60px -24px rgba(214,255,74,0.35)',
              ],
            }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          >
            {/* Chat AI preview */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-[#d6ff4a]">
                  <Sparkles className="size-3.5 text-[#0a0d09]" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold text-[#f3f6ec]">
                  UMKMan AI
                </span>
                <motion.span
                  className="ml-auto size-2 rounded-full bg-[#d6ff4a]"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY }}
                />
              </div>

              <div className="rounded-xl rounded-tl-sm bg-[#1b2316] p-3">
                <p className="text-[11px] leading-relaxed text-[#9ba394]">
                  Foto kopi susu kamu sudah dianalisis. Ini caption siap posting:
                </p>
              </div>

              <div className="rounded-xl rounded-tl-sm border border-[#d6ff4a]/25 bg-[#151b12] p-3">
                <p className="text-[11px] leading-relaxed text-[#f3f6ec]">
                  {'"Es Kopi Susu Senja — gula aren asli, susu segar. Cuma 15rb, '}
                  <span className="text-[#d6ff4a]">order sekarang!</span>
                  {'"'}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <Check className="size-3 text-[#d6ff4a]" aria-hidden="true" />
                  <span className="text-[10px] text-[#9ba394]">
                    Selesai dalam 3 detik
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Floating chips */}
          <motion.div
            {...float(4.5, 12, 0.2)}
            className="absolute -left-20 top-16 flex items-center gap-2 rounded-full border border-[#f3f6ec]/15 bg-[#151b12]/90 px-3.5 py-2 backdrop-blur"
          >
            <Camera className="size-3.5 text-[#d6ff4a]" aria-hidden="true" />
            <span className="text-[11px] font-medium text-[#f3f6ec]">
              1 foto produk
            </span>
          </motion.div>

          <motion.div
            {...float(5.2, 10, 0.9)}
            className="absolute -right-16 top-36 flex items-center gap-2 rounded-full border border-[#f3f6ec]/15 bg-[#151b12]/90 px-3.5 py-2 backdrop-blur"
          >
            <Tag className="size-3.5 text-[#ff8a4c]" aria-hidden="true" />
            <span className="font-mono text-[11px] font-medium text-[#f3f6ec]">
              Rp 15.000
            </span>
          </motion.div>

          <motion.div
            {...float(4.8, 11, 1.5)}
            className="absolute -bottom-5 -left-14 rounded-2xl rounded-bl-sm border border-[#d6ff4a]/30 bg-[#d6ff4a] px-3.5 py-2"
          >
            <span className="text-[11px] font-semibold text-[#0a0d09]">
              +3 caption baru
            </span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
