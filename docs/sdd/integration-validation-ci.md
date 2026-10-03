# Validasi development dan CI (T29)

Frekuensi testing dan aturan centang: [workflow aktif](../testing/workflow.md). Resep/hasil suite lama di dokumen ini tidak menjadi gate rutin; bukti historis tetap dipertahankan.

Revisi pengguna 2026-10-03 menggantikan pipeline integrasi/visual wajib sebelumnya. Struktur aplikasi dan suite pengujian yang sudah ada dipertahankan; frekuensi pemeriksaan disederhanakan.

## Development

Coding langsung dev, unit test logika terdampak, lint/typecheck package terkait, dan UI/alur API nyata diperiksa manual di lokal. Tidak menjalankan suite MySQL/AIStor penuh atau Playwright setiap fitur. Integrasi cepat diperlukan bila perubahan koneksi MySQL/AIStor/auth/kontrak service membutuhkan bukti nyata: jalankan satu service/file/skenario lokal terkait, bukan suite penuh. Schema berubah: verifikasi migration/grants lokal.

## CI reguler

Hanya PR dev repository sendiri ke main memicu .github/workflows/ci.yml:

branch policy → quality (lint, Prisma, build/typecheck, unit tests) → CI result

Push dev tidak memicu deployment atau CI penuh. CI result wajib sukses sebelum merge main. Integrasi disposable dan Playwright tidak berada pada jalur rilis rutin. CI PR tidak publish/deploy. Workflow backend-images.yml setelah merge main membangun/publish lima image paralel ke GHCR; pengiriman ke VPS T30 masih perlu disiapkan sesuai [workflow](../development/ci-cd-workflow.md).

## Suite dan lingkungan yang tersedia

Jest/Vitest, suite integrasi backend dan Playwright tetap tersimpan. Unit logika terkait wajib; integrasi cepat selektif bila perlu sebelum rilis, bukan suite penuh atau pengujian terhadap data live. Gunakan fixture terisolasi: attendance_test, attendance-photos-test dan akun runtime terbatas; jangan memakai data/secrets production. AIStor Free memakai lisensi valid, bukan Community. Lisensi CI tidak diperlukan oleh workflow reguler sekarang.

Script root yang tersedia: lint, build, test, db:validate, db:generate, db:typecheck. Script ci:setup, ci:grants, db:verify, storage:setup dan db:migrate:test tetap ada untuk pemeriksaan tambahan. Setup/grants/migrate mengubah lingkungan target sehingga tidak dipakai sebagai audit read-only.

## Acceptance

- PR dev repository sendiri ke main diterima; sumber lain ditolak.
- Lint/build/typecheck/unit tests menjadi gate reguler tanpa Playwright/integrasi penuh.
- Test lama tidak dihapus. UI/alur manual pengguna: checkbox hanya dicentang setelah konfirmasi oke dengan scope/tanggal; unit/build lulus bukan penerimaan manual.
- Secrets/testing terpisah dari production; deployment hanya main setelah CD aktif.
- Migration diperiksa saat schema berubah; deployment memakai health check dan smoke manual terkait.
