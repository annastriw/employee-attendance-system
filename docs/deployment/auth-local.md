# Auth Service lokal

## Menjalankan
Dari root proyek, Docker Desktop dan MySQL harus aktif:
```powershell
pnpm db:generate
node scripts/database/setup-auth-local.mjs
pnpm --dir apps/auth-service build
pnpm --dir apps/auth-service seed:admin
pnpm --dir apps/auth-service start:dev
```

Auth bind 127.0.0.1, port default 3001. PORT environment dapat mengubah port.
- Swagger: http://localhost:3001/docs
- Readiness MySQL: http://localhost:3001/health
- Liveness proses: http://localhost:3001/health/live

.env.database menyediakan AUTH_DATABASE_URL milik akun runtime terbatas.
.env.auth berisi JWT secret dan kredensial seed; keduanya tidak masuk Git.
ADMIN_SEED_EMAIL lokal: admin@example.test. Password acak ada pada ADMIN_SEED_PASSWORD
di .env.auth, bukan password contoh dalam test. Jangan membagikan file tersebut.
Seed memakai bcrypt cost 12/salt acak, ACTIVE dan mustChangePassword=true.
Pengulangan seed tidak mereset password/status. Admin dengan email berbeda ditolak.
Setelah password diganti melalui API, password seed lama tidak berlaku dan seed ulang
tetap tidak mengembalikannya.

## API
Base /api/v1:
- POST /auth/admin/login: email/password HRD.
- POST /auth/employee/login: email/password karyawan.
- GET /auth/me: Bearer access JWT.
- POST /auth/change-password: Bearer, currentPassword/newPassword.
- POST /auth/logout: Bearer, mencabut sesi saat ini.
- POST /auth/refresh: panel admin/employee, cookie refresh dan Origin allowlist.

Login mengembalikan accessToken, expiresIn=900 dan profil aman.
Refresh token hanya dalam cookie HttpOnly, SameSite=Lax; production memakai Secure
dan prefix __Host-. Hash refresh saja disimpan dalam MySQL.
Refresh berlaku maksimal 7 hari sejak login dan dirotasi setiap penggunaan.
Browser harus memakai credentials: include untuk request cookie.
CORS memakai origin eksplisit dari AUTH_ALLOWED_ORIGINS. Refresh tanpa Origin atau
Origin di luar allowlist ditolak. Jangan menambahkan wildcard.

Password awal wajib diganti. Sesi terbatas hanya dapat me/change-password/logout/refresh.
Guard yang dipakai endpoint bisnis secara default menolak sesi terbatas.
Password baru minimal 12 karakter dan maksimal 72 byte UTF-8.
Ganti password mencabut seluruh sesi dan meminta login ulang.
Logout, sesi expired dan account nonaktif/arsip membatalkan access JWT lewat pemeriksaan DB.
Reset password oleh HRD belum tersedia pada tahap ini.

Login dan refresh dibatasi 10 request/menit/IP per endpoint pada satu instance.
Sebelum menambah instance, siapkan rate-limit store bersama dan konfigurasi proxy tepercaya.
Gateway belum dihubungkan; nanti harus meneruskan Origin, Cookie, Set-Cookie,
Authorization dan X-Request-ID tanpa membocorkan token ke log.

## Pengujian
```powershell
pnpm --dir apps/auth-service test --runInBand
pnpm --dir apps/auth-service test:e2e --runInBand
pnpm db:verify
pnpm build
pnpm lint
pnpm audit --prod --audit-level high
```
E2E login memakai attendance_test dan kredensial test, bukan development.
Fixture dibuat/dibersihkan berdasarkan ID unik, tidak menghapus akun test lain.
Verifikasi 2026-10-01: 6 unit Auth, 12 test Supertest/MySQL, 3 test package database
dan 4 unit scaffold backend lain lulus. Build/lint workspace lulus.
Smoke server hasil build memverifikasi health, Swagger, login seed nyata, cookie/headers,
me dan logout. Smoke memakai port sementara 13001 lalu prosesnya dihentikan.
Audit production: tidak ada advisory yang diketahui setelah override dependency ditinjau.

## Batas
Frontend dan Gateway belum terintegrasi; tidak ada layar login siap pakai.
Akun karyawan belum dapat dibuat melalui UI/API. Seed yang tersedia hanya HRD.
Master data, provisioning, reset password, outbox, serta absensi merupakan task berikutnya.
