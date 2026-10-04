# Plan perapian repository

Keputusan pengguna, 2026-10-04: kerjakan serial; README Inggris, SDD/panduan Indonesia; dua branch dev/main; akun demo publik; rapikan history dengan mempertahankan tanggal dan waktu sumber.

## Tujuan

Repository mudah dipahami dari README, dapat dijalankan dari clone bersih, dan mempunyai spesifikasi ringkas sesuai implementasi. Runtime, migration, data live, dan perilaku aplikasi tidak diubah oleh perapian dokumentasi.

## Tahap serial

1. **Inventaris, backup, audit**: fetch kedua branch; simpan bundle Git dan metadata commit di `.local/` yang diabaikan Git; audit tracked files dan seluruh blob history untuk secret. Catat kandidat penghapusan sebelum menghapus.
2. **Dokumentasi produk dan lokal**: README, fitur per portal, quick start lengkap berdasarkan scripts/config aktual, login demo publik, diagram arsitektur.
3. **Database, API, SDD**: ERD fisik dan hubungan logis antarservice sesuai schema; kontrak API dari controller; konsolidasikan SDD menjadi Auth, Employee, Attendance, Media, Recovery dan frontend. Pertahankan ADR yang penting.
4. **Pembersihan dan metode**: gabungkan panduan duplikat, buang checkpoint sementara yang usang, perbarui semua referensi; jelaskan SDD, Agile Kanban, testing terfokus dan CI/CD. Pertahankan source, migration, tests, scripts operasional dan asset runtime.
5. **Verifikasi dan history**: pemeriksaan tautan/diagram/command, diff dan source tree; kurasi milestone commit. Author/committer/date asli diambil dari endpoint kelompok commit; dokumentasi baru bertanggal aktual. Simpan pemetaan SHA lama/baru privat. Jangan mengarang tanggal atau hasil tes.
6. **Sinkronisasi GitHub**: update About/topics/website; gunakan force-with-lease pada dev/main dengan expected SHA yang telah dibaca; cocokkan tree remote dan lokal. Perubahan ruleset hanya jika diperlukan dan dapat dipulihkan. Catat hasil aktual dan batasan.

## Izin dan batas

- Pengguna menyetujui satu kali rewrite history dan force push dev/main untuk perapian ini. Larangan force push tetap berlaku untuk pekerjaan harian berikutnya.
- Demo login yang sengaja dipublikasikan: HR `hr@testcompany.com`, Employee `john.doe@testcompany.com`; password keduanya `TestCompany123`. Nilai ini tidak sama dengan izin mempublikasikan JWT, DB, storage, SSH atau lisensi.
- Jangan reset password/data live hanya untuk menyelaraskan dokumentasi; kredensial demo adalah nilai yang diberikan pengguna.
- Berkas untracked milik pengguna `.agents/`, `.claude/`, `.kiro/`, `.windsurf/`, `skills-lock.json` tidak dihapus/stage. Tidak menjalankan subagen.
- Tidak mengeklaim restore backup/load test selesai; pengguna menunda pekerjaan operasional itu.
- Enam jam merupakan ruang waktu kerja yang diminta, bukan alasan menambah scope atau menunggu jika pekerjaan selesai lebih cepat. Handoff mencatat langkah aktual agar sesi lain dapat melanjutkan.

## Verifikasi

Dokumentasi: isi, relative links, diagram Mermaid, command terhadap package scripts dan config. Penghapusan: cek referensi/import/scripts terlebih dahulu. Perubahan logika bila diperlukan: unit terfokus, integrasi cepat bila relevan; UI manual pengguna. Rewrite: tree aplikasi/migration sama dengan sebelum cleanup, author/date milestone cocok metadata backup. GitHub: status push/API dibuktikan, bukan diasumsikan.
