# T19 — Foto absensi privat

Frekuensi testing dan aturan centang: [workflow aktif](../testing/workflow.md). Resep/hasil suite lama di dokumen ini tidak menjadi gate rutin; bukti historis tetap dipertahankan.

## Kontrak dan batas

Media Service (3004) memiliki media_objects dan media_audit_logs. Tidak membaca tabel Auth/Employee/Attendance. Gateway (3000) meneruskan satu endpoint upload; Auth /me memverifikasi sesi setiap request. Karyawan dengan password awal yang belum diganti ditolak. HRD tidak mengunggah atas nama karyawan.

POST /api/v1/media/attendance-photos: Bearer token, Idempotency-Key UUID v4, multipart photo (JPEG) dan purpose (CHECK_IN/CHECK_OUT), tanpa field tambahan. Maksimum 2 MiB dan 4 megapiksel; decode penuh, minimum 160 × 160, orientasi diperbaiki, resize maksimum 1280 × 1280, JPEG kualitas 85, metadata EXIF dibuang. SHA-256 dihitung dari gambar tersimpan. Respons 201 {id, status: READY, purpose, checksumSha256, byteSize, width, height}; tidak memuat bucket/key/URL.

Input JPEG dipilih mengikuti keluaran spike T18. Batas ini adalah parameter teknis awal, disesuaikan hanya melalui bukti T20. Foto hanya untuk capture, bukan pencocokan identitas.

## Konsistensi

Unique (ownerEmployeeId, idempotencyKey); hash request mencakup purpose dan byte input. Replay identik mengembalikan ID yang sama; payload berbeda 409. Record PENDING dan lease 30 detik dibuat sebelum penyimpanan. READY hanya setelah pembacaan balik byte dan checksum cocok. Gagal upload menjadi FAILED; retry identik mengambil lease secara atomik. PENDING setelah lease habis direkonsiliasi: baca object yang sudah ada sebelum PUT. Token claim membatasi finalisasi worker lama; semua retry memakai key dan gambar yang sama. Object yang mungkin tersimpan ketika timeout tidak dihapus secara buta. Transisi status dan audit ditulis dalam satu transaksi MySQL.

Bucket privat dev/test terpisah. Akun aplikasi hanya GetBucketLocation/ListBucket (health check pada bucket sendiri), GetObject, PutObject pada attendance/* dalam bucket sendiri; tanpa admin, list bucket atau DeleteObject. Kredensial root hanya setup. Orphan dipertahankan sampai kebijakan retensi/rekonsiliasi binding ditentukan; tidak menambah penghapusan permanen.

## Akses antarlayanan

POST /api/v1/internal/media/attendance-photos/:id/inspect: X-Media-Service-Key (rahasia 32 byte) dan body ownerEmployeeId/purpose. Mengembalikan metadata READY hanya jika keduanya cocok; untuk validasi binding T21.

POST /api/v1/internal/media/attendance-photos/:id/photo-url: secret internal yang sama, Bearer sesi aktif, body ownerEmployeeId/purpose. Karyawan hanya pemilik, HRD boleh seluruh pemilik. URL berlaku 60 detik; audit tidak menyimpan URL. Attendance wajib memverifikasi hubungan event–photo dan aturan soft-delete sebelum memanggil endpoint ini (T23/T26). Endpoint internal tidak diteruskan Gateway; tidak ada endpoint publik raw-media yang melewati kebijakan absensi.

HTTP: 400 input/format, 401 sesi/secret, 403 role/pemilik/password awal, 404 objek bukan READY atau owner/purpose tidak cocok, 409 konflik/in-flight, 413 ukuran, 503 dependency. Semua respons no-store; kegagalan dependency tidak membocorkan kredensial.

## Acceptance dan verifikasi

- [x] Upload melalui Gateway–Media–Auth dengan MySQL/AIStor nyata, checksum cocok dan status READY.
- [x] JPEG rusak/MIME palsu/ukuran/dimensi/field tambahan ditolak; EXIF tidak tersimpan.
- [x] Sesi dicabut/password awal/HR upload ditolak; akses foto orang lain dan purpose salah ditolak.
- [x] Anonymous bucket privat; signed URL bekerja sementara; runtime lintas bucket/tabel ditolak.
- [x] Replay, konflik, konkurensi, FAILED retry dan PENDING expired/object sudah tersimpan pulih; audit atomik tanpa URL/token.
- [x] Typecheck/lint dan build package terkait; test perilaku serial. T19 tidak mengubah halaman frontend; T20 melanjutkan capture produksi.

## Referensi

- [NestJS multipart upload](https://docs.nestjs.com/techniques/file-upload)
- [AIStor JavaScript SDK](https://docs.min.io/aistor/developers/sdk/javascript/)
- [Sharp batas decode](https://sharp.pixelplumbing.com/api-constructor/)
- [Sharp keluaran dan metadata](https://sharp.pixelplumbing.com/api-output/)
- [AIStor users](https://docs.min.io/aistor/reference/cli/admin/mc-admin-user/mc-admin-user-add/)

## Bukti T19 — 2026-10-02

- Migration 20261003010000_media_photos diterapkan ke dev/test; schema validate dan diff kedua database tidak menunjukkan perubahan.
- Media: 16 unit (normalisasi, deadline header/body, konfigurasi/isolation dan scaffold), 17 integrasi fitur + 1 scaffold HTTP. Gateway: 14 unit dan 74 kontrak HTTP (7 multipart baru). Seluruh pemeriksaan terkait lulus, suite serial; hasil scoped digabung tanpa mengulang suite monorepo.
- Integrasi memakai Auth nyata/JWT/sesi MySQL, Gateway dist, akun runtime Media, dan AIStor nyata. Checksum pembacaan balik, akses anonim 403, signed URL 60 detik/kedaluwarsa, ownership/purpose, revokasi, dua pemilik, konkurensi, FAILED/PENDING retry, PUT response hilang, rollback READY+audit dan stale lease teruji.
- Runtime MySQL ditolak membaca Auth/Employee, menghapus media dan audit; AIStor menolak PUT lintas bucket dan DeleteObject. ListBuckets memfilter bucket milik akun, bukan selalu 403; assertion memeriksa isolasi yang teramati.
- Typecheck/lint Media dan Gateway, build terkait, sintaks script setup, setup storage idempotent dan tes encoder Windows lulus. Rahasia tetap ignored. Tidak ada perubahan UI; browser/visual produksi dilanjutkan T20.
- Lokal menggunakan satu instance/volume AIStor dengan bucket/user dev/test terpisah karena batas resource. Lingkungan rilis/production membutuhkan volume terpisah sesuai [ADR storage](../architecture/adr-001-object-storage.md); bukan klaim kesiapan produksi.
- Tidak ada endpoint publik raw photo. Pengaitan event, outbox/kompensasi, aturan soft-delete dan pembersihan orphan menjadi alur Attendance T21/T23/T26; retensi permanen tidak diputuskan oleh T19.
