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

## Status langkah berikutnya

Bootstrap migration/akun runtime, image rilis main/GHCR, Compose backend, domain/TLS dan frontend dikerjakan setelah inventaris tahap 1. Unit rilis dijalankan sekali pada PR; integrasi cepat bila perlu sebelum rilis. Pengiriman otomatis ke VPS belum aktif. T30/T31 belum dicentang dari pemeriksaan infra saja.
