/**
 * User store FILE (email/password + Google).
 * Dipakai saat DATABASE_URL tidak di-set.
 *
 * Di Vercel: tulis ke /tmp (baca seed dari bundle) — lihat data-paths.ts.
 */

import { promises as fs } from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'
import type { AuthUser, UserRecord, UsersDatabase } from '@/lib/types'
import {
  ensureWritableDataDir,
  isServerlessEphemeral,
  seedDataDir,
  writableDataDir,
  writeJsonFile,
} from '@/lib/server/data-paths'

const USERS_FILENAME = 'users.json'
const USERS_SEED_FILENAME = 'users-seed.json'

function usersPath() {
  return path.join(writableDataDir(), USERS_FILENAME)
}

function usersSeedPath() {
  // Seed selalu dari bundle deployment (read-only di Vercel)
  return path.join(seedDataDir(), USERS_SEED_FILENAME)
}

let writeChain: Promise<unknown> = Promise.resolve()

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn)
  writeChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

async function pathExists(p: string) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function ensureUsersFile() {
  await ensureWritableDataDir()
  const dest = usersPath()
  if (await pathExists(dest)) return

  const seed = usersSeedPath()
  if (await pathExists(seed)) {
    await fs.copyFile(seed, dest)
    return
  }
  const empty: UsersDatabase = { version: 1, updatedAt: new Date().toISOString(), users: [] }
  await fs.writeFile(dest, JSON.stringify(empty, null, 2), 'utf8')
}

async function readUsers(): Promise<UsersDatabase> {
  await ensureUsersFile()
  const raw = await fs.readFile(usersPath(), 'utf8')
  return JSON.parse(raw) as UsersDatabase
}

async function writeUsers(db: UsersDatabase) {
  db.updatedAt = new Date().toISOString()
  db.version = (db.version || 0) + 1
  await ensureWritableDataDir()
  await writeJsonFile(usersPath(), db)
}

/** Tulis user; jangan gagalkan flow auth hanya karena disk Windows terkunci. */
async function writeUsersSafe(db: UsersDatabase) {
  try {
    await writeUsers(db)
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: string }).code)
        : ''
    console.error('[users-file] writeUsers failed', {
      ephemeral: isServerlessEphemeral(),
      dir: writableDataDir(),
      code,
      error: error instanceof Error ? error.message : error,
    })
    // Vercel / Windows EPERM: biarkan request lanjut (session JWT tetap bisa)
    if (isServerlessEphemeral() || code === 'EPERM' || code === 'EBUSY') return
    throw error
  }
}

export function toAuthUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture ?? null,
  }
}

export function sessionVersionOf(user: UserRecord) {
  return typeof user.sessionVersion === 'number' ? user.sessionVersion : 0
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const db = await readUsers()
  const key = email.trim().toLowerCase()
  return db.users.find((u) => u.email.toLowerCase() === key) ?? null
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  try {
    const db = await readUsers()
    return db.users.find((u) => u.id === id) ?? null
  } catch {
    return null
  }
}

export async function findUserByGoogleId(googleId: string): Promise<UserRecord | null> {
  const db = await readUsers()
  return db.users.find((u) => u.googleId === googleId) ?? null
}

export async function registerWithPassword(input: {
  email: string
  password: string
  name: string
}): Promise<{ user: AuthUser; sessionVersion: number }> {
  return withLock(async () => {
    const email = input.email.trim().toLowerCase()
    const name = input.name.trim()
    const password = input.password
    if (!email || !email.includes('@')) throw new Error('Email tidak valid.')
    if (password.length < 8) throw new Error('Kata sandi minimal 8 karakter.')
    if (!name) throw new Error('Nama wajib diisi.')

    const db = await readUsers()
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      throw new Error('Email sudah terdaftar. Silakan masuk.')
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user: UserRecord = {
      id: `user-${Date.now().toString(36)}`,
      email,
      name,
      passwordHash,
      googleId: null,
      picture: null,
      createdAt: new Date().toISOString(),
      sessionVersion: 0,
    }
    db.users.push(user)
    await writeUsersSafe(db)
    return { user: toAuthUser(user), sessionVersion: 0 }
  })
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<{ user: AuthUser; sessionVersion: number }> {
  const user = await findUserByEmail(email)
  if (!user || !user.passwordHash) {
    throw new Error('Email atau kata sandi salah.')
  }
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) throw new Error('Email atau kata sandi salah.')
  return { user: toAuthUser(user), sessionVersion: sessionVersionOf(user) }
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  nextPassword: string,
): Promise<{ sessionVersion: number }> {
  return withLock(async () => {
    const db = await readUsers()
    const user = db.users.find((u) => u.id === userId)
    if (!user) throw new Error('Akun tidak ditemukan.')
    if (!user.passwordHash) {
      throw new Error('Akun Google tidak punya kata sandi lokal.')
    }
    if (nextPassword.length < 8) throw new Error('Kata sandi baru minimal 8 karakter.')
    const ok = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!ok) throw new Error('Kata sandi saat ini salah.')
    user.passwordHash = await bcrypt.hash(nextPassword, 10)
    user.passwordChangedAt = new Date().toISOString()
    user.sessionVersion = sessionVersionOf(user) + 1
    user.sessions = []
    await writeUsers(db)
    return { sessionVersion: user.sessionVersion }
  })
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
  return withLock(async () => {
    const db = await readUsers()
    const user = db.users.find((u) => u.id === userId)
    if (!user) return
    const now = new Date().toISOString()
    const sessions = [...(user.sessions || [])]
    const idx = sessions.findIndex((s) => s.id === session.id)
    if (idx >= 0) {
      sessions[idx] = { ...sessions[idx], ...session, lastActiveAt: now, current: true }
    } else {
      sessions.unshift({ ...session, lastActiveAt: now, current: true })
    }
    user.sessions = sessions.slice(0, 8).map((s) => ({
      ...s,
      current: s.id === session.id,
    }))
    await writeUsersSafe(db)
  })
}

export async function revokeAllSessions(userId: string): Promise<{ sessionVersion: number }> {
  return withLock(async () => {
    const db = await readUsers()
    const user = db.users.find((u) => u.id === userId)
    if (!user) throw new Error('Akun tidak ditemukan.')
    user.sessionVersion = sessionVersionOf(user) + 1
    user.sessions = []
    await writeUsers(db)
    return { sessionVersion: user.sessionVersion }
  })
}

export async function revokeOtherSessions(
  userId: string,
  keepSessionMeta?: {
    id: string
    device: string
    location: string
  },
): Promise<{ sessionVersion: number }> {
  return withLock(async () => {
    const db = await readUsers()
    const user = db.users.find((u) => u.id === userId)
    if (!user) throw new Error('Akun tidak ditemukan.')
    user.sessionVersion = sessionVersionOf(user) + 1
    const now = new Date().toISOString()
    user.sessions = keepSessionMeta
      ? [{ ...keepSessionMeta, lastActiveAt: now, current: true }]
      : []
    await writeUsers(db)
    return { sessionVersion: user.sessionVersion }
  })
}

export async function deleteUserAccount(userId: string) {
  return withLock(async () => {
    const db = await readUsers()
    const before = db.users.length
    db.users = db.users.filter((u) => u.id !== userId)
    if (db.users.length === before) throw new Error('Akun tidak ditemukan.')
    await writeUsers(db)
  })
}

/** Login / daftar via Google — tidak mengaitkan ke NUSACID kecuali email cocok. */
export async function upsertGoogleUser(input: {
  googleId: string
  email: string
  name: string
  picture?: string | null
}): Promise<{ user: AuthUser; sessionVersion: number }> {
  return withLock(async () => {
    const db = await readUsers()
    const email = input.email.trim().toLowerCase()
    let user =
      db.users.find((u) => u.googleId === input.googleId) ||
      db.users.find((u) => u.email.toLowerCase() === email)

    if (user) {
      user.googleId = input.googleId
      user.name = input.name || user.name
      user.picture = input.picture ?? user.picture
      if (typeof user.sessionVersion !== 'number') user.sessionVersion = 0
      await writeUsersSafe(db)
      return { user: toAuthUser(user), sessionVersion: sessionVersionOf(user) }
    }

    user = {
      id: `user-${Date.now().toString(36)}`,
      email,
      name: input.name || email.split('@')[0],
      passwordHash: null,
      googleId: input.googleId,
      picture: input.picture ?? null,
      createdAt: new Date().toISOString(),
      sessionVersion: 0,
    }
    db.users.push(user)
    await writeUsersSafe(db)
    return { user: toAuthUser(user), sessionVersion: 0 }
  })
}
