# Status instalasi AIStor lokal
Tanggal: 2026-10-01 (Asia/Jakarta).

## Selesai
- WSL 2.7.13 terpasang melalui paket resmi Microsoft.
- Komponen Microsoft-Windows-Subsystem-Linux dan VirtualMachinePlatform berhasil diaktifkan.
- Docker Desktop 4.93.0 terpasang per-user menggunakan backend WSL 2.
- Docker CLI 29.8.1 dan Compose 5.5.1 tersedia.
- Image AIStor dipilih dari registry resmi dan dipin ke release/digest pada Compose.
- Konfigurasi Compose lulus config --quiet.
- Kredensial root lokal acak dibuat di .env.aistor; tidak ditampilkan atau di-commit.
- Berkas .licenses/minio.license ditemukan; isi dan validitas lisensi belum diverifikasi oleh AIStor.
- File lisensi, kredensial dan log lokal dikecualikan dari Git.

## Tindakan pengguna yang diperlukan
Restart Windows untuk menyelesaikan aktivasi komponen WSL. Restart tidak dilakukan oleh agent.
Sesudah restart, buka Docker Desktop dan tunggu engine siap. Bila baru diminta onboarding, selesaikan halaman tersebut.

## Belum selesai
- Docker engine terverifikasi aktif.
- Download image AIStor dan startup container.
- Penerimaan lisensi Free oleh server.
- HTTP healthcheck, login Console dan upload/read S3.
- Bucket privat attendance-photos dan uji akses anonim.
- Uji persistensi sesudah restart container.

Instalasi prasyarat dan persiapan konfigurasi selesai; server AIStor belum berjalan. Jangan menganggap healthcheck, lisensi atau operasi S3 sudah berhasil.

## Jika docker compose belum dikenali
Komponen Compose tersedia pada:
C:UsersAnnasAppDataLocalProgramsDockerDesktopesourcescli-pluginsdocker-compose.exe
Gunakan executable tersebut untuk perintah Compose, atau buka ulang terminal setelah menjalankan Docker Desktop.

Panduan penggunaan: aistor-local.md.
