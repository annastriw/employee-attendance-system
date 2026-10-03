# Alur development dan kelanjutan pekerjaan

Revisi pengguna 2026-10-03: proses dibuat sederhana. Aturan ini menggantikan gate development otomatis yang lebih berat sebelumnya.

## Sumber kerja

Baca [instruksi proyek](../../AGENTS.md), [baseline](../requirements/baseline.md), [plan](../../tasks/plan.md), [todo](../../tasks/todo.md) dan [progress](../../tasks/progress.md). Setelah itu cukup baca spec/source terkait perubahan. Ikuti [UI/UX](../sdd/frontend-ui-ux.md) dan [design system](../sdd/frontend-design-system.md). Tidak perlu dokumen/harness baru untuk setiap perubahan kecil.

## Loop harian

1. Bekerja langsung pada dev terbaru, satu increment yang dapat digunakan.
2. Ubah schema/kontrak bila diperlukan, lalu API dan UI terkait. Tetap lima backend terpisah serta dua frontend; reuse pola yang sudah ada.
3. Jalankan unit test logika terdampak serta lint/typecheck package terkait. Build package hanya bila diperlukan untuk runtime/bundling/test yang memakai dist.
4. Periksa UI, responsivitas dan alur fitur secara manual pada aplikasi lokal. Catat hasil/batasnya ringkas; hasil manual bukan hasil Playwright.
5. Review diff, commit/push berkas terkait langsung ke dev. Dokumentasi saja cukup isi/tautan/diff. Jangan stage secrets, foto/data, backup, hasil build atau tooling lokal.
6. Saat fitur siap live, PR dev repository ini ke main; CI ringkas lulus lalu keputusan merge/rilis oleh pengguna.

Tidak ada branch fitur wajib atau PR untuk masuk dev. Push dev tidak deploy. Satu agen aktif secara serial; tanpa subagen/coding paralel.

## Pemeriksaan yang diperlukan

Unit test baru untuk logika/aturan bisnis berubah, bukan teks/ikon/markup. Test lama disimpan. Integrasi MySQL/AIStor, visual otomatis dan Playwright bukan kewajiban setiap fitur atau deployment; gunakan untuk diagnosis khusus atau atas permintaan pengguna.

UI/layout/alur FE/BE diperiksa manual termasuk state/error/izin yang relevan. Bila schema berubah, verifikasi migration/grants pada database lokal. Jangan menjalankan fixture cleanup pada production. Backup sebelum migration production, gunakan migration kompatibel, jangan reset/seed ulang setiap deployment.

PR main menjalankan branch policy, lint, validasi/generate Prisma, build/typecheck, unit/component tests yang tersedia. Tidak ada gate browser/integrasi penuh. Deployment target: image GHCR, VPS pull/update, migration baru bila ada, health check dan smoke manual fitur terkait. [Workflow CI/CD](ci-cd-workflow.md) membedakan target dari CD yang belum aktif.

## Titik lanjut dan definisi selesai

Catat satu task aktif, scope, pemeriksaan, proses/port dan langkah berikut pada progress. Jangan mengulang bukti lulus tanpa perubahan/failure relevan. Selesaikan satu increment sebelum commit/push dev. Pengguna menentukan promosi main dan waktu berganti agen.

Fitur selesai bila kebutuhan terpenuhi, unit test relevan dan cek manual lulus, serta acceptance tercatat. Live hanya diklaim setelah deployment diverifikasi. Setup VPS dilanjutkan dari infra production yang telah disiapkan; jangan reset atau mengulang bootstrap.
