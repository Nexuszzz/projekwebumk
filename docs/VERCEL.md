# Deploy UMKMan ke Vercel + domain sendiri

## Penting dulu (wajib baca)

Di **Vercel**, disk server **tidak permanen**. Jadi:

| Fitur | Lokal | Vercel |
|---|---|---|
| Data usaha / user | File `data/*.json` OK | **Tidak bisa diandalkan** → wajib **Postgres** (`DATABASE_URL`) |
| Upload poster/logo | `storage/uploads` OK | File bisa **hilang** setelah deploy ulang → untuk production serius pakai Blob/S3 (nanti) |
| Auth, AI, domain | OK | OK jika env benar |

**Kesimpulan:** production Vercel = **harus Postgres** (Neon / Supabase / dll. gratis).

---

## Langkah 1 — Database Postgres (Neon, gratis)

1. Buka [https://neon.tech](https://neon.tech) → daftar → **Create project**
2. Copy **connection string** (format `postgresql://...`)
3. Simpan sebagai `DATABASE_URL`

Di laptop (sekali saja, buat tabel):

```bash
# .env.local sementara
DATABASE_URL="postgresql://USER:PASS@HOST/DB?sslmode=require"

npx prisma db push
# opsional isi demo NUSACID:
npm run db:seed
```

---

## Langkah 2 — Push kode ke GitHub

```bash
git add .
git commit -m "Ready for Vercel deploy"
git push origin main
```

(Pastikan `.env.local` **tidak** ter-commit — sudah di `.gitignore`.)

---

## Langkah 3 — Project Vercel

1. [https://vercel.com](https://vercel.com) → **Add New Project**
2. Import repo GitHub UMKMan
3. Framework: **Next.js** (otomatis)
4. **Root Directory:** biarkan default
5. **Build Command:** `prisma generate && next build` (atau biarkan `npm run build`)
6. **Install Command:** `npm install` (postinstall sudah `prisma generate`)

Jangan Deploy dulu — isi Environment Variables dulu.

---

## Langkah 4 — Environment Variables (Vercel → Settings → Environment Variables)

Isi untuk **Production** (dan Preview jika perlu):

| Name | Contoh / catatan |
|---|---|
| `DATABASE_URL` | Connection string Neon (wajib) |
| `AUTH_SECRET` | Random panjang ≥32 karakter |
| `NEXT_PUBLIC_APP_URL` | `https://domain-anda.com` (tanpa slash di akhir) |
| `GEMINI_API_KEY` | Key Google AI Studio |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `GENTY_API_KEY` | Key GenityBoost |
| `GENTY_BASE_URL` | `https://api.genityboost.site` |
| `GOOGLE_CLIENT_ID` | Opsional, login Google |
| `GOOGLE_CLIENT_SECRET` | Opsional |

Generate `AUTH_SECRET` (PowerShell):

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Atau di terminal:

```bash
openssl rand -base64 48
```

Lalu **Deploy**.

---

## Langkah 5 — Domain sendiri di Vercel

1. Vercel project → **Settings → Domains**
2. **Add** domain, mis. `umkman.id` atau `app.umkman.id`
3. Vercel kasih instruksi DNS:

### Kalau domain root (`umkman.id`)
Di penyedia domain (Niagahoster, Cloudflare, Namecheap, dll.):

| Type | Name | Value |
|---|---|---|
| **A** | `@` | `76.76.21.21` |
| **CNAME** | `www` | `cname.vercel-dns.com` |

### Kalau subdomain (`app.umkman.id`)
| Type | Name | Value |
|---|---|---|
| **CNAME** | `app` | `cname.vercel-dns.com` |

4. Tunggu DNS propagasi (bisa 5 menit–48 jam; biasanya cepat)
5. Vercel otomatis pasang **HTTPS (SSL)** gratis
6. Update env:

```
NEXT_PUBLIC_APP_URL=https://domain-anda.com
```

Redeploy setelah ganti env (Deployments → ⋮ → Redeploy).

---

## Langkah 6 — Google OAuth (jika dipakai)

Di [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth Client:

**Authorized redirect URIs** tambah:

```
https://domain-anda.com/api/auth/google/callback
https://www.domain-anda.com/api/auth/google/callback
```

(Juga biarkan localhost untuk dev jika perlu.)

---

## Langkah 7 — Cek setelah live

1. Buka `https://domain-anda.com` → landing OK  
2. `/login` → daftar akun baru  
3. Onboarding buat usaha  
4. Dashboard → generate caption / laporan  

Kalau error:

| Gejala | Cek |
|---|---|
| 500 saat login/data | `DATABASE_URL` + `prisma db push` sudah jalan? |
| Session / logout aneh | `AUTH_SECRET` production sudah di-set? |
| Google login gagal | Redirect URI + `NEXT_PUBLIC_APP_URL` |
| AI gagal | `GEMINI_API_KEY` / `GENTY_API_KEY` |
| Poster hilang setelah redeploy | Normal di Vercel (disk ephemeral) — butuh Blob nanti |

---

## Catatan media di Vercel

Upload poster/logo **bisa jalan sementara**, tapi file di `storage/` **bisa hilang** di serverless.

Untuk production mantap nanti:
- **Vercel Blob** atau **Cloudflare R2** / S3  
- Simpan URL permanen di DB  

Sementara: data usaha di Postgres aman; media yang kritis simpan di tempat lain atau regenerate.

---

## Checklist singkat

- [ ] Neon/Supabase Postgres + `prisma db push`
- [ ] Repo di GitHub
- [ ] Vercel import + env lengkap
- [ ] Deploy sukses (build hijau)
- [ ] Domain DNS → Vercel
- [ ] `NEXT_PUBLIC_APP_URL=https://domain-anda.com`
- [ ] Google redirect URI (jika ada)
- [ ] Uji daftar → buat usaha → dashboard
