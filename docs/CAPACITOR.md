# UMKMan Mobile (Capacitor)

Aplikasi Android/iOS yang **membungkus** web UMKMan di Vercel.

## Beban server

Capacitor **tidak** menambah server di Vercel/Railway.  
App = WebView di HP → request API sama seperti buka website.

| Service | Peran |
|---------|--------|
| **HP user** | Shell Capacitor + WebView |
| **Vercel** | Next.js, auth, AI, Blob |
| **Railway** | Postgres, GOWA, aiograpi |

Docker di laptop **boleh dimatikan** — production tetap jalan.

## Prasyarat

- Node.js 20+
- [Android Studio](https://developer.android.com/studio) (SDK + emulator atau HP USB debugging)
- iOS build **hanya di Mac** (Xcode) — di Windows fokusok Android

## Setup sekali

```bash
npm install
npx cap add android
# di Mac: npx cap add ios
npx cap sync
```

## Jalankan di emulator / HP

```bash
# Buka Android Studio project
npm run cap:android

# Atau sync dulu lalu buka
npm run cap:sync
npx cap open android
```

Di Android Studio: **Run ▶** (emulator atau device).

### Arahkan ke Next.js lokal (dev)

Emulator Android akses host machine lewat `10.0.2.2`:

```bash
# Terminal 1
npm run dev

# Terminal 2
set CAPACITOR_SERVER_URL=http://10.0.2.2:3000
npx cap sync android
npx cap open android
```

HP fisik: ganti dengan IP LAN laptop, mis. `http://192.168.1.10:3000`  
(Pastikan firewall mengizinkan port 3000.)

### Production URL (default)

Default di `capacitor.config.ts`:

```text
https://umkman.vercel.app
```

Override:

```bash
set CAPACITOR_SERVER_URL=https://umkman.vercel.app
npx cap sync
```

## Build APK / AAB (release)

1. `npx cap sync android`
2. Buka Android Studio → **Build → Generate Signed Bundle / APK**
3. Atau CLI Gradle:

```bash
cd android
.\gradlew.bat assembleDebug
# APK: android\app\build\outputs\apk\debug\app-debug.apk
```

Release store: butuh keystore sendiri (jangan commit keystore / password).

## Plugin terpasang

| Plugin | Fungsi |
|--------|--------|
| `@capacitor/app` | Lifecycle app |
| `@capacitor/browser` | Buka link eksternal (WA, Google) |
| `@capacitor/status-bar` | Status bar dark theme |
| `@capacitor/splash-screen` | Splash saat buka |
| `@capacitor/keyboard` | Keyboard resize form |

## Catatan penting

1. **Auth cookie** — WebView load domain Vercel (first-party), login JWT cookie harusnya jalan.
2. **Google OAuth** — pastikan redirect URI & `NEXT_PUBLIC_APP_URL` cocok domain production.
3. **Update fitur** — deploy Vercel saja; app Capacitor (mode remote URL) ikut update tanpa rebuild APK (kecuali ganti icon/permission/native).
4. **Offline** — butuh internet; tanpa net hanya splash `mobile/www/index.html`.
5. **Jangan commit** `android/local.properties`, keystore, atau secret signing.

## Struktur

```text
capacitor.config.ts   # appId, server.url, plugins
mobile/www/           # splash / fallback offline
android/              # native project (setelah cap add android)
docs/CAPACITOR.md     # dokumen ini
```

## Troubleshooting

| Gejala | Cek |
|--------|-----|
| Layar putih | URL Vercel down? `CAPACITOR_SERVER_URL` salah? |
| Login Google gagal | OAuth redirect + `NEXT_PUBLIC_APP_URL` |
| Local API gagal di emulator | Pakai `http://10.0.2.2:3000` bukan `localhost` |
| `cap sync` error webDir | Pastikan folder `mobile/www` ada |
| Build Gradle gagal | Buka Android Studio, install SDK 34+, accept licenses |
