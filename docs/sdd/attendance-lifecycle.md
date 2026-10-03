# T23 — Penghapusan dan pemulihan absensi

Frekuensi testing dan aturan centang: [workflow aktif](../testing/workflow.md). Resep/hasil suite lama di dokumen ini tidak menjadi gate rutin; bukti historis tetap dipertahankan.

Status manual: diterima pengguna pada 2026-10-03 (Asia/Jakarta). Pengguna mengonfirmasi seluruh pengujian manual sampai T24 aman; checklist tujuh langkah di bawah dicentang berdasarkan laporan tersebut, bukan pengujian ulang agen atau hasil Playwright. Rincian perangkat/browser dan angka benchmark tidak diberikan. T23 ditutup penuh; catatan pending pada checkpoint lama merupakan status historis sebelum penerimaan ini.

## Scope dan kontrak
HRD menghapus satu catatan harian beserta kedua event secara logis, dengan alasan 1–500 karakter setelah trim. Identitas, tanggal dan dampak seluruh hari tampil pada konfirmasi. Catatan, foto privat, snapshot, outbox dan kunci unik tetap tersimpan. Pemulihan tidak mengaktifkan karyawan arsip dan tidak mengubah data bukti. Tidak ada hard delete atau edit bukti.

Seluruh endpoint memakai JWT sesi ADMIN_HRD yang diverifikasi ke Auth setiap request, menolak kewajiban ganti password, dan mengembalikan data/meta dengan requestId/serverTime WIB:
- GET /api/v1/attendance: status ACTIVE (default) atau DELETED, startDate/endDate YYYY-MM-DD, employeeId UUID opsional, page 1+, pageSize 1–20. Pagination stabil tanggal descending lalu id, filter DB sebelum pagination, profil saat ini melalui API Employee termasuk arsip. Snapshot departemen/jabatan tetap dari catatan harian.
- GET /api/v1/attendance/:id: detail bukti waktu/alasan, status, alasan/waktu/actor penghapusan dan 20 audit lifecycle terbaru; nama/status saat ini melalui API Employee. Foto tersembunyi ketika dihapus. Tampilan foto/peta lengkap pada T26.
- DELETE /api/v1/attendance/:id: JSON {version, reason}. version adalah updatedAt UTC ISO dari detail yang dikonfirmasi.
- POST /api/v1/attendance/:id/restore: JSON {version}. HTTP 200 pada transisi berhasil.

Tidak menerima query pada detail/mutasi atau properti payload lain. Tanggal invalid/rentang terbalik dan versi bukan ISO UTC milidetik ditolak 400; id tidak ditemukan 404. Versi berubah atau state tidak sesuai 409: baca detail terbaru sebelum membuat konfirmasi baru. Tidak ada retry mutasi otomatis.

## Konsistensi dan pemulihan
Transaksi InnoDB ReadCommitted mengunci baris harian yang sama dengan checkout. Bandingkan versi sesudah lock, ubah flag dan tulis audit actor/waktu/alasan/requestId atomik. updatedAt meningkat minimal 1 ms saat checkout/delete/restore sehingga konfirmasi lama tidak berlaku setelah siklus delete/restore. Retry dengan versi lama tidak menghasilkan audit/transisi tambahan. Respons mutasi yang hilang/timeout mungkin sudah commit: UI mengunci pengiriman ulang sampai pengguna memuat keadaan terbaru, lalu meminta konfirmasi baru. Audit tetap append-only, termasuk alasan penghapusan setelah restore.

UNIQUE(employee_id,attendance_date) berlaku pada catatan terhapus: check-in baru tetap ditolak. Checkout menolak catatan terhapus setelah memperoleh lock; restore mempertahankan identitas/event/foto/snapshot asli. Constraint harian juga mencegah konflik restore aktif tanggal sama. Tidak ada migrasi atau grant baru; memakai kolom deletedAt/deleteReason/deletedByAccountId/updatedAt yang tersedia. Media binding/outbox terus berjalan tanpa menghapus objek.

## UI
Navigasi Absensi dan Absensi dihapus; daftar ringkas nama, tanggal, waktu check-in/checkout dan status. Filter rentang tanggal/karyawan serta pagination, state loading/error/kosong. Detail memakai pola shared dan HeroUI. Konfirmasi delete wajib alasan; restore mengingatkan data asli dikembalikan. Tema mengikuti [design system](frontend-design-system.md) dan [konsep UI/UX](frontend-ui-ux.md). T25 melengkapi rekap, missing dan filter monitoring; T26 melengkapi foto privat/Leaflet.

## Acceptance dan bukti
- [x] HRD saja, revokasi/kewajiban password berlaku; Gateway allowlist dan body DELETE terjaga.
- [x] Alasan wajib, audit atomik; kedua event/foto/snapshot tersimpan.
- [x] Retry/stale/concurrency tidak menggandakan transisi; delete tidak membuka check-in/checkout.
- [x] Restore mempertahankan data asli; riwayat karyawan arsip dapat dibaca.
- [x] API nyata MySQL/AIStor, frontend behavior, typecheck/lint/build, visual halaman berubah 320/1440 terang/gelap.
- [x] Manual browser melalui backend nyata. Diterima pengguna 2026-10-03.

## Verifikasi teknis 2026-10-03
- RED: empat skenario integrasi gagal 404 sebelum endpoint tersedia; enam tes UI gagal sebelum perilaku diimplementasikan.
- GREEN: suite integrasi 25 skenario lulus (21 regresi T21/T22 + empat T23). Setelah penambahan rollback audit dan pembacaan detail dalam snapshot DB, lima skenario T23 terbaru lulus. Memakai Gateway/Auth/Employee/Attendance/Media, MySQL dan AIStor nyata dengan fixture sintetis serta cleanup terisolasi.
- Delapan unit Gateway dan 28 tes frontend terkait (Attendance, detail karyawan, hari libur, App) lulus. Test memastikan alasan/konfirmasi, batal, versi saat restore, konflik, pemuatan ulang setelah hasil tidak pasti, filter/pagination dan sesi berakhir.
- Typecheck/lint/build Attendance, Gateway dan HR Web lulus. Tanpa dependency, schema/migration atau grant baru. Build HR masih memberi peringatan chunk >500 kB (main 718,67 kB; gzip 211,28 kB); evaluasi pembagian bundle pada review frontend T28.
- Dua belas visual daftar/detail/dialog delete/restore pada 320/1440 terang/gelap lulus, tanpa overflow/error JS. Pola mock URL detail diperbaiki setelah pemeriksaan awal gagal; bukan bukti API browser nyata. Dialog memiliki target sentuh 44 px; screenshot ditinjau dan HeroUI MCP serta Chrome DevTools meninjau state sintetis pemulihan mobile gelap.
- Manual HRD/browser backend nyata checklist berikut masih pending, demikian pula penerimaan perangkat T20–T22. Tidak mengklaim deployment atau penerimaan manual.

## Checklist manual pengguna
- [x] 1. Login HRD, buka Absensi; filter tanggal/karyawan dan buka detail yang memiliki check-in/checkout.
- [x] 2. Pilih Hapus: nama/tanggal terlihat, alasan kosong ditolak; batalkan sekali, pastikan data tetap aktif.
- [x] 3. Isi alasan dan konfirmasi: pindah ke Absensi dihapus, alasan/waktu terlihat, kedua waktu asli tetap.
- [x] 4. Pada portal karyawan hari yang sama, status terhapus terlihat dan check-in/checkout baru ditolak.
- [x] 5. Login HRD, pulihkan dari detail terhapus: kedua waktu/alasan/bukti asli kembali, audit penghapusan/pemulihan tercatat.
- [x] 6. Dua tab HRD membuka versi sama; ubah pada tab pertama, konfirmasi tab kedua ditolak lalu muat terbaru. Simulasikan koneksi hilang sesudah submit; jangan kirim ulang sebelum memuat terbaru.
- [x] 7. Buka riwayat karyawan arsip; akses karyawan langsung ke API HRD ditolak. Uji keyboard dan mobile.

## Koreksi CORS browser — 2026-10-03

Review ketika mengerjakan T24 menemukan Gateway belum mencantumkan DELETE pada metode CORS. Preflight dari HR Portal mengembalikan 204 tetapi tanpa izin DELETE, sehingga browser memblokir aksi hapus. Gateway kini mengizinkan DELETE untuk origin yang sudah ada dalam allowlist; JWT, role HRD dan validasi mutasi tetap ditegakkan di Attendance. Test regresi membuktikan kegagalan sebelum perbaikan, lalu tiga kontrak preflight (DELETE valid, origin asing ditolak, POST existing) lulus. Checklist manual T23 tetap pending.
