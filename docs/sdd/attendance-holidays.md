# Manajemen Kalender Libur HRD — T17

Status: spesifikasi modul disetujui; siap implementasi dan verifikasi bertahap. Acuan: [baseline](../requirements/baseline.md), [plan](../../tasks/plan.md#tier-test-biaya-vs-nilai--disetujui-2026-10-02), [todo](../../tasks/todo.md), [aturan waktu & eligibility](attendance-policies-eligibility.md), [desain UI/UX](frontend-ui-ux.md).

## 1. Latar Belakang dan Keputusan Baseline

- **Waktu Resmi & Kalender**:
  - Zona waktu resmi operasional adalah Asia/Jakarta (WIB = UTC+7).
  - Hari kerja reguler standar: Senin sampai Jumat (08:00–17:00 WIB).
  - Akhir pekan (Sabtu/Minggu) dan hari libur nasional/perusahaan yang tercatat pada `att_holidays` diklasifikasikan sebagai **Di Luar Hari Kerja** (`isOutsideSchedule = true`).
  - Pada hari libur, absensi bersifat sukarela (tidak dinilai terlambat, tidak dinilai pulang lebih awal, alasan opsional), dan tidak timbul kewajiban absensi (tidak dihitung sebagai *missing attendance*).

- **Aturan Mutasi Kalender Libur**:
  - **Hari Ini & Mendatang (Today & Future)**:
    - HRD dapat menambah, mengubah, atau menghapus hari libur untuk tanggal hari ini (`D === todayWIB`) dan tanggal mendatang (`D > todayWIB`).
  - **Tanggal Lampau (Past Dates)**:
    - Tanggal sebelum hari ini (`D < todayWIB`) berstatus **Read-Only / Terkunci**.
    - Penambahan hari libur untuk tanggal lampau **ditolak** (`400 Bad Request`: "Tanggal libur tidak boleh berupa tanggal lampau.").
    - Pengubahan hari libur yang tanggalnya sudah lampau atau pengubahan tanggal menjadi tanggal lampau **ditolak** (`400 Bad Request`: "Hari libur tanggal lampau tidak dapat diubah.").
    - Penghapusan hari libur yang tanggalnya sudah lampau **ditolak** (`400 Bad Request`: "Hari libur tanggal lampau tidak dapat dihapus.").

- **Snapshot Immutability & Same-Day Edit**:
  - Catatan absensi dan event (`att_events`) yang telah terjadi menyimpan `policySnapshot` permanen pada saat event dieksekusi.
  - Jika check-in pagi tercatat sebagai hari kerja reguler (misalnya terlambat), lalu pada siang harinya HRD menetapkan hari tersebut sebagai hari libur (same-day creation/edit):
    - Snapshot event check-in pagi **tetap tidak berubah** (tidak diubah retroaktif).
    - Event berikutnya (seperti checkout sore) dan evaluasi harian setelah penetapan libur akan menggunakan status libur yang baru.

- **Pencatatan Audit Log (`att_audit_logs`)**:
  - Setiap mutasi kalender libur dicatat secara append-only di `att_audit_logs`:
    - `HOLIDAY_CREATED`: actorAccountId, entityType: "HOLIDAY", entityId, details { holidayDate, description }, requestId.
    - `HOLIDAY_UPDATED`: actorAccountId, entityType: "HOLIDAY", entityId, details { old: { holidayDate, description }, new: { holidayDate, description } }, requestId.
    - `HOLIDAY_DELETED`: actorAccountId, entityType: "HOLIDAY", entityId, details { holidayDate, description }, requestId.

## 2. Kontrak API Kalender Libur

Semua endpoint berada di bawah prefix `/api/v1/holidays`.

### A. `GET /api/v1/holidays`
- **Akses**: Authenticated (ADMIN_HRD dan EMPLOYEE).
- **Query Parameters**:
  - `year` (opsional): filter tahun (contoh `2026`).
  - `month` (opsional): filter bulan (1–12).
  - `startDate` (opsional, `YYYY-MM-DD`): batas awal rentang tanggal.
  - `endDate` (opsional, `YYYY-MM-DD`): batas akhir rentang tanggal.
  - `search` (opsional): pencarian teks parsial case-insensitive pada `description`.
  - `page` (opsional, default 1), `pageSize` (opsional, default 50).
- **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "holidayDate": "2026-10-02",
        "description": "Hari Libur Khusus Perusahaan",
        "isPast": false,
        "createdAt": "2026-10-02T10:00:00.000Z",
        "updatedAt": "2026-10-02T10:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "pageSize": 50,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

### B. `POST /api/v1/holidays`
- **Akses**: `ADMIN_HRD` only (`AdminGuard`).
- **Request Body**:
  ```json
  {
    "holidayDate": "2026-10-25",
    "description": "Hari Libur Nasional / Cuti Bersama"
  }
  ```
- **Validasi**:
  - `holidayDate`: string format `YYYY-MM-DD` valid.
  - `holidayDate >= todayWIB`: jika lampau -> `400 Bad Request` ("Tanggal libur tidak boleh berupa tanggal lampau.").
  - `description`: string 1–200 karakter, non-empty setelah trim.
  - Keunikan tanggal: jika tanggal sudah ada di `att_holidays` -> `409 Conflict` ("Hari libur untuk tanggal tersebut sudah terdaftar.").
- **Response `201 Created`**:
  ```json
  {
    "data": {
      "id": "uuid",
      "holidayDate": "2026-10-25",
      "description": "Hari Libur Nasional / Cuti Bersama",
      "isPast": false,
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
  ```

### C. `GET /api/v1/holidays/:id`
- **Akses**: Authenticated.
- **Response `200 OK`**: data hari libur terkait.
- **Response `404 Not Found`**: jika ID tidak ditemukan.

### D. `PATCH /api/v1/holidays/:id`
- **Akses**: `ADMIN_HRD` only (`AdminGuard`).
- **Request Body**:
  ```json
  {
    "holidayDate": "2026-10-26",
    "description": "Perubahan Keterangan Hari Libur"
  }
  ```
- **Validasi**:
  - Data harus ada di database (jika tidak ada -> `404 Not Found`).
  - Tanggal existing saat ini tidak boleh lampau (jika `existing.holidayDate < todayWIB` -> `400 Bad Request`: "Hari libur tanggal lampau tidak dapat diubah.").
  - Jika `holidayDate` diubah:
    - Tanggal baru tidak boleh lampau (`holidayDate >= todayWIB`, jika tidak -> `400 Bad Request`).
    - Tanggal baru tidak boleh berkonflik dengan record hari libur lain (`409 Conflict`).
  - `description`: jika diisi, harus 1–200 karakter valid.
- **Response `200 OK`**: data hari libur yang telah diperbarui.

### E. `DELETE /api/v1/holidays/:id`
- **Akses**: `ADMIN_HRD` only (`AdminGuard`).
- **Validasi**:
  - Data harus ada di database (jika tidak ada -> `404 Not Found`).
  - Tanggal existing saat ini tidak boleh lampau (jika `existing.holidayDate < todayWIB` -> `400 Bad Request`: "Hari libur tanggal lampau tidak dapat dihapus.").
- **Response `200 OK`**:
  ```json
  {
    "data": {
      "id": "uuid",
      "message": "Hari libur berhasil dihapus."
    }
  }
  ```

## 3. Reverse Proxy API Gateway

- `GatewayConfig`: menambahkan `attendanceUrl` (`ATTENDANCE_SERVICE_URL`, default `http://127.0.0.1:3003`).
- `AuthProxyService`: mendukung upstream `'attendance'` dan method `'DELETE'`.
- `HolidaysProxyController`:
  - Path allowlist: `/api/v1/holidays` dan `/api/v1/holidays/:id` (UUID regex).
  - Query allowlist: `year`, `month`, `startDate`, `endDate`, `search`, `page`, `pageSize`.
  - Meneruskan header `Authorization` dan `X-Request-ID`.

## 4. Antarmuka UI HR Web — Layar H13

- **Lokasi & Rute**:
  - Navigasi utama sidebar: menu "Hari Libur" (`#hari-libur`) dengan ikon `@phosphor-icons/react` `CalendarBlank`.
  - View `use-hash-route.ts`: ditambahkan opsi `"hari-libur"`.
  - Title halaman: "Hari Libur".
- **Komponen Halaman (`HolidaysPage.tsx`)**:
  - Header halaman dengan judul "Hari Libur", deskripsi singkat ("Kelola jadwal hari libur nasional dan kebijakan libur perusahaan"), dan tombol aksi utama "Tambah Hari Libur".
  - Toolbar penyaring:
    - Pencarian teks keterangan.
    - Filter tahun & bulan (dropdown/select atau date range).
  - Tabel Daftar Hari Libur:
    - Kolom: Tanggal (format Indonesia e.g. "Jumat, 25 Des 2026"), Hari (Senin–Minggu), Keterangan, Status (Badge: "Mendatang", "Hari Ini", atau "Lampau"), dan Aksi.
    - Status Lampau: badge netral zinc, tombol Edit dan Hapus dinonaktifkan (disabled) dengan petunjuk bahwa tanggal lampau terkunci secara permanen.
    - Status Hari Ini & Mendatang: tombol Edit (pensil) dan Hapus (tempat sampah) aktif.
  - Dialog Form Tambah/Edit (`HolidayFormDialog.tsx`):
    - Input Tanggal: `<input type="date">` dengan batas minimal `min={todayWibString}` (mencegah pemilihan tanggal lampau di peramban).
    - Input Keterangan: text input 1–200 karakter.
    - Pesan validasi inline dan banner error respons API.
  - Dialog Konfirmasi Hapus (`ConfirmDialog`):
    - Konfirmasi penghapusan hari libur dengan menyebutkan tanggal dan keterangannya.
