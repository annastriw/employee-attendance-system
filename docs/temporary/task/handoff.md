# Titik lanjut serial

## Aktif

C01–C10 selesai. Tidak ada increment perapian tersisa. Agent tunggal, tanpa delegasi. Kerja berikut mengikuti dev lokal → PR main → auto deployment.

## Kondisi awal

- Lokal dev: `b17fa28`; origin/main setelah fetch: `f581f31aa11d757e36aeab7b06936d40bc6f547f`.
- Pengguna membuktikan live API `/health` mempunyai status ok/auth ready dan release sama dengan main f581f31. Auto-deploy backend sudah terbukti.
- Git CLI fetch/push bekerja. Token gh CLI invalid, tetapi API admin tersedia melalui credential manager Git tanpa menampilkan token. About description/homepage/topics sudah diperbarui dan dibaca ulang; ruleset main-production aktif sudah dibackup privat.
- Runtime lokal/VPS tidak dijalankan atau dihentikan oleh perapian ini.
- Untracked tooling milik pengguna jangan distage/dihapus.

## Verifikasi 2026-10-05

- Audit awal 1.196 blob no match; backup bundle --all verified. Snapshot ruleset/About privat.
- Relative link/anchor audit no issue; empat command environment guide diuji pada scratch privat, termasuk no-overwrite.
- Build Attendance dan HR lulus setelah asset unused dihapus. Tujuh unit detector lulus (red/green kasus service README cleanup).
- Business source/migrations sama dengan main awal; hanya README/asset tanpa referensi dihapus pada apps. Detector mengabaikan markdown agar cleanup tidak memicu backend deployment.
- Backup/model/source/test runtime tidak dihapus. Tidak menjalankan service/DB/VPS dari perapian.
- History main lama 145 commit menjadi 26 snapshot milestone, dengan tree dan seluruh metadata author/committer sumber sama; ditambah satu commit penutupan bertanggal aktual. Bundle lengkap dan mapping pemulihan ada di `.local/repository-cleanup/` dan tidak dipush.
- Dev/main lokal dan remote sama; default main, hanya dua branch remote. Ruleset main-production dipulihkan persis ke konfigurasi aktif semula, tanpa bypass baru.
- Workflow Production images pada snapshot kurasi `c54a306` berhasil: Inspect release changes sukses; image/migration/deploy VPS skipped. Fetch commit sebelumnya ditambahkan agar perbandingan tetap bekerja setelah rewrite.
- Audit setelah kurasi: 898 blob reachable, tidak ditemukan match secret maupun path sensitif tracked; batas tetap berlaku. Akun demo README adalah pengecualian yang disetujui.

## Cara lanjut

Baca status Git dan diff aktual sebelum pekerjaan baru. Selesaikan satu increment, verifikasi sesuai perubahan, lalu commit/push dev dan PR main. Pengecualian rewrite sudah selesai; jangan mengulang force push. Checkout lain yang masih memakai history lama sebaiknya clone ulang setelah menyimpan pekerjaan lokalnya. Jangan merge history lama kembali ke dev/main. Backup dan mapping SHA disimpan privat di `.local/`, tidak dipush.
