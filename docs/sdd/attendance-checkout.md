# T22 — Checkout ujung ke ujung

Frekuensi testing dan aturan centang: [workflow aktif](../testing/workflow.md). Resep/hasil suite lama di dokumen ini tidak menjadi gate rutin; bukti historis tetap dipertahankan.

Status manual: diterima pengguna pada 2026-10-03 (Asia/Jakarta). Pengguna mengonfirmasi seluruh pengujian manual sampai T24 aman; checklist tujuh langkah di bawah dicentang berdasarkan laporan tersebut, bukan pengujian ulang agen atau hasil Playwright. Rincian perangkat/browser dan angka benchmark tidak diberikan. T22 ditutup penuh; catatan pending pada checkpoint lama merupakan status historis sebelum penerimaan ini.

## Kontrak dan acceptance

Mengikuti baseline, T16–T21 dan E03–E06. POST /api/v1/me/attendance/check-out memakai JWT karyawan, Idempotency-Key UUID v4, payload foto/lokasi T21 ditambah dailyRecordId UUID v4. ID catatan target mencegah request tertunda tersambung ke hari lain; employeeId tetap dari sesi. Foto READY privat milik karyawan dengan purpose CHECK_OUT, berbeda dari foto check-in. Lokasi maksimal 60 detik, toleransi future 5 detik; waktu resmi dari server.

Checkout membutuhkan check-in aktif pada catatan sendiri, tanpa checkout sebelumnya, pada tanggal WIB yang sama sampai 23:59:59.999. Sebelum 17:00:00.000 wajib alasan nonblank maksimum 500 karakter; mulai 17:00 normal, tanpa penetapan lembur. Weekend/libur sukarela tanpa early/late. Kalender dan policy saat checkout berlaku untuk event berikutnya sesuai baseline; snapshot check-in dan profil harian tidak diubah. Checkout sebelum waktu check-in ditolak.

## Implementasi dan recovery

Reuse controller/DTO/service T21, Media inspect/bind dan outbox. Tidak ada schema/dependency/service baru. Hash checkout mencakup operation CHECK_OUT dan dailyRecordId; hash check-in lama tetap sama agar replay tersimpan tidak rusak. Key lintas operasi atau target/payload berbeda ditolak. Lease, claim fencing, revokasi, respons commit ambigu dan replay tetap T21. Transaksi mengunci catatan aktif milik karyawan, membuat event+audit+outbox+hasil intent secara atomik; unique harian/event/foto tetap berlaku termasuk soft delete. Error 400/401/403/404/409/422/503 mengikuti kontrak bersama.

GET today menambahkan CHECKED_OUT, record.checkOut, checkoutReasonRequired dan flag isEarlyDeparture. Rekonsiliasi requests tetap owner-scoped. Replay sukses mempertahankan hasil/waktu resmi awal walaupun sudah melewati cutoff; request baru tanggal lampau ditolak.

## UI

Hari ini menampilkan dua waktu dan satu tindakan berikutnya: Check-in, Checkout, atau Absensi selesai. Capture/preview/sukses memakai komponen HeroUI dan token bersama, label sesuai tindakan; alasan pulang awal bila wajib. Target catatan dan payload dibekukan selama hasil ambigu, tanpa retake/pembaruan lokasi atau mutasi otomatis. Back/refetch menampilkan kedua event. Route foto-checkout terproteksi dan tidak meminta perangkat sebelum tombol Buka kamera.

## Verifikasi dan checklist

- [x] Hash operasi/target, replay check-in kompatibel; API DTO/query/role dan timeout.
- [x] MySQL/AIStor nyata: tanpa check-in, owner, soft delete, foto scope/freshness, early boundary, same-day cutoff, mixed holiday/weekend, unique/concurrency, recovery/binding/revokasi.
- [x] Frontend alur checkout, alasan, READY reuse, pending payload/target/key, validasi response dan refetch.
- [x] Typecheck/lint/build terkait dan visual 320/1440 terang/gelap.
- [x] Manual perangkat/API browser nyata. Diterima pengguna 2026-10-03.

- [x] 1. Login karyawan siap dan check-in hari ini; Hari ini menunjukkan waktu serta tombol Checkout.
- [x] 2. Checkout meminta foto baru dan lokasi aktif; pada hari kerja reguler sebelum 17.00 isi alasan pulang awal, blank ditolak; weekend/libur tidak mewajibkan alasan.
- [x] 3. Kirim lalu lihat waktu resmi/status; kembali Hari ini menampilkan kedua waktu dan Absensi selesai.
- [x] 4. Reload/kirim ulang tidak menggandakan event. Foto check-in, catatan karyawan lain/terhapus atau lokasi stale ditolak.
- [x] 5. Putus koneksi saat submit lalu cek hasil/retry key sama; target/foto/alasan tidak berubah sebelum hasil jelas.
- [x] 6. Checkout hari lampau tidak ditawarkan/diterima. Periksa weekend/libur tanpa early, serta sesi lama setelah nonaktif/reset ditolak.
- [x] 7. Periksa desktop/ponsel, 320/1440 terang/gelap dan fokus keyboard.

Acuan: [baseline](../requirements/baseline.md), [check-in](attendance-checkin.md), [UI/UX](frontend-ui-ux.md), [lokal](../deployment/attendance-local.md). Riwayat/monitoring/soft delete UI dan deployment tetap task berikut.

## Bukti implementasi 2026-10-02–03

- TDD: hash checkout/target gagal sebelum implementasi lalu enam unit evidence/hash lulus. Lima tes checkout nyata awal gagal karena endpoint belum tersedia; setelah implementasi dan perluasan recovery, suite 21 integrasi Gateway/Auth/Employee/Attendance/Media–MySQL–AIStor lulus (14 regresi T21 + tujuh T22).
- Integrasi mencakup owner/role/forced password, target tanpa check-in, soft delete, foto purpose, GPS stale, alasan 16:59:59.999, normal 17:00:00.000, 23:59:59.999/00:00:00.000, replay lintas tanggal/operation/target, konkurensi, perubahan libur, weekend, outbox binding dan revokasi. Fault checkout respons commit hilang dan binding Media hilang diperiksa lagi secara terfokus; status durable pulih dan audit binding tetap satu.
- Frontend: 32 tes relevan lulus pada suite terfokus (CapturePanel 10, intent 9, response validation 6, App 7). Tes checkout baru gagal sebelum implementasi; membuktikan alasan/fokus, purpose multipart, target payload, hasil operasi salah tidak diterima, pending lintas remount, serta route/refetch selesai. Pemeriksaan copy/recovery terakhir 15 tes lulus; tidak mengulang seluruh monorepo.
- Attendance dan Gateway typecheck/lint/build lulus; tujuh unit Gateway memeriksa allowlist dan header kedua operasi. Attendance lint tanpa warning setelah comparator fixture diperbaiki. Attendance Web typecheck/lint/build lulus; chunk capture/MediaPipe tetap lazy terpisah dari login.
- Dua belas visual otomatis awal lulus (siap checkout, capture idle, selesai; 320/1440 terang/gelap, satu worker). Review screenshot menemukan target tombol beranda 40 px; disesuaikan menjadi 44 px; delapan verifikasi ulang beranda siap/selesai pada 320/1440 terang/gelap lulus, tanpa overflow. MCP browser meninjau preview alasan pulang awal dan sukses sintetis pada 320 px; waktu resmi 16.30.00 WIB, flag pulang awal, ikon terpusat dan tombol 44 px. HeroUI MCP digunakan untuk Button/TextArea/Label. Foto/perangkat sintetis bukan penerimaan perangkat/API browser nyata.
- RAM lokal sempat sekitar 300 MB; server milik sesi dihentikan sementara dan suite dijalankan serial. Timeout App di kondisi ini diperiksa ulang sesudah pelepasan server dan tujuh tes App lulus. Tidak melonggarkan timeout/aturan bisnis atau menambah tooling.

Checklist manual tujuh langkah masih pending; T20/T21/T22 belum ditutup penuh. Tidak ada migrasi, dependency, credentials, generated/build atau data pribadi baru yang masuk Git. Kelima backend health 200 dan Swagger memuat empat endpoint absensi termasuk check-out; kedua portal lokal kembali aktif. Rincian proses akhir dan titik lanjut ada di [progress](../../tasks/progress.md).
