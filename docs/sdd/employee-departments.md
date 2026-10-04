# Employee Service: master departemen (T10, layar H11)

Frekuensi testing dan aturan centang: [workflow aktif](../testing/workflow.md). Resep/hasil suite lama di dokumen ini tidak menjadi gate rutin; bukti historis tetap dipertahankan.

Acuan: [baseline](../requirements/baseline.md), [UI/UX H11](frontend-ui-ux.md), [design system](frontend-design-system.md).

## Kepemilikan dan akses
- Employee Service (port 3002, bind 127.0.0.1) memiliki `emp_departments` dan `emp_audit_logs`. Hanya Gateway yang publik.
- Akun runtime `attendance_employee`: SELECT/INSERT/UPDATE pada `emp_departments`, SELECT/INSERT pada `emp_audit_logs`. Tidak ada DELETE; audit append-only. Dibuat oleh `pnpm db:grants`.
- Setiap request memverifikasi bearer ke Auth `GET /api/v1/auth/me`. Auth memeriksa sesi di DB, sehingga logout, sesi kedaluwarsa dan akun nonaktif langsung ditolak (401). Employee tidak membaca tabel Auth dan tidak menyimpan JWT secret.
- Hanya `ADMIN_HRD` yang sudah mengganti password awal (403 selain itu). Auth tidak tersedia menjadi 503, bukan akses.
- `/auth/me` memakai limit 600/menit agar verifikasi per request tidak tersandung limit login 10/menit.

## API (melalui Gateway `/api/v1`)
| Method | Path | Hasil |
| --- | --- | --- |
| GET | `/departments?search&status&page&pageSize` | `{items, total, page, pageSize}`; pageSize maks 100, urut nama |
| POST | `/departments` | 201 departemen baru, status ACTIVE |
| GET | `/departments/:id` | 200 atau 404 |
| PATCH | `/departments/:id` | ubah `name`/`code` |
| POST | `/departments/:id/activate`, `/deactivate` | 200; tanpa perubahan bila status sama |

Gateway hanya meneruskan path di atas (id UUID) dan query `search,status,page,pageSize`; path/query lain 400 tanpa memanggil upstream. Hanya `Authorization` dan request ID yang diteruskan.

## Aturan
- Nama 2-120 karakter, spasi dirapikan. Kode 2-40 karakter `A-Z 0-9 - _`, disimpan huruf kapital.
- Nama dan kode unik tanpa membedakan huruf besar/kecil (collation utf8mb4_unicode_ci). Bentrok: 409 "Nama/Kode departemen sudah digunakan.", termasuk saat dua request bersamaan (P2002).
- Tidak ada hapus permanen. Nonaktif menjaga data dan riwayat; aktivasi ulang tersedia.
- Setiap perubahan nyata ditulis ke audit dalam transaksi yang sama: CREATED, UPDATED, ACTIVATED, DEACTIVATED, dengan aktor dan request ID. Perubahan tanpa efek tidak diaudit.

## UI H11
Toolbar (cari dengan debounce, filter Semua/Aktif/Nonaktif, Tambah) → tabel → pagination. Filter tersimpan di URL (`#departemen?search=&status=&page=`). Form tambah/ubah dalam dialog; bentrok tampil di field terkait dan input dipertahankan. Nonaktifkan meminta konfirmasi; aktifkan langsung. State: memuat (skeleton), kosong, filter tanpa hasil, gagal + Coba lagi, menyimpan, berhasil, sesi berakhir.

## Bukti (2026-10-02)
- Employee: 5 unit (AuthClient/guard) dan 6 e2e Supertest terhadap MySQL `attendance_test`.
- Gateway: 12 unit, 27 test kontrak HTTP (10 baru untuk departemen).
- Auth: 14 e2e MySQL, termasuk `/me` per request dan login tetap 429.
- hr-web: 20 Vitest/RTL (9 halaman departemen), Playwright layout terang/gelap 320-1440 px, journey HRD nyata (login → tambah → bentrok kode → ubah → nonaktif + konfirmasi → filter via URL + reload → aktifkan) desktop dan mobile melalui Gateway, Auth, Employee dan MySQL.
