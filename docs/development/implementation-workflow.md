# Alur implementasi dan kelanjutan pekerjaan

Tanggal: 2026-10-01. Seluruh pekerjaan berlanjut dalam repo lokal yang sama sesuai plan. Agen atau alat yang digunakan dapat berganti ketika kapasitas sesi/token habis; spesifikasi, source, Git dan catatan progres tetap menjadi sumber kebenaran bersama. Pergantian alat tidak mengubah arah proyek, lingkup, kebutuhan atau definisi selesai.

## Tujuan dan urutan membaca

Selesaikan seluruh proyek sesuai T01–T31: frontend Attendance/HR, lima service NestJS, kontrak API/Swagger, schema dan migration MySQL, AIStor Free, keamanan, pengujian, CI dan deployment. Frontend mengikuti spesifikasi UI/UX, sedangkan backend/data/infrastruktur mengikuti baseline dan module specs/ADR. Jalur yang independen dapat berjalan paralel; integrasi mengikuti dependensi dan acceptance.

1. [AGENTS.md](../../AGENTS.md): instruksi kerja, Git dan data.
2. [Baseline](../requirements/baseline.md): aturan seluruh proyek.
3. [Plan](../../tasks/plan.md), [todo](../../tasks/todo.md) dan [progress](../../tasks/progress.md): dependensi, status, pekerjaan aktif dan titik lanjut.
4. Spesifikasi/ADR terkait task; untuk frontend [UI/UX](../sdd/frontend-ui-ux.md) dan [design system](../sdd/frontend-design-system.md).
5. Source/test/runbook: [Auth](../sdd/auth-service.md), [HR lokal](../deployment/hr-local.md), [tooling](../architecture/adr-002-project-tooling.md), [deployment](../architecture/adr-003-repository-and-deployment.md), [storage](../architecture/adr-001-object-storage.md).

Setelah inventaris awal, gunakan context engineering untuk memuat bagian spec/source terkait increment. Jika module spec belum ada, lengkapi sesuai T01 sebelum perubahan perilaku terkait. Update spec ketika keputusan berubah.

## Keadaan awal yang perlu diperiksa ulang

- Auth/Gateway, seed HR, forced password, sesi/revokasi dan login HR tersedia dengan pengujian sebelumnya.
- HR masih ringkasan kosong/menu akun; Attendance masih placeholder; domain bisnis belum lengkap.
- Token/theme/AuthShell ada di packages/ui; pnpm workspace dan Atomic Design dipertahankan.
- MySQL dev/test masih schema terpisah pada satu instance; container testing khusus belum tersedia. AIStor Compose ada; verifikasi layanan yang benar-benar aktif.
- T08/T09 selesai; beberapa induk fondasi belum ditutup. Audit bukti source/test sebelum mencentang.
- Branch dev; belum ada remote saat penulisan. Pengguna menentukan GitHub kemudian; jangan membuat/memilih remote sendiri.
- Tabel status awal adalah snapshot, bukan asumsi permanen. Status terbaru dibaca dari Git, todo dan progress.

## Jalur kerja paralel sesuai dependensi

T01–T31 tetap backlog utama; UX01–UX07 merupakan keterlacakan layar, bukan pembatas scope atau pengganti plan.

| Jalur | Pekerjaan | Batas integrasi |
| --- | --- | --- |
| Kontrak dan database | Module specs, DTO/response/error, schema/migration, grants, outbox | Kontrak provider disepakati sebelum consumer; schema/migration terpusat hanya satu pemilik aktif |
| Backend bisnis | Employee/Auth lifecycle, Attendance policy/events, Media, Gateway | Mengikuti dependency task; akses lintas service melalui kontrak, bukan query lintas tabel |
| Frontend | Dua portal, shared UI, form/list/detail, kamera/lokasi/Leaflet | Layout/component test dapat berjalan terhadap kontrak yang jelas; fitur selesai wajib API nyata |
| Pengujian dan kualitas | Unit/API/component, integration/E2E, fault injection, review UI/accessibility | Test tumbuh bersama slice; backend/frontend tidak menunggu akhir proyek untuk diuji |
| Infrastruktur dan rilis | Data testing, service health, Compose, CI, deploy config, runbook/backup | Artefak aman dapat disiapkan lebih awal; perubahan live mengikuti akses, verifikasi dan rilis |

Contoh pembagian yang sesuai plan:
- Setelah fondasi terkait terverifikasi, backend master dan UI master dapat dikerjakan bersamaan pada kontrak yang sama, kemudian diintegrasikan untuk T10/T11.
- Spike kamera/lokasi T18 dapat berjalan bersamaan dengan jalur master/akun setelah prasyarat T07 terkait siap; tidak perlu menunggu seluruh UI HR selesai.
- Setelah T13 dan kontrak terkait siap, Media T19 dapat berjalan bersama policy/kalender T16/T17; Capture T20 menunggu hasil T18/T19 untuk integrasi nyata.
- Persiapan form, test, dokumentasi dan deployment dapat berjalan saat service lain dikerjakan; completion task tetap mensyaratkan semua dependensi dan verification.
- Jangan paralelkan dependent mutations, penerapan migration, perubahan lockfile atau commit pada working tree yang sama.

## Koordinasi pada satu repo lokal

- Sebelum mulai, periksa git status/diff, task aktif, file yang sedang disentuh, proses/port dan checkpoint. Pertahankan perubahan pengguna/agen lain.
- Daftarkan task, pemilik/identitas sesi, file scope dan dependensi di tasks/progress.md sebelum kerja paralel. Agen baru tidak mengerjakan task yang masih aktif milik sesi lain tanpa koordinasi.
- Jalur paralel memakai scope file terpisah. Perubahan packages/contracts, packages/database, shared UI, manifests/lockfile dan config test dibagi lebih kecil dan dikoordinasikan.
- Satu pemilik mengelola schema/migration untuk MySQL. Satu pemilik melakukan operasi Git yang mengubah index/branch/commit/push pada satu working tree pada satu waktu.
- Jangan mematikan proses milik sesi lain, memakai port test yang sama, atau mengubah data/env test bersama tanpa koordinasi. Catat port/proses yang dijalankan.
- Jika alat berganti secara bergiliran, tutup task/sesi lama dengan checkpoint. Jika terputus mendadak, agen baru memeriksa fakta disk dan proses sebelum mengambil alih; tidak menganggap proses lama sudah berhenti.
- Jika hanya satu agen tersedia, interleave jalur yang siap dan selesaikan slice bertahap; jangan mengklaim eksekusi paralel yang tidak terjadi.

## Checkpoint dan pergantian sesi

tasks/todo.md menyimpan status/acceptance task; tasks/progress.md menyimpan titik lanjut, kepemilikan aktif, verifikasi dan kendala. Git menyimpan riwayat perubahan. Ketiganya harus selaras.

Sebelum sesi berakhir atau berganti alat, catat:
1. Task/subtask terakhir yang selesai dan commit terkait bila sudah ada.
2. Perubahan belum di-commit: file, maksud dan pemeriksaan yang masih diperlukan.
3. Task aktif, pemilik, proses/port dan dependensi yang belum terpenuhi.
4. Perintah test yang benar-benar dijalankan, hasil dan pemeriksaan manual yang tertunda.
5. Langkah berikutnya yang konkret dan kendala yang membutuhkan akses/keputusan pengguna.

Checkpoint tidak boleh berisi password, token, private key, signed URL, foto/data pribadi atau nilai .env. Agen berikutnya membaca checkpoint lalu memeriksa Git/source untuk melanjutkan, bukan mengulang pekerjaan yang selesai.

## Pelaksanaan sampai selesai

- Keputusan rutin dalam scope yang telah diarahkan tidak perlu persetujuan ulang setiap task.
- Gunakan skills relevan yang tersedia: SDD, context engineering, incremental implementation, API/frontend, TDD bisnis, browser testing, security, review, CI/deployment dan Git.
- MCP HeroUI untuk API/source/styles versi terpasang; MCP browser jika tersedia. Jika gagal, catat hasil dan gunakan docs resmi/source package serta Playwright untuk pekerjaan yang dapat diteruskan.
- Implementasikan vertical slice dengan API/MySQL/AIStor nyata. Mock hanya untuk component tests/prototipe dengan konteks jelas.
- Selesaikan detail teknis terbuka melalui spike/docs/test dan catat keputusan. Tanyakan spesifik hanya jika perubahan kebutuhan/akses dibutuhkan; lanjutkan task independen.
- Pertahankan scope baseline: tanpa export/cuti/geofence/face matching/hard delete/admin tambahan/edit fakta absensi.
- Setiap perubahan logis: test relevan → review diff/stage file terkait → commit berprefix pada dev. Push ke remote pilihan pengguna jika tersedia; jika belum, commit lokal berjalan dan push tertunda.
- Perbarui todo/progress/spec/runbook bersama slice. Jangan menghapus failing tests atau menurunkan acceptance agar tampak selesai.
- Teruskan task yang siap sampai seluruh plan terpenuhi. Kapasitas sesi habis ditangani dengan checkpoint, bukan perubahan scope menjadi frontend saja.

## Verifikasi

Dari root repo, periksa package.json dan runbook sebelum menjalankan. Jangan menampilkan kredensial.

~~~powershell
pnpm run build
pnpm run lint
pnpm run test
~~~

Perintah root menjalankan script yang tersedia; tidak membuktikan package tanpa test sudah diuji. Jalankan pemeriksaan terfokus dan E2E yang tidak termasuk script root:

~~~powershell
pnpm db:validate
pnpm db:generate
pnpm db:migrate:test
pnpm db:verify
pnpm --dir apps/hr-web run test:ui
pnpm --dir apps/hr-web run test:e2e
~~~

- Siapkan MySQL/AIStor test dan build service sesuai runbook sebelum integration/E2E. Jangan menerapkan destructive fixture pada dev/production.
- Frontend: Vitest + RTL + Playwright; lengkapi harness Attendance yang belum tersedia.
- Backend: Jest + @nestjs/testing + Supertest; verifikasi waktu/eligibility, otorisasi, revokasi, idempotensi, snapshot, konflik dan pemulihan service.
- Database/storage: migration/constraint/grants, upload READY, otorisasi foto, persistensi, outbox/deduplikasi dan cleanup orphan.
- Core journeys: provisioning → forced password/login → check-in/out foto+lokasi → history/monitoring → delete/restore, lifecycle/reset dan kegagalan/retry.
- UI: screenshot/keyboard/filter/pagination pada viewport sasaran; kamera/blink/lokasi pada perangkat nyata dicatat terpisah dari simulasi.
- CI/deploy: build/test, dua Vercel, lima service di VPS Ubuntu, MySQL/AIStor, Cloudflare/HTTPS, backup/restore/rollback sesuai plan.

## Definisi selesai seluruh proyek

Selesai lokal mensyaratkan semua capability sesuai baseline dan task terkait, seluruh layar E01–E09/H01–H14 terintegrasi, data/storage nyata, pengujian relevan lulus, security/recovery terverifikasi, CI serta runbook/artefak deployment siap. Dokumentasi atau dummy UI tidak menggantikan fitur.

Live hanya selesai setelah DNS/HTTPS, dua frontend, seluruh service, database/storage, kamera/lokasi dan core journeys terverifikasi live. Jika akses/rilis belum tersedia, selesaikan semua artefak independen dan catat kebutuhan tersisa; main tetap mengikuti tahap rilis pengguna.
