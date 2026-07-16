'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from './theme-provider'

export function ThemeToggle() {
  const { theme, toggleTheme, isTransitioning } = useTheme()

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      disabled={isTransitioning}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      className="relative flex size-9 items-center justify-center rounded-full border border-foreground/15 text-foreground transition-colors hover:border-accent/50 hover:bg-foreground/5 disabled:opacity-70"
      aria-label={
        theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="inline-flex"
        >
          {theme === 'dark' ? (
            <Sun className="size-4" aria-hidden="true" />
          ) : (
            <Moon className="size-4" aria-hidden="true" />
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}
