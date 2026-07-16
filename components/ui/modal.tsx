'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Tailwind max-width class untuk panel, mis. "sm:max-w-lg" */
  maxWidth?: string
  /** Subteks kecil di bawah judul */
  subtitle?: string
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'sm:max-w-lg',
  subtitle,
}: ModalProps) {
  const [mounted, setMounted] = useState(false)
  const titleId = useId()

  useEffect(() => {
    setMounted(true)
  }, [])

  /* Kunci scroll body saat modal terbuka */
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  /* Tutup dengan Escape */
  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Panel — full-screen di mobile, card centered di desktop */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={`relative flex h-dvh w-full flex-col overflow-hidden border-border bg-card shadow-2xl sm:h-auto sm:max-h-[90dvh] sm:rounded-3xl sm:border ${maxWidth}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2
                  id={titleId}
                  className="font-display text-lg font-bold tracking-tight text-balance"
                >
                  {title}
                </h2>
                {subtitle ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground text-pretty">
                    {subtitle}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup dialog"
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-accent/40 hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            {/* Body scrollable */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
