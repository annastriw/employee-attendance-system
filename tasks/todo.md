# Daftar tugas implementasi

Status: implementasi sebagian berjalan; checklist per-task dan subtask menunjukkan bukti yang telah selesai. Path pada task yang belum selesai merupakan target rencana. Checklist induk tidak otomatis selesai hanya karena subtask tertentu sudah tersedia. Task lintas beberapa service dipecah lagi sebelum implementasi agar sekitar 1–5 file per task.

Penyederhanaan disetujui (2026-10-01): T01–T31 adalah satu backlog utama; UX01–UX07 hanyalah pemetaan layar E01–E09/H01–H14 ke task T10–T31 untuk keterlacakan frontend, bukan pekerjaan terpisah. Setiap fitur diselesaikan ujung ke ujung (schema/kontrak → API → UI → test → review → commit) memakai pola bersama; abstraksi generik ditunda. Struktur tetap: 5 service NestJS + 2 frontend React. Detail: [plan](plan.md) bagian Penyederhanaan.

## T01 — Dokumen module SDD dan context
- [ ] Selesai
- Acceptance: Pisahkan scope Auth, Employee, Attendance, Media dan Gateway; dokumentasikan aturan yang disetujui tanpa kehilangan kebutuhan.
- Verification: Review keterlacakan baseline ke module specs.
- Dependencies: —
- Target: docs/sdd/, docs/architecture/

## T02 — Keputusan tooling dan runtime
- [ ] Selesai
- Acceptance: Catat versi kompatibel, ORM, package manager, transport service/outbox, serta runner backend Jest.
- Verification: Cek dokumentasi resmi dan catat ADR; tidak menginstal sebelum keputusan konkret.
- Dependencies: 1
- Target: docs/architecture/

## T03 — Kerangka workspace
- [ ] Selesai
- Acceptance: Workspace mendefinisikan apps/packages dan scripts tanpa rahasia.
- Verification: Validasi konfigurasi workspace.
- Dependencies: 2
- Target: package.json, workspace config, .gitignore, .env.example

## T04 — Kerangka Auth dan Gateway
- [ ] Selesai
- Acceptance: Dua service dapat startup dan memiliki healthcheck.
- Verification: Build dan healthcheck lokal.
- Dependencies: 3
- Target: apps/auth-service/, apps/api-gateway/

## T05 — Kerangka service bisnis
- [ ] Selesai
- Acceptance: Employee, Attendance, Media memiliki bootstrap terpisah dan port unik.
- Verification: Build dan healthcheck ketiga service; pecah per service jika scope >5 file.
- Dependencies: 3
- Target: apps/{employee-service,attendance-service,media-service}/

## T06 — Kerangka frontend dan UI
- [ ] Selesai
- Acceptance: Dua aplikasi React dapat dibuka; shared UI memakai Atomic Design.
- Verification: Build dan smoke browser; pecah scaffold per aplikasi bila perlu.
- Dependencies: 3
- Target: apps/{attendance-web,hr-web}/, packages/ui/

## T07 — Lingkungan data dan test tooling
- [ ] Selesai
- Acceptance: MySQL/MinIO AIStor Free development terpisah dari test; tersedia harness frontend/backend/E2E.
- Verification: Koneksi dev/test dan test contoh yang memverifikasi integrasi tooling.
- Dependencies: 4,5,6
- Target: infra/, konfigurasi test

### Checkpoint setelah T07
- [ ] Test relevan dan build/lint lulus.
- [ ] Alur fase diverifikasi, batasan dicatat dan ditinjau.

## T08 — Login admin backend
- [x] Selesai
- Acceptance: Seed password hash, endpoint login role terpisah, sesi/revokasi, forced password change.
- Verification: Jest/Supertest: login salah role, password salah, sesi lama, restricted session.
- Dependencies: 7
- Target: apps/auth-service/

## T09 — Login admin UI
- [x] Selesai
- Acceptance: Panel HRD login dan ganti password awal hingga dashboard kosong.
- Verification: Component test dan Playwright login/ganti password.
- Dependencies: 8
- Target: apps/hr-web/

## T10 — Master departemen
- [x] Selesai (2026-10-02; bukti di docs/sdd/employee-departments.md)
- Acceptance: HRD create/list/edit/activate/deactivate; data dipakai tidak dihapus.
- Verification: API test dan satu alur HRD nyata.
- Dependencies: 9
- Target: apps/employee-service/, apps/hr-web/

## T11 — Master jabatan
- [x] Selesai (2026-10-02; bukti di docs/sdd/employee-positions.md)
- Acceptance: HRD mengelola jabatan dengan aturan aktif/nonaktif.
- Verification: API/component test serta selector tidak menawarkan data nonaktif.
- Dependencies: 10
- Target: apps/employee-service/, apps/hr-web/

## T12 — Pembuatan akun karyawan
- [x] Selesai (2026-10-02; browser manual desktop/mobile lulus menurut laporan pengguna, bukti backend MySQL pada kontrak)
- Kontrak dan bukti: [employee-provisioning](../docs/sdd/employee-provisioning.md). Spec Playwright ditambahkan; run otomatis ditunda karena RAM host.
- Acceptance: Profil+akun dibuat terkoordinasi; password sementara tampil sekali; NIK/email unik.
- Verification: Integration test konflik unik, kegagalan antarservice, retry dan sanitasi log.
- Dependencies: 11
- Target: apps/{employee-service,auth-service}/, apps/hr-web/

## T13 — Login karyawan
- [x] Selesai
- Acceptance: Panel sendiri, password sementara wajib diganti, sesi role dibatasi.
- Verification: Unit/component dan visual lulus; browser manual langkah 1–5 melalui API nyata lulus menurut pengguna (2026-10-02). Bukti: [alur login karyawan](../docs/sdd/employee-auth-flow.md).
- Dependencies: 12
- Target: apps/auth-service/, apps/attendance-web/

### Checkpoint setelah T13
- [x] Test relevan dan build/lint lulus.
- [x] Alur fase diverifikasi, batasan dicatat dan ditinjau.
- Bukti: T12 dan T13 browser manual pengguna lulus; unit/komponen, integrasi backend T12 dan visual terkait lulus. Suite otomatis browser dan seluruh monorepo tidak diulang karena RAM terbatas; bukti manual tidak diklaim sebagai hasil Playwright.

## T14 — Perubahan dan lifecycle karyawan
- [x] Selesai (2026-10-02; putaran A & B lulus manual pengguna dan tes otomatis; bukti di docs/sdd/employee-lifecycle.md)
- Acceptance: Edit profil/email, nonaktif/arsip/restore; history dan revokasi konsisten.
- Verification: Integration test restore nonaktif dan token lama ditolak.
- Dependencies: 13
- Target: apps/{employee-service,auth-service}/, apps/hr-web/
- [x] Putaran A — edit profil/email: kontrak sinkronisasi Employee–Auth, API dan form HR menggunakan pola yang ada; validasi master, konflik NIK/email termasuk nonaktif/arsip, serta konsistensi dan pemulihan perubahan lintas service. Test terkait dan satu checklist browser sesudah putaran lengkap.
- [x] Putaran B — lifecycle/history/revokasi: aktif/nonaktif/arsip/restore, riwayat perubahan, email/NIK tetap dicadangkan, restore menghasilkan INACTIVE dan aktivasi terpisah; login/token lama ditolak setelah nonaktif/arsip. API, UI, test MySQL/revokasi/pemulihan terkait dan satu checklist browser sesudah putaran lengkap.
- Putaran A & B selesai: implementasi/test terfokus lulus dan pengguna melaporkan checklist browser manual lulus pada 2026-10-02. Checklist/bukti di [employee lifecycle](../docs/sdd/employee-lifecycle.md).
- Bukti tiap putaran dicatat dalam satu module spec T14; detail kontrak ditentukan dari source/baseline sebelum coding. Reset password umum tetap T15.

## T15 — Reset password
- [x] Selesai (2026-10-02; pengujian browser manual langkah 1–10 dan seluruh tes otomatis lulus; bukti di docs/sdd/employee-reset-password.md)
- Acceptance: Reset tampil sekali, wajib ganti, semua sesi lama batal.
- Verification: API/E2E reset lalu login baru; periksa tidak ada secret di log.
- Dependencies: 14
- Target: apps/{auth-service,employee-service,api-gateway,hr-web}/

## T16 — Aturan waktu dan eligibility
- [x] Selesai (2026-10-02; bukti TDD policy & eligibility, MySQL constraints & isolasi di docs/sdd/attendance-policies-eligibility.md)
- Acceptance: Policy WIB dan eligibility historis eksplisit; selesaikan presisi ambang dan kalender campuran.
- Verification: TDD boundary 08.00/17.00/akhir hari dan perubahan employee lifecycle.
- Dependencies: 14
- Target: apps/attendance-service/, docs/sdd/

## T17 — Kalender libur HRD
- [x] Selesai (2026-10-02; bukti spesifikasi, CRUD kalender libur, Gateway proxy, H13 UI, 15 unit/MySQL E2E dan 8 component tests di docs/sdd/attendance-holidays.md)
- Acceptance: CRUD hari ini/mendatang, past ditolak, perubahan dicatat.
- Verification: API/UI test past date, same-day edit dan snapshot event lama.
- Dependencies: 16
- Target: apps/attendance-service/, apps/hr-web/

### Checkpoint setelah T17
- [x] Test relevan dan build/lint lulus.
- [x] Alur fase diverifikasi, batasan dicatat dan ditinjau.

## T18 — Spike kamera dan lokasi
- [x] Selesai
- [x] Prototipe terisolasi, 21 test, build/lint dan smoke model/WASM aktual dengan perangkat sintetis; [bukti/parameter/checklist](../docs/architecture/camera-location-spike.md).
- [x] Uji manual diterima pengguna pada 2026-10-02: semua alur berjalan; detail platform/benchmark tidak diberikan. Threshold awal dipertahankan untuk T20.
- Acceptance: Buktikan MediaPipe, blink/manual fallback, izin lokasi dan kamera pada desktop/mobile HTTPS.
- Verification: Uji perangkat nyata dan catat threshold yang dipilih; belum dianggap fitur lengkap.
- Dependencies: 7
- Target: docs/architecture/, prototipe terisolasi

## T19 — Foto privat backend
- [x] Selesai
- Acceptance: Upload tervalidasi ke MinIO AIStor Free, READY, checksum, pemilik/purpose, akses terotorisasi.
- Verification: Integration test MinIO AIStor Free dan penolakan akses foto pengguna lain.
- Dependencies: 13
- Target: apps/media-service/

## T20 — Capture frontend
- [x] Selesai (2026-10-03; checklist manual diterima berdasarkan konfirmasi pengguna sampai T24)
- Acceptance: Satu wajah, blink, manual fallback, preview/retake, lokasi wajib.
- Verification: Component test error izin dan uji manual mobile/kamera.
- Implementasi/verifikasi teknis 2026-10-02: [capture portal](../docs/sdd/attendance-capture.md), 54 tes terfokus + 8 visual, typecheck/lint/build lulus. Checklist perangkat/API nyata diterima pengguna 2026-10-03; T20 ditutup penuh.
- Dependencies: 18,19
- Target: apps/attendance-web/

## T21 — Check-in ujung ke ujung
- [x] Selesai (2026-10-03; checklist manual diterima berdasarkan konfirmasi pengguna sampai T24)
- Acceptance: Foto+lokasi wajib, waktu server, alasan late, snapshot, idempotency dan unique.
- Verification: TDD/Supertest konkurensi, integrasi MySQL/AIStor; visual browser dan checklist manual per fitur sesuai tier test (E2E otomatis sebelum rilis).
- Implementasi/verifikasi teknis 2026-10-02: [check-in](../docs/sdd/attendance-checkin.md), 14 integrasi nyata + 22 unit Attendance + 6 unit/66 kontrak Gateway + 41 frontend + 8 visual lulus; schema/typecheck/lint/build terkait lulus. Checklist kamera/GPS/API browser nyata diterima pengguna 2026-10-03; T21 ditutup penuh.
- Dependencies: 16,17,20
- Target: apps/attendance-service/, apps/attendance-web/

### Checkpoint setelah T21
- [x] Test relevan dan build/lint lulus (bukti teknis existing pada module specs T20/T21).
- [x] Alur fase diverifikasi, batasan dicatat dan ditinjau (manual pengguna diterima 2026-10-03).

## T22 — Check-out ujung ke ujung
- [x] Selesai (2026-10-03; checklist manual diterima berdasarkan konfirmasi pengguna sampai T24)
- Acceptance: Butuh check-in, alasan early, hari sama/cutoff, off-day tanpa late/early.
- Verification: TDD boundary/hash, integrasi MySQL/AIStor, frontend terfokus; visual dan checklist browser manual sesuai tier test.
- Implementasi/verifikasi teknis 2026-10-02: [checkout](../docs/sdd/attendance-checkout.md), 21 integrasi termasuk tujuh checkout, enam unit policy/hash, tujuh unit Gateway dan 32 frontend lulus. Typecheck/lint/build terkait lulus; visual awal 12 lulus, lalu delapan verifikasi ulang beranda lulus setelah target sentuh disesuaikan menjadi 44 px. Manual kamera/GPS/API browser diterima pengguna 2026-10-03; T22 ditutup penuh.
- Dependencies: 21
- Target: apps/attendance-service/, apps/attendance-web/

## T23 — Soft delete dan restore absensi
- [x] Selesai (2026-10-03; checklist manual diterima berdasarkan konfirmasi pengguna sampai T24)
- Acceptance: Alasan/audit wajib, seluruh hari, tidak bisa absen ulang, restore data asli.
- Verification: Integration test delete/retry/restore/concurrency dan UI HRD.
- Implementasi/verifikasi teknis 2026-10-03: [lifecycle absensi](../docs/sdd/attendance-lifecycle.md), 21 regresi check-in/checkout dan lima skenario T23 terverifikasi dalam run serial; delapan unit Gateway, 28 frontend terkait dan 12 visual lulus. Typecheck/lint/build package terkait lulus. Checklist manual HRD/backend browser diterima pengguna 2026-10-03; T23 ditutup penuh.
- Dependencies: 22
- Target: apps/attendance-service/, apps/hr-web/

## T24 — Riwayat pribadi
- [x] Selesai (2026-10-03; checklist manual diterima berdasarkan konfirmasi pengguna sampai T24)
- Acceptance: Pagination/filter; hanya milik sendiri, deleted label tanpa foto, waktu+alasan terlihat.
- Verification: Otorisasi/integrasi MySQL/AIStor nyata, component test dan visual; alur browser backend nyata memakai checklist manual sesuai tier test.
- Implementasi/verifikasi teknis 2026-10-03: [riwayat pribadi](../docs/sdd/attendance-history.md), 28 integrasi gabungan termasuk dua skenario T24, 13 unit Gateway, 87 frontend dan tujuh tes riwayat ulang setelah penyesuaian urutan bukti lulus. Empat visual Home dan 12 riwayat 320/1440 terang/gelap serta typecheck/lint/build terkait lulus. Foto privat lazy 60 detik, data terhapus tanpa foto dan filter/kembali tersedia. Kendala CORS DELETE HRD diperbaiki pada commit terpisah. Manual T20–T24 diterima pengguna 2026-10-03; T24 ditutup penuh.
- Dependencies: 23
- Target: apps/attendance-service/, apps/attendance-web/

## T25 — Monitoring dan rekap
- [ ] Selesai
- Acceptance: Dashboard dan daftar termasuk missing; historical eligibility benar; deleted dikecualikan.
- Verification: Integration test history, kalender dan gabungan late/early.
- Dependencies: 24
- Target: apps/attendance-service/, apps/hr-web/

## T26 — Detail monitoring Leaflet
- [ ] Selesai
- Acceptance: Dua lokasi, accuracy, waktu, alasan dan foto privat tampil sesuai akses.
- Verification: Browser test detail dan uji peta mobile.
- Dependencies: 25
- Target: apps/hr-web/

### Checkpoint setelah T26
- [ ] Test relevan dan build/lint lulus.
- [ ] Alur fase diverifikasi, batasan dicatat dan ditinjau.

## T27 — Outbox dan pemulihan kegagalan
- [ ] Selesai
- Acceptance: Event dedup/retry, provisioning compensation dan cleanup orphan terdokumentasi serta bekerja.
- Verification: Fault injection service offline, event ulang dan upload orphan.
- Dependencies: 12,14,19,21
- Target: service terkait; pecah per alur

## T28 — Review UI responsif
- [ ] Selesai
- Acceptance: HeroUI+custom, bahasa Indonesia, fokus keyboard, loading/error/empty state dan mobile konsisten.
- Verification: Browser ukuran desktop/tablet/mobile, keyboard dan visual review.
- Dependencies: 26
- Target: kedua frontend; task per halaman

## T29 — Validasi integrasi dan CI
- [ ] Selesai
- Acceptance: Build/lint/test menjalankan skenario penting dengan env test terpisah; pipeline branch dev/main.
- Verification: Run pipeline lokal/CI dan Playwright core journeys.
- Dependencies: 27,28
- Target: konfigurasi CI, test integration/E2E

### Checkpoint setelah T29
- [ ] Test relevan dan build/lint lulus.
- [ ] Alur fase diverifikasi, batasan dicatat dan ditinjau.

## T30 — Artefak deploy dan runbook
- [ ] Selesai
- Acceptance: Satu repo GitHub, dua project Vercel terpisah, backend/MySQL/AIStor VPS Ubuntu, Cloudflare, migration/seed, healthcheck, backup/restore dan rollback siap; topologi mengikuti ADR-003.
- Verification: Review konfigurasi tanpa secret; uji restore backup test.
- Dependencies: 29
- Target: infra/, docs/deployment/

## T31 — Deployment dan verifikasi live
- [ ] Selesai
- Acceptance: DNS/HTTPS/service/storage hidup; akun awal diganti; kedua portal bekerja.
- Verification: Smoke live kamera/lokasi, auth, absensi, monitoring, backup; butuh akses layanan.
- Dependencies: 30
- Target: konfigurasi deployment

### Checkpoint setelah T31
- [ ] Test relevan dan build/lint lulus.
- [ ] Alur fase diverifikasi, batasan dicatat dan ditinjau.
## Subtask lingkungan — AIStor lokal (diminta pengguna)
- [x] Pasang WSL dan Docker Desktop.
- [x] Aktifkan komponen WSL/VirtualMachinePlatform tanpa restart otomatis.
- [x] Siapkan Compose image terkunci, mount lisensi read-only dan volume persisten.
- [x] Buat kredensial lokal, verifikasi Git ignore, validasi Compose config.
- [x] Pengguna restart Windows, Docker engine aktif (dikonfirmasi pengguna).
- [x] Pull image, startup, verifikasi lisensi dan healthcheck (pengujian manual pengguna).
- [x] Buat bucket privat, upload/read, uji akses anonim dan persistensi (pengujian manual pengguna).
Catatan: ini bagian storage dari T07; T07 keseluruhan belum selesai. Status terperinci: docs/deployment/installation-status.md.
## Subtask lingkungan — MySQL lokal (diminta pengguna)
- [x] Compose MySQL 8.4.11, localhost:3307, UTC dan volume persisten.
- [x] Pengguna mengonfirmasi login/query, penyimpanan dan persistensi sesudah restart serta koneksi port Windows.
- [x] Kredensial lokal dipisahkan; template environment aman disediakan.
- [ ] Instance MySQL testing terpisah dan harness testing aplikasi.
- [ ] Akun database dengan hak akses per service.
Catatan: bagian database development dari T07 selesai berdasarkan laporan pengguna; T07 keseluruhan belum selesai. Panduan: docs/deployment/mysql-local.md.

## T07a — Konfigurasi koneksi database lokal
- [x] Konfigurasi Prisma 7 standar, akun migrasi dan kredensial lokal terpisah.
- [x] Schema dev/test/shadow terpisah pada satu instance MySQL lokal.
- [x] Setup lokal berhasil, prisma validate lulus.
- [ ] Migration domain dan verifikasi runtime dilanjutkan pada T07b.
- Batas: T07 keseluruhan belum selesai; instance test khusus dan harness frontend belum tersedia.

## T07b — Fondasi schema Auth dan verifikasi database
- [x] T07b.1: Spec tiga tabel Auth, migration awal dev/test dan client Prisma 7.10.0.
- [x] T07b.2: Hak runtime, verifikasi MySQL nyata, constraint dan rollback pada attendance_test.
- [x] Migration berulang tanpa pending, tidak ada drift, typecheck script lulus.
- [ ] Database module NestJS, seed/login, schema service lain dan outbox dikerjakan berikutnya.
- [ ] Container test khusus belum tersedia; harness HR frontend tersedia pada T09. T07 induk belum selesai.

## T08 — Increment backend Auth
- [x] T08a.1: Package database backend bersama, generate/build dan test konfigurasi koneksi.
- [x] T08a.2: Database module Auth dan healthcheck.
- [x] T08b: Seed HRD idempotent, hash bcrypt dan forced password change.
- [x] T08c: Login per role, JWT/session, validasi dan audit.
- [x] T08d: Refresh, change-password, revocation dan integration test.
- Spec: ../docs/sdd/auth-service.md; integrasi Gateway dan frontend selesai pada T09.

## T09a — Integrasi Auth melalui Gateway
- [x] Route autentikasi tetap, cookie dan JWT diteruskan tanpa penyimpanan Gateway.
- [x] Batas body, timeout, CORS, request ID dan readiness terverifikasi.
- [x] Supertest upstream HTTP nyata serta smoke Auth/MySQL lulus.
- [x] Dokumen menjalankan Gateway tersedia; commit lokal dev.
- Batas: UI HRD, component test dan Playwright dilanjutkan T09b/T09c.

## T09b/T09c — Login HRD frontend dan browser
- [x] HeroUI/Tailwind, client sesi dalam memori, refresh single-flight dan test client.
- [x] Atomic Design: form login, forced password change, ringkasan kosong dan logout.
- [x] 11 unit/component test; build dan lint frontend lulus.
- [x] 2 Playwright journeys dengan Gateway/Auth/MySQL test nyata, desktop/mobile dan keyboard.
- [x] Tidak ada overflow 320/768/1024/1440 px; screenshot ditinjau.
- [x] Panduan lokal dan spesifikasi tersedia; commit lokal dev.
- Spec: ../docs/sdd/hr-auth-flow.md. Runbook: ../docs/deployment/hr-local.md.
- Batas: CRUD/master departemen dimulai T10; belum deploy. MCP HeroUI/DevTools tidak merespons, dokumentasi resmi dan Playwright digunakan.

## T09a — Tema frontend bersama
- [x] Selesai
- Acceptance: Tema modern/elegan/minimalis bersama, shell autentikasi Atomic Design, HR login/password/ringkasan dan landing karyawan konsisten. Halaman berikutnya mengikuti kontrak desain.
- Verification: Build/lint dua frontend, 11 test komponen, 2 E2E auth nyata, 8 pemeriksaan layout/tema pada 320/768/1024/1440 px; MCP HeroUI dan Chrome DevTools.
- Target: packages/ui/, apps/{attendance-web,hr-web}/, docs/sdd/frontend-design-system.md

## T09b — Penyederhanaan frontend monokrom
- Catatan historis: digantikan T09c; jangan gunakan tema monokrom untuk halaman baru.
- [x] Selesai
- Acceptance: Login terpusat tanpa slogan/panel, charcoal, input password dan dropdown akun HeroUI; navigasi mobile buka/tutup; teks seperlunya.
- Verification: Build/lint dua frontend, 11 component tests, 12 browser layout/interaction checks, 2 E2E autentikasi nyata.
- Target: packages/ui/, apps/{attendance-web,hr-web}/, docs/sdd/frontend-design-system.md

## T09c — Redesign visual ala Linear (menggantikan tema monokrom T09b)
- [x] Selesai (persetujuan pengguna 2026-10-02; bukti terakhir T11 di docs/sdd/employee-positions.md)
- Acceptance: Wajib untuk seluruh halaman yang tersedia maupun berikutnya (E01–E09/H01–H14), termasuk state/dialog. Token zinc + satu aksen emerald, mode terang/gelap mengikuti sistem, font Geist self-hosted, ikon Phosphor; radius tombol/field 8 px, panel 12 px. Login HR split-screen (form + panel kemampuan produk) >= 1024 px dan satu kolom di bawahnya; login Attendance satu kolom; workspace HR sidebar ikon, header, tombol akun inisial, empty state berikon. Alur auth, label, fokus keyboard, aria dan pesan tetap.
- Verification: tsc kedua frontend, Vitest auth hr-web, Playwright design (test:ui) terang dan gelap pada 320/768/1024/1440 px, screenshot ditinjau. Checkpoint nyata terpenuhi: E2E Auth dari sesi sebelumnya serta jabatan/departemen desktop/mobile pada T11 (run per spec terpisah).
- Target: packages/ui/, apps/{attendance-web,hr-web}/, docs/sdd/frontend-design-system.md, docs/sdd/frontend-ui-ux.md

## Keterlacakan desain UI/UX dalam implementasi proyek
- [x] Desain seluruh E01–E09/H01–H14 dan alur implementasi ditulis sesuai arahan pengguna.
- Spec: [UI/UX](../docs/sdd/frontend-ui-ux.md), [design system](../docs/sdd/frontend-design-system.md).
- Pelaksanaan: [alur implementasi](../docs/development/implementation-workflow.md).
- UX01–UX07 merupakan koordinasi lintas layar; dependensi task T01–T31 tetap berlaku. Pecah setiap UX task menjadi increment kecil sebelum perubahan kode.

### UX01 — Audit keadaan dan fondasi
- [ ] Selesai
- Acceptance: Audit source/test/runtime, task induk fondasi yang belum ditutup dan detail terbuka; pertahankan T08/T09 yang bekerja; catat task pertama yang dapat dijalankan.
- Verification: Review keterlacakan baseline/spec dan bukti runtime; jangan mencentang hanya karena dokumen/config tersedia.
- Dependencies: Dokumen desain tersedia.
- Target: tasks/, docs/sdd/, konfigurasi terkait jika diperlukan.

### UX02 — Wireframe dan pola UI bersama
- [ ] Selesai
- Acceptance: Lima keluarga layar (akses, Hari ini, capture, daftar HR, detail) memiliki hierarki, states dan layout mobile/desktop yang mengikuti konsep; shared UI dikembangkan sesuai kebutuhan slice.
- Verification: Review wireframe dan screenshot/browser pola yang sudah diimplementasikan, keyboard dan tidak ada overflow; mockup bukan fitur selesai.
- Dependencies: UX01; T06.
- Target: packages/ui/, kedua frontend; pecah per keluarga layar.

### UX03 — Master, akun dan lifecycle
- [x] Selesai (rekonsiliasi 2026-10-03 berdasarkan acceptance task terkait; bukan backlog tambahan)
- Acceptance: E01/E02/E09 dan H01/H06–H12/H14 terintegrasi sesuai T10–T15: master aktif/nonaktif, profil+akun konsisten, password tampil sekali, restore Nonaktif, revokasi.
- Verification: API/MySQL test, component tests dan E2E HR membuat karyawan hingga login/ganti password serta lifecycle/reset.
- Dependencies: UX01/UX02; T10–T15 berurutan.
- Target: Employee/Auth/Gateway, kedua frontend, spec/tests.

### UX04 — Absensi dan capture
- [x] Selesai (rekonsiliasi 2026-10-03 berdasarkan acceptance task terkait; bukan backlog tambahan)
- Acceptance: E03–E06/H13 sesuai T16–T22; satu wajah, blink/manual fallback, lokasi wajib, preview, alasan, waktu resmi dan pengiriman idempotent.
- Verification: Boundary/API tests, browser core journey, izin/gagal/retry, perangkat nyata; threshold/hasil dicatat.
- Dependencies: UX03; T16–T22 sesuai graph.
- Target: Attendance/Media/Gateway, attendance-web, hr-web dan tests/spec.

### UX05 — Riwayat, monitoring dan pemulihan
- [ ] Selesai
- T23/T24 diterima manual 2026-10-03; T25/T26 belum diimplementasikan sehingga pemetaan ini belum ditutup.
- Acceptance: E07/E08/H02–H05 sesuai T23–T26; filter/pagination, foto terotorisasi, Leaflet kedua lokasi, soft delete/restore seluruh hari, deleted bukan missing.
- Verification: API authorization/history, integration/MySQL/AIStor dan browser detail/filter/restore.
- Dependencies: UX04; T23–T26.
- Target: Attendance/Media/Gateway, kedua frontend dan tests/spec.

### UX06 — Review semua halaman dan kualitas
- [ ] Selesai
- Acceptance: Seluruh ID layar/states sesuai spec; pemulihan outbox/integrasi, responsivitas, aksesibilitas, build/lint/test dan CI sesuai T27–T29.
- Verification: Screenshot lima keluarga dan halaman terkait pada viewport sasaran, keyboard/zoom/reduced motion, API nyata core journeys; catat keterbatasan manual secara jujur.
- Dependencies: UX05; T27–T29.
- Target: kedua frontend, service/tests/CI dan docs.

### UX07 — Kesiapan rilis dan live
- [ ] Selesai
- Acceptance: T30 artefak/runbook/backup/rollback siap; T31 live hanya setelah akses layanan dan tahap rilis pengguna tersedia.
- Verification: Review konfigurasi aman, restore backup test; kemudian smoke live DNS/HTTPS/kamera/lokasi/auth/absensi/monitoring saat tersedia.
- Dependencies: UX06; T30–T31.
- Target: infra/, docs/deployment/, konfigurasi layanan sesuai akses.

## Koordinasi seluruh proyek dan checkpoint
- [x] Panduan kelanjutan netral seluruh T01–T31: dua agen bergantian secara serial, satu aktif, tanpa subagen/paralel; checkpoint dan trigger sebelum batas sesi.
- [x] [Checkpoint bersama](progress.md) disediakan; setiap sesi memperbarui task aktif, scope file, proses/port, bukti dan langkah berikut.
- Backlog utama tetap T01–T31. UX01–UX07 hanya checklist layar/UX, bukan instruksi bekerja pada frontend saja.
- Kerjakan satu task/increment serial sesuai dependensi. Completion tetap membutuhkan acceptance/verification; sebelum sesi berganti update progress dan berikan trigger singkat.

## Penerimaan manual sampai T24 — 2026-10-03

Penguji: pengguna. Konfirmasi: seluruh pengujian manual sampai T24 aman. T20–T24 dan checkpoint T21 ditutup berdasarkan laporan pengguna, dengan bukti teknis existing tetap terpisah. Tidak menjalankan ulang test aplikasi pada perubahan dokumentasi ini, tidak mengarang perangkat/browser, benchmark atau hasil Playwright baru.

- [x] T08/T09/T13: login terpisah HRD/karyawan, ganti password awal, sesi/reload/logout dan pembatasan role.
- [x] T10–T12: master departemen/jabatan, aktif/nonaktif, profil+akun karyawan, validasi unik dan password sementara sekali tampil.
- [x] T14/T15: edit profil/email, nonaktif/arsip/restore menjadi nonaktif, aktivasi terpisah, reset password dan revokasi sesi lama.
- [x] T16/T17: jam WIB, aturan 08.00–17.00 Senin–Jumat, kalender libur, eligibility dan snapshot historis sesuai bukti task.
- [x] T18–T20: satu wajah, kedip/manual, preview/retake, kamera/lokasi wajib, lokasi kedaluwarsa, foto privat dan pembatalan/izin/retry.
- [x] T21: check-in foto+lokasi, alasan terlambat, waktu resmi server, anti-duplikasi dan pemulihan koneksi.
- [x] T22: checkout memerlukan check-in, foto/lokasi baru, alasan pulang awal, batas tanggal sama dan anti-duplikasi.
- [x] T23: hapus satu hari dengan alasan/audit, konfirmasi/batal/konflik, tidak membuka absen ulang, restore bukti asli.
- [x] T24: riwayat milik sendiri, filter/pagination/kembali, kedua waktu/lokasi/alasan, foto privat 60 detik, terhapus tanpa foto.
- [x] Tampilan halaman tersedia: mobile/desktop, terang/gelap, keyboard, loading/error/kosong dan sesi berakhir sesuai checklist task.

T01–T07 dan UX01/UX02 masih membutuhkan rekonsiliasi acceptance fondasi; konfirmasi manual fitur tidak menggantikan audit spesifikasi/tooling/isolation testing. MySQL test sekarang terpisah schema pada instance lokal yang sama; pemisahan instance/volume untuk lingkungan rilis tetap perlu diverifikasi. T25–T31 belum selesai: monitoring/rekap, detail Leaflet, recovery, review UI menyeluruh, CI/regresi, artefak deploy dan verifikasi live. Tidak ada feature check baru yang wajib diulang pengguna sampai T24; checklist tahap selanjutnya dipakai setelah implementasi tersedia.
