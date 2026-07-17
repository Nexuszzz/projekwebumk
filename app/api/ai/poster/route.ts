/**
 * GenityBoost only — image / poster:
 *  - model: nano-banana
 *  - POST /v1/generate → poll job → download ke public/uploads
 *
 * Caption / teks TIDAK lewat sini.
 * Teks → POST /api/ai task=caption (Gemini).
 *
 * Multi-tenant / anti-leak:
 *  - Jangan default ke catalog[0] (bisa NUSACID) saat user upload foto/produk lain.
 *  - Katalog hanya dipakai jika nama produk BENAR-BENAR cocok.
 *  - Foto upload user = sumber kebenaran kemasan.
 *
 * Genity HANYA fetch reference_image_urls PUBLIC (bukan localhost).
 * Foto lokal → Gemini vision deskripsikan → prompt Genity.
 */
import { getSessionUser, unauthorized } from '@/lib/server/auth'
import { getSnapshot } from '@/lib/server/db'
import { describeProductPackaging } from '@/lib/server/gemini-vision'
import {
  buildPosterPrompt,
  generatePosterImage,
  gentyConfigured,
  type PosterAspect,
  type PosterResolution,
} from '@/lib/server/genty'
import { isGenityFetchableUrl, resolveImageSource } from '@/lib/server/image-source'
import { ensureUploadsScaffold, saveRemoteImage } from '@/lib/server/media-store'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const IMAGE_PROVIDER = 'genityboost' as const
const IMAGE_MODEL = 'nano-banana' as const

function jsonResponse(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status })
}

function catalogProductMatches(
  productName: string,
  p: { name: string; shortName: string },
): boolean {
  const name = productName.trim().toLowerCase()
  if (!name || name.length < 2) return false
  const full = p.name.toLowerCase()
  const short = p.shortName.toLowerCase()
  // Cocok jelas saja — hindari match lemah yang nyasar ke SKU toko
  return (
    full === name ||
    short === name ||
    full.includes(name) ||
    name.includes(short) ||
    short.includes(name)
  )
}

export async function GET() {
  return jsonResponse({
    configured: gentyConfigured(),
    provider: IMAGE_PROVIDER,
    model: IMAGE_MODEL,
    storage: '/storage/uploads + /api/media/file (auth)',
    docs: 'https://api.genityboost.site/docs/nano-banana',
    note:
      'Poster = Genity. Foto upload user = prioritas. Tidak default ke produk katalog (mis. NUSACID) bila user minta/produk lain.',
  })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  if (!gentyConfigured()) {
    return jsonResponse(
      { error: 'Generate poster belum dikonfigurasi. Tambahkan GENTY_API_KEY ke .env.local.' },
      503,
    )
  }

  let body: {
    productName?: string
    style?: string
    platform?: string
    description?: string
    resolution?: PosterResolution
    aspectRatio?: PosterAspect
    /** Public URL, relative path, localhost URL, or data URL */
    referenceImageUrl?: string
    /** Foto yang di-upload user di modal (prioritas tertinggi) */
    referenceImage?: string
    userPrompt?: string
  }

  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Permintaan tidak valid.' }, 400)
  }

  const businessId = request.headers.get('x-business-id')
  const userProductName = (body.productName || '').trim()
  const userPrompt = (body.userPrompt || '').trim()
  const userPhoto = (body.referenceImage || body.referenceImageUrl || '').trim()
  const hasUserPhoto = Boolean(userPhoto)
  const hasUserDirection = Boolean(userProductName || userPrompt || hasUserPhoto)

  let storeBrand = ''
  let storeCategory = ''
  let resolvedBusinessId = businessId
  let catalogDescription = (body.description || '').trim()
  let catalogImage: string | undefined
  let catalogMatched = false
  let matchedProductName = ''

  let defaultStyle = 'Promo'
  try {
    const db = await getSnapshot(businessId, user.id)
    storeBrand = db.profile.brand || ''
    storeCategory = db.profile.category || ''
    defaultStyle = db.profile.ai?.tone || defaultStyle
    resolvedBusinessId = db.id

    // HANYA pakai katalog jika user mengetik nama yang cocok — JANGAN catalog[0]
    if (userProductName && db.catalog.length) {
      const match = db.catalog.find((p) => catalogProductMatches(userProductName, p))
      if (match) {
        catalogMatched = true
        matchedProductName = match.name
        if (!catalogDescription) catalogDescription = match.description
        catalogImage = match.image
      }
    }
  } catch {
    storeBrand = ''
  }

  // Nama produk di poster:
  // 1) yang user ketik  2) match katalog  3) dari foto/prompt  — JANGAN default brand toko/NUSACID
  let productHint = userProductName || matchedProductName
  if (!productHint && hasUserPhoto) {
    productHint = 'the product shown in the uploaded photo'
  } else if (!productHint && userPrompt) {
    productHint = userPrompt.slice(0, 80)
  } else if (!productHint) {
    productHint = 'featured product'
  }

  // Brand di poster: tegas hanya jika cocok katalog.
  // Upload produk luar → jangan tempel merek toko (mis. NUSACID) ke kemasan client.
  const brandForPrompt = catalogMatched ? storeBrand : !hasUserPhoto && storeBrand ? storeBrand : ''
  const categoryForPrompt = catalogMatched ? storeCategory : hasUserPhoto ? '' : storeCategory
  // Deskripsi katalog hanya jika match; selain itu hanya teks yang dikirim client (bukan inject SKU toko)
  const descriptionForPrompt = catalogMatched
    ? catalogDescription
    : (body.description || '').trim()

  // Prioritas gambar: foto user dulu. Catalog image HANYA jika match + user tidak upload foto lain.
  const imageCandidates: string[] = []
  if (body.referenceImage?.trim()) imageCandidates.push(body.referenceImage.trim())
  if (body.referenceImageUrl?.trim() && body.referenceImageUrl !== body.referenceImage) {
    imageCandidates.push(body.referenceImageUrl.trim())
  }
  if (catalogMatched && catalogImage && !hasUserPhoto) {
    imageCandidates.push(catalogImage)
  }

  let visualDescription: string | null = null
  let hasProductPhoto = false
  const refs: string[] = []

  for (const candidate of imageCandidates) {
    if (isGenityFetchableUrl(candidate) && !refs.includes(candidate)) {
      refs.push(candidate)
    }

    if (visualDescription) continue

    const resolved = await resolveImageSource(candidate)
    if (!resolved) continue

    hasProductPhoto = true
    visualDescription = await describeProductPackaging({
      image: resolved,
      productName: userProductName || productHint,
      // Jangan bias vision dengan brand toko jika foto diluar katalog
      brand: catalogMatched ? storeBrand : undefined,
      description: catalogMatched ? catalogDescription : undefined,
      photoIsSourceOfTruth: true,
      outsideStoreCatalog: !catalogMatched,
      storeBrandHint: storeBrand || undefined,
    })

    if (resolved.isPublicRemote && resolved.publicUrl && !refs.includes(resolved.publicUrl)) {
      refs.push(resolved.publicUrl)
    }
  }

  const prompt = buildPosterPrompt({
    productName: productHint,
    brand: brandForPrompt || undefined,
    style: body.style || defaultStyle,
    platform: body.platform,
    description: descriptionForPrompt || undefined,
    userPrompt: userPrompt || undefined,
    visualDescription: visualDescription || undefined,
    category: categoryForPrompt || undefined,
    hasProductPhoto,
    outsideStoreCatalog: hasUserDirection && !catalogMatched,
    storeBrand: storeBrand || undefined,
  })

  try {
    const result = await generatePosterImage({
      prompt,
      resolution: body.resolution || '1K',
      aspectRatio: body.aspectRatio || '1:1',
      referenceImageUrls: refs.length ? refs : undefined,
      model: IMAGE_MODEL,
    })

    await ensureUploadsScaffold()
    const saved = await saveRemoteImage(result.url, {
      userId: user.id,
      businessId: resolvedBusinessId,
      kind: 'posters',
      filenamePrefix: 'poster',
    })

    return jsonResponse({
      url: saved.publicPath,
      localPath: saved.publicPath,
      remoteUrl: result.url,
      jobId: result.jobId,
      model: result.model,
      bytes: saved.bytes,
      prompt,
      saved: true,
      usedVision: Boolean(visualDescription),
      usedPublicReference: refs.length > 0,
      catalogMatched,
      productUsed: productHint,
      referenceNote: refs.length
        ? 'Genity memakai URL referensi publik.'
        : hasProductPhoto
          ? 'Foto produk (upload/lokal) dideskripsikan Gemini — tidak memaksa produk katalog toko.'
          : catalogMatched
            ? 'Mengikuti produk katalog yang cocok dengan nama yang diminta.'
            : 'Tidak ada foto & tidak cocok katalog — poster dari teks user saja (bukan default SKU toko).',
    })
  } catch (error) {
    console.error('Poster generation failed', error instanceof Error ? error.message : error)
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Gagal membuat poster. Coba lagi atau cek kuota GenityBoost.',
      },
      502,
    )
  }
}
