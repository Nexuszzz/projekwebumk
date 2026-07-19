/**
 * Client REST untuk GOWA (go-whatsapp-web-multidevice).
 * Gateway WhatsApp Web multi-device — dijalankan terpisah (Docker :3100).
 */

import { envTrim } from '@/lib/server/auth'

export type GowaStatus = {
  is_connected: boolean
  is_logged_in: boolean
  device_id?: string
  jid?: string
}

export type GowaLoginCodeResult = {
  pair_code: string
}

export type GowaLoginQrResult = {
  qr_duration: number
  qr_link: string
}

function baseUrl() {
  return (envTrim('GOWA_BASE_URL') || 'http://127.0.0.1:3100').replace(/\/$/, '')
}

function basicAuthHeader(): Record<string, string> {
  const raw = envTrim('GOWA_BASIC_AUTH')
  if (!raw) return {}
  // Support "user:pass"
  const token = Buffer.from(raw, 'utf8').toString('base64')
  return { Authorization: `Basic ${token}` }
}

function deviceHeaders(deviceId: string): HeadersInit {
  return {
    ...basicAuthHeader(),
    'Content-Type': 'application/json',
    'X-Device-Id': deviceId,
  }
}

export function gowaConfigured() {
  return Boolean(envTrim('GOWA_BASE_URL') || process.env.NODE_ENV === 'development')
}

export function gowaWebhookSecret() {
  return envTrim('GOWA_WEBHOOK_SECRET') || envTrim('WHATSAPP_WEBHOOK_SECRET') || 'umkman-webhook-secret'
}

/** Normalisasi nomor Indonesia → 62xxxxxxxxxxx (tanpa +) */
export function normalizeWaPhone(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`
  else if (digits.startsWith('8')) digits = `62${digits}`
  else if (digits.startsWith('620')) digits = `62${digits.slice(3)}`
  return digits
}

export function toWaJid(phone: string): string {
  const n = normalizeWaPhone(phone)
  if (!n) return ''
  if (n.includes('@')) return n
  return `${n}@s.whatsapp.net`
}

/** device_id aman untuk GOWA (alphanumeric + dash) */
export function deviceIdForBusiness(businessId: string): string {
  return businessId
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64)
}

async function parseJson(res: Response) {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return { raw: text }
  }
}

async function gowaFetch(path: string, init: RequestInit & { deviceId?: string } = {}) {
  const url = `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const headers: Record<string, string> = {
    ...basicAuthHeader(),
    ...(init.headers as Record<string, string>),
  }
  if (init.deviceId) headers['X-Device-Id'] = init.deviceId
  if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers,
      cache: 'no-store',
    })
  } catch (error) {
    throw new Error(
      `GOWA tidak terjangkau di ${baseUrl()}. Pastikan Docker gowa jalan (docker compose up -d gowa). ${
        error instanceof Error ? error.message : ''
      }`,
    )
  }

  const data = await parseJson(res)
  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error ||
      data?.results?.message ||
      data?.raw ||
      `GOWA HTTP ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return data
}

export async function gowaHealth(): Promise<boolean> {
  const base = baseUrl()
  // Jangan cek localhost di production — pasti offline
  if (
    process.env.VERCEL &&
    (base.includes('127.0.0.1') || base.includes('localhost'))
  ) {
    return false
  }

  const headers = basicAuthHeader()
  const paths = ['/health', '/']
  for (const path of paths) {
    try {
      const res = await fetch(`${base}${path}`, {
        cache: 'no-store',
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(12_000),
      })
      if (res.ok || (res.status >= 300 && res.status < 400)) return true
      // 401 = service hidup tapi auth salah → anggap online
      if (res.status === 401 || res.status === 403) return true
    } catch {
      // coba path berikutnya
    }
  }
  return false
}

export async function ensureDevice(deviceId: string, webhookUrl?: string) {
  try {
    await gowaFetch('/devices', {
      method: 'POST',
      body: JSON.stringify({
        device_id: deviceId,
        ...(webhookUrl
          ? {
              webhook_url: webhookUrl,
              webhook_secret: gowaWebhookSecret(),
              webhook_events: 'message',
            }
          : {}),
      }),
    })
  } catch (error) {
    // Device mungkin sudah ada — lanjut
    const msg = error instanceof Error ? error.message.toLowerCase() : ''
    if (!msg.includes('exist') && !msg.includes('already') && !msg.includes('duplicate')) {
      // Coba get device; kalau ada OK
      try {
        await gowaFetch(`/devices/${encodeURIComponent(deviceId)}`)
        return
      } catch {
        // ignore create error if list works later
      }
    }
  }
}

export async function getDeviceStatus(deviceId: string): Promise<GowaStatus> {
  const data = await gowaFetch('/app/status', { deviceId })
  const r = data.results || data
  return {
    is_connected: Boolean(r.is_connected),
    is_logged_in: Boolean(r.is_logged_in),
    device_id: r.device_id || deviceId,
    jid: r.jid || '',
  }
}

/** Pairing code — user masukkan nomor HP, lalu masukkan kode di HP WhatsApp */
export async function loginWithPairCode(
  deviceId: string,
  phone: string,
): Promise<GowaLoginCodeResult> {
  const normalized = normalizeWaPhone(phone)
  if (normalized.length < 10) throw new Error('Nomor HP tidak valid. Contoh: 081234567890')
  const data = await gowaFetch(
    `/app/login-with-code?phone=${encodeURIComponent(normalized)}`,
    { deviceId },
  )
  const pair = data.results?.pair_code || data.pair_code
  if (!pair) throw new Error('GOWA tidak mengembalikan pair code. Coba lagi.')
  return { pair_code: String(pair) }
}

/** QR login — alternatif pair code */
export async function loginWithQr(deviceId: string): Promise<GowaLoginQrResult> {
  const data = await gowaFetch('/app/login', { deviceId })
  const qr = data.results || data
  if (!qr.qr_link) throw new Error('GOWA tidak mengembalikan QR. Coba lagi.')
  // Absolute URL jika relative
  let link = String(qr.qr_link)
  if (link.startsWith('/')) link = `${baseUrl()}${link}`

  // GOWA pakai basic auth — browser tidak bisa load QR image langsung.
  // Proxy jadi data URL agar UI UMKMan bisa menampilkan QR tanpa credentials.
  try {
    const imgRes = await fetch(link, {
      headers: basicAuthHeader(),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    if (imgRes.ok) {
      const buf = Buffer.from(await imgRes.arrayBuffer())
      const ct = imgRes.headers.get('content-type') || 'image/png'
      if (ct.startsWith('image/') || buf.length > 0) {
        const mime = ct.startsWith('image/') ? ct : 'image/png'
        link = `data:${mime};base64,${buf.toString('base64')}`
      }
    }
  } catch {
    // fallback: URL mentah (mungkin public)
  }

  return {
    qr_duration: Number(qr.qr_duration || 30),
    qr_link: link,
  }
}

export async function logoutDevice(deviceId: string) {
  await gowaFetch('/app/logout', { deviceId })
}

export async function sendTextMessage(input: {
  deviceId: string
  phone: string
  message: string
  replyMessageId?: string
}) {
  const phone = toWaJid(input.phone)
  return gowaFetch('/send/message', {
    method: 'POST',
    deviceId: input.deviceId,
    body: JSON.stringify({
      phone,
      message: input.message,
      ...(input.replyMessageId ? { reply_message_id: input.replyMessageId } : {}),
    }),
  })
}

export async function sendChatPresence(deviceId: string, phone: string, state: 'start' | 'stop' = 'start') {
  try {
    await gowaFetch('/send/chat-presence', {
      method: 'POST',
      deviceId,
      body: JSON.stringify({
        phone: toWaJid(phone),
        action: state === 'start' ? 'start' : 'stop',
      }),
    })
  } catch {
    // non-critical
  }
}

export function publicGowaBaseUrl() {
  return baseUrl()
}
