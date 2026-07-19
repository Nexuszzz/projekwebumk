'use client'

import { useEffect } from 'react'

/**
 * Native polish HANYA di Capacitor WebView.
 * Di browser web biasa: no-op total (tidak import plugin, tidak ubah UI/routing).
 */
function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false
  try {
    // Bridge native di-inject Capacitor — ada di app, tidak ada di Chrome biasa
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor
    return Boolean(cap?.isNativePlatform?.())
  } catch {
    return false
  }
}

export function CapacitorInit() {
  useEffect(() => {
    // Guard ketat: web production/local tetap murni Next.js
    if (!isCapacitorNative()) return

    let cancelled = false
    let removeListener: (() => void) | undefined

    async function boot() {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        const { SplashScreen } = await import('@capacitor/splash-screen')
        const { App } = await import('@capacitor/app')
        if (cancelled) return

        await StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
        await StatusBar.setBackgroundColor({ color: '#0b141a' }).catch(() => {})
        await SplashScreen.hide().catch(() => {})

        const sub = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) window.history.back()
          else void App.minimizeApp()
        })
        removeListener = () => {
          void sub.remove()
        }
      } catch {
        // Plugin gagal → biarkan web jalan normal
      }
    }

    void boot()
    return () => {
      cancelled = true
      removeListener?.()
    }
  }, [])

  return null
}
