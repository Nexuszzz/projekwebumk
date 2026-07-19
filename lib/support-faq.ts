/**
 * FAQ + aturan eskalasi untuk widget support (landing).
 * Pertanyaan umum dijawab di web; yang spesifik → nomor WhatsApp CS.
 */

export type SupportReply = {
  reply: string
  escalate: boolean
  reason?: string
}

/** Nomor CS default (bisa di-override env NEXT_PUBLIC_SUPPORT_WA) */
export function supportWaNumber() {
  const raw = (process.env.NEXT_PUBLIC_SUPPORT_WA || '6287847529293').replace(/\D/g, '')
  if (raw.startsWith('0')) return `62${raw.slice(1)}`
  if (raw.startsWith('8')) return `62${raw}`
  return raw || '6287847529293'
}

export function waMeLink(text?: string) {
  const n = supportWaNumber()
  const q = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${n}${q}`
}

export const QUICK_CHIPS = [
  { id: 'fitur', label: 'Fitur UMKMan apa saja?' },
  { id: 'daftar', label: 'Cara daftar / coba gratis' },
  { id: 'harga', label: 'Apakah berbayar?' },
  { id: 'wa', label: 'Chat CS WhatsApp' },
] as const

/** Jawaban instan tanpa AI (cepat + hemat) */
export function matchFaq(message: string): SupportReply | null {
  const m = message.toLowerCase().trim()

  if (!m) {
    return {
      reply: 'Halo! Ada yang bisa dibantu seputar UMKMan? Pilih pertanyaan cepat atau ketik sendiri.',
      escalate: false,
    }
  }

  // Sapaan / chat random pendek (hindari Gemini JSON putus di production)
  const isGreeting =
    /^(hai|halo|hi|hey|hello|oi|oy|bang|bro|sis|min|kak|p|test|tes|oke|ok|yo|woy|gan|boss)\b/.test(
      m,
    ) ||
    m.length <= 4 ||
    /^(mau tanya|boleh tanya|bisa tanya|ini gimana|gimana|apa kabar|assalam|salam|pagi|siang|sore|malam)/.test(
      m,
    ) ||
    // "oi bang mau tanya", "oke ini gimana", "test dulu", dll
    /^(oi|oy|bang|bro|min|kak|oke|ok)\b.{0,40}(tanya|gimana|bagaimana|dong|ya|gak|nggak|aja)?\s*$/.test(
      m,
    ) ||
    // pesan sangat random tanpa kata kunci produk/platform (≤ 24 char, tanpa ?)
    (m.length <= 24 && !/[?]/.test(m) && !/\b(fitur|daftar|harga|bayar|stok|umkm|akun|login|wa|whatsapp)\b/.test(m) && !/\d{3,}/.test(m))

  if (isGreeting) {
    return {
      reply:
        'Halo! 👋 Ada yang bisa saya bantu seputar UMKMan — fitur, cara daftar, demo, atau multi-tenant? Bisa pilih chip di bawah atau ketik pertanyaanmu.',
      escalate: false,
    }
  }

  // Langsung minta CS / WA
  if (
    /\b(cs|customer service|admin|manusia|orang|operator|hubungi|telepon|telpon)\b/.test(m) ||
    /\b(whatsapp|wa)\b/.test(m)
  ) {
    return {
      reply:
        'Siap — untuk bantuan langsung, chat tim CS kami di WhatsApp. Klik tombol di bawah ya.',
      escalate: true,
      reason: 'user_request_human',
    }
  }

  if (/\b(fitur|bisa apa|fungsi|kemampuan)\b/.test(m)) {
    return {
      reply:
        'UMKMan bantu UMKM: (1) caption & poster AI dari foto produk, (2) catat transaksi bahasa natural, (3) laporan omzet/PDF, (4) chatbot WhatsApp pelanggan. Semua multi-tenant — data usaha terisolasi per akun.',
      escalate: false,
    }
  }

  if (/\b(daftar|register|coba gratis|buat akun|sign up|mulai)\b/.test(m)) {
    return {
      reply:
        'Klik “Coba Gratis” atau buka /login → Daftar. Bisa pakai email atau Google. Setelah masuk, buat usaha pertama di onboarding — gratis untuk dicoba.',
      escalate: false,
    }
  }

  if (/\b(harga|bayar|biaya|langganan|premium|gratis|pricing)\b/.test(m)) {
    return {
      reply:
        'Saat ini demo & uji coba platform gratis untuk kebutuhan kompetisi/demo. Paket berbayar full production bisa dibahas dengan CS lewat WhatsApp.',
      escalate: false,
    }
  }

  if (/\b(keamanan|data|privasi|tenant|isolasi)\b/.test(m)) {
    return {
      reply:
        'Data multi-tenant: setiap akun hanya melihat usahanya sendiri. Data client lain tidak tercampur. Login dilindungi session JWT + opsi Google.',
      escalate: false,
    }
  }

  // Terlalu spesifik / operasional → eskalasi
  if (shouldEscalate(m)) {
    return {
      reply:
        'Pertanyaan ini lebih cocok ditangani CS langsung (order khusus, komplain, integrasi custom, atau data akun pribadi). Saya alihkan ke WhatsApp ya.',
      escalate: true,
      reason: 'too_specific',
    }
  }

  return null
}

export function shouldEscalate(message: string): boolean {
  const m = message.toLowerCase()
  const patterns = [
    /\b(komplain|refund|batal|penipuan|scam)\b/,
    /\b(transfer|rekening|bukti bayar|invoice resmi|npwp|pajak)\b/,
    /\b(password|kata sandi|hack|bocor|email saya|akun saya)\b/,
    /\b(order\s+\d|pesan\s+\d|kirim ke alamat|dropship)\b/,
    /\b(custom|modifikasi|api key|server|deploy|domain)\b/,
    /\b(kerja sama|reseller|agen|investor|modal)\b/,
  ]
  return patterns.some((p) => p.test(m))
}

export function supportSystemPrompt() {
  return `Kamu adalah asisten support website UMKMan (platform AI untuk UMKM Indonesia).

## Aturan
- Jawab singkat (maks 2–4 kalimat), ramah, bahasa Indonesia.
- Topik yang BOLEH: fitur UMKMan, cara daftar, demo, multi-tenant, AI caption/poster, transaksi, stok, laporan, chatbot WA, Instagram.
- Chat random / sapaan: balas ramah dan tawarkan topik bantuan (jangan kosong / jangan JSON di dalam reply).
- JANGAN mengarang harga produk fisik toko tertentu, stok real-time, atau status order pelanggan.
- Jika terlalu spesifik (order, komplain, bayar, data akun, custom), escalate=true dan arahkan ke WhatsApp CS.
- Field "reply" harus teks biasa untuk user — JANGAN isi reply dengan JSON lagi.

## Output
Hanya JSON: {"reply":"teks untuk user","escalate":false}`
}
