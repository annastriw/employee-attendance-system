# Perubahan dan lifecycle karyawan — T14

Status: putaran A & B selesai; backend, gateway allowlist, MySQL nyata, UI H08, Vitest dan Playwright visual selesai diverifikasi. Checklist browser manual disiapkan untuk konfirmasi pengguna. Acuan: [baseline](../requirements/baseline.md), [provisioning T12](employee-provisioning.md), [UI/UX H08](frontend-ui-ux.md), [tier test](../../tasks/plan.md#tier-test-biaya-vs-nilai--disetujui-2026-10-02).

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

## Putaran B — kontrak lifecycle, history dan revokasi

Putaran B menambahkan transisi status karyawan dan konsistensinya lintas Employee–Auth. Schema sudah memiliki `EmpEmployee.status` (ACTIVE/INACTIVE/ARCHIVED) + `archivedAt`, `AuthAccount.status` (sama) + `archivedAt`, `AuthSession.revokedAt`, `EmpEmployeeHistory` (before/after Json), serta `EmpAuditLog`/`AuthAuditLog`. B menambahkan **satu** tabel durable-op `EmpLifecycleChange` (mirror `EmpEmailChange`: id operasi stabil, expected/target status, payloadHash, lease/backoff) agar transisi dapat dipulihkan setelah respons Auth hilang atau worker restart; tidak ada tabel receipt baru di Auth karena transisi lifecycle idempoten terhadap status akun. B memakai ulang pola durable-op lintas service dari putaran A (`EmpEmailChange` → signed `POST /internal/...` → transaksi Auth yang me-revoke sesi + menulis audit → Employee memperbarui proyeksi), bukan menambah broker/cache.

### Mesin status

- Status valid: `ACTIVE`, `INACTIVE`, `ARCHIVED`. Transisi yang diizinkan:
  - `ACTIVE → INACTIVE` (nonaktifkan), `INACTIVE → ACTIVE` (aktifkan).
  - `ACTIVE → ARCHIVED` dan `INACTIVE → ARCHIVED` (arsipkan).
  - `ARCHIVED → INACTIVE` (restore). Restore **tidak pernah** langsung ke ACTIVE; aktivasi adalah operasi terpisah sesudahnya.
- Transisi tak sah (mis. `ACTIVE → ACTIVE`, `ARCHIVED → ACTIVE`, status asal berbeda dari `expectedStatus`) ditolak 409 tanpa mengubah data. No-op (status sama) tidak menulis history.
- Hanya karyawan dengan profil siap (`ready = true`, `provisioning.status = COMPLETED`) yang dapat ditransisikan. Profil yang masih PENDING/FAILED di provisioning tetap dikelola lewat alur T12, bukan B.
- Transisi mengikat ke akun Auth yang terkoordinasi (`EmpProvisioning.authAccountId`). Status Employee adalah sumber keputusan HRD; status Auth adalah proyeksi yang disinkronkan dalam operasi yang sama.

### Efek pada Auth dan sesi

- `ACTIVE`: akun Auth `ACTIVE`, dapat login (setelah ganti password awal). `INACTIVE`/`ARCHIVED`: akun Auth `INACTIVE`/`ARCHIVED`, login ditolak, dan **semua sesi aktif direvoke** (`revokedAt` diisi) dalam transaksi Auth yang sama. `restore → INACTIVE` menjaga akun tetap `INACTIVE` (tidak dapat login) sampai aktivasi.
- Token/refresh lama milik akun yang dinonaktifkan/diarsipkan ditolak: SessionGuard menolak sesi ter-revoke, dan status akun non-ACTIVE menolak login/refresh. Aktivasi tidak menghidupkan kembali sesi lama; karyawan login ulang dengan kredensial yang berlaku.
- `ARCHIVED` bersifat terminal untuk akses: akun arsip tidak dapat login, tidak dapat diubah emailnya (konsisten dengan guard email A: `status === 'ARCHIVED'` ditolak). Email dan NIK **tetap dicadangkan** oleh constraint unik (`AuthAccount.email`, `EmpEmployee.nik`) — tidak ada hard delete dan tidak ada pelepasan email/NIK pada nonaktif/arsip/restore.

### Reservasi NIK dan email

- NIK unik di `EmpEmployee` dan email unik di `AuthAccount` sudah berlaku lintas semua status. B tidak menambah/menghapus constraint; B hanya memastikan transisi lifecycle tidak melepaskan keduanya. Membuat karyawan baru dengan NIK/email milik record INACTIVE/ARCHIVED tetap 409 (dibuktikan ulang hanya bila belum tercakup test A/T12).

### Operasi terhadap perubahan email PENDING

Urutan terhadap `EmpEmailChange` berstatus PENDING adalah titik kritis karena keduanya me-revoke sesi dan menyentuh akun Auth:

- Satu operasi email PENDING per karyawan sudah dijamin A. Saat ada email change PENDING, permintaan transisi lifecycle **ditolak 409** ("Selesaikan atau pulihkan perubahan email yang masih diproses") dan tidak membuat operasi lifecycle — mencegah dua penulis bersaing pada akun Auth yang sama.
- Sebaliknya, saat ada operasi lifecycle PENDING, permintaan email change ditolak dengan pesan setara. Keduanya saling eksklusif per karyawan.
- Nonaktif/arsip tidak membatalkan email change yang sudah COMPLETED; revokasi sesi oleh email change dan oleh lifecycle keduanya idempoten terhadap `AuthSession.revokedAt` (update `revokedAt` hanya pada sesi `revokedAt: null`).

### Konsistensi, retry dan pemulihan

- Employee mencatat operasi lifecycle durable (pola `EmpEmailChange`: id operasi stabil, `expectedStatus`/`targetStatus`, `payloadHash` terikat actor, lease/timeout/backoff tersimpan, worker). Dalam transaksi awal: lock profil `FOR UPDATE`, validasi transisi + ketiadaan email/lifecycle PENDING, tulis operasi + `EmpEmployeeHistory` before/after + `EmpAuditLog`. Status Employee hanya berubah setelah Auth mengonfirmasi (lihat urutan) agar tidak ada ACTIVE sepihak.
- Worker memanggil Auth `POST /internal/employee-lifecycle/:id` (signed service, `SkipThrottle`, `ProvisioningSecurity`) dengan `employeeId`/`actorAccountId`/`expectedStatus`/`targetStatus`/`authAccountId`. Auth dalam satu transaksi: lock akun, verifikasi actor ADMIN_HRD aktif + account EMPLOYEE, cek status akun saat ini sesuai harapan, set status akun, revoke sesi bila target non-ACTIVE, isi/`archivedAt` sesuai target, tulis `AuthEmailChange`-analog receipt lifecycle + `AuthAuditLog`. Replay receipt/payload sama tidak mengubah status atau mengulang revokasi/audit.
- Setelah receipt terkonfirmasi, Employee memperbarui `status` (+`archivedAt`) dan menandai operasi COMPLETED dalam transaksi, menulis history/audit penyelesaian. Respons Auth hilang/worker restart dilanjutkan dengan operasi yang sama (receipt idempoten). Kegagalan sementara (timeout/5xx) tetap PENDING dengan backoff; penolakan definitif (expected mismatch/akun arsip) menjadi FAILED tanpa mengubah status, dengan error code aman. Retry explicit terikat operasi tersedia.
- Pemulihan nyata (respons hilang setelah commit Auth, restart worker di tengah transisi) wajib dibuktikan dengan MySQL nyata sebelum B ditutup, bukan hanya happy path.

### API publik (Gateway allowlist)

Semua di bawah guard admin via `/auth/me` (ADMIN_HRD ACTIVE, sesi tidak revoke, `mustChangePassword=false`), seperti A.

- `POST /employees/:id/lifecycle` — body `{ targetStatus, expectedStatus }` + `Idempotency-Key` UUID v4. Satu operasi lifecycle PENDING per karyawan; terikat actor + payload. Key sama/data sama mengulang hasil; data berbeda 409. Menolak bila ada email change PENDING. Mengembalikan hasil aman operasi.
- `GET /employees/:id/history` — timeline `EmpEmployeeHistory` (action, before/after terkurasi aman, actor, waktu), pagination. Tidak memuat payload hash, lease, credential, atau token.
- `GET /employee-lifecycle/:id` dan `POST /employee-lifecycle/:id/retry` — status aman + pemulihan operasi milik actor (sama bentuk dengan `employee-email-changes`).
- `GET /employees/:id` putaran A diperluas memuat `status`, `archivedAt`, operasi lifecycle terakhir yang aman, serta flag "ada email/lifecycle PENDING" agar UI mencegah operasi bentrok.
- Gateway hanya meng-allowlist path/metode/query/header publik yang diperlukan; path internal Auth tetap tertutup.

### UI (H08)

Detail karyawan H08 menampilkan status + badge, dengan aksi Nonaktifkan/Aktifkan/Arsipkan/Restore sesuai status saat ini (memakai `ConfirmDialog` + `StatusBadge` + `Notice` yang ada). Setiap aksi destruktif/berisiko (nonaktif, arsip, yang me-revoke sesi) wajib konfirmasi yang menyebut efek revokasi sesi. H08 juga menampilkan timeline riwayat (`EmpEmployeeHistory`) — sesuai UI/UX H08 "riwayat karyawan arsip tetap tersedia". Aksi dikunci dan menjelaskan alasannya saat ada operasi email/lifecycle PENDING. Tema Linear terang/gelap; teks seperlunya.

### Acceptance dan pemeriksaan B

- Transisi sah mengubah status Employee+Auth konsisten; transisi tak sah dan `expectedStatus` yang basi ditolak 409 tanpa perubahan. Restore menghasilkan INACTIVE, bukan ACTIVE.
- Nonaktif/arsip me-revoke semua sesi aktif; login dan refresh/token lama ditolak sesudahnya; aktivasi tidak menghidupkan sesi lama. Akun arsip tidak dapat login maupun diubah email.
- Email/NIK pada record INACTIVE/ARCHIVED tetap dicadangkan; tidak ada hard delete.
- Operasi lifecycle idempoten (key sama → hasil sama), saling eksklusif dengan email change PENDING, dan atomik dengan history+audit. No-op tidak menulis history.
- MySQL nyata membuktikan: transisi + revokasi, penolakan expected mismatch, idempotensi, timeout/restart worker dan pemulihan receipt, serta eksklusivitas terhadap email PENDING. Typecheck/lint/test perilaku terfokus per package terdampak.
- Visual hanya halaman berubah (H08 detail + riwayat) pada 320/1440 px terang/gelap; tambah 768/1024 px bila breakpoint berubah.
- Browser manual satu checklist sesudah putaran B lengkap: nonaktif → sesi karyawan ditolak → aktif kembali butuh login baru; arsip → tidak bisa login/edit email; restore → INACTIVE lalu aktivasi; riwayat tampil; operasi bentrok terkunci. Ini bukti manual pengguna, bukan hasil Playwright.
- T14 tetap terbuka sampai putaran A dan B lengkap dan terverifikasi.

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

## Bukti putaran B — 2026-10-02

- Schema valid, migration `20261002200000_employee_lifecycle_changes` diterapkan pada dev & test, diff migrations terhadap schema exit 0; grants employee user SELECT/INSERT/UPDATE tanpa DELETE diverifikasi pada dev dan test.
- Gateway allowlist: POST /employees/:id/lifecycle (dengan Idempotency-Key UUID v4), GET /employees/:id/history (query pagination page/pageSize diizinkan), GET /employee-lifecycle/:id, dan POST /employee-lifecycle/:id/retry. 57 kontrak HTTP Gateway lulus (`test/auth-proxy.e2e-spec.ts`), termasuk 5 kontrak baru T14 B, penolakan path internal Auth, penolakan ID/query invalid, dan sanitasi header.
- Backend Auth & Employee: tabel `EmpLifecycleChange` durable operation, worker lease/backoff tersimpan, Auth internal signed `POST /api/v1/internal/employee-lifecycle/:id` dengan verifikasi actor ADMIN_HRD aktif, expected status check, perizinan transisi sesuai state machine, revokasi sesi pada non-ACTIVE (`revokedAt: new Date()`), receipt idempoten, dan penulisan audit log.
- MySQL nyata (`apps/employee-service/test/lifecycle.e2e-spec.ts`): 5/5 skenario lulus terhadap MySQL `attendance_test` nyata:
  1. Transisi sah (`ACTIVE -> INACTIVE -> ACTIVE -> ARCHIVED -> INACTIVE`), revokasi instan semua sesi aktif karyawan pada non-ACTIVE, penolakan login karyawan saat non-ACTIVE, aktivasi terpisah tidak menghidupkan kembali sesi lama (karyawan login ulang dengan kredensial berlaku), dan penulisan atomik `EmpEmployeeHistory`.
  2. Penolakan transisi tak sah: no-op status sama ditolak 400 tanpa history, stale `expectedStatus` ditolak 409 tanpa mutasi data, dan transisi terlarang `ARCHIVED -> ACTIVE` langsung ditolak 400.
  3. Idempotensi: request concurrent dengan key sama berhasil 200 dengan hasil sama; sequential replay dengan key sama mengulang hasil; key sama dengan payload berbeda ditolak 409; tepat 1 baris history tersimpan.
  4. Eksklusi dua arah: operasi email PENDING menolak request transisi lifecycle 409; sebaliknya operasi lifecycle PENDING menolak request perubahan email 409.
  5. Recovery response loss setelah restart: simulasi fault injection respons Auth terputus setelah commit berhasil mempertahankan status PENDING; instansiasi worker baru memulihkan operasi menjadi COMPLETED, memperbarui status profil Employee menjadi INACTIVE secara konsisten, dan Auth audit log idempoten tanpa duplikasi.
- Frontend UI H08 (`apps/hr-web`):
  - Kartu status dengan aksi dinamis: saat ACTIVE (Nonaktifkan & Arsipkan), saat INACTIVE (Aktifkan & Arsipkan), saat ARCHIVED (Restore karyawan).
  - ConfirmDialog wajib memperingatkan pencabutan sesi karyawan dan reservasi NIK/email, serta menjelaskan restore menghasilkan status Nonaktif dan butuh aktivasi terpisah.
  - Saat ARCHIVED: form edit profil dan form email disembunyikan dengan pesan eksplisit bahwa karyawan arsip tidak dapat diedit.
  - Penguncian mutasi saat `hasPendingOperation` bernilai true, banner progres PENDING, serta tombol lanjutkan/retry.
  - Timeline riwayat perubahan dari `GET /employees/:id/history` menampilkan aksi terformat dalam bahasa Indonesia, tanggal/waktu WIB, ringkasan perubahan, dan pagination.
- Test komponen: Vitest 9/9 lulus pada `EmployeeDetailPage.test.tsx` (edit profil, konfirmasi email, retry email, deteksi sesi berakhir, konfirmasi nonaktifkan + revokasi sesi, aktivasi & arsipkan, restore dari arsip, penguncian saat pending, dan timeline riwayat).
- Visual Playwright: 4/4 skenario lulus pada `portal-design.spec.ts` (320 px dan 1440 px, mode terang dan gelap); screenshot form detail, dialog konfirmasi nonaktifkan (termasuk peringatan pencabutan sesi), dan dialog konfirmasi email ditinjau; tanpa overflow atau pageerror.
- Typecheck dan lint Auth, Employee, Gateway, dan HR-web 100% bersih (0 warning, 0 error). Backend dist dibangun.

## Checklist browser manual B

Gunakan karyawan uji T12/T13 dengan password yang sudah diganti. Jalankan stack pada [HR lokal](../deployment/hr-local.md); buka juga [Attendance lokal](../deployment/attendance-local.md) untuk memeriksa sesi/login.

1. **Nonaktifkan & Revokasi Sesi**:
   - Di HR Web, buka Karyawan → klik karyawan berstatus Aktif.
   - Buka tab lain / browser incognito, login ke Attendance Web sebagai karyawan tersebut; pastikan berada di dashboard karyawan dengan sesi aktif.
   - Kembali ke HR Web, klik tombol "Nonaktifkan".
   - Periksa dialog konfirmasi: mencantumkan nama, NIK, dan kalimat tegas bahwa semua sesi aktif karyawan akan dicabut dan login ditolak.
   - Klik konfirmasi "Nonaktifkan". Status karyawan pada kartu status berubah menjadi Nonaktif, dan notice sukses muncul.
   - Pindah ke Attendance Web: lakukan reload atau klik menu; sesi karyawan harus ditolak (diarahkan ke login / sesi berakhir). Coba login kembali dengan password lama: ditolak karena akun Nonaktif.
2. **Aktivasi Terpisah**:
   - Di HR Web pada karyawan yang sama (status Nonaktif), klik "Aktifkan".
   - Periksa dialog konfirmasi, lalu konfirmasi. Status kembali Aktif.
   - Di Attendance Web, coba akses dengan token/sesi sebelum aktivasi: tetap ditolak (sesi lama tidak dihidupkan kembali).
   - Login kembali menggunakan email dan password karyawan: berhasil masuk dan mendapatkan sesi baru.
3. **Arsipkan Karyawan & Kunci Akses**:
   - Di HR Web, klik tombol "Arsipkan".
   - Periksa dialog konfirmasi: menyebut pencabutan sesi, larangan masuk/edit, dan penegasan bahwa NIK serta email tetap dicadangkan.
   - Konfirmasi pengarsipan. Status berubah menjadi Arsip.
   - Periksa halaman: form edit profil dan form email tidak lagi ditampilkan, digantikan pesan "Karyawan arsip tidak dapat diedit."
   - Di Attendance Web, login karyawan ditolak.
4. **Restore Karyawan ke Status Nonaktif**:
   - Di HR Web pada karyawan berstatus Arsip, klik "Restore karyawan".
   - Periksa dialog konfirmasi: menegaskan bahwa karyawan dipulihkan dengan status Nonaktif dan aktivasi adalah langkah terpisah berikutnya.
   - Konfirmasi. Status berubah menjadi Nonaktif (bukan langsung Aktif).
   - Di Attendance Web, login masih ditolak sampai HRD mengklik "Aktifkan" secara terpisah.
5. **Timeline Riwayat Perubahan**:
   - Periksa bagian "Riwayat perubahan" di bawah form detail.
   - Riwayat menampilkan seluruh transisi yang baru saja dilakukan secara kronologis: Status dinonaktifkan, Status diaktifkan, Status diarsipkan, Profil diperbarui, dll. lengkap dengan waktu WIB dan keterangan perubahan.
6. **Responsivitas & Tema**:
   - Periksa halaman detail dan seluruh dialog konfirmasi pada lebar layar 320 px (ponsel) serta mode terang dan gelap.
   - Seluruh teks terbaca jelas, tombol aksi dapat ditekan tanpa terpotong, dan tidak ada overflow horizontal pada layout.
