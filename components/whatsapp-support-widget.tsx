'use client'

import { QUICK_CHIPS, supportWaNumber, waMeLink } from '@/lib/support-faq'
import { AnimatePresence, motion } from 'framer-motion'
import { Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type ChatMsg = {
  id: string
  role: 'bot' | 'user'
  text: string
  escalate?: boolean
  waLink?: string
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.85 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function formatWaDisplay(n: string) {
  // 628xxx → +62 8xx-xxxx-xxxx (sederhana)
  if (n.startsWith('62') && n.length >= 11) {
    const rest = n.slice(2)
    return `+62 ${rest.slice(0, 3)}-${rest.slice(3, 7)}-${rest.slice(7)}`
  }
  return n
}

export function WhatsAppSupportWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Halo! Saya asisten support UMKMan 👋\nTanya fitur, cara daftar, atau demo. Kalau pertanyaan terlalu spesifik, saya arahkan ke CS WhatsApp.',
    },
  ])
  const listRef = useRef<HTMLDivElement>(null)
  const waNumber = supportWaNumber()
  const waDisplay = formatWaDisplay(waNumber)

  useEffect(() => {
    if (!open) return
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, open, busy])

  async function send(text: string) {
    const message = text.trim()
    if (!message || busy) return
    setInput('')
    const userId = `u-${Date.now()}`
    setMessages((prev) => [...prev, { id: userId, role: 'user', text: message }])
    setBusy(true)
    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const raw = await res.text()
      let data: { reply?: string; escalate?: boolean; waLink?: string } = {}
      if (raw) {
        try {
          data = JSON.parse(raw)
        } catch {
          data = {}
        }
      }
      let reply = String(data.reply || '').trim()
      // Jangan tampilkan JSON mentah ke user (bug model Gemini terpotong di production)
      const looksLikeJson =
        !reply ||
        reply.startsWith('{') ||
        reply.startsWith('[') ||
        /"reply"\s*:/.test(reply) ||
        /```json/i.test(reply)
      if (looksLikeJson) {
        reply =
          'Halo! Ada yang bisa dibantu seputar fitur UMKMan, cara daftar, atau demo? Atau chat CS WhatsApp di tombol hijau 😊'
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: 'bot',
          text: reply,
          escalate: Boolean(data.escalate),
          waLink: data.waLink || waMeLink(`Halo CS UMKMan: ${message}`),
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: 'bot',
          text: 'Koneksi bermasalah. Chat langsung ke CS WhatsApp ya.',
          escalate: true,
          waLink: waMeLink(message),
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-0 right-0 z-[60] p-3 safe-pb sm:p-5">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        <AnimatePresence>
          {open && (
            <motion.div
              role="dialog"
              aria-label="Chat support UMKMan"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-[min(100vw-1.5rem,22rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center gap-3 bg-[#075E54] px-3.5 py-3 text-white">
                <span className="flex size-10 items-center justify-center rounded-full bg-white/15">
                  <WhatsAppGlyph className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-tight">Support UMKMan</p>
                  <p className="text-[11px] text-white/80">
                    Online · CS: {waDisplay}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Tutup chat"
                  className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Messages */}
              <div
                ref={listRef}
                className="flex max-h-[min(52dvh,22rem)] flex-col gap-2 overflow-y-auto bg-[#0b141a] px-3 py-3"
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed shadow-sm ${
                        msg.role === 'user'
                          ? 'rounded-br-md bg-[#005c4b] text-white'
                          : 'rounded-bl-md bg-[#1f2c34] text-[#e9edef]'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      {msg.escalate && msg.waLink && (
                        <a
                          href={msg.waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 flex items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-3 py-2 text-xs font-bold text-[#053b1f] transition-opacity hover:opacity-90"
                        >
                          <WhatsAppGlyph className="size-3.5" />
                          Lanjut chat CS di WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md bg-[#1f2c34] px-3 py-2 text-xs text-white/60">
                      Mengetik…
                    </div>
                  </div>
                )}
              </div>

              {/* Quick chips */}
              <div className="flex gap-1.5 overflow-x-auto border-t border-border/60 bg-card px-2.5 py-2">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (chip.id === 'wa') {
                        window.open(
                          waMeLink('Halo CS UMKMan, saya butuh bantuan.'),
                          '_blank',
                          'noopener,noreferrer',
                        )
                        return
                      }
                      void send(chip.label)
                    }}
                    className="shrink-0 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-accent/40 disabled:opacity-50"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Input */}
              <form
                className="flex items-center gap-2 border-t border-border bg-card p-2.5"
                onSubmit={(e) => {
                  e.preventDefault()
                  void send(input)
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tanya seputar UMKMan…"
                  maxLength={500}
                  className="min-h-10 min-w-0 flex-1 rounded-full border border-input bg-background px-3.5 text-sm outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  aria-label="Kirim"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-[#053b1f] disabled:opacity-40"
                >
                  <Send className="size-4" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB bubble */}
        <motion.button
          type="button"
          aria-label={open ? 'Tutup support WhatsApp' : 'Buka support WhatsApp'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          whileTap={{ scale: 0.94 }}
          className="relative flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_28px_-4px_rgba(37,211,102,0.65)] ring-4 ring-[#25D366]/25 transition-transform hover:scale-105"
        >
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span
                key="x"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <X className="size-6" />
              </motion.span>
            ) : (
              <motion.span
                key="wa"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                <WhatsAppGlyph className="size-7" />
                <span className="absolute -right-1 -top-1 flex size-3">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/70 opacity-75" />
                  <span className="relative inline-flex size-3 rounded-full bg-white" />
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Hint label when closed */}
        {!open && (
          <span className="pointer-events-none absolute bottom-[4.25rem] right-0 hidden rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold shadow-lg sm:block">
            Butuh bantuan? Chat kami
          </span>
        )}
      </div>
    </div>
  )
}

// re-export helpers for client (support-faq is isomorphic enough)
// supportWaNumber uses process.env.NEXT_PUBLIC_* which is inlined on client
