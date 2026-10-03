# Panduan dokumentasi

## Acuan aktif

- [Baseline](requirements/baseline.md): kebutuhan produk dan keputusan pengguna.
- [Development](development/implementation-workflow.md): satu increment di dev.
- [Testing](testing/workflow.md): unit wajib, integrasi cepat bila perlu, UI/UX manual menunggu pengguna oke.
- [Rilis](development/ci-cd-workflow.md): PR dev → main, CI ringkas, image cached/paralel dan status deployment.
- [Plan](../tasks/plan.md), [todo](../tasks/todo.md), [progress](../tasks/progress.md): urutan, penerimaan dan titik lanjut VPS.
- [UI/UX](sdd/frontend-ui-ux.md), [design system](sdd/frontend-design-system.md): arah desain kedua portal.

## Struktur dan cara memakai dokumen

`sdd/` berisi kontrak/acceptance tiap modul; `architecture/` mencatat keputusan teknologi; `deployment/` berisi resep lokal/operasional; `testing/` mengatur pemeriksaan. Baca dokumen yang terkait perubahan saja. Tidak perlu menambah spec/runbook baru untuk setiap perubahan kecil.

Frekuensi testing pada semua modul mengikuti panduan testing aktif. Perintah Playwright/integrasi dan catatan hasil lama tetap disimpan untuk kebutuhan khusus; keberadaannya tidak berarti wajib dijalankan setiap fitur/deploy. Jangan menghapus riwayat pengujian atau mengubah bukti manual menjadi hasil otomatis.

Status teknis, penerimaan manual pengguna dan status live dibedakan. Checkbox UI/alur hanya dicentang sesudah konfirmasi pengguna untuk scope terkait. Deploy/live tidak diklaim dari build image saja. Status terbaru dibaca dari Git serta progress; snapshot lama bukan instruksi kerja baru.
