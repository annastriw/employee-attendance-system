# Progres bersama dan titik lanjut

Dokumen ini digunakan semua agen/alat pada repo lokal yang sama. Update saat mulai/selesai task, sebelum sesi berganti atau kapasitas sesi habis. Status completion tetap di [todo](todo.md); dependency di [plan](plan.md); prosedur pada [alur implementasi](../docs/development/implementation-workflow.md).

## Snapshot terakhir

- Tanggal: 2026-10-01 (Asia/Jakarta).
- Tahap: fondasi/Auth/HR login sebagian selesai; domain bisnis berikutnya belum diimplementasikan penuh.
- T08/T09 tersedia; beberapa task induk T01–T07 belum ditutup. Audit source/test sebelum mengubah checklist.
- Desain semua layar E01–E09/H01–H14 tersedia; panduan kelanjutan netral seluruh proyek dan aturan paralelisme telah ditulis.
- Commit terakhir diketahui sebelum revisi panduan: 40ac89f. Gunakan git log/status untuk commit terbaru; jangan menganggap hash snapshot adalah HEAD permanen.
- Branch kerja: dev. Remote belum tersedia pada pemeriksaan terakhir; push menunggu repository pilihan pengguna.
- Perubahan dokumen aman; tidak ada implementasi domain bisnis pada revisi panduan ini.
- Layanan/port aktif tidak diperiksa pada revisi dokumentasi; verifikasi sebelum menjalankan stack.

## Pekerjaan aktif dan ownership

| Task/subtask | Pemilik/sesi | Scope file | Dependensi | Proses/port | Status |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | Belum ada task coding paralel didaftarkan pada snapshot ini |

Isi baris sebelum mulai task paralel. Untuk shared contracts/UI, schema/migration, lockfile dan operasi Git, tetapkan satu pemilik pada satu waktu. Status harus diperbarui sebelum mengambil alih task sesi lain.

## Perubahan yang belum di-commit

Baca git status/diff sebagai sumber fakta. Commit revisi panduan dapat ditemukan melalui git log; agen berikut memeriksa Git, bukan menganggap semua perubahan lokal miliknya.

Folder .agents/, .claude/, .windsurf/ dan skills-lock.json merupakan berkas lokal yang sudah ada pada pemeriksaan; jangan men-stage, menghapus atau memodifikasinya tanpa scope yang jelas. Rahasia dan data pribadi tetap ignored.

## Bukti pemeriksaan

- Sebelumnya: Auth/Gateway/HR login memiliki hasil test pada task/runbook terkait; hasil tersebut bukan verifikasi ulang sesi ini.
- Revisi panduan: pemeriksaan 38 tautan lokal, ketiadaan rujukan khusus alat, blok Markdown, konsistensi scope/dependency dan diff lulus. Test aplikasi tidak dijalankan karena perubahan hanya dokumentasi.
- Test aplikasi, perangkat nyata dan layanan live tidak dijalankan dalam pekerjaan dokumentasi ini.

## Langkah berikut

1. Baca AGENTS, baseline, plan/todo, alur implementasi dan snapshot ini; periksa Git/source/runtime.
2. Audit task fondasi yang belum ditutup dan module specs yang belum lengkap; jangan mengulang Auth/HR login yang sudah bekerja.
3. Tetapkan task siap dan file scope. Jalur awal berikutnya adalah master departemen T10; spike kamera/lokasi T18 dapat berjalan paralel setelah fondasi terkait T07 terverifikasi. Persiapan schema/contracts/testing/infra mengikuti dependency masing-masing.
4. Kerjakan slice API + UI + test sesuai kontrak, integrasikan dengan MySQL/AIStor nyata dan lanjutkan seluruh plan. Review UI mengikuti spesifikasi, tanpa membatasi pekerjaan pada frontend.
5. Update todo/progress, review diff dan commit perubahan terverifikasi pada dev; push ketika remote pengguna tersedia.

## Kendala dan kebutuhan eksternal

- Remote GitHub belum ditentukan.
- Akses Vercel/VPS/Cloudflare dan instruksi promosi main belum tersedia pada snapshot; siapkan artefak independen dahulu.
- Detail teknis terbuka seperti threshold capture, batas foto/lokasi, presisi waktu dan outbox harus dituntaskan melalui spike/spec/test terkait.
- Tidak ada keputusan tambahan pengguna yang diperlukan untuk meneruskan task rutin dalam scope saat ini.

## Format update sesi berikut

- Waktu/sesi dan task:
- Selesai + commit:
- Sedang dikerjakan + pemilik/file:
- Diff belum di-commit:
- Proses/port:
- Verification dijalankan + hasil:
- Kendala nyata:
- Langkah berikut + dependency:
