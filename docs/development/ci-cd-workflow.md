# Workflow dev → main dan deployment singkat

Coding langsung **dev**, satu environment live dari **main**. Push dev tidak deploy. Hanya dua branch; tidak ada branch fitur wajib atau dev/staging online.

## Development

Unit test logika terdampak wajib. Integrasi cepat hanya bila perlu, satu service/file/skenario pada lingkungan test lokal. Pengguna memeriksa UI/UX/alur secara manual; checkbox acceptance baru dicentang setelah pengguna menyatakan oke untuk scope terkait. [Aturan testing lengkap](../testing/workflow.md).

## Rilis

1. Fitur siap di dev: unit terkait lulus, integrasi cepat bila perlu tercatat, dan manual acceptance pengguna diterima.
2. PR dev repository sendiri → main. CI menjalankan lint, Prisma generate/validate, build/typecheck dan unit (pnpm run test:unit) sekali. Tidak ada Playwright, screenshot otomatis atau suite integrasi penuh rutin.
3. Setelah CI result lulus dan pengguna menginstruksikan rilis, merge PR. Workflow main mendeteksi area perubahan. Perubahan backend/database membangun lima image backend dan satu image migrator secara paralel/cached dengan tag SHA commit; perubahan frontend saja tidak membangun atau mengirim ulang backend.
4. Setelah setup deploy satu kali di [panduan VPS otomatis](../deployment/vps-auto-deploy.md) aktif, perubahan backend memakai GitHub Environment dan kunci SSH forced-command untuk menjalankan release SHA tepat itu. Ia backup database dan menjalankan migration hanya bila migration SQL berubah, memperbarui lima backend, lalu menunggu health lima port. Unit tidak diulang saat deploy.
5. Vercel tetap deploy otomatis dari branch production `main`. Pengguna mengecek fitur live secara manual setelah workflow selesai. Jika health backend gagal, script mengembalikan image aplikasi sebelumnya; rollback ini tidak membatalkan migration/data.

Build diperlukan untuk menghasilkan aplikasi/image; lint/typecheck adalah pemeriksaan statis, bukan suite browser/integrasi. Backup sebelum migration production, gunakan perubahan kompatibel, jangan reset/seed ulang setiap deploy. Satu rilis berjalan pada satu waktu.

## Status dan aktivasi otomatis VPS

Workflow `Production images` menerbitkan migrator dan memiliki job deploy VPS yang mensyaratkan repository variable `VPS_AUTO_DEPLOY_ENABLED=true`. Pada 2026-10-04 pengguna melaporkan setup VPS, verifier, preflight service/secrets dan variable gate sudah lulus/disiapkan. Pemicu backend production otomatis siap untuk rilis backend/database berikutnya; hasil deploy otomatis pasca-aktivasi belum diuji. Perubahan frontend saja mengikuti deployment Vercel dari `main` dan tidak memicu VPS.

Rilis aplikasi pertama sudah di main melalui PR #1. Source deploy saat ini memakai image SHA main terbaru; verifikasi VPS dari laporan pemilik, bukan dari repo lokal. Coding tetap di dev, rilis berikutnya melalui PR dev ke main. Jangan push development langsung ke main.

Proteksi [main-production](https://github.com/annastriw/employee-attendance-system/settings/rules/24451981) aktif sejak 2026-10-04. Target eksplisit `main`, yang juga telah dijadikan default branch oleh pengguna. Wajib PR dan CI result dari GitHub Actions; penghapusan dan force push diblokir, bypass kosong. Approval reviewer 0 karena workflow pengembang tunggal; tidak memerlukan code owner/signature/coverage/browser/deployment gate tambahan. Merge commit dipakai agar riwayat dua branch panjang tetap tersambung. Strict up-to-date dinonaktifkan untuk menghindari pengulangan CI tanpa kebutuhan; pastikan CI untuk head PR terbaru lulus sebelum merge. Dev tetap menerima push langsung. Payload yang dipasang tersimpan di [main-ruleset.json](../../infra/github/main-ruleset.json); perubahan JSON tidak otomatis memperbarui aturan GitHub.

Pengguna melaporkan migration production, lima backend, domain HTTPS, dan portal sudah berjalan setelah setup VPS; pada 2026-10-04 preflight auto-deploy dan verifier release juga lulus serta gate diaktifkan. Belum ada rilis backend otomatis setelah aktivasi. Lanjutkan perubahan berikut dari [progress](../../tasks/progress.md), tanpa reset/bootstrap ulang.

Acuan: [publish Docker images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images), [environments dan deployment secrets](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), dan [secure use GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use). Repo bersifat public, jadi deploy dilakukan dari runner GitHub-hosted dengan akses SSH sempit; VPS tidak dijadikan self-hosted runner.
