import {
  matchFaq,
  shouldEscalate,
  supportSystemPrompt,
  supportWaNumber,
  waMeLink,
} from '@/lib/support-faq'
import { envTrim } from '@/lib/server/auth'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MAX_LEN = 500

/**
 * Ambil teks balasan dari output Gemini.
 * Model sering potong JSON di tengah → JSON.parse gagal dan dulu
 * menampilkan raw `{"reply": "Halo...` ke user.
 */
function extractReply(raw: string): { reply: string; escalate: boolean } {
  const text = (raw || '').trim()
  if (!text) {
    return { reply: '', escalate: false }
  }

  // 1) JSON utuh (dengan/ tanpa fence)
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    const json = JSON.parse(cleaned) as { reply?: string; escalate?: boolean }
    if (typeof json.reply === 'string' && json.reply.trim()) {
      return {
        reply: sanitizeUserFacing(json.reply),
        escalate: Boolean(json.escalate),
      }
    }
  } catch {
    // lanjut fallback
  }

  // 2) JSON terpotong: {"reply": "....  (tanpa penutup)
  const m = cleaned.match(/"reply"\s*:\s*"((?:\\.|[^"\\])*)"?/)
  if (m?.[1]) {
    const unescaped = m[1]
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
    return {
      reply: sanitizeUserFacing(unescaped),
      escalate: /"escalate"\s*:\s*true/i.test(cleaned),
    }
  }

  // 3) Plain text — jangan tampilkan blob JSON mentah
  if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
    return {
      reply: 'Halo! Ada yang bisa dibantu seputar fitur UMKMan, cara daftar, atau demo? 😊',
      escalate: false,
    }
  }

  return {
    reply: sanitizeUserFacing(cleaned.slice(0, 800)),
    escalate: shouldEscalate(cleaned),
  }
}

function sanitizeUserFacing(s: string): string {
  let out = s
    .replace(/^\s*\{[\s\S]*"reply"\s*:\s*"/i, '')
    .replace(/"\s*,\s*"escalate"[\s\S]*$/i, '')
    .replace(/```json|```/gi, '')
    .trim()
  // Kalau setelah dibersihkan masih kelihatan seperti JSON mentah → fallback
  if (out.startsWith('{') || out.startsWith('[') || /"reply"\s*:/.test(out)) {
    return 'Halo! Ada yang bisa dibantu seputar fitur UMKMan, cara daftar, atau demo? 😊'
  }
  return out.slice(0, 800)
}

/**
 * Support chat publik (landing widget) — tanpa login.
 * FAQ dulu → Gemini → eskalasi WA jika terlalu spesifik.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { message?: string }
    const message = String(body.message || '').trim().slice(0, MAX_LEN)
    if (!message) {
      return NextResponse.json({ error: 'Pesan kosong.' }, { status: 400 })
    }

    // 1) FAQ instan (termasuk sapaan / chat random)
    const faq = matchFaq(message)
    if (faq) {
      return NextResponse.json({
        reply: faq.reply,
        escalate: faq.escalate,
        waNumber: supportWaNumber(),
        waLink: waMeLink(
          faq.escalate ? `Halo CS UMKMan, saya ingin tanya: ${message}` : undefined,
        ),
        source: 'faq',
      })
    }

    // 2) Gemini (opsional)
    const key = envTrim('GEMINI_API_KEY')
    if (!key) {
      return NextResponse.json({
        reply:
          'Untuk pertanyaan lanjutan, silakan chat CS kami di WhatsApp — kami bantu lebih detail di sana.',
        escalate: true,
        waNumber: supportWaNumber(),
        waLink: waMeLink(`Halo CS UMKMan, saya ingin tanya: ${message}`),
        source: 'fallback',
      })
    }

    const model = envTrim('GEMINI_MODEL') || 'gemini-2.5-flash'
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: supportSystemPrompt() }] },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Pertanyaan pengunjung website:\n${message}\n\nBalas HANYA JSON valid: {"reply":"...","escalate":false}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.45,
          maxOutputTokens: 512,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              reply: { type: 'STRING' },
              escalate: { type: 'BOOLEAN' },
            },
            required: ['reply', 'escalate'],
          },
        },
      }),
      signal: AbortSignal.timeout(25_000),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('[support/chat] gemini', res.status, data?.error?.status || data)
      // Jangan panik ke user — FAQ generik + opsi WA
      return NextResponse.json({
        reply:
          'Halo! Saya bisa bantu soal fitur UMKMan, cara daftar, harga demo, atau multi-tenant. Untuk hal yang lebih spesifik, chat CS WhatsApp ya 😊',
        escalate: shouldEscalate(message),
        waNumber: supportWaNumber(),
        waLink: waMeLink(`Halo CS UMKMan: ${message}`),
        source: 'error-soft',
      })
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ||
      ''
    const parsed = extractReply(text)
    const escalate = Boolean(parsed.escalate) || shouldEscalate(message)
    const reply =
      (parsed.reply || '').trim() ||
      (escalate
        ? 'Pertanyaan ini lebih baik ditangani CS lewat WhatsApp.'
        : 'Halo! Ada yang bisa dibantu seputar fitur UMKMan, cara daftar, atau demo?')

    return NextResponse.json({
      reply,
      escalate,
      waNumber: supportWaNumber(),
      waLink: waMeLink(escalate ? `Halo CS UMKMan: ${message}` : undefined),
      source: 'ai',
    })
  } catch (error) {
    console.error('[support/chat]', error)
    return NextResponse.json(
      {
        reply:
          'Halo! Ada gangguan sebentar. Coba tanya fitur/daftar, atau chat CS WhatsApp di tombol hijau ya.',
        escalate: true,
        waNumber: supportWaNumber(),
        waLink: waMeLink(),
        source: 'error',
      },
      { status: 200 },
    )
  }
}
