# Progres dan titik lanjut

## Aktif — perapian repository

Keputusan pengguna 2026-10-04–05: README Inggris, SDD/panduan Indonesia, docs/ERD/fitur/local setup, GitHub About, audit secret, hapus duplikasi/artefak tidak penting dan kurasi history dev/main. Kerja serial tanpa subagen. [Plan](../docs/temporary/task/plan.md), [checklist](../docs/temporary/task/checklist.md), [handoff](../docs/temporary/task/handoff.md).

## Bukti live terakhir

- Pengguna menerima kedua portal/live dan login layout seragam.
- Seed demo: lima profil ACTIVE/ready, provisioning COMPLETED; 195 daily records, 390 event/photo dan satu batch audit menurut output pengguna. Akun publik/password README ditentukan pengguna.
- API health yang dikirim pengguna: status ok, service api-gateway, auth ready, release f581f31aa11d757e36aeab7b06936d40bc6f547f, sama SHA merge main. Membuktikan auto-deploy backend, bukan hanya build image.
- Health/storage sebelumnya HTTP 200 dan permission bucket privat/admin denied diterima dari output pengguna. Tidak menjalankan pemeriksaan live baru pada perapian.

## Bukti increment health release

Sebelum cleanup, perubahan 2bac3b4 menambah RELEASE_SHA Docker/Actions dan field release pada Gateway health. Dua suite/3 unit, lint dan build Gateway lulus. Pengguna merge lalu mengirim hasil live di atas. Tidak perlu mengulang tes yang sama tanpa perubahan baru.

## Kondisi perapian

Backup Git lengkap dan metadata tanggal disimpan di .local/repository-cleanup, ignored. Audit awal 1.196 blob branch dev/main tidak menemukan pola token/private key atau match secret lokal aktif; batas pemeriksaan ada di [security](../docs/security.md).

Source bisnis, tests, migration, scripts operasional dan asset model runtime dipertahankan. Dokumen lama digabung, tujuh scaffold README dan enam asset React/Vite tanpa referensi dihapus. Semua untracked tooling pengguna tetap tidak disentuh. Tidak menjalankan/stop service lokal/VPS pada tahap dokumentasi.

## Batas dan izin

Satu kali rewrite history + force-with-lease dev/main diizinkan pengguna, dengan tanggal sumber dan backup pemulihan. Aturan berikutnya tetap dev→PR→main tanpa force push. Nilai public demo hanya boleh di README/panduan, bukan alasan menaruh secret infra di Git.

Restore drill/load test/hardening tambahan ditunda pengguna. Jangan mengklaim lulus atau mengaktifkan task itu dari catatan lama. Lanjut berdasarkan checklist dan diff aktual, bukan transkrip sesi yang usang.
