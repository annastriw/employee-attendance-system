# Instruksi proyek

## Sumber spesifikasi
- Ikuti docs/requirements/baseline.md untuk keputusan yang disetujui.
- Ikuti tasks/plan.md dan tasks/todo.md untuk urutan kerja dan verifikasi.
- Perbarui spesifikasi jika keputusan pengguna berubah.

## Commit dan push — instruksi pengguna
- Setelah setiap perubahan logis lengkap dan verifikasi relevan lulus, buat satu commit dan push ke repository GitHub proyek. Gabungkan berkas kode/test/dokumentasi yang berkaitan dalam perubahan tersebut; hindari commit per berkas/potongan kecil.
- Aturan mencakup kode, dokumentasi, konfigurasi, dan pengujian; jangan menumpuk perubahan yang tidak berkaitan.
- Kerjakan development di branch dev. Branch main digunakan untuk production; jangan push hasil development langsung ke main.
- Gunakan pesan commit jelas dengan prefix feat, fix, docs, test, refactor, atau chore.
- Periksa diff dan berkas yang akan di-stage sebelum commit. Stage hanya berkas terkait pekerjaan.
- Jangan commit .env, kredensial, token, private key, backup, data/foto karyawan, dependency terinstal, atau hasil build.
- Jalankan pemeriksaan sesuai perubahan. Untuk dokumentasi, periksa isi dan tautan; jangan mengklaim test aplikasi sudah berjalan bila belum tersedia.
- Jangan force push atau menghapus perubahan pengguna.
- Jika remote, autentikasi, atau Git belum tersedia, laporkan penghalangnya secara akurat. Jangan mengklaim commit/push berhasil.
- Persetujuan commit dan push ke dev telah diberikan pengguna; tidak perlu meminta izin ulang untuk setiap perubahan.
- Pengguna menentukan repository public [annastriw/employee-attendance-system](https://github.com/annastriw/employee-attendance-system) pada 2026-10-02; origin memakai https://github.com/annastriw/employee-attendance-system.git. Setelah perubahan logis diverifikasi dan di-commit, push ke dev. Jangan membuat/memilih repository lain sendiri. Deployment dikerjakan terakhir sesuai tahap rilis, bukan setelah setiap push.
- Promosi ke main mengikuti tahap rilis, verifikasi, dan instruksi pengguna.

## Cara kerja
- Gunakan SDD, context engineering, implementasi bertahap, dan skills relevan.
- Jaga struktur monorepo dan Atomic Design frontend.
- Gunakan test yang relevan untuk aturan bisnis dan alur pengguna.

## Penyederhanaan disetujui (revisi 2026-10-01)
Struktur tetap: satu monorepo, lima service NestJS (API Gateway, Auth, Employee, Attendance, Media) dengan proses/port berbeda, dua frontend React (Attendance, HR). Jangan menggabungkan backend menjadi satu service. MySQL, AIStor Free, dua project Vercel, VPS Ubuntu dan Cloudflare tetap sesuai baseline.
- T01–T31 satu backlog utama; UX01–UX07 adalah pemetaan layar ke task, bukan pekerjaan terpisah.
- Selesaikan satu fitur ujung ke ujung: schema/kontrak → API → UI → test → review → commit.
- Pakai pola bersama untuk form, daftar, detail dan konfirmasi; pisah komponen Atomic Design hanya atas tanggung jawab atau reuse nyata. Tunda abstraksi generik.
- Gunakan controller/DTO/service dan Prisma sesuai kepemilikan data; batasi outbox/retry pada alur konsistensi lintas service, tetap penuhi idempotensi/kompensasi/pemulihan baseline.
- Ikuti [tier test revisi percepatan 2026-10-02](tasks/plan.md#tier-test-biaya-vs-nilai--disetujui-2026-10-02): typecheck/lint package terkait dan test perilaku terfokus. Hindari test baru yang hanya memeriksa teks/ikon/markup statis. Visual hanya halaman berubah pada 320/1440 px terang/gelap; tambah 768/1024 px jika breakpoint berubah. Selama development, E2E browser memakai checklist manual per fitur melalui backend nyata; E2E browser otomatis ditunda ke regresi sebelum rilis saat resource tersedia. Test integrasi MySQL/AIStor untuk bisnis, otorisasi/revokasi, constraint, idempotensi dan pemulihan tetap wajib. Build/test seluruh repo hanya pada checkpoint lintas package yang relevan dan sebelum main. Jangan ulang pemeriksaan lulus tanpa perubahan/risiko baru; simpan test lama. Suite berat serial, Playwright 1 worker; build dist backend yang berubah sebelum test memakai dist. Dokumentasi cukup module spec + acceptance dan progress; runbook diperbarui jika setup berubah.
- Gunakan tooling yang ada; tunda broker/cache/orchestration/build system tanpa kebutuhan nyata.

## Object storage
- Gunakan MinIO AIStor Free, bukan MinIO Community. Jalankan melalui Docker Compose pada lokal dan VPS; ikuti docs/architecture/adr-001-object-storage.md. Jangan commit berkas lisensi atau data volume.

## Tema frontend
- Semua frontend wajib mengikuti docs/sdd/frontend-design-system.md. Gunakan token dan komponen packages/ui, HeroUI, Atomic Design; pertahankan tema produk modern ala Linear (netral zinc, satu aksen emerald, Geist, ikon Phosphor, mode terang/gelap), teks seperlunya dan mudah dipahami pada halaman berikutnya.

## Desain UI/UX dan kelanjutan pekerjaan
- Ikuti docs/sdd/frontend-ui-ux.md untuk konsep seluruh halaman, alur, states dan acceptance; bukan hanya warna atau halaman login.
- Seluruh implementasi mengikuti docs/development/implementation-workflow.md serta tasks/plan.md dan tasks/todo.md. Checklist UX01–UX07 hanya keterlacakan frontend, bukan pembatas scope proyek.
- Arahan desain telah diberikan pengguna; lanjutkan increment dalam scope tanpa meminta persetujuan rutin berulang. Keputusan bisnis baru dan akses eksternal yang belum tersedia ditangani secara spesifik.

- Frontend, backend/service, database/storage, testing, CI dan deployment tetap termasuk scope. Kerjakan serial sesuai dependency plan. Hanya dua agen bergantian, satu agen aktif pada satu waktu; jangan menjalankan subagen atau coding paralel.
- Catat satu task/increment aktif, file terkait dan proses/port dalam tasks/progress.md. Sebelum berganti agen, periksa diff dan proses yang masih berjalan; jangan menimpa pekerjaan sesi sebelumnya.
- Saat sesi mendekati batas kapasitas, selesaikan increment yang aman, verifikasi/commit perubahan yang selesai, update tasks/progress.md dan berikan prompt trigger singkat untuk agen berikutnya. Jika kapasitas tidak dapat dibaca, jangan mengarang sisa kuota. Pergantian dilakukan pengguna; agen berikut membaca Git/source/task aktual dan melanjutkan serial. Batas sesi tidak mengubah scope atau berarti proyek selesai.
