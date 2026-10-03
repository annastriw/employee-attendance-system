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
Revisi pengguna 2026-10-03: commit/push setiap increment terverifikasi pada branch fitur dari dev, integrasi melalui PR ke dev, lalu PR dev ke main untuk rilis production. Origin tetap [annastriw/employee-attendance-system](https://github.com/annastriw/employee-attendance-system). Satu environment online main (5 karyawan + 1 HR), tanpa deployment dev/preview. [Workflow CI/CD](../docs/development/ci-cd-workflow.md) menetapkan gate dan status implementasi; CD masih bagian T30 yang belum aktif. Increment transisi kebijakan dari checkout dev memakai otorisasi sebelumnya; increment berikutnya menggunakan branch fitur.
Rahasia tetap lokal, .env.example tanpa nilai asli, dokumentasi aman di GitHub.

## Penyederhanaan yang disetujui (revisi 2026-10-01)
Pengguna menyetujui penyederhanaan pelaksanaan dengan syarat struktur proyek tetap: satu monorepo, lima service NestJS (API Gateway, Auth, Employee, Attendance, Media) dengan proses/port berbeda, dan dua frontend React TypeScript (Attendance Portal dan HR Portal). Backend tidak digabung menjadi satu service. MySQL, AIStor Free, dua project Vercel, VPS Ubuntu dan Cloudflare tetap sesuai baseline. UI/UX tetap mengikuti spesifikasi disetujui: modern, elegan, minimalis, netral zinc dengan aksen emerald (revisi 2026-10-01), HeroUI via MCP dan komponen custom, Atomic Design, responsif, teks seperlunya.

- T01–T31 adalah satu backlog utama. UX01–UX07 bukan task kerja terpisah, melainkan pemetaan layar (E01–E09/H01–H14) ke task T10–T31 untuk keterlacakan frontend.
- Dokumentasi diringkas menjadi spesifikasi modul + acceptance terkait; hindari dokumen berulang untuk CRUD kecil. Tulis module spec hanya saat menambah/mengubah perilaku, bukan satu dokumen per endpoint.
- Setiap fitur diselesaikan ujung ke ujung: schema/kontrak → API → UI → test → review → commit, sebelum pindah task.
- Gunakan pola bersama untuk form, daftar, detail dan konfirmasi. Komponen Atomic Design dipisah hanya berdasarkan tanggung jawab atau penggunaan ulang nyata, bukan abstraksi dini.
- Tunda abstraksi generik; gunakan controller/DTO/service dan Prisma sesuai kepemilikan data tiap service.
- Outbox/retry dibatasi pada alur yang membutuhkan konsistensi lintas service (provisioning akun+profil, media READY→attendance). Idempotensi, kompensasi dan pemulihan yang diwajibkan baseline tetap dipenuhi.
- Test terfokus per perubahan; browser manual per fitur selama development. Suite seluruh repo hanya checkpoint lintas package yang relevan/rilis; regresi browser otomatis sebelum rilis saat resource tersedia. Prioritas: aturan bisnis, otorisasi, revokasi, lokasi wajib, pemulihan.

### Tier test (biaya vs nilai) — disetujui 2026-10-02
Revisi percepatan disetujui pengguna pada 2026-10-02 setelah T13: RAM lokal terbatas dan pengulangan suite memperlambat development. Aturan berikut menjadi acuan; test yang sudah ada tetap disimpan.

| Tier | Isi | Kapan dijalankan |
| --- | --- | --- |
| 1. Statis | Typecheck dan lint package/berkas terkait | Sebelum commit perubahan kode/config terkait. Dokumentasi saja cukup isi, tautan dan diff. |
| 2. Test terfokus | Unit, komponen atau kontrak HTTP untuk logika dan interaksi terdampak | Saat mengubah perilaku; sertakan pemakai/dependensi yang berisiko. Test baru menguji validasi, transisi state dan aturan bisnis, bukan hanya teks, ikon atau markup statis. |
| 3. Visual | Halaman yang berubah pada 320/1440 px, terang/gelap | Hanya saat layout/CSS berubah; tambah 768/1024 px jika breakpoint berubah. Gunakan test:ui terfilter atau pemeriksaan browser tercatat. Shell/token bersama mencakup pemakai terdampak. Seluruh portal tidak diulang pada setiap fitur/checkpoint. |
| 4. Integrasi backend | API terhadap MySQL; AIStor bila digunakan | Setelah fitur lengkap atau saat perubahan memengaruhi constraint, transaksi, otorisasi, revokasi, idempotensi atau pemulihan. Bukti aturan bisnis dan data nyata tetap wajib. |
| 5. Browser nyata | Checklist manual per fitur melalui backend nyata | Default selama development. Catat langkah, hasil, tanggal dan penguji; fitur ditutup setelah acceptance nyata lulus. E2E browser otomatis ditunda ke regresi sebelum rilis saat resource tersedia. |

- Loop development: selesaikan perubahan logis → typecheck/lint + test perilaku terdampak → review → commit/push branch fitur → PR ke dev. Satu commit per perubahan logis lengkap, bukan per berkas atau potongan kecil. Perubahan berkaitan boleh mencakup kode, test dan dokumentasi; jangan mencampur pekerjaan yang tidak berkaitan.
- Integrasi backend dan checklist browser dijalankan setelah fitur lengkap; bukan gate setiap commit. Gunakan fixture terpisah untuk test otomatis. Akun development hanya untuk checklist manual yang disetujui; jangan menjalankan cleanup fixture destructive pada development.
- Jangan membuat atau memperluas harness E2E browser setiap fitur selama development. Simpan suite yang ada; siapkan cakupan regresi core journeys sebelum rilis. Hasil manual tidak boleh ditulis sebagai hasil Playwright.
- Build package terkait saat bundling/startup berubah. Build dist backend yang berubah sebelum pengujian memakai dist. Build/lint/test seluruh monorepo hanya pada checkpoint yang relevan terhadap integrasi lintas package dan sebelum promosi main.
- Jangan mengulang pemeriksaan lulus tanpa perubahan source/dependensi/config/lingkungan terkait, kegagalan atau risiko baru. Reuse bukti yang masih berlaku dan catat scope hasil.
- Suite berat serial. Periksa resource_status bila tersedia atau RAM OS; Playwright satu worker. Regresi E2E browser otomatis dijalankan sebelum rilis ketika resource memadai, per spec agar limit Auth tidak terkena gabungan suite. Limit login/refresh tidak dilonggarkan.
- Ketika schema berubah, verifikasi migration/schema/constraint/grants tetap wajib: diff migrations→schema exit 0 dan penerapan dev/test sesuai runbook.
- Dokumentasi cukup module spec + acceptance dan progress singkat. Perbarui runbook bila perintah/setup berubah; hindari dokumen per endpoint dan penyalinan bukti ke banyak tempat.
- Reuse pola form/daftar/detail yang ada. Tunda abstraksi generik, refactor, polesan tambahan dan tooling baru yang tidak diperlukan acceptance fitur.

Bukti kritis tetap wajib: aturan bisnis absensi (late/early/cutoff), otorisasi role, revokasi sesi, unik/konflik data, lokasi wajib, keamanan foto, idempotensi check-in/out/provisioning, pemulihan/kompensasi. Pertahankan test otomatis untuk aturan tersebut. Acceptance MySQL/AIStor dan kamera/lokasi memakai layanan/perangkat nyata sesuai fitur. Test lama tidak dihapus; frekuensi eksekusi dan test baru yang redundan dikurangi.

- Gunakan tooling yang ada; tunda tambahan broker/cache/orchestration/build system tanpa kebutuhan nyata.
- Spike kamera/lokasi (T18) dijadwalkan lebih awal secara serial setelah prasyarat T07 siap.

Catatan struktur aktual: packages/contracts dan packages/config belum dibuat; dibuat saat task pertama yang membutuhkannya (kontrak Employee pada T10). packages/ui dan packages/database sudah ada.

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

Definisi selesai lokal: seluruh capability frontend, backend, database/storage dan integrasi sesuai baseline, termasuk E01–E09/H01–H14, API nyata, keamanan/pemulihan, build/lint/test, CI dan runbook/artefak deployment. Artefak live disiapkan sampai akses/rilis tersedia; hasil live tidak diklaim sebelum pengujian nyata. Commit/push branch fitur dan PR ke dev pada repository pilihan pengguna; rilis production melalui PR dev ke main.

## Pengerjaan serial dan kelanjutan lintas sesi
Scope tetap seluruh T01–T31: dua frontend, lima service, kontrak/API/Swagger, database/storage, keamanan, testing, CI dan deployment. Pengguna menetapkan dua agen bergantian karena keterbatasan sesi; hanya satu agen aktif, tanpa subagen/coding paralel.

Kerjakan satu increment sesuai dependensi: kontrak/schema terkait → API → UI → test/integrasi → review/commit. Pilih task berikut yang siap setelah increment ditutup. Jika terhalang akses, catat kendala lalu kerjakan satu task lain yang siap. Spike kamera/lokasi boleh dijadwalkan lebih awal secara serial setelah fondasi terkait siap.

Sebelum batas sesi, update [progress](progress.md) dan berikan prompt trigger ringkas sesuai [alur implementasi](../docs/development/implementation-workflow.md). Pengguna memilih waktu pindah. Agen berikut memeriksa checkpoint/Git/source/proses dan meneruskan progres tanpa mengulang proyek. Jangan mengarang kuota ketika informasi kapasitas tidak tersedia.
