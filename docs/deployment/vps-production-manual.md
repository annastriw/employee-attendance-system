# Runbook VPS

Deployment aplikasi sudah berjalan. Panduan rilis harian ada di [deployment](../deployment.md); instalasi akses otomatis ada di [auto-deploy](vps-auto-deploy.md). Dokumen ini mencatat struktur dan operasi yang relevan, bukan mengulang transkrip bootstrap bertahap.

## Struktur

Root /opt/attendance: compose.infra.yml, compose.backend.yml, backend-release.env, .secrets/, .licenses/, releases/, backups/. Secret dan backup tidak masuk repository. Infra menjalankan MySQL dan AIStor, backend lima image release.

Domain: attendance-api.annastriwidagdo.me ke Gateway 3000, attendance-storage.annastriwidagdo.me ke S3 9000. Port backend 3000–3004, DB 3307, storage/Console 9000–9001 loopback; Nginx membuka HTTPS. Console bukan website publik.

## Pemeriksaan singkat read-only

```sh
cd /opt/attendance
sudo docker compose --env-file .secrets/aistor.env -f compose.infra.yml ps
sudo docker compose --env-file backend-release.env -f compose.backend.yml ps
curl --max-time 15 -fsS https://attendance-api.annastriwidagdo.me/health
free -h
df -h /
sudo docker stats --no-stream
```

Gunakan --env-file yang tepat; `compose config` tanpa --quiet dapat menampilkan secret yang diinterpolasi. Jangan tempel environment/inspect lengkap/log sensitif pada issue atau README.

## Database dan storage

Schema production attendance_prod. Empat runtime user berbeda dan satu migrator. [Schema/grants](../database.md). Foto privat dalam AIStor; Media menggunakan akun khusus, bukan root. Lisensi disimpan privat dan dimount read-only.

Backup sebelum migration dilakukan [script deploy](../../scripts/deployment/attendance-deploy.sh). Backup sebelum importer demo pernah diterima dari output pengguna; importer bukan rilis rutin dan tidak dijalankan ulang setiap merge. [Panduan seed](../../scripts/seed/README.md).

## Kegagalan rilis

Periksa workflow dan SHA image sebelum mengulang. Jika health gagal, script mencoba kembali ke SHA backend sebelumnya. Migration/data tidak di-rollback otomatis. Jangan menggunakan reset schema, down --volumes atau prune volume sebagai perbaikan login/error jaringan.

Restore drill/backup terjadwal/uji kapasitas/hardening tambahan ditunda pemilik. Restore production hanya setelah target backup dan dampak dipahami; health 200 tidak membuktikan backup dapat direstore. Tidak ada tindakan destructive pada panduan pemeriksaan ini.
