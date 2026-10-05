# Status task produk

Ringkasan menggantikan checkpoint sesi yang berulang. Status berikut bersumber dari implementasi/source, bukti historis repository dan konfirmasi pengguna; bukan klaim seluruh suite dijalankan ulang pada perapian.

| Task | Scope | Status/bukti |
| --- | --- | --- |
| T01–T02 | SDD, ADR, tooling | Spesifikasi/ADR dan dependency workspace tersedia |
| T03–T06 | Workspace, lima service, dua frontend | Source/build configuration tersedia; aplikasi dilaporkan berjalan lokal/live |
| T07 | MySQL/AIStor/test tooling | Script dan tests tersedia; dev/test lokal berbagi instance dengan schema/bucket berbeda |
| T08–T09 | Login HR/ganti password | Implementasi dan acceptance historis tersedia; HR live diterima |
| T10 | Departemen | Selesai, acceptance 2026-10-02 |
| T11 | Jabatan | Selesai, acceptance 2026-10-02 |
| T12 | Profil+akun karyawan | Selesai, acceptance 2026-10-02 |
| T13 | Login karyawan | Selesai, acceptance 2026-10-02; layout login seragam diterima live 2026-10-04 |
| T14 | Edit profil/email, lifecycle/history | Selesai, acceptance 2026-10-02 |
| T15 | Reset password | Selesai, acceptance 2026-10-02 |
| T16 | Policy dan eligibility | Implementasi/unit/integrasi historis tersedia |
| T17 | Kalender libur | Implementasi API/UI dan tests tersedia |
| T18 | Spike kamera/lokasi | Acceptance manual 2026-10-02; dipakai dalam fitur capture |
| T19 | Foto privat | Implementasi/tes S3/DB historis tersedia |
| T20–T24 | Capture, check-in/out, delete/restore, riwayat | Selesai, manual diterima 2026-10-03 |
| T25 | Monitoring/rekap | Selesai, pengguna menyatakan monitoring oke 2026-10-03 |
| T26 | Detail foto/peta | Selesai, pengguna menyatakan detail oke; detail UUID demo diperbaiki dan diterima live |
| T27 | Retry/outbox/orphan | Implementasi dan unit/integrasi historis tersedia |
| T28 | Responsive/accessibility | Review/tes historis tersedia; UI berikutnya tetap manual |
| T29 | CI/testing | CI ringkas dev→main aktif; pengguna melaporkan PR terbaru hijau |
| T30 | Artefak dan runbook | GHCR, Compose, migrator, forced-command/health/rollback tersedia; auto-deploy terbukti |
| T31 | Deployment/live | Domain/HTTPS, kedua portal dan API diterima pengguna; health SHA cocok merge f581f31 |

## Batas yang tetap dicatat

Restore backup, backup terjadwal, uji beban/kapasitas dan hardening tambahan ditunda atas instruksi pengguna. Isolasi instance test lokal bukan terpisah; schema/bucket/user berbeda saja. Keterbatasan ini tidak diubah menjadi checklist lulus.

## Increment berikut

Arahan terbaru 2026-10-05: seluruh T terdahulu dianggap selesai oleh pengguna;
ini penutupan backlog, bukan klaim menjalankan ulang test atau acceptance visual.
Backlog aktif [fase D](frontend-revision-phase-d.md):

- [x] T22 audit source, matriks filter, plan dan pertanyaan.
- [x] T23 validasi UUID dan forwarding/filter API seluruh daftar.
- [x] T24 toolbar sejajar dan kalender sesuai klarifikasi.
- [x] T25 warna aksi dan konfirmasi konsisten.
- [x] T26 brand stabil, tema via menu, nama/email akun terlihat.
- [x] T27 semua layar HR/Karyawan responsif dan konsisten.
- [x] T28 verifikasi teknis dan checklist manual/handoff.

T22-T28 selesai teknis lokal; bukti [fase D](frontend-revision-phase-d.md).
Kerja serial, **tanpa commit/push** fase ini. Manual acceptance tetap pending
sampai pengguna menyatakan oke.

[Perapian repo dan handoff](progress.md), dikerjakan serial dan sudah selesai. Feature/backend/frontend baru tidak ditambahkan hanya untuk mengulang uji auto-deploy yang sudah lulus.

## Sumber acceptance dan verifikasi

[SDD domain](../docs/sdd/README.md), [source/test service](../apps/), [workflow](../.github/workflows/ci.yml), [progress](progress.md). Unit logika berubah wajib; integrasi cepat bila perlu; manual acceptance hanya untuk scope yang dinyatakan oke pengguna.


## Tambahan fase D (2026-10-05)

Permintaan lanjutan menambah T29 satu akses logout, T30 audit semua UUID dan
perbaikan bug terkonfirmasi, T31 verifikasi/review tambahan. Ketiganya selesai
teknis lokal; total fase D 10 task T22-T31. [Rincian dan bukti](frontend-revision-phase-d.md).
Tidak commit/push/PR/deploy; acceptance manual kedua role tetap pending.


Keputusan terbaru pengguna 2026-10-05 setelah verifikasi: commit dan push
perubahan terverifikasi ke dev diizinkan dan diminta. Menggantikan batas
local-only sebelumnya. PR/merge/main/deployment belum diminta; acceptance
manual tetap pending.

## S01 - Sidebar penuh tinggi dan motion (2026-10-05)

- [x] Audit Git/source dan klarifikasi drawer mobile/tablet, rail desktop.
- [x] Shell HR/Karyawan: brand menetap, drawer penuh tinggi, tema/akun bawah sidebar, hapus Ctrl+K.
- [x] Motion ringan bersama, reduced motion, unit terfokus/lint/build/review.
- [x] Commit/push dev bersama increment S01; hasil diperiksa setelah command.
- [ ] Manual pengguna: 320/768/1024/1440 px dan landscape; buka/tutup/scroll sidebar, akun/tema, navigasi kedua role.
- [ ] Pengguna menyatakan oke untuk S01.

## S02 - Sidebar konsisten setelah feedback localhost (2026-10-05)

- [x] Audit dan kontrak: logo boleh mengikuti sidebar; tombol di kiri dan drawer dari kiri.
- [x] Header sidebar/rail desktop dan drawer mobile/tablet konsisten kedua role.
- [x] Unit terfokus, lint/build/review; commit/push dev bersama increment S02.
- [ ] Manual pengguna kedua role pada desktop/tablet/mobile serta landscape; navigasi, close/Escape, tema/akun dan scroll.
- [ ] Pengguna menyatakan oke S02 (S01 belum diterima).
