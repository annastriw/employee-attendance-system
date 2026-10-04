# T30 — deployment VPS manual

Jalankan satu tahap per giliran, kirim output yang diminta, lalu lanjut setelah hasil diperiksa. Acuan [workflow rilis](../development/ci-cd-workflow.md) dan [testing](../testing/workflow.md). Setup terakhir berada di /opt/attendance; MySQL dan AIStor production sudah dibuat pengguna. Jangan reset/ulang bootstrap.

## Tahap 1 — konfirmasi infra dan database

Jalankan pada SSH VPS, bukan PowerShell lokal. Semua command tahap ini read-only: tidak deploy, restart, migrate atau mengubah konfigurasi. Tidak menampilkan nilai secret.

### 1. Status container

```sh
cd /opt/attendance
sudo docker compose --env-file .secrets/aistor.env -f compose.infra.yml ps
```

Target: mysql healthy, aistor running. Jika command gagal, kirim error dan jangan menjalankan up/reset untuk memperbaikinya sendiri.

### 2. Resource, port dan network

```sh
free -h
df -h /
sudo ss -lntp | grep -E ':(22|80|443|3000|3001|3002|3003|3004|3306|3307|9000|9001)\b'
sudo docker network ls --format 'table {{.Name}}\t{{.Driver}}'
```

Catat resource tersisa dan port yang sudah terpakai. mysql/storage seharusnya hanya loopback; nama network aktual dipakai untuk langkah backend berikutnya.

### 3. Apakah schema production sudah diisi?

```sh
sudo docker compose --env-file .secrets/aistor.env -f compose.infra.yml exec -T mysql sh -c '
  MYSQL_PWD="$(cat /run/secrets/mysql_root_password)" \
    mysql -uroot attendance_prod --batch \
    -e "SELECT DATABASE() AS db; SELECT COUNT(*) AS jumlah_tabel FROM information_schema.tables WHERE table_schema = DATABASE();"
'
```

Ini hanya membaca nama database/jumlah tabel; tidak menampilkan password atau isi data karyawan. Nol tabel berarti migration belum diterapkan; jangan migrate/reset pada tahap ini. Jika gagal karena secret/path/akses berbeda, kirim error tanpa mencetak file secret.

Kirim output status Compose, resource/port/network dan jumlah tabel. Tahap berikut ditentukan dari hasil tersebut. Tidak menjalankan unit/integrasi/browser suite pada audit read-only ini.

## Tahap 2A — akun migrator production

Tahap 1 diterima dari output pengguna 2026-10-04: MySQL healthy, AIStor running, network attendance-prod-backend, RAM available 2 GiB, disk available 46 GB, attendance_prod nol tabel. Nginx kini aktif pada 80/443; jangan menganggap konfigurasi lama masih disabled.

Bagian ini membuat akun yang khusus menerapkan migration pada attendance_prod, bukan akun backend. Tidak menjalankan migration/reset/restart. Setelah hasil akun diterima, lanjut 2B migration dari source rilis yang ditetapkan, kemudian akun runtime terbatas.

### 1. Simpan password acak tanpa menampilkannya

Jalankan pada SSH VPS. Jika file sudah ada, block berhenti; jangan overwrite atau lanjut block berikutnya, kirim error tanpa isi file.

```sh
cd /opt/attendance
(
  set -eu
  set -o noclobber
  umask 077
  migrator_password=$(openssl rand -hex 32)
  printf 'MIGRATOR_PASSWORD=%s\n' "$migrator_password" > .secrets/migrator.env
  echo 'PASS: file kredensial migrator dibuat'
)
ls -l .secrets/migrator.env
```

Target permission -rw------- (600). Jangan cat/print/salin isi file ke chat.

### 2. Buat akun dan uji login

```sh
sudo docker exec -i --env-file .secrets/migrator.env attendance-prod-mysql-1 sh -s <<'SH'
set -eu
case "$MIGRATOR_PASSWORD" in
  ''|*[!0-9a-f]*) echo 'STOP: format password tidak sesuai'; exit 1 ;;
esac
[ "${#MIGRATOR_PASSWORD}" -eq 64 ] || { echo 'STOP: panjang password tidak sesuai'; exit 1; }

mysql_root() {
  MYSQL_PWD="$(cat /run/secrets/mysql_root_password)" \
    mysql -uroot --batch --skip-column-names "$@"
}

count=$(mysql_root -e "SELECT COUNT(*) FROM mysql.user WHERE User='attendance_migrator';")
[ "$count" = 0 ] || { echo 'STOP: akun migrator sudah ada; jangan mengganti password'; exit 1; }

if ! mysql_root >/dev/null 2>&1 <<SQL
CREATE USER 'attendance_migrator'@'%' IDENTIFIED BY '$MIGRATOR_PASSWORD';
GRANT ALL PRIVILEGES ON \`attendance\_prod\`.* TO 'attendance_migrator'@'%';
SQL
then
  echo 'FAIL: akun/grant belum lengkap; simpan file kredensial dan laporkan hasil'
  exit 1
fi
echo 'PASS: akun migrator dibuat'

MYSQL_PWD="$MIGRATOR_PASSWORD" mysql --protocol=TCP -h127.0.0.1 \
  -uattendance_migrator attendance_prod --batch \
  -e 'SELECT DATABASE(), CURRENT_USER(); SHOW GRANTS FOR CURRENT_USER;'
echo 'PASS: login migrator berhasil'
SH
```

Grant dibatasi attendance_prod; underscore di-escape agar bukan wildcard database, sesuai [MySQL GRANT](https://dev.mysql.com/doc/refman/8.4/en/grant.html). Tidak memberi grant option/global privilege. Jika gagal setelah CREATE USER, jangan membuat ulang secret atau mengganti password; kirim pesan FAIL/STOP untuk rekonsiliasi sebelum langkah berikut.

Kirim output PASS/STOP/FAIL, ls permission dan SELECT/SHOW GRANTS. Jangan kirim nilai password. Tahap ini belum diklaim selesai sebelum output pengguna diterima.

## Tahap 2B — siapkan source migration

Pengguna menyatakan tahap 2A lancar semua pada 2026-10-04. Akun/login migrator diterima berdasarkan laporan pengguna; password tidak dicatat. Berikut hanya mengambil source, belum menjalankan migration atau backend. Main masih dasar dokumentasi rilis pertama; source dev dipin untuk persiapan, bukan deployment dev. Sebelum migration dijalankan, cocokkan migration dengan source rilis main yang disetujui.

Jalankan satu block pada SSH VPS. Folder tujuan baru; jika sudah ada, berhenti tanpa menghapus/menimpanya.

```sh
(
  set -eu
  source_dir=/opt/attendance/releases/source-ffe1365
  source_commit=ffe136562717f4944051e51061f56bec015ff42c

  [ ! -e "$source_dir" ] || {
    echo 'STOP: folder source sudah ada; kirim hasil ini'
    exit 1
  }

  git clone --branch dev --single-branch \
    https://github.com/annastriw/employee-attendance-system.git "$source_dir"
  git -C "$source_dir" checkout --detach "$source_commit"
  [ "$(git -C "$source_dir" rev-parse HEAD)" = "$source_commit" ]
  cd "$source_dir"
  git status --short --branch
  git log -1 --oneline
  find prisma/migrations -maxdepth 2 -type f -name migration.sql | sort
  echo 'PASS: source migration tersedia; database belum diubah'
)
```

Kirim output block ini. Jangan install dependency, build semua service, menjalankan db:setup/db push/migrate reset atau menyalin secret ke source. Berikutnya siapkan tooling migrate deploy sesuai source rilis; konfigurasi lokal memerlukan shadow database dan tidak dipakai langsung untuk production.

## Tahap 2C — tooling migration dan validasi schema

Tahap 2B diterima dari output pengguna: source ffe1365 tersedia dengan 10 migration. Belum ada migration yang diterapkan. Tooling tersendiri menggunakan Prisma 7.10.0 dengan npm lockfile; tidak menginstal dependency seluruh monorepo atau build backend. Konfigurasi ini menerima DATABASE_URL dari environment, tanpa membaca file lokal atau membutuhkan shadow database, sesuai [Prisma Config](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference).

Jalankan block berikut pada SSH VPS. Fetch tidak mengubah checkout source migration; git archive hanya mengambil file tooling dari commit dev yang dicatat. Jangan menyalin secret ke folder tooling. Jika command gagal, berhenti dan kirim error.

```sh
(
  set -eu
  set -o pipefail
  source_dir=/opt/attendance/releases/source-ffe1365
  tooling_dir=/opt/attendance/releases/migration-tooling

  [ ! -e "$tooling_dir" ] || {
    echo 'STOP: folder tooling sudah ada; kirim hasil ini'
    exit 1
  }
  [ "$(git -C "$source_dir" rev-parse HEAD)" = ffe136562717f4944051e51061f56bec015ff42c ]
  git -C "$source_dir" fetch origin dev
  tooling_commit=$(git -C "$source_dir" rev-parse FETCH_HEAD)
  mkdir "$tooling_dir"
  git -C "$source_dir" archive "$tooling_commit" \
    infra/Dockerfile.migrator infra/prisma-migrator.config.ts infra/migrator |
    tar -x -C "$tooling_dir"
  printf '%s\n' "$tooling_commit" > "$tooling_dir/source-commit.txt"

  sudo docker build --progress=plain \
    -f "$tooling_dir/infra/Dockerfile.migrator" \
    -t attendance-migrator:prisma-7.10.0 "$tooling_dir/infra"

  sudo docker run --rm --network none --memory 512m \
    --mount "type=bind,src=$source_dir/prisma,dst=/tooling/prisma,readonly" \
    -e DATABASE_URL=mysql://validation:validation@127.0.0.1:1/attendance_validation \
    attendance-migrator:prisma-7.10.0 \
    validate --config /tooling/infra/prisma-migrator.config.ts

  printf 'Tooling commit: %s\n' "$tooling_commit"
  echo 'PASS: tooling dan schema siap; database belum diubah'
)
```

URL validation adalah nilai dummy, bukan kredensial production. Container tidak memiliki network atau secret; validate hanya memeriksa schema. Build pertama mengunduh Node/dependency tooling; layer Docker dipakai ulang berikutnya. Default image menampilkan help, tidak otomatis menjalankan migration.

Kirim bagian akhir build/validasi dan PASS atau error. Berikutnya cocokkan source migration dengan rilis main dan terapkan migrate deploy memakai akun migrator. Build Docker belum diuji oleh agen karena daemon lokal tidak tersedia; hasil build VPS masih menunggu pengguna. Verifikasi lokal: Prisma validate dengan config baru lulus tanpa koneksi database.

## Tahap 3A — PR rilis pertama dev ke main

Pengguna menyatakan tahap 2C lancar semua pada 2026-10-04: build tooling dan validasi schema diterima berdasarkan laporan tersebut. Database belum dimigrasikan. Main remote diperiksa masih 39d7795 (dasar dokumentasi), tidak ada PR dev ke main terbuka saat pemeriksaan. Siapkan rilis sebelum migration agar schema dan backend memakai source main yang sama.

Bagian ini dilakukan di browser GitHub, bukan SSH VPS:

1. Buka [perbandingan main dengan dev](https://github.com/annastriw/employee-attendance-system/compare/main...dev).
2. Pastikan base main dan compare dev. Klik Create pull request. Judul: `Release: deployment production pertama`. Deskripsi: `Rilis source aplikasi dan workflow production dari dev. Infra MySQL/AIStor dan tooling migration VPS sudah siap; migration serta deployment backend dilanjutkan manual setelah rilis.`
3. Buat PR dan tunggu pemeriksaan CI. Target CI result success; CI menjalankan unit sekali dan lint/build/typecheck, tanpa Playwright atau integrasi penuh. Jika GitHub meminta persetujuan workflow, izinkan workflow PR milik repository ini berjalan.
4. Kirim URL PR dan hasil CI. Jangan merge pada sub-tahap ini; hasil diperiksa dahulu. Jangan klik Delete branch setelah merge nantinya karena dev dipertahankan.

Tidak perlu perintah VPS pada tahap 3A. Image GHCR baru dibangun setelah merge main; PR sendiri belum deploy/migrate. Proteksi main-production sudah aktif: PR dan CI result wajib, tanpa bypass; detail pada [workflow rilis](../development/ci-cd-workflow.md). Pengguna tetap menjalankan tutorial bertahap; agen tidak membuat atau merge PR pada increment ini.

## Status langkah berikutnya

Bootstrap migration/akun runtime, image rilis main/GHCR, Compose backend, domain/TLS dan frontend dikerjakan setelah inventaris tahap 1. Unit rilis dijalankan sekali pada PR; integrasi cepat bila perlu sebelum rilis. Pengiriman otomatis ke VPS belum aktif. T30/T31 belum dicentang dari pemeriksaan infra saja.
