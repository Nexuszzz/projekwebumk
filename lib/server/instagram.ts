/**
 * Instagram Content Publishing (Graph API) — per usaha atau env global.
 *
 * Syarat Meta:
 * - Akun Instagram Business/Creator terhubung Facebook Page
 * - Long-lived token dengan izin instagram_content_publish, instagram_basic, pages_show_list
 * - image_url harus HTTPS publik (bukan localhost)
 *
 * Prioritas kredensial:
 * 1) profile.instagram per usaha (multi-tenant / client)
 * 2) env INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ACCOUNT_ID
 */

import { envTrim } from '@/lib/server/auth'
import type { BusinessProfile } from '@/lib/types'

const GRAPH = 'https://graph.facebook.com/v21.0'

export type IgCredentials = {
  accountId: string
  accessToken: string
  source: 'business' | 'env'
  username?: string
}

export function resolveInstagramCredentials(
  profile?: BusinessProfile | null,
): IgCredentials | null {
  const bizId = profile?.instagram?.accountId?.trim()
  const bizToken = profile?.instagram?.accessToken?.trim()
  if (bizId && bizToken && profile?.instagram?.enabled !== false) {
    return {
      accountId: bizId,
      accessToken: bizToken,
      source: 'business',
      username: profile?.instagram?.username,
    }
  }
  const envToken = envTrim('INSTAGRAM_ACCESS_TOKEN')
  const envId = envTrim('INSTAGRAM_BUSINESS_ACCOUNT_ID')
  if (envToken && envId) {
    return { accountId: envId, accessToken: envToken, source: 'env' }
  }
  return null
}

export function instagramApiConfigured(profile?: BusinessProfile | null) {
  return Boolean(resolveInstagramCredentials(profile))
}

/** Jangan kirim token ke client — hanya metadata aman */
export function publicInstagramStatus(profile?: BusinessProfile | null) {
  const creds = resolveInstagramCredentials(profile)
  const ig = profile?.instagram
  return {
    connected: Boolean(ig?.accountId && ig?.accessToken && ig?.enabled !== false),
    username: ig?.username || null,
    accountIdMasked: ig?.accountId
      ? `${ig.accountId.slice(0, 4)}…${ig.accountId.slice(-4)}`
      : null,
    hasToken: Boolean(ig?.accessToken),
    connectedAt: ig?.connectedAt || null,
    apiAvailable: Boolean(creds),
    credentialSource: creds?.source || null,
  }
}

/** Strip secrets sebelum JSON ke browser */
export function sanitizeProfileForClient(profile: BusinessProfile): BusinessProfile {
  if (!profile.instagram) return profile
  const ig = profile.instagram
  return {
    ...profile,
    instagram: {
      ...ig,
      accessToken: ig.accessToken ? '••••••••' : undefined,
      // Jangan kirim session private API ke browser
      privateSessionId: ig.privateSessionId ? '••••••••' : undefined,
      privateMode: Boolean(ig.privateSessionId && ig.privateMode !== false),
      privateConnectedAt: ig.privateConnectedAt,
    },
  }
}

export function hasPrivateIgSession(profile?: BusinessProfile | null) {
  return Boolean(profile?.instagram?.privateSessionId?.trim())
}

export type IgPublishResult =
  | { ok: true; mediaId: string; mode: 'api'; source: 'business' | 'env' }
  | { ok: false; error: string; mode: 'api' }

/**
 * Publish satu gambar + caption ke feed Instagram.
 * imageUrl harus bisa diunduh Meta (HTTPS publik).
 */
export async function publishImageToInstagram(input: {
  imageUrl: string
  caption: string
  profile?: BusinessProfile | null
}): Promise<IgPublishResult> {
  const creds = resolveInstagramCredentials(input.profile)
  if (!creds) {
    return {
      ok: false,
      mode: 'api',
      error:
        'Instagram belum dihubungkan untuk usaha ini. Buka Pengaturan → Instagram, atau set env global.',
    }
  }

  const token = creds.accessToken
  const igUserId = creds.accountId

  if (!/^https:\/\//i.test(input.imageUrl)) {
    return {
      ok: false,
      mode: 'api',
      error:
        'Gambar harus URL HTTPS publik. Di localhost, pakai mode bantu (salin caption + unduh poster).',
    }
  }

  try {
    // 1) Create media container
    const createUrl = new URL(`${GRAPH}/${igUserId}/media`)
    createUrl.searchParams.set('image_url', input.imageUrl)
    createUrl.searchParams.set('caption', input.caption.slice(0, 2200))
    createUrl.searchParams.set('access_token', token)

    const createRes = await fetch(createUrl.toString(), { method: 'POST' })
    const createJson = (await createRes.json()) as { id?: string; error?: { message?: string } }
    if (!createRes.ok || !createJson.id) {
      return {
        ok: false,
        mode: 'api',
        error: createJson.error?.message || 'Gagal membuat media container Instagram.',
      }
    }

    // 2) Poll container ready (simple wait + publish)
    await waitContainerReady(createJson.id, token)

    // 3) Publish
    const pubUrl = new URL(`${GRAPH}/${igUserId}/media_publish`)
    pubUrl.searchParams.set('creation_id', createJson.id)
    pubUrl.searchParams.set('access_token', token)

    const pubRes = await fetch(pubUrl.toString(), { method: 'POST' })
    const pubJson = (await pubRes.json()) as { id?: string; error?: { message?: string } }
    if (!pubRes.ok || !pubJson.id) {
      return {
        ok: false,
        mode: 'api',
        error: pubJson.error?.message || 'Gagal publish ke Instagram.',
      }
    }

    return { ok: true, mediaId: pubJson.id, mode: 'api', source: creds.source }
  } catch (error) {
    return {
      ok: false,
      mode: 'api',
      error: error instanceof Error ? error.message : 'Error Instagram API.',
    }
  }
}

/** Verifikasi token + ambil username (opsional) */
export async function verifyInstagramCredentials(input: {
  accountId: string
  accessToken: string
}): Promise<{ ok: true; username?: string; name?: string } | { ok: false; error: string }> {
  try {
    const url = new URL(`${GRAPH}/${input.accountId.trim()}`)
    url.searchParams.set('fields', 'id,username,name')
    url.searchParams.set('access_token', input.accessToken.trim())
    const res = await fetch(url.toString())
    const json = (await res.json()) as {
      id?: string
      username?: string
      name?: string
      error?: { message?: string }
    }
    if (!res.ok || !json.id) {
      return { ok: false, error: json.error?.message || 'Token / Account ID tidak valid.' }
    }
    return { ok: true, username: json.username, name: json.name }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Gagal verifikasi ke Meta.',
    }
  }
}

async function waitContainerReady(creationId: string, token: string, attempts = 8) {
  for (let i = 0; i < attempts; i++) {
    const url = new URL(`${GRAPH}/${creationId}`)
    url.searchParams.set('fields', 'status_code')
    url.searchParams.set('access_token', token)
    const res = await fetch(url.toString())
    const json = (await res.json()) as { status_code?: string }
    if (json.status_code === 'FINISHED') return
    if (json.status_code === 'ERROR') throw new Error('Instagram menolak media container.')
    await new Promise((r) => setTimeout(r, 1500))
  }
  // try publish anyway after wait
}
