'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

type Theme = 'dark' | 'light'

type ThemeContextValue = {
  theme: Theme
  toggleTheme: () => void
  isTransitioning: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  isTransitioning: false,
})

export function useTheme() {
  return useContext(ThemeContext)
}

const COLS = 18
const ROWS = 11

type Pixel = {
  delay: number
  color: string
}

const DARK_PALETTE = ['#0a0d09', '#151b12', '#d6ff4a', '#0a0d09', '#151b12']
const LIGHT_PALETTE = ['#f7f9f1', '#ffffff', '#517d00', '#f7f9f1', '#ecf1de']

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [pixels, setPixels] = useState<Pixel[] | null>(null)
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([])

  // Sync with the class set by the FOUC-prevention script in layout
  useEffect(() => {
    const isLight = document.documentElement.classList.contains('light')
    setTheme(isLight ? 'light' : 'dark')
    return () => {
      timeouts.current.forEach(clearTimeout)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    if (pixels) return
    const target: Theme = theme === 'dark' ? 'light' : 'dark'
    const palette = target === 'dark' ? DARK_PALETTE : LIGHT_PALETTE

    setPixels(
      Array.from({ length: COLS * ROWS }, () => ({
        delay: Math.random() * 0.4,
        color: palette[Math.floor(Math.random() * palette.length)],
      })),
    )

    // Flip the theme while the screen is fully covered by pixels
    timeouts.current.push(
      setTimeout(() => {
        document.documentElement.classList.toggle('light', target === 'light')
        try {
          localStorage.setItem('theme', target)
        } catch {
          /* private mode */
        }
        setTheme(target)
      }, 650),
    )

    // Remove the overlay after the pixels have popped out
    timeouts.current.push(
      setTimeout(() => {
        setPixels(null)
      }, 1800),
    )
  }, [pixels, theme])

  const value = useMemo(
    () => ({ theme, toggleTheme, isTransitioning: pixels !== null }),
    [theme, toggleTheme, pixels],
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {pixels && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[100] grid"
            style={{
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            {pixels.map((p, i) => (
              <motion.span
                key={i}
                style={{ backgroundColor: p.color }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{
                  duration: 1.3,
                  times: [0, 0.04, 0.62, 0.68],
                  delay: p.delay,
                  ease: 'linear',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </ThemeContext.Provider>
  )
}
