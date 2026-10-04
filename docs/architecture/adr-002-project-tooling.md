# ADR-002 — Monorepo, MySQL dan HTTP/outbox

Keputusan awal: 2026-10-01. Status: diterapkan; ringkasan diperbarui 2026-10-04.

## Keputusan

pnpm workspace dengan satu lockfile, Node 24.x, TypeScript, React/Vite dan NestJS. Prisma mengelola satu schema/migration MySQL terpusat; generated client dibungkus packages/database dan tidak masuk frontend.

Runtime mempunyai akun DB per service dengan grants tabel miliknya. Antarservice memakai HTTP internal dengan autentikasi, timeout dan idempotensi. Durable operation menangani provisioning/lifecycle; transactional outbox Attendance menyimpan event dan pekerjaan binding foto dalam transaksi sama.

## Alasan dan konsekuensi

HTTP/outbox memenuhi kebutuhan tanpa broker tambahan pada satu VPS. Receiver harus idempotent karena retry bukan exactly-once. Schema terpusat memerlukan koordinasi migration, tetapi kepemilikan runtime tetap dibatasi. Tidak menambahkan RabbitMQ/Nx/Turborepo tanpa kebutuhan nyata.

[Arsitektur](../architecture.md), [database](../database.md), [recovery](../sdd/recovery.md). Versi exact mengikuti package.json/lockfile, bukan daftar dependency yang disalin ke banyak dokumen.
