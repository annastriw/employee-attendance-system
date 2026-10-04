# ADR-001 — MinIO AIStor Free untuk foto privat

Keputusan awal: 2026-10-01. Status: diterapkan; ringkasan diperbarui 2026-10-04.

## Konteks dan keputusan

Foto check-in/out memerlukan private bucket, API S3 dan URL sementara. Gunakan MinIO AIStor Free single-node dalam Docker Compose, dengan image pinned dan volume persisten. Lisensi valid disimpan lokal/VPS dan dimount read-only; tidak masuk Git. AIStor digunakan secara eksplisit, bukan image MinIO Community.

Media menggunakan akun/policy terbatas pada bucket/prefix aplikasi; root hanya untuk setup. Signed URL diterbitkan setelah otorisasi. S3 publik lewat domain HTTPS, Console tetap loopback. Lokal dev/test memakai bucket/user berbeda pada satu instance karena resource terbatas; production terpisah dari lokal.

## Alasan dan konsekuensi

S3-compatible storage memisahkan bytes foto dari MySQL; metadata/checksum/status tetap pada Media. Single-node mengurangi komponen tetapi tidak memberi high availability. Backup/restore di luar service tetap pekerjaan tersendiri; pengujian restore ditunda pemilik, tidak dianggap selesai dari health/upload.

[Compose lokal](../../infra/compose.aistor.local.yml), [Media SDD](../sdd/media.md), [setup](../getting-started.md), [deployment](../deployment.md). Referensi penyedia: [instalasi container](https://docs.min.io/aistor/installation/container/install/).
