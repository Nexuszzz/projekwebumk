/**
 * Gemini vision helpers — describe product packaging so Genity poster
 * matches the real photo (Genity cannot see localhost / data-URL images).
 *
 * Photo is source of truth. Do not bias toward store catalog (e.g. NUSACID)
 * when the client uploaded a different product.
 */

import { envTrim } from '@/lib/server/auth'
import type { ResolvedImage } from '@/lib/server/image-source'

function getGeminiConfig() {
  const apiKey = envTrim('GEMINI_API_KEY')
  const model = envTrim('GEMINI_MODEL') || 'gemini-2.5-flash'
  if (!apiKey || !apiKey.startsWith('AIza')) return null
  return { apiKey, model }
}

/**
 * Describe product packaging from a photo for poster generation prompts.
 * Returns concise English visual specs Genity can follow.
 */
export async function describeProductPackaging(input: {
  image: ResolvedImage
  productName: string
  brand?: string
  description?: string
  /** Always prefer pixels over catalog text */
  photoIsSourceOfTruth?: boolean
  /** User product is outside the store catalog */
  outsideStoreCatalog?: boolean
  storeBrandHint?: string
}): Promise<string | null> {
  const cfg = getGeminiConfig()
  if (!cfg) return null

  const brand = input.brand || ''
  const product = input.productName || 'product'
  const catalogNote =
    input.description && !input.outsideStoreCatalog
      ? ` Optional catalog note (use ONLY if consistent with the photo): ${input.description.slice(0, 200)}.`
      : ''

  const antiBias = input.outsideStoreCatalog || input.photoIsSourceOfTruth
    ? [
        'The uploaded photo is the ONLY source of truth for packaging.',
        'Describe ONLY what is visible in the image.',
        input.storeBrandHint
          ? `Ignore store brand "${input.storeBrandHint}" unless that exact brand text is visible on the pack.`
          : '',
        'Do NOT rewrite the product as a different brand/SKU from the store catalog if the photo shows something else. Photo is source of truth.',
        'If brand text on the pack is readable, use that brand — not a different store brand.',
      ]
        .filter(Boolean)
        .join(' ')
    : ''

  const instruction = [
    'You are a product-photography art director.',
    'Describe ONLY what you see in this product photo for an AI image generator that must recreate the SAME packaging.',
    'Write 5-8 short English sentences covering:',
    '1) Container type & shape (bottle/jar/sachet/box/pouch, proportions, cap/lid style)',
    '2) Exact brand label text if readable, logo placement, main colors of label & bottle',
    '3) Material look (plastic translucent/opaque, glass, etc.) and fill/liquid color if visible',
    '4) Any distinctive graphics, icons, or claim badges on the pack',
    '5) What kind of product it appears to be (snack, drink, cleaner, fashion, etc.) based on the photo only',
    'Critical rules:',
    product && product !== 'the product shown in the uploaded photo' && product !== 'featured product'
      ? `User named this product "${product}"${brand ? ` (brand hint "${brand}" only if label matches)` : ''}.`
      : 'User did not force a catalog SKU — identify the product from the photo alone.',
    antiBias,
    'Do NOT invent herbal medicine / jamu packaging unless the photo literally shows that.',
    'Prefer concrete colors and shapes over vague words.',
    'Output plain text only, no markdown, max 450 characters.',
    catalogNote,
  ]
    .filter(Boolean)
    .join(' ')

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: instruction },
              {
                inline_data: {
                  mime_type: input.image.mimeType,
                  data: input.image.base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512,
        },
      }),
      signal: AbortSignal.timeout(25_000),
    })

    const payload = await upstream.json()
    if (!upstream.ok) {
      console.error('Gemini vision describe failed', upstream.status, payload?.error?.status)
      return null
    }

    const text = payload?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? '')
      .join('')
      .trim()

    if (!text) return null
    return text.slice(0, 500)
  } catch (error) {
    console.error('Gemini vision describe error', error instanceof Error ? error.message : error)
    return null
  }
}
