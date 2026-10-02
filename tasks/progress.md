# Progres bersama dan titik lanjut

Dokumen ini digunakan semua agen/alat pada repo lokal yang sama. Update saat mulai/selesai task, sebelum sesi berganti atau kapasitas sesi habis. Status completion tetap di [todo](todo.md); dependency di [plan](plan.md); prosedur pada [alur implementasi](../docs/development/implementation-workflow.md).

## Snapshot terakhir

- Tanggal: 2026-10-02 (Asia/Jakarta). HEAD diverifikasi dengan `git log`; jangan anggap hash di sini sebagai HEAD.
- Tahap: T08-T17 selesai. T15 (reset password karyawan) lulus manual peramban langkah 1–10 dan ditutup penuh pada 2026-10-02. T16 (aturan waktu dan eligibility absensi) selesai diimplementasikan end-to-end. T17 (kalender libur HRD) selesai diimplementasikan end-to-end; tes unit/kontrak, integrasi MySQL nyata, dan UI component tests 100% lulus; spesifikasi di docs/sdd/attendance-holidays.md. T18 diterima pengguna setelah konfirmasi semua alur uji berjalan pada 2026-10-02. T19 foto privat backend selesai; T20 capture produksi diimplementasikan dan lulus teknis, checklist perangkat/API nyata masih pending. T21 check-in diimplementasikan dan verifikasi teknis lulus; checklist browser/perangkat T20/T21 masih pending. Increment berikut T22 checkout sesuai dependency plan. T09c tetap menjadi acuan tema.
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
- Branch: dev, tracking origin/dev. Repository public [annastriw/employee-attendance-system](https://github.com/annastriw/employee-attendance-system) dipilih pengguna pada 2026-10-02. Push awal terverifikasi: lokal dan remote dev sama pada 7cd397f. Visibilitas PUBLIC diverifikasi melalui GitHub setelah instruksi pengguna; commit berikut dipush setelah verifikasi, deployment tetap tahap terakhir.
- Database lokal (Docker MySQL 127.0.0.1:3307): migration sampai `20261003020000_attendance_checkin` DITERAPKAN ke attendance_dev dan attendance_test. Grants Attendance dan Media dev/test diterapkan; kredensial runtime baru tersimpan dalam .env.database/.env.media ignored.
- Host memory sering CRITICAL (1-2 GB). Jalankan suite berat satu per satu; Playwright 1 worker terbukti stabil.
- Pemeriksaan handoff 2026-10-02: container Docker MySQL 127.0.0.1:3307 dan AIStor 127.0.0.1:9000-9001 aktif. Pemeriksaan akhir T21: kelima backend 3000–3004 dan kedua portal 5173/5174 aktif; health backend 200. Rincian proses terkini di checkpoint T21. Port proyek: MySQL 3307, Gateway 3000, Auth 3001, Employee 3002, Attendance 3003, Media 3004, Attendance Web 5173, HR Web 5174.

## Satu pekerjaan aktif

| Task/subtask | Pemilik/sesi | Scope file | Dependensi | Proses/port | Status |
| --- | --- | --- | --- | --- | --- |
| T21 — Check-in ujung ke ujung | Codex aktif | Attendance, Employee internal, Media binding, Gateway, attendance-web, Prisma, docs/sdd/attendance-checkin.md | T16/T17 dan implementasi T20 tersedia; manual T20 tetap pending | Backend 3000–3004; portal 5173/5174; MySQL 3307, AIStor 9000/9001 | Verifikasi teknis selesai; manual perangkat masih pending |

Isi satu baris saat mulai increment. Hanya satu agen aktif dan satu task/increment berjalan. Sebelum pindah, catat diff, proses/port dan langkah berikut; agen penerus memeriksa Git/source terlebih dahulu.

## Perubahan yang belum di-commit

Baca git status/diff sebagai sumber fakta. Folder .agents/, .claude/, .kiro/, .windsurf/ dan skills-lock.json adalah berkas lokal; jangan di-stage, dihapus atau diubah tanpa scope jelas. Rahasia dan data pribadi tetap ignored.

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

1. **T21 teknis selesai; berikut T22 checkout** sesuai dependency plan. Checklist manual T20/T21 tetap perlu penerimaan perangkat/API nyata dan tidak boleh dianggap lulus dari fixture sintetis. Reuse intent/outbox dan capture; bedakan operasi CHECK_IN/CHECK_OUT agar satu key tidak mereplay hasil operasi lain. Pertahankan replay T21 yang sudah tersimpan. Satu increment aktif, tanpa subagen.
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
