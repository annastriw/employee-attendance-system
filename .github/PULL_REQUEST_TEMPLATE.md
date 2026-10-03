## Perubahan dan alasan

Jelaskan perilaku sebelum/sesudah dan kaitan FE/BE/DB bila ada.

## Jalur rilis

Coding/tes lokal dan commit/push langsung dev. PR rilis hanya dev repository ini ke main. Push dev tidak deploy; CD production belum aktif sampai T30 siap.

## Verifikasi

- [ ] CI result (lint/build/typecheck/unit) lulus.
- [ ] UI/alur berubah dicek manual lokal; catat hasil dan batasnya.
- [ ] Jika schema berubah: migration lokal/grants diperiksa, backup dan rollback tersedia.
- [ ] Keputusan merge/rilis diberikan pengguna; health/smoke manual setelah deploy.

Tidak perlu gate Playwright atau suite integrasi penuh setiap rilis.

Acuan: [workflow CI/CD](../docs/development/ci-cd-workflow.md).
