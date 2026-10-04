# Keamanan dan audit repository

## Batas publik/privat

Akun HR dan karyawan pada README merupakan akun demo yang sengaja dipublikasikan atas instruksi pemilik. Password demo tidak dipakai sebagai JWT secret, password DB/storage atau kunci SSH. Foto historis/identitas seed fiktif. Pemakai yang mengirim presensi baru memasukkan foto/lokasi perangkatnya sendiri.

Environment aktif, lisensi, token, SSH private key, backup DB dan data storage tidak masuk Git. `.gitignore` mengecualikan `.env.*` selain example, `.secrets/`, `.licenses/`, `.local/`, backup, upload, dependency dan hasil build. `VITE_` hanya konfigurasi publik.

## Perlindungan aplikasi

- JWT akses berumur pendek, sesi diperiksa server dan dapat dicabut; refresh cookie HttpOnly/Secure pada production.
- Password bcrypt; password sementara wajib diganti; reset/nonaktif/arsip mencabut sesi.
- Origin CORS eksplisit; role/resource ownership diperiksa pada backend.
- Runtime MySQL memakai user per service dengan grant minimum; audit append-only pada level grant.
- Bucket foto privat; akun Media tidak memakai akun admin; URL foto sementara hanya setelah otorisasi.
- Backend/DB/Console bind loopback VPS. Akses publik melalui Nginx HTTPS.
- GitHub deployment memakai key forced-command dan sudo terbatas; known host diperiksa. Repository public tidak memakai VPS sebagai runner umum.

## Audit perapian 2026-10-04

Pemeriksaan sebelum cleanup mencakup 1.196 blob unik yang reachable dari dev/origin-dev/origin-main, nama file sensitif yang tracked, pola private key/token GitHub/AWS/Slack, dan pencocokan nilai dengan secret lokal aktif dari file ignored. Tidak ditemukan match pada pemeriksaan ini. Secret tidak dicetak dalam laporan.

Batas: regex tidak menjamin semua format token atau secret lama yang sudah diganti terdeteksi. GitHub Environment secrets, isi VPS, dan percakapan di luar Git tidak termasuk audit blob. Audit dependency/security sebelumnya bukan jaminan keadaan dependency saat ini. Jika ada secret aktif yang terungkap, rotasi di penerbitnya diperlukan; menghapus history saja tidak membatalkan credential.

Kredensial storage demo lama pernah ditempelkan dalam percakapan setup. Infrastruktur demo lama kemudian dihapus/reset menurut output pengguna. Jika nilainya dipakai ulang di lingkungan lain, credential tersebut perlu diganti; nilainya tidak disalin ke dokumentasi ini.
