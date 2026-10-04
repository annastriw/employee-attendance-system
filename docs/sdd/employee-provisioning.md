# Employee provisioning — T12

Frekuensi testing dan aturan centang: [workflow aktif](../testing/workflow.md). Resep/hasil suite lama di dokumen ini tidak menjadi gate rutin; bukti historis tetap dipertahankan.
Status: T12 selesai pada 2026-10-02 berdasarkan integrasi MySQL dan laporan uji browser manual pengguna; E2E Playwright otomatis ditunda karena RAM host. Acuan: [baseline](../requirements/baseline.md), [tooling](../architecture/adr-002-project-tooling.md), [Auth](auth-service.md), [UI/UX H07/H10](frontend-ui-ux.md) dan [tier test](../../tasks/plan.md#tier-test-biaya-vs-nilai--disetujui-2026-10-02).

## Tujuan dan batas
HRD membuat profil dan akun karyawan melalui H07. NIK/email unik termasuk data nonaktif/arsip. Password sementara acak tampil sekali di H10 setelah akun+profil konsisten, lalu disampaikan manual. Akun wajib mengganti password sebelum fitur bisnis. T13 menangani panel login karyawan; T14 menangani edit/lifecycle dan T15 menangani reset umum. Tidak menambah admin, email otomatis atau hard delete profil/akun.

## Kepemilikan dan kontrak
- Employee memiliki profil: UUID, NIK internal, nama, telepon opsional, departemen, jabatan, tanggal mulai bekerja, status; serta operasi provisioning/outbox dan audit. Auth memiliki email, hash bcrypt, sesi dan receipt provisioning. Tidak ada query/FK lintas kepemilikan service.
- Departemen/jabatan harus ACTIVE untuk penugasan baru. Validasi dilakukan lagi dalam transaksi penulisan; ID yang tidak ada atau master nonaktif tidak menghasilkan akun siap pakai.
- Gateway hanya allowlist endpoint publik karyawan/provisioning; seluruh endpoint internal Auth tetap tertutup dari Gateway.
- Endpoint publik memakai AdminGuard yang memeriksa /auth/me: admin ACTIVE, sesi belum direvoke dan mustChangePassword=false. Receipt/password juga hanya dapat diambil admin pembuat operasi, melalui pemeriksaan sesi terbaru.
- POST /api/v1/employees: NIK, nama, email, telepon opsional, departmentId, positionId, startDate dan status ACTIVE/INACTIVE; Idempotency-Key UUID wajib. UUID operasi terikat actor dan digest payload ternormalisasi. Key+payload sama melanjutkan operasi yang sama; payload berbeda ditolak 409. Konflik NIK/email case-insensitive mendapat 409 dengan field aman.
- GET /api/v1/employee-provisioning/:id mengembalikan status aman (PENDING, COMPLETED, FAILED/RECOVERING), employeeId bila tersedia dan kode kesalahan aman. Tidak mengembalikan password/hash/token/payload outbox.
- POST /api/v1/employee-provisioning/:id/retry melanjutkan langkah belum selesai; tidak membuat profil/akun kedua. Body email opsional hanya memperbaiki konflik email saat PREPARE gagal dan belum ada akun Auth; tetap memakai profil/NIK/operationId yang sama. Setelah prepare berhasil, email tidak dapat diganti lewat retry. POST /api/v1/employee-provisioning/:id/credentials mengonsumsi receipt sekali setelah COMPLETED. Respons credential memakai Cache-Control: no-store; retry setelah dikonsumsi tidak mengembalikan password lama.

## Konsistensi, retry dan pemulihan
1. Employee mencatat operasi/profil belum siap dan outbox dalam transaksi yang sama, dengan audit tanpa kredensial. NIK dicadangkan melalui constraint unik; hanya data siap yang menjadi hasil sukses bisnis.
2. Worker memanggil Auth prepare memakai ID operasi stabil. Auth membuat akun EMPLOYEE INACTIVE, mustChangePassword=true, hash bcrypt cost 12 dan receipt credential. Email unik ditegakkan DB; prepare yang diulang tidak mengganti password atau membuat akun kedua.
3. Setelah receipt prepare terkonfirmasi, Employee menerbitkan profil siap dalam transaksi; kemudian mengirim finalize ke Auth. Auth mengubah akun ke status yang diminta hanya setelah konfirmasi profil siap. ACTIVE tidak pernah dipakai untuk profil yang belum terbit. Akun INACTIVE tetap tidak dapat login.
4. Setelah finalize terkonfirmasi, Employee menandai COMPLETED. Timeout setelah commit penerima dipulihkan melalui pembacaan status/ulang ID operasi yang sama. Worker menggunakan timeout, lease/claim atomik, backoff terbatas dan jadwal retry tersimpan; restart tidak kehilangan pekerjaan.
5. Konflik permanen menghentikan retry otomatis; akun yang belum terkoordinasi tetap INACTIVE, profil tidak dilaporkan sukses. Kompensasi tidak menghapus profil/akun permanen atau melepaskan NIK/email historis. Catat FAILED/RECOVERING beserta kesalahan aman dan sediakan retry yang terikat operasi; pemulihan final harus dibuktikan sebelum T12 ditutup.

Endpoint internal memakai autentikasi service khusus (terpisah dari JWT pengguna), timeout dan validasi DTO ketat; key tidak masuk Git. Uji signature salah/replay langkah/actor palsu. Delivery boleh berulang; penerima melakukan deduplikasi operationId+fase dalam transaksi. Tidak menambah broker/cache.

## Password sementara dan sanitasi
Auth menghasilkan password dengan CSPRNG, menyimpan hash; receipt sementara disimpan terenkripsi dengan kunci khusus di environment, bukan plaintext/outbox/audit. Worker tidak menyalin credential ke tabel Employee. Konsumsi receipt atomik hanya sesudah kedua sisi konsisten, lalu ciphertext dihapus/dikosongkan. H10 menyimpan password hanya dalam state memori; Salin dan Selesai, tanpa URL/localStorage/sessionStorage/console. Penutupan dialog/logout menghapus state. Jika respons credential hilang setelah konsumsi, UI menjelaskan password tidak dapat ditampilkan ulang; HRD pembuat dapat meminta password pengganti hanya untuk operasi ini selama password awal belum diganti; password lama dan sesi lama dibatalkan. Pengganti tidak menampilkan ulang password lama. Setelah password pertama diganti, recovery ditolak; reset umum tetap T15. Alur kehilangan respons diuji sebelum T12 selesai.

## Struktur dan increment serial
- Schema/migration/grants: prisma/ dan packages/database; tabel profil, operasi/outbox Employee serta receipt Auth. Migration terpusat, runtime sesuai tabel milik service.
- Auth: apps/auth-service/src/provisioning/; DTO/controller/service autentikasi internal, prepare/finalize/receipt atomik.
- Employee: apps/employee-service/src/employees/ dan provisioning/; DTO/controller/service, coordinator/worker dan retry.
- Gateway: allowlist employee/provisioning, forwarding header idempotensi yang eksplisit; internal path ditolak.
- HR: H07/H10 dan daftar minimal hasil karyawan, memakai pola form/Notice/ConfirmDialog dan MasterAssignmentSelect. Muat semua pilihan ACTIVE melalui pagination; tema bersama Linear terang/gelap.
- Test: unit/kontrak terfokus tiap increment; integrasi MySQL dan E2E provisioning di checkpoint fitur. Berikutnya schema terlebih dahulu, kemudian API/worker → UI → checkpoint nyata.

## Verifikasi dan acceptance
- Migration dev/test, diff migrations→schema exit 0, grant runtime dan typecheck/lint terkait lulus.
- MySQL nyata: unik NIK/email, submit ganda/concurrent, master nonaktif, role/restricted/revoked, rollback audit, timeout sebelum/sesudah commit Auth, retry dan restart worker; tidak ada akun ACTIVE tanpa profil siap.
- Receipt hanya sekali, hak actor diperiksa, ciphertext/hash/password tidak muncul di list/error/audit/log. Recovery kehilangan respons credential mempunyai bukti nyata; tidak dianggap selesai hanya dengan happy path.
- Komponen H07/H10: validasi field, master aktif paginated, busy/error/retry, password disalin lalu state dibuang. Visual halaman terkait 320/1440 terang/gelap; viewport tengah bila breakpoint berubah.
- Build dist Auth/Employee/Gateway sebelum E2E otomatis; Playwright 1 worker dan suite berat serial. Browser manual T12 membuktikan HRD → profil+akun konsisten → password sekali pada desktop/mobile. Login karyawan dan forced-change diverifikasi pada checkpoint T13 setelah UI E01/E02 tersedia.
- Gunakan script package yang ada: pnpm --dir apps/auth-service run test --runInBand; pnpm --dir apps/employee-service run test --runInBand; pnpm --dir apps/hr-web run test; pilih spec/modul terfokus saat tersedia. Build/lint/typecheck sesuai tier, bukan mengulang seluruh suite untuk dokumen ini.

## Bukti penutupan (2026-10-02)
- Backend Auth–Employee–MySQL: 7 skenario nyata lulus, termasuk submit bersamaan/idempotensi, receipt atomik, recovery password, revokasi, restart worker, kompensasi dan konflik unik. Gateway: 45 kontrak HTTP lulus. UI HR: typecheck/lint, 25 test terfokus, serta 8 pemeriksaan visual terang/gelap lulus pada increment sebelumnya.
- Pengguna melaporkan lima pemeriksaan browser manual T12 lulus pada desktop dan mobile: pembuatan karyawan valid, password sementara sekali tampil, data muncul kembali tanpa membuka password, konflik email ditolak tanpa data ganda, dan form/dialog mobile 320 px dapat digunakan.
- Spec Playwright desktop/mobile ditambahkan pada commit 9400f3a. Sintaks, typecheck, lint, dan discovery dua skenario lulus; eksekusi E2E otomatis ditunda saat RAM tersedia sekitar 1,9 GB. Hasil otomatis belum diklaim lulus.
- Login karyawan sampai forced change diverifikasi pada checkpoint T13, memakai akun hasil provisioning T12.
