# SDD — Foto privat

## Scope

Media memiliki metadata MySQL dan bytes AIStor. OwnerEmployeeId/ownerAccountId berasal dari sesi; purpose CHECK_IN/CHECK_OUT. Ownership/purpose diperiksa pada inspect/bind/photo URL.

Upload multipart membutuhkan foto valid. Normalizer memeriksa bytes/image, menyesuaikan dimensi/format serta checksum. Content-type client bukan satu-satunya bukti validitas. Backend tidak menerima bukti identitas biometrik; detector frontend membantu capture.

## State dan idempotensi

PENDING → READY setelah upload diverifikasi; kegagalan/cleanup menjadi FAILED. Unique ownerEmployeeId/idempotencyKey mengenali retry; requestHash berbeda ditolak. Claim token/lease mengendalikan percobaan bersamaan.

READY belum berarti bound. Attendance inspect owner/purpose lalu meminta binding eventId. boundEventId unik; bind ulang pasangan yang sama idempotent, pemakaian foto untuk event lain ditolak. [Recovery](recovery.md).

## Storage dan akses

Bucket privat. Root hanya setup; kredensial Media mempunyai policy terbatas, tanpa admin. Signed URL dibuat saat diminta dan berlaku 60 detik; tidak disimpan DB/log/browser storage. Endpoint S3 publik melayani URL bertanda tangan, bukan anonymous bucket.

Karyawan hanya foto record aktif sendiri; HR foto record yang boleh diakses, termasuk deleted. Attendance memvalidasi record/event lalu Media memvalidasi scope request internal. Gateway tidak membuka path/key internal.

Orphan cleanup mencari objek tanpa boundEventId setelah grace period default dua jam, menghapus bytes secara aman dan mencatat FAILED/audit. Foto bound bukan target. Policy storage maintenance perlu mendukung operasi cleanup sesuai konfigurasi; jangan menyimpulkan izin delete tersedia dari uji upload saja.

## Source dan verifikasi

[Source](../../apps/media-service/src/), [integration](../../apps/media-service/test/), [normalizer/limit](../../apps/media-service/src/photos/photo-normalizer.ts), [DTO](../../apps/media-service/src/photos/photo.dto.ts). Skenario: image invalid, ukuran/normalisasi, upload lost/retry, ownership, binding konflik, expired URL, anonymous/admin denied, orphan/failure S3. Unit untuk perubahan validasi/state; integrasi cepat untuk S3/DB. [ERD](../database.md#media).
