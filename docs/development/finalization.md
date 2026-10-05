# Finalisasi produk dan repository — 2026-10-05

Pengguna menyatakan backend dan frontend final, menerima revisi terakhir kedua portal,
serta mengizinkan push dev, PR/merge main dan pemantauan CI/CD hingga hijau.
Penerimaan ini berdasarkan konfirmasi pengguna; bukan klaim agen menjalankan ulang
seluruh matriks visual, kamera, lokasi atau integrasi produksi.

## Hasil frontend

- Dua portal memakai WorkspaceShell/SidebarShell bersama dari packages/ui. Desktop
  memakai sidebar 248px atau rail 64px; tablet/mobile <1024px memakai drawer dari kiri,
  setinggi viewport. Tombol buka/tutup berada di kiri, lalu brand; header konten desktop
  terpisah. Menu dapat scroll, tema/akun tetap dapat dijangkau.
- HR memakai routing path, breadcrumb, tabs detail, daftar HeroUI dan kartu mobile;
  form/detail memenuhi lebar konten. Ringkasan memiliki metrik dan grafik tren responsif.
- Search/filter/preset kalender, chips dan reset memakai kontrol bersama. Kalender
  menampilkan satu bulan utuh. Filter kategori diproses backend sebelum count/pagination.
- Profil read-only dan ganti password tersedia pada kedua role. Keluar hanya melalui
  menu akun, termasuk saat password awal wajib diganti. Tema Terang/Gelap/Sistem
  tersimpan per portal; nama/email terlihat pada sidebar terbuka.
- Motion ringan menghormati reduced motion. Capture tetap fullscreen dengan foto,
  kedipan/manual fallback dan lokasi; aturan presensi/ownership/idempotensi tetap.
- Revisi S02 menggantikan posisi brand S01. Global Ctrl+K dihapus dari shell.
  Source/test command palette lama tetap disimpan sebagai bukti regresi historis,
  tidak dipasang pada UI produk.

## Matriks filter yang dipertahankan

| Layar | Filter/query yang diperiksa | Kontrak final |
| --- | --- | --- |
| HR Ringkasan | Tanggal, departemen, status hadir, nama/NIK, page; rentang grafik terpisah | service menyaring sebelum pagination, query Gateway monitoring mengizinkan departemen |
| HR Karyawan | Nama/NIK, ACTIVE/INACTIVE, departemen, jabatan, page | DTO/query Employee sudah menyaring kedua kategori |
| HR Absensi aktif/dihapus | Rentang/preset, departemen, jabatan, employeeId konteks, page | Filter snapshot historis sebelum pagination/count; regresi kombinasi/reset tersedia |
| HR Departemen/Jabatan | Nama/kode, ACTIVE/INACTIVE, page | Whitelist Gateway sesuai kontrak; regresi search/tab/reset tersedia |
| HR Hari libur | Search, rentang/preset, legacy tahun/bulan, page | Whitelist Gateway mencakup seluruh query; regresi reset/legacy tersedia |
| Karyawan Riwayat | Rentang/preset, page, kembali dari detail | Query source memuat rentang; regresi reset/page tersedia; isolasi akun tetap |

Tidak menambah filter HR ke role karyawan yang tidak punya kewenangan tersebut.
Keseragaman berlaku bahasa visual, shell, kontrol, kalender, detail dan state.

## Perbaikan validasi dan konsistensi

Monitoring menerima UUID data sah; Gateway meneruskan departmentId/positionId hanya
pada direktori karyawan. UUID malformed, unknown/duplicate query dan akses lintas
role tetap ditolak. Idempotency-Key tetap UUID v4; generator/data tersimpan tidak diubah.
Tidak ada migration pada revisi ini.

| ID | Temuan | Perbaikan |
| --- | --- | --- |
| D13 | Keluar tersebar pada profil/form dan command palette | Satu menuitem Keluar di popup akun; tersedia saat password wajib diganti |
| D14 | Pipe Departemen/Jabatan membatasi path ID v4 | Terima UUID data sah untuk detail/ubah/aktif/nonaktif; malformed tetap ditolak |
| D15 | DTO reset password internal membatasi employeeId/actorAccountId v4 | Selaraskan dengan DTO provisioning/lifecycle tanpa versi khusus |
| D16 | Bind foto dan check-in/out membatasi event/account/photo/daily ID v4 | Terima UUID sah tanpa mengubah ownership, idempotensi atau transaksi |
| D17 | Beranda/status karyawan menolak record/event seed v5; riwayat hanya v4/v5 | Validasi ID data v1-v8 dengan variant sah pada kedua client |
| D18 | Filter monitoring dan detail riwayat membandingkan UUID case-sensitive | UUID dengan huruf kapital tetap cocok; record berbeda tetap ditolak |
| D19 | Respons beranda/record menerima tanggal berbentuk YYYY-MM-DD yang mustahil | Validasi tanggal melalui round-trip UTC, tolak 30 Februari/bulan 13 |
| D20 | Fixture storage Media tidak memenuhi MediaConfig | Tambahkan workerEnabled:false; typecheck dan unit deadline lulus |

## Bukti verifikasi historis

Angka berikut adalah checkpoint berbeda yang dapat saling tumpang tindih, bukan total
unik dan bukan klaim semua suite baru dijalankan saat finalisasi.

| Checkpoint | Bukti lokal |
| --- | --- |
| Routing/primitives/detail/list HR | Build/typecheck/lint; 79 lalu 86 unit sesuai increment |
| Revisi T12–T21 | 99 unit terdampak; lint/typecheck HR/Karyawan/Attendance/Gateway; build ditunda saat RAM terbatas |
| Fase D T22–T28 | 135 unit terfokus; lint/typecheck paket terkait, build kedua portal |
| Tambahan logout/UUID T29–T31 | 109 unit terfokus, sebagian overlap checkpoint sebelumnya; lint/typecheck/backend dan build portal |
| S01 sidebar/motion | 23 unit terfokus, lint terkait dan build/typecheck kedua portal |
| S02 tombol kiri/drawer/sidebar | HR App 5 + Karyawan App 11 unit; lint dan build/typecheck kedua portal |

CI sebelumnya menemukan race effect data-loading pada App Karyawan dan race fokus
nested overlay filter HR. Test menunggu hasil/request dan dismiss accessible overlay
asli; tidak memakai skip, timeout tambahan atau mock overlay untuk menyembunyikan error.
[CI fase D berhasil](https://github.com/annastriw/employee-attendance-system/actions/runs/37277057100)
dan [workflow production rilis fase D berhasil](https://github.com/annastriw/employee-attendance-system/actions/runs/37277367426).

Bukti awal production: dua portal diterima pengguna; Gateway health release f581f31
cocok SHA rilis saat itu; seed demo awal memiliki 5 profil, 195 rekap dan 390 event/foto.
Permission storage privat/health pernah diterima dari output pengguna. Bukti tersebut
historis; tidak menjadi klaim pengujian runtime baru.

## Perapian dan riwayat

Rencana sprint, audit dan checklist revisi yang berulang digabung ke dokumen ini;
plan/todo/progress hanya menyimpan status final dan titik lanjut. Spesifikasi domain,
ADR, API, ERD, panduan setup/testing/deployment, migration dan tests tetap disimpan.
Folder docs/temporary tidak dibuat ulang. Berkas lokal ignored, lisensi dan data pribadi
bukan bagian penghapusan repository.

Pengguna mengizinkan pengecualian rewrite baru pada finalisasi ini. Backup Git, mapping
SHA/tanggal dan snapshot proteksi disimpan privat di `.local/repository-cleanup/`.
Milestone fitur awal dipertahankan; commit percobaan/perbaikan berulang disatukan ke
snapshot milestone dengan tanggal author/committer sumber. Main sebelum rilis tetap
memiliki tree source production yang sama. Perubahan final dirilis lewat PR dev → main
setelah CI; ruleset asli harus aktif kembali setelah kurasi. Workflow harian kembali
normal tanpa force push.

## Batas dan operasional

Restore drill, backup terjadwal, uji beban dan hardening tambahan tetap ditunda pengguna.
Tidak menjalankan ulang suite DB/storage/browser atau mengubah data production hanya
untuk finalisasi. Warning bundle frontend >500 kB historis masih ada; build sebelumnya
berhasil. Status CI/CD dan sinkronisasi final dicatat di [progress](../../tasks/progress.md).
Acuan pengujian berikutnya: [workflow testing](../testing/workflow.md).
