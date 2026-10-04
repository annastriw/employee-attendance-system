# Employee Attendance System

Monorepo dua portal React (Attendance dan HR), lima service NestJS, MySQL dan MinIO AIStor Free.

## Workflow harian

Coding di **dev** → unit test bagian berubah → integrasi cepat bila perlu → pengguna cek UI/alur manual → pengguna menyatakan oke → checklist diterima → PR dev ke **main** saat siap rilis.

Commit/push development langsung ke dev. Push dev tidak deploy. Hanya main untuk live; tidak ada staging/dev online. Implementasi boleh di-commit sambil menunggu manual acceptance, tetapi fitur belum ditutup penuh sebelum pengguna mengonfirmasi.

```sh
# Contoh unit satu backend / frontend
pnpm --filter attendance-service test --runInBand
pnpm --filter hr-web test

# Semua unit: saat rilis/checkpoint, bukan setiap perubahan kecil
pnpm run test:unit
```

Unit memakai Jest/Vitest/RTL terisolasi. Tidak perlu Playwright atau suite integrasi penuh rutin. [Panduan testing](docs/testing/workflow.md) menjelaskan kapan integrasi cepat diperlukan dan aturan checklist manual.

## Rilis singkat

1. PR dev → main: CI lint/build/typecheck/unit lulus dan penerimaan manual pengguna tercatat.
2. Merge main: build lima image dengan cache/paralel lalu publish GHCR.
3. Target VPS: pull/update, migration baru bila ada, health check; dua frontend mengikuti main. Pengiriman otomatis ke VPS belum diimplementasikan; lanjut T30 dari catatan setup terakhir, tanpa reset.

[Workflow rilis](docs/development/ci-cd-workflow.md), [titik lanjut VPS](tasks/progress.md), dan [daftar dokumentasi](docs/README.md). Jangan commit secrets, lisensi, backup atau foto/data karyawan.
