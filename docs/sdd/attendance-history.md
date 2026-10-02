# T24 — Riwayat pribadi karyawan

Status manual: diterima pengguna pada 2026-10-03 (Asia/Jakarta). Pengguna mengonfirmasi seluruh pengujian manual sampai T24 aman; checklist tujuh langkah di bawah dicentang berdasarkan laporan tersebut, bukan pengujian ulang agen atau hasil Playwright. Rincian perangkat/browser dan angka benchmark tidak diberikan. T24 ditutup penuh; catatan pending pada checkpoint lama merupakan status historis sebelum penerimaan ini.

## Scope dan API

E07 daftar dan E08 detail untuk pemilik sesi EMPLOYEE saja. Auth memverifikasi sesi/revokasi dan kewajiban ganti password setiap request. Tanpa employeeId yang dapat dikirim client; ID pemilik selalu dari sesi. Tidak membuat baris missing atau mengubah bukti absensi.

- GET /api/v1/me/attendance: filter startDate/endDate tanggal kalender valid YYYY-MM-DD; page 1+ dan pageSize 1–20. Urutan tanggal descending lalu id, seluruh state termasuk terhapus, query lain/duplikat ditolak.
- GET /api/v1/me/attendance/:id: hanya catatan milik sendiri, 404 untuk catatan pemilik lain atau tidak ada. Snapshot departemen/jabatan, waktu dan status kedua event, alasan absensi/penghapusan, lokasi/accuracy/waktu lokasi. Catatan terhapus tidak mengandung ID foto atau URL.
- GET /api/v1/me/attendance/:id/events/:eventId/photo: derive owner/purpose/photo dari relasi tersimpan, bukan payload client. Verifikasi kepemilikan, event harian dan status aktif sebelum meminta URL ke Media dengan Bearer sesi dan secret internal. Cek ulang versi/state sesudah upstream. Catatan terhapus 409, event/record pemilik lain 404. URL privat berlaku 60 detik; tidak disimpan di daftar, cache persistent, log, audit atau browser storage. URL yang sudah diterbitkan memiliki batas akses TTL; perubahan state/revokasi mencegah penerbitan URL berikutnya.

Response data/meta dengan requestId/serverTime WIB; pagination meta total/page/pageSize. Read record+count konsisten dengan snapshot DB. Rute Gateway allowlist, UUID v4 dan query whitelist; endpoint internal Media tetap tidak publik. Reuse schema/binding/storage yang ada tanpa migrasi/dependency baru.

## UI dan pemulihan

Hari ini memiliki tautan Riwayat. Riwayat/detail memakai hash URL untuk periode/page/id, kembali mempertahankan filter. Halaman baru lazy, tidak memuat kamera/MediaPipe. Form tanggal, daftar kartu per hari, kedua waktu WIB dan badge status, pagination/loading/error/kosong. Detail aktif menawarkan Lihat foto per event (diambil saat diminta), waktu/koordinat/accuracy/lokasi dan alasan. Foto dihapus dari UI saat TTL berakhir atau error, reload/unmount/sesi berakhir; tombol untuk memuat lagi. Foto terhapus tidak diminta/dipasang, waktu asli dan alasan/waktu penghapusan tetap terlihat. Tidak ada edit/hapus/restore karyawan.

UI baca ulang eksplisit tanpa data lama terlihat sesudah filter/error; batalkan request pada navigasi. Tidak ada POST atau retry otomatis absensi dalam riwayat. Tema/komponen mengikuti [design system](frontend-design-system.md) dan [UI/UX](frontend-ui-ux.md).

## Acceptance dan verifikasi

- [x] Integrasi MySQL/AIStor: isolasi dua pemilik, HRD/forced password/revokasi, query/UUID invalid, filter/pagination termasuk terhapus dan snapshot immutable.
- [x] Foto privat scoped kedua event, 404 silang pemilik/event, 409 deleted, URL/bukti terjaga sesudah restore.
- [x] Frontend: filter/kembali/pagination, detail deleted tanpa foto, foto lazy/TTL/error, sesi berakhir dan data lama tidak tampil.
- [x] Typecheck/lint/build package terkait; visual halaman berubah 320/1440 terang/gelap dan review HeroUI/browser MCP.
- [x] Checklist browser backend nyata diterima pengguna. Diterima pengguna 2026-10-03.

## Bukti teknis — 2026-10-03

Dua skenario T24 mula-mula gagal karena rute belum ada, lalu lulus melalui Gateway → Attendance → Auth/Media → MySQL/AIStor nyata. Suite gabungan 28 skenario check-in/checkout/lifecycle/history lulus, termasuk pembacaan JPEG privat kedua event, isolasi pemilik, pagination/filter, revokasi, dan penghapusan saat penerbitan URL. Tiga belas unit Gateway lulus. Attendance Web: 87 tes existing/baru lulus; sesudah urutan bukti disesuaikan, tujuh tes riwayat terfokus lulus kembali.

Typecheck/lint/build Attendance, Gateway dan Attendance Web lulus. Empat visual Home dan 12 visual daftar/detail aktif/detail terhapus lulus pada 320/1440 px terang/gelap. Screenshot ditinjau; HeroUI MCP digunakan dan Chrome DevTools memeriksa detail terhapus pada 320 px: fokus H1, tombol 44 px, tanpa overflow atau foto. Fixture visual sintetis; bukan bukti alur browser/API nyata atau perangkat kamera/GPS.

Halaman riwayat memiliki chunk terpisah (sekitar 14,57 kB sebelum gzip), tanpa memuat kamera/MediaPipe. Kelima backend health 200, kedua portal localhost 200 dan tiga rute GET tersedia di Swagger. Review menemukan kendala CORS DELETE pada aksi HRD; perbaikan terpisah terverifikasi melalui tiga kontrak preflight dan runtime, lihat [lifecycle](attendance-lifecycle.md#koreksi-cors-browser--2026-10-03). Tidak ada migrasi, grant atau dependency baru. Manual T20–T24 tetap pending; belum ditutup penuh.

## Checklist manual pengguna

- [x] 1. Login karyawan, Hari ini → Riwayat; filter tanggal, pagination dan buka satu tanggal. Kembali mempertahankan periode/page.
- [x] 2. Detail menampilkan kedua waktu WIB, alasan absensi, snapshot departemen/jabatan serta koordinat/accuracy/waktu lokasi.
- [x] 3. Pilih Lihat foto pada masing-masing event. Foto privat terbuka, hilang setelah 60 detik dan dapat dimuat kembali; error foto tidak menghilangkan detail.
- [x] 4. HRD menghapus tanggal tersebut dengan alasan; muat ulang riwayat/detail karyawan. Label Dihapus HRD, waktu asli, waktu/alasan penghapusan terlihat dan tidak ada foto/tombol foto.
- [x] 5. HRD memulihkan catatan; muat ulang riwayat, data asli kembali dan foto dapat diminta kembali.
- [x] 6. Uji dua akun: ID/detail/event akun lain ditolak 404. Setelah logout/reset/nonaktif, akses sesi lama ditolak.
- [x] 7. Uji keyboard dan mobile, periode tanpa data, koneksi terputus lalu Muat ulang. Manual kamera/GPS T20–T23 tetap terpisah.
