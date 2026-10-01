# MySQL lokal — setup dan verifikasi
Status: setup dan pengujian manual dikonfirmasi pengguna pada 2026-10-01 (Asia/Jakarta). Pengujian runtime tidak diulang oleh agent untuk commit ini.

## Konfigurasi
- Compose: infra/compose.mysql.local.yml.
- Image: mysql:8.4.11; gunakan versi yang sama saat merancang deployment VPS.
- Database: attendance_dev.
- Koneksi dari Windows: 127.0.0.1:3307; dari container pada network yang sama: mysql:3306.
- Zona waktu server: +00:00 (UTC), charset utf8mb4.
- Volume persisten: mysql_data dalam project attendance-database-local.
- Kredensial: .env.mysql (lokal, diabaikan Git).
- Template aman: .env.mysql.example, tanpa password.
- Akun root hanya untuk administrasi/setup; akun per service disiapkan saat implementasi.
- Testing aplikasi nanti memakai instance terpisah; jangan memakai data development untuk test yang mengubah data.

## Perintah dari root repository
Validasi tanpa menampilkan kredensial:
docker compose --env-file .env.mysql -f infra/compose.mysql.local.yml config --quiet

Jalankan:
docker compose --env-file .env.mysql -f infra/compose.mysql.local.yml up -d

Login interaktif, masukkan password ketika diminta:
docker compose --env-file .env.mysql -f infra/compose.mysql.local.yml exec mysql mysql -u root -p

Hentikan tanpa menghapus data:
docker compose --env-file .env.mysql -f infra/compose.mysql.local.yml stop

## Pengujian yang dilaporkan berhasil
- Container startup, login MySQL, version/timezone dan database attendance_dev.
- Create/insert/select pada tabel uji setup_storage_test.
- Data uji tetap tersedia setelah restart container.
- Tabel uji dihapus setelah pemeriksaan.
- Port 127.0.0.1:3307 dapat diakses dari Windows.

## Catatan operasional
Password environment digunakan ketika inisialisasi pertama; perubahan .env.mysql tidak otomatis mengganti password akun pada volume yang sudah berisi database.
Jangan menggunakan down --volumes untuk penghentian biasa karena menghapus volume.
PowerShell boleh ditutup setelah up -d; Docker Engine harus tetap berjalan.
Konfigurasi VPS, backup/restore dan migration aplikasi belum dilakukan.

## Sumber
https://hub.docker.com/_/mysql
