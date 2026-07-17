import { jwtVerify } from 'jose'
import { NextResponse, type NextRequest } from 'next/server'

const SESSION_COOKIE = 'umkman_session'

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret || secret.length < 16) {
    return new TextEncoder().encode('umkman-dev-secret-change-me-32b')
  }
  return new TextEncoder().encode(secret)
}

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return false
  try {
    await jwtVerify(token, getSecret())
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isLoggedIn = await hasValidSession(request)

  // Lindungi dashboard
  if (pathname.startsWith('/dashboard')) {
    if (!isLoggedIn) {
      const login = new URL('/login', request.url)
      login.searchParams.set('next', pathname)
      return NextResponse.redirect(login)
    }
    return NextResponse.next()
  }

  // Lindungi API bisnis (kecuali auth & health AI GET boleh?)
  if (
    pathname.startsWith('/api/business') ||
    pathname.startsWith('/api/businesses') ||
    pathname.startsWith('/api/catalog') ||
    pathname.startsWith('/api/contents') ||
    pathname.startsWith('/api/transactions') ||
    pathname.startsWith('/api/media') ||
    pathname.startsWith('/api/reports') ||
    (pathname.startsWith('/api/ai') && request.method === 'POST') ||
    pathname.startsWith('/api/ai/')
  ) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: 'Silakan masuk dulu.' }, { status: 401 })
    }
  }

  // Sudah login → skip login page
  if (pathname === '/login' && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/api/business/:path*',
    '/api/businesses',
    '/api/businesses/:path*',
    '/api/catalog/:path*',
    '/api/contents/:path*',
    '/api/transactions/:path*',
    '/api/ai',
    '/api/ai/:path*',
    '/api/media/:path*',
    '/api/reports/:path*',
  ],
}
