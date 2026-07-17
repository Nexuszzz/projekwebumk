'use client'

import { AiAssistant } from '@/components/dashboard/ai-assistant'
import { ActivityTable } from '@/components/dashboard/activity-table'
import { AddTransactionModal } from '@/components/dashboard/add-transaction-modal'
import { ContentView } from '@/components/dashboard/content-view'
import { GenerateContentModal } from '@/components/dashboard/generate-content-modal'
import { DashboardNavbar, type DashboardTab } from '@/components/dashboard/dashboard-navbar'
import { PriorityTasks } from '@/components/dashboard/priority-tasks'
import { RevenuePanel } from '@/components/dashboard/revenue-panel'
import { StatCards } from '@/components/dashboard/stat-cards'
import { TransactionView } from '@/components/dashboard/transaction-view'
import { HistoryView } from '@/components/dashboard/history-view'
import { SettingsView } from '@/components/dashboard/settings-view'
import { OnboardingPanel } from '@/components/dashboard/onboarding'
import { DashboardProvider, useDashboard } from '@/lib/dashboard-store'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'

function DashboardShell() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('Ringkasan')
  const { loading, error, ready, refresh, needsOnboarding } = useDashboard()

  return (
    <main className="relative min-h-screen overflow-hidden px-3 py-4 sm:px-6 sm:py-8 lg:px-10">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/5 h-80 w-80 rounded-full bg-accent-warm/8 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto flex w-full max-w-[1360px] flex-col gap-5 rounded-3xl border border-border bg-card p-4 shadow-2xl sm:gap-6 sm:rounded-[2rem] sm:p-6 lg:p-8"
      >
        <DashboardNavbar activeTab={activeTab} onTabChange={setActiveTab} />

        {loading && !ready && (
          <p className="rounded-xl border border-border bg-secondary/40 px-4 py-6 text-center text-sm text-muted-foreground">
            Memuat akun &amp; data usaha...
          </p>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-5 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-accent-foreground"
            >
              Coba lagi
            </button>
          </div>
        )}

        {ready && needsOnboarding && <OnboardingPanel />}

        {ready && !needsOnboarding && (
          <AnimatePresence mode="wait" initial={false}>
            {activeTab === 'Konten' ? (
              <motion.div
                key="konten"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <ContentView />
              </motion.div>
            ) : activeTab === 'Transaksi' ? (
              <motion.div
                key="transaksi"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <TransactionView />
              </motion.div>
            ) : activeTab === 'Riwayat' ? (
              <motion.div
                key="riwayat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <HistoryView />
              </motion.div>
            ) : activeTab === 'Pengaturan' ? (
              <motion.div
                key="pengaturan"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <SettingsView />
              </motion.div>
            ) : (
              <motion.div
                key="ringkasan"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6"
              >
                <div className="flex flex-col gap-5 lg:col-span-2 lg:gap-6">
                  <StatCards />
                  <RevenuePanel />
                  <ActivityTable />
                </div>
                <div className="flex flex-col gap-5 lg:gap-6">
                  <PriorityTasks onNavigate={setActiveTab} />
                  <AiAssistant onNavigate={setActiveTab} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>

      <GenerateContentModal />
      <AddTransactionModal />
    </main>
  )
}

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardShell />
    </DashboardProvider>
  )
}
