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

## Tahap 4A — migration database production

Rilis pertama main 1c27c9062ac04ee4213b19225e8a70e159aca3cc terverifikasi 2026-10-04: PR #1 merged, CI run 37193755926 lulus dan kelima image pada run 37193965079 sukses. Prisma source rilis sama dengan ffe1365 yang divalidasi pengguna. Tahap ini memang mengubah schema attendance_prod; akun runtime dibuat setelah hasil diterima. [Prisma 7 migrate deploy](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production) menerapkan migration tersimpan tanpa reset/shadow/seed.

Jalankan block utuh di SSH VPS. Jika command gagal, berhenti: jangan reset, restore atau resolve sendiri. Jangan kirim isi backup/secret. Folder source baru tidak ditimpa, backup privat diperiksa sebelum migration.

```sh
(
  set -eu
  set -o pipefail
  umask 077
  cd /opt/attendance
  release_commit=1c27c9062ac04ee4213b19225e8a70e159aca3cc
  release_dir=/opt/attendance/releases/source-1c27c90

  [ ! -e "$release_dir" ] || {
    echo 'STOP: folder rilis sudah ada; kirim hasil ini'
    exit 1
  }
  git clone --branch main --single-branch \
    https://github.com/annastriw/employee-attendance-system.git "$release_dir"
  git -C "$release_dir" checkout --detach "$release_commit"
  [ "$(git -C "$release_dir" rev-parse HEAD)" = "$release_commit" ]

  backup_file="/opt/attendance/backups/before-migration-$(date -u +%Y%m%dT%H%M%S%NZ).sql.gz"
  sudo docker exec attendance-prod-mysql-1 sh -c '
    export MYSQL_PWD="$(cat /run/secrets/mysql_root_password)"
    exec mysqldump -uroot --single-transaction --no-tablespaces \
      --set-gtid-purged=OFF attendance_prod
  ' | gzip > "$backup_file"
  gzip -t "$backup_file"
  echo 'PASS: backup sebelum migration tersimpan'

  sudo docker run --rm --memory 512m \
    --network attendance-prod-backend \
    --env-file /opt/attendance/.secrets/migrator.env \
    --mount "type=bind,src=$release_dir/prisma,dst=/tooling/prisma,readonly" \
    --entrypoint sh attendance-migrator:prisma-7.10.0 -c '
      set -eu
      case "$MIGRATOR_PASSWORD" in
        ""|*[!0-9a-f]*) echo "STOP: format password tidak sesuai"; exit 1 ;;
      esac
      [ "${#MIGRATOR_PASSWORD}" -eq 64 ]
      export DATABASE_URL="mysql://attendance_migrator:${MIGRATOR_PASSWORD}@attendance-prod-mysql-1:3306/attendance_prod"
      exec /tooling/node_modules/.bin/prisma migrate deploy \
        --config /tooling/infra/prisma-migrator.config.ts
    '

  sudo docker exec attendance-prod-mysql-1 sh -c '
    export MYSQL_PWD="$(cat /run/secrets/mysql_root_password)"
    exec mysql -uroot attendance_prod --batch -e "
      SELECT COUNT(*) AS jumlah_tabel FROM information_schema.tables
        WHERE table_schema = DATABASE();
      SELECT migration_name, finished_at IS NOT NULL AS selesai
        FROM _prisma_migrations ORDER BY started_at;
    "
  '
  echo 'PASS: migration production selesai'
)
```

Target: all migrations successfully applied, 10 baris migration masing-masing selesai=1, jumlah tabel lebih dari nol. Kirim output migration/SELECT/PASS saja, tanpa password/isi backup. Belum deploy backend, seed admin atau membuat runtime grants. Akun migrator hanya tooling, tidak dipakai backend. Setelah hasil diterima, lanjut 4B akun runtime tiap service.

## Tahap 4B — akun database runtime

Output pengguna tahap 4A diterima: backup PASS, 10 migration selesai=1, 24 tabel. Berikut membuat empat akun runtime dengan grants sama seperti kepemilikan tabel pada setup lokal, hanya untuk attendance_prod. Gateway tidak memakai database. Jangan menjalankan script setup lokal pada production.

### 1. Buat file password privat

```sh
cd /opt/attendance
(
  set -eu
  set -o noclobber
  umask 077
  {
    for service in AUTH EMPLOYEE ATTENDANCE MEDIA; do
      password=$(openssl rand -hex 32)
      printf '%s_DB_PASSWORD=%s\n' "$service" "$password"
    done
  } > .secrets/database-runtime.env
  echo 'PASS: kredensial runtime tersimpan'
)
ls -l .secrets/database-runtime.env
```

Jika file sudah ada/gagal, berhenti; jangan lanjut block berikut atau overwrite. Target mode 600. Jangan kirim isi file.

### 2. Buat akun/grants dan cek akses

```sh
sudo docker exec -i --env-file .secrets/database-runtime.env attendance-prod-mysql-1 sh -s <<'SH'
set -eu
for password in "$AUTH_DB_PASSWORD" "$EMPLOYEE_DB_PASSWORD" "$ATTENDANCE_DB_PASSWORD" "$MEDIA_DB_PASSWORD"; do
  case "$password" in
    ''|*[!0-9a-f]*) echo 'STOP: format password tidak sesuai'; exit 1 ;;
  esac
  [ "${#password}" -eq 64 ]
done
mysql_root() {
  MYSQL_PWD="$(cat /run/secrets/mysql_root_password)" \
    mysql -uroot --batch --skip-column-names "$@"
}
count=$(mysql_root -e "SELECT COUNT(*) FROM mysql.user WHERE User IN ('attendance_auth','attendance_employee','attendance_attendance','attendance_media');")
[ "$count" = 0 ] || { echo 'STOP: akun runtime sudah ada; simpan kredensial dan kirim hasil'; exit 1; }

create_user() {
  printf "CREATE USER '%s'@'%%' IDENTIFIED BY '%s';\n" "$1" "$2"
}
grant_tables() {
  user=$1
  permissions=$2
  shift 2
  for table in "$@"; do
    printf "GRANT %s ON attendance_prod.%s TO '%s'@'%%';\n" "$permissions" "$table" "$user"
  done
}
if ! {
  create_user attendance_auth "$AUTH_DB_PASSWORD"
  create_user attendance_employee "$EMPLOYEE_DB_PASSWORD"
  create_user attendance_attendance "$ATTENDANCE_DB_PASSWORD"
  create_user attendance_media "$MEDIA_DB_PASSWORD"
  grant_tables attendance_auth 'SELECT, INSERT, UPDATE' \
    auth_accounts auth_sessions auth_provisioning auth_email_changes auth_password_resets
  grant_tables attendance_auth 'SELECT, INSERT' auth_audit_logs
  grant_tables attendance_employee 'SELECT, INSERT, UPDATE' \
    emp_departments emp_positions emp_employees emp_provisioning emp_email_changes emp_lifecycle_changes
  grant_tables attendance_employee 'SELECT, INSERT' emp_audit_logs emp_employee_history
  grant_tables attendance_attendance 'SELECT, INSERT, UPDATE' \
    att_work_policies att_daily_records att_events att_idempotency_requests att_outbox
  grant_tables attendance_attendance 'SELECT, INSERT, UPDATE, DELETE' att_holidays
  grant_tables attendance_attendance 'SELECT, INSERT' att_audit_logs
  grant_tables attendance_media 'SELECT, INSERT, UPDATE' media_objects
  grant_tables attendance_media 'SELECT, INSERT' media_audit_logs
} | mysql_root >/dev/null 2>&1; then
  echo 'FAIL: akun/grants belum lengkap; jangan mengganti file password'
  exit 1
fi
echo 'PASS: empat akun dan grants dibuat'

check_login() {
  MYSQL_PWD="$2" mysql --protocol=TCP -h127.0.0.1 -u"$1" attendance_prod \
    --batch -e "SELECT 1 FROM $3 LIMIT 0;" >/dev/null 2>&1
  echo "PASS: login dan baca tabel milik $1"
}
check_login attendance_auth "$AUTH_DB_PASSWORD" auth_accounts
check_login attendance_employee "$EMPLOYEE_DB_PASSWORD" emp_employees
check_login attendance_attendance "$ATTENDANCE_DB_PASSWORD" att_daily_records
check_login attendance_media "$MEDIA_DB_PASSWORD" media_objects
SH
```

Kirim PASS/STOP/FAIL dan permission file saja. Akun runtime tidak mendapat DDL/global privilege/grant option; audit append-only (SELECT/INSERT), DELETE hanya att_holidays sesuai fitur. Jika SQL gagal sebagian, akun mungkin sudah dibuat: simpan file dan rekonsiliasi, jangan ulang CREATE/generate password. Uji ini hanya login/SELECT kosong, bukan suite test atau perubahan data karyawan. Setelah hasil diterima, siapkan environment dan Compose lima backend.

## Tahap 5A — secret aplikasi dan komunikasi internal

Output 4B diterima: empat akun/grants dibuat, masing-masing login/SELECT tabel milik service PASS. Berikut membuat secret aplikasi saja, belum menjalankan backend. AUTH_JWT_SECRET terpisah dari PROVISIONING_CREDENTIAL_KEY dan secret komunikasi service. Attendance INTERNAL_SERVICE_SECRET harus sama dengan Employee/Auth PROVISIONING_SERVICE_SECRET; MEDIA_INTERNAL_SECRET dibagikan Attendance/Media. Key enkripsi tidak boleh diganti sembarangan setelah data provisioning tersimpan.

Jalankan pada SSH VPS:

```sh
cd /opt/attendance
(
  set -eu
  set -o noclobber
  umask 077
  jwt_secret=$(openssl rand -hex 64)
  provisioning_secret=$(openssl rand -hex 32)
  credential_key=$(openssl rand -hex 32)
  media_secret=$(openssl rand -hex 32)
  printf 'AUTH_JWT_SECRET=%s\nPROVISIONING_SERVICE_SECRET=%s\nPROVISIONING_CREDENTIAL_KEY=%s\nINTERNAL_SERVICE_SECRET=%s\nMEDIA_INTERNAL_SECRET=%s\n' \
    "$jwt_secret" "$provisioning_secret" "$credential_key" \
    "$provisioning_secret" "$media_secret" > .secrets/application.env
  echo 'PASS: secret aplikasi tersimpan tanpa ditampilkan'
)
ls -l .secrets/application.env .secrets/database-runtime.env
find .secrets -maxdepth 1 -type f -printf '%f\n' | sort
```

Jika file sudah ada/gagal, berhenti dan kirim error; jangan overwrite atau menampilkan isi file. Target mode 600. Daftar nama file diperlukan untuk memastikan file akun storage yang dibuat sebelumnya tersedia sebelum menyusun env per service. Jangan menggunakan kredensial administrator AIStor untuk Media. Kirim PASS/permission/nama file saja. Berikut 5B konfigurasi environment dan Compose backend, memakai lima image rilis yang sudah tersedia.

## Status langkah berikutnya

Bootstrap migration/akun runtime, image rilis main/GHCR, Compose backend, domain/TLS dan frontend dikerjakan setelah inventaris tahap 1. Unit rilis dijalankan sekali pada PR; integrasi cepat bila perlu sebelum rilis. Pengiriman otomatis ke VPS belum aktif. T30/T31 belum dicentang dari pemeriksaan infra saja.
