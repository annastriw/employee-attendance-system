# Status instalasi AIStor lokal
Tanggal: 2026-10-01 (Asia/Jakarta).

## Instalasi dan konfigurasi yang diperiksa agent
- WSL 2.7.13, Docker Desktop 4.93.0, Docker CLI 29.8.1 dan Compose 5.5.1 terpasang.
- Komponen Microsoft-Windows-Subsystem-Linux dan VirtualMachinePlatform diaktifkan.
- Image resmi AIStor dipin ke release/digest pada infra/compose.aistor.local.yml.
- Konfigurasi Compose lulus config --quiet.
- Kredensial acak lokal ada di .env.aistor, lisensi di .licenses/minio.license.
- Kredensial, lisensi, log dan data lokal dikecualikan dari Git.

## Pengujian manual yang dikonfirmasi pengguna
Setelah mengikuti tutorial setup dan pengujian penyimpanan, pengguna menyatakan semuanya sudah oke. Hasil berikut dicatat berdasarkan laporan pengguna, bukan pengujian ulang oleh agent:
- Docker engine dan container AIStor berjalan.
- Lisensi diterima, healthcheck dan login Console berhasil.
- Bucket attendance-photos privat tersedia.
- Upload/download objek berhasil dan isi hasil download sesuai.
- Akses objek tanpa autentikasi ditolak.
- Data tetap tersedia setelah restart container dan stop/start.

## Pekerjaan berikutnya
- Integrasi Media Service menggunakan kredensial/policy aplikasi, bukan akun root.
- Pengujian otorisasi foto lintas karyawan ketika aplikasi tersedia.
- Uji backup/restore dan deployment VPS sebelum live.
T07 keseluruhan belum selesai: MySQL dan harness testing aplikasi masih perlu disiapkan.

## Panduan
Lihat aistor-local.md untuk menjalankan, menghentikan, dan menguji storage.
Jika docker compose belum dikenali, executable tersedia pada:
C:/Users/Annas/AppData/Local/Programs/DockerDesktop/resources/cli-plugins/docker-compose.exe
PowerShell boleh ditutup setelah up -d. Docker Engine harus tetap berjalan; data disimpan pada volume persisten.
