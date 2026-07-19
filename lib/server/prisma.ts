/**
 * Prisma client singleton.
 * Hanya di-import saat DATABASE_URL tersedia (usePostgres()).
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function databaseUrl() {
  return (process.env.DATABASE_URL || '').replace(/[\r\n]+/g, '').trim()
}

export function getPrisma() {
  const url = databaseUrl()
  if (!url) {
    throw new Error('DATABASE_URL belum di-set. Postgres mode tidak aktif.')
  }
  if (!globalForPrisma.prisma) {
    // Pastikan Prisma pakai URL bersih (tanpa CRLF dari env Vercel)
    process.env.DATABASE_URL = url
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }
  return globalForPrisma.prisma
}

export function usePostgres() {
  const url = databaseUrl()
  if (!url.startsWith('postgres')) return false
  // Placeholder hanya untuk `prisma generate` di build Vercel — bukan DB runtime
  if (url.includes('build:build@') || url.includes('@127.0.0.1:5432/build')) return false
  if (process.env.USE_POSTGRES === '0' || process.env.USE_POSTGRES === 'false') return false
  return true
}
