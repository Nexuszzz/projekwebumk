# Postgres + private media (UMKMan)

## Mode data

| `DATABASE_URL` | Backend |
|---|---|
| **tidak di-set** | File JSON di `data/` (dev cepat) |
| `postgresql://...` | Postgres multi-tenant (Prisma) |

## Setup lokal Postgres

```bash
# 1. Jalankan database
docker compose up -d

# 2. .env.local
DATABASE_URL=postgresql://umkman:umkman@localhost:5432/umkman

# 3. Buat tabel
npm run db:push

# 4. Seed demo (opsional)
npm run db:seed

# 5. Dev
npm run dev
```

## Production

1. Buat Postgres managed (Neon, Supabase, RDS, dll.)
2. Set env:
   - `DATABASE_URL`
   - `AUTH_SECRET` (wajib, panjang)
   - `NEXT_PUBLIC_APP_URL`
   - key AI / OAuth
3. Deploy, jalankan sekali: `npx prisma db push` (atau `prisma migrate deploy`)
4. Seed hanya jika butuh data demo — production client biasanya kosong + onboarding

## Private media

Upload baru disimpan di `storage/uploads/` (bukan `public/`).

URL yang disimpan di DB:

```
/api/media/file?key=posters/{userId}/{businessId}/file.png
```

- Butuh login
- Hanya owner path (`userId` di key) yang boleh unduh
- File legacy di `public/uploads/` masih bisa dibaca lewat key yang sama

Pastikan folder `storage/` **writable** di server.

## Migrasi dari file JSON → Postgres

```bash
# Setelah DATABASE_URL aktif + db push:
npm run db:seed   # dari data/seed.json + users-seed.json
```

Untuk data runtime `business-db.json` / `users.json` yang sudah jalan di produksi file-mode: salin isinya ke seed atau buat script migrate kustom (minta dev bila perlu).
