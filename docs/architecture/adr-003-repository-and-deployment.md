# ADR-003: Satu repository dengan deployment frontend terpisah
Tanggal: 2026-10-01 (Asia/Jakarta).
Status: disetujui pengguna.

## Keputusan
- Satu repository GitHub berbentuk monorepo untuk kedua frontend, seluruh service backend, package bersama, dokumentasi, pengujian dan infra.
- Revisi terbaru 2026-10-03: coding/tes lokal dan push langsung dev, PR dev ke main untuk rilis. Hanya dua branch dev dan main. Satu production main; tanpa deployment dev/preview. [Workflow CI/CD](../development/ci-cd-workflow.md) menetapkan pemeriksaan ringkas dan status CD.
- Attendance Portal menjadi satu project Vercel tersendiri, dengan sumber apps/attendance-web dan domain attendance.annastriwidagdo.me.
- HR Portal menjadi project Vercel lain, dengan sumber apps/hr-web dan domain hr.annastriwidagdo.me.
- Kedua project Vercel terhubung ke repository yang sama, tetapi memiliki konfigurasi environment dan deployment masing-masing.
- API Gateway, Auth, Employee, Attendance dan Media berjalan di VPS Ubuntu, dengan port internal berbeda sesuai rancangan service.
- MySQL berjalan di VPS Ubuntu. Frontend mengakses database melalui API; MySQL tidak dibuka langsung untuk browser/internet.
- MinIO AIStor Free tetap berjalan di VPS melalui Docker Compose sesuai ADR-001, dengan bucket privat dan volume persisten.
- DNS memakai Cloudflare. Domain API attendance-api.annastriwidagdo.me mengarah ke pintu masuk HTTPS backend; attendance-storage.annastriwidagdo.me mengikuti rancangan storage privat dan akses foto terotorisasi.
- JWT secret, kredensial MySQL/storage, dan lisensi AIStor hanya berada pada environment backend/VPS yang sesuai. Variabel VITE_ hanya memuat konfigurasi publik seperti alamat API.

## Alasan
Satu repository memudahkan perubahan kontrak frontend/backend dan package bersama ditinjau dalam satu perubahan. Pemisahan project Vercel membuat kedua portal memiliki deployment dan environment sendiri. Batas service ditentukan oleh proses, API dan kepemilikan data; tidak membutuhkan repository berbeda.

## Batas implementasi
Keputusan ini menetapkan topologi deployment. Repository GitHub, project Vercel, VPS dan DNS belum dibuat atau diubah oleh ADR ini. Build/instalasi workspace pada Vercel, preview development, konfigurasi CORS/cookie HTTPS, reverse proxy dan CI/CD akan diverifikasi pada tahap deployment. Promosi ke main tetap mengikuti pemeriksaan rilis dan instruksi pengguna.

## Acuan
- [Baseline](../requirements/baseline.md)
- [Object storage](adr-001-object-storage.md)
- [Tooling monorepo](adr-002-project-tooling.md)
- [Rencana implementasi](../../tasks/plan.md)
