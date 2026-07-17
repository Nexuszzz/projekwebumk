/**
 * User store — Postgres (Prisma).
 */

import { getPrisma } from '@/lib/server/prisma'
import type { AuthUser, UserRecord, UserSessionRecord } from '@/lib/types'
import type { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

export function toAuthUser(user: {
  id: string
  email: string
  name: string
  picture: string | null
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture ?? null,
  }
}

export function sessionVersionOf(user: { sessionVersion?: number | null }) {
  return typeof user.sessionVersion === 'number' ? user.sessionVersion : 0
}

function mapSessions(raw: unknown): UserSessionRecord[] {
  if (!Array.isArray(raw)) return []
  return raw as UserSessionRecord[]
}

function toRecord(u: {
  id: string
  email: string
  name: string
  passwordHash: string | null
  googleId: string | null
  picture: string | null
  createdAt: Date
  passwordChangedAt: Date | null
  sessionVersion: number
  sessions: unknown
}): UserRecord {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    passwordHash: u.passwordHash,
    googleId: u.googleId,
    picture: u.picture,
    createdAt: u.createdAt.toISOString(),
    passwordChangedAt: u.passwordChangedAt?.toISOString() ?? null,
    sessionVersion: u.sessionVersion,
    sessions: mapSessions(u.sessions),
  }
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const prisma = getPrisma()
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  return user ? toRecord(user) : null
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const prisma = getPrisma()
  const user = await prisma.user.findUnique({ where: { id } })
  return user ? toRecord(user) : null
}

export async function findUserByGoogleId(googleId: string): Promise<UserRecord | null> {
  const prisma = getPrisma()
  const user = await prisma.user.findUnique({ where: { googleId } })
  return user ? toRecord(user) : null
}

export async function registerWithPassword(input: {
  email: string
  password: string
  name: string
}): Promise<{ user: AuthUser; sessionVersion: number }> {
  const prisma = getPrisma()
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  const password = input.password
  if (!email || !email.includes('@')) throw new Error('Email tidak valid.')
  if (password.length < 8) throw new Error('Kata sandi minimal 8 karakter.')
  if (!name) throw new Error('Nama wajib diisi.')

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) throw new Error('Email sudah terdaftar. Silakan masuk.')

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      id: `user-${Date.now().toString(36)}`,
      email,
      name,
      passwordHash,
      sessionVersion: 0,
      sessions: [],
    },
  })
  return { user: toAuthUser(user), sessionVersion: 0 }
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<{ user: AuthUser; sessionVersion: number }> {
  const user = await findUserByEmail(email)
  if (!user || !user.passwordHash) throw new Error('Email atau kata sandi salah.')
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) throw new Error('Email atau kata sandi salah.')
  return { user: toAuthUser(user), sessionVersion: sessionVersionOf(user) }
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  nextPassword: string,
): Promise<{ sessionVersion: number }> {
  const prisma = getPrisma()
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('Akun tidak ditemukan.')
  if (!user.passwordHash) throw new Error('Akun Google tidak punya kata sandi lokal.')
  if (nextPassword.length < 8) throw new Error('Kata sandi baru minimal 8 karakter.')
  const ok = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!ok) throw new Error('Kata sandi saat ini salah.')
  const passwordHash = await bcrypt.hash(nextPassword, 10)
  const nextSv = sessionVersionOf(user) + 1
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
      sessionVersion: nextSv,
      sessions: [],
    },
  })
  return { sessionVersion: nextSv }
}

export async function getUserSecurity(userId: string) {
  const user = await findUserById(userId)
  if (!user) throw new Error('Akun tidak ditemukan.')
  return {
    hasPassword: Boolean(user.passwordHash),
    passwordChangedAt: user.passwordChangedAt || null,
    sessions: user.sessions || [],
    sessionVersion: sessionVersionOf(user),
    createdAt: user.createdAt,
    email: user.email,
    name: user.name,
  }
}

export async function touchUserSession(
  userId: string,
  session: { id: string; device: string; location: string },
) {
  const prisma = getPrisma()
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return
  const now = new Date().toISOString()
  const sessions = mapSessions(user.sessions)
  const idx = sessions.findIndex((s) => s.id === session.id)
  if (idx >= 0) {
    sessions[idx] = { ...sessions[idx], ...session, lastActiveAt: now, current: true }
  } else {
    sessions.unshift({ ...session, lastActiveAt: now, current: true })
  }
  const next = sessions.slice(0, 8).map((s) => ({ ...s, current: s.id === session.id }))
  await prisma.user.update({
    where: { id: userId },
    data: { sessions: next as unknown as Prisma.InputJsonValue },
  })
}

export async function revokeAllSessions(userId: string): Promise<{ sessionVersion: number }> {
  const prisma = getPrisma()
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('Akun tidak ditemukan.')
  const nextSv = sessionVersionOf(user) + 1
  await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: nextSv, sessions: [] },
  })
  return { sessionVersion: nextSv }
}

export async function revokeOtherSessions(
  userId: string,
  keepSessionMeta?: { id: string; device: string; location: string },
): Promise<{ sessionVersion: number }> {
  const prisma = getPrisma()
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('Akun tidak ditemukan.')
  const nextSv = sessionVersionOf(user) + 1
  const now = new Date().toISOString()
  const sessions = keepSessionMeta
    ? [{ ...keepSessionMeta, lastActiveAt: now, current: true }]
    : []
  await prisma.user.update({
    where: { id: userId },
    data: {
      sessionVersion: nextSv,
      sessions: sessions as unknown as Prisma.InputJsonValue,
    },
  })
  return { sessionVersion: nextSv }
}

export async function deleteUserAccount(userId: string) {
  const prisma = getPrisma()
  await prisma.user.delete({ where: { id: userId } })
}

export async function upsertGoogleUser(input: {
  googleId: string
  email: string
  name: string
  picture?: string | null
}): Promise<{ user: AuthUser; sessionVersion: number }> {
  const prisma = getPrisma()
  const email = input.email.trim().toLowerCase()
  let user =
    (await prisma.user.findUnique({ where: { googleId: input.googleId } })) ||
    (await prisma.user.findUnique({ where: { email } }))

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: input.googleId,
        name: input.name || user.name,
        picture: input.picture ?? user.picture,
      },
    })
    return { user: toAuthUser(user), sessionVersion: sessionVersionOf(user) }
  }

  user = await prisma.user.create({
    data: {
      id: `user-${Date.now().toString(36)}`,
      email,
      name: input.name || email.split('@')[0],
      passwordHash: null,
      googleId: input.googleId,
      picture: input.picture ?? null,
      sessionVersion: 0,
      sessions: [],
    },
  })
  return { user: toAuthUser(user), sessionVersion: 0 }
}
