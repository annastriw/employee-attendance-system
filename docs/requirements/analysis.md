# Analisis kebutuhan

Ringkasan kebutuhan yang disetujui dan implementasi saat ini, disusun pada 2026-10-05 untuk melengkapi keterlacakan SDD. Dokumen ini tidak dibuat seolah sudah ada sebelum development. Aturan rinci tetap pada [baseline](baseline.md).

## Masalah dan pengguna

Karyawan perlu mencatat kehadiran dengan waktu resmi, foto dan lokasi, lalu melihat riwayat sendiri. HR perlu mengelola profil/akun, kalender libur dan memantau kehadiran tanpa mengganti bukti presensi karyawan.

| Pengguna | Kebutuhan | Batas kewenangan |
| --- | --- | --- |
| Karyawan | Login, ganti password, check-in/out, riwayat dan foto sendiri | Tidak mengelola karyawan lain atau mengubah waktu presensi |
| HR | Kelola master/profil/akun, libur, monitoring, detail, hapus/restore dengan alasan | Tidak melakukan presensi atas nama karyawan atau mengedit bukti event |
| Pengembang/pengelola | Setup lokal yang dapat diulang, perubahan terverifikasi, rilis otomatis | Secret infra privat; satu jalur dev → main |

## Kebutuhan utama

- Akun HR/karyawan terpisah, password sementara wajib diganti, reset/nonaktif/arsip mencabut sesi.
- Profil, departemen/jabatan dan lifecycle karyawan menjaga riwayat.
- Waktu presensi ditentukan backend; jadwal/libur menentukan kewajiban dan status keterlambatan/pulang awal.
- Foto/lokasi wajib, foto privat, retry tidak menciptakan presensi ganda.
- Monitoring/riwayat dapat dicari dan difilter; detail memuat kedua event beserta bukti.
- Soft delete dengan alasan/audit dan restore mengikuti aturan konflik.

## Kendala dan batas scope

Satu monorepo, dua portal React, lima service NestJS, MySQL dengan kepemilikan tabel per service, AIStor Free. Frontend di Vercel; backend/database/storage di VPS Ubuntu dengan Nginx/Cloudflare. Dev hanya lokal, main untuk live. Lingkungan yang disepakati kecil: lima karyawan dan satu HR; resource idle bukan bukti kapasitas beban.

Development serial dengan satu increment aktif. Unit logika berubah wajib; integrasi cepat bila sambungan DB/storage/auth/antarservice perlu dibuktikan; UI manual pengguna. [Workflow testing](../testing/workflow.md).

Di luar scope: cuti/izin/sakit, payroll/lembur, offline attendance, ekspor Excel, geofence, pencocokan identitas biometrik dan tambah admin lewat UI. Restore drill, load test dan hardening tambahan ditunda pengguna, bukan dianggap selesai.

## Menjadi keputusan produk

[PRD](prd.md) menetapkan tujuan, scope dan acceptance. [Baseline](baseline.md) memuat aturan disetujui; [SDD](../sdd/README.md) menetapkan kontrak implementasi. Kebutuhan berubah → perbarui keputusan/dokumen terkait sebelum memperluas implementasi.
