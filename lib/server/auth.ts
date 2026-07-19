/**
 * Session JWT (httpOnly cookie) + helpers auth.
 * Production: AUTH_SECRET wajib (≥16 karakter). Tidak ada fallback di production.
 */

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'
import type { AuthUser } from '@/lib/types'
import { ensureUserFromAuth, findUserById } from '@/lib/server/users'
import { usePostgres } from '@/lib/server/prisma'

export const SESSION_COOKIE = 'umkman_session'
const SESSION_DAYS = 14

/** Trim + buang CR/LF — env Vercel/Windows sering ke-paste dengan trailing newline. */
export function envTrim(key: string): string {
  return (process.env[key] || '').replace(/[\r\n]+/g, '').trim()
}

function getSecretBytes() {
  const secret = envTrim('AUTH_SECRET') || envTrim('NEXTAUTH_SECRET')
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET wajib di production (minimal 16 karakter).')
    }
    // Dev only — jangan dipakai di deploy
    return new TextEncoder().encode('umkman-dev-secret-change-me-32b')
  }
  return new TextEncoder().encode(secret)
}

export function appUrl() {
  return (envTrim('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000').replace(/\/$/, '')
}

export function googleClientId() {
  return envTrim('GOOGLE_CLIENT_ID')
}

export function googleClientSecret() {
  return envTrim('GOOGLE_CLIENT_SECRET')
}

export function googleOAuthConfigured() {
  return Boolean(googleClientId() && googleClientSecret())
}

export async function createSessionToken(user: AuthUser, sessionVersion = 0): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture ?? null,
    sv: sessionVersion,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecretBytes())
}

export async function verifySessionToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretBytes())
    if (!payload.sub || typeof payload.email !== 'string') return null

    const tokenSv = typeof payload.sv === 'number' ? payload.sv : 0

    // Validasi sessionVersion — revoke / ganti sandi membatalkan JWT lama
    const user = await findUserById(payload.sub)
    if (user) {
      const currentSv = typeof user.sessionVersion === 'number' ? user.sessionVersion : 0
      if (tokenSv !== currentSv) return null
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture ?? null,
      }
    }

    const claimUser: AuthUser = {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === 'string' && payload.name ? payload.name : payload.email,
      picture: typeof payload.picture === 'string' ? payload.picture : null,
    }

    // Postgres: JWT dari era /tmp atau cold-start — rehydrate baris User agar FK business OK
    if (usePostgres()) {
      try {
        return await ensureUserFromAuth(claimUser)
      } catch (error) {
        console.error('[auth] ensureUserFromAuth failed', error)
        return null
      }
    }

    // File store di Vercel: data /tmp bisa hilang — percaya claim JWT
    if (process.env.VERCEL || process.env.ALLOW_JWT_ONLY_SESSION === '1') {
      return claimUser
    }

    return null
  } catch {
    return null
  }
}

export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const jar = await cookies()
    const token = jar.get(SESSION_COOKIE)?.value
    if (!token) return null
    return verifySessionToken(token)
  } catch {
    return null
  }
}

export async function getSessionUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value
    if (!token) return null
    return verifySessionToken(token)
  } catch {
    return null
  }
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export function unauthorized(message = 'Silakan masuk dulu.') {
  return Response.json({ error: message }, { status: 401 })
}
