# T21 — Check-in ujung ke ujung

Status manual: diterima pengguna pada 2026-10-03 (Asia/Jakarta). Pengguna mengonfirmasi seluruh pengujian manual sampai T24 aman; checklist tujuh langkah di bawah dicentang berdasarkan laporan tersebut, bukan pengujian ulang agen atau hasil Playwright. Rincian perangkat/browser dan angka benchmark tidak diberikan. T21 ditutup penuh; catatan pending pada checkpoint lama merupakan status historis sebelum penerimaan ini.

## Lingkup dan kontrak

Menghubungkan capture T20 ke check-in resmi, GET /api/v1/me/attendance/today, POST /api/v1/me/attendance/check-in, GET /api/v1/me/attendance/requests/:key untuk pemulihan. Endpoint employee-only, forced password change ditolak; Auth memverifikasi sesi/revokasi setiap request. employeeId dari sesi, profil eligible diverifikasi lewat Employee internal, tanpa query lintas tabel.

Payload: photoObjectId UUID, clientCapturedAt ISO8601 dengan zona, captureMethod AUTO/MANUAL, location{latitude,longitude,accuracyMeters,capturedAt ISO8601 dengan zona}, reason opsional maksimal 500 karakter setelah trim. Idempotency-Key UUID v4 wajib; tidak menerima employeeId/purpose/waktu resmi dari client. Latitude ±90, longitude ±180, finite; accuracy 0–999999.99 sesuai kapasitas Decimal(8,2). Lokasi maksimal 60 detik saat commit dan toleransi masa depan 5 detik. Client capture tidak boleh lebih dari 5 detik di masa depan; tanggal/waktu resmi tetap server.

Sukses memakai data+meta{requestId,serverTime}; waktu ISO +07:00. Error Attendance memakai error{code,message,details?}+meta serta message/statusCode/requestId kompatibel client lama. 422 REASON_REQUIRED saat melewati 08:00:00.000 hari kerja; satu karakter non-spasi cukup. Late/outside schedule ditentukan ulang tepat sebelum transaksi menerima, bukan jam perangkat. Weekend/libur boleh tanpa alasan wajib.

Today: serverTime, attendanceDate WIB, scheduleType, jadwal, reasonRequired, eligible, status NOT_CHECKED_IN/CHECKED_IN/DELETED, record/checkIn atau null. Tidak membuat record untuk hari tanpa event. Eligibility ACTIVE+ready dan startDate <= hari server. Snapshot departemen/jabatan hanya saat daily record dibuat; snapshot kalender/jadwal setiap event tidak dapat berubah sesudah commit. Check-out/riwayat/monitoring tetap T22–T27.

## Konsistensi dan pemulihan

Idempotency intent tersimpan sebelum call Employee/Media: PENDING dengan claim UUID/lease 30 detik; SUCCEEDED menyimpan respons; REJECTED menyimpan penolakan definitif; RETRYABLE untuk kegagalan layanan/DB tanpa record. Payload hash canonical mencakup seluruh input ter-normalisasi. Key berbeda input ditolak 409. Replay sukses dikembalikan sebelum validasi freshness, tetap memeriksa sesi saat ini. Key global UUID dan owner employee; hasil milik orang lain tidak dibuka.

Claim expired dapat diambil ulang dengan CAS, worker lama tidak boleh commit. Di transaksi Attendance: kunci claim yang masih valid, evaluasi waktu/kebijakan, validasi lokasi, unique employee+tanggal (termasuk soft delete), unique event+jenis dan unique photoObjectId; simpan daily/event/audit/outbox/hasil SUCCEEDED atomik. Penolakan tidak menyimpan event. Ambiguous DB outcome dibaca ulang; jangan menandai sukses sebagai gagal.

Foto harus READY, milik employee, purpose CHECK_IN, belum bound; inspect internal Media hanya memakai service key. Setelah commit, outbox mengaitkan foto ke event lewat Media internal /:id/bind. Binding scoped owner/purpose dan idempotent event ID; event berbeda ditolak. Retry worker bounded batch 10, lease 30 detik, backoff hingga 60 detik, tanpa broker. Response sukses berarti foto privat READY, lokasi dan event tersimpan; binding administratif dapat diselesaikan ulang oleh outbox. Foto tidak dihapus saat respons ambigu. Retensi/orphan destructive belum ditentukan baseline, tetap ditunda; binding disimpan agar foto yang dipakai tidak dianggap orphan.

GET requests mengembalikan state dan hasil/error sesuai owner. 404 hanya berarti key belum teramati, bukan bukti request lama tidak akan commit. UI mempertahankan payload+key pada hasil ambigu dan memeriksa status/retry key sama. PENDING dan hasil unknown tidak membuka retake/input baru. REJECTED/RETRYABLE definitif mengizinkan revisi input/key baru karena CAS menutup attempt sebelumnya. Tidak retry mutasi otomatis. Draft hanya di memori; setelah reload Today menentukan status resmi.

## UI

Beranda menjadi Hari ini: tanggal WIB, jadwal, status dan aksi Check-in berasal dari API; tidak menampilkan angka/statistik palsu. Capture memakai HeroUI/tokens/Atomic Design T20. Preview menjadi Kirim check-in, upload foto terlebih dahulu dan kirim ID+lokasi. Alasan tampil jika API mewajibkan; 422 di batas 08.00 mempertahankan foto dan fokus ke alasan. Retry memakai bukti lama sampai hasil jelas; setelah penolakan stale location dapat diperbarui tanpa mengunggah ulang foto yang sama.

Sukses menampilkan waktu resmi WIB dan kembali ke Hari ini yang direfetch. Double click dikunci. Tab/route/unmount melepas kamera dan request; check-in yang mungkin sudah commit tetap direkonsiliasi lewat Today saat kembali. Tidak ada signed URL publik, token/koordinat/foto dalam log atau browser storage.

## Verification

- [x] TDD intent hash, freshness/future/precision/reason/server-time, claim ownership.
- [x] HTTP employee-only/revoked/must-change, DTO/query/ID allowlist dan Swagger.
- [x] MySQL+AIStor nyata: sukses+snapshot, replay/payload conflict, race same/different key, unique tanggal/foto, lease recovery dan outbox replay setelah kegagalan.
- [x] Frontend reason boundary, mutation lock, uncertain reconciliation, sukses resmi/refetch, stale location.
- [x] Typecheck/lint/build package terdampak; migration dev/test/schema diff/grants.
- [x] Visual halaman berubah 320/1440 terang/gelap.
- [x] Checklist browser perangkat/API nyata, terpisah dari mock/synthetic. Diterima pengguna 2026-10-03.

## Checklist manual

- [x] 1. Login karyawan siap. Hari ini menampilkan tanggal/jadwal dari API. Buka Check-in; izin perangkat hanya setelah Buka kamera.
- [x] 2. Satu wajah dan lokasi aktif, kedip/manual → preview. Bila terlambat, isi alasan; blank ditolak. Ambil ulang masih tersedia sebelum submit.
- [x] 3. Kirim check-in: sukses berisi waktu resmi + status terlambat/di luar jadwal sesuai server; kembali Hari ini menampilkan event yang sama.
- [x] 4. Coba submit ulang/reload: tidak membuat event kedua. Lokasi ditolak/stale memblokir; perbarui lokasi setelah penolakan definitif.
- [x] 5. Putus koneksi saat submit; cek hasil atau retry dengan key sama. Jangan membuat foto/payload baru selama status ambigu. Setelah reconnect hasil server tunggal.
- [x] 6. Nonaktif/reset akun HRD lalu gunakan sesi lama: ditolak. Departemen/kalender yang diubah setelah check-in tidak mengubah snapshot event lama.
- [x] 7. Desktop/ponsel HTTPS/localhost, 320/1440 terang/gelap; seluruh kontrol/fokus/error dapat dipakai.

Acuan: [baseline](../requirements/baseline.md), [T16](attendance-policies-eligibility.md), [T20](attendance-capture.md), [T19](media-photos.md), [UI/UX](frontend-ui-ux.md).

## Bukti increment 2026-10-02

- Migration 20261003020000_attendance_checkin diterapkan ke development/test; generate/build database, grants runtime, schema validate serta diff dev/test/migrations ke schema lulus (tidak ada drift).
- Attendance: 22 unit terfokus (policy evidence/hash, konfigurasi test/secret/origin, regresi kalender) lulus. Gateway: 6 unit batas proxy dan 66 kontrak HTTP sebelumnya lulus.
- Integrasi nyata: 14 skenario melalui Gateway, Auth, Employee, Attendance, Media, MySQL attendance_test dan bucket attendance-photos-test lulus. Mencakup waktu server/batas late, scoped READY, snapshot, DTO/query/role/forced change, lokasi stale, replay/hash conflict, konkurensi same/different key, soft delete tidak membuka absen ulang, lease takeover/fencing, respons transaksi hilang setelah commit, binding outbox lost response/fencing, foto tunggal dan revokasi sesi. Fixture foto/akun/profil sintetis dibersihkan; guard menolak outbox test lama sebelum drain.
- Frontend: 41 tes terfokus lulus pada beberapa suite (App 6, Auth client 8, upload lifecycle 5, CapturePanel 9, check-in intent 8, response validation 5). Termasuk alasan late/fokus, READY tidak diupload ulang, GPS perlu diperbarui, double-submit lock, pending/404 tidak membuka revisi, hasil tersimpan setelah response hilang, unmount/401, refetch Hari ini, validasi state/status/date.
- Typecheck/lint/build package terdampak lulus: Attendance, Employee, Media, Gateway dan Attendance Web; tooling database juga dibangun. Tidak menjalankan build/test seluruh monorepo. Satu fixture kalender lama disesuaikan dengan tipe pagination yang diwajibkan.
- Delapan visual otomatis Hari ini/capture idle lulus (320/1440 terang/gelap, satu worker). HeroUI MCP dipakai untuk TextArea/Label; Chrome DevTools meninjau preview+alasan pada empat ukuran/mode tersebut serta layar sukses/pending sintetis. State pending pada 320 px mengunci revisi bukti, seluruh tombol 44 px dan tidak overflow. Review visual memperbaiki pusat ikon dan target sentuh sukses minimum 44 px; overflow tidak ditemukan. Fixture visual berada di .local, tanpa API/perangkat nyata dan tidak di-commit.
- Build tetap memisahkan chunk capture/MediaPipe dari main login. Health kelima backend lokal 200; Swagger Attendance memuat ketiga endpoint. Kedua portal tersedia untuk checklist pengguna.
- Review correctness, privacy, kepemilikan tabel, unique/claim/recovery, bounded worker dan diff dilakukan; tidak ada secret/data pribadi/generated/build/dependency baru yang di-stage.

Checklist manual tujuh langkah belum diterima. T20/T21 tidak ditutup penuh berdasarkan health, mocks atau foto sintetis. Checkout/riwayat/monitoring tetap increment berikutnya; retensi/hard delete dan deployment tidak ditambahkan pada T21.
