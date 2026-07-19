# Instagram Private API (Demo) — aiograpi-rest

**Tidak resmi Meta. Risiko ban, challenge, dan melanggar ToS.**  
Hanya untuk demo / akun uji internal. Jangan minta password IG client production.

## Gateway

```bash
docker compose up -d aiograpi
```

- Swagger: http://localhost:8000/docs  
- Env app: `AIOGRAPI_BASE_URL=http://127.0.0.1:8000`

## Alur di UMKMan

1. Pengaturan → **Instagram** → tab **Demo Private API**
2. Isi username + password (atau cookie `sessionid`)
3. Login → session disimpan per **usaha** (password tidak disimpan)
4. Konten → **Post ke IG** → **Post otomatis (Private API demo)**

## Multi-tenant

Tiap `businessId` punya `profile.instagram.privateSessionId` sendiri.

## Alternatif lebih aman

- Mode bantu (salin caption + unduh poster)
- Graph API resmi (token Business) di tab Graph API
