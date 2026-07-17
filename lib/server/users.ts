/**
 * User store router.
 * - DATABASE_URL postgres → users-pg
 * - else → users-file (JSON)
 */

import { usePostgres } from '@/lib/server/prisma'

async function backend() {
  if (usePostgres()) return import('@/lib/server/users-pg')
  return import('@/lib/server/users-file')
}

export async function findUserByEmail(
  ...args: Parameters<typeof import('@/lib/server/users-file').findUserByEmail>
) {
  const m = await backend()
  return m.findUserByEmail(...args)
}

export async function findUserById(
  ...args: Parameters<typeof import('@/lib/server/users-file').findUserById>
) {
  const m = await backend()
  return m.findUserById(...args)
}

export async function findUserByGoogleId(
  ...args: Parameters<typeof import('@/lib/server/users-file').findUserByGoogleId>
) {
  const m = await backend()
  return m.findUserByGoogleId(...args)
}

export async function registerWithPassword(
  ...args: Parameters<typeof import('@/lib/server/users-file').registerWithPassword>
) {
  const m = await backend()
  return m.registerWithPassword(...args)
}

export async function loginWithPassword(
  ...args: Parameters<typeof import('@/lib/server/users-file').loginWithPassword>
) {
  const m = await backend()
  return m.loginWithPassword(...args)
}

export async function changePassword(
  ...args: Parameters<typeof import('@/lib/server/users-file').changePassword>
) {
  const m = await backend()
  return m.changePassword(...args)
}

export async function getUserSecurity(
  ...args: Parameters<typeof import('@/lib/server/users-file').getUserSecurity>
) {
  const m = await backend()
  return m.getUserSecurity(...args)
}

export async function touchUserSession(
  ...args: Parameters<typeof import('@/lib/server/users-file').touchUserSession>
) {
  const m = await backend()
  return m.touchUserSession(...args)
}

export async function revokeAllSessions(
  ...args: Parameters<typeof import('@/lib/server/users-file').revokeAllSessions>
) {
  const m = await backend()
  return m.revokeAllSessions(...args)
}

export async function revokeOtherSessions(
  ...args: Parameters<typeof import('@/lib/server/users-file').revokeOtherSessions>
) {
  const m = await backend()
  return m.revokeOtherSessions(...args)
}

export async function deleteUserAccount(
  ...args: Parameters<typeof import('@/lib/server/users-file').deleteUserAccount>
) {
  const m = await backend()
  return m.deleteUserAccount(...args)
}

export async function upsertGoogleUser(
  ...args: Parameters<typeof import('@/lib/server/users-file').upsertGoogleUser>
) {
  const m = await backend()
  return m.upsertGoogleUser(...args)
}

export { toAuthUser, sessionVersionOf } from '@/lib/server/users-file'
