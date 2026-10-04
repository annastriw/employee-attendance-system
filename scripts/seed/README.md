# Seed riwayat demo Test Company

`demo-attendance.mjs` adalah importer satu kali untuk database yang memang dipakai sebagai demo teknis. Ia tidak membuat/mengubah akun, hari libur, kebijakan kerja, atau menghapus data. Jalankan hanya setelah lima akun `DEMO001`–`DEMO005` aktif dan `attendance_prod` dicadangkan.

Importer membuat riwayat 1 Agustus–30 September 2026 menggunakan jadwal Senin–Jumat WIB 08.00–17.00 dan melewati libur 17 serta 25 Agustus. Polanya menghasilkan 10 hari tanpa presensi, 195 rekap harian, 390 event, dan 390 ilustrasi avatar sintetis yang disimpan di bucket privat. Setiap event dan catatan audit diberi alasan `SIMULASI DEMO`; koordinat Jakarta adalah data contoh dan bukan lokasi aktual. Tidak memakai foto orang sungguhan.

Mode default adalah dry-run: memeriksa akun, kalender, duplikasi, koneksi bucket, dan jumlah record tanpa menulis ke database atau storage. Penulisan memerlukan `--apply-live` **dan** `DEMO_SEED_TARGET=attendance_prod`. Import dibatalkan jika periode sudah berisi rekap, batch sebelumnya ada, akun belum lengkap, atau kalender libur belum sesuai. Upload objek dilakukan sebelum transaksi; kegagalan upload/transaksi berusaha menghapus seluruh objek batch. ID objek stabil sehingga upload yang terulang sebelum transaksi hanya menimpa key yang sama.

Importer memerlukan runtime dependency dari container Media (`@attendance/database`, `minio`, `sharp`), kredensial migrator dan akun storage. Jangan menaruh nilainya pada command line atau menempelkannya di chat. Untuk menjalankan source dari VPS, ambil branch `dev` ke folder source terpisah, buat file env privat gabungan tanpa menampilkan nilainya, lalu pipe script ke Node container Media:

```bash
cd /opt/attendance
(
  set -euo pipefail
  set -o noclobber
  umask 077
  cat .secrets/migrator.env .secrets/media-storage.env > .secrets/demo-seed.env
)
chmod 600 .secrets/demo-seed.env

sudo docker exec --env-file .secrets/demo-seed.env --workdir /app -i \
  attendance-backend-prod-media-service-1 node --input-type=module - --dry-run \
  < /opt/attendance/releases/demo-seed-source/scripts/seed/demo-attendance.mjs
```

Lanjutkan dengan `--apply-live` hanya setelah dry-run menampilkan tepat `workdays=41`, `absences=10`, `dailyRecords=195`, `events=390`, `photos=390`, dan targetnya sudah dipastikan `attendance_prod`. Pada perintah apply tambahkan `--env DEMO_SEED_TARGET=attendance_prod` ke `docker exec` dan ganti `--dry-run` menjadi `--apply-live`. Setelah sukses, hapus `.secrets/demo-seed.env` secara manual; jangan hapus backup. Verifikasi tabel dan foto melalui portal HR sebelum memakai data pada demo.
