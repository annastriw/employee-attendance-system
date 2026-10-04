# ADR-001: MinIO AIStor Free untuk object storage
Tanggal: 2026-10-01 (Asia/Jakarta)
Status: disetujui pengguna.

## Konteks
Foto check-in dan checkout membutuhkan bucket privat, API S3, akses sementara, dan storage persisten. Deployment awal menggunakan satu VPS Ubuntu. MinIO Community telah diarsipkan dan tidak dipelihara; pilihan diganti menjadi MinIO AIStor Free.

## Keputusan
- MinIO AIStor Free single-node dijalankan melalui Docker Compose pada development lokal dan VPS.
- Lokal Windows menggunakan Docker Desktop dengan backend WSL 2. Instalasi belum dilakukan.
- Gunakan image resmi quay.io/minio/aistor/minio dengan release tag/digest yang diverifikasi dan dikunci saat implementasi; tidak menggunakan latest sebagai pin deployment.
- Port lokal yang direncanakan: API S3 9000 dan Console 9001. Bind ke localhost; akses dari perangkat lain membutuhkan konfigurasi development terpisah.
- Gunakan volume persisten; volume production dan lingkungan uji rilis dipisahkan dari development. Pada lokal dengan resource terbatas (T19, 2026-10-02), dev/test sementara memakai satu instance/volume dengan bucket dan akun berbeda. Test dikunci ke loopback/bucket test dan hanya membersihkan fixture sendiri; volume uji rilis terpisah tetap gate sebelum production.
- License Free aktif diperlukan. Pengguna memperoleh lisensi melalui penyedia; simpan sebagai berkas lokal, mount ke container, jangan masukkan GitHub.
- Bucket foto privat; Media Service menggunakan kredensial aplikasi dengan akses minimum. Root credential tidak dipakai untuk operasi aplikasi.
- Signed URL dibuat saat diminta setelah pemeriksaan hak akses, tidak disimpan di database.
- Subdomain storage tetap attendance-storage.annastriwidagdo.me. Console administrasi tidak dipublikasikan sebagai endpoint aplikasi.
- HTTPS dan reverse proxy disiapkan pada VPS. Kredensial, lisensi, dan data volume tetap lokal.
- Rancangan tabel media_objects dan kontrak API foto tetap kompatibel melalui S3.

## Konsekuensi
Free menggunakan lisensi proprietary dan mode single-node, tanpa distributed/HA atau support/SLA.
Replication dan encryption at rest bawaan AIStor tidak termasuk Free. Backup di luar service dan uji restore direncanakan; bila perlu enkripsi disk/backup dibahas tersendiri.
Pantau validitas dan batas kapasitas lisensi yang diterbitkan; jangan menganggap semua lisensi tanpa batas.
Deployment live membutuhkan lisensi valid, image terverifikasi, kapasitas VPS dan akses layanan. Semua ini belum tersedia/diterapkan oleh perubahan dokumentasi ini.

## Verifikasi implementasi
- Server dapat startup menggunakan lisensi valid.
- Healthcheck dan upload/read S3 berhasil.
- Restart container mempertahankan foto.
- Bucket menolak akses anonim; akun aplikasi tidak memiliki hak administratif.
- Akses foto lintas karyawan ditolak oleh aplikasi.
- Backup dapat dipulihkan ke lingkungan test.
- git check-ignore memverifikasi license dan direktori data lokal dikecualikan.

## Sumber resmi
- https://github.com/minio/minio
- https://docs.min.io/aistor/installation/container/install/
- https://docs.min.io/aistor/operations/licenses/
- https://www.min.io/legal/aistor-free-agreement
