# Roadmap implementasi

Scope produk: dua portal React, lima backend NestJS, MySQL dan AIStor. [Baseline](../docs/requirements/baseline.md), [spesifikasi domain](../docs/sdd/README.md).

## Tahap produk

| Tahap | Task | Hasil |
| --- | --- | --- |
| Fondasi | T01–T07 | Spesifikasi/ADR, workspace, service/frontend, DB/storage/tooling |
| Akun dan master | T08–T15 | Login HR/karyawan, master, provisioning, profil/lifecycle/reset |
| Presensi dan bukti | T16–T24 | Policy, kalender, capture, foto, check-in/out, lifecycle/history |
| Monitoring dan pemulihan | T25–T29 | Rekap, detail/peta, outbox/recovery, responsive review, CI |
| Rilis | T30–T31 | Artefak/runbook, domain/HTTPS, live frontend/backend, auto-deploy |

Task utama T01–T31 satu backlog; UX01–UX07 dahulu merupakan pemetaan layar, bukan proyek paralel. Status/rincian acceptance: [todo](todo.md).

## Metode

Kerja serial satu fitur ujung ke ujung, SDD + Kanban. Unit logika berubah wajib; integrasi cepat hanya jika perlu; UI manual pengguna. Coding/push dev, PR main untuk live. [Development](../docs/development.md), [testing](../docs/testing/workflow.md).

## Pekerjaan aktif

Revisi terbaru 2026-10-05: pengguna menutup T terdahulu dan meminta audit seluruh
layar/filter, lalu revisi serial T22–T28. [Audit dan plan fase D](frontend-revision-phase-d.md)
menjadi acuan aktif: filter API → toolbar/kalender → warna aksi → shell/tema/akun
→ sweep kedua role → verifikasi/handoff. Semua perubahan lokal **tanpa commit/push**;
instruksi ini menggantikan aturan push otomatis untuk fase D. Klarifikasi kalender
dan posisi brand diterima setelah audit source. T22-T28 selesai teknis lokal;
acceptance manual pending dan bukti tercatat di fase D.

Perapian repo/docs/history pada 2026-10-04–05 selesai. Pengguna meminta folder temporary dihapus; hasil dan handoff disimpan pada [progress](progress.md). Pekerjaan berikut dibahas sesuai prioritas pengguna, bukan otomatis menambah fitur/task operasional.

Restore drill, backup terjadwal, uji beban/kapasitas dan hardening tambahan ditunda pengguna dalam scope demo. Penundaan bukan klaim pekerjaan lulus. Source/tests/migrations tetap disimpan; hasil lama tidak dijalankan ulang tanpa perubahan/risiko baru.


## Tambahan fase D (2026-10-05)

Permintaan lanjutan menambah T29 satu akses logout, T30 audit semua UUID dan
perbaikan bug terkonfirmasi, T31 verifikasi/review tambahan. Ketiganya selesai
teknis lokal; total fase D 10 task T22-T31. [Rincian dan bukti](frontend-revision-phase-d.md).
Tidak commit/push/PR/deploy; acceptance manual kedua role tetap pending.


Keputusan terbaru pengguna 2026-10-05 setelah verifikasi: commit dan push
perubahan terverifikasi ke dev diizinkan dan diminta. Menggantikan batas
local-only sebelumnya. PR/merge/main/deployment belum diminta; acceptance
manual tetap pending.
