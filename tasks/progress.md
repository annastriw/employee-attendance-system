# Progres dan titik lanjut

## Aktif — dokumentasi localhost (2026-11-01)

- Arahan pengguna: server sudah berakhir; seluruh dokumentasi mengarah localhost
  dan repository GitHub diperbarui. Tidak ada fitur baru atau perubahan runtime.
- Source awal: dev/main dan origin keduanya dee438b, working tree bersih.
- Source dibaca: Vite kedua portal, klien auth (default API localhost:3000/api/v1),
  .env.example frontend/Gateway, setup seed HR serta panduan infra/port.
- Port panduan: Karyawan 5173, HR 5174, API 3000, backend 3001–3004, S3 9000,
  Console 9001. Akun lokal HR admin@example.test memakai password acak .env.auth;
  akun demo lama tidak otomatis ada pada database lokal.
- File terkait: README, docs terkait API/setup/fitur/hosting/baseline/arsitektur/
  keamanan/bukti historis, scripts/seed/README dan plan/todo/progress.
- Verifikasi dokumentasi: isi/port/diff diperiksa, 40 Markdown dan 0 masalah tautan;
  tidak ada domain lama pada Markdown tracked. Source aplikasi/config tidak berubah.
  Berikutnya commit/push dev dan PR main; tidak menjalankan test aplikasi lokal
  karena dokumentasi saja. Tidak menjalankan/stop/restart server atau port baru.
- Bukti finalisasi 2026-10-05 tetap historis; rollback yang disetujui ke dee438b
  sudah selesai, bukan instruksi rewrite aktif. Backup/mapping privat tetap disimpan.


## Checkpoint finalisasi historis — 2026-10-05

Pengguna menyatakan backend/frontend final dan mengizinkan pengecualian rewrite
history dev/main dengan backup privat/tanggal sumber, push dev, PR/merge main dan
CI/CD sampai hijau. Revisi terakhir S02 diterima melalui konfirmasi final tersebut;
tidak mengklaim agen menjalankan matriks visual ulang.

- Task aktif: kurasi history dan PR final setelah konsolidasi/review dokumentasi.
- Verifikasi finalisasi: 44 berkas Markdown, 0 masalah tautan; diff/isi diperiksa.
  Audit 1.346 blob history: tidak ada pola secret/match secret lokal aktif atau path
  sensitif tracked; batas audit tetap berlaku. Tidak menjalankan test aplikasi untuk
  perubahan dokumentasi saja; PR final akan menjalankan unit/lint/build/typecheck.
- Source awal dev 82589ac, remote main 3404061; local main masih 86ee97d sebelum sync.
- Backup lengkap: `.local/repository-cleanup/before-finalization-20261005.bundle`;
  metadata/snapshot tambahan di `.local/repository-cleanup/finalization-20261005/`.
- File terkait: plan/todo/progress, baseline, fitur, workflow/history, indeks docs dan
  finalization; dokumen sprint/audit/checklist berulang dikonsolidasikan.
- Tidak menjalankan/stop/restart server pengguna atau proses port baru. Proses
  verifikasi sementara dicatat bila diperlukan; data/env/lisensi ignored dipertahankan.
- Bukti historis dan log finalisasi frontend: [finalization](../docs/development/finalization.md).
- Selanjutnya: verifikasi perubahan, commit logis, kurasi dengan snapshot main tetap,
  pulihkan ruleset, PR dev → main, perbaiki CI bila gagal, merge/CD dan sync.

## Batas yang tetap berlaku

Kerja serial tanpa subagen. Scope produk tidak bertambah. Restore drill/load test,
backup terjadwal/hardening tambahan masih ditunda pengguna. Tidak menghapus backup
privat, tooling lokal, .env atau data foto. Jangan menggabungkan checkout dengan
history lama setelah rewrite; simpan pekerjaan lalu clone ulang bila diperlukan.
Workflow harian setelah finalisasi tetap dev → PR main, tanpa force push.
