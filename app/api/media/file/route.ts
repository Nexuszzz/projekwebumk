/**
 * Private-ish media: file hanya dilayani ke user yang login
 * dan key-nya berada di folder user.id /...
 */
import { getSessionUser, unauthorized } from '@/lib/server/auth'
import {
  mediaKeyOwnerUserId,
  parseMediaKey,
  resolveExistingMediaFile,
} from '@/lib/server/media-store'
import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function contentTypeFromExt(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  return 'application/octet-stream'
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const url = new URL(request.url)
  const key = url.searchParams.get('key') || ''
  const parsed = parseMediaKey(key)
  if (!parsed) {
    return NextResponse.json({ error: 'Key media tidak valid.' }, { status: 400 })
  }

  const owner = mediaKeyOwnerUserId(parsed)
  if (!owner || owner !== user.id) {
    // Juga coba match safeSegment(user.id) — path disimpan dengan safeSegment
    const safeUser = user.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48)
    if (owner !== safeUser) {
      return NextResponse.json({ error: 'Akses media ditolak.' }, { status: 403 })
    }
  }

  const abs = await resolveExistingMediaFile(parsed)
  if (!abs) {
    return NextResponse.json({ error: 'File tidak ditemukan.' }, { status: 404 })
  }

  const buf = await fs.readFile(abs)
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': contentTypeFromExt(abs),
      'Cache-Control': 'private, max-age=3600',
      'Content-Length': String(buf.length),
    },
  })
}
