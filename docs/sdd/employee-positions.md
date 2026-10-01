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
- Daftar pilihan penugasan hanya mengambil status ACTIVE dan menyaring hasil nonaktif; UI penugasan karyawan ditutup pada T12.
- Tier 1 typecheck/lint; Tier 2 unit/komponen; API MySQL nyata; Tier 3 layout terang/gelap; checkpoint Tier 4 HRD nyata dengan backend dist terbaru, satu worker.

## Bukti
Belum dijalankan; diperbarui setelah verifikasi T11.
