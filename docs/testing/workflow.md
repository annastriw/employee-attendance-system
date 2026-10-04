# Testing dan penerimaan fitur

Keputusan pengguna 2026-10-03. Dokumen ini menjadi satu acuan frekuensi testing untuk seluruh repo; menggantikan kewajiban suite integrasi/Playwright rutin pada dokumen lama. Kontrak bisnis dan bukti pengujian terdahulu tetap berlaku.

## Development cepat di dev

1. Implementasikan satu perubahan yang dapat digunakan, reuse pola/tooling yang tersedia.
2. Unit test wajib untuk logika yang berubah: perhitungan, validasi, izin akses, penanganan error dan transisi state. Jalankan package/file terkait, bukan seluruh repo setiap perubahan kecil. Test frontend lama yang terisolasi dengan Vitest/RTL tetap termasuk suite unit; tidak menambah test markup/screenshot rutin.
3. Integrasi hanya bila sambungan nyata berisiko berubah: query/migration/grants MySQL, storage AIStor, login/revokasi atau kontrak antarservice. Mode cepat = satu service, satu file/skenario relevan, satu worker, reuse layanan test lokal dan build yang masih valid. Jangan menjalankan seluruh suite atau mengubah data production. Catat alasan, scope, hasil atau batasan; unit test tidak membuktikan koneksi nyata.
4. Lint/typecheck hanya package terkait; build bila diperlukan untuk runtime/bundling. Dokumentasi saja cukup review isi/tautan/diff.
5. Kirim checklist manual singkat untuk tampilan, responsivitas dan alur lokal yang berubah. Pengguna menjalankannya. Checkbox manual tetap kosong sampai pengguna menyatakan oke untuk scope itu. Hasil unit/implementasi tidak menggantikan persetujuan manual.
6. Commit/push increment terverifikasi ke dev. Kode boleh tersimpan di dev sambil menunggu penerimaan manual; fitur belum ditutup penuh sampai konfirmasi pengguna tersedia.

Contoh unit terfokus:

```sh
pnpm --filter attendance-service test --runInBand
pnpm --filter hr-web test
```

Contoh integrasi cepat **jika perubahan departemen memerlukannya**, setelah prasyarat database/akun fixture pada [runbook HR](../getting-started.md) siap:

```sh
pnpm --filter employee-service test:e2e --runInBand --runTestsByPath test/departments.e2e-spec.ts
```

Pilih file/skenario aktual dari source sesuai fitur. Jangan menjalankan setup/build/reset ulang tanpa kebutuhan; jangan memakai kredensial/data production. Tidak ada target durasi atau klaim integrasi lulus sebelum command benar-benar selesai.

## Rilis main

PR dev → main hanya setelah unit terkait dan penerimaan manual pengguna lulus. CI menjalankan lint/Prisma/build/typecheck serta `pnpm run test:unit` sekali. Tidak ada Playwright, screenshot otomatis, database/storage disposable atau suite integrasi penuh pada CI rutin.

Integrasi terfokus bila diperlukan dilakukan di lingkungan lokal/test sebelum rilis dan hasilnya dicatat pada PR; tidak otomatis diulang pada server live. Merge main menghasilkan image cached/paralel. Langkah deploy tidak mengulang unit test yang sudah lulus, cukup menarik image, migration baru bila ada dan health check. Health check adalah pemeriksaan operasional, bukan suite E2E.

Backup diperlukan sebelum migration production; jangan reset atau seed ulang setiap deploy. UI/UX live tetap diperiksa manual oleh pengguna. Jangan mencentang rilis/live hanya karena build atau upload image berhasil.

## Checklist manual

```text
- [x] Implementasi dan unit test terkait lulus (catat scope).
- [ ] UI/alur lokal diuji pengguna: <langkah singkat>.
- [ ] Pengguna menyatakan oke: <scope fitur>.
```

Setelah konfirmasi, catat tanggal, scope dan laporan pengguna, lalu centang item yang memang diterima. Persetujuan fitur A tidak mencentang fitur B atau deployment yang belum diperiksa. Jangan mengulang acceptance yang sudah diterima tanpa perubahan terkait.

Suite lama tetap tersedia sebagai alat tambahan. Tidak membuat harness/browser automation atau coverage gate baru untuk setiap fitur. [Alur development](../development/implementation-workflow.md) dan [rilis](../development/ci-cd-workflow.md) mengikuti aturan ini.
