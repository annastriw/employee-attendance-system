# Fitur dan alur portal

Kedua portal memakai API Gateway dan login sesuai role. Akun HR masuk melalui portal HR; akun karyawan melalui Attendance Portal.

## Portal karyawan

- Login email/password, ganti password sementara, ganti password sendiri dan logout.
- Hari ini menampilkan jadwal/status dan tindakan check-in/checkout.
- Kamera mendeteksi satu wajah, capture lewat kedipan atau manual, preview dan retake. Manual tetap memerlukan satu wajah valid.
- Foto dan lokasi wajib untuk presensi baru. Waktu resmi berasal dari backend; alasan wajib untuk terlambat/pulang awal pada hari kerja.
- Retry mempertahankan idempotency key dan payload saat hasil belum pasti.
- Riwayat sendiri: filter tanggal, pagination, waktu, alasan, lokasi dan foto privat sementara. Data terhapus berlabel dan tidak memperlihatkan foto kepada karyawan.

## Portal HR

| Area | Fitur |
| --- | --- |
| Monitoring | Ringkasan tanggal, check-in, terlambat, pulang awal, belum checkout, tidak ada absensi |
| Detail absensi | Filter/pagination, waktu/alasan, foto privat, dua lokasi dan akurasi pada peta Leaflet |
| Lifecycle absensi | Soft delete satu hari dengan alasan/audit, daftar terhapus, restore data asli |
| Karyawan | Tambah profil+akun, edit profil/email, riwayat, aktif/nonaktif, arsip/restore |
| Password | Password sementara tampil sekali; reset mencabut sesi dan wajib ganti password |
| Departemen/jabatan | Tambah/edit/aktif/nonaktif, tanpa hapus permanen master yang dipakai |
| Kalender libur | Tambah/edit/hapus hari ini/mendatang; tanggal lampau ditolak |
| Akun | Login khusus HR, ganti password, logout |

Restore karyawan menghasilkan INACTIVE dan perlu aktivasi terpisah. Nonaktif/arsip menutup akses login; riwayat tetap tersedia untuk HR. HR tidak mengubah waktu/foto dan tidak absen atas nama karyawan.

## Aturan presensi

Senin–Jumat 08.00–17.00 Asia/Jakarta. Tepat 08.00 masih tepat waktu; sesudahnya terlambat. Checkout sebelum 17.00 membutuhkan alasan, mulai 17.00 sesuai jadwal. Batas checkout 23.59.59 WIB tanggal check-in, tanpa checkout otomatis.

Akhir pekan/libur tidak wajib; presensi diberi label di luar hari kerja tanpa penilaian late/early. Satu pasangan check-in/checkout per karyawan/tanggal tetap berlaku setelah soft delete. Missing dihitung dari eligibility historis, bukan record presensi palsu.

## Mencoba demo

Gunakan akun pada [README](../README.md#live-demo). HR: buka monitoring periode Agustus–September 2026, pilih karyawan dan detail foto/lokasi. Batch awal berisi lima profil fiktif, 195 rekap harian, 390 event dan 390 ilustrasi foto; jumlah aktual dapat berubah melalui akun demo publik.

Karyawan: buka Hari ini, Riwayat dan detail presensi. Untuk presensi baru, izinkan kamera/lokasi pada HTTPS atau localhost. Foto/koordinat yang dikirim pengunjung berasal dari perangkatnya; contoh historis memakai ilustrasi dan koordinat simulasi.

## Batas

Tanpa cuti/izin/sakit, payroll, ekspor Excel, offline attendance, geofence, identifikasi biometrik atau penetapan lembur. Foto memakai otorisasi dan signed URL sementara. [Spesifikasi domain](sdd/README.md).
