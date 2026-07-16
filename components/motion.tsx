'use client'

import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion'
import { useEffect, useRef, type ReactNode } from 'react'

/* ---------- Scroll reveal ---------- */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
}

export function Reveal({
  children,
  delay = 0,
  className,
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'article' | 'li' | 'span'
}) {
  const Comp = motion[as]
  return (
    <Comp
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </Comp>
  )
}

export function Stagger({
  children,
  className,
  staggerChildren = 0.12,
}: {
  children: ReactNode
  className?: string
  staggerChildren?: number
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren } } }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  )
}

/* ---------- Animated counter ---------- */

export function CountUp({
  value,
  prefix = '',
  suffix = '',
  className,
  duration = 1.6,
}: {
  value: number
  prefix?: string
  suffix?: string
  className?: string
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { duration: duration * 1000, bounce: 0 })
  const rounded = useTransform(spring, (v) => Math.round(v).toLocaleString('id-ID'))

  useEffect(() => {
    if (inView) mv.set(value)
  }, [inView, value, mv])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return rounded.on('change', (v) => {
      el.textContent = `${prefix}${v}${suffix}`
    })
  }, [rounded, prefix, suffix])

  return (
    <span ref={ref} className={className}>
      {`${prefix}0${suffix}`}
    </span>
  )
}
