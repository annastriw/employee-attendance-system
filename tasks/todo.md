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

## Penutupan revisi dan finalisasi

- [x] Revisi frontend/backend fase D T22–T31 selesai; CI/rilis terdahulu berhasil.
- [x] Sidebar/motion S01 diperbaiki oleh S02; verifikasi teknis terkait lulus.
- [x] Pengguna menyatakan seluruh backend/frontend final, termasuk S02, 2026-10-05.
- [x] Push dev, kurasi history dengan backup dan PR/merge main diizinkan untuk finalisasi.
- [x] Konsolidasi dokumentasi dan audit berkas selesai, review/tautan/diff lulus.
- [ ] PR final dev → main dan CI head terbaru hijau.
- [ ] Merge main dan workflow production/deployment yang relevan hijau.
- [ ] dev/main lokal dan remote identik; ruleset main asli aktif, working tree bersih.

[Bukti frontend dan pengujian historis](../docs/development/finalization.md).
[Progress](progress.md) mencatat task aktif serta hasil final; tidak mengulang pengujian
lama tanpa perubahan atau risiko baru.
