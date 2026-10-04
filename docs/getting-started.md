# Clone dan menjalankan lokal

Panduan clone bersih; semua command dari root repository. Gunakan database/storage lokal sendiri.

## 1. Prasyarat

Git, Node.js 24.x (minimum 24.15.0, engine `<25`), pnpm 10.28.0, Docker dengan Compose, dan lisensi AIStor Free milik sendiri. Windows: Docker Desktop dengan WSL 2 harus aktif. Port lokal: 3000–3004, 3307, 5173–5174, 9000–9001.

```sh
git clone https://github.com/annastriw/employee-attendance-system.git
cd employee-attendance-system
git switch dev
npm install --global pnpm@10.28.0
pnpm install --frozen-lockfile
```

## 2. Environment infra

Command membuat password acak tanpa mencetaknya. Flag `wx` menolak overwrite: jika file sudah ada, pulihkan/periksa kredensial existing alih-alih regenerate.

```sh
node -e "const fs=require('node:fs'),c=require('node:crypto');fs.writeFileSync('.env.mysql','MYSQL_ROOT_PASSWORD='+c.randomBytes(32).toString('hex')+'\nMYSQL_DATABASE=attendance_dev\n',{flag:'wx',mode:384})"
node -e "const fs=require('node:fs'),c=require('node:crypto');fs.writeFileSync('.env.aistor','AISTOR_ROOT_USER=attendance-local-admin\nAISTOR_ROOT_PASSWORD='+c.randomBytes(32).toString('hex')+'\n',{flag:'wx',mode:384})"
node -e "require('node:fs').copyFileSync('.env.gateway.example','.env.gateway',require('node:fs').constants.COPYFILE_EXCL)"
node -e "require('node:fs').mkdirSync('.licenses',{recursive:true})"
```

Dapatkan lisensi dari [MinIO](https://www.min.io/pricing), lalu salin melalui file manager ke `.licenses/minio.license`. File tidak disertakan di repo. `.env.*` dan lisensi diabaikan Git. Mode POSIX tidak menggantikan ACL Windows; simpan proyek pada akun pengguna sendiri.

## 3. MySQL dan schema

```sh
docker compose --env-file .env.mysql -f infra/compose.mysql.local.yml up -d
docker compose --env-file .env.mysql -f infra/compose.mysql.local.yml ps
```

Tunggu MySQL siap menerima koneksi, kemudian:

```sh
pnpm db:setup
pnpm db:migrate
pnpm db:migrate:test
pnpm db:grants
pnpm db:generate
```

Setup menghasilkan `.env.database`, database dev/test/shadow dan akun lokal. Migration test dibutuhkan karena grants juga memberi hak pada tabel test; langkah ini bukan menjalankan suite test. Dev/test memakai schema berbeda pada instance lokal yang sama. Runtime mendapat hak pada tabel service masing-masing; migrator terpisah. [Database/ERD](database.md).

## 4. Service dan storage

```sh
node scripts/database/setup-auth-local.mjs
pnpm provisioning:setup
docker compose --env-file .env.aistor -f infra/compose.aistor.local.yml up -d
docker compose --env-file .env.aistor -f infra/compose.aistor.local.yml ps
pnpm storage:setup
pnpm attendance:setup
```

Tunggu S3 siap sebelum `storage:setup`. Script membuat bucket privat dev/test dan user Media terbatas. Secret Auth/Employee/Attendance/Media diselaraskan otomatis. Nilai existing dipertahankan; konflik konfigurasi menghentikan setup.

| File | Isi |
| --- | --- |
| `.env.mysql` | Root MySQL untuk setup |
| `.env.database` | URL migrator dan runtime dev/test |
| `.env.auth` | JWT, seed HR lokal, provisioning/enkripsi receipt |
| `.env.employee` | Endpoint Auth dan secret provisioning |
| `.env.media` | Akun S3 aplikasi dan secret Media |
| `.env.attendance` | Endpoint dan secret sesuai Employee/Media |
| `.env.gateway` | Endpoint backend dan origin frontend |

Frontend default `http://localhost:3000/api/v1`. Override opsional di `.env.local` frontend masing-masing: `VITE_API_BASE_URL=http://localhost:3000/api/v1`; restart Vite setelah perubahan. Variabel `VITE_` publik dan tidak boleh memuat secret.

## 5. Seed HR lokal

```sh
pnpm --dir apps/auth-service build
pnpm --dir apps/auth-service seed:admin
```

Email lokal `admin@example.test`; password awal acak ada pada `ADMIN_SEED_PASSWORD` di `.env.auth`. Buka file di editor lokal, login HR, lalu ganti password. Seed ulang tidak reset akun existing. Akun demo live tidak otomatis ada lokal.

Setelah login HR, buat departemen, jabatan dan karyawan melalui UI. Password sementara tampil sekali; gunakan pada portal karyawan lalu ganti passwordnya. Importer historis production bukan langkah setup lokal.

## 6. Jalankan tujuh aplikasi

Setiap baris pada **terminal terpisah**, dari root repo:

```sh
pnpm --dir apps/auth-service start:dev
pnpm --dir apps/employee-service start:dev
pnpm --dir apps/media-service start:dev
pnpm --dir apps/attendance-service start:dev
pnpm --dir apps/api-gateway start:dev
pnpm --dir apps/attendance-web dev --port 5173 --strictPort
pnpm --dir apps/hr-web dev --port 5174 --strictPort
```

| Aplikasi | Alamat |
| --- | --- |
| Attendance Portal | http://localhost:5173 |
| HR Portal | http://localhost:5174 |
| Gateway | http://localhost:3000/health |
| Auth / Employee / Attendance / Media | `/health` port 3001 / 3002 / 3003 / 3004 |
| Swagger service bisnis | `/docs` pada port service masing-masing |
| MySQL | 127.0.0.1:3307 |
| S3 / Console | http://localhost:9000 / http://localhost:9001 |

Gunakan `localhost` secara konsisten untuk browser/cookie/origin. Kamera dan geolocation memerlukan HTTPS atau localhost; HTTP IP LAN biasa tidak cukup untuk uji ponsel.

## 7. Development berikutnya

Setelah checkout terbaru: install frozen lockfile; jalankan migration baru jika ada, grants dan generate. Secret existing dipertahankan. [Workflow development](development.md).

Ctrl+C pada terminal service untuk berhenti. Infra dapat dihentikan tanpa menghapus data:

```sh
docker compose --env-file .env.mysql -f infra/compose.mysql.local.yml stop
docker compose --env-file .env.aistor -f infra/compose.aistor.local.yml stop
```

`down --volumes` menghapus data; jangan dipakai untuk penghentian biasa.

## Troubleshooting

| Gejala | Periksa |
| --- | --- |
| Docker/MySQL gagal | Docker aktif, MySQL siap, `.env.mysql` cocok data existing |
| Storage gagal | Lisensi valid dan tidak kosong, status container, `.env.media` dan policy |
| Port terpakai | Hindari dua proses untuk aplikasi yang sama |
| Login gagal setelah ganti password | Login ulang dengan password baru; sesi lama dicabut |
| Frontend deploy masih localhost | Redeploy setelah mengganti VITE_API_BASE_URL; nilai ini build-time |
| Kamera ditolak | Izin browser dan HTTPS/localhost |

Resep dicek terhadap scripts/config. Pada perapian dokumentasi ini, setup tidak dijalankan ulang pada database kosong dan tidak ada klaim suite aplikasi baru.
