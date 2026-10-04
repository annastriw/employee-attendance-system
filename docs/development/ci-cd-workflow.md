# Workflow dev → main dan deployment singkat

Coding langsung **dev**, satu environment live dari **main**. Push dev tidak deploy. Hanya dua branch; tidak ada branch fitur wajib atau dev/staging online.

## Development

Unit test logika terdampak wajib. Integrasi cepat hanya bila perlu, satu service/file/skenario pada lingkungan test lokal. Pengguna memeriksa UI/UX/alur secara manual; checkbox acceptance baru dicentang setelah pengguna menyatakan oke untuk scope terkait. [Aturan testing lengkap](../testing/workflow.md).

## Rilis

1. Fitur siap di dev: unit terkait lulus, integrasi cepat bila perlu tercatat, dan manual acceptance pengguna diterima.
2. PR dev repository sendiri → main. CI menjalankan lint, Prisma generate/validate, build/typecheck dan unit (pnpm run test:unit) sekali. Tidak ada Playwright, screenshot otomatis atau suite integrasi penuh rutin.
3. Setelah CI result lulus dan pengguna menginstruksikan rilis, merge PR. Workflow main membangun lima image backend dan satu image migrator secara paralel/cached, lalu publish semuanya dengan tag SHA commit.
4. Setelah setup deploy satu kali di [panduan VPS otomatis](../deployment/vps-auto-deploy.md) aktif, job production memakai GitHub Environment dan kunci SSH forced-command untuk menjalankan release SHA tepat itu. Ia backup database dan menjalankan migration hanya bila `prisma/migrations` berubah, memperbarui lima backend, lalu menunggu health lima port. Unit tidak diulang saat deploy.
5. Vercel tetap deploy otomatis dari branch production `main`. Pengguna mengecek fitur live secara manual setelah workflow selesai. Jika health backend gagal, script mengembalikan image aplikasi sebelumnya; rollback ini tidak membatalkan migration/data.

Build diperlukan untuk menghasilkan aplikasi/image; lint/typecheck adalah pemeriksaan statis, bukan suite browser/integrasi. Backup sebelum migration production, gunakan perubahan kompatibel, jangan reset/seed ulang setiap deploy. Satu rilis berjalan pada satu waktu.

## Status dan aktivasi otomatis VPS

CI PR dan publish lima image backend pernah lulus pada rilis pertama. Workflow `Production images` kini juga menerbitkan migrator dan memiliki job deploy VPS yang tetap nonaktif sampai repo variable `VPS_AUTO_DEPLOY_ENABLED=true`. Karena akun deploy, authorized key, GitHub Environment secrets, dan variable adalah konfigurasi eksternal, main belum otomatis mengubah VPS sampai panduan setup satu kali selesai dan job diaktifkan. Vercel deploy dari `main` mengikuti konfigurasi Production Branch proyek masing-masing.

Rilis aplikasi pertama sudah di main melalui PR #1. Source deploy saat ini memakai image SHA main terbaru; verifikasi VPS dari laporan pemilik, bukan dari repo lokal. Coding tetap di dev, rilis berikutnya melalui PR dev ke main. Jangan push development langsung ke main.

Proteksi [main-production](https://github.com/annastriw/employee-attendance-system/settings/rules/24451981) aktif sejak 2026-10-04. Target eksplisit main, bukan default branch (default repository masih dev). Wajib PR dan CI result dari GitHub Actions; penghapusan dan force push diblokir, bypass kosong. Approval reviewer 0 karena workflow pengembang tunggal; tidak memerlukan code owner/signature/coverage/browser/deployment gate tambahan. Merge commit dipakai agar riwayat dua branch panjang tetap tersambung. Strict up-to-date dinonaktifkan untuk menghindari pengulangan CI tanpa kebutuhan; hanya satu rilis pada satu waktu, pastikan CI untuk head PR terbaru lulus sebelum merge. Dev tetap menerima push langsung. Payload yang dipasang tersimpan di [main-ruleset.json](../../infra/github/main-ruleset.json); perubahan JSON tidak otomatis memperbarui aturan GitHub.

VPS terakhir disiapkan pengguna sampai MySQL production dan AIStor/bucket/akun Media terverifikasi. Setup berikut dilanjutkan dari [progress](../../tasks/progress.md), tanpa reset/bootstrap ulang. Status migration/backend/live setelah reset belum dibuktikan.

Acuan: [publish Docker images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images), [environments dan deployment secrets](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), dan [secure use GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use). Repo bersifat public, jadi deploy dilakukan dari runner GitHub-hosted dengan akses SSH sempit; VPS tidak dijadikan self-hosted runner.
