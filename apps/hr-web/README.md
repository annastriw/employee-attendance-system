# HR Portal
React + TypeScript + HeroUI. Login HRD, ganti password awal, ringkasan kosong dan logout terhubung ke Gateway/Auth.

## Jalankan lokal
Dari root repository: pnpm --dir apps/hr-web run dev --port 5174 --strictPort.
Backend/configuration: [panduan lokal](../../docs/deployment/hr-local.md).

## Tema dan pengujian
Tema dan shell bersama: @attendance/ui, mengikuti [kontrak desain](../../docs/sdd/frontend-design-system.md).
- pnpm --dir apps/hr-web run test: component dan auth client.
- pnpm --dir apps/hr-web run test:ui: kedua portal pada empat ukuran layar; sesi HR dimock tanpa database.
- pnpm --dir apps/hr-web run test:e2e: login/password/restore/logout dengan API dan database test nyata.
- pnpm --dir apps/hr-web run build dan run lint untuk pemeriksaan produksi dan kualitas kode.
