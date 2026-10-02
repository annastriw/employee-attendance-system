# AIStor lokal

## Konfigurasi
- Compose: infra/compose.aistor.local.yml.
- Image resmi dipin ke RELEASE.2026-09-19T17-05-25Z.hotfix.4ef74f03d6f2 dan digest registry.
- S3 API: http://localhost:9000.
- Console: http://localhost:9001.
- Volume persisten: aistor_data dalam project attendance-storage-local.
- Lisensi: .licenses/minio.license di root repository, dimount read-only.
- Kredensial root lokal: .env.aistor di root repository. Berkas dibuat lokal dan tidak masuk Git.
- .env.aistor.example menyediakan nama variabel tanpa password.

## Prasyarat
Docker Desktop berjalan dengan WSL 2. Docker CLI dan Compose harus dapat terhubung ke engine.
Lisensi Free aktif diperoleh pengguna dari https://www.min.io/pricing.
Jangan menempelkan lisensi/password pada chat, screenshot atau log publik.

## Menjalankan dari root repository
Validasi tanpa menampilkan nilai rahasia:
docker compose --env-file .env.aistor -f infra/compose.aistor.local.yml config --quiet

Unduh image:
docker compose --env-file .env.aistor -f infra/compose.aistor.local.yml pull

Jalankan:
docker compose --env-file .env.aistor -f infra/compose.aistor.local.yml up -d

Status:
docker compose --env-file .env.aistor -f infra/compose.aistor.local.yml ps

Hentikan tanpa menghapus volume:
docker compose --env-file .env.aistor -f infra/compose.aistor.local.yml stop

Compose tidak membuat berkas lisensi kosong. Startup gagal jika berkas lisensi tidak tersedia.
Jangan gunakan down --volumes untuk penghentian biasa karena menghapus data.

## Pemeriksaan setelah startup
1. GET http://localhost:9000/minio/health/live mengembalikan 200.
2. Console localhost:9001 dapat dibuka.
3. Login memakai kredensial lokal, buat bucket attendance-photos privat.
4. Upload objek uji, baca ulang, restart container, pastikan objek tetap tersedia.
5. Request anonim ke objek harus ditolak.
6. Kredensial root hanya untuk setup; Media Service memakai akun/policy khusus yang disiapkan dengan pnpm storage:setup. Lihat [Media lokal](media-local.md).
7. Backup/restore diuji sebelum live.

Pemeriksaan health saja belum membuktikan operasi S3 tersedia: lisensi harus diterima dan upload/read perlu diuji.

## Status pemasangan
Konfigurasi telah disiapkan. Status runtime dan verifikasi nyata dicatat pada installation-status.md. Jangan menyatakan AIStor aktif sebelum pemeriksaan berhasil.

## Sumber
- https://docs.min.io/aistor/installation/container/install/
- https://docs.docker.com/desktop/setup/install/windows-install/
