# PRD — Employee Attendance System

Status: ringkasan produk disetujui, diselaraskan dengan baseline/source pada 2026-10-05. Tidak mengganti aturan rinci [baseline](baseline.md) atau membuat tanggal/bukti acceptance baru.

## Tujuan produk

Presensi mandiri yang dapat ditelusuri dan pengelolaan kehadiran melalui dua portal dengan kewenangan berbeda. Perubahan melalui dev lokal → PR main → auto-deployment, tanpa deployment SSH manual untuk setiap perubahan biasa.

## Scope dan acceptance utama

| Area | Hasil yang dibutuhkan | Acceptance utama | Rancangan |
| --- | --- | --- | --- |
| Akun | HR/karyawan masuk ke portal masing-masing | Role/status divalidasi; password sementara wajib diganti; reset mencabut sesi | [Auth](../sdd/auth.md) |
| Master/karyawan | HR mengelola profil, departemen/jabatan dan akun | Provisioning dapat dipulihkan; lifecycle menjaga riwayat; restore kembali nonaktif | [Employee](../sdd/employee.md) |
| Presensi | Check-in/out dengan bukti | Satu pasangan per tanggal; foto/lokasi wajib; waktu server; alasan terlambat/pulang awal | [Attendance](../sdd/attendance.md) |
| Kalender/monitoring | HR menilai kehadiran sesuai jadwal/libur | Filter/detail konsisten; bukti kedua event tersedia; snapshot historis tetap | [Attendance](../sdd/attendance.md) |
| Media | Foto dibaca pengguna yang berhak | Bucket privat; validasi upload; URL sementara; binding event | [Media](../sdd/media.md) |
| Pemulihan | Operasi tidak meninggalkan data tidak konsisten | Soft delete/restore dengan alasan/audit; retry idempotent; recovery lintas service | [Recovery](../sdd/recovery.md) |
| Antarmuka | Kedua portal seragam dan responsif | State loading/empty/error/permission jelas; komponen bersama; acceptance manual | [UI/UX](../sdd/frontend-ui-ux.md) |
| Delivery | Main memperbarui live otomatis | CI head PR hijau; Vercel frontend; image backend SHA tepat; migration baru bila ada; health | [Deployment](../deployment.md) |

## Kualitas dan prioritas

Otorisasi role/resource ditegakkan backend. Password di-hash, sesi dapat dicabut, secret tidak masuk Git, foto privat. Kepemilikan data dijaga dengan grants/API internal; transaksi/retry mengikuti kontrak domain. Source/spec/migration dan bukti verifikasi berubah bersama pada satu increment. [Testing terfokus](../testing/workflow.md) tanpa suite browser otomatis rutin.

Prioritas: foundation/akun → master/provisioning → presensi/media → riwayat/monitoring → pemulihan → delivery. Urutan aktual pada [plan](../../tasks/plan.md), status/bukti pada [todo](../../tasks/todo.md).

Keberhasilan diperiksa melalui acceptance di tabel, UI manual, test yang benar-benar dijalankan dan bukti rilis. Tidak menetapkan SLA, throughput atau persentase keberhasilan yang belum diukur. [Fitur](../features.md), [analisis/batas scope](analysis.md).

## Perubahan kebutuhan

Perbarui PRD/baseline dan SDD terdampak, lalu pecah menjadi satu increment Kanban. Perubahan kecil cukup memperbarui bagian relevan; tidak perlu dokumen per berkas. [Siklus lengkap](../sdd/lifecycle.md).
