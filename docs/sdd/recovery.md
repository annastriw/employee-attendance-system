# SDD — Idempotensi dan pemulihan

Operasi HTTP dapat persisted tetapi kehilangan respons. Retry bukan exactly-once; key/hash, constraint dan receiver idempotent menjaga hasil domain.

## Provisioning, email dan lifecycle

Employee mencatat intent durable sebelum memanggil Auth. Worker mengambil pending berdasarkan attempts/nextAttemptAt/lease; retry memakai operationId/payload sama. Konflik ditolak. Provisioning fatal sebelum finalize mengembalikan profil/akun ke state aman INACTIVE/ready false. Password sementara terenkripsi sampai claim sekali. [Employee](employee.md).

Email/status mempunyai operasi durable sendiri sehingga respons hilang tidak membuat profil atau akun baru. Pending operation menghalangi perubahan yang bertentangan.

## Presensi dan outbox

Event dan outbox ditulis dalam satu transaksi Attendance. Outbox PENDING → PROCESSING → DELIVERED; lease token/comparison mencegah worker stale mengonfirmasi claim worker lain. Kegagalan Media dijadwalkan ulang dengan backoff. Binding ulang event yang sama idempotent.

Request idempotency mempunyai PENDING/SUCCEEDED/REJECTED/RETRYABLE, payloadHash, claimToken dan lease. Key sama/payload berbeda ditolak. Frontend memeriksa status ketika hasil belum pasti, mempertahankan intent sampai hasil diketahui. [Attendance](attendance.md).

## Foto orphan

Foto READY dapat belum memiliki presensi. Objek baru dilindungi grace period; worker kemudian mencari yang tidak bound, mencoba menghapus bytes dan mencatat FAILED/audit. Foto bound terlindungi. Kegagalan storage bukan izin menghapus event/history.

## Source dan verifikasi

[Attendance worker](../../apps/attendance-service/src/checkin/), [Employee](../../apps/employee-service/src/), [Media](../../apps/media-service/src/photos/). Integration tests berada pada folder test service masing-masing. Unit untuk state/lease, integrasi cepat pada skenario gagal yang berubah: downstream offline, lost response, payload konflik, lease expired dan upload tanpa event. Health live tidak membuktikan seluruh recovery.
