/**
 * Gaya bahasa AI — dipakai Settings, Generate Caption, Poster, dan Asisten.
 * Setiap tone punya instruksi konkret agar pilihan tombol benar-benar mengubah output.
 */

export const AI_TONES = ['Santai', 'Profesional', 'Persuasif', 'Promo'] as const
export type AiTone = (typeof AI_TONES)[number]

export type AiPreferences = {
  /** Gaya bahasa default untuk caption, asisten, dan poster */
  tone: AiTone
  /** Default generator ikut menyertakan caption */
  autoCaption: boolean
  /** Caption menyertakan saran jam posting */
  smartSchedule: boolean
  /** Asisten siap draf balasan pelanggan */
  autoReply: boolean
}

export const DEFAULT_AI_PREFERENCES: AiPreferences = {
  tone: 'Santai',
  autoCaption: true,
  smartSchedule: true,
  autoReply: false,
}

const LEGACY_TONE_MAP: Record<string, AiTone> = {
  santai: 'Santai',
  formal: 'Profesional',
  profesional: 'Profesional',
  professional: 'Profesional',
  persuasif: 'Persuasif',
  persuasive: 'Persuasif',
  promo: 'Promo',
}

export function normalizeAiTone(value: unknown): AiTone {
  if (typeof value !== 'string' || !value.trim()) return DEFAULT_AI_PREFERENCES.tone
  const raw = value.trim()
  if ((AI_TONES as readonly string[]).includes(raw)) return raw as AiTone
  return LEGACY_TONE_MAP[raw.toLowerCase()] ?? DEFAULT_AI_PREFERENCES.tone
}

export function normalizeAiPreferences(input?: Partial<AiPreferences> | null): AiPreferences {
  return {
    tone: normalizeAiTone(input?.tone),
    autoCaption: input?.autoCaption ?? DEFAULT_AI_PREFERENCES.autoCaption,
    smartSchedule: input?.smartSchedule ?? DEFAULT_AI_PREFERENCES.smartSchedule,
    autoReply: input?.autoReply ?? DEFAULT_AI_PREFERENCES.autoReply,
  }
}

/** Instruksi gaya untuk caption (Gemini). */
export function getCaptionStyleGuide(tone: string): string {
  const t = normalizeAiTone(tone)
  switch (t) {
    case 'Santai':
      return [
        'GAYA WAJIB: Santai / kasual Indonesia.',
        '- Bahasa ngobrol kekinian, ramah, boleh emoji 1–4 buah.',
        '- Hindari kata kaku: "dengan ini", "sehubungan", "yang terhormat".',
        '- Nuansa teman yang merekomendasikan, bukan siaran berita.',
        '- Kalimat pendek, mudah discroll di feed.',
      ].join('\n')
    case 'Profesional':
      return [
        'GAYA WAJIB: Profesional / formal-bisnis.',
        '- Bahasa baku, sopan, percaya diri; minim emoji (0–1).',
        '- Fokus fakta produk, manfaat, dan kredibilitas toko.',
        '- Hindari slang, singkatan gaul, dan hiperbola berlebihan.',
        '- Cocok marketplace & pelanggan B2B / orang tua.',
      ].join('\n')
    case 'Persuasif':
      return [
        'GAYA WAJIB: Persuasif / storytelling soft-sell.',
        '- Bangun rasa butuh lewat masalah → solusi → ajakan lembut.',
        '- Highlight pain point pelanggan, lalu tawarkan produk sebagai jawaban.',
        '- 1 CTA jelas (DM, keranjang, chat WA) tanpa terasa memaksa.',
        '- Boleh 1–2 emoji; hindari ALL CAPS agresif.',
      ].join('\n')
    case 'Promo':
      return [
        'GAYA WAJIB: Promo / hard-sell marketing.',
        '- Energy tinggi: penawaran, urgensi, hemat, stok terbatas (jika masuk akal).',
        '- CTA kuat di awal/akhir (Beli sekarang, Cek keranjang, Order hari ini).',
        '- Boleh emoji promo 2–5; angka/harga menonjol jika ada.',
        '- JANGAN mengarang diskon % atau harga palsu yang tidak disebutkan user/katalog.',
      ].join('\n')
  }
}

/** Instruksi gaya untuk chat asisten. */
export function getAssistantStyleGuide(tone: string): string {
  const t = normalizeAiTone(tone)
  switch (t) {
    case 'Santai':
      return 'Gaya balasan: santai, ramah, seperti rekan kerja UMKM. Singkat dan jelas.'
    case 'Profesional':
      return 'Gaya balasan: profesional, ringkas, terstruktur (boleh bullet). Tanpa slang.'
    case 'Persuasif':
      return 'Gaya balasan: membantu + mendorong aksi (cek stok, buat caption, catat transaksi) dengan nada meyakinkan.'
    case 'Promo':
      return 'Gaya balasan: energik, berorientasi peluang jualan, tapi tetap akurat pada data.'
  }
}

/** Keyword visual poster (Genity) per gaya. */
export function getPosterStyleKeywords(tone: string): string {
  const t = normalizeAiTone(tone)
  switch (t) {
    case 'Santai':
      return 'casual friendly lifestyle ad, warm soft colors, approachable UMKM vibe, playful but clean layout'
    case 'Profesional':
      return 'premium corporate commercial, minimal elegant layout, muted sophisticated palette, trust-building product ad'
    case 'Persuasif':
      return 'story-driven lifestyle commercial, emotional benefit headline space, aspirational soft-sell product poster'
    case 'Promo':
      return 'high-energy promo sale poster, bold price/CTA space, vibrant contrast, urgency retail advertising'
  }
}
