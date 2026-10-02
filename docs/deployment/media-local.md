# Media Service lokal (T19)

Media Service berjalan pada 127.0.0.1:3004. Foto disimpan di AIStor, metadata dan audit di MySQL. Kontrak: [foto privat](../sdd/media-photos.md).

## Setup dari root proyek

Docker Desktop harus aktif. Jalankan container yang sudah dikonfigurasi:

```powershell
docker compose --env-file .env.mysql -f infra/compose.mysql.local.yml up -d mysql
docker compose --env-file .env.aistor -f infra/compose.aistor.local.yml up -d aistor
pnpm db:setup
pnpm db:migrate
pnpm db:migrate:test
pnpm db:grants
pnpm db:generate
pnpm storage:setup
```

Script storage menggunakan mc bawaan container AIStor yang dipin. Root hanya untuk membuat bucket/user/policy. Script menghasilkan .env.media dengan secret acak, lalu menguji akses akun runtime. Pengulangan memakai kredensial yang sama. Jika user sudah ada tetapi berkas secret hilang, pulihkan berkas; script tidak merotasi password diam-diam.

Bucket attendance-photos untuk development dan attendance-photos-test untuk integrasi. Runtime hanya punya GetBucketLocation/ListBucket pada bucket sendiri (health check) dan GetObject/PutObject pada attendance/*. ListBuckets di AIStor hanya menampilkan bucket yang diizinkan. Tidak punya admin/DeleteObject atau akses bucket lainnya. Akun MySQL Media hanya SELECT/INSERT/UPDATE pada media_objects dan SELECT/INSERT pada media_audit_logs.

.env.database dan .env.media ignored; template aman tersedia. PORT Media default 3004; variabel proses memiliki prioritas. Endpoint S3 lokal http://127.0.0.1:9000, URL publik bertanda tangan http://localhost:9000. Production wajib endpoint storage HTTPS dan koneksi database remote dengan CA terverifikasi. Host/scheme/path signed URL harus dipertahankan reverse proxy; setup VPS/Cloudflare mengikuti tahap rilis.

## Menjalankan

Auth dan Gateway memakai konfigurasi lokal yang sudah ada. Gunakan terminal terpisah:

```powershell
pnpm --dir apps/auth-service start:dev
```

```powershell
pnpm --dir apps/media-service start:dev
```

```powershell
pnpm --dir apps/api-gateway start:dev
```

Gateway membaca MEDIA_SERVICE_URL (default development http://127.0.0.1:3004, wajib eksplisit pada production). Jangan timpa .env.gateway yang sudah disesuaikan.

- Health: http://localhost:3004/health (MySQL + bucket), /health/live (proses).
- Swagger Media: http://localhost:3004/docs.
- Upload publik: POST http://localhost:3000/api/v1/media/attendance-photos, Bearer sesi karyawan aktif, Idempotency-Key UUID v4, multipart photo JPEG dan purpose CHECK_IN/CHECK_OUT.
- Respons READY adalah metadata foto, belum merupakan keberhasilan absensi. T20/T21 menghubungkan capture dan check-in.
- Endpoint inspect/photo-url hanya antarlayanan, membutuhkan MEDIA_INTERNAL_SECRET. Photo-url juga memverifikasi Bearer saat ini; Gateway tidak membuka endpoint internal. Attendance memeriksa event dan aturan soft-delete sebelum penerbitan URL.

## Pemeriksaan

```powershell
pnpm --dir apps/media-service build
pnpm --dir apps/api-gateway build
pnpm --dir apps/media-service exec tsc --noEmit
pnpm --dir apps/media-service lint
pnpm --dir apps/media-service test --runInBand
pnpm --dir apps/media-service test:e2e --runInBand
pnpm --dir apps/api-gateway test:e2e --runInBand --testPathPatterns media-proxy
```

Test integrasi memerlukan dist Auth/Gateway terbaru, MySQL attendance_test dan bucket test. Fixture JPEG dibuat sintetis; test hanya menghapus objek/record fixture miliknya melalui akun setup, bukan data development atau foto pengguna. Suite berjalan serial. Tidak perlu menjalankan seluruh monorepo pada perubahan lokal ini.
