# SDD — Layar, alur dan states

## Attendance Portal

Login -> ganti password awal jika wajib -> Hari ini. Kedua role memakai WorkspaceShell yang sama: sidebar/rail desktop dan drawer tablet/mobile, brand menuju beranda, theme/menu akun seragam. Beranda mempertahankan dua kolom bila ruang cukup. Semua halaman memenuhi lebar konten dan memakai PageHeader/breadcrumb. Capture kamera tetap fullscreen dengan CTA di area bawah. Riwayat memakai filter periode grouped/chip/reset, grid kartu responsif, serta detail dua kolom bukti bila cukup ruang. Detail menjaga query ketika kembali; record terhapus berlabel dan tanpa foto. Profil read-only dan ganti password memakai pola HR.

Riwayat memiliki DateRangeField dengan preset periode dan pagination; detail menjaga konteks kembali, waktu/alasan/lokasi, serta tombol foto sementara. Record terhapus berlabel dan tanpa foto. Menu akun menyediakan profil read-only, ganti password, dan logout.

## HR Portal

Login → ganti password awal jika wajib → dashboard/monitoring. Desktop memakai sidebar yang dapat diringkas menjadi rail ikon; tablet/mobile memakai drawer. Ringkasan menampilkan metrik, tren kehadiran harian dengan rentang tanggal, dan komposisi hadir/terlambat/belum hadir pada tanggal terpilih. Direktori karyawan difilter departemen/jabatan/status dengan pencarian nama/NIK; Absensi difilter periode/departemen/jabatan snapshot historis, dengan konteks employeeId dari detail karyawan; pada layar kecil baris tabel tampil sebagai kartu berlabel dan tetap membuka detail presensi.

Detail presensi berisi foto serta peta. Delete meminta alasan dan konfirmasi satu hari; halaman terhapus menyediakan restore. Menu akun menyediakan profil read-only dan ganti password.

Direktori karyawan: list → create atau detail → edit profil/email, lifecycle, history, reset password. Create/reset menampilkan password sementara sekali; halaman pending operation menyediakan status/retry sesuai kontrak. Departemen/jabatan memakai pola list/form/detail/status seragam; kalender memvalidasi tanggal yang dapat diubah.

## States bersama

| State | Perilaku |
| --- | --- |
| Loading | Busy yang jelas, aksi duplicate dicegah |
| Empty | Keterangan sesuai filter/data dan tindakan yang memang tersedia |
| Validation | Pesan field/aturan bisnis tanpa kehilangan input relevan |
| Unauthorized | Login ulang; sesi expired/revoked tidak disembunyikan |
| Forbidden | Tidak menawarkan aksi di luar role/ownership |
| Conflict | Muat data terbaru sebelum konfirmasi ulang |
| Network/uncertain | Jangan menyatakan gagal jika hasil belum pasti; pertahankan intent dan cek status |
| Photo expired | Sembunyikan foto; pengguna dapat meminta akses baru |

Filter/history context dipertahankan saat kembali bila didukung halaman. URL privat/token tidak masuk log/storage browser. Manual acceptance hanya dicentang setelah pengguna menyatakan oke untuk scope terkait. [Design](frontend-design-system.md), [API](../api.md), [Attendance](attendance.md).

## Rentang tanggal dan grafik

Filter daftar memakai DateRangePicker bersama dengan preset Hari ini, 7 hari, 30 hari,
dan Bulan ini; pencarian teks berjalan setelah debounce 300 ms. Monitoring Ringkasan
memilih tanggal untuk metrik harian dan memakai rentang terpisah untuk grafik tren.
Jika endpoint tren belum tersedia, tampilkan status rilis backend dan sediakan aksi
muat ulang, bukan grafik kosong yang tampak berhasil.

## Profil dan ukuran layar

Profil karyawan menampilkan data diri read-only; admin HR tanpa employeeId melihat
email dan role. Kedua role dapat mengganti password dan diminta login ulang sesudah
sukses. Workspace responsif memakai navigasi desktop pada lebar cukup dan navigasi
sentuh pada layar kecil. Semua portal tetap mengikuti viewport fixed dan skala kompak
D11/D12; verifikasi visual manual mencakup desktop, tablet, mobile, serta tema terang
dan gelap.
