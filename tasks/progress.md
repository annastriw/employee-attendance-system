# Progres bersama dan titik lanjut

Dokumen ini digunakan semua agen/alat pada repo lokal yang sama. Update saat mulai/selesai task, sebelum sesi berganti atau kapasitas sesi habis. Status completion tetap di [todo](todo.md); dependency di [plan](plan.md); prosedur pada [alur implementasi](../docs/development/implementation-workflow.md).

## Titik lanjut aktif — secret aplikasi 5A diterima, environment/Compose 5B (2026-10-04)

- Output VPS pengguna: MySQL 8.4.11 healthy, AIStor running, loopback 3307/9000/9001, network attendance-prod-backend. RAM available 2 GiB, disk available 46 GB, swap terpakai 540 MiB. attendance_prod nol tabel.
- Nginx saat ini aktif pada 80/443; konfigurasi/domain aktual perlu diperiksa sebelum perubahan. Port backend 3000–3004 tidak tampil pada hasil listener.
- Runbook ditambah tahap 2A: membuat file kredensial privat tanpa overwrite, akun attendance_migrator dengan grant hanya attendance_prod, lalu login/SHOW GRANTS. Pengguna menjalankan manual; hasil diterima berdasarkan laporan pengguna.
- Pengguna menyatakan tahap 2A lancar semua; akun/login migrator diterima berdasarkan laporan tersebut. Tidak mencatat secret atau mengklaim verifikasi VPS oleh agen.
- Output tahap 2B diterima: source pinned ffe136562717f4944051e51061f56bec015ff42c tersedia dengan 10 migration. Belum migration/deployment. Cocokkan migration dengan rilis main sebelum menerapkannya; jangan memakai script setup dev production.
- Pengguna menyatakan tahap 2C lancar semua; build tooling/validasi schema diterima berdasarkan laporan pengguna. Image hanya tooling Prisma, config tanpa shadow/local env, source migration dimount read-only. Default help; tidak otomatis migrate. Belum migration/database/backend live.
- Tahap 3A PR manual dev ke main, tunggu CI result, kirim URL/hasil sebelum merge. Main remote diperiksa masih 39d7795, daftar PR terbuka dev ke main kosong. Agen tidak membuat/merge PR atau menjalankan deployment.
- Pengguna membuat PR #1 Release: deployment production pertama. Run 37193226711 (6a3bea2) sukses, tetapi run terbaru 37193497682 (9409c24) gagal pada App.test.tsx: heading beranda muncul sebelum effect menulis hash. Branch policy/lint/build lulus; Quality/CI result gagal karena satu assertion unit. Jangan menganggap run sebelumnya mengizinkan merge head terbaru.
- Increment aktif apps/attendance-web/src/App.test.tsx: menunggu hash pada kedua transisi restore-session dengan waitFor, tanpa sleep tetap atau perubahan aplikasi. Verifikasi file fokus: 8 unit lulus, ESLint file lulus; versi sebelum fix juga lulus lokal sehingga kegagalan timing terbukti dari log CI. Tidak menjalankan browser/integrasi. Setelah push, tunggu CI PR terbaru sebelum tutorial merge; agen tidak merge.
- Run CI 37193755926 setelah fix lulus semua. Pengguna merge PR #1; main 1c27c9062ac04ee4213b19225e8a70e159aca3cc. Publish image run 37193965079 sukses untuk kelima backend. GitHub/API terverifikasi, diff prisma ffe1365 ke origin/main kosong. Belum deploy VPS.
- Increment aktif dokumentasi tahap 4A: clone source main pinned, backup privat attendance_prod, migrate deploy memakai image tooling dan akun migrator, SELECT hasil 10 migration. Menunggu pengguna; belum mengklaim schema diterapkan. Tidak menjalankan DB/VPS command oleh agen atau mengulang suite aplikasi. Berikut 4B runtime grants.
- Output 4A diterima: backup tersimpan, all migrations successfully applied, 24 tabel, semua 10 migration selesai=1. Schema production berhasil menurut output pengguna.
- Increment aktif dokumentasi 4B: file empat password privat/no overwrite, akun attendance_auth/employee/attendance/media, grants tabel sesuai scripts/database/setup-local.mjs, uji login/SELECT kosong. Tidak ada akun Gateway/DDL/global grants. Menunggu output pengguna; partial failure harus direkonsiliasi tanpa regenerate secret. Agen tidak mengakses VPS. Berikut environment/Compose backend.
- Output pengguna 4B diterima: empat akun/grants dibuat, empat login/SELECT tabel milik service PASS. Backend belum dijalankan.
- Increment aktif dokumentasi 5A: application.env privat/no overwrite, JWT 64 random bytes, provisioning/media/credential key masing-masing 32 bytes, INTERNAL_SERVICE_SECRET sama dengan provisioning secret. Meminta hanya permission/nama file untuk memastikan kredensial Media storage tersedia; tidak meminta nilai secret. Selanjutnya env/Compose, tanpa rebuild image atau memakai akun root runtime.
- Output 5A diterima: application.env 507 bytes dan database-runtime.env 339 bytes mode 600; aistor/media-storage/migrator/mysql-root-password tersedia. Nilai secret tidak diterima/disimpan.
- Increment aktif 5B: scripts/deployment/prepare-backend-env.py + unit, infra/compose.backend.yml, CI menambah unit Python fokus. Env per-service privat/no overwrite, image tetap main1c27c90; Linux host network/bind loopback sesuai guard aplikasi dan infra existing, total batas backend1472MiB. ADR-003/runbook diperbarui. Menunggu config --quiet VPS, belum pull/up/backend live. Tidak mengubah service runtime maupun infra/VPS oleh agen.
- Atas permintaan pengguna, ruleset GitHub main-production (24451981) diaktifkan: hanya refs/heads/main, PR wajib, CI result app GitHub Actions 15368 wajib, blok deletion/force push, bypass kosong, approval 0, merge commit, strict up-to-date false. Payload infra/github/main-ruleset.json. Main/dev effective rules diperiksa melalui API; dev tidak dibatasi. Tidak mengubah default branch/rilis/VPS.
- Verifikasi: Prisma validate config baru lulus lokal dengan URL dummy; Docker daemon lokal tidak tersedia sehingga build image belum diuji agen. Tidak ada unit bisnis baru karena hanya konfigurasi/tooling; tidak menjalankan suite aplikasi.
- Verifikasi increment dokumentasi: Bash -n untuk snippet tutorial, review SQL/grant/quoting, 51 tautan lokal dan diff lulus. Tidak ada perubahan VPS oleh agen, deployment, rilis main atau suite aplikasi baru.

## Riwayat — manual T25/T26 diterima, T30 tutorial

- Pengguna menyatakan: monitoring dan detail absensi sudah oke (2026-10-03). Acceptance manual T25/T26 dicatat/diterima; tidak mengarang perangkat/browser, tidak menjalankan ulang test dan tidak menerima recovery/live dari scope ini.
- T30 dilanjutkan manual oleh pengguna, satu tahap per giliran. Runbook docs/deployment/vps-production-manual.md tahap 1 hanya inventaris Compose/resource/port/network dan jumlah tabel attendance_prod, tanpa membuka secret atau mengubah VPS.
- Menunggu output tahap 1 sebelum membuat migration/akun runtime/backend Compose atau menentukan langkah lanjut. Jangan menggunakan setup demo lama sebagai bukti production.
- Kode/workflow terbaru tetap dev; main masih dasar rilis pertama. Belum promosi/merge main, publish image atau deploy VPS. Unit/integrasi hanya sesuai workflow terbaru, UI manual pengguna.
- Verifikasi increment dokumentasi: review isi/command read-only/SQL SELECT, tautan lokal dan diff. Tidak ada suite aplikasi baru yang dijalankan atau perubahan proses/port/VPS.

## Aturan aktif terbaru — unit wajib dan manual acceptance pengguna

- Coding/commit/push langsung dev; main hanya melalui PR rilis pengguna. Lokal/remote tetap dev dan main, source terbaru di dev; tidak mempromosikan bootstrap main atau mengubah VPS pada increment dokumentasi ini.
- Unit test logika berubah wajib. Integrasi cepat jika sambungan nyata perlu dibuktikan: satu service/file/skenario dengan layanan test lokal, bukan suite penuh. UI/UX dan alur lokal manual oleh pengguna; checkbox baru dicentang setelah pengguna menyatakan oke untuk scope terkait.
- README dan docs/README merangkum alur. docs/testing/workflow.md menjadi satu acuan; spec/runbook lama diberi rujukan agar hasil/command historis tidak dianggap gate baru.
- Script test/test:unit hanya unit terisolasi (Node/Jest/Vitest/RTL). CI PR main memakai test:unit sekali; publish main cached/paralel tidak mengulang suite. Integrasi perlu dilakukan terfokus sebelum rilis; pengiriman ke VPS belum disambungkan.
- Bukti lama dan checkbox yang sudah diterima tetap disimpan. Increment ini tidak mencentang penerimaan UI/live baru, tidak menjalankan Playwright/integrasi atau mengulang suite aplikasi.
- Verifikasi perubahan lulus: 4 unit kebijakan branch, Node syntax check, actionlint/YAML, kelima config Jest tidak memilih E2E, script unit-only, 253 tautan file dokumentasi dan diff. Suite aplikasi penuh tidak diulang. Scope runtime aplikasi/dependency tidak berubah.
- Titik lanjut VPS tetap seperti catatan di bawah: /opt/attendance, MySQL production + AIStor/bucket/akun Media. Setup ditunda atas instruksi pengguna; berikut T30 backend/deploy/domain/TLS setelah pengguna melanjutkan, tanpa reset.

## Titik lanjut VPS dan riwayat keputusan — 2026-10-03

- Pengguna menggantikan flow feature/dev/main dengan hanya dev dan main. Coding/tes lokal dan commit/push langsung dev, PR dev ke main saat siap live. Tidak ada dev online.
- Development: unit test logika berubah, lint/typecheck terkait, UI/responsivitas/alur aplikasi dicek manual. Tidak ada Playwright atau suite integrasi penuh wajib setiap fitur/deploy. Test lama dipertahankan untuk diagnosis opsional. Migration/grants lokal diperiksa saat schema berubah.
- CI sekarang hanya PR main dari dev repository sendiri: branch policy, lint/Prisma/build/typecheck/unit tests, CI result. Workflow backend-images.yml pada main membangun/publish lima image cached/paralel ke GHCR, tanpa mengulang unit test. Publish baru dikonfigurasi, belum dieksekusi; pengiriman ke VPS belum diimplementasikan.
- Commit image ad58ec5, fix test 7731142 dan paralelisasi 9e13517 diintegrasikan fast-forward ke dev; tidak ada commit hilang. Main bootstrap memakai commit dokumentasi awal 39d7795 untuk dasar PR rilis pertama tanpa mengaktifkan deployment. Branch codex/t30-production-images boleh dihapus hanya setelah ancestry dan push dev/main terverifikasi. Git lokal/remote aktual adalah bukti status, bukan snapshot lama di bawah.
- Verifikasi increment: 4 unit test branch policy dan Node syntax check lulus; actionlint 1.7.12, parsing YAML/rantai job dan tautan lokal lulus; diff diperiksa sebelum commit. Suite aplikasi/integrasi/Playwright tidak diulang karena logika runtime tidak berubah.
- VPS terakhir menurut output pengguna: /opt/attendance, secrets/licence privat, compose.infra.yml dengan attendance-prod-mysql-1 (attendance_prod, MySQL 8.4.11, healthy, loopback 3307) dan attendance-prod-aistor-1 (health/Console 200, loopback 9000/9001). Bucket privat dan akun Media terbatas: upload/download/delete lulus, akses di luar prefix/admin ditolak. UFW aktif, publik hanya 22/80/443. UKG lama dihapus pengguna; nginx host sebelumnya dihentikan. Lisensi/secret tidak dicatat di Git.
- Status migration/schema/grants production backend setelah reset belum dibuktikan; jangan mengasumsikan setup demo lama berlaku pada attendance_prod. Tidak ada backend/frontend absensi live yang telah diverifikasi.
- Setup VPS ditunda atas instruksi pengguna, dilanjutkan dari titik ini. Jangan reset/ulang bootstrap. Berikut T30: periksa konfigurasi repo/VPS aktual, siapkan backend Compose/GHCR/deploy health/rollback dan domain/TLS; Vercel main untuk dua portal. Aktivasi CD/rilis production belum dilakukan.
- Tidak ada proses/port/VPS diubah oleh increment ini. Tooling lokal untracked tetap dipertahankan. Riwayat kebijakan/suite di bawah adalah bukti historis, bukan aturan terbaru.
## Snapshot historis (aturan digantikan keputusan aktif di atas)

- Tanggal: 2026-10-03 (Asia/Jakarta), setelah increment kebijakan CI/CD T30. HEAD diverifikasi dengan `git log`; jangan anggap hash di sini sebagai HEAD.
- Tahap: fitur T08–T29 selesai dan diverifikasi; Checkpoint setelah T29 terpenuhi. Increment implementasi berikut T30 Artefak deploy dan runbook. Fondasi T01–T07/UX01–UX02 masih perlu rekonsiliasi status lama dan isolasi test; T30–T31 tetap belum selesai. T09c tetap menjadi acuan tema.
- Commit sesi ini pada dev (lama ke baru): 93488ae, f423e47, aa34d48, 1b7b05d, e4a6782, 83537f1, 112d7fa, a485480 (lihat git log), lalu:
  - c2f98fe docs: switch frontend theme to Linear-style zinc + emerald, Geist, Phosphor, light/dark
  - 36a24e4 feat(ui): Linear-style redesign with zinc + emerald, Geist, Phosphor and light/dark
  - f1ae4ac chore(db): add least-privilege employee runtime account for T10
  - fc662d0 feat(employee): department master API with admin guard, audit and MySQL e2e (T10)
  - 9790dd3 feat(gateway): route department API to Employee Service with path allowlist (T10)
  - bb3c6af feat(hr-web): H11 department list, form and status actions on real API (T10)
  - 20b53e0 fix(auth): give /auth/me its own rate limit for per-request service verification
  - d9738b1 test(hr-web): real-API department journey with Employee Service in the E2E stack
- Commit T13 pada dev: a51ddc2 (Auth client employee), 51bb3cb (HeroUI/test setup), 56f6a2a (E01), c5a8a2d (E02/home/guard dan tes alur), eb931ba (tes visual). Semua dipush ke origin/dev; baca git log untuk HEAD.
- Commit T11: 85143ce (schema/migration/grants), 73293bc (Employee API + unit/MySQL), c4da4dd (Gateway allowlist/kontrak), 49e4eb7 (filter aktif untuk penugasan), 2f46086 (H12/shared UI/selector/polesan H11), fbc034a (HRD nyata + assertion refetch). Penutupan T11: 0d33caf. Persetujuan T09c: b31ccc5. Kebijakan testing cepat: 7cd397f; baca git log sebagai sumber HEAD.
- Commit T14: a39ecb1 (Putaran A: edit profil dan email), d92f8d9 (Putaran B: lifecycle transitions, tests, dan H08 UI).
- Commit T15: ee2f76d (reset password karyawan, tests, dan H08 UI). Manual browser langkah 1–10 lulus penuh.
- Commit T16: ffae59f (work policy thresholds, eligibility engine, dan integrasi MySQL).
- Commit T25: 6665dfe (monitoring dan rekap harian HRD, API Gateway proxy, H02 UI).
- Commit T26: b12fcf3 (Leaflet map dan foto privat HRD).
- Commit T27: e504540 (outbox deduplication, retry, dan orphan cleanup worker).
- Commit T28: 073f44a (review UI responsif, touch targets, aksesibilitas, dan polesan state).
- Branch: dev, tracking origin/dev. Repository public [annastriw/employee-attendance-system](https://github.com/annastriw/employee-attendance-system) dipilih pengguna pada 2026-10-02. Push awal terverifikasi: lokal dan remote dev sama pada 7cd397f. Visibilitas PUBLIC diverifikasi melalui GitHub setelah instruksi pengguna; commit berikut dipush setelah verifikasi, deployment tetap tahap terakhir.
- Database lokal (Docker MySQL 127.0.0.1:3307): migration sampai `20261003020000_attendance_checkin` DITERAPKAN ke attendance_dev dan attendance_test. Grants Attendance dan Media dev/test diterapkan; kredensial runtime baru tersimpan dalam .env.database/.env.media ignored.
- Host memory sering CRITICAL (1-2 GB). Jalankan suite berat satu per satu; Playwright 1 worker terbukti stabil.
- Pemeriksaan handoff 2026-10-02: container Docker MySQL 127.0.0.1:3307 dan AIStor 127.0.0.1:9000-9001 aktif. Port proyek: MySQL 3307, Gateway 3000, Auth 3001, Employee 3002, Attendance 3003, Media 3004, Attendance Web 5173, HR Web 5174.

## Satu pekerjaan aktif

| Task/subtask | Pemilik/sesi | Scope file | Dependensi | Proses/port | Status |
| --- | --- | --- | --- | --- | --- |
| T30 — tutorial manual VPS tahap 2A | Sesi ini (serial) | runbook VPS, progress/todo | Tahap 1: MySQL/AIStor/network tersedia, DB nol tabel | Tidak mengubah VPS/proses/port | Menunggu output pembuatan/login migrator sebelum migration |

Isi satu baris saat mulai increment. Hanya satu agen aktif dan satu task/increment berjalan. Sebelum pindah, catat diff, proses/port dan langkah berikut; agen penerus memeriksa Git/source terlebih dahulu.

## Increment T30 — build image backend (2026-10-03)

- Branch aktif: `codex/t30-production-images`, dibuat dari `dev` pada HEAD `948c73e`.
- Implementasi: Dockerfile multi-stage untuk lima service, `.dockerignore` yang mengecualikan secret/data lokal, file `dist` untuk paket runtime, dan konfigurasi `HOST` agar container mendengarkan pada interface container (default lokal tetap loopback). CI membangun kelima image paralel tanpa publish; integrasi menunggu gate build image. Runbook CI/CD diperbarui.
- Verifikasi lokal: Prisma client generate serta build database dan kelima backend lulus; enam `package.json`, YAML workflow valid diparse, semua sumber `COPY` di Dockerfile ada, dan `git diff --check` lulus. Test tidak dijalankan manual.
- Commit/push: `ad58ec5` (image gate) dan `7731142` (sinkronisasi test) pada `codex/t30-production-images`.
- Run CI [37133223219](https://github.com/annastriw/employee-attendance-system/actions/runs/37133223219): branch policy, quality penuh, dan kelima build image (API Gateway, Auth, Employee, Attendance, Media) lulus. Integration gagal pada prasyarat secret CI AIStor yang belum tersedia; visual dilewati karena dependency itu. Ini bukan kegagalan image build.
- Pengguna meminta percepatan setelah melihat durasi serial sekitar 12 menit. Matriks image kini diubah dari `max-parallel: 1` menjadi `5` karena kelima build independen di runner GitHub standar dan repo public. Perubahan ini menargetkan waktu tunggu sekitar durasi build terlama, dengan tambahan concurrent runners.
- Batas verifikasi: Docker build tidak dapat dijalankan lokal karena daemon Windows tidak aktif/tidak dapat diakses. Pemanggilan `pnpm` terhalang izin lock global Corepack, sehingga `pnpm deploy --legacy` menunggu validasi CI. Integrasi GitHub tetap memerlukan secret lisensi khusus CI `AISTOR_CI_LICENSE`.
- Berkas lokal `.agents/`, `.claude/`, `.kiro/`, `.windsurf/`, `skills-lock.json` tidak termasuk scope dan tidak boleh di-stage. Tidak ada VPS/service/port diubah.
- Berikutnya: commit/push perubahan concurrency dan pantau CI. Setelah itu lanjutkan Compose production, publish GHCR, deployment dan runbook sebagai increment T30 berikutnya. Jangan promosi ke `main` atau deploy sampai seluruh acceptance/rilis disetujui.

## Perubahan yang belum di-commit

Baca git status/diff sebagai sumber fakta. Folder .agents/, .claude/, .kiro/, .windsurf/ dan skills-lock.json adalah berkas lokal; jangan di-stage, dihapus atau diubah tanpa scope jelas. Rahasia dan data pribadi tetap ignored.

## Checkpoint kebijakan CI/CD T30 — 2026-10-03

- Keputusan terbaru: fitur/perbaikan → PR dev → PR dev repository sendiri ke main; hanya main untuk production awal 5 karyawan dan 1 HR. Tidak ada deployment dev/preview. Acuan: [workflow CI/CD](../docs/development/ci-cd-workflow.md).
- Implementasi: gate sumber/tujuan PR, CI push semua branch, hasil agregat wajib `CI result`, job berat serial, Prisma generation sebelum typecheck/build, AIStor Free Compose berlisensi khusus CI dan migration disposable dev/test. Instruksi agen, baseline, ADR, plan, backlog dan template PR diselaraskan.
- Verifikasi increment: 13 test kebijakan branch lulus; Node syntax check lulus; actionlint 1.7.12 tanpa temuan; parsing YAML/rantai gate lulus; tautan dokumen lokal valid; `git diff --check` lulus. Suite aplikasi/MySQL/AIStor dan Actions terbaru belum diklaim lulus dari pemeriksaan ini.
- Pemeriksaan read-only GitHub: API daftar repository Actions secrets dan ruleset sama-sama kosong. `AISTOR_CI_LICENSE` belum tersedia; job integrasi akan gagal eksplisit sampai lisensi CI valid dikonfigurasi. API protection menyatakan dev tidak dilindungi dan main belum ditemukan. Bootstrap main pada tahap rilis, lalu aktifkan required PR/`CI result`; push langsung belum diblokir oleh pengaturan repository.
- Increment transisi ini diselesaikan pada dev memakai otorisasi commit/push sebelumnya; development berikut menggunakan branch fitur. Commit/push diverifikasi melalui Git dan remote, bukan hash yang disalin ke dokumen.
- CD belum diimplementasikan atau aktif. Tidak ada perubahan VPS, database, container, DNS maupun Vercel. Lanjut T30 dengan artefak lima backend, deployment production berurutan, backup/restore/rollback serta verifikasi kapasitas; jangan menutup T30/T31 hanya dari setup tutorial sebelumnya.

## Checkpoint T29 — 2026-10-03 (riwayat sebelum revisi CI/CD)

- Implementasi: [validasi integrasi dan CI](../docs/sdd/integration-validation-ci.md).
  1. **Konfigurasi Otomasi CI**: Workflow GitHub Actions (`.github/workflows/ci.yml`) dikonfigurasi untuk branch `dev` dan `main` (push dan PR) dengan tiga job terisolasi: `quality` (statis, lint, typecheck, build, unit test), `integration` (layanan kontainer MySQL 8.4.11 di port 3307 dan MinIO AIStor di port 9000/9001), serta `visual-e2e` (Playwright chromium headless).
  2. **Isolasi Database & Storage Testing**: Skrip otomasi `scripts/ci/setup-ci-environment.mjs` menginisialisasi database `attendance_dev`, `attendance_test`, `attendance_shadow`, akun runtime least-privilege, hak akses tabel per-service (`pnpm run ci:grants`), dan pembuatan bucket privat (`attendance-photos`, `attendance-photos-test`).
  3. **Verifikasi Constraint & Hak Akses**: `pnpm run db:verify` memvalidasi koneksi Prisma, zona waktu UTC (+00:00), constraint unik email/token (termasuk reservasi email akun arsip), foreign keys sesi, rollback transaksi, serta pencegahan akses runtime terhadap tabel migrasi atau penghapusan audit trail.
  4. **Perbaikan Hermeticity Test**: Penyempurnaan `policy-database.e2e-spec.ts` untuk membersihkan tanggal target sebelum evaluasi `REGULAR_WORKDAY`, serta penyesuaian Playwright channel (`process.env.CI ? undefined : "chrome"`) agar kompatibel lintas OS (Windows lokal dan Linux runner).
  5. **Verifikasi Rantai Quality Gate**:
     - `pnpm run lint`: oxlint pada 5 service NestJS dan eslint pada 2 frontend React lulus 100% (0 error, 0 warning).
     - `pnpm run db:validate` & `pnpm run db:typecheck`: Skema Prisma dan TypeScript database script lulus 100%.
     - `pnpm run build`: Seluruh paket dan aplikasi terkompilasi exit code 0.
     - `pnpm run test`: 344 unit/komponen test lintas seluruh monorepo lulus 100%.
     - `test:e2e` backend: 209 integration test lulus 100% terhadap MySQL dan AIStor (Auth 14, Employee 35, Media 20, Attendance 64, Gateway 76).
     - `test:ui` Playwright: 24 layout test (320/1440 px terang/gelap) lulus 100%.
- Langkah berikut: T30 Artefak deploy dan runbook (konfigurasi VPS Ubuntu, Vercel, Cloudflare, backup/restore dan rollback).

## Checkpoint T28 — 2026-10-03

- Implementasi: [review UI responsif](../docs/sdd/ui-responsive-review.md).
  1. **Audit & Desain Responsif**: Audit lengkap pada 5 keluarga layar (Akses E01/E02/H01, Tindakan & Capture E03–E06, Riwayat & Monitoring E07/E08/H02–H05, Direktori & Master H06–H13, Akun & Konfirmasi E09/H10/H14) memverifikasi konsistensi tema Linear (zinc + emerald), font Geist, ikon Phosphor, dan 100% Bahasa Indonesia.
  2. **Touch Targets & Aksesibilitas**: Standardisasi target sentuh interaktif minimum 44x44 px (`min-height: 2.75rem`) pada seluruh tombol aksi utama (`.primary-button`), tombol tambah (`.list-add`), tombol pager (`.list-pager-buttons .button`, `.pager-btn`), tombol pemicu menu akun (`.account-trigger`), toggle menu mobile (`.mobile-menu-toggle`), tombol dialog footer (`.dialog-footer .button`), serta tombol aksi baris mobile (`.row-actions .button`). Penegasan fokus terlihat via `focus-visible` (`outline: 2px solid var(--focus); outline-offset: 2px`) pada seluruh kontrol form dan kartu metrik interaktif.
  3. **Table & Evidence Responsiveness**: Penambahan gaya `.table-responsive` (`overflow-x: auto`) dan `.portal-table` (`min-width: 36rem`) pada tabel monitoring kehadiran H02; penyesuaian `.attendance-evidence-grid` (`minmax(min(100%, 18rem), 1fr)` dan 1-kolom pada ponsel) memastikan 0 overflow horizontal pada viewport terkecil 320 px (`scrollWidth <= innerWidth`).
  4. **Code Splitting & Optimasi Bundel**: Konfigurasi `manualChunks` di `apps/hr-web/vite.config.ts` memecah `leaflet`, `@heroui/react`, dan `@phosphor-icons/react` ke dalam chunk terpisah (seluruh chunk < 400 kB, bebas warning Vite).
  5. **Verifikasi Suite**: 87 tes unit/komponen di `attendance-web` dan 78 tes di `hr-web` lulus 100%. Linting (`eslint .`) 0 error, build production kedua portal lulus, serta 24 pengujian visual Playwright (`test:ui`) pada 320/1440 px terang/gelap (termasuk skenario baru H02 monitoring & H04 leaflet evidence) lulus 100%.
- Langkah berikut: T29 Validasi integrasi dan CI (konfigurasi CI GitHub Actions, pipeline lint/test/build terisolasi).

## Checkpoint T27 — 2026-10-03

- Implementasi: [outbox dan pemulihan kegagalan](../docs/sdd/outbox-failure-recovery.md). Tiga pilar ketahanan lintas layanan (resilience across boundaries):
  1. **Transactional Outbox & Deduplikasi (Attendance $\to$ Media)**: `MediaOutboxWorker` di `attendance-service` mengambil task dari `att_outbox` dengan CAS claim token 30 detik, bounded batch 10, serta menangani kegagalan upstream (offline/503/timeout) dengan exponential backoff terukur ($1\text{s} \times 2^{\text{attempts}}$ hingga maksimal 60 detik). Media Service menjamin deduplikasi dan idempotensi pada `POST /internal/media/attendance-photos/:id/bind`.
  2. **Provisioning Compensation (Employee $\leftrightarrow$ Auth)**: `EmployeesService` di `employee-service` mengoordinasikan saga 3-fase (`PREPARE` $\to$ `PUBLISH` $\to$ `FINALIZE`). Pada kegagalan terminal sebelum finalisasi (misal invalidasi departemen/jabatan), kompensasi atomik memastikan profil karyawan dikembalikan ke `ready: false, status: 'INACTIVE'` dan akun Auth tetap `INACTIVE`. Konflik email dapat dikoreksi melalui `POST /api/v1/employee-provisioning/:id/retry` dengan reservasi NIK tanpa duplikasi data.
  3. **Media Orphan Cleanup (Media $\leftrightarrow$ AIStor)**: `PhotosService.cleanupOrphans`, `PhotoOrphanWorker`, dan endpoint internal `POST /internal/media/attendance-photos/cleanup-orphans` membersihkan foto tak bertuan (`boundEventId IS NULL`) yang berstatus `READY`/`FAILED` dan melampaui grace period (default 2 jam): status diubah ke `FAILED`, dicatat dalam `media_audit_logs` (`PHOTO_ORPHAN_CLEANED`), dan objek storage dihapus secara aman. Seluruh foto yang telah terikat (`boundEventId IS NOT NULL`) serta foto baru dalam batas grace period dipastikan tidak tersentuh.
- Verifikasi:
  - 5 unit tests `MediaOutboxWorker` (`media-outbox.worker.spec.ts`) lulus, membuktikan siklus timer, fault injection upstream 503 dengan exponential backoff, CAS recovery dari sewa kadaluarsa, dan deduplikasi worker paralel.
  - 5 unit tests `PhotoOrphanWorker` (`photo-orphan.worker.spec.ts`) lulus, membuktikan siklus background timer, pencegahan eksekusi tumpang-tindih (concurrency guard), dan penanganan error yang graceful.
  - 20 tests e2e Media Service (`photos.e2e-spec.ts`) lulus 100%, memverifikasi pembersihan orphan foto lewat endpoint internal dan worker tick, transisi state `FAILED` dan audit log, serta perlindungan mutlak bagi foto terikat dan foto baru.
  - 29 tests e2e Attendance Service (`checkin.e2e-spec.ts`) lulus 100%, memverifikasi outbox durable, recovery respon ambigu, pengikatan private checkout, otorisasi foto HRD T26, dan revalidasi sesi.
  - 7 tests e2e Employee Provisioning (`provisioning.e2e-spec.ts`), 6 tests `profile-email.e2e-spec.ts`, dan 5 tests `lifecycle.e2e-spec.ts` lulus 100%.
  - Typecheck, oxlint (0 warning, 0 error), dan build production semua package terkait lulus 100%.
- Langkah berikut: T28 Review UI responsif (HeroUI+custom, bahasa Indonesia, fokus keyboard, loading/error/empty state dan mobile konsisten).

## Checkpoint T26 — 2026-10-03

- Implementasi: [detail monitoring Leaflet](../docs/sdd/attendance-leaflet-monitoring.md). Detail absensi HRD (Layar H04) menampilkan bukti check-in dan checkout lengkap.
- Backend: Endpoint `GET /api/v1/attendance/:id/events/:eventId/photo` di Attendance Service memvalidasi otentikasi HRD dan menerbitkan signed URL foto privat berdurasi 60 detik melalui `media-service`. Mendukung penayangan foto untuk absensi aktif maupun soft-deleted sesuai klausul baseline line 53.
- Gateway: `AttendanceAdminProxyController` di `api-gateway` memvalidasi UUID v4 pada path foto dan query exclusion, lalu meneruskan ke `attendance-service`. 43 unit tests lulus.
- Frontend: `AttendanceMap.tsx` mengintegrasikan Leaflet dengan custom SVG marker bertema Linear emerald, lingkaran akurasi (`accuracyMeters`), dan atribusi OSM. `AttendanceEvidence.tsx` menyajikan dua kartu bukti (check-in & checkout) berdampingan pada desktop dan bertumpuk pada ponsel, memuat peta interaktif, data tekstual tahan-gagal (koordinat, akurasi, waktu), dan foto privat dengan timer kedaluwarsa 60 detik.
- Verifikasi: Integration test E2E MySQL/AIStor di `checkin.e2e-spec.ts` memverifikasi izin foto HRD untuk record aktif & terhapus, penolakan token non-HRD (403), unauthenticated (401), dan event ID salah (404). 78 tests di `hr-web` lulus. Typecheck, lint, dan production build semua package terkait lulus 100% tanpa error.
- Checkpoint setelah T26: seluruh pengujian relevan lulus, alur fase diverifikasi.
- Langkah berikut: T27 Outbox dan pemulihan kegagalan (event dedup/retry, provisioning compensation, cleanup orphan).

## Checkpoint T25 — 2026-10-03

- Implementasi: [monitoring & rekap](../docs/sdd/attendance-monitoring.md). Dashboard ringkasan harian dan daftar absensi seluruh karyawan (Layar H02).
- Employee Service: `GET /internal/employees/roster` timing-safe secret `X-Employee-Service-Key`, mengembalikan snapshot karyawan aktif beserta riwayat transisi status.
- Attendance Service: `GET /api/v1/monitoring/summary` dan `GET /api/v1/monitoring/employees`. Evaluasi missing attendance menggunakan eligibility historis (`EligibilityEngine`) tanpa record fiktif di DB. Soft-deleted (`deletedAt !== null`) dikecualikan dari metrik aktif dan ditandai badge "Dihapus HRD". Status ganda (terlambat & pulang awal) dipertahankan penuh.
- API Gateway: Proxy `/api/v1/monitoring/summary` dan `/api/v1/monitoring/employees` dengan allowlist query parameter dan foreign header stripping.
- HR Web: `MonitoringPage.tsx` terpasang di `#monitoring` (`view === "ringkasan"`). Navigasi tanggal (hari ini, prev, next), kartu metrik interaktif sebagai filter instan, toolbar departemen/status/search, tabel absensi karyawan dengan badge status lengkap, link langsung ke detail absensi, paginasi, dan state loading/empty/error yang accessible.
- Verifikasi: 12 integrasi MySQL nyata (`monitoring.e2e-spec.ts`), 66 unit attendance, 40 unit gateway, 22 unit employee service, dan 75 unit/component tests HR Web (`MonitoringPage.test.tsx` 5 passed) lulus. Typecheck, oxlint, dan build production semua package terkait lulus 100% tanpa error.
- Langkah berikut: T26 Detail monitoring Leaflet (dua lokasi, accuracy, waktu, alasan dan foto privat).

## Penutupan manual sampai T24 — 2026-10-03

- Pengguna menyatakan seluruh pengujian manual sampai T24 aman. T20–T24, 35 langkah manual pada lima module specs dan checkpoint T21 dicentang; UX03/UX04 diselaraskan dengan task fitur yang telah diterima. Ini penerimaan pengguna, bukan run otomatis baru atau pengujian ulang agen. Perangkat/browser/benchmark rinci tidak diberikan.
- [Ringkasan checklist](todo.md#penerimaan-manual-sampai-t24--2026-10-03) menjadi status acceptance terbaru; catatan pending dalam checkpoint lama di bawah merupakan status historis sebelum konfirmasi ini. Tidak menyatakan T01–T07/UX01–UX02, T25–T31 atau deployment selesai.
- Perubahan hanya dokumentasi, diverifikasi isi/tautan/diff dan di-commit/push ke dev setelah review. Runtime tidak dihentikan/dijalankan ulang. Jangan memakai PID historis sebagai status live. Tidak ada task coding lain aktif; berikut T25 serial sesuai dependency, serta rekonsiliasi fondasi sebelum rilis.

## Checkpoint T24 — 2026-10-03

- Implementasi: [riwayat pribadi](../docs/sdd/attendance-history.md). Daftar berfilter/pagination dan detail hanya milik sesi; termasuk catatan terhapus dengan waktu/alasan asli. Foto kedua event diminta eksplisit melalui Media, URL privat 60 detik, tanpa URL/ID foto dalam payload daftar/detail atau browser storage. Recheck versi/state sesudah penerbitan URL menolak penghapusan/perubahan bersamaan. JWT/revokasi/forced password dan relasi pemilik/event ditegakkan per request.
- Attendance Web: Home → Riwayat, filter/page/id pada URL; kembali mempertahankan periode/page. Detail urut waktu/foto/lokasi/alasan, state loading/kosong/error, abort request dan penghilangan foto pada expiry/error/unmount. Halaman lazy terpisah dari capture/MediaPipe. Tidak ada mutasi atau retry absensi dari riwayat. API Gateway allowlist tiga GET baru, query whitelist dan UUID v4. Tanpa migrasi, grant atau dependency baru.
- Verifikasi: 28 integrasi MySQL/AIStor nyata (26 regresi + dua T24) lulus; 13 unit Gateway dan 87 frontend lulus. Setelah penyesuaian urutan bukti, tujuh tes riwayat lulus kembali. Empat visual Home dan 12 riwayat 320/1440 terang/gelap lulus; screenshot, HeroUI MCP dan Chrome DevTools ditinjau. Typecheck/lint/build Attendance/Gateway/Attendance Web lulus. Manual backend browser/perangkat T20–T24 tetap pending; todo belum ditutup penuh. Suite frontend seluruh package berjalan karena argumen awal runner; run berikut memakai filter terfokus. Tidak ada suite monorepo atau E2E bisnis browser otomatis yang diklaim.
- Perbaikan terpisah: 32809dc (`fix(gateway): allow HR attendance deletion through browser CORS`) telah commit/push ke origin/dev, hash lokal/remote sama. TDD membuktikan DELETE tidak ada pada preflight, lalu tiga kontrak CORS dan runtime DELETE dari HR Portal lulus. Perbaikan hanya menambah metode pada origin allowlist existing; guard/mutasi tetap sama.
- Runtime backend sempat dipause untuk suite berat. Sesudah build terbaru, lima proses dist aktif: Gateway 3000 PID 20076, Auth 3001 PID 13992, Employee 3002 PID 3448, Attendance 3003 PID 15960, Media 3004 PID 14324; kelima health 200. Portal existing tetap Attendance 5173 PID 12068 (127.0.0.1), HR 5174 PID 18416 (::1), keduanya http://localhost:PORT 200. MySQL 3307 dan AIStor 9000/9001 aktif. Swagger Attendance memuat tiga GET history; log runtime ada di .local/runtime-t24 ignored. PID harus dicek ulang sebelum reuse/stop. Jangan memakai 127.0.0.1 untuk HR yang hanya listen IPv6; localhost tetap origin frontend.
- Fixture sintetis apps/attendance-web/.local/t24-history.html, screenshot/build/test-results/logs ignored; halaman fixture Chrome MCP ditutup dan server visual 15173 dihentikan runner. Tooling lokal untracked tidak diubah/stage. Review kontrak/privasi/akses/pagination/race dan diff/tautan selesai sebelum commit/push perubahan T24; lihat Git/source untuk hash aktual.
- Langkah berikut: hasil checklist manual pada [T24](../docs/sdd/attendance-history.md#checklist-manual-pengguna) dicatat saat pengguna menguji; implementasi berikut T25 dashboard/monitoring/rekap dengan missing dan historical eligibility benar, deleted dikecualikan, mengikuti dependency plan. T26 foto/peta Leaflet HRD setelah T25. Tidak ada deployment atau pergantian agen otomatis, dan tidak ada task coding lain aktif.

## Checkpoint T23 — 2026-10-03

- Implementasi: [lifecycle absensi](../docs/sdd/attendance-lifecycle.md). HRD list/detail, DELETE dengan alasan+versi, POST restore; allowlist Gateway meneruskan JSON DELETE. JWT/revokasi/kewajiban password diperiksa setiap request dan diulang sebelum mutasi. Transaksi mengunci catatan harian, versi monotonik, audit atomik; retry/konfirmasi lama ditolak tanpa efek tambahan. Foto/event/snapshot/unique/outbox tersimpan; check-in ulang dan checkout pada data terhapus ditolak.
- HR Web: Absensi/Absensi dihapus, filter tanggal/karyawan/pagination, detail waktu/alasan/snapshot dan 20 audit lifecycle terbaru, dialog konfirmasi nama/tanggal/alasan dan restore. H08 memiliki tautan Lihat absensi, termasuk arsip. Hasil tidak pasti/konflik mewajibkan baca ulang dan konfirmasi baru; tanpa retry otomatis. Foto privat/peta lengkap T26 dan rekap/missing T25 belum diimplementasikan.
- Verifikasi: suite 25 integrasi nyata lulus (21 T21/T22 + empat T23); setelah rollback audit/detail snapshot ditambahkan, lima T23 terbaru lulus. Delapan unit Gateway, 28 frontend terkait, typecheck/lint/build Attendance/Gateway/HR lulus. 12 visual daftar/detail/dialog 320/1440 terang/gelap lulus; HeroUI MCP dan Chrome DevTools digunakan, dialog 44 px dan tanpa overflow. Manual T20–T23 tetap pending; todo belum ditutup penuh. Build HR memberi peringatan chunk >500 kB, dicatat untuk T28.
- Tidak ada migrasi, grant atau dependency baru. Review security/transaksi/retry/akses/arsip, diff dan tautan dilakukan sebelum staging; satu perubahan logis pada dev. Lihat Git log dan origin/dev untuk hash aktual. Berkas tooling lokal untracked, env, lisensi, fixture/foto/log/build/generated/.local tidak di-stage.
- Runtime dipause sementara karena RAM rendah selama verifikasi, kemudian dinyalakan kembali hidden. Auth 3001 PID 15696, Employee 3002 PID 13952, Media 3004 PID 15376, Attendance 3003 PID 19776, Gateway 3000 PID 19000. Dist Attendance/Gateway terbaru; log ignored .local/runtime-t23. Kelima health 200, Swagger memiliki list/detail/restore HRD. Portal 5173/5174 tetap aktif dan HTTP 200; PID awal 12068/18416, periksa listener aktual sebelum restart. MySQL/AIStor tetap Docker aktif.
- Playwright sementara 15175 selesai/ditutup. Fixture browser .local/t23-visual.html sintetis dan ignored; tab MCP sementara ditutup, halaman Attendance asli masih tersedia. Tidak ada subagen, perubahan main atau deployment. Berikut T24 sesuai dependency plan; manual T20–T23 dapat diterima pengguna terpisah.

## Checkpoint T22 — 2026-10-03

- Implementasi: [checkout](../docs/sdd/attendance-checkout.md), reuse intent/outbox/capture T21. Checkout menargetkan dailyRecordId milik sesi, foto privat CHECK_OUT, GPS fresh, alasan early, waktu server dan cutoff tanggal sama. Event memakai kalender saat pengiriman sesuai baseline; snapshot check-in/profil harian tetap. Hash operasi/target berbeda; hash check-in lama tidak berubah. Transaksi mengunci catatan harian, unique event/foto dan audit/binding tetap idempotent.
- Verifikasi: 21 integrasi MySQL/AIStor nyata (14 regresi T21 + tujuh T22), recovery lost commit/binding checkout diperiksa lagi terfokus; enam unit policy/hash, tujuh unit Gateway, 32 frontend lulus pada suite terkait. Typecheck/lint/build Attendance/Gateway/Attendance Web lulus. Tidak ada migrasi/dependency baru atau pengujian seluruh repo.
- Visual: 12 pemeriksaan awal 320/1440 terang/gelap (siap checkout, capture idle, selesai) lulus. Review menemukan tombol beranda 40 px; diperbaiki ke 44 px dan delapan pemeriksaan ulang beranda lulus. HeroUI MCP dan browser MCP meninjau preview alasan pulang awal/sukses sintetis, tanpa overflow. MediaPipe tetap lazy; API/perangkat browser nyata tujuh langkah masih pending. Jangan menutup T20/T21/T22 penuh.
- Scope Git: Attendance/checkin dan test, Gateway proxy/timeout, Attendance Web route/client/intent/capture/Hari ini dan CSS/visual, baseline/runbook/module spec/todo/progress. Perubahan logis T22 pada dev; lihat git log/remote untuk hash aktual. Tooling lokal untracked tetap dipertahankan; env/foto/log/build/generated/.local tidak di-stage.
- Proses terkini setelah tes: Auth 3001 PID 4584, Employee 3002 PID 22696, Media 3004 PID 4040, Attendance 3003 PID 2120 (worker aktif), Gateway 3000 PID 21068. Backend dist terbaru yang berubah; proses background hidden, stdout/stderr lokal ignored di .local/runtime-t22. Attendance Web 5173 PID 12068 dipakai ulang; HR Web 5174 PID 18416. Health kelima backend 200, Swagger Attendance berisi today/requests/check-in/check-out, MySQL 3307 dan AIStor 9000/9001 aktif.
- Server visual sementara 15174 dihentikan; browser MCP kembali ke localhost:5173. RAM sempat rendah sehingga server milik sesi dihentikan selama tes; kini dinyalakan kembali. Periksa PID/listener sebelum restart. Tidak ada subagen/pergantian otomatis, push main atau deployment. Berikut T23 sesuai plan, sambil tetap mencatat acceptance manual terpisah.

## Checkpoint T21 — 2026-10-02

- Implementasi ujung ke ujung: foto privat READY + lokasi wajib/fresh, waktu resmi WIB dari server, eligibility, alasan terlambat, snapshot, unique harian/foto, intent durable dan rekonsiliasi respons ambigu. Outbox mengikat foto ke event secara idempotent tanpa broker. Hari ini memakai API nyata dan hasil resmi; capture/retry tidak mengubah bukti selama hasil belum jelas. Rincian: [check-in](../docs/sdd/attendance-checkin.md), [panduan lokal](../docs/deployment/attendance-local.md).
- Verifikasi lulus: 14 integrasi Gateway/Auth/Employee/Attendance/Media dengan MySQL/AIStor nyata; 22 unit Attendance, 6 unit + 66 kontrak Gateway, 41 frontend pada suite terfokus, delapan visual 320/1440 terang/gelap. Typecheck/lint/build terkait, schema validate/diff dev/test/migrations dan grants lulus. Fixture sintetis dibersihkan. Build/test seluruh repo tidak diulang.
- MCP HeroUI digunakan untuk field alasan; Chrome DevTools meninjau preview/alasan, sukses dan pending sintetis. State pending mengunci foto/lokasi/alasan, tanpa overflow pada 320 px, target tombol 44 px. Kamera/GPS/browser dengan backend nyata belum diterima; T20/T21 dan checkpoint fase belum ditutup penuh.
- Proses aktif: Gateway 3000 PID 15684/session 10341; Auth 3001 PID 456/session 96373; Employee 3002 PID 7792/session 87189; Attendance 3003 PID 19712/session 23613 (worker aktif); Media 3004 PID 21280/session 54748. Backend dari dist terbaru yang berubah, tanpa watch. Attendance Web 5173 PID 12068 (server lama), HR Web 5174 PID 16272/session 69495. MySQL 3307 dan AIStor 9000/9001 tetap aktif. Periksa listener aktual sebelum restart; jangan menganggap PID tetap berlaku setelah sesi berakhir.
- Fixture visual .local dan server 15174 hanya untuk review sintetis; server sementara dihentikan pada pemeriksaan akhir. Browser MCP dikembalikan ke portal asli localhost:5173. Foto, env, generated/build dan tooling lokal tidak di-stage.
- Satu perubahan logis T21 pada dev; review akhir dan tautan dokumentasi lulus. Hash commit serta keberhasilan push diverifikasi melalui git log dan origin/dev sebagai sumber aktual. Tidak ada push main, deployment, atau pergantian agen otomatis. Tidak ada task coding lain yang aktif.
## Checkpoint T20 — 2026-10-02

- Implementasi: mesin T18 dipromosikan tanpa duplikasi; route lazy terproteksi, HeroUI preview/retake/lokasi wajib, upload privat T19, retry key sama, pembatalan/tab/unmount/401, prepared evidence WIB untuk T21. T20 belum mencatat absensi.
- Verifikasi: 54 tes terfokus lulus dalam beberapa suite, delapan visual halaman berubah 320/1440 terang/gelap, typecheck/lint/build. Chrome DevTools memeriksa idle, ukuran target sentuh, overflow dan error model Offline/alert; HeroUI MCP digunakan. Chunk MediaPipe terpisah dari main login. Review diff/code selesai; tidak ada backend/dependency/credential berubah.
- Uji perangkat/API nyata: tujuh langkah pada [capture portal](../docs/sdd/attendance-capture.md#checklist-manual-pengguna) belum diterima. Jangan menutup T20 atau mengklaim kamera/GPS/upload browser nyata lulus hanya berdasarkan mock/health.
- Proses dibiarkan aktif: Vite 5173 PID 12068 (server lama digunakan ulang), Auth 3001 PID 9524/session 12180, Media 3004 PID 21216/session 94162, Gateway 3000 PID 18392/session 86885. Backend dari dist T19, tanpa watch. Ketiga health 200, MySQL/AIStor up. Cek listener sebelum restart; rebuild/restart backend hanya jika source berubah.
- Fixture visual di apps/attendance-web/.local (ignored) hanya sesi sintetis, bukan akun/API nyata; browser MCP dikembalikan ke portal asli http://localhost:5173. Screenshot/build/test-results ignored. Tooling lokal untracked tetap dibiarkan.
- Commit/push dev dikerjakan setelah pemeriksaan akhir; lihat git log dan origin/dev untuk hash aktual. Langkah berikut: menerima hasil uji T20, lalu T21 (foto+lokasi, eligibility, late reason, waktu server, snapshot, idempotensi/unique) serial sesuai plan. Tidak ada pergantian agen otomatis.

## Bukti pemeriksaan

- T19 selesai: [foto privat](../docs/sdd/media-photos.md), [runbook Media](../docs/deployment/media-local.md). Endpoint upload multipart Gateway → Media → Auth/MySQL/AIStor nyata, normalisasi JPEG/EXIF, checksum SHA-256 dan READY, idempotensi/lease/recovery, scoped internal inspect/photo-url 60 detik, revokasi per request, grants dan policy terbatas. Media 16 unit + 18 HTTP/integrasi; Gateway 14 unit + 74 kontrak lulus. Typecheck/lint/build terkait, setup storage idempotent, schema validate/diff dev/test lulus. Bucket/test schema lokal terisolasi logis; volume rilis terpisah tetap prasyarat sebelum produksi. Semua fixture sintetis dibersihkan. Backend test ditutup; Vite prototype 5173 PID 12068 dan Docker MySQL/AIStor tetap aktif.


- T18 increment prototipe: lihat [spike kamera/lokasi](../docs/architecture/camera-location-spike.md#bukti-increment-2026-10-02) untuk parameter, bukti dan checklist perangkat nyata. 21 test terfokus, build/typecheck dan lint lulus; MCP HeroUI dan Chrome DevTools berhasil. Portal produksi tidak membawa spike/MediaPipe. Server loopback http://localhost:5173/spikes/capture.html dibiarkan aktif untuk pengguna; periksa PID/listener aktual sebelum menghentikan atau memakai kembali. Jalur exec standar masih gagal helper setup; scoped require_escalated lolos automatic review, bukan bukti sandbox sudah pulih.

- T17: kalender libur HRD (`apps/attendance-service`, `apps/api-gateway`, `apps/hr-web`). CRUD kalender libur hari ini/mendatang (`POST /api/v1/holidays`, `GET /api/v1/holidays`, `PATCH /api/v1/holidays/:id`, `DELETE /api/v1/holidays/:id`). Validasi tanggal lampau (`400 Bad Request` "Tanggal libur tidak boleh berupa tanggal lampau"), duplikasi tanggal (`409 Conflict`), otorisasi `ADMIN_HRD` via `AdminGuard` & `AuthClient` (401 unauthenticated, 403 non-admin/mustChangePassword). Immutabilitas snapshot: pembuatan hari libur pada siang/sore hari tidak mengubah `policySnapshot` absensi check-in pagi hari yang sudah tercatat. Audit logging atomik ke `att_audit_logs` (CREATE, UPDATE, DELETE). API Gateway upstream proxy `holidays-proxy.controller.ts` dengan allowlist path/query parameter & error mapping. UI HR Web layar H13 (`apps/hr-web`): tabel daftar kalender libur dengan badge status (Mendatang, Hari Ini, Lampau), filter pencarian nama & pagination, dialog form tambah/ubah dengan validasi `min={todayWIB}`, proteksi tombol aksi untuk tanggal lampau, dialog konfirmasi hapus. Unit tests 48/48 lulus, MySQL E2E 15/15 lulus (`test/holidays.e2e-spec.ts`), API Gateway 13 unit & 67 e2e kontrak lulus, HR Web Vitest 64/64 lulus (`HolidaysPage.test.tsx` 8/8), build dist & lint seluruh package terdampak exit 0. Spesifikasi di [attendance holidays](../docs/sdd/attendance-holidays.md).

- T16: aturan waktu dan eligibility absensi (`apps/attendance-service`). Kebijakan kerja standar WIB (08:00–17:00), presisi ambang batas milidetik: check-in 08:00:00.000 (tepat waktu) vs 08:00:00.001 (terlambat + wajib alasan), checkout 16:59:59.999 (pulang lebih awal + wajib alasan) vs 17:00:00.000 (normal departure, bukan otomatis lembur), batas cutoff checkout 23:59:59.999 WIB pada tanggal sama vs 00:00:00.000 hari berikutnya (cutoff terlewati / ditolak). Klasifikasi hari kerja reguler, akhir pekan, dan hari libur nasional/perusahaan (sukarela, late=false, early=false, alasan opsional). Snapshot immutability pada perubahan kalender campuran. Eligibility real-time (aktif & ready) vs penolakan nonaktif/arsip/sebelum startDate. Rekonstruksi historis status karyawan dari riwayat transisi lifecycle. Evaluasi status harian dan missing attendance (hari kerja lampau tanpa absensi = missing; hari ini sebelum 17:00 WIB tanpa absensi = belum check-in; hari ini setelah 17:00 WIB = missing; absensi terhapus/soft-deleted bukan missing sesuai baseline). Schema & migrasi `20261002220000_attendance_foundation` (`att_work_policies`, `att_holidays`, `att_daily_records`, `att_events`, `att_idempotency_requests`, `att_audit_logs`). Penegakan constraint `UNIQUE(employee_id, attendance_date)` bahkan saat soft delete teruji. Constraint `UNIQUE(daily_record_id, event_type)` teruji. Akun least-privilege `attendance_attendance` terisolasi dari tabel auth/employee. Unit test TDD 31/31 lulus (`time-policy.engine.spec.ts`, `eligibility.engine.spec.ts`, `app.controller.spec.ts`). MySQL E2E 8/8 lulus (`policy-database.e2e-spec.ts`, `app.e2e-spec.ts`). Lint 0 error/0 warning, build dist lulus. Rincian di [attendance policies & eligibility](../docs/sdd/attendance-policies-eligibility.md).

- T15: reset password karyawan oleh HRD (`POST /api/v1/employees/:id/reset-password`). One-time display, Idempotency-Key UUID (replay ditolak 409 "Password sudah ditampilkan"), revokasi instan seluruh sesi aktif lama karyawan, kewajiban ganti password (`mustChangePassword = true`, diarahkan ke E02), mutual exclusion terhadap operasi PENDING email/lifecycle (409), penolakan reset pada karyawan ARCHIVED (409), zero-secret leakage pada audit logs dan riwayat. Migration `20261002210000_employee_password_reset` diterapkan dev/test, grant `auth_password_resets` diterapkan. Auth 3 unit, Employee 4 unit, Gateway 58 kontrak HTTP Supertest lulus. Integrasi MySQL nyata 5/5 skenario lulus (`reset-password.e2e-spec.ts`). UI H08 (`apps/hr-web`): tombol Reset password pada ACTIVE/INACTIVE, ConfirmDialog dengan peringatan wajib revokasi sesi dan tampilan sekali, TemporaryPasswordDialog dengan tombol Salin & penghapusan credential dari state React saat dialog ditutup, format riwayat `EMPLOYEE_PASSWORD_RESET` pada timeline, Vitest 10/10 lulus. Visual Playwright 4/4 skenario lulus pada 320/1440 px terang/gelap (`portal-design.spec.ts`); screenshot dialog konfirmasi dan temporary password ditinjau; tanpa overflow. Typecheck dan lint semua package terdampak (Gateway, Employee, Auth, HR) 100% bersih; backend dist (Auth, Employee, Gateway) dan frontend HR Web dibangun exit 0. Pengujian browser manual langkah 1–10 dinyatakan lulus penuh oleh pengguna pada 2026-10-02; bukti di [employee reset password](../docs/sdd/employee-reset-password.md).

- T14 B: transisi status (aktif/nonaktif/arsip/restore INACTIVE), revokasi instan semua sesi aktif pada non-ACTIVE, aktivasi terpisah, reservasi email/NIK tanpa hard delete, eksklusi timbal-balik terhadap email change PENDING, dan riwayat terkurasi atomik selesai diimplementasikan. Gateway allowlist 57 kontrak HTTP lulus (termasuk 5 kontrak baru B). Integrasi MySQL nyata 5/5 skenario lulus (`lifecycle.e2e-spec.ts`). UI H08 (`apps/hr-web`): kartu status dengan aksi dinamis, ConfirmDialog dengan peringatan wajib revokasi sesi dan status nonaktif setelah restore, penguncian saat operasi pending, timeline riwayat (`GET /history`), Vitest 9/9 lulus. Visual Playwright 4/4 skenario lulus pada 320/1440 px terang/gelap (`portal-design.spec.ts`); screenshot form detail, konfirmasi nonaktifkan dan konfirmasi email ditinjau; tanpa overflow. Typecheck dan lint semua package terdampak (Gateway, Employee, Auth, HR) 100% bersih; backend dist dibangun. Checklist browser manual disiapkan di [employee lifecycle](../docs/sdd/employee-lifecycle.md).

- T14 A: edit profil dan email terpisah, history/audit profil atomik, email durable + receipt/revokasi/recovery diimplementasikan. Migration dev/test/grants dan diff schema exit 0; typecheck/lint/build package terdampak lulus. Auth 3 unit, Employee 9 unit, Gateway 51 kontrak, HR 14 komponen lulus. MySQL: 5 skenario lulus awal + 1 lulus rerun setelah perbaikan fixture port; visual 4/4 lulus dan screenshot ditinjau. Rincian/batas bukti dan checklist browser ada di [module spec T14](../docs/sdd/employee-lifecycle.md). Pengguna melaporkan checklist browser API nyata lulus pada 2026-10-02; A ditutup, B dan T14 keseluruhan tetap terbuka.

- Pelaksanaan per putaran disetujui pengguna (2026-10-02): fitur lengkap API+UI+test/dokumentasi dalam satu putaran, reuse T10–T13, polesan tambahan pada T28, baca konteks terkait saja, checklist browser sekali sesudah putaran lengkap, dan service seperlunya. T14 dibagi A edit profil/email, B lifecycle/history/revokasi. Perubahan dokumentasi diperiksa isi, tautan dan diff; test aplikasi tidak diulang.

- Revisi percepatan setelah T13 (2026-10-02): pengguna menyetujui E2E browser manual per fitur selama development, regresi browser otomatis sebelum rilis saat resource tersedia, test perilaku terfokus, visual hanya halaman berubah, suite repo hanya checkpoint relevan/rilis, satu commit per perubahan logis, serta dokumentasi ringkas/reuse tanpa refactor dini. Test lama dan bukti bisnis/keamanan/data nyata tetap wajib. Perubahan hanya dokumentasi; periksa isi/tautan/diff, tanpa mengulang test aplikasi.

- T13 frontend: Attendance typecheck/lint/build lulus; enam unit Auth client, tiga komponen E01, dan tiga alur App lulus. Playwright visual 12/12 lulus (E01/E02/home, 320/1440 px, terang/gelap, satu worker, sesi tiruan); screenshot ditinjau. Pengguna melaporkan browser API nyata langkah 1–5 lulus pada 2026-10-02: wajib ganti password, login ulang, reload/logout, role dan pemisahan sesi; lihat [Attendance lokal](../docs/deployment/attendance-local.md). T13 dan checkpoint ditutup. E2E otomatis dan seluruh suite monorepo tidak diulang karena RAM terbatas.

- T12 browser: pengguna melaporkan lima pemeriksaan manual desktop/mobile lulus pada 2026-10-02 (buat akun valid, password sementara sekali tampil, data bertahan tanpa membuka password lagi, konflik email tanpa data ganda, form/dialog 320 px). Spec Playwright desktop/mobile + harness/runbook di-commit dan dipush sebagai 9400f3a. Sintaks JS, HR typecheck/lint dan discovery dua skenario lulus; suite Playwright otomatis belum dijalankan karena RAM host sekitar 1,9 GB. Bukti backend MySQL dan visual T12 sebelumnya tetap berlaku; hasil otomatis tidak diklaim lulus.

- T12 UI: typecheck/lint dan 25 test terfokus HR (Employees 7, AuthClient 8, selector 6, App 4) lulus. Visual T12 8 test terang/gelap pada 320/768/1024/1440 lulus; daftar, H07, H10 dan koreksi email diperiksa, screenshot ditinjau. E2E nyata belum dijalankan pada increment UI ini.

- T12 integrasi backend: 7 test Auth–Employee–MySQL nyata lulus: concurrent/idempotensi, receipt atomik, recovery/revokasi, worker restart, response finalize hilang, master berubah/kompensasi, email unik/inactive dan internal signature/actor. Auth dist dibangun dahulu.

- T12 Gateway: typecheck/lint dan 45 kontrak HTTP lulus, termasuk route provisioning, header idempotensi, penolakan internal path/query/header palsu. Backend nyata belum diuji pada increment ini.

- T12 increment backend: schema/migration diterapkan dev/test, diff migrations→schema exit 0, grant milik service lulus/akses lintas service ditolak. Auth typecheck/lint + 6 unit; Employee typecheck/lint + 5 unit (tanggal kalender, idempotensi, timeout durable, lease dan actor) lulus. Integrasi MySQL lintas service/E2E menyusul saat fitur lengkap.

- GitHub tersedia: push awal dev diverifikasi hash lokal=remote (7cd397f); keputusan repository dicatat dan dipush pada 89aa568. T12 dimulai melalui [kontrak provisioning](../docs/sdd/employee-provisioning.md); belum ada perubahan runtime atau test T12. Dokumen diperiksa isi/tautan/diff.

- Revisi kebijakan testing (2026-10-02): AGENTS, plan, workflow, baseline dan design system diselaraskan dengan persetujuan pengguna. Verifikasi dokumentasi: isi/tautan lokal dan diff; test aplikasi tidak diulang karena tidak ada perubahan runtime.

- T11 selesai (rincian di docs/sdd/employee-positions.md): diff migrations→schema exit 0; migrate dev/test dan grants lulus. Employee typecheck/lint, 9 unit dan 12 API MySQL (6 departemen + 6 jabatan) lulus; tambahan filter ACTIVE jabatan 6 API lulus. Gateway typecheck/lint, 12 unit + 37 kontrak HTTP lulus. HR typecheck/lint, 38 Vitest/RTL lulus (satu worker), termasuk refetch dan selector aktif/nilai lama nonaktif. Visual 36 test lulus (H11/H12 terang/gelap 320/768/1024/1440; screenshot ditinjau). Backend Auth/Employee/Gateway dan HR build lulus. E2E jabatan nyata desktop/mobile 2 lulus; regresi departemen desktop/mobile 2 lulus, dijalankan terpisah. Cleanup: 0 fixture E2E jabatan/departemen/akun browser. Typecheck test E2E + pemeriksaan sintaks harness lulus.

- T09c redesign: tsc kedua frontend, Vitest auth, Playwright `test:ui` terang/gelap 320/768/1024/1440 px; screenshot ditinjau. E2E auth nyata telah lulus pada sesi sebelumnya; T09c disetujui pengguna pada 2026-10-02 dan dicentang. Audit source memastikan seluruh halaman tersedia memakai tema bersama; 36 test visual dan 38 komponen serta E2E jabatan/departemen dari T11 menjadi bukti terbaru. Tidak ada perubahan runtime untuk penegasan tema ini.
- T10 (rincian di docs/sdd/employee-departments.md):
  - Employee: 5 unit + 6 e2e Supertest terhadap MySQL attendance_test (auth/role, unik case-insensitive 409, validasi, nonaktif tanpa hapus, audit per perubahan, filter/pagination). Lint 0.
  - Gateway: 12 unit + 27 kontrak HTTP (allowlist path/query, header dibuang, 503 khusus Employee). Lint 0.
  - Auth: 14 e2e MySQL (termasuk `/me` per request, login tetap 429), 6 unit.
  - hr-web: 20 Vitest/RTL, Playwright layout departemen terang/gelap 4 viewport (aksi wajib terlihat penuh), E2E nyata `hr-departments.spec.ts` desktop+mobile lulus; data test dibersihkan (0 baris tersisa).
- Kendala test yang diketahui: menjalankan `hr-auth.spec.ts` dan `hr-departments.spec.ts` dalam satu run memicu limit 10/menit pada login/refresh Auth (429) di project kedua. Run terpisah lulus. Lihat langkah berikut.

## Langkah berikut

1. **T22 teknis selesai; berikut T23 soft delete/restore absensi** sesuai dependency plan. Checklist manual T20/T21/T22 tetap perlu penerimaan perangkat/API nyata; jangan menyamakan fixture sintetis dengan uji perangkat nyata. Reuse transaksi dan kunci catatan harian T22 agar checkout tidak berlomba dengan hapus/restore. Belum ada task coding lain aktif; satu increment, tanpa subagen.
2. Limit 429 E2E Auth tetap menunggu keputusan pengguna: refresh limit sendiri atau run per spec. Jangan longgarkan limit login. Run T11 per spec terpisah lulus; konfigurasi Auth tidak diubah.
3. T09c selesai dan menjadi acuan wajib semua halaman berikutnya: gunakan token/komponen packages/ui, HeroUI, zinc–emerald, Geist, Phosphor dan mode terang/gelap. Kontrak mencakup E01–E09/H01–H14, seluruh state/dialog/mobile; jangan kembali ke T09b monokrom.
4. Polesan H11 selesai bersama H12: (a) shared MasterDataPage menampilkan skeleton selama refetch sehingga baris lama tidak tampil bersama pesan sukses; test komponen dan E2E desktop/mobile menunggu baris hilang sesudah aktifkan pada filter Nonaktif. (b) pager tidak lagi memakai kelas monospace, diverifikasi computed font pada test visual. (c) status memakai satu ToggleButtonGroup berbatas dan separator HeroUI, screenshot terang/gelap ditinjau.

Catatan: E2E memakai service dari `dist`; jalankan `pnpm --dir apps/<service> run build` setelah mengubah backend. employee-service bind 127.0.0.1; hanya Gateway publik.
## Kendala dan kebutuhan eksternal

- Remote GitHub sudah tersedia; akses Vercel/VPS/Cloudflare dan tahap deployment masih menyusul.
- Tool resource_status tidak tersedia pada sesi ini; RAM OS sekitar 1,9 GB tersedia saat pemeriksaan T12. Suite berat tetap serial, Playwright 1 worker. Pengguna memilih verifikasi browser nyata secara manual karena batas RAM.
- Build HR lulus dengan warning ukuran chunk JS sekitar 679 kB; tidak menurunkan batas warning atau menambah tooling.
- Akses Vercel/VPS/Cloudflare dan instruksi promosi main belum tersedia pada snapshot; siapkan artefak independen dahulu.
- Detail teknis terbuka seperti threshold capture, batas foto/lokasi, presisi waktu dan outbox harus dituntaskan melalui spike/spec/test terkait.
- Suite visual HR lama masih memiliki assertion placeholder Attendance sebelum T13; belum dijalankan pada putaran A yang hanya memeriksa halaman terdampak. Selaraskan saat checkpoint regresi sebelum rilis.
- Tidak ada keputusan tambahan pengguna yang diperlukan untuk meneruskan task rutin dalam scope saat ini.

## Format update sesi berikut

- Waktu/sesi dan task:
- Selesai + commit:
- Sedang dikerjakan + pemilik/file:
- Diff belum di-commit:
- Proses/port:
- Verification dijalankan + hasil:
- Kendala nyata:
- Langkah berikut + dependency:
- Trigger pergantian bila sesi mendekati batas:

## Arsip handoff T14 A — 2026-10-02

- Pengguna meminta pindah agen karena token hampir habis; kapasitas token aktual tidak dibaca/diarang. T14 B belum diimplementasikan.
- Implementasi A: a7eec12, sudah dipush ke origin/dev. Penutupan manual A dicatat pada commit docs setelah ini; gunakan git log sebagai sumber HEAD.
- Diff sebelum handoff hanya dokumentasi penutupan A; setelah commit tidak ada perubahan proyek tertunda. Tooling lokal untracked tetap dibiarkan dan tidak di-stage.
- Backend dist/database generated current untuk A; rebuild backend yang berubah sebelum test integrasi B. Migration A dev/test dan grants telah diterapkan.
- Kebijakan percepatan tetap berlaku; jangan mengulang pemeriksaan A tanpa perubahan terkait. Limit refresh 429 tetap menunggu keputusan pengguna, jangan longgarkan login. Assertion placeholder Attendance pada suite visual HR lama perlu diselaraskan pada checkpoint regresi.
- Kendala alat sesi ini: exec normal gagal sandbox helper dan apply_patch menolak reparse point. File ditulis lewat PowerShell UTF-8 tanpa BOM; perintah scoped require_escalated lolos automatic review. Jangan mengklaim kendala pasti berlaku pada sesi baru.
