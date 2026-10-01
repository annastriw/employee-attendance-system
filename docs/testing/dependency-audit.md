# Audit dependency database — 2026-10-01
Audit production awal menemukan advisory pada dependency transitif Prisma 7.10.0.
Override hanya untuk dependency yang disebutkan; minimumReleaseAge tetap 1440.

| Dependency | Sebelum | Sesudah | Alasan |
| --- | --- | --- | --- |
| adapter-mariadb > mariadb | 3.4.5 | 3.5.3 | Perbaikan keamanan handshake/authentication |
| config > deepmerge-ts | 7.1.5 | 8.0.0 | Perbaikan stack exhaustion pada graph rekursif |
| prisma > mysql2 | 3.15.3 | 3.23.1 | Perbaikan downgrade authentication dan advisory tambahan |

deepmerge-ts berpindah major; kompatibilitas penggunaan Prisma diverifikasi lewat
validate, generate, build dan koneksi database. Override perlu ditinjau ulang saat Prisma di-upgrade.
Database tetap MySQL dan Prisma CLI/client/adapter tetap 7.10.0.

Verifikasi: pnpm audit --prod --audit-level high melaporkan
"No known vulnerabilities found" pada tanggal pemeriksaan.
Build workspace, unit test, E2E Auth/MySQL dan smoke server hasil build lulus.
Hasil audit adalah pemeriksaan advisory saat ini, bukan jaminan tidak ada kerentanan.

Referensi:
- [MariaDB handshake](https://github.com/advisories/GHSA-cqhc-2h57-wpxf)
- [Deepmerge recursive graphs](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)
- [MySQL2 authentication](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr)
- [MySQL2 advisory tambahan](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3)
