# Spesifikasi Modul: Detail Monitoring Absensi & Peta Leaflet (T26)

## 1. Konteks & Tujuan
Dokumen ini mendefinisikan spesifikasi teknis untuk increment **T26 — Detail monitoring Leaflet** sesuai dengan [baseline](../../docs/requirements/baseline.md) (baris 51, 53, 57), [konsep UI/UX](../../docs/sdd/frontend-ui-ux.md) (Layar H04 baris 110, 128–130), dan [rencana implementasi](../../tasks/plan.md).

Pada Layar H04 (Detail Absensi di HR Portal `#absensi?id=...`), HRD dapat memeriksa bukti kehadiran lengkap untuk setiap event (Check-in dan Checkout):
1. **Dua Lokasi Berlabel Terpisah**: Menampilkan peta Leaflet interaktif untuk check-in dan checkout dengan marker posisi, lingkaran akurasi (`accuracyMeters`), dan atribusi penyedia tile.
2. **Ketahanan Data Tekstual**: Kegagalan jaringan atau tile provider peta tidak menghilangkan koordinat, akurasi meter, dan waktu perekaman lokasi dalam format teks.
3. **Foto Privat Terotorisasi**: HRD dapat meminta signed URL foto privat (berlaku 60 detik) untuk event check-in maupun checkout, **termasuk untuk absensi yang berstatus dihapus (soft-deleted)** (baseline baris 53: *"Foto MinIO AIStor Free privat; signed URL sementara setelah otorisasi. Karyawan foto aktif sendiri; HRD semua termasuk terhapus"*).
4. **Responsif & Aksesibel**: Dua bukti berdampingan pada layar lebar (>= 768 px) dan bertumpuk pada ponsel (< 768 px) dengan urutan kronologis yang sama (check-in lalu checkout).

---

## 2. Kontrak API

### 2.1 GET `/api/v1/attendance/:id` (Detail Absensi HRD)
Mengembalikan data detail absensi harian yang sudah memuat koordinat lokasi pada setiap event.

**Response `200 OK`**:
```json
{
  "data": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "employeeId": "e1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
    "attendanceDate": "2026-10-05",
    "version": "2026-10-05T08:00:00.000Z",
    "department": "Teknologi Informasi",
    "position": "Software Engineer",
    "deletedAt": null,
    "deleteReason": null,
    "deletedByAccountId": null,
    "employee": {
      "id": "e1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
      "name": "Aditya Pratama",
      "status": "ACTIVE"
    },
    "checkIn": {
      "id": "c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c",
      "eventTime": "2026-10-05T08:02:15+07:00",
      "clientCapturedAt": "2026-10-05T08:02:14+07:00",
      "isLate": false,
      "isEarlyDeparture": false,
      "isOutsideSchedule": false,
      "captureMethod": "AUTO_BLINK",
      "reason": null,
      "location": {
        "latitude": -6.2088,
        "longitude": 106.8456,
        "accuracyMeters": 12.5,
        "capturedAt": "2026-10-05T08:02:14+07:00"
      }
    },
    "checkOut": {
      "id": "d1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5d",
      "eventTime": "2026-10-05T17:05:00+07:00",
      "clientCapturedAt": "2026-10-05T17:04:59+07:00",
      "isLate": false,
      "isEarlyDeparture": false,
      "isOutsideSchedule": false,
      "captureMethod": "MANUAL_FALLBACK",
      "reason": null,
      "location": {
        "latitude": -6.2091,
        "longitude": 106.8459,
        "accuracyMeters": 14.0,
        "capturedAt": "2026-10-05T17:04:59+07:00"
      }
    },
    "history": []
  },
  "meta": {
    "requestId": "req-123",
    "serverTime": "2026-10-05T17:10:00+07:00"
  }
}
```

### 2.2 GET `/api/v1/attendance/:id/events/:eventId/photo` (Foto Privat HRD)
Endpoint untuk menerbitkan signed URL foto privat berdurasi 60 detik bagi HRD.

**Headers**:
- `Authorization`: `Bearer <jwt_admin_hrd>`

**Path Parameters**:
- `id`: UUID v4 `dailyRecordId`
- `eventId`: UUID v4 `eventId`

**Aturan Otorisasi & Bisnis**:
1. Caller wajib berotentikasi sebagai `ADMIN_HRD` dan `mustChangePassword === false`.
2. Record absensi dicari berdasarkan `id`. Bila tidak ada, kembalikan `404 ATTENDANCE_NOT_FOUND`.
3. Event dicari berdasarkan `eventId` di dalam record. Bila tidak ada, kembalikan `404 PHOTO_NOT_FOUND`.
4. Berbeda dari endpoint karyawan (`/me/attendance/...`), HRD **diizinkan** melihat foto absensi yang telah dihapus (`deletedAt !== null`) sesuai klausul baseline line 53.
5. Memanggil `media-service` internal endpoint `/internal/media/attendance-photos/:photoObjectId/photo-url` dengan secret `X-Media-Service-Key`.
6. Audit log `PHOTO_URL_ISSUED` dicatat di `media-service`.

**Response `200 OK`**:
```json
{
  "data": {
    "url": "https://storage.local/attendance-photos/...",
    "expiresInSeconds": 60
  },
  "meta": {
    "requestId": "req-123",
    "serverTime": "2026-10-05T17:10:00+07:00"
  }
}
```

---

## 3. Komponen Frontend HR Web

### 3.1 `AttendanceMap.tsx`
- Komponen pembungkus Leaflet untuk menampilkan lokasi tunggal suatu event.
- Props:
  - `latitude`: number
  - `longitude`: number
  - `accuracyMeters`: number
  - `label`: string ("Lokasi check-in" / "Lokasi checkout")
- Menggunakan OpenStreetMap tile provider:
  - URL: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
  - Atribusi wajib: `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors`
- Menampilkan Marker pada titik `[latitude, longitude]`.
- Menampilkan Circle akurasi dengan radius `accuracyMeters` menggunakan token emerald (`#10b981` / `rgba(16, 185, 129, 0.15)`).
- Custom DivIcon / SVG icon agar tidak bergantung pada asset bundling default Leaflet yang rentan 404 pada Vite production build.
- Graceful degradation: jika peta gagal dimuat atau lingkungan pengujian adalah jsdom/tanpa canvas, komponen tidak melempar uncaught error dan tetap merender data tekstual.

### 3.2 Bukti Kehadiran & Foto Privat (`AttendanceEvidence.tsx`)
- Menggabungkan:
  - Waktu event (WIB)
  - Badge terlambat / pulang awal / di luar jadwal
  - Alasan jika ada
  - Tombol lazy "Lihat foto [label]" / "Muat ulang foto [label]"
  - Tampilan foto dengan expiry 60 detik otomatis
  - Komponen peta `AttendanceMap`
  - Rincian tekstual lokasi (Koordinat, Akurasi dalam meter, Waktu perekaman lokasi)
- Desain mengikuti sistem tema Linear (zinc + emerald).

---

## 4. Rencana Verifikasi

| Komponen | Metode Verifikasi | Target Kriteria |
|---|---|---|
| Gateway Proxy | Unit tests di `attendance-admin-proxy.controller.spec.ts` | Mengizinkan route foto dengan UUID v4, menolak query/path asing |
| Attendance Service | Unit tests di `attendance-lifecycle.service.spec.ts` & e2e | 200 OK signed URL untuk active & deleted records, 404 jika event salah |
| HR Web Detail Page | Unit/component tests di `AttendanceDetailPage.test.tsx` | Menampilkan koordinat, akurasi, waktu lokasi, tombol foto dan peta Leaflet |
| Production Build & Lint | `nest build`, `tsc -b && vite build`, `oxlint`, `eslint` | 0 errors, 0 warnings |
