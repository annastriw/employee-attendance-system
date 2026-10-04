# Spesifikasi per domain

SDD mencakup [analisis kebutuhan](../requirements/analysis.md), [PRD](../requirements/prd.md), desain, kontrak domain, implementasi, verifikasi hingga auto-deployment. Mulai dari [siklus SDD lengkap](lifecycle.md). Spesifikasi domain menyimpan scope, invariant, state, integrasi dan titik verifikasi tanpa menyalin log sesi atau mengarang hasil.

| Spesifikasi | Isi |
| --- | --- |
| [Auth dan sesi](auth.md) | Login HR/karyawan, refresh, revokasi, password |
| [Employee dan master](employee.md) | Profil, departemen/jabatan, provisioning, lifecycle |
| [Attendance](attendance.md) | Jadwal, kalender, capture, check-in/out, riwayat, monitoring |
| [Media](media.md) | Foto privat, validasi, binding, signed URL |
| [Pemulihan](recovery.md) | Idempotensi, outbox, retry/kompensasi, orphan cleanup |
| [Design system](frontend-design-system.md) | Token, komponen bersama dan aksesibilitas |
| [Layar dan states](frontend-ui-ux.md) | Alur serta state kedua portal |

Aturan umum: [baseline](../requirements/baseline.md). Struktur data: [ERD](../database.md). Metode/path: [API](../api.md). Siklus SDD/Kanban: [development](../development.md).

Perubahan kontrak memperbarui spesifikasi bersama source/test pada increment yang sama. Konsolidasi ini ditinjau pada perapian 2026-10-04; tanggal keputusan lama tetap pada ADR. Hasil tes hanya dicatat bila ada bukti pelaksanaannya.
