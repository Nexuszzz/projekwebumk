import { createHmac, timingSafeEqual } from 'crypto'
import { findBusinessByWhatsAppDevice } from '@/lib/server/db'
import { gowaWebhookSecret, sendChatPresence, sendTextMessage } from '@/lib/server/gowa-client'
import { generateWhatsAppReply } from '@/lib/server/whatsapp-ai'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type GowaWebhookBody = {
  event?: string
  device_id?: string
  session_id?: string
  payload?: {
    id?: string
    chat_id?: string
    from?: string
    from_name?: string
    body?: string
    is_from_me?: boolean
    timestamp?: string
  }
}

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) return false
  const received = signatureHeader.replace(/^sha256=/i, '').trim()
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  try {
    const a = Buffer.from(expected, 'hex')
    const b = Buffer.from(received, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/**
 * Webhook dari GOWA — public (tanpa session cookie).
 * Verifikasi HMAC X-Hub-Signature-256.
 */
export async function POST(request: Request) {
  const raw = await request.text()
  const secret = gowaWebhookSecret()
  const sig = request.headers.get('x-hub-signature-256') || request.headers.get('X-Hub-Signature-256')

  // Di dev, izinkan jika secret default + signature hilang (debug lokal)
  const skipVerify = process.env.GOWA_WEBHOOK_SKIP_VERIFY === '1'
  if (!skipVerify && !verifySignature(raw, sig, secret)) {
    console.warn('[whatsapp/webhook] invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: GowaWebhookBody
  try {
    body = JSON.parse(raw) as GowaWebhookBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Ack cepat — proses di background
  // Vercel: await full processing (no true background without waitUntil)
  if (body.event !== 'message') {
    return NextResponse.json({ ok: true, skipped: body.event || 'unknown' })
  }

  const payload = body.payload || {}
  if (payload.is_from_me) {
    return NextResponse.json({ ok: true, skipped: 'from_me' })
  }

  const text = (payload.body || '').trim()
  if (!text) {
    return NextResponse.json({ ok: true, skipped: 'empty_body' })
  }

  const deviceKey = body.session_id || body.device_id || ''
  const found = await findBusinessByWhatsAppDevice(deviceKey)
  if (!found) {
    console.warn('[whatsapp/webhook] no business for device', deviceKey)
    return NextResponse.json({ ok: true, skipped: 'unknown_device' })
  }

  const autoReply = found.business.profile.whatsapp?.autoReply !== false
  if (!autoReply) {
    return NextResponse.json({ ok: true, skipped: 'auto_reply_off' })
  }

  const deviceId = found.business.profile.whatsapp?.deviceId || found.businessId
  const chatPhone = payload.chat_id || payload.from || ''
  if (!chatPhone) {
    return NextResponse.json({ ok: true, skipped: 'no_chat' })
  }

  try {
    await sendChatPresence(deviceId, chatPhone, 'start')
    const reply = await generateWhatsAppReply(
      found.business,
      text,
      payload.from_name,
    )
    await sendTextMessage({
      deviceId,
      phone: chatPhone,
      message: reply,
      replyMessageId: payload.id,
    })
    await sendChatPresence(deviceId, chatPhone, 'stop')
    return NextResponse.json({ ok: true, replied: true })
  } catch (error) {
    console.error('[whatsapp/webhook] reply failed', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'reply_failed',
      },
      { status: 500 },
    )
  }
}

/** Health for tunnel tests */
export async function GET() {
  return NextResponse.json({ ok: true, service: 'umkman-whatsapp-webhook' })
}
