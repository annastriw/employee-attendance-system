# Milestone pengembangan

History dikurasi berdasarkan snapshot fitur yang benar-benar ada. Tanggal author/committer setiap milestone dipertahankan dari commit endpoint sumber; kelompok commit digabung tanpa mengubah source snapshot. Dokumentasi cleanup ditulis pada tanggal pengerjaan aktual, tidak dibuat seolah sudah ada lebih awal.

Mapping SHA lama/baru dan backup lengkap disimpan privat di `.local/repository-cleanup/`; tidak memuat branch arsip tambahan pada GitHub. SHA berubah karena parent/message berubah. Rilis backend live yang sudah berjalan dapat tetap menyebut SHA sebelum kurasi sampai rilis backend berikutnya.

| Tanggal/waktu sumber | Milestone |
| --- | --- |
| 2026-10-01T15:59:41+07:00 | define attendance requirements and architecture |
| 2026-10-01T19:06:06+07:00 | establish workspace services and MySQL foundation |
| 2026-10-01T20:10:25+07:00 | add role-based authentication and HR sign-in |
| 2026-10-02T00:08:47+07:00 | establish shared portal design system |
| 2026-10-02T02:06:22+07:00 | manage departments and positions across API and HR portal |
| 2026-10-02T12:34:56+07:00 | provision employee profiles and accounts with recovery |
| 2026-10-02T13:19:30+07:00 | complete employee sign-in and initial password change |
| 2026-10-02T15:34:33+07:00 | manage employee profiles email and account lifecycle |
| 2026-10-02T16:50:24+07:00 | reset employee passwords and revoke sessions |
| 2026-10-02T17:05:44+07:00 | evaluate work schedules and historical eligibility |
| 2026-10-02T18:03:39+07:00 | manage the holiday calendar |
| 2026-10-02T20:25:45+07:00 | capture photos and locations with private storage |
| 2026-10-02T23:15:25+07:00 | record check-in with private evidence and idempotency |
| 2026-10-03T00:05:14+07:00 | record checkout with schedule and cutoff validation |
| 2026-10-03T01:33:54+07:00 | add attendance history soft delete and restore |
| 2026-10-03T02:42:14+07:00 | monitor attendance with summaries maps and private photos |
| 2026-10-03T03:07:16+07:00 | recover durable operations and clean orphan photos |
| 2026-10-03T03:40:25+07:00 | improve responsive layouts accessibility and UI states |
| 2026-10-03T03:56:52+07:00 | add integration tooling and continuous integration |
| 2026-10-03T23:51:17+07:00 | streamline dev to main releases and focused testing |
| 2026-10-04T17:54:43+07:00 | prepare production images migrations and HTTPS deployment |
| 2026-10-04T20:38:32+07:00 | seed historical demo attendance and support its detail IDs |
| 2026-10-04T22:36:59+07:00 | automate verified VPS releases and skip frontend-only deploys |
| 2026-10-04T23:03:50+07:00 | align employee and HR login layouts |
| 2026-10-04T23:24:37+07:00 | expose the active backend release in health responses |

[SDD](../sdd/README.md) mencerminkan implementasi terbaru, bukan transkrip sesi. [Workflow harian](../development.md) kembali ke dev → PR main tanpa force push setelah perapian selesai.

## Milestone finalisasi 2026-10-05

Kurasi lanjutan disetujui pengguna dengan backup privat dan preserved dates.
26 milestone awal tetap; revisi portal dan perbaikan CI berulang digabung ke snapshot
berikut. Source tree main sebelum rilis tidak berubah.

| Tanggal/waktu sumber | Milestone |
| --- | --- |
| 2026-10-05T03:42:00+07:00 | Production API proxies and HR path routing |
| 2026-10-05T06:10:47+07:00 | Responsive portals, monitoring trends and self-service profiles |
| 2026-10-05T14:22:17+07:00 | Attendance category filters, valid data UUIDs and stable CI regressions |
| 2026-10-05T15:09:25+07:00 | Shared full-height sidebars, left drawers and motion |

Dokumentasi finalisasi memakai tanggal pengerjaan aktual. PR penutupan dan hasil
CI/CD dicatat di [progress](../../tasks/progress.md); [log frontend](finalization.md).
