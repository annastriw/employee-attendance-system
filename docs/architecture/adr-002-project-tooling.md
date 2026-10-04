# ADR-002: Tooling monorepo, database dan komunikasi service
Tanggal: 2026-10-01 (Asia/Jakarta).
Status: disetujui pengguna.

## Keputusan
- Package manager: pnpm workspace untuk apps/* dan packages/*, dengan satu lockfile repository.
- Versi Node.js dan pnpm dipilih berdasarkan kompatibilitas dependency, lalu dikunci saat bootstrap.
- ORM: Prisma untuk MySQL, dengan schema dan migration yang ditinjau di Git.
- Karena satu database memuat tabel beberapa service, satu pengelola schema/migration terpusat menangani struktur keseluruhan.
- Runtime service tetap menggunakan akun DB dan repository akses miliknya; tidak membaca atau menulis tabel service lain.
- Kredensial migration dipisahkan dari akun runtime dan hanya dipakai pada pekerjaan migration.
- Prisma client/database code tidak boleh masuk frontend. Package contracts tidak mengimpor client ORM.
- HTTP internal digunakan untuk request langsung dan pengiriman event; service bisnis tidak diekspos ke internet.
- Transactional outbox menyimpan perubahan domain dan event dalam transaksi MySQL yang sama.
- Worker mengirim event melalui HTTP dengan retry terkontrol, timeout, pencatatan hasil, serta deduplikasi ID event pada penerima.
- Tidak ada RabbitMQ pada tahap awal. Outbox bukan message broker.
- Retry tidak menjamin exactly-once; penerima wajib idempotent, dan ordering per entity ditetapkan saat kontrak event.
- Autentikasi request internal ditetapkan sebelum endpoint internal digunakan.
- Tidak menambahkan Turborepo/Nx pada tahap awal; kebutuhan orchestration tambahan dievaluasi dari kebutuhan nyata.

## Alasan
pnpm mengelola aplikasi dan package bersama secara eksplisit.
Prisma menyediakan client bertipe dan migration yang dapat diperiksa.
HTTP dan outbox memenuhi komunikasi awal tanpa menambah broker pada satu VPS.

## Batas implementasi
Persetujuan ini menetapkan pilihan tooling, belum memasang dependency atau menjalankan migration.
Selesaikan kompatibilitas versi, struktur schema/migration, hak akses runtime, retry/ordering/deduplikasi dan kontrak internal sebelum implementasi terkait.
Aturan bisnis, testing, HeroUI dan deployment mengikuti baseline.md.

## Sumber
- https://pnpm.io/workspaces
- https://www.prisma.io/docs/orm/migrations/how-migrations-work
- https://docs.nestjs.com/microservices/basics
- https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html
