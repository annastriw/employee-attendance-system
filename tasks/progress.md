# Progres bersama dan titik lanjut

Dokumen ini digunakan semua agen/alat pada repo lokal yang sama. Update saat mulai/selesai task, sebelum sesi berganti atau kapasitas sesi habis. Status completion tetap di [todo](todo.md); dependency di [plan](plan.md); prosedur pada [alur implementasi](../docs/development/implementation-workflow.md).

## Snapshot terakhir

- Tanggal: 2026-10-02 (Asia/Jakarta). HEAD diverifikasi dengan `git log`; jangan anggap hash di sini sebagai HEAD.
- Tahap: T08-T10 selesai. Redesign visual ala Linear (T09c) selesai kecuali E2E checkpoint; T10 master departemen selesai ujung ke ujung dengan bukti nyata.
- Commit sesi ini pada dev (lama ke baru): 93488ae, f423e47, aa34d48, 1b7b05d, e4a6782, 83537f1, 112d7fa, a485480 (lihat git log), lalu:
  - c2f98fe docs: switch frontend theme to Linear-style zinc + emerald, Geist, Phosphor, light/dark
  - 36a24e4 feat(ui): Linear-style redesign with zinc + emerald, Geist, Phosphor and light/dark
  - f1ae4ac chore(db): add least-privilege employee runtime account for T10
  - fc662d0 feat(employee): department master API with admin guard, audit and MySQL e2e (T10)
  - 9790dd3 feat(gateway): route department API to Employee Service with path allowlist (T10)
  - bb3c6af feat(hr-web): H11 department list, form and status actions on real API (T10)
  - 20b53e0 fix(auth): give /auth/me its own rate limit for per-request service verification
  - d9738b1 test(hr-web): real-API department journey with Employee Service in the E2E stack
- Branch: dev. Remote belum ada; push menunggu repository pilihan pengguna.
- Database lokal (Docker MySQL 127.0.0.1:3307): migration `20261001160000_employee_master_departments` DITERAPKAN ke attendance_dev dan attendance_test. Akun `attendance_employee`/`attendance_employee_test` dibuat via `pnpm db:grants`; kredensial ada di `.env.database` (ignored).
- Host memory sering CRITICAL (1-2 GB). Jalankan suite berat satu per satu; Playwright 1 worker terbukti stabil.
- Tidak ada proses/port yang dibiarkan berjalan; stack E2E dimatikan Playwright setelah test.

## Satu pekerjaan aktif

| Task/subtask | Pemilik/sesi | Scope file | Dependensi | Proses/port | Status |
| --- | --- | --- | --- | --- | --- |
| T11 master jabatan | belum dimulai | apps/employee-service/, apps/api-gateway/, apps/hr-web/, prisma/ | T10 (selesai) | employee 3002, gateway 3000, auth 3001 | Siap dikerjakan |

Isi satu baris saat mulai increment. Hanya satu agen aktif dan satu task/increment berjalan. Sebelum pindah, catat diff, proses/port dan langkah berikut; agen penerus memeriksa Git/source terlebih dahulu.

## Perubahan yang belum di-commit

Baca git status/diff sebagai sumber fakta. Folder .agents/, .claude/, .kiro/, .windsurf/ dan skills-lock.json adalah berkas lokal; jangan di-stage, dihapus atau diubah tanpa scope jelas. Rahasia dan data pribadi tetap ignored.

## Bukti pemeriksaan

- T09c redesign: tsc kedua frontend, Vitest auth, Playwright `test:ui` terang/gelap 320/768/1024/1440 px; screenshot ditinjau. Belum dicentang di todo sampai E2E checkpoint; E2E auth nyata sudah lulus pada run 2026-10-02 (lihat di bawah), jadi T09c dapat dicentang setelah ditinjau ulang.
- T10 (rincian di docs/sdd/employee-departments.md):
  - Employee: 5 unit + 6 e2e Supertest terhadap MySQL attendance_test (auth/role, unik case-insensitive 409, validasi, nonaktif tanpa hapus, audit per perubahan, filter/pagination). Lint 0.
  - Gateway: 12 unit + 27 kontrak HTTP (allowlist path/query, header dibuang, 503 khusus Employee). Lint 0.
  - Auth: 14 e2e MySQL (termasuk `/me` per request, login tetap 429), 6 unit.
  - hr-web: 20 Vitest/RTL, Playwright layout departemen terang/gelap 4 viewport (aksi wajib terlihat penuh), E2E nyata `hr-departments.spec.ts` desktop+mobile lulus; data test dibersihkan (0 baris tersisa).
- Kendala test yang diketahui: menjalankan `hr-auth.spec.ts` dan `hr-departments.spec.ts` dalam satu run memicu limit 10/menit pada login/refresh Auth (429) di project kedua. Run terpisah lulus. Lihat langkah berikut.

## Langkah berikut

1. T11 master jabatan: pola sama dengan T10 (schema `emp_positions` + migration via `prisma migrate diff`, grant di setup-local.mjs, modul positions di Employee, route di Gateway dengan allowlist, layar H12 memakai ulang ConfirmDialog/StatusBadge/pola daftar). Acceptance tambahan: selector penugasan tidak menawarkan master nonaktif (relevan T12).
2. Putuskan perbaikan limit 429 E2E: beri `refresh` limit sendiri di Auth (mirip `/me`) atau pisahkan run E2E per spec. Jangan longgarkan limit login.
3. Tinjau dan centang T09c bila screenshot + E2E dinilai cukup.
4. Polesan H11 (pengguna menyetujui tampilan 2026-10-02; kerjakan bersama H12 karena memakai pola daftar yang sama): (a) screenshot E2E mobile menampilkan baris "Nonaktif" di filter Nonaktif sesudah pesan "diaktifkan kembali" (desktop benar, daftar kosong). Pastikan apakah race pada `refresh()` atau screenshot diambil sebelum refetch; tambahkan assertion daftar terbarui. (b) teks pager "1-1 dari 1" jatuh ke font monospace, seharusnya Geist. (c) filter status belum tampil sebagai satu grup.

Catatan: E2E memakai service dari `dist`; jalankan `pnpm --dir apps/<service> run build` setelah mengubah backend. employee-service bind 127.0.0.1; hanya Gateway publik.
## Kendala dan kebutuhan eksternal

- Remote GitHub belum ditentukan.
- Akses Vercel/VPS/Cloudflare dan instruksi promosi main belum tersedia pada snapshot; siapkan artefak independen dahulu.
- Detail teknis terbuka seperti threshold capture, batas foto/lokasi, presisi waktu dan outbox harus dituntaskan melalui spike/spec/test terkait.
- Tidak ada keputusan tambahan pengguna yang diperlukan untuk meneruskan task rutin dalam scope saat ini.

## Format update sesi berikut

- Waktu/sesi dan task:
- Selesai + commit:
- Sedang dikerjakan + pemilik/file:
- Diff belum di-commit:
- Proses/port:
- Verification dijalankan + hasil:
- Kendala nyata:
- Langkah berikut + dependency:
- Trigger pergantian bila sesi mendekati batas:
