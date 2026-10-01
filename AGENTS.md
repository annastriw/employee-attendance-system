# Instruksi proyek

## Sumber spesifikasi
- Ikuti docs/requirements/baseline.md untuk keputusan yang disetujui.
- Ikuti tasks/plan.md dan tasks/todo.md untuk urutan kerja dan verifikasi.
- Perbarui spesifikasi jika keputusan pengguna berubah.

## Commit dan push — instruksi pengguna
- Setelah setiap perubahan logis selesai dan verifikasi relevan lulus, buat commit dan push ke repository GitHub proyek.
- Aturan mencakup kode, dokumentasi, konfigurasi, dan pengujian; jangan menumpuk perubahan yang tidak berkaitan.
- Kerjakan development di branch dev. Branch main digunakan untuk production; jangan push hasil development langsung ke main.
- Gunakan pesan commit jelas dengan prefix feat, fix, docs, test, refactor, atau chore.
- Periksa diff dan berkas yang akan di-stage sebelum commit. Stage hanya berkas terkait pekerjaan.
- Jangan commit .env, kredensial, token, private key, backup, data/foto karyawan, dependency terinstal, atau hasil build.
- Jalankan pemeriksaan sesuai perubahan. Untuk dokumentasi, periksa isi dan tautan; jangan mengklaim test aplikasi sudah berjalan bila belum tersedia.
- Jangan force push atau menghapus perubahan pengguna.
- Jika remote, autentikasi, atau Git belum tersedia, laporkan penghalangnya secara akurat. Jangan mengklaim commit/push berhasil.
- Persetujuan commit dan push ke dev telah diberikan pengguna; tidak perlu meminta izin ulang untuk setiap perubahan.
- Pengguna menunda penentuan repository GitHub. Pengembangan dan commit lokal di dev tetap berjalan; push ditunda sampai pengguna menentukan remote. Jangan membuat atau memilih repository GitHub sendiri.
- Promosi ke main mengikuti tahap rilis, verifikasi, dan instruksi pengguna.

## Cara kerja
- Gunakan SDD, context engineering, implementasi bertahap, dan skills relevan.
- Jaga struktur monorepo dan Atomic Design frontend.
- Gunakan test yang relevan untuk aturan bisnis dan alur pengguna.

## Object storage
- Gunakan MinIO AIStor Free, bukan MinIO Community. Jalankan melalui Docker Compose pada lokal dan VPS; ikuti docs/architecture/adr-001-object-storage.md. Jangan commit berkas lisensi atau data volume.

## Tema frontend
- Semua frontend wajib mengikuti docs/sdd/frontend-design-system.md. Gunakan token dan komponen packages/ui, HeroUI, Atomic Design; pertahankan tema monokrom dengan tombol charcoal, teks seperlunya, modern, elegan, minimalis dan mudah dipahami pada halaman berikutnya.

## Desain UI/UX dan kelanjutan pekerjaan
- Ikuti docs/sdd/frontend-ui-ux.md untuk konsep seluruh halaman, alur, states dan acceptance; bukan hanya warna atau halaman login.
- Seluruh implementasi mengikuti docs/development/implementation-workflow.md serta tasks/plan.md dan tasks/todo.md. Checklist UX01–UX07 hanya keterlacakan frontend, bukan pembatas scope proyek.
- Arahan desain telah diberikan pengguna; lanjutkan increment dalam scope tanpa meminta persetujuan rutin berulang. Keputusan bisnis baru dan akses eksternal yang belum tersedia ditangani secara spesifik.

- Frontend, backend/service, database/storage, testing, CI dan deployment tetap termasuk scope. Kerjakan serial sesuai dependency plan. Hanya dua agen bergantian, satu agen aktif pada satu waktu; jangan menjalankan subagen atau coding paralel.
- Catat satu task/increment aktif, file terkait dan proses/port dalam tasks/progress.md. Sebelum berganti agen, periksa diff dan proses yang masih berjalan; jangan menimpa pekerjaan sesi sebelumnya.
- Saat sesi mendekati batas kapasitas, selesaikan increment yang aman, verifikasi/commit perubahan yang selesai, update tasks/progress.md dan berikan prompt trigger singkat untuk agen berikutnya. Jika kapasitas tidak dapat dibaca, jangan mengarang sisa kuota. Pergantian dilakukan pengguna; agen berikut membaca Git/source/task aktual dan melanjutkan serial. Batas sesi tidak mengubah scope atau berarti proyek selesai.
