# Workflow development, CI, dan rilis

Keputusan pengguna, 2026-10-03: hanya dua branch jangka panjang, `dev` dan `main`. `dev` dipakai untuk coding serta menjalankan aplikasi secara lokal; hanya `main` mewakili versi production. Tidak ada deployment dev, staging online, atau preview otomatis.

## Alur sederhana

```text
coding lokal → commit/push dev → uji lokal
                               ↓ saat siap rilis
                         PR dev → main
                               ↓
                    CI ringkas lulus → merge
                               ↓
                    CD production (belum aktif)
```

| Branch | Dipakai untuk | Deploy |
| --- | --- | --- |
| `dev` | Coding dan menjalankan app secara lokal | Tidak |
| `main` | Rilis live | Ya, setelah CD disiapkan dan diverifikasi |

Tidak perlu branch fitur atau PR untuk setiap perubahan. Buat perubahan pada `dev`, jalankan pemeriksaan yang relevan secara lokal, lalu commit/push ke `dev`. Saat sekumpulan perubahan siap dipakai live, buka satu PR `dev` → `main`. Merge PR tersebut adalah keputusan rilis. Jangan push hasil development langsung ke `main`.

## Pemeriksaan rilis yang dipangkas

GitHub Actions hanya berjalan untuk PR menuju `main`, bukan pada setiap push ke `dev`. Workflow menjalankan:

1. Memastikan sumber PR adalah branch `dev` dari repository ini.
2. Satu job quality: lint, validasi/generate Prisma, typecheck script database, build seluruh workspace, dan unit/component tests.
3. Satu hasil `CI result` untuk dijadikan required check pada `main`.

Pipeline reguler tidak menjalankan suite integrasi MySQL/AIStor dan Playwright visual. Suite dan test tersebut tetap ada. Development memakai unit test logika berubah dan cek manual UI/alur lokal. Integrasi tambahan hanya untuk diagnosis khusus atau atas permintaan pengguna; bukan gate rutin. Saat schema berubah, periksa migration/grants pada DB lokal dan siapkan backup sebelum migration production.

Lima image sudah dibangun berhasil pada Actions dengan matrix paralel (run 37134360003). Pada run itu quality juga lulus, sedangkan job integrasi berhenti karena secret lisensi AIStor CI belum tersedia; visual dilewati karena bergantung pada integrasi. Jadi mengeluarkan dua job tersebut dari jalur PR membuat gate rilis dapat berjalan tanpa lisensi CI tersebut. Lama berikutnya bergantung cache dan antrean Actions; target praktis beberapa menit, bukan jaminan durasi.

## Status deployment otomatis

CI PR memeriksa lint/build/typecheck/unit. Workflow backend-images.yml sudah dikonfigurasi untuk push main: lima image dibangun cached/paralel dan dipublish ke GHCR dengan tag sha-<commit>, memakai GITHUB_TOKEN otomatis. Unit tidak diulang. Publish belum dieksekusi, karena main baru disiapkan sebagai dasar rilis. T30 masih perlu menyiapkan dan memverifikasi Compose production backend, akses pull GHCR, deployment SSH, health check, rollback, domain/TLS dan secrets. Tidak ada backend absensi yang sudah live di VPS berdasarkan pemeriksaan terakhir; MySQL dan AIStor saja yang telah disiapkan.

Target alur setelah T30 lengkap:

```text
PR dev → main: quality (lint/build/typecheck/unit)
merge main: build/publish image ber-tag commit → deploy VPS → health check
perubahan schema: backup + migration satu kali sebelum backend yang kompatibel
frontend: dua project Vercel memakai branch main dan hanya menerbitkan rilis main
```

Deployment memakai image dari GHCR, bukan membangun source di VPS. Image ditandai dengan commit SHA agar versi mudah dilacak. Perubahan FE/BE/DB yang saling bergantung masuk ke satu rilis. Migration hanya dijalankan bila ada migration baru; tidak menjalankan reset/seed ulang setiap deploy. Bila health check gagal, kembalikan image ke versi sebelumnya dan ikuti runbook database bila migration/data ikut berubah.

Target kecepatan setelah mekanisme itu tersedia adalah satu pemeriksaan PR, lalu deploy otomatis setelah merge; perubahan tanpa migration tidak perlu menjalankan prosedur backup/migration. Ini sasaran desain, belum bukti bahwa CD aktif. Besok, sebelum CD diverifikasi, cara aman adalah merge `dev` → `main` setelah CI lalu mengikuti langkah deploy/runbook manual yang sudah diuji; jangan menganggap push/merge otomatis memperbarui VPS.

## Repository dan aturan branch

Repository: [annastriw/employee-attendance-system](https://github.com/annastriw/employee-attendance-system). Hanya `dev` dan `main` yang dipakai sebagai branch kerja/production jangka panjang. Branch `main` disiapkan dari commit dokumentasi awal 39d7795 sebagai dasar PR rilis pertama tanpa menerbitkan aplikasi, dan perlu diberi ruleset yang mewajibkan PR serta status `CI result`. Jangan mengaktifkan auto-merge sebelum aturan CI dan akses production terbukti.

Workflow publish GHCR telah dikonfigurasi, belum dijalankan. Akses VPS untuk pull image (package bisa private), DNS, TLS dan workflow deploy masih perlu diverifikasi. Git/ruleset remote aktual menjadi bukti status aturan main. Deployment awal tetap tahap terpisah setelah artefak, backup/restore, smoke manual, akses domain, dan instruksi pemilik VPS tersedia. Unit tests dijalankan pada PR, tidak diulang pada langkah deploy. Tidak ada Playwright pada jalur rilis rutin.

Acuan publikasi: [GitHub Docs — publishing Docker images](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images).
