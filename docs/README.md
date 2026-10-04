# Dokumentasi proyek

Mulai dari [README Inggris](../README.md) untuk ringkasan produk dan akun demo.

| Panduan | Isi |
| --- | --- |
| [Analisis kebutuhan](requirements/analysis.md) | Masalah, pengguna, kendala dan batas scope |
| [PRD](requirements/prd.md) | Tujuan produk, prioritas dan acceptance |
| [Siklus SDD](sdd/lifecycle.md) | Kebutuhan → desain → implementasi → auto-deployment |
| [Setup lokal](getting-started.md) | Clone, environment, MySQL/AIStor, seed dan tujuh aplikasi |
| [Fitur](features.md) | Portal karyawan/HR, aturan dan demo walkthrough |
| [Arsitektur](architecture.md) | Service, transport, storage, deployment |
| [Database/ERD](database.md) | Tabel, relasi fisik/logis, constraint, grants |
| [API](api.md) | Metode/path aktual, auth dan contoh request |
| [Development](development.md) | SDD, Kanban, unit/integrasi cepat, Git |
| [Milestone](development/history.md) | Kurasi history dengan tanggal sumber asli |
| [Deployment](deployment.md) | PR main, Vercel, GHCR dan VPS |
| [Keamanan](security.md) | Secret, akun demo dan batas audit |
| [SDD](sdd/README.md) | Kontrak domain ringkas |
| [Baseline](requirements/baseline.md) | Scope produk yang disetujui |

Keputusan: [AIStor](architecture/adr-001-object-storage.md), [tooling/HTTP/outbox](architecture/adr-002-project-tooling.md), [monorepo/deployment](architecture/adr-003-repository-and-deployment.md). Operasional: [auto-deploy](deployment/vps-auto-deploy.md), [runbook VPS](deployment/vps-production-manual.md). Testing: [workflow](testing/workflow.md), [audit dependency historis](testing/dependency-audit.md).

[Roadmap](../tasks/plan.md) dan [status](../tasks/todo.md) menyimpan keterlacakan produk. [Plan perapian](temporary/task/plan.md), [checklist](temporary/task/checklist.md), [handoff](temporary/task/handoff.md) dipakai untuk pekerjaan serial lintas sesi.
