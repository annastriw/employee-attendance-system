# Perubahan dan lifecycle karyawan — T14

Status: putaran A selesai; pemeriksaan terfokus dan checklist browser API nyata manual pengguna lulus pada 2026-10-02. Putaran B belum dimulai. Acuan: [baseline](../requirements/baseline.md), [provisioning T12](employee-provisioning.md), [UI/UX H08](frontend-ui-ux.md), [tier test](../../tasks/plan.md#tier-test-biaya-vs-nilai--disetujui-2026-10-02).

## Putaran A — profil dan email

H08 dibuka dari daftar karyawan. Form profil memakai pola H07: NIK, nama, telepon, departemen, jabatan, tanggal mulai bekerja. Status/lifecycle dan reset menyusul putaran B/T15. Email ditampilkan pada bagian akun dan diubah melalui tindakan terpisah dengan konfirmasi bahwa sesi karyawan dicabut. Konflik email tidak mengubah profil.

- GET /employees/:id: profil siap, email proyeksi Auth, master dengan statusnya, updatedAt, dan operasi perubahan email terakhir yang aman.
- PATCH /employees/:id: semua field profil + expectedUpdatedAt; tanpa email/status. Lock profil dan master dalam transaksi; versi lama mendapat 409, NIK unik termasuk nonaktif/arsip. Master lama yang tidak berubah boleh tetap nonaktif; penugasan berbeda harus ACTIVE. Telepon kosong menjadi null. Audit dan history before/after ditulis dalam transaksi yang sama; no-op tidak menambah history.
- POST /employees/:id/email: email, expectedEmail dan Idempotency-Key UUID v4. Hanya profil siap dengan provisioning COMPLETED, bukan ARCHIVED. Email trim/lowercase. Satu operasi PENDING per karyawan; operasi terikat actor dan payload. Key sama/data sama mengulang hasil, data berbeda 409. Profil disimpan melalui PATCH yang terpisah.
- GET /employee-email-changes/:id dan POST /employee-email-changes/:id/retry: hasil aman dan pemulihan operasi milik actor. Tidak memuat payload hash, lease, credential atau session token.
- Gateway allowlist hanya path/metode/query/header publik yang diperlukan; path internal tetap tidak tersedia.

## Kepemilikan dan pemulihan email

Auth memiliki email unik dan sesi. Employee menyimpan accountEmail sebagai proyeksi untuk daftar/detail, bukan sumber otorisasi. Proyeksi awal di-backfill dari provisioning dan diisi pada penerbitan profil T12; record provisioning asli tetap immutable untuk idempotensi T12.

Employee mencatat EmpEmailChange dalam transaksi sebelum HTTP. Worker memakai lease, timeout, backoff tersimpan dan operationId tetap. Auth menerima POST /internal/employee-email-changes/:id dengan signature service T12, employeeId/actor/expectedEmail/email; memeriksa actor ADMIN_HRD aktif dan account EMPLOYEE. Dalam satu transaksi Auth: lock akun, periksa email lama dan constraint unik, ubah email, revoke semua sesi, simpan AuthEmailChange receipt dan audit. Replay receipt/payload sama tidak mengubah email atau mengulang audit/revokasi. Receipt tidak mengandung password.

Employee memvalidasi receipt lalu memperbarui proyeksi+COMPLETED+audit dalam transaksi. Respons Auth hilang/worker restart dilanjutkan dengan receipt yang sama; kegagalan sementara tetap PENDING (backoff capped), tidak membolehkan operasi email lain menimpa pekerjaan ambigu. Konflik/penolakan definitif menjadi FAILED tanpa mengubah proyeksi. Retry sementara explicit tersedia; koreksi konflik membuat operasi baru dengan key baru. Login baru memakai email Auth yang telah committed, walau proyeksi masih menunggu recovery; UI tidak mengklaim COMPLETED sebelum proyeksi tersimpan.

## Putaran B — rencana

Aktif/nonaktif/arsip/restore, timeline history dan revokasi konsisten lintas Employee–Auth. Nonaktif/arsip menolak login serta token lama; email/NIK pada record nonaktif/arsip tetap dicadangkan. Restore menghasilkan INACTIVE; aktivasi terpisah. Detail kontrak ditulis sebelum putaran B, termasuk urutan operasi terhadap perubahan email PENDING.

## Acceptance dan pemeriksaan A

- Admin nonrestricted dapat membuka detail, menyimpan profil dan mengubah email; role/sesi tidak sah ditolak.
- Lost update, NIK/email konflik, master tidak aktif untuk penugasan baru, dan arsip tidak menimpa data. Nilai master lama nonaktif dapat dipertahankan.
- Profile/history/audit atomik; perubahan email idempotent, email baru login, email lama gagal, seluruh token lama ditolak.
- MySQL nyata membuktikan constraint, receipt, timeout/restart dan pemulihan; typecheck/lint/test perilaku terfokus per package terdampak.
- Browser manual satu checklist sesudah putaran A lengkap: buka/edit, validasi/konflik, ubah email, login ulang, reload/recovery; visual halaman berubah 320/1440 px terang/gelap.
- T14 tetap terbuka sampai putaran A dan B lengkap.
## Bukti putaran A — 2026-10-02

- Schema valid, migration dev/test dan grants diterapkan; diff migrations terhadap schema tidak berbeda (exit 0). Backfill proyeksi email dan hak history append-only diperiksa.
- Typecheck/lint Auth, Employee, Gateway dan HR lulus; build database, tiga backend dan HR lulus. Dist backend dibangun sebelum integrasi.
- Unit terfokus: Auth 3, Employee 9 (provisioning + email); kontrak HTTP Gateway 51. HR: Employees 7, Detail 4, selector 3 lulus. Hasil HR dikonfirmasi dari cache hasil Vitest karena output terminal akhir tidak tersimpan.
- MySQL nyata: lima skenario lulus pada run awal; satu skenario gagal karena port Supertest fixture ditutup oleh nested request. Fixture diperbaiki dan hanya skenario itu diulang, lulus. Enam skenario mempunyai bukti lulus: guard/lost update/history, constraint NIK/master/arsip, email concurrent/idempotensi/revokasi/login, konflik/ownership, response hilang/restart, signature/grants. Ini bukan klaim enam lulus dalam satu run bersih.
- Visual HR saja, API tiruan: 4/4 lulus pada 320/1440 px terang/gelap, satu worker. Screenshot form dan dialog ditinjau; animasi dinonaktifkan saat screenshot agar dialog tertangkap stabil. Tidak ada overflow/page error pada skenario.
- Pengguna melaporkan checklist browser dengan API nyata lulus pada 2026-10-02: edit/persistensi, validasi/konflik, ubah email, revokasi/login ulang dan tampilan mobile/tema. Ini bukti manual pengguna, bukan hasil Playwright API nyata. Fixture integrasi T14 tersisa 0 profil/akun/operasi/history. Suite seluruh repo tidak diulang.

## Checklist browser manual A

Gunakan karyawan uji T12/T13 dengan password yang sudah diganti. Jalankan stack pada [HR lokal](../deployment/hr-local.md); buka juga [Attendance lokal](../deployment/attendance-local.md) untuk memeriksa sesi/login.

1. HR → Karyawan → klik nama. Ubah nama/telepon/tanggal atau penugasan aktif, simpan; reload dan kembali ke daftar. Nilai tersimpan, email/status tidak ikut berubah. Kosongkan telepon dan pastikan tersimpan kosong.
2. Coba NIK milik karyawan lain dan field wajib kosong: ditolak, profil tersimpan tetap. Jika ada master lama nonaktif, mempertahankannya boleh; pilihan baru hanya master aktif. Dua tab profil: simpan tab pertama, penyimpanan tab kedua ditolak sampai muat ulang.
3. Coba email milik akun lain: setelah konfirmasi ditolak, email lama dan profil tetap. Email baru yang unik berhasil; reload detail/daftar menunjukkan email baru.
4. Sebelum langkah 3 yang berhasil, masuk sebagai karyawan di Attendance. Sesudah email berubah, reload/akses sesi lama harus ditolak. Email lama gagal login; email baru + password yang sama berhasil. Akun HR tetap aktif.
5. Periksa form/dialog pada lebar 320 px dan tema terang/gelap: tombol terbaca dan dapat dipakai, tanpa scroll horizontal. Jika gangguan jaringan menampilkan operasi pending, reload lalu lanjutkan operasi yang sama; jangan membuat permintaan kedua. Recovery timeout/restart sudah dibuktikan pada integrasi MySQL.

Hasil diterima: pengguna menyatakan sudah lolos pada 2026-10-02. Putaran A dicentang; agen berikut melanjutkan putaran B.
