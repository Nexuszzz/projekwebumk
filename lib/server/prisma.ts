/**
 * Prisma client singleton.
 * Hanya di-import saat DATABASE_URL tersedia (usePostgres()).
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export function getPrisma() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL belum di-set. Postgres mode tidak aktif.')
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }
  return globalForPrisma.prisma
}

export function usePostgres() {
  const url = process.env.DATABASE_URL || ''
  if (!url.startsWith('postgres')) return false
  // Placeholder hanya untuk `prisma generate` di build Vercel — bukan DB runtime
  if (url.includes('build:build@') || url.includes('@127.0.0.1:5432/build')) return false
  if (process.env.USE_POSTGRES === '0' || process.env.USE_POSTGRES === 'false') return false
  return true
}
