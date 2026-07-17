/**
 * Session JWT (httpOnly cookie) + helpers auth.
 * Production: AUTH_SECRET wajib (≥16 karakter). Tidak ada fallback di production.
 */

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'
import type { AuthUser } from '@/lib/types'
import { findUserById } from '@/lib/server/users'

export const SESSION_COOKIE = 'umkman_session'
const SESSION_DAYS = 14

function getSecretBytes() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
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
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}

export function googleOAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
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

    // Validasi sessionVersion — revoke / ganti sandi membatalkan JWT lama
    const user = await findUserById(payload.sub)
    if (!user) return null
    const tokenSv = typeof payload.sv === 'number' ? payload.sv : 0
    const currentSv = typeof user.sessionVersion === 'number' ? user.sessionVersion : 0
    if (tokenSv !== currentSv) return null

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture ?? null,
    }
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
