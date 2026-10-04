# Workflow dev → main

Coding/tes lokal dan push langsung dev. Main untuk live, tanpa deployment dev/staging. [Development](../development.md) menjelaskan SDD/Kanban dan [deployment](../deployment.md) menjelaskan Vercel/VPS.

PR dev → main memeriksa branch policy, unit, lint, Prisma dan build/typecheck sekali. Integrasi terfokus bila diperlukan dikerjakan lokal sebelum rilis. Tidak ada Playwright atau integrasi penuh rutin; deployment tidak mengulang unit.

Merge main: frontend mengikuti Vercel. Backend/schema/build inputs memicu Production images, tag SHA GHCR, deploy forced-command VPS, migration SQL baru bila ada, lalu health. Frontend-only tidak memperbarui backend. Gate VPS_AUTO_DEPLOY_ENABLED=true sudah diaktifkan pemilik dan deployment backend terbukti dari health release f581f31 pada 2026-10-04.

Main default branch dan ruleset meminta PR/CI result, melarang deletion/force push untuk workflow harian. Tidak membutuhkan reviewer approval pada pengembang tunggal. [Payload ruleset](../../infra/github/main-ruleset.json) adalah referensi, bukan bukti setting remote otomatis berubah.

Pemilik menyetujui pengecualian satu kali untuk kurasi history dev/main. Backup privat, preserved dates dan force-with-lease diperlukan; proteksi normal dipulihkan setelah perapian. Tidak membuat branch remote tambahan. Snapshot source live tetap tersedia pada backup; rewrite history mengubah SHA, bukan data aplikasi.
