# Database lokal — Prisma 7 dan MySQL

## Kepemilikan dan batas
Satu schema/migration terpusat di prisma/. Gateway dan frontend tidak mengakses database.
Runtime Auth memakai akun attendance_auth; migration memakai attendance_migrator.
Database attendance_dev, attendance_test, dan attendance_shadow adalah schema terpisah
pada instance MySQL lokal yang sama, port 127.0.0.1:3307.
Ini belum menyediakan isolasi instance/container pengujian.

## Setup
Jalankan dari root proyek dengan Docker Desktop aktif:
```powershell
docker compose --env-file .env.mysql -f infra/compose.mysql.local.yml up -d
pnpm db:setup
pnpm db:validate
```
Setup hanya untuk container Compose lokal dengan MYSQL_DATABASE=attendance_dev.
Script tidak mereset password akun yang sudah ada dan tidak menghapus data.
Jika akun sudah ada tetapi .env.database hilang, pulihkan kredensial dari salinan lokal.
Jangan mengganti password lewat script ini.

.env.mysql berisi kredensial root container; .env.database berisi URL migration/runtime.
Keduanya diabaikan Git. .env.database.example aman dipush dan bukan kredensial aktif.
Konfigurasi Prisma memuat .env.database; variabel environment yang sudah ada
memiliki prioritas. Untuk penggunaan lokal, pastikan DATABASE_URL tidak menunjuk host lain.
Shadow database hanya untuk Prisma migrate dev, tidak digunakan service.

## Tahap berikutnya
Migration tabel domain dibuat bertahap berdasarkan baseline.
Runtime hanya mendapat hak pada tabel miliknya setelah migration berhasil.
Audit mendapat SELECT dan INSERT saja, tanpa UPDATE atau DELETE.
Auth Service, seed HRD dan login sudah tersedia; lihat [Auth lokal](auth-local.md).


## Migration Auth dan verifikasi
Fondasi awal memuat auth_accounts, auth_sessions, auth_audit_logs.
Kontrak field dan hak akses: [Auth database](../sdd/auth-database.md).

Setelah setup, jalankan urutan ini:
```powershell
pnpm db:validate
pnpm db:migrate
pnpm db:migrate:test
pnpm db:grants
pnpm db:generate
pnpm db:typecheck
pnpm db:verify
```

db:migrate memakai migration terpusat pada development.
db:migrate:test hanya mengizinkan attendance_test pada 127.0.0.1:3307.
db:grants dijalankan sesudah migration kedua database tersedia.
db:verify memakai Prisma Client dan adapter resmi PrismaMariaDb, tetap ke MySQL 8.4.
Nama adapter bukan perubahan database menjadi MariaDB.
Client terhasilkan di packages/database/src/generated, diabaikan Git; generate ulang setelah checkout/schema berubah.

Verifikasi 2026-10-01:
- Schema valid, migration dev/test berhasil; pengulangan tidak memiliki pending migration.
- Tidak ada drift antara schema dan kedua database.
- Client runtime membaca MySQL development, session timezone +00:00.
- Email unik termasuk akun arsip/kapital, token hash unik, session FK, default INACTIVE.
- Transaksi test rollback akun/sesi/audit sehingga data uji tidak tertinggal.
- Runtime ditolak untuk CREATE TEMPORARY TABLE, SELECT _prisma_migrations,
  DELETE accounts, UPDATE/DELETE audit.
- Typecheck script verifikasi lulus.

Driver verifikasi mengambil RSA public key untuk caching_sha2_password hanya pada
loopback lokal yang divalidasi. Untuk VPS gunakan TLS terverifikasi; jangan menyalin
allowPublicKeyRetrieval ke koneksi remote tanpa rancangan transport yang aman.

Fondasi awal Auth sudah diperluas dengan tabel Employee, Attendance dan Media melalui migration terpusat. Script db:setup/db:grants menambahkan akun runtime masing-masing; Media memakai MEDIA_DATABASE_URL/MEDIA_TEST_DATABASE_URL. Status migrasi aktual dicatat di tasks/progress.md.
Frontend belum memakai data database. Test database masih pada instance lokal yang sama.

## Referensi
- [Prisma 7 MySQL](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/mysql)
- [Opsi koneksi driver](https://mariadb.com/docs/connectors/mariadb-connector-nodejs/node-js-connection-options)
