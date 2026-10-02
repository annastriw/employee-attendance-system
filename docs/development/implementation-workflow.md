# Alur implementasi dan kelanjutan pekerjaan

Tanggal: 2026-10-01. Seluruh pekerjaan berlanjut dalam repo lokal yang sama sesuai plan. Agen atau alat yang digunakan dapat berganti ketika kapasitas sesi/token habis; spesifikasi, source, Git dan catatan progres tetap menjadi sumber kebenaran bersama. Pergantian alat tidak mengubah arah proyek, lingkup, kebutuhan atau definisi selesai.

## Tujuan dan urutan membaca

Selesaikan seluruh proyek sesuai T01–T31: frontend Attendance/HR, lima service NestJS, kontrak API/Swagger, schema dan migration MySQL, AIStor Free, keamanan, pengujian, CI dan deployment. Frontend mengikuti spesifikasi UI/UX, sedangkan backend/data/infrastruktur mengikuti baseline dan module specs/ADR. Seluruh pekerjaan berjalan serial sesuai dependensi dan acceptance. Hanya dua agen bergantian, satu aktif pada satu waktu; tidak ada subagen/coding paralel.

1. [AGENTS.md](../../AGENTS.md): instruksi kerja, Git dan data.
2. [Baseline](../requirements/baseline.md): aturan seluruh proyek.
3. [Plan](../../tasks/plan.md), [todo](../../tasks/todo.md) dan [progress](../../tasks/progress.md): dependensi, status, pekerjaan aktif dan titik lanjut.
4. Spesifikasi/ADR terkait task; untuk frontend [UI/UX](../sdd/frontend-ui-ux.md) dan [design system](../sdd/frontend-design-system.md).
5. Source/test/runbook: [Auth](../sdd/auth-service.md), [HR lokal](../deployment/hr-local.md), [tooling](../architecture/adr-002-project-tooling.md), [deployment](../architecture/adr-003-repository-and-deployment.md), [storage](../architecture/adr-001-object-storage.md).

Setelah inventaris awal, baca hanya spec/source terkait putaran dan diff terbaru; ulangi konteks umum bila keputusan/dependensi berubah atau bukti bertentangan. Jika module spec belum ada, lengkapi sebelum perubahan perilaku terkait. Update spec ketika keputusan berubah.

## Keadaan awal yang perlu diperiksa ulang

- Auth/Gateway, seed HR, forced password, sesi/revokasi dan login HR tersedia dengan pengujian sebelumnya.
- HR masih ringkasan kosong/menu akun; Attendance masih placeholder; domain bisnis belum lengkap.
- Token/theme/AuthShell ada di packages/ui; pnpm workspace dan Atomic Design dipertahankan.
- MySQL dev/test masih schema terpisah pada satu instance; container testing khusus belum tersedia. AIStor Compose ada; verifikasi layanan yang benar-benar aktif.
- T08/T09 selesai; beberapa induk fondasi belum ditutup. Audit bukti source/test sebelum mencentang.
- Branch dev; origin: [annastriw/employee-attendance-system](https://github.com/annastriw/employee-attendance-system) (public, dipilih pengguna 2026-10-02). Push commit terverifikasi ke dev; deployment tetap tahap terakhir. Jangan membuat/memilih repository lain sendiri.
- Tabel status awal adalah snapshot, bukan asumsi permanen. Status terbaru dibaca dari Git, todo dan progress.

## Pelaksanaan serial sesuai dependensi

T01–T31 adalah backlog utama; UX01–UX07 hanya keterlacakan layar. Ikuti [pelaksanaan per putaran](../../tasks/plan.md#pelaksanaan-per-putaran--disetujui-2026-10-02): selesaikan kontrak/schema → API → UI → test terkait → acceptance/dokumentasi → review/commit sebagai satu perilaku yang dapat digunakan. Reuse pola T10–T13, simpan polesan tambahan untuk T28, kumpulkan checklist browser setelah putaran lengkap, dan jalankan service seperlunya. Pemecahan berdasarkan perilaku/dependensi/risiko, bukan jumlah berkas.

- Dua agen digunakan bergantian untuk mengatasi batas sesi. Jangan menjalankan keduanya bersamaan atau membuat subagen tambahan.
- Pertahankan satu task/increment aktif; catat file, proses/port, dependency dan langkah berikut di tasks/progress.md.
- Integrasi tetap mengikuti graph: master/akun/lifecycle → policy/libur/media/capture → check-in/out → riwayat/monitoring → validasi/rilis.
- Spike kamera/lokasi T18 dapat dijadwalkan sebagai task serial awal setelah prasyarat terkait siap untuk mengurangi risiko, lalu kembali ke task prioritas berikut.
- Schema/migration terpusat, shared packages dan operasi Git dikerjakan agen aktif. Periksa perubahan/proses sesi sebelumnya sebelum mulai.
- Jika task terhalang akses, catat kendala lalu pilih satu task lain yang siap; jangan memulai banyak task sekaligus.

## Checkpoint dan trigger pergantian sesi

tasks/todo.md menyimpan completion/acceptance; tasks/progress.md menyimpan titik lanjut dan Git menyimpan perubahan. Dokumen ini berlaku bagi kedua agen dan tidak menetapkan perpindahan sekarang.

Saat informasi kapasitas yang tersedia menunjukkan sesi mendekati batas, atau pengguna meminta pindah:
1. Hindari memulai increment besar; tutup pekerjaan yang dapat diverifikasi dengan aman.
2. Verifikasi/commit perubahan yang selesai. Jika ada perubahan parsial, jelaskan file, tujuan dan pemeriksaan yang belum dilakukan; jangan menandainya selesai.
3. Update progress: task terakhir, commit, satu task aktif, diff parsial, proses/port, hasil pemeriksaan, kendala dan langkah berikut.
4. Berikan prompt trigger singkat yang merujuk AGENTS.md, tasks/progress.md, tasks/plan.md, tasks/todo.md dan dokumen ini. Sertakan task/commit terakhir yang benar-benar diketahui serta langkah berikut jika tersedia.
5. Pengguna memindahkan pengerjaan ke agen berikut; agen lama tidak terus coding bersamaan. Agen berikut memeriksa disk/Git lalu melanjutkan dari checkpoint.

Jika kuota/batas sesi tidak tersedia, jangan mengarang persentase atau menjanjikan deteksi otomatis. Update checkpoint setiap increment selesai agar perpindahan mendadak tetap dapat dilakukan.

Contoh trigger:
> Baca AGENTS.md, tasks/progress.md, tasks/plan.md, tasks/todo.md dan docs/development/implementation-workflow.md. Periksa Git lalu lanjutkan dari checkpoint terakhir, satu task pada satu waktu, tanpa subagen/paralel. Gunakan skills/MCP terkait, selesaikan API/UI/test sesuai dependensi, commit perubahan terverifikasi pada dev dan update checkpoint. Saat sesi mendekati batas, siapkan trigger berikutnya.

Checkpoint/trigger tidak memuat rahasia, signed URL atau data/foto pribadi. Tidak perlu mengulang seluruh baseline ke dalam prompt.

## Pelaksanaan sampai selesai

- Keputusan rutin dalam scope yang telah diarahkan tidak perlu persetujuan ulang setiap task.
- Gunakan skills relevan yang tersedia: SDD, context engineering, incremental implementation, API/frontend, TDD bisnis, browser testing, security, review, CI/deployment dan Git.
- MCP HeroUI untuk API/source/styles versi terpasang; MCP browser jika tersedia. Jika gagal, catat hasil dan gunakan docs resmi/source package serta Playwright untuk pekerjaan yang dapat diteruskan.
- Implementasikan vertical slice dengan API/MySQL/AIStor nyata. Mock hanya untuk component tests/prototipe dengan konteks jelas.
- Selesaikan detail teknis terbuka melalui spike/docs/test dan catat keputusan. Tanyakan spesifik hanya jika perubahan kebutuhan/akses dibutuhkan; lanjutkan task independen.
- Pertahankan scope baseline: tanpa export/cuti/geofence/face matching/hard delete/admin tambahan/edit fakta absensi.
- Satu perubahan logis lengkap: pemeriksaan relevan → review diff/stage berkas kode/test/dokumentasi terkait → satu commit berprefix dan push ke dev. Hindari commit per berkas/potongan kecil; jangan mencampur pekerjaan tidak berkaitan. Reuse pola yang ada dan tunda abstraksi/refactor/polesan yang tidak dibutuhkan acceptance.
- Catat acceptance di module spec dan update todo/progress secara ringkas. Update runbook hanya bila setup/perintah berubah; hindari dokumen per endpoint dan pengulangan bukti. Simpan test lama dan jangan menurunkan acceptance agar tampak selesai.
- Teruskan task yang siap sampai seluruh plan terpenuhi. Kapasitas sesi habis ditangani dengan checkpoint, bukan perubahan scope menjadi frontend saja.

## Verifikasi

Ikuti [tier test disetujui 2026-10-02](../../tasks/plan.md#tier-test-biaya-vs-nilai--disetujui-2026-10-02). Periksa package.json dan runbook sebelum menjalankan; jangan menampilkan kredensial.

- Per perubahan logis: typecheck/lint package terkait dan test unit/komponen/kontrak HTTP untuk perilaku terdampak. Test UI baru menguji validasi/interaksi, bukan sekadar teks/ikon/markup statis. Dokumentasi saja: isi, tautan dan diff.
- Layout/CSS: hanya halaman terdampak pada 320/1440 px terang/gelap lewat test:ui terfilter atau browser manual tercatat. Tambahkan 768/1024 px bila breakpoint berubah; shell/token bersama mencakup pemakai terdampak. Jangan mengulang seluruh portal setiap fitur/checkpoint.
- Setelah fitur lengkap: integrasi API MySQL/AIStor sesuai risiko dan checklist browser manual melalui backend nyata. Catat langkah, hasil, tanggal dan penguji tanpa rahasia. E2E browser otomatis serta pembuatan/perluasan harness ditunda ke regresi sebelum rilis saat resource tersedia. Simpan harness lama. Suite berat serial, Playwright satu worker; build dist backend yang berubah sebelum test memakai dist.
- Jangan mengulang pemeriksaan lulus tanpa perubahan source/dependensi/config/lingkungan terkait, kegagalan atau risiko baru. Catat bukti sekali di module spec dan referensikan dari progress. Build/lint/test seluruh monorepo hanya pada checkpoint integrasi lintas package yang relevan dan sebelum promosi main; build package terkait saat bundling/startup berubah.

Contoh filter fitur yang sudah tersedia (sesuaikan dengan modul yang diubah):

~~~powershell
pnpm --dir apps/employee-service run test --runInBand positions.service.spec.ts
pnpm --dir apps/hr-web run test src/pages/PositionsPage.test.tsx
~~~

Pada checkpoint lintas package yang relevan dan sebelum rilis, jalankan pemeriksaan menyeluruh berikut beserta suite khusus yang diperlukan. Regresi browser otomatis sebelum rilis dijalankan ketika resource memadai:

~~~powershell
pnpm run build
pnpm run lint
pnpm run test
~~~

Script root hanya memeriksa package yang mempunyai script terkait. Selama development, checklist browser manual adalah bukti perjalanan nyata. Sebelum rilis, regresi Playwright dijalankan per spec sesuai runbook, satu worker dan resource memadai; jangan melonggarkan limit Auth agar suite gabungan lulus. Pemeriksaan schema/migration/grants dijalankan saat schema berubah, termasuk diff migrations→schema exit 0 dan penerapan dev/test:

~~~powershell
pnpm db:validate
pnpm db:generate
pnpm db:migrate:test
pnpm db:verify
~~~

- Siapkan MySQL/AIStor test dan build service sesuai runbook sebelum integration/E2E. Jangan menerapkan destructive fixture pada dev/production.
- Frontend: Vitest + RTL untuk perilaku, pemeriksaan visual terdampak, dan checklist browser manual per fitur. Playwright untuk regresi sebelum rilis; perluasan harness tidak menjadi pekerjaan rutin setiap fitur.
- Backend: Jest + @nestjs/testing + Supertest; verifikasi waktu/eligibility, otorisasi, revokasi, idempotensi, snapshot, konflik dan pemulihan service.
- Database/storage: migration/constraint/grants, upload READY, otorisasi foto, persistensi, outbox/deduplikasi dan cleanup orphan.
- Core journeys: provisioning → forced password/login → check-in/out foto+lokasi → history/monitoring → delete/restore, lifecycle/reset dan kegagalan/retry.
- UI: screenshot/keyboard/filter/pagination pada viewport sasaran; kamera/blink/lokasi pada perangkat nyata dicatat terpisah dari simulasi.
- CI/deploy: build/test, dua Vercel, lima service di VPS Ubuntu, MySQL/AIStor, Cloudflare/HTTPS, backup/restore/rollback sesuai plan.

## Definisi selesai seluruh proyek

Selesai lokal mensyaratkan semua capability sesuai baseline dan task terkait, seluruh layar E01–E09/H01–H14 terintegrasi, data/storage nyata, pengujian relevan lulus, security/recovery terverifikasi, CI serta runbook/artefak deployment siap. Dokumentasi atau dummy UI tidak menggantikan fitur.

Live hanya selesai setelah DNS/HTTPS, dua frontend, seluruh service, database/storage, kamera/lokasi dan core journeys terverifikasi live. Jika akses/rilis belum tersedia, selesaikan semua artefak independen dan catat kebutuhan tersisa; main tetap mengikuti tahap rilis pengguna.
