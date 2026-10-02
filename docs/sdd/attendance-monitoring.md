# Spesifikasi Modul — Monitoring dan Rekap Kehadiran HRD (T25)

## 1. Deskripsi dan Latar Belakang

Modul Monitoring dan Rekap Kehadiran HRD (T25 / Layar H02) menyediakan visibilitas menyeluruh bagi HRD terhadap status kehadiran seluruh karyawan pada tanggal tertentu. Modul ini memenuhi kebutuhan operasional harian untuk memantau karyawan yang hadir tepat waktu, terlambat, pulang lebih awal, belum melakukan checkout, maupun karyawan yang tidak hadir (missing attendance).

Sesuai prinsip arsitektur proyek:
- Kepemilikan data tetap terisolasi: Attendance Service memiliki tabel `att_*`, Employee Service memiliki tabel `emp_*`. Attendance Service tidak melakukan query lintas database secara langsung melainkan berkomunikasi melalui internal API dengan autentikasi rahasia antarservice (`X-Employee-Service-Key`).
- Perhitungan **Missing Attendance** dilakukan secara terkomputasi berdasarkan **eligibility historis** karyawan pada tanggal tersebut (memperhitungkan tanggal mulai bekerja `startDate`, hari kerja vs akhir pekan / hari libur kalender `att_holidays`, serta status aktif/nonaktif/arsip historis yang direkonstruksi dari `emp_employee_history`). Baris data palsu tidak disimpan di database.
- Absensi yang berstatus **soft-deleted** (`deletedAt !== null`) **bukan missing attendance** dan dikecualikan dari metrik aktif/hadir normal, dengan label status jelas "Dihapus HRD".
- Status kehadiran yang beririsan (misalnya seorang karyawan terlambat saat check-in DAN pulang lebih awal saat checkout) dicatat secara lengkap tanpa kehilangan informasi atau memaksa agregasi tunggal.

## 2. Peta Kontrak API

Base path: `/api/v1`

### A. Internal Endpoint (Employee Service)

#### `GET /api/v1/internal/employees/roster`
- **Autentikasi**: Header `X-Employee-Service-Key` (timing-safe comparison dengan rahasia internal).
- **Akses**: Hanya internal service (Attendance Service).
- **Respons**: Array karyawan berstatus `ready: true`, termasuk snapshot departemen, jabatan, dan riwayat transisi status dari `emp_employee_history`.
```json
[
  {
    "id": "uuid",
    "nik": "EMP-001",
    "name": "Budi Santoso",
    "startDate": "2026-10-01",
    "status": "ACTIVE",
    "ready": true,
    "departmentId": "uuid-dept",
    "departmentName": "Teknologi Informasi",
    "positionId": "uuid-pos",
    "positionName": "Software Engineer",
    "history": [
      {
        "action": "EMPLOYEE_ACTIVATED",
        "before": { "status": "INACTIVE" },
        "after": { "status": "ACTIVE" },
        "createdAt": "2026-10-01T08:00:00.000Z"
      }
    ]
  }
]
```

### B. Monitoring Endpoints (Attendance Service via API Gateway)

#### `GET /api/v1/monitoring/summary`
- **Autentikasi**: Bearer JWT (`ADMIN_HRD`).
- **Query Parameter**:
  - `date` (opsional, format `YYYY-MM-DD`, default: hari ini waktu server WIB).
- **Respons Data**:
```json
{
  "data": {
    "date": "2026-10-03",
    "isWorkday": true,
    "scheduleType": "REGULAR_WORKDAY",
    "workPolicy": {
      "checkInTime": "08:00:00",
      "checkOutTime": "17:00:00"
    },
    "activeEmployees": 10,
    "checkedIn": 8,
    "late": 2,
    "earlyDeparture": 1,
    "pendingCheckout": 3,
    "completed": 5,
    "missingAttendance": 2,
    "deletedCount": 0
  },
  "meta": {
    "requestId": "uuid",
    "serverTime": "2026-10-03T08:30:00+07:00"
  }
}
```

#### `GET /api/v1/monitoring/employees`
- **Autentikasi**: Bearer JWT (`ADMIN_HRD`).
- **Query Parameters**:
  - `date` (opsional, format `YYYY-MM-DD`, default: hari ini WIB).
  - `departmentId` (opsional, UUID v4).
  - `status` (opsional, enum: `ALL`, `CHECKED_IN`, `LATE`, `EARLY_DEPARTURE`, `PENDING_CHECKOUT`, `COMPLETED`, `MISSING`, `PENDING_CHECK_IN`, `DELETED`).
  - `search` (opsional, pencarian string untuk nama atau NIK).
  - `page` (opsional integer >= 1, default: 1).
  - `pageSize` (opsional integer 1–100, default: 20).
- **Respons Data**:
```json
{
  "data": [
    {
      "employeeId": "uuid-emp",
      "nik": "EMP-001",
      "name": "Budi Santoso",
      "departmentId": "uuid-dept",
      "department": "Teknologi Informasi",
      "positionId": "uuid-pos",
      "position": "Software Engineer",
      "attendanceDate": "2026-10-03",
      "status": "CHECKED_IN",
      "isLate": true,
      "isEarlyDeparture": false,
      "checkInTime": "2026-10-03T08:15:22.000Z",
      "checkOutTime": null,
      "recordId": "uuid-rec",
      "deletedAt": null
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "date": "2026-10-03",
    "requestId": "uuid",
    "serverTime": "2026-10-03T08:30:00+07:00"
  }
}
```

## 3. Logika Evaluasi dan Aturan Bisnis

1. **Jadwal dan Kalender**:
   - Jika `date` adalah akhir pekan (Sabtu/Minggu) atau terdaftar dalam `att_holidays`, jadwal diklasifikasikan sebagai `WEEKEND` atau `HOLIDAY` (`isWorkday = false`).
   - Pada hari libur/akhir pekan: kewajiban absensi tidak berlaku (`missingAttendance = 0`). Karyawan yang absen sukarela tetap dapat dicatat jika ada data absensi aktif.

2. **Eligibility Historis**:
   - Menggunakan `EligibilityEngine.evaluateDayAttendance`:
     - Memeriksa tanggal mulai bekerja (`date >= employee.startDate`).
     - Merekonstruksi status karyawan pada tanggal tersebut (`ACTIVE`, `INACTIVE`, `ARCHIVED`) dari riwayat transisi status.
     - Jika status pada tanggal tersebut bukan `ACTIVE`, karyawan tidak dihitung sebagai kewajiban absensi (`NOT_ELIGIBLE`).

3. **Status Harian & Missing Attendance**:
   - **Ada Catatan Absensi Aktif**:
     - Jika memiliki `checkIn` dan `checkOut`: `COMPLETED`.
     - Jika memiliki `checkIn` dan belum `checkOut`: `CHECKED_IN` (atau `PENDING_CHECKOUT`).
     - Tanda `isLate`: jika event check-in `isLate === true`.
     - Tanda `isEarlyDeparture`: jika event checkout `isEarlyDeparture === true`.
   - **Catatan Absensi Dihapus (Soft Delete)**:
     - `deletedAt !== null`: `DELETED` ("Dihapus HRD").
     - **Bukan missing attendance** sesuai baseline.
   - **Tidak Ada Catatan Absensi**:
     - Jika `date < todayWIB`: `MISSING` ("Tidak ada absensi").
     - Jika `date === todayWIB`:
       - Sebelum jam 17:00 WIB: `PENDING_CHECK_IN` ("Belum check-in").
       - Setelah jam 17:00 WIB: `MISSING` ("Tidak ada absensi").

## 4. Desain UI/UX Frontend (H02 Monitoring / Ringkasan)

- **Header / Toolbar**:
  - Pemilih tanggal dengan navigasi cepat (Kemarin, Hari Ini, Besok).
  - Indikator jenis hari (Hari Kerja Reguler vs Akhir Pekan / Hari Libur Nasional).
- **Metric Cards (Ringkasan Kehadiran)**:
  - Total Wajib Hadir / Aktif
  - Hadir / Check-in
  - Terlambat
  - Pulang Awal
  - Belum Checkout
  - Tidak Ada Absensi (Missing)
  - Setiap kartu metrik dapat diklik untuk langsung menyaring daftar karyawan sesuai status tersebut.
- **Filter Toolbar**:
  - Filter Departemen (pilihan dari departemen terdaftar).
  - Filter Status (Semua, Hadir, Terlambat, Pulang Awal, Belum Checkout, Selesai, Tidak Ada Absensi, Belum Check-in, Dihapus).
  - Pencarian Nama / NIK (debounce input).
- **Tabel Monitoring**:
  - Kolom: Karyawan (Nama & NIK), Departemen & Jabatan, Check-in (jam & badge Terlambat), Checkout (jam & badge Pulang Awal), Status Kehadiran (badge berwarna sesuai design system emerald & zinc), Aksi (Lihat detail jika ada record).
- **States**:
  - Loading skeleton pada card dan tabel.
  - Empty state ramah pengguna jika tidak ada data sesuai filter.
  - Error state dengan tombol Muat Ulang.
  - Pagination terintegrasi.
