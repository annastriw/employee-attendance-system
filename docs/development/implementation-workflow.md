# Alur implementasi dan kelanjutan pekerjaan

Tanggal: 2026-10-01. Seluruh pekerjaan berlanjut dalam repo lokal yang sama sesuai plan. Agen atau alat yang digunakan dapat berganti ketika kapasitas sesi/token habis; spesifikasi, source, Git dan catatan progres tetap menjadi sumber kebenaran bersama. Pergantian alat tidak mengubah arah proyek, lingkup, kebutuhan atau definisi selesai.

## Tujuan dan urutan membaca

Selesaikan seluruh proyek sesuai T01–T31: frontend Attendance/HR, lima service NestJS, kontrak API/Swagger, schema dan migration MySQL, AIStor Free, keamanan, pengujian, CI dan deployment. Frontend mengikuti spesifikasi UI/UX, sedangkan backend/data/infrastruktur mengikuti baseline dan module specs/ADR. Seluruh pekerjaan berjalan serial sesuai dependensi dan acceptance. Hanya dua agen bergantian, satu aktif pada satu waktu; tidak ada subagen/coding paralel.

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

## Pelaksanaan serial sesuai dependensi

T01–T31 adalah backlog utama; UX01–UX07 hanya keterlacakan layar. Pilih satu task siap dan satu increment konkret. Kerjakan kontrak/schema yang dibutuhkan → API → UI → test/integrasi → review/commit, lalu lanjutkan increment berikut. Tidak perlu menyelesaikan seluruh backend sebelum mulai frontend.

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
