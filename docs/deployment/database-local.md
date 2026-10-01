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
Login, seed HRD, dan database module NestJS belum dibuat pada tahap setup ini.

