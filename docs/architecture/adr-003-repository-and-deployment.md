# ADR-003 — Monorepo dan rilis main

Keputusan awal: 2026-10-01; workflow dua branch disetujui 2026-10-03; implementasi rilis dibuktikan 2026-10-04.

## Keputusan

Satu repository public memuat dua portal dan lima backend. Attendance/HR memakai project Vercel terpisah. Backend/MySQL/AIStor pada VPS Ubuntu, DNS Cloudflare dan Nginx HTTPS. Dev untuk coding/tes lokal; main untuk live, tanpa staging/dev deployment.

Backend Docker VPS memakai host networking dan bind loopback 3000–3004; MySQL/storage dipublikasikan pada loopback dari Compose infra. Gateway merupakan pintu API publik, S3 domain melayani foto bertanda tangan. Console tetap privat. Backend tidak privileged dan tidak memasang Docker socket.

GitHub Actions membangun SHA images dan deploy menggunakan akun SSH forced-command. Vercel mengikuti main. Frontend-only tidak memperbarui backend. Secret/lisensi/backup berada di environment privat; VITE_ hanya nilai publik.

## Alasan dan konsekuensi

Monorepo mengoordinasikan kontrak FE/BE/shared UI, sementara proses dan ownership DB menjaga batas service. Dua project frontend memungkinkan konfigurasi portal/domain terpisah. Satu VPS hemat komponen tetapi bukan HA; backup/restore dan kapasitas perlu bukti terpisah bila scope berkembang.

Demo HR/karyawan sengaja dipublikasikan pemilik, memakai data fiktif/simulasi. Keputusan ini tidak memublikasikan credential infra. [Deployment](../deployment.md), [security](../security.md), [workflow](../development.md).
