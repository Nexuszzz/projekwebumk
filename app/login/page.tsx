import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/auth-form'
import { AuthVisual } from '@/components/auth/auth-visual'

export const metadata: Metadata = {
  title: 'Masuk — UMKMan',
  description:
    'Masuk atau daftar UMKMan untuk mulai mengubah foto produk jadi konten siap jual dalam hitungan detik.',
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-stretch justify-center bg-background p-3 safe-px safe-pb sm:items-center sm:p-6 md:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 sm:rounded-[28px] lg:grid-cols-2 lg:p-3">
        <Suspense
          fallback={
            <div className="flex min-h-[min(70dvh,420px)] items-center justify-center p-6 text-sm text-muted-foreground sm:p-10">
              Memuat form…
            </div>
          }
        >
          <AuthForm />
        </Suspense>
        <AuthVisual />
      </div>
    </main>
  )
}
