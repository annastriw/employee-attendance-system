# Spesifikasi Modul: Outbox, Deduplikasi Event, Kompensasi, dan Pembersihan Orphan (T27)

Frekuensi testing dan aturan centang: [workflow aktif](../testing/workflow.md). Resep/hasil suite lama di dokumen ini tidak menjadi gate rutin; bukti historis tetap dipertahankan.

## 1. Konteks & Tujuan
Dokumen ini mendefinisikan spesifikasi teknis untuk increment **T27 — Outbox dan pemulihan kegagalan** sesuai dengan:
- [Baseline](../../docs/requirements/baseline.md) baris 39 (*"MySQL dan MinIO AIStor Free tidak satu transaksi: upload READY, transaksi attendance, outbox, retry dan cleanup orphan"*), baris 71 (*"Binding foto/event unik, intent ber-state dan outbox durable"*), dan baris 75 (*"Outbox dan deduplikasi event antarservice; retry/kompensasi pembuatan profil+akun; hanya foto READY dapat dikaitkan"*).
- [ADR-002](../../docs/architecture/adr-002-project-tooling.md) (*"Transactional outbox menyimpan perubahan domain dan event dalam transaksi MySQL yang sama. Worker mengirim event melalui HTTP dengan retry terkontrol, timeout, pencatatan hasil, serta deduplikasi ID event pada penerima... Penerima wajib idempotent"*).
- [Daftar pekerjaan](../../tasks/todo.md) T27 (*"Acceptance: Event dedup/retry, provisioning compensation dan cleanup orphan terdokumentasi serta bekerja. Verification: Fault injection service offline, event ulang dan upload orphan"*).

Arsitektur monorepo 5 NestJS service ini tidak menggunakan distributed transaction (2PC) ataupun message broker eksternal (RabbitMQ/Kafka) pada tahap awal. Untuk menjamin konsistensi data eventual across service boundaries, sistem mengimplementasikan 3 pilar ketahanan (resilience):
1. **Transactional Outbox & Deduplication** (Attendance Service $\to$ Media Service): Pengikatan foto absensi ke event secara durable dan idempotent.
2. **Saga Orchestration & Provisioning Compensation** (Employee Service $\leftrightarrow$ Auth Service): Koordinasi multi-tahap pembuatan akun dan profil dengan kompensasi otomatis bila terjadi kegagalan fatal.
3. **Pembersihan Orphan Media** (Media Service $\leftrightarrow$ MinIO AIStor Free): Rekonsiliasi foto terunggah yang tidak pernah dikaitkan ke event absensi setelah grace period terlampaui.

---

## 2. Pilar 1: Transactional Outbox & Deduplikasi (Attendance $\to$ Media)

### 2.1 Alur Kerja Outbox
1. **Pencatatan Atomik**: Ketika karyawan melakukan check-in atau checkout, mutasi domain absensi (`att_daily_records`, `att_events`) dan task pengikatan media (`att_outbox`) ditulis dalam **satu transaksi MySQL ACID**.
2. **Payload Outbox**:
   - `id`: UUID v4 unik.
   - `eventId`: UUID v4 event terkait (`UNIQUE`).
   - `photoObjectId`: UUID v4 media object.
   - `ownerEmployeeId`: ID karyawan pemilik.
   - `purpose`: `CHECK_IN` atau `CHECK_OUT`.
   - `state`: `PENDING` $\to$ `PROCESSING` $\to$ `DELIVERED`.
   - `attempts`: Counter percobaan (dimulai dari 0).
   - `nextAttemptAt`: Waktu jadwal eksekusi berikutnya.
   - `claimToken` & `leaseUntil`: Token sewa CAS (Compare-And-Swap) untuk konkurensi worker.
3. **Worker Processing**:
   - `MediaOutboxWorker` berjalan di background (interval setiap 2 detik).
   - Mencari baris outbox yang memenuhi kriteria:
     - `state = 'PENDING' AND nextAttemptAt <= now`, ATAU
     - `state = 'PROCESSING' AND leaseUntil <= now` (pemulihan sewa kadaluarsa dari worker yang crash/mati).
   - Mengambil sewa secara atomik (CAS):
     ```sql
     UPDATE att_outbox
     SET state = 'PROCESSING',
         claimToken = :newClaimToken,
         leaseUntil = NOW() + INTERVAL 30 SECOND,
         attempts = attempts + 1
     WHERE id = :id AND (
       (state = 'PENDING' AND nextAttemptAt <= NOW()) OR
       (state = 'PROCESSING' AND leaseUntil <= NOW())
     )
     ```
   - Mengirim HTTP POST internal ke Media Service: `/internal/media/attendance-photos/:id/bind`.

### 2.2 Penanganan Kegagalan (Fault Injection & Exponential Backoff)
- Jika Media Service offline, timeout, atau mengembalikan `503 Service Unavailable`:
  - Worker menangkap exception tanpa crash.
  - Memperbarui baris outbox:
    - `state` dikembalikan ke `'PENDING'`.
    - `claimToken` dan `leaseUntil` dikosongkan (`null`).
    - `nextAttemptAt` dihitung dengan **exponential backoff**:
      $$\text{delay} = \min(60\,000\text{ ms},\; 1000 \times 2^{\min(\text{attempts}, 6)}\text{ ms})$$
  - Ketika upstream service pulih, tick worker berikutnya akan mengeksekusi ulang pengiriman event binding.
- Jika Media Service mengembalikan sukses (200):
  - Memperbarui baris outbox: `state = 'DELIVERED'`, `deliveredAt = NOW()`, `claimToken = null`, `leaseUntil = null`.

### 2.3 Deduplikasi & Idempotensi Penerima (Media Service)
- Endpoint `POST /internal/media/attendance-photos/:id/bind`:
  - Mengambil baris foto dari `media_objects` dengan lock transaksi `ReadCommitted`.
  - **Kasus 1 (Sudah bound ke event yang sama)**: Mengembalikan `200 OK` `{ id, status: 'BOUND', eventId }` secara idempotent tanpa duplikasi audit log atau modifikasi tanggal.
  - **Kasus 2 (Sudah bound ke event lain)**: Melemparkan `409 Conflict` (*"Foto sudah digunakan untuk absensi lain"*).
  - **Kasus 3 (Belum bound)**: Mengisi `boundEventId = :eventId`, `boundAt = NOW()`, serta mencatat `media_audit_logs` dengan action `'ATTENDANCE_BOUND'`.
  - Replay event berulang kali dari worker outbox tidak menyebabkan inkonsistensi state.

---

## 3. Pilar 2: Saga Orchestration & Kompensasi (Employee $\leftrightarrow$ Auth)

### 3.1 Tiga Fase Provisioning
Pembuatan karyawan oleh HRD (`POST /api/v1/employees`) menggunakan saga 3-fase terkoordinasi:
```
[Client] -> POST /api/v1/employees
    |
(1) Fase PREPARE:
    - Employee Service: Buat `emp_employees` (ready: false) dan `emp_provisioning` (phase: 'PREPARE').
    - Panggil Auth Service: POST /internal/auth/provisioning/:id/prepare
    - Auth Service: Buat `auth_accounts` (status: 'INACTIVE', mustChangePassword: true).
    |
(2) Fase PUBLISH:
    - Employee Service: Validasi integritas departemen & jabatan aktif.
    - Set `emp_employees.ready = true` dan `phase = 'FINALIZE'`.
    |
(3) Fase FINALIZE:
    - Panggil Auth Service: POST /internal/auth/provisioning/:id/finalize
    - Auth Service: Aktifkan akun `auth_accounts.status = desiredStatus` (ACTIVE).
    - Employee Service: Set `emp_provisioning.status = 'COMPLETED'`.
```

### 3.2 Aturan Kompensasi & Pemulihan
1. **Auth Service Sementara Offline (503 / Network Timeout)**:
   - Operasi provisioning tetap berstatus `PENDING` di `emp_provisioning`.
   - Worker background Employee Service menjadwalkan retry berkala dengan backoff ($1\text{s} \times 2^{\text{attempts}}$ hingga maksimal 60 detik).
   - Pengguna/HRD dapat memeriksa status operasi melalui `GET /api/v1/employee-provisioning/:id` dan memicu manual retry melalui `POST /api/v1/employee-provisioning/:id/retry`.
2. **Kompensasi Kegagalan Fatal Sebelum Finalize (Terminal Failure)**:
   - Jika terjadi kegagalan fatal sebelum fase `FINALIZE` (misalnya departemen dinonaktifkan di tengah proses, atau batas 7 percobaan terlampaui):
     - **Kompensasi Employee Profile**:
       ```ts
       if (failed.count && terminal && current.phase !== 'FINALIZE') {
         await tx.empEmployee.update({
           where: { id: current.employeeId },
           data: { ready: false, status: 'INACTIVE' },
         });
       }
       ```
     - **Integritas Akun Auth**: Akun Auth tidak pernah difinalisasi, sehingga tetap berada pada status `INACTIVE`. Tidak ada profil aktif ataupun akun aktif yang menggantung (*dangling active account*).
3. **Koreksi Email Tanpa Duplikasi NIK**:
   - Jika prepare ditolak karena email sudah terdaftar di Auth Service (`EMAIL_CONFLICT` / 409):
     - Operasi ditandai `status = 'FAILED'`, `errorCode = 'EMAIL_CONFLICT'`, `canCorrectEmail = true`.
     - NIK karyawan tetap terpesan pada operasi tersebut.
     - HRD dapat mengirimkan email koreksi melalui `POST /api/v1/employee-provisioning/:id/retry` dengan payload `{ email: "new-email@example.com" }`.
     - Operasi melanjutkan kembali proses prepare menggunakan NIK dan profil yang sama tanpa duplikasi row di database.

---

## 4. Pilar 3: Kebijakan & Pembersihan Orphan Media (Media Service)

### 4.1 Definisi & Penyebab Orphan Media
Sebuah objek media di `media_objects` dikategorikan sebagai **orphan** jika:
1. `boundEventId IS NULL` (tidak pernah dikaitkan ke event absensi), DAN
2. `status` berada pada status `'READY'` atau `'FAILED'`, DAN
3. Waktu pembuatan (`createdAt`) telah melampaui **grace period** (default: 2 jam = 7.200.000 ms; dapat disesuaikan pada pemanggilan maintenance atau testing), DAN
4. Objek tidak sedang berada dalam sewa aktif (`leaseUntil IS NULL OR leaseUntil < NOW()`).

Penyebab umum terjadinya orphan:
- Karyawan mengambil foto di browser, namun kemudian menutup browser atau membatalkan absensi sebelum submit.
- Validasi bisnis absensi di sisi server gagal (misalnya di luar jam kerja, koordinat GPS tidak valid, atau absensi duplikat).
- Kegagalan jaringan sisi klien setelah upload foto selesai tetapi sebelum check-in/checkout terkirim.

### 4.2 Invarian Keamanan (Safety Invariants)
Dalam pembersihan orphan, sistem menjamin:
1. **Foto Terikat Permanen**: Seluruh foto yang memiliki `boundEventId IS NOT NULL` adalah bukti sah absensi karyawan dan **TIDAK BOLEH** disentuh atau dihapus oleh proses cleanup.
2. **Foto Baru Aman**: Foto yang diunggah dalam durasi grace period (`createdAt > now - gracePeriod`) **TIDAK BOLEH** disentuh, karena karyawan mungkin sedang mengisi formulir alasan/lokasi.
3. **Sewa Aktif Aman**: Objek dengan `leaseUntil > now` tidak boleh diproses oleh cleanup.
4. **Audit Terpelihara**: Setiap pembersihan dicatat dalam `media_audit_logs` dengan action `'PHOTO_ORPHAN_CLEANED'`.

### 4.3 Alur Eksekusi Cleanup
1. **Pencarian Kandidat**:
   ```sql
   SELECT id, bucket, object_key
   FROM media_objects
   WHERE bound_event_id IS NULL
     AND status IN ('READY', 'FAILED')
     AND created_at <= :cutoffDate
     AND (lease_until IS NULL OR lease_until < NOW())
   LIMIT :limit;
   ```
2. **Pembersihan Objek Storage**:
   - Memanggil `PhotoStorage.delete(objectKey)`.
   - Menggunakan `client.removeObject(bucket, key)`.
   - Menangani kasus `NoSuchKey` secara idempotent (dianggap berhasil).
   - Menangani kasus `AccessDenied` (jika kredensial runtime tidak memiliki `s3:DeleteObject`) secara aman tanpa menggagalkan pencatatan database.
3. **Transisi State Database**:
   - Mengupdate status `media_objects.status = 'FAILED'`.
   - Menambahkan filter pengaman `boundEventId: null` pada query UPDATE agar tidak menimpa pengikatan yang baru saja terjadi secara bersamaan (*concurrent bind*).
   - Menulis `media_audit_logs`:
     - `action`: `'PHOTO_ORPHAN_CLEANED'`
     - `entityId`: `orphan.id`
     - `actorAccountId`: `actorAccountId` pemanggil atau `null` jika background job.
     - `requestId`: ID request pelacakan.

### 4.4 Kontrak Endpoint Maintenance Internal
- **Endpoint**: `POST /api/v1/internal/media/attendance-photos/cleanup-orphans`
- **Header Wajib**: `X-Media-Service-Key` (Media Service secret).
- **Body Opsional** (`PhotoCleanupDto`):
  ```json
  {
    "gracePeriodMs": 7200000,
    "limit": 100
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "cleanedCount": 3,
    "candidatesFound": 3
  }
  ```

---

## 5. Strategi Verifikasi & Fault Injection

### 5.1 Test Matrix T27
| Skenario | Layanan Terkait | Jenis Pengujian | Verifikasi Utama |
|---|---|---|---|
| **Outbox Fault Injection** | `attendance-service` | Integration/E2E | Media service 503 $\to$ outbox backoff $\to$ service up $\to$ delivered |
| **Event Replay / Dedup** | `media-service`, `attendance-service` | Integration/E2E | Panggilan bind berulang pada event yang sama bersifat idempotent 200 |
| **Provisioning Compensation** | `employee-service`, `auth-service` | Integration/E2E | Prepare gagal $\to$ employee inactive & unready; retry koreksi email |
| **Orphan Photo Cleanup** | `media-service` | Integration/E2E | Unbound lama dibersihkan; bound dan upload baru tetap utuh |
| **Worker Concurrency & Lease** | `attendance-service` | Integration/E2E | Worker crash dengan sewa kadaluarsa diambil alih dan dituntaskan |
