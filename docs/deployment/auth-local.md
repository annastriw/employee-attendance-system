# Auth Service lokal

## Persiapan
Jalankan dari root:
```powershell
pnpm db:generate
node scripts/database/setup-auth-local.mjs
pnpm --dir apps/auth-service build
pnpm --dir apps/auth-service seed:admin
pnpm --dir apps/auth-service start:dev
```

Auth memakai port 3001 dan bind 127.0.0.1. PORT dapat diubah melalui environment.
.env.database menyediakan AUTH_DATABASE_URL. Runtime menolak akun root/migrator.
.env.auth berisi JWT secret dan seed admin; kedua file diabaikan Git.
ADMIN_SEED_EMAIL lokal adalah admin@example.test; password acak ada pada ADMIN_SEED_PASSWORD.
Password tidak dicetak atau dimasukkan ke dokumentasi/Git. Jangan membagikan isi .env.auth.

## Health dan seed
GET http://localhost:3001/health mengecek MySQL dan mengembalikan status up atau 503 generik.
GET http://localhost:3001/health/live memeriksa proses saja.
Seed memakai bcrypt cost 12 dan salt acak, status ACTIVE dan mustChangePassword=true.
Seed dijalankan ulang tidak mereset password/status admin yang sudah ada.
Email admin berbeda ditolak jika HRD sudah ada. Seed memakai transaksi Serializable.
Tidak ada endpoint UI/API untuk membuat admin baru.

## Verifikasi
Jest 6 unit test dan Supertest 2 test scaffold/health lulus pada tahap T08a–T08b.
Build dan lint Auth lulus. Seed nyata dev dijalankan dua kali: create lalu preserve.
Tabel Employee/Attendance/Media, Gateway dan frontend belum dihubungkan.
Endpoint login/sesi dilanjutkan pada T08c–T08d.
