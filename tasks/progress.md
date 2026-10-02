# Progres bersama dan titik lanjut

Dokumen ini digunakan semua agen/alat pada repo lokal yang sama. Update saat mulai/selesai task, sebelum sesi berganti atau kapasitas sesi habis. Status completion tetap di [todo](todo.md); dependency di [plan](plan.md); prosedur pada [alur implementasi](../docs/development/implementation-workflow.md).

## Snapshot terakhir

- Tanggal: 2026-10-03 (Asia/Jakarta), akhir increment T26. HEAD diverifikasi dengan `git log`; jangan anggap hash di sini sebagai HEAD.
- Tahap: fitur T08–T26 selesai dan diverifikasi; Checkpoint setelah T26 terpenuhi. Increment implementasi berikut T27 Outbox dan pemulihan kegagalan. Fondasi T01–T07/UX01–UX02 masih perlu rekonsiliasi status lama dan isolasi test; T27–T31 tetap belum selesai. T09c tetap menjadi acuan tema.
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
- Branch: dev, tracking origin/dev. Repository public [annastriw/employee-attendance-system](https://github.com/annastriw/employee-attendance-system) dipilih pengguna pada 2026-10-02. Push awal terverifikasi: lokal dan remote dev sama pada 7cd397f. Visibilitas PUBLIC diverifikasi melalui GitHub setelah instruksi pengguna; commit berikut dipush setelah verifikasi, deployment tetap tahap terakhir.
- Database lokal (Docker MySQL 127.0.0.1:3307): migration sampai `20261003020000_attendance_checkin` DITERAPKAN ke attendance_dev dan attendance_test. Grants Attendance dan Media dev/test diterapkan; kredensial runtime baru tersimpan dalam .env.database/.env.media ignored.
- Host memory sering CRITICAL (1-2 GB). Jalankan suite berat satu per satu; Playwright 1 worker terbukti stabil.
- Pemeriksaan handoff 2026-10-02: container Docker MySQL 127.0.0.1:3307 dan AIStor 127.0.0.1:9000-9001 aktif. Port proyek: MySQL 3307, Gateway 3000, Auth 3001, Employee 3002, Attendance 3003, Media 3004, Attendance Web 5173, HR Web 5174.

## Satu pekerjaan aktif

| Task/subtask | Pemilik/sesi | Scope file | Dependensi | Proses/port | Status |
| --- | --- | --- | --- | --- | --- |
| T26 Detail monitoring Leaflet | Antigravity | apps/attendance-service, apps/api-gateway, apps/hr-web, docs/sdd/attendance-leaflet-monitoring.md | T25 selesai | MySQL 3307, AIStor 9000/9001 aktif | Selesai |

Isi satu baris saat mulai increment. Hanya satu agen aktif dan satu task/increment berjalan. Sebelum pindah, catat diff, proses/port dan langkah berikut; agen penerus memeriksa Git/source terlebih dahulu.

## Perubahan yang belum di-commit

Baca git status/diff sebagai sumber fakta. Folder .agents/, .claude/, .kiro/, .windsurf/ dan skills-lock.json adalah berkas lokal; jangan di-stage, dihapus atau diubah tanpa scope jelas. Rahasia dan data pribadi tetap ignored.

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
