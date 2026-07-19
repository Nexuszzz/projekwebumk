/**
 * Balasan AI untuk chatbot WhatsApp (pesan pelanggan → Gemini).
 */

import { getSystemInstruction, buildAssistantUserPrompt } from '@/lib/ai-prompts'
import { envTrim } from '@/lib/server/auth'
import type { BusinessDatabase } from '@/lib/types'

/**
 * Ambil teks balasan dari Gemini.
 * Model sering potong JSON di tengah → dulu bocor ke WA sebagai `{"reply": "...`
 */
function extractReplyText(raw: string): string {
  const text = (raw || '').trim()
  if (!text) return ''

  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    const json = JSON.parse(cleaned) as Record<string, unknown>
    for (const key of ['reply', 'message', 'answer', 'text'] as const) {
      const v = json[key]
      if (typeof v === 'string' && v.trim()) {
        return sanitizeWaText(v)
      }
    }
  } catch {
    // lanjut fallback
  }

  // JSON terpotong: {"reply": "....  (tanpa penutup)
  const m = cleaned.match(/"(?:reply|message|answer|text)"\s*:\s*"((?:\\.|[^"\\])*)"?/)
  if (m?.[1]) {
    const unescaped = m[1]
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
    return sanitizeWaText(unescaped)
  }

  // Jangan kirim blob JSON mentah ke pelanggan WhatsApp
  if (cleaned.startsWith('{') || cleaned.startsWith('[') || /"reply"\s*:/.test(cleaned)) {
    return ''
  }

  return sanitizeWaText(cleaned)
}

function sanitizeWaText(s: string): string {
  return s
    .replace(/^\s*\{[\s\S]*"(?:reply|message)"\s*:\s*"/i, '')
    .replace(/"\s*,\s*"(?:escalate|ok)"[\s\S]*$/i, '')
    .replace(/```json|```/gi, '')
    .trim()
    .slice(0, 1500)
}

export async function generateWhatsAppReply(
  db: BusinessDatabase,
  customerMessage: string,
  customerName?: string,
): Promise<string> {
  const key = envTrim('GEMINI_API_KEY')
  if (!key) {
    return `Terima kasih sudah menghubungi ${db.profile.brand}. AI belum dikonfigurasi — admin akan membalas segera.`
  }

  const model = envTrim('GEMINI_MODEL') || 'gemini-2.5-flash'
  const system = `${getSystemInstruction(db)}

## Mode WhatsApp Chatbot
- Balas singkat, ramah, bahasa Indonesia (kecuali customer pakai bahasa lain).
- Maksimal ~500 karakter jika memungkinkan.
- Jawab harga/stok HANYA dari katalog live.
- Jika customer mau order, minta: produk, jumlah, nama, alamat singkat.
- Jangan bilang kamu AI kecuali ditanya.
- Output JSON: { "reply": "teks balasan siap kirim ke WhatsApp" }`

  const userPrompt = buildAssistantUserPrompt(
    db,
    [
      customerName ? `Nama pelanggan: ${customerName}` : '',
      `Pesan WhatsApp pelanggan: ${customerMessage}`,
      'Buatkan balasan WhatsApp yang siap dikirim.',
    ]
      .filter(Boolean)
      .join('\n'),
  )

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            reply: { type: 'STRING' },
          },
          required: ['reply'],
        },
      },
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('[whatsapp-ai] gemini error', data)
    return `Terima kasih menghubungi ${db.profile.brand}. Mohon tunggu sebentar, admin kami akan segera membalas.`
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ||
    ''
  const reply = extractReplyText(text)
  // Jangan pernah kirim JSON mentah / kosong aneh ke chat WA
  if (!reply || reply.startsWith('{') || reply.startsWith('[') || /"reply"\s*:/.test(reply)) {
    return `Terima kasih menghubungi ${db.profile.brand}! Ada yang bisa dibantu seputar produk atau pemesanan?`
  }
  return reply
}
