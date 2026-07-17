/**
 * Seed Postgres dari data/seed.json + data/users-seed.json
 * Usage: npx tsx scripts/seed-pg.ts
 * Requires: DATABASE_URL
 */

import { promises as fs } from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DATA = path.join(process.cwd(), 'data')

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Set DATABASE_URL dulu (lihat docker-compose.yml).')
  }

  const usersSeed = JSON.parse(await fs.readFile(path.join(DATA, 'users-seed.json'), 'utf8')) as {
    users: Array<{
      id: string
      email: string
      name: string
      passwordHash: string | null
      googleId: string | null
      picture: string | null
      createdAt: string
    }>
  }

  const bizSeed = JSON.parse(await fs.readFile(path.join(DATA, 'seed.json'), 'utf8')) as {
    businesses: Array<{
      id: string
      slug: string
      ownerUserId: string
      createdAt: string
      updatedAt: string
      profile: Record<string, unknown>
      catalog: Array<Record<string, unknown>>
      contents: Array<Record<string, unknown>>
      transactions: Array<Record<string, unknown>>
    }>
  }

  console.log('Clearing tables…')
  await prisma.transaction.deleteMany()
  await prisma.content.deleteMany()
  await prisma.product.deleteMany()
  await prisma.business.deleteMany()
  await prisma.user.deleteMany()

  console.log(`Seeding ${usersSeed.users.length} users…`)
  for (const u of usersSeed.users) {
    await prisma.user.create({
      data: {
        id: u.id,
        email: u.email,
        name: u.name,
        passwordHash: u.passwordHash,
        googleId: u.googleId,
        picture: u.picture,
        createdAt: new Date(u.createdAt),
        sessionVersion: 0,
        sessions: [],
        activeBusinessId: null,
      },
    })
  }

  for (const b of bizSeed.businesses) {
    console.log(`Seeding business ${b.slug}…`)
    await prisma.business.create({
      data: {
        id: b.id,
        slug: b.slug,
        ownerUserId: b.ownerUserId,
        createdAt: new Date(b.createdAt),
        updatedAt: new Date(b.updatedAt),
        profile: b.profile as object,
      },
    })
    await prisma.user.update({
      where: { id: b.ownerUserId },
      data: { activeBusinessId: b.id },
    })

    for (const p of b.catalog || []) {
      await prisma.product.create({
        data: {
          id: String(p.id),
          businessId: b.id,
          name: String(p.name),
          shortName: String(p.shortName || p.name),
          variant: String(p.variant || '-'),
          image: String(p.image || '/placeholder.svg'),
          unitPrice: Number(p.unitPrice) || 0,
          rating: Number(p.rating) || 0,
          sold: Number(p.sold) || 0,
          description: String(p.description || ''),
          stock: Number(p.stock) || 0,
          lowStockAt: Number(p.lowStockAt) || 10,
          sku: String(p.sku || p.id),
          keywords: Array.isArray(p.keywords) ? p.keywords : [],
        },
      })
    }

    for (const c of b.contents || []) {
      await prisma.content.create({
        data: {
          id: String(c.id),
          businessId: b.id,
          createdAt: new Date(String(c.createdAt || Date.now())),
          title: String(c.title || ''),
          description: String(c.description || ''),
          image: String(c.image || '/placeholder.svg'),
          platform: String(c.platform || 'Instagram'),
          status: String(c.status || 'Draft'),
        },
      })
    }

    for (const t of b.transactions || []) {
      await prisma.transaction.create({
        data: {
          id: String(t.id),
          businessId: b.id,
          createdAt: new Date(String(t.createdAt || Date.now())),
          productId: String(t.productId || ''),
          product: String(t.product || ''),
          variant: String(t.variant || '-'),
          image: String(t.image || '/placeholder.svg'),
          qty: Number(t.qty) || 1,
          unitPrice: Number(t.unitPrice) || 0,
          total: Number(t.total) || 0,
          status: String(t.status || 'Tersimpan'),
          date: String(t.date || ''),
          time: String(t.time || ''),
        },
      })
    }
  }

  console.log('Seed Postgres selesai.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
