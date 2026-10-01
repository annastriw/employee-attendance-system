# Auth Service — backend fondasi dan login
Acuan: baseline.md; auth-database.md. Scope ini melanjutkan kebutuhan yang telah disetujui.
Asumsi implementasi lokal: admin seed memakai admin@example.test; password acak hanya lokal.
TTL access JWT 15 menit, refresh 7 hari; bcrypt salt acak cost 12.
Frontend/Gateway dan endpoint internal provisioning karyawan dikerjakan pada task berikutnya.

## Increment
- T08a: package database backend bersama; Auth terhubung MySQL; /health dan /health/live.
- T08b: seed satu HRD ACTIVE, wajib ganti password; idempotent tanpa mereset password.
- T08c: /api/v1/auth/admin/login dan employee/login; /me; logout.
- T08d: /change-password dan /refresh; pencabutan sesi dan rotasi refresh.
Setiap bagian memiliki test, build/lint relevan, dokumentasi dan commit.

## Kontrak
- Login body email/password tervalidasi; email trim/lowercase, password tidak di-trim.
- Pesan 401 sama untuk email/password salah, salah panel, akun nonaktif/arsip.
- JWT HS256 dengan issuer/audience, sub dan sid; status account/session diperiksa dari DB.
- Response hanya accessToken, expiresIn dan profil aman; tidak ada hash/password.
- Refresh opaque acak 32 byte, hash SHA-256 di DB, cookie HttpOnly, SameSite=Lax,
  Secure pada production, cookie admin/karyawan terpisah. Origin harus di allowlist.
- /me, change-password, logout tetap tersedia saat mustChangePassword=true.
  Guard bisnis menolak restricted session; belum ada endpoint bisnis pada fase ini.
- Ganti password wajib password lama, baru minimal 12 karakter maksimal 72 byte,
  berbeda dari lama; menonaktifkan seluruh sesi dan meminta login ulang.
- Login/ganti password memeriksa ulang password hash/status dalam transaksi locked account
  agar reset/deaktivasi bersamaan tidak menerbitkan sesi valid dari password lama.
- Refresh rotasi atomik hash; token lama tidak berlaku; dua request bersamaan hanya satu sukses.
- Logout mencabut sesi DB sehingga access JWT lama ditolak.
- Rate limit login/refresh 10 request/menit/IP pada satu instance lokal; shared store sebelum scale.
- Audit append-only tanpa kredensial/token. Exception DB dibungkus respons 503 generik.
- Swagger /docs, CORS allowlist, validation whitelist, request ID UUID.
- Service bind 127.0.0.1:3001 lokal; endpoint internal tidak dipublikasikan langsung.

## Verifikasi
Jest: health failure tidak membocorkan konfigurasi, seed idempotent, validasi konfigurasi.
Supertest + MySQL attendance_test: role, password, active/archived, validation,
cookie/security, me, logout/revoked/expired, forced change, refresh concurrency.
Test account dibuat hanya di database test dan dibersihkan menggunakan akun migration test.
Seed nyata hanya dev; tidak mengubah akun yang sudah ada.
