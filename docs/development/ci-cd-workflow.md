# Workflow branch, CI dan rilis production

Keputusan pengguna: 2026-10-03 (Asia/Jakarta). Berlaku untuk produksi awal 5 karyawan dan 1 HR, bukan demo. Satu environment online berasal dari `main`; tidak ada deployment `dev`, staging online, atau preview otomatis yang terhubung ke production.

## Branch dan lingkungan

```text
dev terbaru → branch fitur → PR ke dev → CI + review → merge
                                                       ↓
                                      uji integrasi lokal dengan data uji
                                                       ↓
                                        PR dev → main → CI + keputusan rilis
                                                       ↓
                                        CD production (setelah T30 siap)
```

| Branch/lingkungan | Fungsi | Deployment |
| --- | --- | --- |
| Branch fitur/perbaikan dari `dev` | Kode, migration, test dan dokumen untuk satu perubahan logis | Tidak deploy |
| `dev` | Mengintegrasikan fitur yang selesai dan menguji alur FE/BE/DB lokal | Tidak deploy |
| `main` | Versi production yang dirilis pengguna | Target tunggal CD production |
| Laptop/runner CI | Database dan AIStor development/test terpisah dari production | Tidak memakai data/kredensial production |

Nama branch bebas; default agen `codex/<nama-fitur>`. Setelah setiap increment diverifikasi, commit berprefix dan push ke branch kerja. Buat PR ke `dev`; hasil development masuk `dev` melalui PR, bukan push langsung. PR rilis harus berasal dari `dev` dalam repository yang sama menuju `main`. Tidak merge fitur langsung ke `main`, tidak force push, dan tidak auto-merge PR rilis tanpa keputusan pengguna. Hotfix juga mengikuti fitur/perbaikan → dev → main.

Gunakan merge commit untuk PR rilis `dev` → `main`, sehingga sejarah dua branch tetap terhubung. Setelah rilis, sinkronkan perubahan `main` ke branch kerja yang berasal dari `dev` bila diperlukan, lalu ajukan PR ke `dev`; jangan mengajukan PR `main` → `dev` yang ditolak kebijakan branch. Jangan merge fitur belum siap ke `dev`: PR rilis membawa seluruh perubahan `dev` yang belum dirilis.

Transisi repository saat keputusan dibuat: implementasi T01–T29 berada di `dev`, dan CD belum aktif. Increment pencatatan kebijakan ini diselesaikan dari checkout `dev` dengan otorisasi commit/push yang sudah ada. Increment development berikutnya menggunakan branch fitur dan PR. Pemeriksaan GitHub saat increment ini menunjukkan `main` belum ada: siapkan branch dasar main pada tahap rilis dengan keputusan pengguna, tanpa otomatis menerbitkan production, sebelum membuka PR rilis awal dev → main. Pemilihan commit dasar dan aktivasi CD merupakan bagian bootstrap T30. Adanya branch `main` belum membuktikan production sudah berjalan.

## CI yang ada di repository

`.github/workflows/ci.yml` memeriksa push pada semua branch dan PR menuju `dev`/`main`:

1. `Branch policy`: menguji dan menegakkan sumber/tujuan PR. Nama branch fitur tidak dibatasi; branch fork bernama `dev` tidak dianggap sumber rilis resmi.
2. `Lint, Typecheck & Unit Tests`: lint, Prisma validate/generate, typecheck, build dan test unit/komponen.
3. `Build backend production images`: membangun image untuk lima service secara berurutan dari Dockerfile bersama; image tidak dipublikasikan pada CI branch/PR.
4. `Backend MySQL & Storage Integration Tests`: MySQL disposable serta AIStor Free versi/digest yang sama dengan Compose proyek; migration dev/test, grants, constraint, storage dan test backend nyata.
5. `Playwright Visual & Layout Regressions`: regresi visual setelah integrasi, mengikuti worker tunggal pada konfigurasi proyek.
6. `CI result`: berhasil hanya jika semua job wajib berhasil; gagal/cancel/skip tidak diterima. CI tidak memegang akses deployment production dan tidak menjalankan CD.

Prasyarat job integrasi: repository secret **`AISTOR_CI_LICENSE`**, berisi lisensi valid yang diizinkan untuk runner testing. Lisensi dan kredensial CI harus terpisah dari production. Jika secret belum tersedia (termasuk PR fork tanpa akses secret), job gagal secara eksplisit; jangan mengganti storage dengan MinIO Community atau melewati gate agar bisa merge. Kredensial fixture CI yang telah ada hanya untuk runner disposable dan tidak boleh dipakai ulang pada VPS.

Pemilik repository perlu mengaktifkan ruleset/protection untuk **`dev` dan `main`**: require pull request, required check `CI result`, branch harus up to date sebelum merge, larang force push/deletion, dan jangan memakai bypass untuk menyiasati gate gagal. Review dilakukan sebelum merge; bila solo maintainer tidak dapat self-approve, aturan jumlah approval disesuaikan agar review tetap dilakukan tanpa membuat merge mustahil. Workflow YAML tidak dapat mencegah push langsung tanpa ruleset GitHub. Dokumen ini bukan bukti ruleset sudah diaktifkan.

## Kontrak CD production — pekerjaan T30

**Belum diimplementasikan/diaktifkan.** Dockerfile multi-stage untuk membangun lima backend dan gate build image sedang disiapkan pada increment T30. Workflow publish/deploy, Compose production backend, dan script rilis masih perlu dibuat serta diverifikasi. Jangan menganggap push `main` sudah memperbarui VPS/Vercel.

Implementasi CD wajib mengikuti kontrak berikut:

- Hanya commit `main` dari repository ini yang lulus seluruh gate CI pada SHA yang sama dapat dirilis. Branch fitur/`dev`/PR tidak memperoleh environment production atau secrets deployment. Manual retry juga harus menunjuk commit rilis `main` yang sudah diverifikasi, bukan arbitrary ref.
- Satu rilis berjalan pada satu waktu; jangan membatalkan deployment/migration yang sudah berjalan ketika rilis berikutnya masuk. CI boleh membatalkan pemeriksaan lama; CD memakai concurrency terpisah tanpa pembatalan rilis aktif.
- Build lima image backend di GitHub Actions, publish ke GHCR dan pin commit/digest. VPS menarik artefak, bukan build source. Awalnya kelima service dirilis sebagai satu versi untuk menjaga kontrak antarlayanan.
- Pra-rilis: periksa kapasitas/akses dan rekam versi sebelumnya; buat backup konsisten database/foto sebelum perubahan yang memerlukan pemulihan. Uji restore dilakukan di lingkungan terpisah sebelum go-live dan diulangi sesuai runbook.
- Jalankan `prisma migrate deploy` sekali menggunakan akun migrator. Jangan `migrate dev/reset`, `db push`, menghapus volume, atau seed ulang setiap rilis. Seed admin hanya saat bootstrap awal, lalu ganti password.
- Migration harus kompatibel dengan backend yang masih berjalan. Gunakan expand/contract untuk perubahan kolom/tabel yang memutus kompatibilitas. Akun runtime terbatas per service, Gateway tanpa akun DB.
- Perbarui backend, periksa health dan koneksi antarservice, kemudian deploy dua frontend Vercel dari commit rilis yang sama. Matikan jalur auto-deploy Git Vercel yang dapat menerbitkan FE sebelum gate/backend siap; workflow rilis menjadi pengendali production.
- Uji smoke login, revokasi, check-in/out foto+lokasi, riwayat dan monitoring. Uji minimal 5 karyawan check-in bersamaan sebelum production awal. Jumlah pengguna kecil tidak menggantikan verifikasi keamanan, recovery, kapasitas dan HTTPS.
- Catat SHA/image/deployment ID, hasil health/smoke dan kegagalan. Rollback aplikasi memakai artefak sebelumnya; rollback aplikasi tidak membatalkan migration atau memulihkan data. Pemulihan DB/foto dikerjakan sesuai runbook tersendiri dan tidak otomatis menghapus data.

FE/BE/DB yang saling bergantung dirilis bersama. Perubahan FE saja tetap melewati gate sebelum deploy. Secrets, DNS, firewall dan konfigurasi VPS dikelola terpisah dengan review; tidak dicetak pada log atau disimpan Git.

## Scope VPS dan status pengujian manual

Pengguna menyatakan UKG telah dipindahkan oleh pemilik ke VPS lain dan boleh dihapus. VPS ditujukan khusus untuk production absensi; reset/reinstall belum dilakukan atau diverifikasi oleh agen. Pastikan scope data/lisensi/backup sebelum tindakan reset. Status tutorial sebelumnya bukan bukti deployment production sudah selesai.

Pada setup percobaan sebelumnya pengguna mengonfirmasi migration, akun MySQL, AIStor privat dan izin Media. Pemeriksaan penolakan akses lintas service/perubahan audit database (Tahap 5E) belum dilaporkan selesai. Jangan menutup T30/T31 berdasarkan keberhasilan tutorial parsial. Database `attendance_demo` yang dibuat sebelumnya harus direkonsiliasi dengan konfigurasi production final; namanya tidak menentukan status live.

## Acceptance kebijakan ini

- CI mencakup nama branch fitur bebas, PR fitur → dev dan PR dev repository sendiri → main.
- PR fitur → main, PR main/dev → dev, dan PR dev dari fork → main ditolak.
- Semua gate wajib berkontribusi pada satu hasil akhir; tidak ada deployment dev/preview atau akses production pada CI.
- CI membangun image lima backend, satu per satu, tanpa menerbitkan image dari branch fitur/`dev`/PR.
- Baseline, ADR, instruksi kerja dan backlog merujuk keputusan yang sama; status target CD dibedakan dari implementasi yang aktif.
- Aktivasi ruleset, secret lisensi CI, hasil Actions nyata dan CD/live diverifikasi tersendiri; tidak diklaim dari test kebijakan lokal.

## Acuan

- [Baseline](../requirements/baseline.md)
- [Topologi deployment ADR-003](../architecture/adr-003-repository-and-deployment.md)
- [Validasi integrasi dan CI](../sdd/integration-validation-ci.md)
- [Plan](../../tasks/plan.md), [todo](../../tasks/todo.md), [progress](../../tasks/progress.md)
- [Referensi resmi sintaks workflow GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
