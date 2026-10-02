# Attendance Portal lokal

## Persiapan absensi T21/T22

Dari root proyek di PowerShell, gunakan konfigurasi MySQL, Auth, Employee dan AIStor/Media yang sudah dibuat. Ikuti [MySQL](mysql-local.md), [Auth](auth-local.md), [HR/Employee](hr-local.md), [Media](media-local.md) dan [Gateway](gateway-local.md). Jangan salin kredensial ke dokumentasi atau Git.

Jika Docker belum berjalan:

~~~powershell
docker compose --env-file .env.mysql -f infra/compose.mysql.local.yml up -d mysql
docker compose --env-file .env.aistor -f infra/compose.aistor.local.yml up -d
~~~

Siapkan Attendance dan schema terbaru:

~~~powershell
pnpm attendance:setup
pnpm db:migrate
pnpm db:grants
pnpm db:generate
~~~

attendance:setup membaca secret internal yang sudah ada di .env.employee dan .env.media, lalu mengisi nilai yang belum tersedia di .env.attendance (ignored). Nilai existing dipertahankan. Attendance membaca .env.database dan .env.attendance, memakai akun MySQL khusus Attendance; tabel service lain diakses lewat HTTP internal. Untuk test terisolasi, jalankan pnpm db:migrate:test setelah database test siap.

## Menjalankan

Jalankan setiap baris berikut pada terminal terpisah dari root proyek dan biarkan terbuka. Jangan membuat proses kedua jika port yang sama sudah digunakan:

~~~powershell
pnpm --dir apps/auth-service start:dev
pnpm --dir apps/employee-service start:dev
pnpm --dir apps/media-service start:dev
pnpm --dir apps/attendance-service start:dev
pnpm --dir apps/api-gateway start:dev
pnpm --dir apps/attendance-web dev --port 5173 --strictPort
pnpm --dir apps/hr-web dev --port 5174 --strictPort
~~~

| Aplikasi | Port | Pemeriksaan |
| --- | --- | --- |
| Gateway | 3000 | /health |
| Auth | 3001 | /health |
| Employee | 3002 | /health |
| Attendance | 3003 | /health; /docs untuk Swagger |
| Media | 3004 | /health |
| Attendance Portal | 5173 | http://localhost:5173 |
| HR Portal | 5174 | http://localhost:5174 |

Semua endpoint health backend menggunakan http://127.0.0.1:PORT. Attendance health menampilkan status database dan jumlah outbox pending/processing, tanpa data karyawan. Worker Attendance mengikat foto READY ke event melalui Media; retry berjalan otomatis dengan batch/lease/backoff terbatas.

Frontend hanya memakai Gateway http://localhost:3000/api/v1. Gunakan localhost secara konsisten untuk browser/cookie. Login karyawan memakai email/password dari HR dan wajib mengganti password awal. Hari ini, check-in dan checkout memerlukan kelima backend; proses Auth saja cukup untuk login, tetapi tidak cukup untuk memuat absensi.

Untuk proses tanpa watch, build service terkait lalu gunakan start:prod. Perubahan source backend memerlukan build dan restart proses dist; Vite memperbarui frontend saat development. Deployment Vercel/VPS tetap tahap rilis, bukan setiap push.

## Pengujian manual

Ikuti [checklist checkout T22](../sdd/attendance-checkout.md#verifikasi-dan-checklist), [checklist T21](../sdd/attendance-checkin.md#checklist-manual) dan [capture T20](../sdd/attendance-capture.md#checklist-manual-pengguna). Pastikan health kelima backend 200, AIStor aktif, dan karyawan ACTIVE+ready dengan startDate yang sudah berlaku.

Kamera/lokasi membutuhkan HTTPS atau localhost. HTTP melalui IP LAN biasa tidak memenuhi secure context. Uji ponsel memerlukan origin HTTPS yang telah dimasukkan ke allowlist Auth/Gateway; tunnel/deployment tidak dibuat pada increment ini.

Alur: Hari ini → Check-in → Buka kamera → satu wajah dan lokasi aktif → kedip/manual → preview → alasan jika terlambat → Kirim check-in. Foto dikirim multipart terlebih dahulu; Attendance menerima ID foto READY, lokasi dan timestamp bukti, kemudian menetapkan waktu resmi server. Cek hasil/Kirim ulang menjaga key+payload yang sama ketika hasil belum pasti. Jangan menganggap 404 status request sebagai bukti gagal.

Setelah check-in, Hari ini menawarkan Checkout. Capture memakai foto baru dengan purpose CHECK_OUT dan membawa dailyRecordId catatan tersebut. Pada hari kerja reguler sebelum 17.00 isi alasan pulang awal; hasil resmi menampilkan waktu checkout, lalu Hari ini menampilkan kedua waktu dan Absensi selesai. Checkout baru tanggal lampau ditolak; tidak ada checkout otomatis atau penetapan lembur.

Jangan kirim foto, koordinat, password, token, secret, atau berkas lisensi ke repo/laporan. Catat nomor langkah lulus/gagal dan pesan aman. Hasil sintetis otomatis tidak menggantikan penerimaan kamera/GPS pada perangkat nyata.

## Bukti

T13 login/password/logout diterima pengguna pada 2026-10-02; [spesifikasi login](../sdd/employee-auth-flow.md). T20 capture lulus pemeriksaan teknis dengan checklist perangkat masih pending. T21 bukti API/MySQL/AIStor, frontend, visual dan status manual ada di [check-in](../sdd/attendance-checkin.md).
