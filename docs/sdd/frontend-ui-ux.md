# SDD — Layar, alur dan states

## Attendance Portal

Login → ganti password awal jika wajib → Hari ini. Hari ini menampilkan jadwal/status serta check-in atau checkout sesuai kondisi. Capture membuka kamera/lokasi → validasi satu wajah → blink/manual → preview/retake → alasan late/early jika diminta → submit → hasil resmi.

Riwayat memiliki filter periode dan pagination; detail menjaga konteks kembali, waktu/alasan/lokasi, serta tombol foto sementara. Record terhapus berlabel dan tanpa foto. Menu akun menyediakan ganti password/logout.

## HR Portal

Login → ganti password awal jika wajib → dashboard/monitoring. Daftar dapat difilter per tanggal/karyawan/departemen/status dan membuka detail presensi dengan foto serta peta. Delete meminta alasan dan konfirmasi satu hari; halaman terhapus menyediakan restore.

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
