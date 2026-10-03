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
Per-task: unit test logika berubah, lint/typecheck package terkait dan pemeriksaan manual UI/alur lokal. Sebelum rilis: CI lint/build/unit; setelah deploy: health check dan smoke manual. Tidak perlu suite integrasi penuh atau Playwright rutin.
Script build/lint/unit tersedia. Suite MySQL/AIStor dan Playwright lama tetap disimpan; source/todo terbaru menjadi acuan fitur yang sudah selesai.

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
Revisi terbaru 2026-10-03: coding serta tes lokal di dev, commit/push langsung dev, PR dev ke main untuk rilis. Hanya dua branch. UI/alur dicek manual, unit test logika terdampak; CI rilis cukup lint, build/typecheck dan unit test, tanpa gate integrasi penuh/Playwright. Origin tetap annastriw/employee-attendance-system. CD masih T30; VPS dilanjutkan dari infra production yang sudah disiapkan pengguna. [Workflow](../docs/development/ci-cd-workflow.md).
Rahasia tetap lokal, .env.example tanpa nilai asli, dokumentasi aman di GitHub.

## Penyederhanaan yang disetujui (revisi 2026-10-01)
Pengguna menyetujui penyederhanaan pelaksanaan dengan syarat struktur proyek tetap: satu monorepo, lima service NestJS (API Gateway, Auth, Employee, Attendance, Media) dengan proses/port berbeda, dan dua frontend React TypeScript (Attendance Portal dan HR Portal). Backend tidak digabung menjadi satu service. MySQL, AIStor Free, dua project Vercel, VPS Ubuntu dan Cloudflare tetap sesuai baseline. UI/UX tetap mengikuti spesifikasi disetujui: modern, elegan, minimalis, netral zinc dengan aksen emerald (revisi 2026-10-01), HeroUI via MCP dan komponen custom, Atomic Design, responsif, teks seperlunya.

- T01–T31 adalah satu backlog utama. UX01–UX07 bukan task kerja terpisah, melainkan pemetaan layar (E01–E09/H01–H14) ke task T10–T31 untuk keterlacakan frontend.
- Dokumentasi diringkas menjadi spesifikasi modul + acceptance terkait; hindari dokumen berulang untuk CRUD kecil. Tulis module spec hanya saat menambah/mengubah perilaku, bukan satu dokumen per endpoint.
- Setiap fitur diselesaikan ujung ke ujung: schema/kontrak → API → UI → test → review → commit, sebelum pindah task.
- Gunakan pola bersama untuk form, daftar, detail dan konfirmasi. Komponen Atomic Design dipisah hanya berdasarkan tanggung jawab atau penggunaan ulang nyata, bukan abstraksi dini.
- Tunda abstraksi generik; gunakan controller/DTO/service dan Prisma sesuai kepemilikan data tiap service.
- Outbox/retry dibatasi pada alur yang membutuhkan konsistensi lintas service (provisioning akun+profil, media READY→attendance). Idempotensi, kompensasi dan pemulihan yang diwajibkan baseline tetap dipenuhi.
- Unit test logika berubah; UI/alur manual di lokal. Tidak ada gate integrasi penuh/Playwright rutin. CI PR main hanya lint/build/typecheck/unit .

### Tier test (biaya vs nilai) — disetujui 2026-10-02

Direvisi pengguna 2026-10-03; aturan berikut menggantikan frekuensi otomatis sebelumnya.

| Saat | Pemeriksaan |
| --- | --- |
| Development logika | Unit test terdampak serta lint/typecheck package terkait |
| UI/layout/alur aplikasi | Manual di lokal, termasuk responsivitas dan API nyata yang berubah |
| Schema/migration | Penerapan migration dan grants pada DB lokal; jangan reset data production |
| PR dev → main | Lint, validasi Prisma, build/typecheck dan unit/component tests yang sudah ada |
| Deployment | Build image dengan cache/paralel, migration baru bila ada, health check |
| Setelah deployment | Smoke manual fitur penting atau yang berubah |

- Simpan suite lama; integrasi MySQL/AIStor dan Playwright tidak menjadi gate rutin development/rilis. Jalankan tambahan untuk diagnosis masalah khusus atau atas permintaan pengguna.
- Test baru hanya untuk logika/aturan bisnis yang berubah; jangan membuat test teks/ikon/markup atau harness browser rutin.
- Jangan mengulang seluruh suite yang lulus setiap increment. Dokumentasi saja cukup review isi, tautan dan diff.
- Commit/push satu perubahan logis langsung ke dev; PR dev ke main saat sekumpulan fitur siap live.
- Backup sebelum migration production; health check tidak menggantikan pemeriksaan manual fitur.
- Pertahankan arsitektur lima backend/dua frontend dan aturan data/otorisasi baseline. Penyederhanaan proses tidak mengubah kebutuhan produk.

### Pelaksanaan per putaran — disetujui 2026-10-02

- Satu putaran menyelesaikan perilaku yang dapat digunakan: kontrak/schema yang diperlukan, API, UI, test terkait, acceptance dan dokumentasi ringkas; kemudian satu commit/push. Hindari berhenti setelah setiap komponen kecil.
- Setelah inventaris awal, baca hanya spec/source yang berkaitan dan diff terbaru. Muat ulang konteks umum jika keputusan/dependensi berubah atau ada bukti yang bertentangan.
- Reuse form, daftar, dialog, error dan auth dari T10–T13. Implementasikan desain sesuai spesifikasi; kumpulkan polesan tambahan yang tidak memengaruhi acceptance untuk review UI T28.
- Kumpulkan perjalanan browser ke satu checklist setelah putaran lengkap. Pemeriksaan otomatis bisnis/data tetap mengikuti tier test; jangan menunggu uji manual untuk menemukan kegagalan unit/integrasi yang sudah bisa diperiksa.
- Jalankan hanya service yang diperlukan. T14 memakai MySQL, Auth, Employee, Gateway dan HR; Attendance web hanya ketika memeriksa login/revokasi karyawan. Media/Attendance service dan AIStor dijalankan saat fitur membutuhkannya. Hentikan hanya proses milik agen yang sudah tidak diperlukan; proses pengguna tidak dihentikan tanpa instruksi.
- Pemecahan putaran didasarkan pada perilaku, dependensi dan risiko, bukan jumlah berkas. Putaran yang lebih besar tetap harus dapat ditinjau dan dipulihkan dengan aman.

Pembagian T14 dicatat di [todo](todo.md): putaran A edit profil/email, lalu putaran B lifecycle/history/revokasi. Masing-masing mencakup API, UI, test bisnis/integrasi terkait dan satu checklist browser; T14 selesai setelah keduanya memenuhi acceptance.

## Cara menjalankan pekerjaan
Kerjakan putaran di todo.md secara serial sampai perilaku terkait lengkap. Pecah berdasarkan perilaku/dependensi/risiko yang dapat diverifikasi, bukan jumlah berkas. Checkpoint ditinjau sebelum fase berikutnya. Update spec dahulu bila keputusan berubah.

## Desain seluruh halaman dan kelanjutan proyek
Rancangan seluruh halaman menjadi bagian dari kelanjutan seluruh proyek sesuai plan. [UI/UX](../docs/sdd/frontend-ui-ux.md) dan [design system](../docs/sdd/frontend-design-system.md) menjadi acuan frontend; [alur implementasi](../docs/development/implementation-workflow.md) menjelaskan read order, status awal, proses dan definisi selesai.

Ikuti UX01–UX07 dalam todo sebagai koordinasi lintas layar; dependensi T01–T31 tetap berlaku. Audit status task fondasi yang belum ditutup, susun wireframe lima keluarga layar (akses, Hari ini, capture, daftar HR, detail), lalu lanjutkan vertical slice master/akun → capture/absensi → riwayat/monitoring. Review visual/states dilakukan setiap slice, bukan hanya T28.

Persetujuan arah desain dan kelanjutan implementasi telah diberikan; checkpoint rutin berarti memverifikasi dan mencatat bukti lalu melanjutkan. Jangan membuat gate persetujuan ulang untuk keputusan rutin dalam scope. Perubahan kebutuhan dan akses eksternal yang belum tersedia memerlukan penanganan spesifik.

Definisi selesai lokal: perilaku sesuai baseline, unit test relevan serta alur/UI manual lulus, spec dan acceptance ringkas diperbarui. Commit/push dev; rilis melalui PR dev ke main. Artefak dan hasil live tidak diklaim sebelum deployment nyata.

## Pengerjaan serial dan kelanjutan lintas sesi
Scope tetap seluruh T01–T31: dua frontend, lima service, kontrak/API/Swagger, database/storage, keamanan, testing, CI dan deployment. Pengguna menetapkan dua agen bergantian karena keterbatasan sesi; hanya satu agen aktif, tanpa subagen/coding paralel.

Kerjakan satu increment sesuai dependensi: kontrak/schema → API → UI → unit test terkait dan cek manual → review/commit dev. Tidak perlu harness atau gate tambahan tanpa kebutuhan nyata.

Sebelum batas sesi, update [progress](progress.md) dan berikan prompt trigger ringkas sesuai [alur implementasi](../docs/development/implementation-workflow.md). Pengguna memilih waktu pindah. Agen berikut memeriksa checkpoint/Git/source/proses dan meneruskan progres tanpa mengulang proyek. Jangan mengarang kuota ketika informasi kapasitas tidak tersedia.
