'use client'

import { Stagger, StaggerItem } from '@/components/motion'
import { useDashboard } from '@/lib/dashboard-store'
import { BarChart3, ImagePlus, Mic, Search, Send } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import type { DashboardTab } from './dashboard-navbar'

type QuickAction = {
  icon: LucideIcon
  label: string
  feature: string
  action?: 'content' | 'transaction' | 'summary' | 'history'
}

const ACTIONS: QuickAction[] = [
  { icon: ImagePlus, label: 'Buat Caption dari Foto', feature: 'Generator Konten', action: 'content' },
  { icon: Mic, label: 'Catat Transaksi Baru', feature: 'Pencatatan Transaksi', action: 'transaction' },
  { icon: BarChart3, label: 'Lihat Ringkasan Omzet', feature: 'Ringkasan AI', action: 'summary' },
  { icon: Search, label: 'Cari Konten Lama', feature: 'Riwayat Konten', action: 'history' },
]

export function AiAssistant({ onNavigate }: { onNavigate: (tab: DashboardTab) => void }) {
  const { openContentModal, openTransactionModal } = useDashboard()
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleAction(action?: QuickAction['action']) {
    if (action === 'content') openContentModal()
    else if (action === 'transaction') openTransactionModal()
    else if (action === 'summary') onNavigate('Ringkasan')
    else if (action === 'history') onNavigate('Riwayat')
  }

  async function submitCommand() {
    const command = query.trim().toLowerCase()
    if (!command) return
    setError(null)
    setAnswer(null)
    if (command.includes('konten') || command.includes('caption')) openContentModal()
    else if (command.includes('transaksi') || command.includes('jual')) openTransactionModal()
    else if (command.includes('riwayat') || command.includes('cari')) onNavigate('Riwayat')
    else {
      setLoading(true)
      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: 'assistant', message: query.trim() }),
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'AI gagal menjawab.')
        setAnswer(payload.text)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'AI gagal menjawab.')
      } finally {
        setLoading(false)
      }
    }
    setQuery('')
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-accent/20 bg-secondary/40 p-5">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Hai, Rina 👋</p>
        <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-balance">
          Ada yang bisa dibantu?
        </h2>
      </div>

      <Stagger className="grid grid-cols-2 gap-2.5" staggerChildren={0.08}>
        {ACTIONS.map((action) => (
          <StaggerItem key={action.label}>
            <button
              type="button"
              onClick={() => handleAction(action.action)}
              className="flex h-full w-full flex-col gap-2.5 rounded-xl border border-border bg-background/60 p-3.5 text-left transition-colors hover:border-accent/40 hover:bg-background"
            >
              <span
                className="flex size-8 items-center justify-center rounded-lg bg-accent/15 text-accent"
                aria-hidden="true"
              >
                <action.icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold leading-snug text-pretty">
                  {action.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {action.feature}
                </span>
              </span>
            </button>
          </StaggerItem>
        ))}
      </Stagger>

      <form
        className="relative"
        onSubmit={(e) => { e.preventDefault(); submitCommand() }}
        aria-label="Kirim perintah ke asisten AI"
      >
        <label htmlFor="assistant-input" className="sr-only">
          Ketik kebutuhanmu
        </label>
        <input
          id="assistant-input"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ketik kebutuhanmu..."
          className="h-11 w-full rounded-full border border-input bg-background/60 pl-4 pr-11 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        <button
          type="submit"
          aria-label="Kirim perintah"
          disabled={!query.trim()}
          className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-accent-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="size-3.5" aria-hidden="true" />
        </button>
      </form>
      {(loading || answer || error) && (
        <div className="rounded-xl border border-accent/20 bg-background/50 p-3 text-sm leading-relaxed" aria-live="polite">
          {loading && <p className="text-muted-foreground">AI sedang berpikir...</p>}
          {answer && <p>{answer}</p>}
          {error && <p role="alert" className="text-destructive">{error}</p>}
        </div>
      )}
    </section>
  )
}
