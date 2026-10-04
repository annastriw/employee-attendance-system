# Kontrak API

Base lokal: `http://localhost:3000/api/v1`. Live: `https://attendance-api.annastriwidagdo.me/api/v1`. Gateway hanya mengizinkan route publik; endpoint internal tidak tersedia melalui Gateway.

Swagger tersedia lokal pada `/docs` Auth/Employee/Attendance/Media. Controller dan DTO aktual menjadi acuan lengkap; tabel berikut mencatat route implementasi, bukan endpoint rancangan lama yang belum ada.

## Autentikasi

| Method/path relatif | Pemakai |
| --- | --- |
| POST `/auth/admin/login` | HR: email/password |
| POST `/auth/employee/login` | Karyawan: email/password |
| GET `/auth/me` | Sesi terautentikasi |
| POST `/auth/refresh` | Cookie refresh, body `{ "panel": "admin" }` atau `employee`, Origin allowlist |
| POST `/auth/change-password` | currentPassword/newPassword; sesi lama dicabut |
| POST `/auth/logout` | Logout sesi |

Login mengembalikan accessToken, expiresIn dan user. Request bisnis memakai `Authorization: Bearer <accessToken>`. Browser memakai `credentials: include`; refresh token HttpOnly tidak dibaca JavaScript. Akun dengan mustChangePassword hanya boleh memakai endpoint sesi/ganti password.

Contoh request login lokal menggunakan placeholder, bukan secret infra:

```http
POST /api/v1/auth/admin/login
Content-Type: application/json

{"email":"admin@example.test","password":"<local-password>"}
```

## HR: master dan karyawan

| Method/path | Operasi |
| --- | --- |
| GET/POST `/departments`, `/positions` | List/create master |
| GET/PATCH `/departments/:id`, `/positions/:id` | Detail/update master |
| POST `/{departments,positions}/:id/activate` atau `/deactivate` | Status master |
| GET/POST `/employees` | List/create profil+akun |
| GET/PATCH `/employees/:id` | Detail/edit profil |
| GET `/employees/:id/history` | Riwayat profil |
| POST `/employees/:id/email` | Perubahan email terkoordinasi |
| POST `/employees/:id/lifecycle` | Transisi expectedStatus → targetStatus |
| POST `/employees/:id/reset-password` | Password sementara, sesi lama batal |
| GET `/employee-provisioning/:id` | Status operasi create |
| POST `/employee-provisioning/:id/retry`, `/credentials` | Retry/klaim kredensial sekali |
| GET `/employee-email-changes/:id`, `/employee-lifecycle/:id` | Status operasi perubahan |
| POST `/employee-email-changes/:id/retry`, `/employee-lifecycle/:id/retry` | Retry operasi |

Create/email/lifecycle/reset memakai `Idempotency-Key` UUID v4. Edit profil memakai `expectedUpdatedAt` untuk konflik perubahan. Master/karyawan tidak dihapus permanen melalui UI/API; lifecycle menggantikan hard delete.

Contoh create karyawan:

```json
{
  "nik": "EMP001",
  "name": "John Doe",
  "email": "john.doe@example.test",
  "departmentId": "<department-uuid>",
  "positionId": "<position-uuid>",
  "startDate": "2026-10-01",
  "status": "ACTIVE"
}
```

## Karyawan: foto dan presensi

| Method/path | Operasi |
| --- | --- |
| POST `/media/attendance-photos` | Multipart `photo` + purpose CHECK_IN/CHECK_OUT |
| GET `/me/attendance/today` | Status hari ini |
| POST `/me/attendance/check-in`, `/me/attendance/check-out` | Kirim bukti presensi |
| GET `/me/attendance/requests/:key` | Status request dengan hasil belum pasti |
| GET `/me/attendance` | Riwayat sendiri dengan periode/pagination |
| GET `/me/attendance/:id` | Detail sendiri |
| GET `/me/attendance/:id/events/:eventId/photo` | Signed URL foto aktif sendiri |

Upload dan presensi memakai `Idempotency-Key`. ID foto diperoleh dari upload yang berhasil; employeeId berasal dari sesi, bukan body. Capture memerlukan timestamp berzona. Checkout menambah dailyRecordId dari catatan hari ini.

```json
{
  "photoObjectId": "<ready-photo-uuid>",
  "clientCapturedAt": "2026-10-05T08:00:00+07:00",
  "captureMethod": "MANUAL",
  "location": {
    "latitude": -6.2,
    "longitude": 106.8166667,
    "accuracyMeters": 20,
    "capturedAt": "2026-10-05T08:00:00+07:00"
  }
}
```

Timestamp contoh bukan waktu yang boleh dipakai ulang untuk presensi nyata. `reason` wajib ketika backend menentukan late/early. Retry hasil tidak pasti mempertahankan key dan payload; jika validasi meminta capture/alasan baru, mulai intent baru sesuai respons/UI.

## HR: kalender, monitoring, lifecycle presensi

| Method/path | Operasi |
| --- | --- |
| GET/POST `/holidays`, GET/PATCH/DELETE `/holidays/:id` | Kalender hari ini/mendatang |
| GET `/monitoring/summary` | Ringkasan `date` |
| GET `/monitoring/employees` | date/departmentId/status/search/page/pageSize |
| GET `/attendance` | startDate/endDate/employeeId/status ACTIVE atau DELETED; pagination |
| GET `/attendance/:id` | Detail HR |
| GET `/attendance/:id/events/:eventId/photo` | Foto termasuk catatan terhapus untuk HR |
| DELETE `/attendance/:id` | Body version + reason; soft delete satu hari |
| POST `/attendance/:id/restore` | Body version; restore asli |

Version adalah `updatedAt` detail terakhir dalam format UTC milidetik. Setelah konflik, muat detail terbaru sebelum konfirmasi ulang. List presensi maksimum pageSize 20; monitoring maksimum 100. Status monitoring mencakup ALL, CHECKED_IN, LATE, EARLY_DEPARTURE, PENDING_CHECKOUT, COMPLETED, MISSING, PENDING_CHECK_IN, DELETED.

## Respons dan error

Format mengikuti domain: Auth mengembalikan sesi langsung; master/employee list memakai items/total/page/pageSize; Attendance memakai data/meta. Jangan mengasumsikan satu envelope untuk seluruh service. Gateway menambahkan `X-Request-ID` dan `Cache-Control: no-store`; error lokal Gateway berbentuk statusCode/message/requestId, sedangkan respons downstream diteruskan.

400 untuk request tidak valid; 401 sesi gagal; 403 akses ditolak; 404 target tidak ada; 409 konflik; 422 aturan bisnis; 503 service tidak tersedia. Pesan aman tidak menampilkan SQL/credential/stack. Endpoint foto mengembalikan URL dengan masa akses 60 detik; jangan simpan/log URL bertanda tangan.

Health di luar base API: `/health/live` untuk liveness dan `/health` untuk readiness. Gateway `/health` menambahkan `release` berupa SHA image atau `local` saat development. [Kontrak module](sdd/README.md).
