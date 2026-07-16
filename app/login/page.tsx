import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth/auth-form'
import { AuthVisual } from '@/components/auth/auth-visual'

export const metadata: Metadata = {
  title: 'Masuk — UMKMan',
  description:
    'Masuk atau daftar UMKMan untuk mulai mengubah foto produk jadi konten siap jual dalam hitungan detik.',
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 md:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl shadow-black/20 lg:grid-cols-2 lg:p-3">
        <AuthForm />
        <AuthVisual />
      </div>
    </main>
  )
}
