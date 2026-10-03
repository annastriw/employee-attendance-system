## Perubahan dan alasan

Jelaskan scope fitur/logika/UI yang berubah dan kaitan FE/BE/DB bila ada.

## Verifikasi rilis dev → main

- [ ] Unit test logika terkait lulus; catat command dan scope.
- [ ] Integrasi cepat bila diperlukan: satu service/file/skenario lokal, catat alasan/hasil; jika tidak perlu tulis alasannya.
- [ ] Pengguna menguji UI/alur lokal dan menyatakan oke untuk scope rilis; catat konfirmasi.
- [ ] CI result (lint/build/typecheck/unit) lulus; unit tidak diulang pada langkah deploy.
- [ ] Jika migration baru: penerapan lokal/grants diperiksa, backup/rollback disiapkan.
- [ ] Keputusan rilis pengguna tersedia; health operasional dan penerimaan manual live dicatat setelah deploy.

Checkbox manual tidak dicentang hanya karena test otomatis/build lulus. Tidak ada Playwright atau suite integrasi penuh rutin.

Coding/commit/push langsung dev; production hanya main. Auto-deploy VPS belum aktif sampai T30 siap. [Testing](../docs/testing/workflow.md) dan [rilis singkat](../docs/development/ci-cd-workflow.md).
