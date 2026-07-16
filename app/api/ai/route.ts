import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type AiRequest =
  | { task: 'caption'; productName: string; style: string; platforms: string[]; image?: string }
  | { task: 'transaction'; text: string }
  | { task: 'assistant'; message: string }

const MAX_TEXT_LENGTH = 4_000
const MAX_IMAGE_DATA_URL_LENGTH = 7_000_000

function jsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status })
}

function extractJson(text: string) {
  const normalized = text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(normalized)
}

function buildPrompt(request: AiRequest) {
  if (request.task === 'caption') {
    return `Kamu adalah asisten pemasaran UMKM Indonesia. Buat caption akurat dalam Bahasa Indonesia untuk produk ${request.productName || 'Produk UMKM'}, gaya ${request.style}, platform ${request.platforms.join(', ')}. Jangan membuat klaim medis, harga, stok, diskon, atau manfaat yang tidak diberikan. Maksimal 500 karakter per platform. Isi hanya platform yang diminta sesuai schema JSON.`
  }
  if (request.task === 'transaction') {
    return `Kamu adalah parser transaksi UMKM Indonesia. Ekstrak transaksi dari teks berikut: ${request.text}. Kembalikan HANYA JSON valid berbentuk {"product":"nama produk","qty":number,"price":number}. price adalah harga satuan dalam rupiah; qty minimal 1. Bila informasi tidak jelas, gunakan product "Produk Baru", qty 1, price 0.`
  }
  return `Kamu adalah asisten UMKM Indonesia. Jawab singkat, praktis, dan aman dalam Bahasa Indonesia. Pertanyaan pengguna: ${request.message}`
}

const CAPTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    captions: {
      type: 'OBJECT',
      properties: {
        Instagram: { type: 'STRING' },
        Tokopedia: { type: 'STRING' },
        Lazada: { type: 'STRING' },
      },
    },
  },
  required: ['captions'],
}

const TRANSACTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    product: { type: 'STRING' },
    qty: { type: 'NUMBER' },
    price: { type: 'NUMBER' },
  },
  required: ['product', 'qty', 'price'],
}

export async function GET() {
  const key = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  if (!key) return jsonResponse({ configured: false, model, error: 'GEMINI_API_KEY belum tersedia di server.' }, 503)
  if (!key.startsWith('AIza')) return jsonResponse({ configured: false, model, error: 'GEMINI_API_KEY bukan API key Google AI Studio yang valid.' }, 503)
  return jsonResponse({ configured: true, model })
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return jsonResponse({ error: 'AI belum dikonfigurasi. Tambahkan GEMINI_API_KEY ke .env.local.' }, 503)
  if (!key.startsWith('AIza')) return jsonResponse({ error: 'Credential tidak valid. Gunakan API key baru dari Google AI Studio, bukan access token.' }, 503)

  let body: AiRequest
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Permintaan AI tidak valid.' }, 400)
  }

  if (!body || !['caption', 'transaction', 'assistant'].includes(body.task)) {
    return jsonResponse({ error: 'Tugas AI tidak didukung.' }, 400)
  }

  const text = body.task === 'assistant' ? body.message : body.task === 'transaction' ? body.text : body.productName
  if (typeof text !== 'string' || text.length > MAX_TEXT_LENGTH) {
    return jsonResponse({ error: 'Input terlalu panjang atau tidak valid.' }, 400)
  }
  if (body.task === 'caption' && body.image && body.image.length > MAX_IMAGE_DATA_URL_LENGTH) {
    return jsonResponse({ error: 'Ukuran gambar terlalu besar untuk diproses AI.' }, 413)
  }

  const parts: Array<Record<string, unknown>> = [{ text: buildPrompt(body) }]
  if (body.task === 'caption' && body.image?.startsWith('data:image/')) {
    const [header, data] = body.image.split(',', 2)
    const mimeType = header.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64$/)?.[1]
    if (mimeType && data) parts.push({ inline_data: { mime_type: mimeType, data } })
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: body.task === 'caption' ? 4_096 : 1_024,
          ...(body.task === 'assistant' ? {} : {
            responseMimeType: 'application/json',
            responseSchema: body.task === 'caption' ? CAPTION_SCHEMA : TRANSACTION_SCHEMA,
          }),
        },
      }),
      signal: AbortSignal.timeout(30_000),
    })
    const payload = await upstream.json()
    if (!upstream.ok) {
      console.error('Gemini request failed', upstream.status, payload?.error?.status)
      return jsonResponse({ error: 'Layanan AI sedang tidak tersedia. Periksa model dan API key Anda.' }, 502)
    }
    const candidate = payload?.candidates?.[0]
    const output = candidate?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('').trim()
    if (!output) return jsonResponse({ error: 'AI tidak menghasilkan jawaban. Coba lagi.' }, 502)
    if (candidate?.finishReason === 'MAX_TOKENS') {
      return jsonResponse({ error: 'Jawaban AI terpotong. Coba pilih lebih sedikit platform atau ulangi proses.' }, 502)
    }

    if (body.task === 'assistant') return jsonResponse({ text: output })
    let data: any
    try {
      data = extractJson(output)
    } catch {
      console.error('Gemini returned invalid JSON', candidate?.finishReason)
      return jsonResponse({ error: 'Format jawaban AI tidak lengkap. Coba lagi.' }, 502)
    }
    if (body.task === 'caption' && (!data?.captions || typeof data.captions !== 'object')) throw new Error('Invalid caption response')
    if (body.task === 'transaction' && (typeof data?.product !== 'string' || !Number.isFinite(data?.qty) || !Number.isFinite(data?.price))) throw new Error('Invalid transaction response')
    return jsonResponse(data)
  } catch (error) {
    console.error('Gemini integration error', error instanceof Error ? error.message : 'unknown')
    return jsonResponse({ error: 'Gagal menghubungi AI. Coba lagi beberapa saat.' }, 502)
  }
}
