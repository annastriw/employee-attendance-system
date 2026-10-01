# Rencana implementasi — Attendance Portal dan HR Portal
Status: implementasi fondasi berlangsung; task lengkap tetap mengikuti todo.md. Tanggal: 2026-10-01 (Asia/Jakarta).

## Acuan
Kebutuhan/database/API disetujui: ../docs/requirements/baseline.md.
Daftar pekerjaan: todo.md. Checklist belum dicentang berarti acceptance/verification task belum sepenuhnya ditutup; baca subtask dan progress untuk pekerjaan yang sudah berjalan.

## Pendekatan
Satu repository GitHub monorepo, lima service dengan kepemilikan tabel, dua frontend. Kedua frontend memakai project Vercel terpisah; backend, MySQL dan AIStor berada di VPS Ubuntu. Topologi: [ADR-003](../docs/architecture/adr-003-repository-and-deployment.md). Selesaikan jalur pengguna bertahap; bukan seluruh backend lalu seluruh frontend. Setiap perubahan menggunakan spec terkait, test relevan, review dan dokumentasi.

## Tooling disetujui
pnpm workspace, Prisma dengan migration terpusat untuk satu database, HTTP internal + transactional outbox/worker. Detail pada ../docs/architecture/adr-002-project-tooling.md. Kompatibilitas versi dan spesifikasi worker masih bagian task fondasi; Workspace dan dependency awal sudah dipasang; Prisma CLI/client/adapter dikunci 7.10.0.

## Urutan dan checkpoint
1. Dokumen module SDD dan aturan context; keputusan tooling kompatibel; kesiapan lingkungan.
2. Kerangka monorepo, test tooling, MySQL/MinIO AIStor Free development, healthcheck.
   Checkpoint A: build/test kerangka berjalan; data testing terpisah.
3. Login admin + seed + ganti password; master data; buat karyawan; login karyawan.
   Checkpoint B: HRD membuat akun, karyawan mengganti password dan login.
4. Lifecycle akun, reset/revokasi, riwayat eligibility; kalender/jadwal.
   Checkpoint C: akun nonaktif tidak dapat mengakses; restore tidak aktif; aturan libur teruji.
5. Uji browser kamera/lokasi/MediaPipe lebih awal; foto privat dan capture; check-in ujung ke ujung.
   Checkpoint D: kamera mobile dan fallback bekerja, lokasi wajib, foto aman, check-in tidak ganda.
6. Checkout; lifecycle absensi; riwayat dan monitoring Leaflet.
   Checkpoint E: seluruh aturan absensi, snapshot kalender, soft delete/restore dan rekap historis teruji.
7. Review desain/responsiveness/accessibility; integration/E2E; CI.
   Checkpoint F: test, build, lint dan skenario penerimaan lulus.
8. Paket deploy VPS/Vercel/Cloudflare, migration/seed, backup/restore/rollback dan runbook.
   Checkpoint G: HTTPS, kamera/lokasi, kedua frontend, service dan storage terverifikasi pada live.

## Dependency dan integrasi
Auth mendasari otorisasi. Employee membutuhkan akun; Attendance menggunakan kelayakan Employee dan Auth. Media memverifikasi otorisasi; Attendance mengaitkan foto READY. Gateway hanya routing/kontrol umum. Kontrak event ownership/retry harus ditetapkan sebelum integrasi, tidak membuat query lintas tabel service.

## Pemeriksaan
Per-task: unit/API/component test yang relevan. Per-checkpoint: build, lint, test terfokus, dan alur manual atau Playwright. Tidak menganggap mock cukup untuk MySQL/MinIO AIStor Free/kamera nyata. TDD untuk aturan bisnis; tidak menulis test yang hanya meniru implementasi UI.
Script build/lint dan unit test scaffold tersedia. Script db:* menguji migration dan constraint MySQL. Harness Vitest/RTL dan Playwright HRD serta test aturan Auth tersedia; domain absensi belum diimplementasikan.

## Risiko dan mitigasi
- MySQL dan MinIO AIStor Free tidak satu transaksi: upload READY, transaksi attendance, outbox, retry dan cleanup orphan.
- JWT tetap berlaku sesudah reset: verifikasi sesi+status dan revoke, uji token lama.
- Kalender hari ini berubah: snapshot per-event, definisi rekap eksplisit dan test.
- Missing attendance historis: history employee dan eligibility, bukan current active saja.
- Browser/camera/geolocation: HTTPS, izin, perangkat mobile nyata; lakukan technical spike awal.
- MediaPipe bukan face recognition/liveness guarantee; pertahankan scope autocapture.
- Pengiriman bersamaan: unique constraints, transaksi/locking, idempotency.
- Live belum bisa dikonfigurasi tanpa akses layanan: siapkan artefak deployment dahulu; minta hanya akses yang dibutuhkan ketika tahap deploy.

## Batas pekerjaan
Git lokal telah diinisialisasi pada dev. Dependency dan migration fondasi Auth sudah diterapkan lokal. Deployment dan perubahan akun eksternal belum dilakukan. Database test terpisah schema, belum instance. Status commit dicatat melalui riwayat Git; push menunggu repository GitHub.
Pengguna telah mengotorisasi commit dan push setiap perubahan yang selesai dan diverifikasi pada branch dev. Pengguna menunda penentuan repository GitHub: pengembangan dan commit lokal tetap berjalan, push menunggu remote. Branch main hanya untuk production.
Rahasia tetap lokal, .env.example tanpa nilai asli, dokumentasi aman di GitHub.

## Cara menjalankan pekerjaan
Task pada todo.md berukuran kecil. Jika implementasi perlu lebih dari sekitar lima file, pecah task sebelum bekerja dan catat dependensi. Checkpoint ditinjau sebelum fase berikutnya. Update spec dahulu bila keputusan berubah.

## Desain seluruh halaman dan kelanjutan proyek
Rancangan seluruh halaman menjadi bagian dari kelanjutan seluruh proyek sesuai plan. [UI/UX](../docs/sdd/frontend-ui-ux.md) dan [design system](../docs/sdd/frontend-design-system.md) menjadi acuan frontend; [alur implementasi](../docs/development/implementation-workflow.md) menjelaskan read order, status awal, proses dan definisi selesai.

Ikuti UX01–UX07 dalam todo sebagai koordinasi lintas layar; dependensi T01–T31 tetap berlaku. Audit status task fondasi yang belum ditutup, susun wireframe lima keluarga layar (akses, Hari ini, capture, daftar HR, detail), lalu lanjutkan vertical slice master/akun → capture/absensi → riwayat/monitoring. Review visual/states dilakukan setiap slice, bukan hanya T28.

Persetujuan arah desain dan kelanjutan implementasi telah diberikan; checkpoint rutin berarti memverifikasi dan mencatat bukti lalu melanjutkan. Jangan membuat gate persetujuan ulang untuk keputusan rutin dalam scope. Perubahan kebutuhan dan akses eksternal yang belum tersedia memerlukan penanganan spesifik.

Definisi selesai lokal: seluruh capability frontend, backend, database/storage dan integrasi sesuai baseline, termasuk E01–E09/H01–H14, API nyata, keamanan/pemulihan, build/lint/test, CI dan runbook/artefak deployment. Artefak live disiapkan sampai akses/rilis tersedia; hasil live tidak diklaim sebelum pengujian nyata. Commit tetap dev; push menunggu remote pengguna.

## Paralelisme dan kelanjutan lintas sesi
Scope tetap seluruh T01–T31: dua frontend, lima service, kontrak/API/Swagger, schema/migration/grants MySQL, AIStor Free, keamanan, tests, CI, deployment dan operasi. Jalur yang independen berjalan paralel; task yang bergantung kontrak/data menunggu provider dan verification terkait.

| Jalur siap | Dapat berjalan bersama | Batas |
| --- | --- | --- |
| Master/provisioning/lifecycle | Backend service, UI sesuai kontrak, test dan runbook | Integrasi T10–T15 mengikuti dependency; shared Auth/Gateway dikoordinasikan |
| Spike kamera/lokasi T18 | Jalur master/akun dan persiapan test/infra | Fondasi T07 terkait diverifikasi dahulu |
| Media T19 | Aturan waktu/libur T16/T17 sesudah T13 siap | Capture T20 terintegrasi setelah T18/T19; check-in T21 menunggu policy/media/capture |
| Riwayat/monitoring | Backend query/authorization, UI daftar/detail, test dan Leaflet | Mengikuti T23–T26; tidak menganggap mock sebagai hasil akhir |
| Testing/CI/deploy config | Setiap vertical slice dan jalur domain | Task rilis tetap menunggu acceptance, akses dan verification live |

Kontrak/schema/migration, shared UI, manifests/lockfile dan operasi Git pada working tree sama memiliki satu pemilik aktif pada satu waktu. Pembagian task/file/port dicatat di [progress](progress.md); ownership diakhiri saat task selesai atau sesi berganti. Paralelisme tidak mengubah batas kepemilikan service atau urutan penerapan migration.

[Alur implementasi](../docs/development/implementation-workflow.md) berlaku bagi semua agen/alat yang mengakses repo ini. Sebelum berhenti/berganti sesi, tulis checkpoint progres, diff belum di-commit, proses/port, verification dan langkah berikut. Agen berikut membaca kondisi lokal dan melanjutkan pekerjaan; tidak memulai ulang proyek.
