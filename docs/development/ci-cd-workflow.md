# Workflow dev → main dan deployment singkat

Coding langsung **dev**, satu environment live dari **main**. Push dev tidak deploy. Hanya dua branch; tidak ada branch fitur wajib atau dev/staging online.

## Development

Unit test logika terdampak wajib. Integrasi cepat hanya bila perlu, satu service/file/skenario pada lingkungan test lokal. Pengguna memeriksa UI/UX/alur secara manual; checkbox acceptance baru dicentang setelah pengguna menyatakan oke untuk scope terkait. [Aturan testing lengkap](../testing/workflow.md).

## Rilis

1. Fitur siap di dev: unit terkait lulus, integrasi cepat bila perlu tercatat, dan manual acceptance pengguna diterima.
2. PR dev repository sendiri → main. CI menjalankan lint, Prisma generate/validate, build/typecheck dan unit (pnpm run test:unit) sekali. Tidak ada Playwright, screenshot otomatis atau suite integrasi penuh rutin.
3. Setelah CI result lulus dan pengguna menginstruksikan rilis, merge PR. Workflow main membangun lima image cached/paralel, lalu publish ke GHCR dengan tag sha-COMMIT.
4. Target deploy VPS: pull image → migration baru bila ada → update backend → health operasional → dua frontend main. Unit tidak diulang saat deploy. Integrasi yang diperlukan dibuktikan terfokus sebelum rilis, bukan pada data live.
5. Pengguna mengecek fitur live secara manual. Jika health gagal, gunakan image sebelumnya; rollback aplikasi tidak membatalkan migration/data.

Build diperlukan untuk menghasilkan aplikasi/image; lint/typecheck adalah pemeriksaan statis, bukan suite browser/integrasi. Backup sebelum migration production, gunakan perubahan kompatibel, jangan reset/seed ulang setiap deploy. Satu rilis berjalan pada satu waktu.

## Status saat ini dan titik lanjut VPS

CI PR dan workflow publish GHCR sudah berjalan: PR #1 merged, lima image rilis main 1c27c90 sukses dipublikasikan (run 37193965079, 2026-10-04). Pengiriman otomatis ke VPS, Compose backend, akses pull GHCR, domain/TLS, dua Vercel dan rollback masih T30. Jangan menganggap merge main otomatis memperbarui VPS sebelum langkah itu tersambung.

Rilis aplikasi pertama sudah di main melalui PR #1. Coding tetap di dev, rilis berikutnya melalui PR dev ke main. Jangan push development langsung ke main.

Proteksi [main-production](https://github.com/annastriw/employee-attendance-system/settings/rules/24451981) aktif sejak 2026-10-04. Target eksplisit main, bukan default branch (default repository masih dev). Wajib PR dan CI result dari GitHub Actions; penghapusan dan force push diblokir, bypass kosong. Approval reviewer 0 karena workflow pengembang tunggal; tidak memerlukan code owner/signature/coverage/browser/deployment gate tambahan. Merge commit dipakai agar riwayat dua branch panjang tetap tersambung. Strict up-to-date dinonaktifkan untuk menghindari pengulangan CI tanpa kebutuhan; hanya satu rilis pada satu waktu, pastikan CI untuk head PR terbaru lulus sebelum merge. Dev tetap menerima push langsung. Payload yang dipasang tersimpan di [main-ruleset.json](../../infra/github/main-ruleset.json); perubahan JSON tidak otomatis memperbarui aturan GitHub.

VPS terakhir disiapkan pengguna sampai MySQL production dan AIStor/bucket/akun Media terverifikasi. Setup berikut dilanjutkan dari [progress](../../tasks/progress.md), tanpa reset/bootstrap ulang. Status migration/backend/live setelah reset belum dibuktikan.

Acuan publish GHCR: [GitHub Docs](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images).
