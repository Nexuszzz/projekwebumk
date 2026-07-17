/**
 * GenityBoost image client — HANYA untuk generate gambar/poster.
 * Model: nano-banana
 * Docs: https://api.genityboost.site/docs/nano-banana
 *
 * Jangan pakai file ini untuk caption/teks — itu domain Gemini (`/api/ai`).
 */

import { getPosterStyleKeywords, normalizeAiTone } from '@/lib/ai-style'

const DEFAULT_BASE = 'https://api.genityboost.site'

export type PosterResolution = '512' | '1K' | '2K' | '4K'
export type PosterAspect = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3' | '21:9' | 'auto'

export type GeneratePosterInput = {
  prompt: string
  resolution?: PosterResolution
  aspectRatio?: PosterAspect
  /** Public http(s) URLs only — local data URLs not supported by Genity */
  referenceImageUrls?: string[]
  model?: 'nano-banana' | 'nano-banana-pro'
}

function getConfig() {
  const apiKey = process.env.GENTY_API_KEY || process.env.GENITY_API_KEY
  const baseUrl = (process.env.GENTY_BASE_URL || process.env.GENITY_BASE_URL || DEFAULT_BASE).replace(
    /\/$/,
    '',
  )
  if (!apiKey) {
    throw new Error('GENTY_API_KEY belum dikonfigurasi di .env.local')
  }
  return { apiKey, baseUrl }
}

export function gentyConfigured() {
  return Boolean(process.env.GENTY_API_KEY || process.env.GENITY_API_KEY)
}

async function gentyFetch(path: string, init?: RequestInit) {
  const { apiKey, baseUrl } = getConfig()
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      ...(init?.headers || {}),
    },
    signal: init?.signal ?? AbortSignal.timeout(60_000),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      (payload as { error?: string }).error ||
      `GenityBoost error ${response.status}`
    const code = (payload as { error_code?: string }).error_code
    const err = new Error(code ? `${message} (${code})` : message)
    throw err
  }
  return payload as Record<string, unknown>
}

/**
 * Start job + poll until done. Returns public media URL.
 */
export async function generatePosterImage(input: GeneratePosterInput): Promise<{
  url: string
  jobId: string
  model: string
}> {
  const model = input.model || 'nano-banana'
  const body: Record<string, unknown> = {
    model,
    prompt: input.prompt.slice(0, 2000),
    resolution: input.resolution || '1K',
    aspect_ratio: input.aspectRatio || '1:1',
  }
  if (input.referenceImageUrls?.length) {
    body.reference_image_urls = input.referenceImageUrls.slice(0, 14)
  }

  const started = await gentyFetch('/v1/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  const jobId = String(started.job_id || '')
  if (!jobId) throw new Error('GenityBoost tidak mengembalikan job_id.')

  const maxAttempts = 40
  const delayMs = 2_500

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
    const job = await gentyFetch(`/v1/jobs/${encodeURIComponent(jobId)}`)
    const status = String(job.status || '')
    if (status === 'done') {
      const url = String(job.url || '')
      if (!url) throw new Error('Job selesai tapi URL gambar kosong.')
      return { url, jobId, model: String(job.model || model) }
    }
    if (status === 'failed') {
      throw new Error(String(job.error || 'Generate poster gagal.'))
    }
    // queued | running → continue
  }

  throw new Error('Generate poster timeout. Coba lagi beberapa saat.')
}

/** Build marketing poster prompt from product context + optional user prompt + vision notes */
export function buildPosterPrompt(input: {
  productName: string
  brand?: string
  style?: string
  platform?: string
  description?: string
  userPrompt?: string
  /** Gemini vision description of real packaging photo */
  visualDescription?: string
  /** Category / business type e.g. bathroom cleaner */
  category?: string
  /** True when we analyzed a real product photo */
  hasProductPhoto?: boolean
  /** User photo/prompt does NOT match store catalog SKU */
  outsideStoreCatalog?: boolean
  /** Store brand name — only for anti-leak negatives when outside catalog */
  storeBrand?: string
}): string {
  const brand = input.brand?.trim()
  const product = input.productName || 'featured product'
  const style = normalizeAiTone(input.style || 'Promo')
  const styleLook = getPosterStyleKeywords(style)
  const platform = input.platform || 'Instagram'
  const category = input.category?.trim()
  const extra = input.description ? ` Product facts: ${input.description.slice(0, 200)}.` : ''
  const custom = input.userPrompt?.trim()
    ? ` User creative direction: ${input.userPrompt.trim().slice(0, 480)}.`
    : ''
  const visual = input.visualDescription?.trim()
    ? ` CRITICAL — recreate THIS exact packaging from the real product photo: ${input.visualDescription.trim().slice(0, 460)}.`
    : ''
  const categoryLine =
    category && !input.outsideStoreCatalog
      ? ` Product category: ${category}. Sell this category, not a different one.`
      : ''

  const brandLine = brand
    ? ` Brand context (only if it matches the product): "${brand}".`
    : ' Do not invent or paste an unrelated store brand onto the packaging.'

  // Photo / custom product first — never silently become another SKU (e.g. NUSACID)
  const fidelity = input.hasProductPhoto || visual
    ? ' Match the real uploaded product packaging (shape, colors, label, brand text on pack). Do not invent a different product or bottle.'
    : ' Design premium packaging that matches the product name and user direction — not a random stock bottle.'

  const antiLeak =
    input.outsideStoreCatalog || input.hasProductPhoto
      ? [
          'ANTI-SUBSTITUTION RULES (mandatory):',
          'The poster subject is ONLY the product the user uploaded / named.',
          'Do NOT replace it with any other brand or SKU from a store catalog.',
          input.storeBrand
            ? `Do NOT turn this into a "${input.storeBrand}" product poster unless the photo/label literally shows that brand.`
            : 'Do not inject an unrelated Indonesian cleaning-product brand.',
          'Do NOT generate NUSACID bathroom cleaner packaging unless that is literally the product in the photo or the user explicitly asked for it.',
        ].join(' ')
      : ''

  const negatives = [
    'STRICT NEGATIVES:',
    'wrong brand substitution, unrelated store SKU,',
    'herbal medicine bottle, jamu, pharmacy syrup, green leaf medical packaging,',
    'fake unreadable brand names, watermark, messy gibberish text, blurry product.',
  ].join(' ')

  return [
    'Professional product marketing poster for an Indonesian UMKM product.',
    `Hero product: ${product}.`,
    brandLine,
    categoryLine,
    `Poster mood/style (${style}): ${styleLook}.`,
    'Clean commercial advertising layout, high contrast, studio product photography.',
    `Optimized for ${platform} social media.`,
    'Soft studio lighting, sharp focus on the real product package as hero, modern Indonesian SMB aesthetic, elegant empty space for caption overlay.',
    fidelity,
    visual,
    antiLeak,
    extra,
    custom,
    negatives,
    'Photorealistic commercial poster, no watermark.',
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 2000)
}
