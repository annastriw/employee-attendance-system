# Keamanan dan audit repository

## Batas publik/privat

README mengarahkan pengguna ke akun lokal hasil setup. Password HR awal dibuat acak dalam `.env.auth`; akun karyawan dibuat melalui portal HR. Server demo terdahulu sudah berakhir. Akun demo yang pernah sengaja dipublikasikan pemilik merupakan bukti historis, bukan kredensial instalasi lokal. Foto/identitas seed historis fiktif; presensi baru memakai foto/lokasi perangkat pengguna sendiri.

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

Pemeriksaan sesudah kurasi pada 2026-10-05 mencakup 898 blob reachable dengan aturan yang sama; tidak ditemukan match atau path sensitif tracked. Bundle/mapping pemulihan tetap privat dan ignored.

Batas: regex tidak menjamin semua format token atau secret lama yang sudah diganti terdeteksi. GitHub Environment secrets, isi VPS, dan percakapan di luar Git tidak termasuk audit blob. Audit dependency/security sebelumnya bukan jaminan keadaan dependency saat ini. Jika ada secret aktif yang terungkap, rotasi di penerbitnya diperlukan; menghapus history saja tidak membatalkan credential.

Kredensial storage demo lama pernah ditempelkan dalam percakapan setup. Infrastruktur demo lama kemudian dihapus/reset menurut output pengguna. Jika nilainya dipakai ulang di lingkungan lain, credential tersebut perlu diganti; nilainya tidak disalin ke dokumentasi ini.
