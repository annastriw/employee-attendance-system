# Reset password karyawan — T15

Status: spesifikasi modul disetujui; siap implementasi dan verifikasi bertahap. Acuan: [baseline](../requirements/baseline.md), [login karyawan T13](employee-auth-flow.md), [lifecycle T14](employee-lifecycle.md), [UI/UX H08](frontend-ui-ux.md), [tier test](../../tasks/plan.md#tier-test-biaya-vs-nilai--disetujui-2026-10-02).

## Latar belakang dan kebutuhan baseline

- Baseline baris 24–28: Karyawan dibuat HRD; password sementara tampil sekali dan disampaikan manual (tanpa email otomatis). Karyawan wajib mengganti password sementara sebelum mengakses fitur bisnis/absensi. Reset membatalkan semua sesi lama.
- Baseline baris 81: Peta endpoint memuat `POST activate/deactivate/restore/reset-password di /employees/:id/`.
- Acceptance T15:
  1. **Reset tampil sekali**: Password sementara baru hanya dikembalikan satu kali saat eksekusi berhasil; replay request dengan Idempotency-Key yang sama setelah diklaim ditolak 409 ("Password sudah ditampilkan"). Password tidak pernah disimpan plain text.
  2. **Wajib ganti**: Akun diset `mustChangePassword = true`. Saat karyawan login dengan password baru tersebut, sesi dibatasi dan dialihkan ke layar ganti password (E02) sebelum bisa masuk ke dashboard absensi.
  3. **Semua sesi lama batal**: Semua sesi aktif milik karyawan langsung dicabut (`revokedAt = now()`) seketika saat reset dieksekusi. Token/refresh lama ditolak.
  4. **Tidak ada secret di log/audit**: Plain text password dan hash tidak dicatat ke log konsol, `auth_audit_logs`, `emp_audit_logs`, maupun `emp_employee_history`.

## Arsitektur dan kontrak API

### 1. API Gateway
- Route: `POST /api/v1/employees/:id/reset-password`
- Regex allowlist: `/api/v1/employees/:id/reset-password` dengan `:id` UUID v4.
- Header:
  - `Authorization: Bearer <admin_token>` (diteruskan ke Employee Service).
  - `Idempotency-Key: <uuid-v4>` (wajib, divalidasi format UUID v4).
- Forward: Diteruskan ke Employee Service dengan header `Idempotency-Key` dan `X-Request-ID`.

### 2. Employee Service
- Controller: `EmployeesController`
  `POST /employees/:id/reset-password`
  Guarded by `AdminGuard` (memeriksa sesi ADMIN_HRD aktif).
- Validasi:
  - Karyawan harus terdaftar dan `ready === true`.
  - Status karyawan **bukan** `ARCHIVED` (karyawan arsip ditolak 409: "Karyawan arsip tidak dapat di-reset password").
  - Mutual exclusion: jika terdapat operasi PENDING pada karyawan (`empEmailChange` PENDING atau `empLifecycleChange` PENDING), tolak 409: "Operasi sebelumnya sedang diproses. Selesaikan atau pulihkan terlebih dahulu."
- Koordinasi ke Auth Service:
  - Memanggil Auth Service via internal signed HTTP client (`ProvisioningAuthClient`):
    `POST /internal/employee-reset-password/:id` (dengan `:id` adalah Idempotency-Key UUID).
    Payload: `{ employeeId: string, actorAccountId: string }`.
  - Menerima respons `{ email: string, temporaryPassword: string }`.
- Pencatatan lokal (dalam satu transaksi):
  - `EmpEmployeeHistory`: `action: 'EMPLOYEE_PASSWORD_RESET'`, `before: {}`, `after: { mustChangePassword: true }`.
  - `EmpAuditLog`: `action: 'EMPLOYEE_PASSWORD_RESET'`, `entityType: 'EMPLOYEE'`, `entityId: id`, `actorAccountId: actor.accountId`.
- Mengembalikan response 200 OK: `{ email: string, temporaryPassword: string }`.

### 3. Auth Service
- Controller: `AccountResetPasswordController`
  `POST /internal/employee-reset-password/:id`
  Guarded by `ProvisioningSecurity` (verifikasi HMAC signature internal service).
- Model data: `AuthPasswordReset`
  - `id`: String @id @db.Char(36) (Idempotency-Key dari request).
  - `accountId`: String @map("account_id") @db.Char(36).
  - `actorAccountId`: String @map("actor_account_id") @db.Char(36).
  - `payloadHash`: String @map("payload_hash") @db.Char(64).
  - `claimedAt`: DateTime @default(now()) @map("claimed_at") @db.DateTime(3).
  - `createdAt`: DateTime @default(now()) @map("created_at") @db.DateTime(3).
- Validasi & Eksekusi:
  1. Hitung `payloadHash = sha256(JSON.stringify({ employeeId, actorAccountId }))`.
  2. Periksa apakah `AuthPasswordReset` dengan `id` sudah ada:
     - Jika ada dengan `payloadHash` berbeda: tolak 409 Conflict ("Idempotency-Key sudah digunakan untuk data lain.").
     - Jika sudah ada: tolak 409 Conflict ("Password sudah ditampilkan.").
  3. Di dalam transaksi database dengan lock `FOR UPDATE`:
     - Verifikasi actor: harus `ADMIN_HRD`, status `ACTIVE`, `mustChangePassword === false`.
     - Cari akun target berdasarkan `employeeId`. Akun harus `role === 'EMPLOYEE'` dan `status !== 'ARCHIVED'`.
     - Generate password sementara acak baru: `randomBytes(24).toString('base64url')`.
     - Hash password baru dengan bcrypt: `hash(password, 12)`.
     - Update `AuthAccount`:
       `passwordHash = newHash`
       `mustChangePassword = true`
       `passwordChangedAt = null`
     - Revoke semua sesi aktif target:
       `authSession.updateMany({ where: { accountId: target.id, revokedAt: null }, data: { revokedAt: new Date() } })`.
     - Catat record `AuthPasswordReset`:
       `{ id, accountId: target.id, actorAccountId, payloadHash, claimedAt: new Date() }`.
     - Catat record `AuthAuditLog`:
       `{ actorAccountId, targetAccountId: target.id, action: 'EMPLOYEE_PASSWORD_RESET', requestId }`.
     - Kembalikan `{ email: target.email, temporaryPassword: password }`.

### 4. Frontend HR Web (`apps/hr-web`)
- Lokasi: `EmployeeDetailPage.tsx` (H08)
- Aksi pada kartu status:
  - Tombol "Reset password" (variant="secondary" atau "danger") tersedia saat status karyawan `ACTIVE` atau `INACTIVE`.
  - Tombol disembunyikan/dilarang saat `ARCHIVED`.
  - Disabled saat `busy || detail.hasPendingOperation`.
- Dialog konfirmasi (`ConfirmDialog`):
  - Judul: "Reset password karyawan"
  - Deskripsi: "Reset password untuk {detail.name} ({detail.email})? Semua sesi login karyawan saat ini akan dicabut seketika. Password sementara baru akan dibuat dan hanya ditampilkan sekali."
  - Tombol aksi: "Reset password" (variant="danger").
- Tampilan password sementara (`TemporaryPasswordDialog`):
  - Menggunakan komponen yang sudah ada `TemporaryPasswordDialog.tsx`.
  - Menampilkan password sementara dalam input read-only, tombol "Salin", dan tombol "Selesai".
  - Saat dialog ditutup, data password dihapus dari state React (tidak dapat dibuka kembali).
- Riwayat perubahan:
  - Bagian history menampilkan entri `EMPLOYEE_PASSWORD_RESET`:
    Judul: "Password di-reset"
    Detail: "Sesi dicabut dan password sementara baru dibuat."

## Verifikasi dan acceptance test

1. **MySQL E2E Real Stack**:
   - Reset password karyawan aktif: berhasil menghasilkan password baru, mencabut sesi aktif lama, mengunci login lama, dan mengizinkan login dengan password sementara.
   - Login dengan password sementara: token memiliki status `mustChangePassword: true`, akses fitur terproteksi ditolak sebelum ganti password pada `E02`.
   - Sesi lama seketika ditolak: panggilan API menggunakan token sebelum reset mengembalikan 401 Unauthorized.
   - Idempotensi & One-time claim: replay request dengan Idempotency-Key yang sama ditolak 409 ("Password sudah ditampilkan.").
   - Konflik status: reset password untuk karyawan berstatus ARCHIVED ditolak 409.
   - Mutual exclusion: reset password saat operasi email atau lifecycle sedang PENDING ditolak 409.
   - Sanitasi data: verifikasi tidak ada plaintext password atau hash di log konsol, `auth_audit_logs`, `emp_audit_logs`, atau `emp_employee_history`.
2. **Gateway Contract Tests**:
   - Allowlist route `POST /api/v1/employees/:id/reset-password`.
   - Penolakan ID bukan UUID dan ketiadaan header `Idempotency-Key`.
   - Forwarding header otorisasi dan request ID.
3. **Frontend Vitest Component Tests**:
   - Render tombol "Reset password" pada karyawan aktif/nonaktif, tidak muncul pada arsip.
   - Klik memunculkan ConfirmDialog dengan peringatan pencabutan sesi dan satu kali tampil.
   - Konfirmasi memanggil endpoint API dengan Idempotency-Key UUID.
   - Menampilkan TemporaryPasswordDialog dengan kredensial yang diterima.
   - Menutup dialog menghapus kredensial dari memori UI.
   - Timeline riwayat merender kartu "Password di-reset".
4. **Playwright Visual Tests**:
   - Screenshot dialog konfirmasi reset password pada 320 px dan 1440 px (terang/gelap).
   - Screenshot TemporaryPasswordDialog hasil reset pada 320 px dan 1440 px (terang/gelap).
   - Verifikasi tanpa scroll horizontal atau overflow layout.
5. **Typecheck & Lint**:
   - 0 error, 0 warning pada seluruh package terdampak.

## Hasil verifikasi otomatis (2026-10-02)

1. **Unit & Contract Tests**:
   - `apps/auth-service`: `reset-password.service.spec.ts` (3/3 passed).
   - `apps/employee-service`: `reset-password.service.spec.ts` (4/4 passed).
   - `apps/api-gateway`: `auth-proxy.e2e-spec.ts` (58/58 passed, termasuk verifikasi allowlist `POST /api/v1/employees/:id/reset-password`, header forwarding, dan penolakan payload/idempotensi tidak valid).
2. **Real MySQL E2E Integration (`apps/employee-service/test/reset-password.e2e-spec.ts`)**:
   - 5/5 skenario lulus terhadap instance MySQL test lokal nyata:
     - `[PASS]` Reset password menghasilkan temporary password, mencabut semua sesi aktif seketika, mengeset `mustChangePassword`, menolak sesi lama (401), login dengan password sementara diarahkan ke ganti password, dan password permanen baru bekerja.
     - `[PASS]` Replay request dengan Idempotency-Key yang sama ditolak 409 Conflict ("Password sudah ditampilkan.").
     - `[PASS]` Mutual exclusion: menolak reset password (409) jika operasi email atau lifecycle sedang PENDING pada karyawan tersebut.
     - `[PASS]` Menolak reset password untuk karyawan berstatus ARCHIVED (409).
     - `[PASS]` Sanitasi data: verifikasi tidak ada plaintext password atau hash yang bocor ke konsol, `auth_audit_logs`, `emp_audit_logs`, maupun `emp_employee_history`.
3. **Frontend Vitest & RTL (`apps/hr-web/src/pages/EmployeeDetailPage.test.tsx`)**:
   - 10/10 test lulus, mencakup render tombol reset password pada ACTIVE/INACTIVE, penyembunyian pada ARCHIVED, dialog konfirmasi dengan peringatan pencabutan sesi, pemanggilan API dengan Idempotency-Key UUID, tampilan dialog password sementara, pembersihan state password setelah ditutup, dan timeline riwayat.
4. **Visual Playwright (`apps/hr-web/test/portal-design.spec.ts`)**:
   - 4/4 test visual lulus pada viewport 320 px dan 1440 px untuk mode terang dan gelap.
   - Screenshot `employee-reset-password-dialog` dan `employee-temporary-password-dialog` diverifikasi tanpa overflow horizontal.
5. **Lint & Build**:
   - `pnpm run lint` pada seluruh package lulus (0 errors, 0 warnings).
   - `pnpm --filter hr-web run build`, `pnpm --filter auth-service run build`, `pnpm --filter employee-service run build`, `pnpm --filter api-gateway run build` semua lulus exit 0.

## Checklist pengujian browser manual T15 (API & Database Nyata)

Jalankan langkah-langkah pengujian manual berikut di peramban untuk memverifikasi fitur Reset Password Karyawan secara menyeluruh:

1. **Persiapan Sesi Karyawan Aktif**:
   - Pastikan backend stack (`api-gateway`, `auth-service`, `employee-service`) dan frontend (`hr-web`, `attendance-web`) sedang berjalan atau siap diakses.
   - Buka HR Web di `http://localhost:5174`, login sebagai HRD, buka menu **Karyawan**, lalu pilih salah satu karyawan berstatus **Aktif**.
   - Buka tab peramban baru / jendela samaran (*incognito*), buka Attendance Web di `http://localhost:5173`, login menggunakan email dan password karyawan tersebut. Pastikan berhasil masuk ke dashboard absensi karyawan dengan sesi aktif.
2. **Eksekusi Reset Password di HR Web**:
   - Kembali ke tab HR Web pada halaman detail karyawan.
   - Pada kartu status karyawan, klik tombol **Reset password**.
   - Periksa dialog konfirmasi (`ConfirmDialog`):
     - Judul: "Reset password karyawan".
     - Pesan konfirmasi harus memuat peringatan tegas: *"Semua sesi login karyawan saat ini akan dicabut seketika. Password sementara baru akan dibuat dan hanya ditampilkan sekali."*
   - Klik tombol konfirmasi **Reset password**.
3. **Tampilan Password Sementara (One-Time Display)**:
   - Setelah proses berhasil, muncul dialog **Password sementara dibuat**.
   - Periksa bahwa kolom password menampilkan password acak baru yang dapat dibaca dan tombol **Salin** berfungsi untuk menyalin ke clipboard.
   - Klik **Salin**, lalu klik tombol **Selesai**.
   - Periksa bahwa setelah dialog ditutup, password sementara **tidak dapat dilihat kembali** pada halaman detail (tidak ada tombol untuk membuka kembali password sementara yang sudah diklaim).
4. **Pencatatan Riwayat Perubahan**:
   - Gulir ke bawah pada bagian **Riwayat perubahan**.
   - Periksa entri teratas: terdapat kartu dengan judul **Password di-reset** dan keterangan *"Sesi dicabut dan password sementara baru dibuat."* lengkap dengan timestamp WIB.
5. **Revokasi Sesi Aktif Seketika**:
   - Beralih ke tab/jendela Attendance Web karyawan yang sebelumnya login.
   - Lakukan navigasi atau muat ulang (*refresh*) halaman dashboard.
   - Sesi aktif lama karyawan harus seketika ditolak (pengguna langsung dialihkan ke halaman login dengan notifikasi sesi telah berakhir).
6. **Penolakan Password Lama**:
   - Pada halaman login Attendance Web, coba login kembali menggunakan email karyawan dan **password lama** (sebelum di-reset).
   - Login harus ditolak dengan pesan kesalahan kredensial tidak valid.
7. **Login dengan Password Sementara & Wajib Ganti Password**:
   - Masukkan email karyawan dan **password sementara baru** yang tadi disalin dari HR Web.
   - Login berhasil diterima, namun sistem **wajib langsung mengarahkan** karyawan ke layar Ganti Password (`/change-password` / E02).
   - Karyawan tidak diizinkan mengakses menu absensi atau dashboard utama sebelum menyelesaikan pergantian password.
8. **Pergantian ke Password Baru Permanen**:
   - Pada layar Ganti Password, masukkan password baru yang memenuhi syarat keamanan (minimal 8 karakter, kombinasi huruf dan angka).
   - Simpan password baru.
   - Karyawan berhasil diarahkan ke dashboard utama absensi dengan sesi normal penuh.
9. **Larangan Reset pada Karyawan Arsip**:
   - Di HR Web, buka detail karyawan yang berstatus **Arsip** (*ARCHIVED*).
   - Periksa bahwa tombol **Reset password** tidak ditampilkan / dinonaktifkan sepenuhnya.
10. **Tampilan Responsif & Tema**:
    - Uji dialog konfirmasi reset password dan dialog password sementara pada viewport ponsel (320 px) serta mode terang dan gelap.
    - Pastikan tata letak rapi, teks terbaca jelas, tombol aksi tidak terpotong, dan tidak ada *horizontal overflow*.
