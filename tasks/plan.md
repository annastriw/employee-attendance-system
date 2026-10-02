# Rencana implementasi — Attendance Portal dan HR Portal
Status: implementasi fondasi berlangsung; penyederhanaan pelaksanaan disetujui (lihat bagian Penyederhanaan). Task lengkap tetap mengikuti todo.md. Tanggal: 2026-10-01 (Asia/Jakarta).

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
Git lokal telah diinisialisasi pada dev. Dependency dan migration fondasi Auth sudah diterapkan lokal. Repository GitHub public telah dibuat atas pilihan pengguna pada 2026-10-02; deployment belum dilakukan. Database test terpisah schema, belum instance. Status commit/push dicatat melalui riwayat Git dan origin/dev.
Pengguna telah mengotorisasi commit dan push setiap perubahan yang selesai dan diverifikasi pada branch dev. Remote origin ditetapkan ke [annastriw/employee-attendance-system](https://github.com/annastriw/employee-attendance-system); commit terverifikasi dipush ke dev. Deployment tetap tahap terakhir. Branch main hanya untuk production.
Rahasia tetap lokal, .env.example tanpa nilai asli, dokumentasi aman di GitHub.

## Penyederhanaan yang disetujui (revisi 2026-10-01)
Pengguna menyetujui penyederhanaan pelaksanaan dengan syarat struktur proyek tetap: satu monorepo, lima service NestJS (API Gateway, Auth, Employee, Attendance, Media) dengan proses/port berbeda, dan dua frontend React TypeScript (Attendance Portal dan HR Portal). Backend tidak digabung menjadi satu service. MySQL, AIStor Free, dua project Vercel, VPS Ubuntu dan Cloudflare tetap sesuai baseline. UI/UX tetap mengikuti spesifikasi disetujui: modern, elegan, minimalis, netral zinc dengan aksen emerald (revisi 2026-10-01), HeroUI via MCP dan komponen custom, Atomic Design, responsif, teks seperlunya.

- T01–T31 adalah satu backlog utama. UX01–UX07 bukan task kerja terpisah, melainkan pemetaan layar (E01–E09/H01–H14) ke task T10–T31 untuk keterlacakan frontend.
- Dokumentasi diringkas menjadi spesifikasi modul + acceptance terkait; hindari dokumen berulang untuk CRUD kecil. Tulis module spec hanya saat menambah/mengubah perilaku, bukan satu dokumen per endpoint.
- Setiap fitur diselesaikan ujung ke ujung: schema/kontrak → API → UI → test → review → commit, sebelum pindah task.
- Gunakan pola bersama untuk form, daftar, detail dan konfirmasi. Komponen Atomic Design dipisah hanya berdasarkan tanggung jawab atau penggunaan ulang nyata, bukan abstraksi dini.
- Tunda abstraksi generik; gunakan controller/DTO/service dan Prisma sesuai kepemilikan data tiap service.
- Outbox/retry dibatasi pada alur yang membutuhkan konsistensi lintas service (provisioning akun+profil, media READY→attendance). Idempotensi, kompensasi dan pemulihan yang diwajibkan baseline tetap dipenuhi.
- Test terfokus per perubahan; suite lengkap pada checkpoint integrasi. Prioritas: aturan bisnis, otorisasi, revokasi, lokasi wajib, pemulihan.

### Tier test (biaya vs nilai) — disetujui 2026-10-02
Tujuan: mempercepat pengembangan dengan memilih pemeriksaan berdasarkan perubahan dan risiko. Kebijakan ini berlaku untuk task berikutnya; test yang sudah ada tetap dipertahankan.

| Tier | Isi | Kapan dijalankan |
| --- | --- | --- |
| 1. Statis | Typecheck dan lint package/berkas terkait | Setiap perubahan kode/config yang relevan sebelum commit; tidak harus seluruh monorepo. Dokumentasi saja cukup diperiksa isi, tautan dan diff. |
| 2. Unit/komponen terfokus | Jest, kontrak HTTP dengan dependency mock, atau Vitest/RTL untuk modul/komponen terdampak | Saat mengubah logika, API atau komponen; sertakan dependensi/pemakai yang berisiko terdampak. |
| 3. Visual/design (test:ui) | Halaman terdampak pada 320 px dan 1440 px, masing-masing terang/gelap | Hanya saat layout/CSS berubah. Tambahkan 768/1024 px saat breakpoint berubah; seluruh viewport/portal pada checkpoint integrasi. Perubahan shell/token bersama mencakup halaman pemakainya yang relevan. |
| 4. Integrasi/E2E nyata | API terhadap MySQL dan alur browser dengan backend nyata; AIStor bila fitur memakai storage | Setelah fitur ujung ke ujung lengkap, pada checkpoint integrasi, dan sebelum promosi ke main; bukan gate setiap commit. Minimal satu alur nyata per fitur. |

- Loop tiap increment: kode → statis + test terfokus → review → commit. Integrasi/E2E dijalankan setelah fitur lengkap; fitur belum dicentang selesai sebelum bukti nyata lulus.
- Suite lengkap/build monorepo dijalankan pada checkpoint integrasi dan sebelum promosi ke main. Build package terkait dijalankan jika perubahan menyentuh bundling/startup; build dist backend terbaru wajib sebelum E2E.
- Hindari mengulang pemeriksaan yang sudah lulus jika source, dependensi, konfigurasi dan lingkungan terkait tidak berubah. Catat scope dan hasil bukti; perubahan baru, kegagalan atau risiko yang belum terjawab menjadi alasan mengulang/memperluas pemeriksaan.
- Periksa resource_status jika tersedia, atau RAM OS jika alat tidak tersedia. Jalankan suite berat satu per satu dengan Playwright 1 worker. E2E Auth/master dijalankan per spec untuk menghindari 429; kebijakan ini tidak mengubah limit login/refresh Auth.
- Verifikasi migration/schema/constraint/grants tetap wajib ketika schema berubah, termasuk diff migrations→schema exit 0 dan penerapan ke dev/test sesuai runbook.

Bukti kritis tetap wajib: aturan bisnis absensi (late/early/cutoff), otorisasi role, revokasi sesi, unik/konflik data, lokasi wajib, keamanan foto, idempotensi check-in/out/provisioning, pemulihan/kompensasi. Mock membantu unit/komponen, sedangkan penerimaan integrasi memakai MySQL/AIStor nyata sesuai fitur. Pengujian kamera/lokasi perangkat nyata tetap mengikuti acceptance. Jangan menghapus test atau menurunkan acceptance untuk mempercepat loop.

- Gunakan tooling yang ada; tunda tambahan broker/cache/orchestration/build system tanpa kebutuhan nyata.
- Spike kamera/lokasi (T18) dijadwalkan lebih awal secara serial setelah prasyarat T07 siap.

Catatan struktur aktual: packages/contracts dan packages/config belum dibuat; dibuat saat task pertama yang membutuhkannya (kontrak Employee pada T10). packages/ui dan packages/database sudah ada.

## Cara menjalankan pekerjaan
Task pada todo.md berukuran kecil. Jika implementasi perlu lebih dari sekitar lima file, pecah task sebelum bekerja dan catat dependensi. Checkpoint ditinjau sebelum fase berikutnya. Update spec dahulu bila keputusan berubah.

## Desain seluruh halaman dan kelanjutan proyek
Rancangan seluruh halaman menjadi bagian dari kelanjutan seluruh proyek sesuai plan. [UI/UX](../docs/sdd/frontend-ui-ux.md) dan [design system](../docs/sdd/frontend-design-system.md) menjadi acuan frontend; [alur implementasi](../docs/development/implementation-workflow.md) menjelaskan read order, status awal, proses dan definisi selesai.

Ikuti UX01–UX07 dalam todo sebagai koordinasi lintas layar; dependensi T01–T31 tetap berlaku. Audit status task fondasi yang belum ditutup, susun wireframe lima keluarga layar (akses, Hari ini, capture, daftar HR, detail), lalu lanjutkan vertical slice master/akun → capture/absensi → riwayat/monitoring. Review visual/states dilakukan setiap slice, bukan hanya T28.

Persetujuan arah desain dan kelanjutan implementasi telah diberikan; checkpoint rutin berarti memverifikasi dan mencatat bukti lalu melanjutkan. Jangan membuat gate persetujuan ulang untuk keputusan rutin dalam scope. Perubahan kebutuhan dan akses eksternal yang belum tersedia memerlukan penanganan spesifik.

Definisi selesai lokal: seluruh capability frontend, backend, database/storage dan integrasi sesuai baseline, termasuk E01–E09/H01–H14, API nyata, keamanan/pemulihan, build/lint/test, CI dan runbook/artefak deployment. Artefak live disiapkan sampai akses/rilis tersedia; hasil live tidak diklaim sebelum pengujian nyata. Commit dan push tetap dev ke repository pilihan pengguna.

## Pengerjaan serial dan kelanjutan lintas sesi
Scope tetap seluruh T01–T31: dua frontend, lima service, kontrak/API/Swagger, database/storage, keamanan, testing, CI dan deployment. Pengguna menetapkan dua agen bergantian karena keterbatasan sesi; hanya satu agen aktif, tanpa subagen/coding paralel.

Kerjakan satu increment sesuai dependensi: kontrak/schema terkait → API → UI → test/integrasi → review/commit. Pilih task berikut yang siap setelah increment ditutup. Jika terhalang akses, catat kendala lalu kerjakan satu task lain yang siap. Spike kamera/lokasi boleh dijadwalkan lebih awal secara serial setelah fondasi terkait siap.

Sebelum batas sesi, update [progress](progress.md) dan berikan prompt trigger ringkas sesuai [alur implementasi](../docs/development/implementation-workflow.md). Pengguna memilih waktu pindah. Agen berikut memeriksa checkpoint/Git/source/proses dan meneruskan progres tanpa mengulang proyek. Jangan mengarang kuota ketika informasi kapasitas tidak tersedia.
