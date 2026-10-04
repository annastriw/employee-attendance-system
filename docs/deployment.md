# Deployment dan rilis otomatis

Live memakai dua project Vercel untuk Attendance/HR, satu VPS Ubuntu untuk lima backend, MySQL dan AIStor, dengan DNS Cloudflare dan Nginx HTTPS. [Arsitektur](architecture.md).

## Rilis harian

1. Coding dan testing terfokus lokal pada dev; UI/alur diterima manual.
2. Push dev, buat PR dev → main. CI memeriksa branch policy, unit, lint, Prisma dan build/typecheck. Tidak ada Playwright atau integrasi penuh rutin.
3. Merge setelah CI untuk head PR terbaru hijau. Vercel production branch main menerbitkan frontend.
4. Workflow Production images mendeteksi backend/migration changes, membangun lima image backend dan image migrator cached/paralel, tag SHA commit, lalu publish GHCR.
5. Bila backend berubah dan gate `VPS_AUTO_DEPLOY_ENABLED=true`, job production mengirim fixed SSH command dengan SHA tepat itu. VPS verifier memeriksa main release, menarik image, memperbarui backend dan menunggu health.
6. Migration SQL baru memicu backup sebelum migrate deploy. Unit tidak diulang di VPS. Frontend-only tidak memperbarui backend. Path filter aktual berada di [detector](../scripts/deployment/detect-release-changes.py); perubahan pada input build/shared schema dapat memicu backend meski bukan perubahan controller.

## Vercel

| Project | Root directory | Domain |
| --- | --- | --- |
| Attendance | apps/attendance-web | attendance.annastriwidagdo.me |
| HR | apps/hr-web | hr.annastriwidagdo.me |

Production branch main, output dist, build aplikasi terkait dari workspace pnpm. Aktifkan Include source files outside of the Root Directory karena packages/ui digunakan bersama. `VITE_API_BASE_URL=https://attendance-api.annastriwidagdo.me/api/v1` pada environment Production. Nilai ini build-time; setelah mengubahnya harus redeploy. Arah branch/detil setting dapat diperiksa pada project Vercel masing-masing.

## VPS dan GitHub

Root deployment `/opt/attendance`. Compose infra memuat MySQL/AIStor; Compose backend memuat lima image. Secret per-service dan lisensi berada pada folder privat VPS, tidak Git. Port service 3000–3004, DB 3307, S3 9000 dan Console 9001 bind loopback.

GitHub environment production menggunakan `VPS_DEPLOY_HOST`, `VPS_DEPLOY_USER`, `VPS_DEPLOY_PRIVATE_KEY`, `VPS_DEPLOY_KNOWN_HOSTS`. Private key utuh disimpan sebagai secret, public key di authorized_keys akun deploy. Akun forced-command tidak menyediakan shell interaktif, dan sudo hanya entrypoint deploy yang disetujui. Token GitHub/SSH tidak masuk README.

[Panduan akses dan instalasi auto-deploy](deployment/vps-auto-deploy.md), [artefak backend](../infra/compose.backend.yml), [workflow image](../.github/workflows/backend-images.yml). Setup ini sudah diaktifkan pemilik; health live untuk SHA merge f581f31 dibuktikan pada 2026-10-04. Setelah rewrite history, rilis aktif VPS dapat masih menyebut SHA lama sampai rilis backend berikutnya; perubahan dokumentasi bukan alasan mengganti image yang sehat.

## Domain dan foto

Frontend CNAME ke Vercel; API/storage mengarah ke VPS melalui Cloudflare. Sertifikat origin valid dan mode TLS memvalidasi origin. Nginx route API ke Gateway, S3 ke 9000 dengan Host/URI tetap agar signature valid. Console 9001 hanya lewat tunnel lokal. Bucket tidak dibuat public untuk memublikasikan demo.

## Verifikasi dan kegagalan

```sh
curl --max-time 15 -fsS https://attendance-api.annastriwidagdo.me/health
```

Backend release baru harus memperlihatkan release sesuai SHA image. Periksa workflow dan fitur live manual. Health gagal memicu rollback image aplikasi sebelumnya; migration/data tidak dibalik otomatis. Gunakan migration kompatibel dan backup sebelum perubahan schema.

Backup DB sebelum seed/migration pernah dikonfirmasi pengguna. Restore drill, backup terjadwal, uji kapasitas dan hardening tambahan ditunda pengguna untuk scope demo; dokumen tidak mengklaim pekerjaan tersebut lulus. [Runbook operasional](deployment/vps-production-manual.md).
