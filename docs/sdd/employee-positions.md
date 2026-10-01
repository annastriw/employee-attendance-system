# Employee Service: master jabatan (T11, layar H12)

Acuan: [baseline](../requirements/baseline.md), [UI/UX H12](frontend-ui-ux.md), [design system](frontend-design-system.md).

## Kepemilikan dan akses
- Employee Service (port 3002, bind 127.0.0.1) memiliki `emp_positions` dan `emp_audit_logs`. Hanya Gateway yang publik.
- Akun runtime `attendance_employee`: SELECT/INSERT/UPDATE pada `emp_positions`, SELECT/INSERT pada `emp_audit_logs`. Tidak ada DELETE; audit append-only. Dibuat oleh `pnpm db:grants`.
- Setiap request memverifikasi bearer ke Auth `GET /api/v1/auth/me`. Auth memeriksa sesi di DB, sehingga logout, sesi kedaluwarsa dan akun nonaktif langsung ditolak (401). Employee tidak membaca tabel Auth dan tidak menyimpan JWT secret.
- Hanya `ADMIN_HRD` yang sudah mengganti password awal (403 selain itu). Auth tidak tersedia menjadi 503, bukan akses.
- `/auth/me` memakai limit 600/menit agar verifikasi per request tidak tersandung limit login 10/menit.

## API (melalui Gateway `/api/v1`)
| Method | Path | Hasil |
| --- | --- | --- |
| GET | `/positions?search&status&page&pageSize` | `{items, total, page, pageSize}`; pageSize maks 100, urut nama |
| POST | `/positions` | 201 jabatan baru, status ACTIVE |
| GET | `/positions/:id` | 200 atau 404 |
| PATCH | `/positions/:id` | ubah `name`/`code` |
| POST | `/positions/:id/activate`, `/deactivate` | 200; tanpa perubahan bila status sama |

Gateway hanya meneruskan path di atas (id UUID) dan query `search,status,page,pageSize`; path/query lain 400 tanpa memanggil upstream. Hanya `Authorization` dan request ID yang diteruskan.

## Aturan
- Nama 2-120 karakter, spasi dirapikan. Kode 2-40 karakter `A-Z 0-9 - _`, disimpan huruf kapital.
- Nama dan kode unik tanpa membedakan huruf besar/kecil (collation utf8mb4_unicode_ci). Bentrok: 409 "Nama/Kode jabatan sudah digunakan.", termasuk saat dua request bersamaan (P2002).
- Tidak ada hapus permanen. Nonaktif menjaga data dan riwayat; aktivasi ulang tersedia.
- Setiap perubahan nyata ditulis ke audit dalam transaksi yang sama: CREATED, UPDATED, ACTIVATED, DEACTIVATED, dengan aktor dan request ID. Perubahan tanpa efek tidak diaudit.

## UI H12
Toolbar (cari dengan debounce, filter Semua/Aktif/Nonaktif, Tambah) → tabel → pagination. Filter tersimpan di URL (`#jabatan?search=&status=&page=`). Form tambah/ubah dalam dialog; bentrok tampil di field terkait dan input dipertahankan. Nonaktifkan meminta konfirmasi; aktifkan langsung. State: memuat (skeleton), kosong, filter tanpa hasil, gagal + Coba lagi, menyimpan, berhasil, sesi berakhir.

## Acceptance dan verifikasi
- HRD membuat, mencari, mengubah, menonaktifkan dan mengaktifkan jabatan. Konflik nama/kode 409; audit dan data tetap utuh.
- H12 mengikuti pola H11 dan memakai ConfirmDialog, StatusBadge, list-toolbar/list-pager. Filter berada di URL.
- API `status=ACTIVE` mengecualikan master nonaktif. `MasterAssignmentSelect` (HeroUI) menyaring pilihan aktif dan menjelaskan nilai lama nonaktif. Komponen diuji untuk jabatan dan departemen; integrasi pemuatan pilihan serta form karyawan dilakukan pada T12.
- Tier 1 typecheck/lint; Tier 2 unit/komponen; API MySQL nyata; Tier 3 layout terang/gelap; checkpoint Tier 4 HRD nyata dengan backend dist terbaru, satu worker.

## Bukti (2026-10-02)
- Migration `20261002080000_employee_master_positions`: `pnpm exec prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code` menghasilkan 0. Diterapkan ke attendance_dev dan attendance_test; grants runtime dan generate/build client lulus.
- Employee: typecheck/lint, 9 unit (5 guard/AuthClient + 4 transaksi jabatan), 12 API MySQL (6 departemen + 6 jabatan) lulus. Test jabatan membuktikan konflik nama/kode case-insensitive, normalisasi, validasi/404/403/401, audit/no-op, nonaktif tanpa hapus dan filter ACTIVE yang mengecualikan nonaktif. API MySQL memakai profile Auth stub; Auth nyata diverifikasi pada journey browser.
- Gateway: typecheck/lint, 12 unit dan 37 kontrak HTTP lulus; allowlist/query/header/outage pada kedua master.
- HR: typecheck/lint/build, 38 Vitest/RTL lulus, termasuk 12 halaman jabatan, 9 departemen dan 6 selector aktif/nilai lama nonaktif. Vitest satu worker untuk RAM terbatas.
- Visual: `pnpm --dir apps/hr-web run test:ui --workers=1`: 36 test lulus, termasuk H11/H12 terang/gelap pada 320/768/1024/1440 px. Screenshot daftar/form ditinjau; pager Geist, filter satu grup, aksi terlihat dan tanpa overflow.
- Backend Auth/Employee/Gateway dist dibangun sebelum checkpoint. `pnpm --dir apps/hr-web run test:e2e hr-positions.spec.ts --workers=1`: 2 lulus (desktop/mobile); login → tambah → konflik kode → ubah → konfirmasi nonaktif → filter URL + reload → aktifkan → baris hilang dari filter Nonaktif. Regresi `hr-departments.spec.ts` dijalankan terpisah: 2 lulus dengan assertion refetch yang sama.
- Cleanup test diverifikasi: 0 jabatan/departemen berprefiks E2E dan 0 akun browser tersisa. Seluruh port aplikasi/test ditutup; MySQL lokal tetap pada 3307.

## Batas checkpoint
Form akun/profil karyawan serta pemuatan selector terintegrasi masuk T12. Tidak ada perubahan limit login/refresh Auth atau centang T09c. E2E per spec dijalankan terpisah; kendala 429 gabungan tetap menunggu keputusan pengguna.
