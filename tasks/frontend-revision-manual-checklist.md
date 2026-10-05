# Checklist manual revisi T12–T21

Status seluruh checkbox: belum diuji pengguna. Setelah implementasi lokal selesai,
pengguna meminta commit/push dev. PR main/deploy dikerjakan pengguna; jangan menilai
production lama sebagai hasil revisi ini.

## Sebelum pemeriksaan

- [ ] Saat RAM cukup, jalankan build HR dan Karyawan secara serial; kemudian dev
  server sesuai [workflow testing](../docs/testing/workflow.md). Jangan menjalankan
  server kedua pada port yang sudah dipakai. Build fase ini ditunda pada RAM 2,61 GiB.
- [ ] Untuk production setelah pengguna push/PR/deploy: pastikan kedua frontend
  memakai SHA revisi dan Attendance Service/Gateway sudah rilis bersama. Endpoint
  `GET /api/v1/attendance` harus menerima departmentId/positionId; tanpa migration.

## Matriks layar dan tema

Ulangi setiap kelompok berikut pada 320, 768, 1024 dan 1440px, terang serta gelap.
Pakai DevTools device toolbar untuk ukuran viewport; jangan memakai zoom browser
untuk mensimulasikan ukuran. Konten boleh scroll vertikal dalam workspace.

- [ ] Login kedua portal: hover Email/Password, klik untuk fokus, Tab antar field,
  toggle password, validasi error. Satu ring di batas kontrol; suffix tidak bergeser.
- [ ] Sidebar desktop: brand ke Ringkasan/Hari ini; collapse/expand dan shortcut `[`,
  refresh mempertahankan rail; label/title aktif sesuai halaman, terutama Absensi
  dihapus. Sidebar tidak menutupi konten.
- [ ] Sidebar tablet/mobile: menu membuka drawer; Escape/tombol tutup bekerja;
  memilih halaman menutup drawer dan mengembalikan fokus. Pindah ukuran layar
  tidak menyisakan overlay. Brand header mobile dapat diklik.
- [ ] Ringkasan: metrik/angka terbaca, chart tidak tumpang tindih/keluar batas,
  sumbu/legend/tooltip tertata, range dan preset kalender bekerja. Klik metrik,
  cari nama/NIK, kategori, reset; klik baris dan Enter/Space membuka detail.
- [ ] Absensi/terhapus: buka Filter, pilih periode/departemen/jabatan; chip tampil
  sesuai pilihan, hapus satu chip dan reset. Data/count/pagination sesuai filter.
  Network menunjukkan parameter kategori dan respons 200; bukan filter hanya
  halaman hasil frontend. Snapshot historis tetap sesuai saat presensi.
- [ ] Seluruh tabel HR: kompak di desktop/tablet, kartu berlabel di mobile, nama/
  waktu/status/aksi terbaca tanpa scroll horizontal. Aksi anak tidak memicu aksi
  baris kedua. Badge/tab/button proporsional, reset sejajar, empty/error jelas.
- [ ] Detail Absensi: full width area konten, bukti check-in/checkout tersusun;
  foto/peta/alasan dapat dibaca. Breadcrumb/Back kembali ke filter/page semula.
  Delete/restore hanya dicoba pada data demo yang memang boleh diubah.
- [ ] Karyawan: tambah, detail/ubah full width; breadcrumb menunjukkan konteks.
  Field/pilihan/status rapi. Validasi tidak mengirim data invalid; setelah simpan
  daftar/detail kembali benar. Gunakan data demo untuk aksi lifecycle/password.
- [ ] Master Departemen/Jabatan/Hari Libur: header, tambah, search/status/periode,
  reset, tabel/cards/pager dan dialog rapi. Kalender/preset di dalam panel filter.
- [ ] Karyawan Hari ini/Riwayat/Profil: sidebar/header/kontrol seragam HR; beranda
  dua kolom bila cukup ruang; riwayat filter, detail bukti dan Back bekerja;
  profil/Keamanan/ganti password/logout bekerja.
- [ ] Kamera Karyawan: fullscreen, izin kamera/lokasi, deteksi/fallback/alasan,
  check-in/out dan kembali workspace bekerja; tidak ada pengiriman ganda.
- [ ] Keyboard dan D11: Tab/fokus terlihat, tidak terpotong; Ctrl +/−/0,
  Ctrl+scroll, pinch/double-tap tidak mengubah zoom app; zoom kanvas peta bekerja.

## Jika ada error runtime

1. DevTools → Network → aktifkan Preserve log, ulangi satu tindakan bermasalah.
2. Kirim URL + method + status request merah, tab Response, dan pesan Console
   pertama beserta stack/file/line. Jangan mengirim Cookie/Authorization/token.
3. Untuk masalah tampilan: sertakan role, halaman, viewport, tema, state tepat
   (hover/focus/active/open) dan screenshot bagian bermasalah.
