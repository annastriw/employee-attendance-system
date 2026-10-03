## Perubahan dan alasan

Jelaskan perilaku sebelum/sesudah dan kaitan FE/BE/DB bila ada.

## Jalur branch

- PR fitur/perbaikan: branch dari `dev` → `dev`.
- PR rilis: `dev` repository ini → `main`, setelah CI dan uji integrasi lulus.
- Merge ke `dev` tidak deploy. Production hanya dari `main`; CD masih harus disiapkan pada T30.

## Verifikasi

Tuliskan pemeriksaan yang benar-benar dijalankan, hasil dan batasannya.

## Khusus rilis ke main

- [ ] Semua fitur yang masuk rilis siap; `CI result` lulus.
- [ ] Migration kompatibel, backup/restore dan rollback tersedia bila diperlukan.
- [ ] CD/akses production sudah diverifikasi; seed/admin tidak diulang.
- [ ] Keputusan rilis diberikan pengguna; catat smoke test setelah deployment.

Acuan: [workflow CI/CD](../docs/development/ci-cd-workflow.md).
