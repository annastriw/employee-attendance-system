# Alur development

Acuan: [baseline](../requirements/baseline.md), [plan](../../tasks/plan.md), [todo](../../tasks/todo.md), [progress](../../tasks/progress.md), dan [testing](../testing/workflow.md). Baca spec/source terkait saja; jaga lima backend, dua frontend dan Atomic Design.

## Satu increment di dev

1. Implementasikan perubahan ujung ke ujung, reuse pola/tooling yang ada.
2. Unit test logika terdampak wajib; jalankan file/package terkait. Lint/typecheck terkait, build hanya jika dibutuhkan.
3. Integrasi mode cepat jika diperlukan: satu service/file/skenario untuk koneksi MySQL, AIStor, auth atau kontrak antarservice yang berubah. Reuse layanan lokal test dan build valid; jangan memakai data production.
4. Siapkan checklist UI/responsivitas/alur lokal yang singkat untuk pengguna. Tidak menambah Playwright atau test screenshot/harness otomatis rutin.
5. Review diff; commit/push berkas terkait langsung dev. Implementasi boleh disimpan saat menunggu manual acceptance, tetapi fitur belum ditutup penuh.
6. Setelah pengguna menyatakan oke, catat scope/tanggal/hasil pengguna lalu centang acceptance terkait. Jangan mencentang hanya karena unit atau build lulus.

Dokumentasi saja cukup isi/tautan/diff. Jangan menjalankan semua suite setiap perubahan kecil atau mengulang hasil lulus tanpa perubahan/risiko terkait. Test lama dan bukti historis disimpan, bukan gate rutin.

## Rilis dan kelanjutan

PR dev → main setelah unit dan manual acceptance pengguna siap. CI lint/build/typecheck/unit sekali; integrasi cepat bila diperlukan diselesaikan sebelum rilis. Deployment tidak mengulang unit atau menjalankan suite browser/integrasi penuh pada VPS. [Rilis singkat](ci-cd-workflow.md).

Hanya dev/main, tanpa branch fitur wajib atau deployment dev. Satu agen aktif serial; tanpa subagen/coding paralel. Scope tetap seluruh T01–T31. Catat satu task aktif, scope/hasil/proses/port dan titik lanjut pada progress. Secrets/lisensi/foto/backup/build tidak di-stage. Promosi main mengikuti instruksi rilis pengguna.

Setup VPS tetap ditunda dan dilanjutkan dari infra production yang sudah disiapkan. Jangan reset/ulang bootstrap. Live hanya diklaim setelah benar-benar diverifikasi.
