/**
 * Path data JSON untuk mode file (tanpa Postgres).
 *
 * - Lokal: `process.cwd()/data` (bisa dibaca/tulis)
 * - Vercel serverless: filesystem deployment read-only → tulis ke `/tmp/umkman-data`,
 *   seed tetap dibaca dari bundle `process.cwd()/data`
 *
 * Catatan: /tmp tidak persisten antar cold start. Untuk production jangka panjang
 * set DATABASE_URL (Neon/Postgres). JWT session tetap bisa jalan lewat fallback.
 */

import path from 'path'
import { promises as fs } from 'fs'

export function isServerlessEphemeral() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
}

/** Direktori seed/read-only dari deployment (public di repo). */
export function seedDataDir() {
  return path.join(process.cwd(), 'data')
}

/** Direktori yang boleh di-write. */
export function writableDataDir() {
  if (isServerlessEphemeral()) {
    return path.join('/tmp', 'umkman-data')
  }
  return seedDataDir()
}

export async function ensureWritableDataDir() {
  const dir = writableDataDir()
  await fs.mkdir(dir, { recursive: true })
  return dir
}

/** Salin seed ke writable path jika belum ada (cold start Vercel). */
export async function ensureSeededFile(filename: string) {
  const dest = path.join(writableDataDir(), filename)
  try {
    await fs.access(dest)
    return dest
  } catch {
    // belum ada
  }

  await ensureWritableDataDir()
  const src = path.join(seedDataDir(), filename)
  try {
    await fs.access(src)
    await fs.copyFile(src, dest)
  } catch {
    // seed tidak ada — caller bisa buat file kosong
  }
  return dest
}

/**
 * Tulis JSON aman di Windows + Unix.
 *
 * JANGAN andalkan fs.rename menimpa file di Windows → EPERM.
 * Strategi: tulis ke .tmp, lalu writeFile langsung ke dest (overwrite),
 * dengan retry jika file sedang di-lock (Defender / OneDrive / editor).
 */
export async function writeJsonFile(dest: string, data: unknown) {
  await fs.mkdir(path.dirname(dest), { recursive: true })
  const payload = JSON.stringify(data, null, 2)
  const tmp = `${dest}.${process.pid}.${Date.now()}.tmp`

  await fs.writeFile(tmp, payload, 'utf8')

  let lastError: unknown
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      // Overwrite langsung — andal di Windows (tidak pakai rename)
      await fs.writeFile(dest, payload, 'utf8')
      await fs.unlink(tmp).catch(() => {})
      return
    } catch (error) {
      lastError = error
      await new Promise((r) => setTimeout(r, 50 * (attempt + 1)))
    }
  }

  // Last resort: copyFile dari tmp
  try {
    await fs.copyFile(tmp, dest)
    await fs.unlink(tmp).catch(() => {})
    return
  } catch (error) {
    lastError = error
  }

  await fs.unlink(tmp).catch(() => {})
  throw lastError instanceof Error
    ? lastError
    : new Error(`Gagal menulis ${dest}`)
}
