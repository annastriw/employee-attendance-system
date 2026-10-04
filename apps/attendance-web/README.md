# Attendance Portal
React + TypeScript, tema HeroUI dan shell bersama @attendance/ui.
Halaman menampilkan status login belum tersedia dengan tema bersama HR (netral zinc, aksen emerald, mode terang/gelap). Login dan absensi belum diimplementasikan; mengikuti T13 dan task berikutnya.

## Jalankan lokal
Dari root repository: pnpm --dir apps/attendance-web run dev --port 5173 --strictPort.

## Tema dan pengujian
Ikuti [kontrak desain](../../docs/sdd/frontend-design-system.md), bukan stylesheet tema tersendiri.
- pnpm --dir apps/attendance-web run build dan run lint.
- pnpm --dir apps/hr-web run test:ui memeriksa layout kedua portal pada 320/768/1024/1440 px.
