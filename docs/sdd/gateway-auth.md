# Integrasi Gateway untuk autentikasi (T09a)

Frekuensi testing dan aturan centang: [workflow aktif](../testing/workflow.md). Resep/hasil suite lama di dokumen ini tidak menjadi gate rutin; bukti historis tetap dipertahankan.

## Tujuan dan batas
Portal HRD memakai API Gateway port 3000 untuk mengakses Auth Service port 3001. Gateway tidak mengakses database dan tidak menerbitkan JWT. Validasi akun, password, sesi dan role tetap dimiliki Auth.

## Kontrak
- Enam jalur `/api/v1/auth`: POST admin/login, employee/login, refresh, change-password, logout; GET me.
- Jalur upstream selalu berasal dari konfigurasi dan daftar route tetap; redirect upstream tidak diikuti.
- Body JSON maksimal 16 KiB; request upstream dibatasi 5 detik. Tidak ada retry otomatis untuk operasi autentikasi.
- Teruskan Authorization, Cookie, Origin dan UUID request ID; teruskan semua Set-Cookie serta Retry-After. Jangan meneruskan header proxy kiriman klien.
- Balasan Auth mempertahankan status dan JSON; gangguan upstream menjadi 503 dengan pesan umum. Token, password dan cookie tidak dicatat.
- CORS memakai allowlist origin eksplisit dan credentials. Semua balasan menggunakan Cache-Control: no-store.
- Bind lokal 127.0.0.1. Health/live memeriksa proses; health memeriksa readiness Auth.
- Gateway mencatat alamat socket sebagai X-Forwarded-For. Auth mempercayai proxy loopback saja. Pemetaan proxy VPS/Cloudflare akan ditetapkan pada tahap deploy.

## Verifikasi
Supertest dengan HTTP upstream nyata lokal: route, status, JSON, cookie berulang, header aman, CORS, body terlalu besar, redirect ditolak, kegagalan koneksi, timeout dan health. Dilanjutkan smoke Gateway dengan Auth/MySQL development tanpa mengubah password seed.

## Tahap berikutnya
T09b: antarmuka HRD dengan HeroUI dan Atomic Design; T09c: component test dan alur browser login/ganti password. T09 belum selesai hanya dengan Gateway.
