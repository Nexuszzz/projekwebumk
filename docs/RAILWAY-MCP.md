# Railway MCP di Grok (UMKMan)

Agar Grok bisa **mengatur project Railway** (deploy GOWA, env, domain, logs).

## Yang sudah dikonfigurasi

Di `~/.grok/config.toml`:

```toml
[mcp_servers.railway]
url = "https://mcp.railway.com"
enabled = true
```

Ini **Remote MCP** resmi Railway — mirip Vercel MCP.  
Tidak wajib install CLI dulu; login lewat **OAuth browser**.

## Yang kamu lakukan (sekali)

1. **Restart Grok / sesi baru** (biar MCP ke-load).
2. Saat tools Railway diminta, muncul **login OAuth Railway** → setujui workspace/project.
3. Atau di terminal (opsional, untuk CLI lokal):

   ```bash
   npm install -g @railway/cli
   railway login
   railway whoami
   ```

4. Cek:
   ```bash
   # di Grok, setelah restart
   # minta: "list Railway projects"
   ```

## Plugin Railway (di dashboard web) vs MCP

| | |
|--|--|
| **Plugin** (Postgres, Redis, …) | Infra di **dalam project Railway** (DB, cache) |
| **MCP** | **Grok/AI** yang bisa create project, deploy, set env, lihat logs |

Untuk GOWA: deploy **Docker Image** lewat MCP/CLI, **bukan** plugin.  
Plugin **Postgres** boleh ditambah terpisah untuk `DATABASE_URL` Vercel.

## Setelah MCP connected — minta Grok

Contoh prompt:

- “List project Railway saya”
- “Buat service GOWA dari Docker image `aldinokemal2104/go-whatsapp-web-multidevice`”
- “Set env GOWA webhook ke https://umkman.vercel.app/api/whatsapp/webhook”
- “Generate public domain untuk service gowa”

## Deploy aktif (2026-07-19)

| Service | URL | Image |
|---------|-----|-------|
| **gowa** (WhatsApp) | https://gowa-production-d596.up.railway.app | `aldinokemal2104/go-whatsapp-web-multidevice:latest` |
| **aiograpi** (IG private demo) | https://aiograpi-production.up.railway.app | `subzeroid/aiograpi-rest:latest` |
| **Postgres** | Railway internal + `DATABASE_PUBLIC_URL` | `postgres-ssl` |

**Persistence (sudah diaktifkan):**
- Railway **Postgres** online → data user/usaha/katalog/konten/transaksi permanen
- Vercel env `DATABASE_URL` = Postgres public URL + `sslmode=require`
- Schema Prisma di-`db push` ke Postgres
- **Vercel Blob** store `umkman-media` → upload/poster **permanen** (`BLOB_READ_WRITE_TOKEN` + `BLOB_STORE_ID`)
- URL gambar disimpan di DB sebagai `https://….public.blob.vercel-storage.com/…`

- Project Railway: `umkman`
- Dashboard GOWA: basic auth `umkman` / `umkman-gowa-secret`
- aiograpi Swagger: https://aiograpi-production.up.railway.app/docs

Catatan: start command custom `rest` **jangan** di-set di Railway (override ENTRYPOINT image → crash). Biarkan default image.

## Env yang harus cocok (Vercel ↔ Railway GOWA)

**Railway (GOWA) — sudah di-set:**

```env
APP_PORT=3100
APP_HOST=0.0.0.0
APP_OS=UMKMan
APP_BASIC_AUTH=umkman:umkman-gowa-secret
WHATSAPP_WEBHOOK=https://umkman.vercel.app/api/whatsapp/webhook
WHATSAPP_WEBHOOK_SECRET=umkman-webhook-secret
WHATSAPP_WEBHOOK_EVENTS=message
WHATSAPP_WEBHOOK_IGNORE_JIDS=@g.us
WHATSAPP_AUTO_MARK_READ=true
WHATSAPP_ACCOUNT_VALIDATION=false
WHATSAPP_AUTO_DOWNLOAD_MEDIA=false
```

**Vercel (UMKMan) — Production + Preview:**

```env
GOWA_BASE_URL=https://gowa-production-d596.up.railway.app
GOWA_BASIC_AUTH=umkman:umkman-gowa-secret
GOWA_WEBHOOK_SECRET=umkman-webhook-secret
AIOGRAPI_BASE_URL=https://aiograpi-production.up.railway.app
NEXT_PUBLIC_APP_URL=https://umkman.vercel.app
```

### Cara pakai production

**WhatsApp**
1. Pastikan GOWA online (sudah).
2. Di UMKMan → Pengaturan → WhatsApp → hubungkan nomor (pair code/QR) lewat app **bukan** hanya dashboard GOWA, agar `deviceId` tersimpan di usaha.
3. Webhook AI: `https://umkman.vercel.app/api/whatsapp/webhook`

**Instagram**
- **Legal Graph API**: Pengaturan → Instagram → isi IG User ID + Access Token → Post API.
- **Demo private**: Pengaturan → Instagram → paste `sessionid` cookie → butuh `AIOGRAPI_BASE_URL` (sudah).
- Mode **bantu**: salin caption + buka Instagram app (tanpa API).

## Troubleshooting

| Gejala | Perbaikan |
|--------|-----------|
| MCP railway tidak muncul | Restart Grok; cek `config.toml` `enabled = true` |
| OAuth gagal | Login railway.com di browser, coba lagi |
| CLI `railway` not found | `npm i -g @railway/cli` lalu buka terminal baru |
| Deploy GOWA error port | Set `APP_PORT` + public port Railway ke 3100 |
| `executable rest could not be found` | Hapus custom start command di service |
| Session hilang setelah redeploy | Tambah volume Railway di `/app/storages` |

## Referensi

- https://docs.railway.com/ai/mcp-server  
- https://docs.railway.com/cli/mcp  
- https://mcp.railway.com  
