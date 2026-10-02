# API Gateway lokal

Gateway adalah alamat API yang dipakai frontend. Auth tetap memiliki aturan autentikasi dan database.

## Menjalankan
Dari PowerShell pada root proyek, jalankan Auth di terminal pertama:

```powershell
pnpm --dir apps/auth-service start:dev
```

Di terminal kedua:

```powershell
Copy-Item .env.gateway.example .env.gateway
pnpm --dir apps/api-gateway start:dev
```

Salin template hanya pada setup awal; jangan menimpa konfigurasi lokal yang sudah disesuaikan. Gateway membaca `.env.gateway`; Auth membaca `.env.database` dan `.env.auth`. Variabel environment proses memiliki prioritas lebih tinggi.

- Gateway readiness: http://localhost:3000/health
- Gateway liveness: http://localhost:3000/health/live
- Login HRD: POST http://localhost:3000/api/v1/auth/admin/login
- Login karyawan: POST http://localhost:3000/api/v1/auth/employee/login
- Kontrak lengkap: [spesifikasi Gateway](../sdd/gateway-auth.md)
- Swagger Auth: http://localhost:3001/docs (Swagger Gateway belum disediakan pada tahap ini).

Frontend menggunakan base URL `http://localhost:3000/api/v1` dan `credentials: include`. Access token dipakai melalui Authorization Bearer; refresh token berasal dari cookie HttpOnly yang diteruskan Gateway. Request refresh wajib mengirim Origin yang disetujui Auth dan Gateway. Template kedua service mencakup localhost:5173 dan localhost:5174.

## Pemeriksaan
```powershell
pnpm --dir apps/api-gateway test --runInBand
pnpm --dir apps/api-gateway test:e2e --runInBand
pnpm --dir apps/api-gateway build
pnpm --dir apps/api-gateway lint
```

T09a: 11 unit test dan 17 HTTP test (termasuk scaffold) lulus. Smoke service terkompilasi dengan Auth/MySQL development memverifikasi readiness, login seed HRD, cookie, profile, rotasi sesi, logout dan revokasi. Password seed tidak diganti. Proses smoke dihentikan setelah pengujian.

Gateway bind loopback; deploy membutuhkan reverse proxy VPS. Gateway membuat X-Forwarded-For dari socket dan mengabaikan header proxy klien. Auth hanya mempercayai proxy loopback sehingga limiter memakai alamat yang dikirim Gateway. Rantai kepercayaan Nginx/Cloudflare dan limiter edge harus dikonfigurasi saat deployment; IP publik asli belum dipetakan pada tahap lokal ini.

## Referensi implementasi
- [NestJS body parser](https://docs.nestjs.com/faq/raw-body): parser JSON dengan limit khusus.
- [Express behind proxies](https://expressjs.com/en/guide/behind-proxies/): proxy terpercaya dan alamat klien.
- [Node.js fetch](https://nodejs.org/api/globals.html#fetch): HTTP upstream dengan timeout dan redirect manual.

## Upload foto (T19)

Gateway meneruskan POST /api/v1/media/attendance-photos secara multipart ke Media Service 3004. MEDIA_SERVICE_URL wajib pada production dan default loopback saat development. Auth diverifikasi sebelum menerima berkas; secret layanan/cookie klien tidak diteruskan ke Media. Setup dan kontrak: [Media lokal](media-local.md).
