# Vercel MCP di Grok (UMKMan)

MCP resmi Vercel sudah dipasang di **user config** Grok:

```toml
# ~/.grok/config.toml
[mcp_servers.vercel]
url = "https://mcp.vercel.com"
enabled = true
```

Endpoint: `https://mcp.vercel.com` (HTTP + OAuth)

## Aktifkan (wajib sekali)

Status saat ini: **server start OK**, tapi **butuh login OAuth Vercel**.

1. Di Grok TUI ketik: **`/mcps`**
2. Pilih server **vercel**
3. Tekan **`i`** (authenticate / login)
4. Browser buka → login akun Vercel → izinkan akses
5. Kembali ke Grok, tekan **`r`** untuk refresh

Cek:

```bash
grok mcp list
grok mcp doctor vercel
```

Setelah OAuth sukses, doctor harus healthy.

## Apa yang dibantu MCP

- Docs Vercel
- Project & deployment
- Log deploy
- Kelola resource (sesuai tool Vercel)

## Env production

MCP **tidak menggantikan** env secrets. Tetap isi di:

**Vercel → Project → Settings → Environment Variables**

(`DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, key AI, dll.)

Lihat `docs/VERCEL.md` untuk domain + checklist deploy.
