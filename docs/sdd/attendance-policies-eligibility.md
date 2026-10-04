# Aturan Waktu dan Eligibility Absensi — T16

Frekuensi testing dan aturan centang: [workflow aktif](../testing/workflow.md). Resep/hasil suite lama di dokumen ini tidak menjadi gate rutin; bukti historis tetap dipertahankan.

Status: spesifikasi modul disetujui; siap implementasi dan verifikasi bertahap. Acuan: [baseline](../requirements/baseline.md), [plan](../../tasks/plan.md#tier-test-biaya-vs-nilai--disetujui-2026-10-02), [todo](../../tasks/todo.md), [lifecycle karyawan](employee-lifecycle.md).

## 1. Latar Belakang dan Keputusan Baseline

- **Waktu Resmi Backend**: Backend menentukan waktu resmi pencatatan (server-authoritative time) dalam zona waktu Asia/Jakarta (WIB = UTC+7). Waktu klien (`clientCapturedAt`) hanya dicatat sebagai data diagnostik perangkat.
- **Jadwal Kerja Default**:
  - Hari kerja reguler: Senin sampai Jumat (ISO weekday 1–5).
  - Jam kerja: 08:00:00 sampai 17:00:00 WIB.
- **Presisi Ambang Waktu**:
  - **Check-in**:
    - Sampai dengan `08:00:00.000` WIB: **Tepat Waktu** (`isLate = false`), alasan opsional / tidak wajib.
    - Setelah `08:00:00.000` WIB (mulai `08:00:00.001` WIB): **Terlambat** (`isLate = true`), alasan wajib diisi (`reason` minimal 1 karakter non-spasi).
  - **Checkout**:
    - Sebelum `17:00:00.000` WIB (sampai `16:59:59.999` WIB): **Pulang Lebih Awal** (`isEarlyDeparture = true`), alasan wajib diisi.
    - Mulai `17:00:00.000` WIB: **Sesuai Jadwal** (`isEarlyDeparture = false`), alasan opsional, bukan otomatis lembur.
    - Paling lambat `23:59:59.999` WIB pada tanggal check-in: batas akhir checkout.
    - Setelah `23:59:59.999` WIB (pukul `00:00:00.000` WIB hari berikutnya): jendela checkout ditutup / kedaluwarsa (`CUTOFF_EXPIRED`). Tidak ada checkout otomatis; status hari tersebut tetap "Belum checkout".
- **Akhir Pekan dan Hari Libur**:
  - Sabtu, Minggu, atau tanggal yang terdaftar pada tabel kalender libur (`att_holidays`) diklasifikasikan sebagai **Di Luar Hari Kerja** (`isOutsideSchedule = true`).
  - Absensi tetap diizinkan (bersifat sukarela).
  - Tidak ada penilaian keterlambatan atau pulang lebih awal (`isLate = false`, `isEarlyDeparture = false`).
  - Alasan tidak diwajibkan untuk jam berapa pun.
  - Hari libur atau akhir pekan tidak menimbulkan kewajiban hadir; jika karyawan tidak absen, tidak dihitung sebagai *missing attendance*.
- **Snapshot Immutability & Event Campuran**:
  - Setiap event check-in/checkout menyimpan `policySnapshot` yang memuat konfigurasi jadwal kerja dan status hari libur pada saat event dieksekusi.
  - Jika check-in terjadi pada pagi hari kerja reguler (terlambat), lalu siang harinya HRD menetapkan hari tersebut sebagai libur khusus perusahaan, snapshot event check-in pagi **tidak berubah** (tetap tercatat terlambat dengan alasan aslinya).
  - Namun event checkout berikutnya dan kewajiban harian pada hari tersebut dievaluasi berdasarkan status libur yang baru.

## 2. Definisi dan Rekonstruksi Eligibility Karyawan

### A. Eligibility Real-time (Saat Melakukan Absensi)
Karyawan berhak mengirim absensi pada tanggal `D` jika dan hanya jika:
1. Akun dan profil karyawan berstatus `ready === true`.
2. Status karyawan pada saat pengiriman adalah `ACTIVE`.
   - Karyawan berstatus `INACTIVE` atau `ARCHIVED` ditolak dengan kode status HTTP `403 Forbidden` ("Akun karyawan tidak aktif atau telah diarsipkan.").
3. Tanggal absensi `D >= startDate` karyawan (karyawan tidak dapat mencatat kehadiran untuk tanggal sebelum tanggal mulai bekerja).

### B. Eligibility Historis (Perhitungan Missing Attendance & Monitoring)
Baseline baris 73–74 menetapkan:
> "Profil departemen/jabatan snapshot di catatan harian; riwayat karyawan untuk eligibility historis."
> "Missing attendance dihitung, bukan baris palsu. Absensi terhapus bukan missing."

Pada tanggal kerja `D`, seorang karyawan dihitung memiliki kewajiban absensi jika:
1. Tanggal `D` adalah hari kerja reguler (Senin–Jumat dan bukan tanggal dalam `att_holidays`).
2. Tanggal `D >= startDate` karyawan.
3. Status karyawan pada tanggal `D` adalah `ACTIVE`.
   - Jika karyawan saat ini berstatus `INACTIVE` atau `ARCHIVED`, sistem merekonstruksi riwayat status karyawan dari `emp_employee_history`:
     - Jika pada tanggal `D` karyawan berstatus `ACTIVE` (misalnya karyawan baru dinonaktifkan pada `D + 5`), maka pada tanggal `D` karyawan tersebut wajib hadir.
     - Jika pada tanggal `D` karyawan sudah berstatus `INACTIVE` atau `ARCHIVED`, maka karyawan tidak memiliki kewajiban hadir (bukan missing).
4. Penentuan Status Harian:
   - **Ada catatan absensi aktif**: Hadir (`CHECKED_IN` atau `COMPLETED`).
   - **Catatan absensi ada tetapi soft-deleted** (`deletedAt !== null`): **Bukan missing attendance** (ditandai `DELETED_BY_HRD`).
   - **Tidak ada catatan absensi sama sekali**:
     - Jika `D < today` (hari kemarin atau sebelumnya): **Tidak Ada Absensi** (`MISSING`).
     - Jika `D === today`:
       - Selama jam kerja (sebelum 17:00:00 WIB): **Belum Check-in** (`PENDING_CHECK_IN`).
       - Setelah jam kerja (mulai 17:00:00 WIB): **Tidak Ada Absensi** (`MISSING`).

## 3. Desain Model Data Database (Attendance Service)

Model data dikelola melalui Prisma pada schema terpusat (`prisma/schema.prisma`) dengan kepemilikan tabel penuh oleh Attendance Service:

### `att_work_policies`
- `id`: String @id @db.Char(36)
- `name`: String @db.VarChar(80) (Default: "Standard WIB")
- `workDays`: String @map("work_days") @db.VarChar(20) (Default: "1,2,3,4,5")
- `checkInTime`: String @map("check_in_time") @db.VarChar(8) (Default: "08:00:00")
- `checkOutTime`: String @map("check_out_time") @db.VarChar(8) (Default: "17:00:00")
- `cutoffTime`: String @map("cutoff_time") @db.VarChar(8) (Default: "23:59:59")
- `timezone`: String @db.VarChar(40) (Default: "Asia/Jakarta")
- `isActive`: Boolean @default(true) @map("is_active")
- `createdAt`, `updatedAt`: DateTime

### `att_holidays`
- `id`: String @id @default(uuid()) @db.Char(36)
- `holidayDate`: DateTime @unique @map("holiday_date") @db.Date
- `description`: String @db.VarChar(200)
- `createdAt`, `updatedAt`: DateTime

### `att_daily_records`
- `id`: String @id @default(uuid()) @db.Char(36)
- `employeeId`: String @map("employee_id") @db.Char(36)
- `attendanceDate`: DateTime @map("attendance_date") @db.Date
- `departmentIdSnapshot`: String @map("department_id_snapshot") @db.Char(36)
- `departmentNameSnapshot`: String @map("department_name_snapshot") @db.VarChar(120)
- `positionIdSnapshot`: String @map("position_id_snapshot") @db.Char(36)
- `positionNameSnapshot`: String @map("position_name_snapshot") @db.VarChar(120)
- `deletedAt`: DateTime? @map("deleted_at") @db.DateTime(3)
- `deleteReason`: String? @map("delete_reason") @db.VarChar(500)
- `deletedByAccountId`: String? @map("deleted_by_account_id") @db.Char(36)
- `createdAt`, `updatedAt`: DateTime
- `@@unique([employeeId, attendanceDate])` (menjamin satu catatan per karyawan per tanggal, termasuk catatan terhapus)

### `att_events`
- `id`: String @id @default(uuid()) @db.Char(36)
- `dailyRecordId`: String @map("daily_record_id") @db.Char(36)
- `eventType`: Enum `CHECK_IN` | `CHECK_OUT`
- `eventTime`: DateTime @map("event_time") @db.DateTime(3) (waktu resmi server UTC)
- `clientCapturedAt`: DateTime @map("client_captured_at") @db.DateTime(3)
- `isOutsideSchedule`: Boolean @default(false) @map("is_outside_schedule")
- `isLate`: Boolean @default(false) @map("is_late")
- `isEarlyDeparture`: Boolean @default(false) @map("is_early_departure")
- `reason`: String? @db.VarChar(500)
- `photoObjectId`: String @map("photo_object_id") @db.Char(36)
- `captureMethod`: Enum `AUTO` | `MANUAL`
- `latitude`: Decimal @db.Decimal(10, 7)
- `longitude`: Decimal @db.Decimal(10, 7)
- `accuracyMeters`: Decimal @map("accuracy_meters") @db.Decimal(8, 2)
- `locationCapturedAt`: DateTime @map("location_captured_at") @db.DateTime(3)
- `policySnapshot`: Json @map("policy_snapshot")
- `createdAt`: DateTime
- `@@unique([dailyRecordId, eventType])` (menjamin tepat satu check-in dan satu checkout per daily record)

### `att_idempotency_requests`
- `id`: String @id @db.Char(36)
- `employeeId`: String @map("employee_id") @db.Char(36)
- `payloadHash`: String @map("payload_hash") @db.Char(64)
- `responseStatus`: Int @map("response_status")
- `responseBody`: Json @map("response_body")
- `createdAt`: DateTime

### `att_audit_logs`
- `id`: String @id @default(uuid()) @db.Char(36)
- `actorAccountId`: String @map("actor_account_id") @db.Char(36)
- `action`: String @db.VarChar(80)
- `entityType`: String @map("entity_type") @db.VarChar(40)
- `entityId`: String? @map("entity_id") @db.Char(36)
- `reason`: String? @db.VarChar(500)
- `details`: Json?
- `requestId`: String? @map("request_id") @db.Char(36)
- `createdAt`: DateTime

## 4. Komponen Modul Attendance Service

Modul disusun di `apps/attendance-service`:
1. `TimePolicyEngine`:
   - Mengonversi timestamp ke komponen waktu WIB (tahun, bulan, hari, jam, menit, detik, milidetik).
   - Menentukan klasifikasi hari (`REGULAR_WORKDAY`, `WEEKEND`, `HOLIDAY`).
   - Mengevaluasi ambang batas check-in (`08:00:00.000` vs `08:00:00.001`).
   - Mengevaluasi ambang batas checkout (`16:59:59.999` vs `17:00:00.000`).
   - Mengevaluasi cutoff harian (`23:59:59.999` batas maksimal checkout tanggal yang sama).
   - Memvalidasi kewajiban `reason` jika terlambat atau pulang lebih awal.
2. `HistoricalEligibilityEngine`:
   - Menghitung status aktif karyawan pada tanggal historis `D`.
   - Menghitung daftar karyawan yang memiliki kewajiban hadir pada rentang tanggal.
   - Menghitung missing attendance agregat dan per-karyawan secara akurat tanpa membuat baris database palsu.
3. `WorkPolicyService`:
   - Penyediaan konfigurasi kebijakan aktif dari database atau default fallback yang aman.

## 5. Rencana Pengujian T16

1. **Unit TDD Policy Engine**:
   - Tepat pukul 08:00:00.000 WIB -> on time.
   - Tepat pukul 08:00:00.001 WIB -> late, reason wajib.
   - Pukul 07:59:59.999 WIB -> on time.
   - Pukul 16:59:59.999 WIB -> early departure, reason wajib.
   - Pukul 17:00:00.000 WIB -> normal departure, reason opsional.
   - Pukul 23:59:59.999 WIB -> valid checkout.
   - Pukul 00:00:00.000 WIB (hari berikutnya) -> cutoff terlewati, checkout ditolak.
   - Hari Sabtu / Minggu -> outside schedule, late=false, early=false.
   - Tanggal libur nasional / perusahaan -> outside schedule, late=false, early=false.
   - Perubahan kalender: check-in tercatat terlambat, kemudian hari dijadikan libur -> snapshot event lama tetap utuh.
2. **Unit TDD Eligibility Engine**:
   - Karyawan aktif dengan `startDate <= D` -> eligible.
   - Karyawan aktif tetapi `D < startDate` -> not eligible.
   - Karyawan nonaktif / arsip saat ini, tetapi aktif pada tanggal historis `D` -> eligible pada `D`.
   - Karyawan nonaktif pada tanggal historis `D` -> not eligible pada `D`.
   - Missing attendance dihitung untuk hari kerja tanpa catatan; tidak dihitung untuk weekend/libur.
   - Record terhapus (soft-deleted) tidak dihitung sebagai missing attendance.
3. **Database Integration Tests (Real MySQL)**:
   - Verifikasi migrasi schema tabel attendance baru.
   - Verifikasi unique constraints `UNIQUE(employee_id, attendance_date)` dan `UNIQUE(daily_record_id, event_type)`.
   - Verifikasi hak akses database runtime `attendance_attendance` dan penolakan akses ke tabel lain.

## 6. Hasil Verifikasi Otomatis (2026-10-02)

1. **Unit TDD Policy Engine (`apps/attendance-service/src/policy/time-policy.engine.spec.ts`)**:
   - 10/10 test lulus:
     - `[PASS]` Konversi waktu UTC ke WIB dengan presisi milidetik.
     - `[PASS]` Check-in pukul 07:59:59.999 WIB -> tepat waktu (`isLate: false`).
     - `[PASS]` Check-in tepat pukul 08:00:00.000 WIB -> tepat waktu (`isLate: false`).
     - `[PASS]` Check-in pukul 08:00:00.001 WIB -> terlambat (`isLate: true`, wajib alasan).
     - `[PASS]` Check-in pukul 08:30:00.000 WIB -> terlambat (`isLate: true`, wajib alasan).
     - `[PASS]` Checkout pukul 16:59:59.999 WIB -> pulang lebih awal (`isEarlyDeparture: true`, wajib alasan).
     - `[PASS]` Checkout tepat pukul 17:00:00.000 WIB -> normal departure (`isEarlyDeparture: false`).
     - `[PASS]` Checkout pukul 18:30:00.000 WIB -> normal departure (`isEarlyDeparture: false`, bukan otomatis lembur).
     - `[PASS]` Checkout pukul 23:59:59.999 WIB pada tanggal absensi -> valid dalam batas cutoff.
     - `[PASS]` Checkout pukul 00:00:00.000 WIB hari berikutnya -> cutoff terlewati (`isCutoffPassed: true`).
     - `[PASS]` Akhir pekan (Sabtu/Minggu) -> `OUTSIDE_WORK_SCHEDULE` tanpa penilaian terlambat/pulang awal/alasan.
     - `[PASS]` Hari libur nasional/perusahaan -> `HOLIDAY` tanpa penilaian terlambat/pulang awal/alasan.
     - `[PASS]` Snapshot immutability: check-in pagi terlambat tetap utuh saat hari ditetapkan libur di siang hari.

2. **Unit TDD Eligibility Engine (`apps/attendance-service/src/eligibility/eligibility.engine.spec.ts`)**:
   - 20/20 test lulus:
     - `[PASS]` Real-time: karyawan aktif & ready dengan tanggal absensi >= startDate diterima.
     - `[PASS]` Real-time: karyawan belum ready ditolak (`EMPLOYEE_NOT_READY`).
     - `[PASS]` Real-time: karyawan INACTIVE ditolak (`EMPLOYEE_INACTIVE`).
     - `[PASS]` Real-time: karyawan ARCHIVED ditolak (`EMPLOYEE_INACTIVE`).
     - `[PASS]` Real-time: tanggal absensi sebelum startDate ditolak (`BEFORE_START_DATE`).
     - `[PASS]` Rekonstruksi historis: karyawan nonaktif saat ini direkonstruksi ACTIVE pada tanggal lampau sebelum deaktivasi.
     - `[PASS]` Rekonstruksi historis: siklus aktivasi -> arsip -> restore INACTIVE -> aktivasi kembali direkonstruksi tepat per tanggal.
     - `[PASS]` Evaluasi harian: akhir pekan dan hari libur diklasifikasikan `NON_WORKING_DAY` tanpa missing attendance.
     - `[PASS]` Evaluasi harian: tanggal sebelum startDate diklasifikasikan `NOT_ELIGIBLE` tanpa missing attendance.
     - `[PASS]` Evaluasi harian: hari kerja lampau dengan catatan absensi aktif -> `PRESENT`.
     - `[PASS]` Evaluasi harian: catatan absensi soft-deleted -> `RECORD_DELETED` dan BUKAN missing attendance (sesuai baseline).
     - `[PASS]` Evaluasi harian: hari kerja lampau tanpa absensi -> `MISSING` (`isMissingAttendance: true`).
     - `[PASS]` Evaluasi harian: hari ini sebelum 17:00 WIB tanpa absensi -> `PENDING_CHECK_IN` (belum check-in, bukan missing).
     - `[PASS]` Evaluasi harian: hari ini mulai 17:00 WIB tanpa absensi -> `MISSING` (`isMissingAttendance: true`).

3. **Database Integration Tests (`apps/attendance-service/test/policy-database.e2e-spec.ts`)**:
   - 8/8 test lulus terhadap database MySQL test lokal:
     - `[PASS]` Persistensi `att_work_policies` dengan jadwal standar WIB 08:00–17:00.
     - `[PASS]` Endpoint `GET /api/v1/policies/current` mengembalikan kebijakan aktif.
     - `[PASS]` Endpoint `GET /api/v1/policies/schedule` mengembalikan klasifikasi jadwal tanggal kerja dan libur.
     - `[PASS]` Persistensi `att_holidays` dan lookup hari libur aktif.
     - `[PASS]` Penegakan `UNIQUE(employee_id, attendance_date)` pada `att_daily_records` bahkan setelah soft delete.
     - `[PASS]` Penegakan `UNIQUE(daily_record_id, event_type)` pada `att_events`.
     - `[PASS]` Penegakan isolasi hak akses database: akun `attendance_attendance` tidak dapat mengakses tabel `auth_accounts` atau `emp_employees`.

4. **Lint & Build**:
   - `oxlint --type-aware`: 0 error, 0 warning.
   - `pnpm --filter attendance-service run build`: exit code 0 (`dist/` dihasilkan).

