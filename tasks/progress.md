# Progres bersama dan titik lanjut

Dokumen ini digunakan semua agen/alat pada repo lokal yang sama. Update saat mulai/selesai task, sebelum sesi berganti atau kapasitas sesi habis. Status completion tetap di [todo](todo.md); dependency di [plan](plan.md); prosedur pada [alur implementasi](../docs/development/implementation-workflow.md).

## Snapshot terakhir

- Tanggal: 2026-10-02 (Asia/Jakarta). HEAD diverifikasi dengan `git log`; jangan anggap hash di sini sebagai HEAD.
- Tahap: T08-T13 selesai. T12 dan T13 browser manual pengguna lulus pada 2026-10-02. T13 unit/komponen, build/lint/typecheck dan visual lulus; batas suite otomatis dicatat. T14 adalah task berikutnya. T09c tetap menjadi acuan tema.
- Commit sesi ini pada dev (lama ke baru): 93488ae, f423e47, aa34d48, 1b7b05d, e4a6782, 83537f1, 112d7fa, a485480 (lihat git log), lalu:
  - c2f98fe docs: switch frontend theme to Linear-style zinc + emerald, Geist, Phosphor, light/dark
  - 36a24e4 feat(ui): Linear-style redesign with zinc + emerald, Geist, Phosphor and light/dark
  - f1ae4ac chore(db): add least-privilege employee runtime account for T10
  - fc662d0 feat(employee): department master API with admin guard, audit and MySQL e2e (T10)
  - 9790dd3 feat(gateway): route department API to Employee Service with path allowlist (T10)
  - bb3c6af feat(hr-web): H11 department list, form and status actions on real API (T10)
  - 20b53e0 fix(auth): give /auth/me its own rate limit for per-request service verification
  - d9738b1 test(hr-web): real-API department journey with Employee Service in the E2E stack
- Commit T13 pada dev: a51ddc2 (Auth client employee), 51bb3cb (HeroUI/test setup), 56f6a2a (E01), c5a8a2d (E02/home/guard dan tes alur), eb931ba (tes visual). Semua dipush ke origin/dev; baca git log untuk HEAD.
- Commit T11: 85143ce (schema/migration/grants), 73293bc (Employee API + unit/MySQL), c4da4dd (Gateway allowlist/kontrak), 49e4eb7 (filter aktif untuk penugasan), 2f46086 (H12/shared UI/selector/polesan H11), fbc034a (HRD nyata + assertion refetch). Penutupan T11: 0d33caf. Persetujuan T09c: b31ccc5. Kebijakan testing cepat: 7cd397f; baca git log sebagai sumber HEAD.
- Branch: dev, tracking origin/dev. Repository public [annastriw/employee-attendance-system](https://github.com/annastriw/employee-attendance-system) dipilih pengguna pada 2026-10-02. Push awal terverifikasi: lokal dan remote dev sama pada 7cd397f. Visibilitas PUBLIC diverifikasi melalui GitHub setelah instruksi pengguna; commit berikut dipush setelah verifikasi, deployment tetap tahap terakhir.
- Database lokal (Docker MySQL 127.0.0.1:3307): migration `20261001160000_employee_master_departments` dan `20261002080000_employee_master_positions` DITERAPKAN ke attendance_dev dan attendance_test. Akun `attendance_employee`/`attendance_employee_test` dibuat via `pnpm db:grants`; kredensial ada di `.env.database` (ignored).
- Host memory sering CRITICAL (1-2 GB). Jalankan suite berat satu per satu; Playwright 1 worker terbukti stabil.
- Pengguna melaporkan MySQL dan Auth/Employee/Gateway/HR web lokal berjalan untuk uji manual T12. Pemeriksaan terbaru tidak menemukan listener pada 3000/3001/3002/5173/5174; jalankan ulang bila menguji T13. Port proyek: MySQL 3307, Gateway 3000, Auth 3001, Employee 3002, Attendance 5173, HR 5174.

## Satu pekerjaan aktif

| Task/subtask | Pemilik/sesi | Scope file | Dependensi | Proses/port | Status |
| --- | --- | --- | --- | --- | --- |
| Penutupan T13 | Codex, 2026-10-02 | tasks/{todo,progress}.md, docs/sdd/employee-auth-flow.md, runbook lokal | Pengguna melaporkan langkah manual 1–5 lulus | Pengguna menjalankan stack untuk uji manual; proses belum diaudit ulang | T13 dan checkpoint ditutup; T14 siap, implementasi belum dimulai |

Isi satu baris saat mulai increment. Hanya satu agen aktif dan satu task/increment berjalan. Sebelum pindah, catat diff, proses/port dan langkah berikut; agen penerus memeriksa Git/source terlebih dahulu.

## Perubahan yang belum di-commit

Baca git status/diff sebagai sumber fakta. Folder .agents/, .claude/, .kiro/, .windsurf/ dan skills-lock.json adalah berkas lokal; jangan di-stage, dihapus atau diubah tanpa scope jelas. Rahasia dan data pribadi tetap ignored.

## Bukti pemeriksaan

- T13 frontend: Attendance typecheck/lint/build lulus; enam unit Auth client, tiga komponen E01, dan tiga alur App lulus. Playwright visual 12/12 lulus (E01/E02/home, 320/1440 px, terang/gelap, satu worker, sesi tiruan); screenshot ditinjau. Pengguna melaporkan browser API nyata langkah 1–5 lulus pada 2026-10-02: wajib ganti password, login ulang, reload/logout, role dan pemisahan sesi; lihat [Attendance lokal](../docs/deployment/attendance-local.md). T13 dan checkpoint ditutup. E2E otomatis dan seluruh suite monorepo tidak diulang karena RAM terbatas.

- T12 browser: pengguna melaporkan lima pemeriksaan manual desktop/mobile lulus pada 2026-10-02 (buat akun valid, password sementara sekali tampil, data bertahan tanpa membuka password lagi, konflik email tanpa data ganda, form/dialog 320 px). Spec Playwright desktop/mobile + harness/runbook di-commit dan dipush sebagai 9400f3a. Sintaks JS, HR typecheck/lint dan discovery dua skenario lulus; suite Playwright otomatis belum dijalankan karena RAM host sekitar 1,9 GB. Bukti backend MySQL dan visual T12 sebelumnya tetap berlaku; hasil otomatis tidak diklaim lulus.

- T12 UI: typecheck/lint dan 25 test terfokus HR (Employees 7, AuthClient 8, selector 6, App 4) lulus. Visual T12 8 test terang/gelap pada 320/768/1024/1440 lulus; daftar, H07, H10 dan koreksi email diperiksa, screenshot ditinjau. E2E nyata belum dijalankan pada increment UI ini.

- T12 integrasi backend: 7 test Auth–Employee–MySQL nyata lulus: concurrent/idempotensi, receipt atomik, recovery/revokasi, worker restart, response finalize hilang, master berubah/kompensasi, email unik/inactive dan internal signature/actor. Auth dist dibangun dahulu.

- T12 Gateway: typecheck/lint dan 45 kontrak HTTP lulus, termasuk route provisioning, header idempotensi, penolakan internal path/query/header palsu. Backend nyata belum diuji pada increment ini.

- T12 increment backend: schema/migration diterapkan dev/test, diff migrations→schema exit 0, grant milik service lulus/akses lintas service ditolak. Auth typecheck/lint + 6 unit; Employee typecheck/lint + 5 unit (tanggal kalender, idempotensi, timeout durable, lease dan actor) lulus. Integrasi MySQL lintas service/E2E menyusul saat fitur lengkap.

- GitHub tersedia: push awal dev diverifikasi hash lokal=remote (7cd397f); keputusan repository dicatat dan dipush pada 89aa568. T12 dimulai melalui [kontrak provisioning](../docs/sdd/employee-provisioning.md); belum ada perubahan runtime atau test T12. Dokumen diperiksa isi/tautan/diff.

- Revisi kebijakan testing (2026-10-02): AGENTS, plan, workflow, baseline dan design system diselaraskan dengan persetujuan pengguna. Verifikasi dokumentasi: isi/tautan lokal dan diff; test aplikasi tidak diulang karena tidak ada perubahan runtime.

- T11 selesai (rincian di docs/sdd/employee-positions.md): diff migrations→schema exit 0; migrate dev/test dan grants lulus. Employee typecheck/lint, 9 unit dan 12 API MySQL (6 departemen + 6 jabatan) lulus; tambahan filter ACTIVE jabatan 6 API lulus. Gateway typecheck/lint, 12 unit + 37 kontrak HTTP lulus. HR typecheck/lint, 38 Vitest/RTL lulus (satu worker), termasuk refetch dan selector aktif/nilai lama nonaktif. Visual 36 test lulus (H11/H12 terang/gelap 320/768/1024/1440; screenshot ditinjau). Backend Auth/Employee/Gateway dan HR build lulus. E2E jabatan nyata desktop/mobile 2 lulus; regresi departemen desktop/mobile 2 lulus, dijalankan terpisah. Cleanup: 0 fixture E2E jabatan/departemen/akun browser. Typecheck test E2E + pemeriksaan sintaks harness lulus.

- T09c redesign: tsc kedua frontend, Vitest auth, Playwright `test:ui` terang/gelap 320/768/1024/1440 px; screenshot ditinjau. E2E auth nyata telah lulus pada sesi sebelumnya; T09c disetujui pengguna pada 2026-10-02 dan dicentang. Audit source memastikan seluruh halaman tersedia memakai tema bersama; 36 test visual dan 38 komponen serta E2E jabatan/departemen dari T11 menjadi bukti terbaru. Tidak ada perubahan runtime untuk penegasan tema ini.
- T10 (rincian di docs/sdd/employee-departments.md):
  - Employee: 5 unit + 6 e2e Supertest terhadap MySQL attendance_test (auth/role, unik case-insensitive 409, validasi, nonaktif tanpa hapus, audit per perubahan, filter/pagination). Lint 0.
  - Gateway: 12 unit + 27 kontrak HTTP (allowlist path/query, header dibuang, 503 khusus Employee). Lint 0.
  - Auth: 14 e2e MySQL (termasuk `/me` per request, login tetap 429), 6 unit.
  - hr-web: 20 Vitest/RTL, Playwright layout departemen terang/gelap 4 viewport (aksi wajib terlihat penuh), E2E nyata `hr-departments.spec.ts` desktop+mobile lulus; data test dibersihkan (0 baris tersisa).
- Kendala test yang diketahui: menjalankan `hr-auth.spec.ts` dan `hr-departments.spec.ts` dalam satu run memicu limit 10/menit pada login/refresh Auth (429) di project kedua. Run terpisah lulus. Lihat langkah berikut.

## Langkah berikut

1. **T14 perubahan dan lifecycle karyawan.** T13 beserta checkpoint selesai setelah pengguna melaporkan langkah browser manual 1–5 lulus. Baca baseline, todo, dan kontrak provisioning sebelum implementasi edit/email/nonaktif/arsip/restore, history dan revokasi. Pengguna sedang meminta saran penghematan proses; kebijakan test belum diubah. Spec Playwright T12 otomatis tetap belum dijalankan karena RAM terbatas.
2. Limit 429 E2E Auth tetap menunggu keputusan pengguna: refresh limit sendiri atau run per spec. Jangan longgarkan limit login. Run T11 per spec terpisah lulus; konfigurasi Auth tidak diubah.
3. T09c selesai dan menjadi acuan wajib semua halaman berikutnya: gunakan token/komponen packages/ui, HeroUI, zinc–emerald, Geist, Phosphor dan mode terang/gelap. Kontrak mencakup E01–E09/H01–H14, seluruh state/dialog/mobile; jangan kembali ke T09b monokrom.
4. Polesan H11 selesai bersama H12: (a) shared MasterDataPage menampilkan skeleton selama refetch sehingga baris lama tidak tampil bersama pesan sukses; test komponen dan E2E desktop/mobile menunggu baris hilang sesudah aktifkan pada filter Nonaktif. (b) pager tidak lagi memakai kelas monospace, diverifikasi computed font pada test visual. (c) status memakai satu ToggleButtonGroup berbatas dan separator HeroUI, screenshot terang/gelap ditinjau.

Catatan: E2E memakai service dari `dist`; jalankan `pnpm --dir apps/<service> run build` setelah mengubah backend. employee-service bind 127.0.0.1; hanya Gateway publik.
## Kendala dan kebutuhan eksternal

- Remote GitHub sudah tersedia; akses Vercel/VPS/Cloudflare dan tahap deployment masih menyusul.
- Tool resource_status tidak tersedia pada sesi ini; RAM OS sekitar 1,9 GB tersedia saat pemeriksaan T12. Suite berat tetap serial, Playwright 1 worker. Pengguna memilih verifikasi browser nyata secara manual karena batas RAM.
- Build HR lulus dengan warning ukuran chunk JS sekitar 650 kB; tidak menurunkan batas warning atau menambah tooling.
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
