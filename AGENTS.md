# Instruksi proyek

## Sumber spesifikasi
- Ikuti docs/requirements/baseline.md untuk keputusan yang disetujui.
- Ikuti tasks/plan.md dan tasks/todo.md untuk urutan kerja dan verifikasi.
- Perbarui spesifikasi jika keputusan pengguna berubah.

## Commit dan push — instruksi pengguna
- Setelah setiap perubahan logis lengkap dan verifikasi relevan lulus, buat satu commit dan push ke repository GitHub proyek. Gabungkan berkas kode/test/dokumentasi yang berkaitan dalam perubahan tersebut; hindari commit per berkas/potongan kecil.
- Aturan mencakup kode, dokumentasi, konfigurasi, dan pengujian; jangan menumpuk perubahan yang tidak berkaitan.
- Keputusan terbaru 2026-10-03: hanya branch dev dan main. Coding, commit dan push langsung ke dev; uji lokal lalu PR dev repository ini ke main saat siap rilis. Main untuk production, tanpa deployment dev/preview. Ikuti [workflow CI/CD](docs/development/ci-cd-workflow.md).
- Gunakan pesan commit jelas dengan prefix feat, fix, docs, test, refactor, atau chore.
- Periksa diff dan berkas yang akan di-stage sebelum commit. Stage hanya berkas terkait pekerjaan.
- Jangan commit .env, kredensial, token, private key, backup, data/foto karyawan, dependency terinstal, atau hasil build.
- Jalankan pemeriksaan sesuai perubahan. Untuk dokumentasi, periksa isi dan tautan; jangan mengklaim test aplikasi sudah berjalan bila belum tersedia.
- Jangan force push atau menghapus perubahan pengguna.
- Jika remote, autentikasi, atau Git belum tersedia, laporkan penghalangnya secara akurat. Jangan mengklaim commit/push berhasil.
- Persetujuan commit/push perubahan terverifikasi ke dev tetap berlaku; tidak perlu izin ulang. Merge/rilis main mengikuti instruksi rilis pengguna.
- Repository public tetap [annastriw/employee-attendance-system](https://github.com/annastriw/employee-attendance-system), origin https://github.com/annastriw/employee-attendance-system.git. Push perubahan development ke dev. Main hanya melalui PR rilis; CD belum aktif sampai artefak/akses T30 siap.
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
- Revisi efisiensi 2026-10-03 menggantikan frekuensi testing sebelumnya: development memakai unit test untuk logika berubah dan lint/typecheck package terkait; UI, responsivitas serta alur API nyata diperiksa manual. Tidak perlu Playwright, test visual otomatis atau suite integrasi penuh setiap fitur/deploy. Simpan test lama; jalankan integrasi tambahan hanya bila diperlukan untuk mendiagnosis masalah atau atas permintaan pengguna. Saat schema berubah, verifikasi migration/grants pada database lokal dan lakukan backup sebelum migration production. PR main menjalankan lint, build/typecheck dan unit test; deployment cukup image build dan health check. Jangan ulang pemeriksaan lulus tanpa perubahan/risiko baru. Dokumentasi cukup spec/acceptance dan progress ringkas; tidak menambah harness/tooling tanpa kebutuhan nyata.
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
