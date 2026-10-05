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

## Finalisasi aktif

Backend/frontend diterima final oleh pengguna pada 2026-10-05, termasuk revisi S02.
Satu increment serial: konsolidasi docs dan audit berkas → review/verifikasi → kurasi
history dengan backup privat → push dev → PR main dan CI → merge → CD hijau →
sinkronisasi dev/main lokal/remote. Tidak ada subagen atau fitur baru.

[Rangkuman frontend dan bukti](../docs/development/finalization.md), [status](todo.md),
[titik lanjut](progress.md). Restore drill, backup terjadwal, uji beban dan hardening
masih ditunda pengguna; bukan klaim lulus.
