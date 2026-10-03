# Spesifikasi disetujui — versi 1

Dokumen ini merekam keputusan pengguna dalam sesi perencanaan. Dokumen rancangan terperinci berikutnya harus menjaga aturan ini. Status: kebutuhan, rancangan database, peta endpoint API dan arah UI/UX telah disetujui; rencana serta kemajuan implementasi mengikuti tasks/plan.md dan tasks/todo.md.

## Produk dan platform
- Attendance Portal: attendance.annastriwidagdo.me.
- HR Portal: hr.annastriwidagdo.me.
- API: attendance-api.annastriwidagdo.me.
- MinIO AIStor Free: attendance-storage.annastriwidagdo.me; bucket privat. Lokal dan VPS memakai Docker Compose, single-node, image versi/digest terkunci, volume persisten, dan lisensi Free aktif. Lisensi hanya lokal, tidak masuk GitHub. Keputusan terperinci: docs/architecture/adr-001-object-storage.md.
- React TypeScript, HeroUI melalui MCP HeroUI dan komponen custom; Atomic Design; antarmuka Bahasa Indonesia, responsif dan memiliki arah desain yang jelas.
- NestJS TypeScript; MySQL saja; JWT; bcrypt dengan salt; Swagger.
- API Gateway, Auth, Employee, Attendance, Media: service terpisah dengan port internal berbeda.
- Dua frontend memakai dua project Vercel terpisah: Attendance Portal dan HR Portal. Seluruh backend, MySQL, dan MinIO AIStor Free berjalan di VPS Ubuntu; DNS Cloudflare, domain dibeli di Hostinger.
- Satu repository GitHub berbentuk monorepo: apps/{attendance-web,hr-web,api-gateway,auth-service,employee-service,attendance-service,media-service}, packages/{contracts,ui,config}, docs/{requirements,sdd,architecture,api,testing,deployment}, infra/.
- Topologi repository/deployment disetujui: satu repo, dua project Vercel, backend/MySQL/storage di VPS. Detail: [ADR-003](../architecture/adr-003-repository-and-deployment.md).
- Keputusan pengguna 2026-10-03: branch fitur/perbaikan dari dev → PR ke dev → uji integrasi lokal → PR dev ke main → CI lulus dan keputusan rilis → CD production. Satu environment online dari main untuk 5 karyawan + 1 HR, digunakan nyata (bukan demo); tidak ada deployment dev/preview online. Detail dan status aktivasi: [workflow CI/CD](../development/ci-cd-workflow.md).
- Repository public pilihan pengguna (2026-10-02): [annastriw/employee-attendance-system](https://github.com/annastriw/employee-attendance-system). Setiap perubahan logis terverifikasi (termasuk dokumentasi) di-commit dan dipush ke branch kerja, lalu masuk dev melalui PR. Instruksi push langsung dev sebelumnya digantikan flow ini; main hanya melalui tahap rilis. CD belum aktif sampai artefak/akses T30 siap.
- VPS dikhususkan untuk absensi; pengguna menyatakan UKG telah dipindahkan dan boleh dihapus. Reset/reinstall VPS belum diverifikasi. Target kapasitas awal 2 vCPU/RAM sekitar 3,6 GiB harus diuji untuk 5 check-in bersamaan, termasuk resource, keamanan, monitoring dan pemulihan sebelum production.
- GitHub: kode, spesifikasi, migration, konfigurasi aman, .env.example. Lokal: .env, kredensial, backup, data/foto pribadi.
- SDD, context engineering, Kanban, implementasi bertahap, skills relevan, clean code dan maintainability.
- Testing: frontend Vitest + React Testing Library + Playwright; backend Jest + @nestjs/testing + Supertest, MySQL khusus testing; kamera nyata/mobile diuji manual. [Revisi percepatan disetujui 2026-10-02](../../tasks/plan.md#tier-test-biaya-vs-nilai--disetujui-2026-10-02): typecheck/lint dan test perilaku package terdampak; visual hanya halaman/layout berubah; E2E browser manual per fitur selama development, regresi browser otomatis sebelum rilis saat resource tersedia. Integrasi MySQL/AIStor dan test bisnis/otorisasi/revokasi/constraint/idempotensi/pemulihan tetap wajib. Suite seluruh repo hanya pada checkpoint lintas package yang relevan dan sebelum main. Simpan test lama, hindari test UI statis yang redundan, dan jangan ulang bukti lulus tanpa perubahan/risiko baru.

## Akun dan karyawan
- Login email/password, panel dan endpoint admin/karyawan terpisah.
- Satu admin seed, tanpa menu tambah admin. Wajib mengganti password awal; dapat mengganti password sendiri.
- Karyawan dibuat HRD, password sementara tampil sekali, disampaikan manual; tidak ada email otomatis.
- Wajib mengganti password sementara sebelum fitur bisnis. Reset membatalkan sesi lama.
- Profil: ID, NIK internal unik, nama, telepon opsional, departemen, jabatan, tanggal mulai bekerja, status. Email unik dimiliki Auth.
- HRD CRUD profil, reset password, aktivasi/nonaktif, soft delete dan restore.
- Nonaktif/arsip menutup login dan membatalkan sesi; riwayat tetap tersedia untuk HRD. Email/NIK tetap dicadangkan.
- Restore karyawan menghasilkan status nonaktif, aktivasi terpisah.
- Master departemen/jabatan dikelola HRD. Yang digunakan tidak dihapus permanen; dapat dinonaktifkan, tidak tersedia untuk penugasan baru.

## Absensi
- Senin–Jumat 08.00–17.00 Asia/Jakarta. Backend menentukan waktu resmi.
- Check-in sampai 08.00 tepat waktu; setelah 08.00 terlambat dan wajib alasan.
- Checkout wajib setelah check-in, sebelum 17.00 pulang lebih awal dan wajib alasan; mulai 17.00 sesuai jadwal, bukan otomatis lembur.
- Checkout paling lambat 23.59.59 WIB tanggal check-in; tidak ada checkout otomatis.
- Satu pasangan check-in/checkout per karyawan/tanggal, termasuk catatan terhapus.
- Hari kerja tanpa check-in: belum check-in selama jam kerja, tidak ada absensi setelah 17.00. Check-in tanpa checkout: belum checkout.
- Akhir pekan/libur tidak wajib; absensi tetap boleh, dilabeli di luar hari kerja, tanpa penilaian terlambat/pulang awal/lembur.
- HRD kalender libur nasional/perusahaan, tanggal+keterangan; hanya hari ini/mendatang bisa diubah.
- Snapshot status event lama tidak berubah. Libur ditambahkan hari ini berlaku pada event berikutnya dan kewajiban hari itu.
- Tanpa izin/sakit/cuti, offline attendance, ekspor Excel atau penetapan lembur.

## Foto, lokasi, dan pengiriman
- Check-in/checkout wajib foto dan lokasi.
- @mediapipe/tasks-vision Face Detector: jumlah, posisi, confidence; tepat satu wajah jelas di panduan.
- Face Landmarker: kedipan memicu auto capture. Manual fallback tetap mensyaratkan satu wajah valid; preview dan retake.
- Tanpa pencocokan wajah atau verifikasi identitas biometrik.
- Lokasi: latitude, longitude, accuracy meters, capturedAt. Izin ditolak/lokasi tidak aktif/gagal -> tidak bisa kirim. Panduan dan retry.
- Tanpa geofence; Leaflet menampilkan lokasi kedua event terpisah.
- Sukses hanya setelah foto+lokasi+data tersimpan. Retry idempotent, waktu backend saat penerimaan berhasil.
- Foto MinIO AIStor Free privat; signed URL sementara setelah otorisasi. Karyawan foto aktif sendiri; HRD semua termasuk terhapus.

## Monitoring dan penghapusan
- Dashboard per tanggal: aktif, check-in, terlambat, pulang awal, belum checkout, tidak ada absensi.
- Filter tanggal/rentang, karyawan, departemen, status; detail waktu, foto, lokasi, alasan.
- Karyawan semua riwayat sendiri, filter tanggal/pagination. Catatan terhapus berlabel dihapus HRD, waktu+alasan terlihat, foto disembunyikan, bukan rekap aktif.
- HRD riwayat karyawan arsip. Tidak bisa edit waktu/foto atau absen atas nama karyawan.
- Soft delete absensi seluruh hari, konfirmasi nama/tanggal, alasan wajib, audit actor+waktu+alasan. Menu absensi dihapus dan restore.
- Restore menolak konflik aktif tanggal yang sama. Penghapusan tidak membuka absen ulang. Kontrak versi, transaksi dan pemulihan mengikuti [lifecycle absensi T23](../sdd/attendance-lifecycle.md).
- Tanpa hard delete di UI. Retensi permanen belum ditentukan.

## Rancangan database yang disetujui
- Satu database, kepemilikan tabel per service; akun DB dibatasi; FK dalam service, ID antarservice.
- UUID CHAR(36), InnoDB utf8mb4; DATETIME(3) UTC, attendance_date DATE WIB.
- Auth: auth_accounts, auth_sessions, auth_audit_logs; hash refresh token, pemeriksaan status sesi untuk membatalkan JWT lama.
- Employee: emp_employees, emp_departments, emp_positions, emp_employee_history, emp_audit_logs.
- Attendance: att_work_policies, att_holidays, att_daily_records, att_events, att_idempotency_requests, att_audit_logs, att_outbox.
- Media: media_objects, media_audit_logs; status PENDING/READY/FAILED, bucket/key unik, checksum, pemilik/purpose.
- UNIQUE(employee_id,attendance_date) tetap untuk soft delete; UNIQUE(daily_record_id,event_type) dan UNIQUE(photo_object_id) pada event. Binding foto/event unik, intent ber-state dan outbox durable mengikuti [kontrak check-in T21](../sdd/attendance-checkin.md).
- Event snapshot jadwal/hari libur, foto, koordinat, akurasi, waktu lokasi, metode capture, is_late/is_early_departure dan reason.
- Profil departemen/jabatan snapshot di catatan harian; riwayat karyawan untuk eligibility historis.
- Missing attendance dihitung, bukan baris palsu. Absensi terhapus bukan missing.
- Outbox dan deduplikasi event antarservice; retry/kompensasi pembuatan profil+akun; hanya foto READY dapat dikaitkan.
- Audit append-only tanpa password/hash/token/signed URL.

## Peta kontrak API yang disetujui
Base /api/v1; Swagger /docs; UUID; waktu response ISO8601 +07:00; pagination/filter; requestId.
- POST /auth/{employee,admin}/login; POST /auth/refresh, /auth/logout, /auth/change-password; GET /auth/me.
- GET/POST /employees; GET/PATCH/DELETE /employees/:id; POST activate/deactivate/restore/reset-password di /employees/:id/.
- GET/POST /departments dan /positions; GET/PATCH /:id; POST /:id/activate dan /:id/deactivate.
- GET/POST /holidays; PATCH/DELETE /holidays/:id.
- GET /me/attendance/today, /me/attendance, /me/attendance/:id; POST /me/attendance/check-in dan check-out.
- POST /media/attendance-photos multipart; GET /attendance/:id/events/:eventId/photo-url.
- GET /monitoring/summary dan /monitoring/employees; GET /attendance dan /attendance/:id; DELETE /attendance/:id dengan alasan; POST /attendance/:id/restore.
- Payload attendance: photoObjectId, clientCapturedAt berzona (bukan waktu resmi), captureMethod, location{latitude,longitude,accuracyMeters,capturedAt}, reason.
- Checkout menambahkan dailyRecordId dari catatan hari ini sebagai target tetap; harus milik sesi dan masih tanggal WIB yang sama. Detail [checkout T22](../sdd/attendance-checkout.md).
- employeeId berasal dari sesi. Idempotency-Key wajib; jika ambang waktu terlewati dan alasan belum ada, service meminta alasan sebelum menerima.
- Response sukses data+meta; error error{code,message,details}+meta. HTTP 400/401/403/404/409/422/503 sesuai kontrak.

## Tooling yang disetujui
- pnpm workspace; Prisma dengan satu pengelola schema/migration untuk satu database; HTTP internal + transactional outbox dan worker retry/idempotent. Tanpa RabbitMQ pada tahap awal. Detail: docs/architecture/adr-002-project-tooling.md.

## Detail yang diselesaikan sebelum implementasi terkait
- Versi dependency dan kompatibilitas pnpm/Node/Prisma/NestJS; lokasi pengelola migration, kontrak HTTP internal serta retry/ordering/deduplikasi outbox.
- Kriteria confidence/posisi, batas ukuran/tipe foto, kesegaran lokasi dan toleransi jam perangkat.
- Presisi ambang 08.00 dan 23.59.59, eligibility tanggal aktivasi/nonaktif, rekap hari dengan event campuran setelah perubahan kalender.
- TTL token/signed URL, kebijakan password, retensi foto/data/audit.
- Akses Vercel/VPS/Cloudflare/GitHub dan kapasitas VPS sebelum deployment; kredensial tidak disimpan dalam dokumen.

## Tema visual frontend
- Penegasan pengguna 2026-10-02: T09c disetujui dan wajib pada seluruh halaman Attendance/HR yang tersedia maupun yang dibangun selanjutnya (E01–E09/H01–H14), beserta seluruh state dan dialog. Tema monokrom T09b telah digantikan.
- Kedua portal dan seluruh halaman berikutnya memakai tema produk modern ala Linear (revisi 2026-10-01): netral zinc, satu aksen emerald, font Geist, ikon Phosphor, mode terang dan gelap mengikuti sistem, tetap mudah dipahami. Login Attendance satu form terpusat satu kolom; login HR split-screen (form + panel kemampuan produk) pada layar lebar; keduanya tanpa slogan jualan atau statistik palsu. HR sidebar ramping dan menu akun. HeroUI dan custom component Atomic Design mengikuti [kontrak desain](../sdd/frontend-design-system.md); token serta shell bersama disimpan di packages/ui.

- Konsep seluruh halaman: ruang kerja yang tenang dan terstruktur; karyawan berfokus tindakan berikutnya, HR berfokus pencarian/pemeriksaan catatan. Susunan layar, capture, states, daftar/detail, lifecycle dan acceptance mengikuti [spesifikasi UI/UX](../sdd/frontend-ui-ux.md).
- Seluruh proyek berlanjut sesuai plan dalam repo lokal yang sama, termasuk saat agen/alat berganti karena kapasitas sesi. Seluruh lapisan dikerjakan serial sesuai dependensi, dengan dua agen bergantian dan satu agen aktif pada satu waktu. Saat sesi mendekati batas, checkpoint dan prompt trigger disiapkan untuk melanjutkan progres. Acuan: [alur implementasi](../development/implementation-workflow.md).
