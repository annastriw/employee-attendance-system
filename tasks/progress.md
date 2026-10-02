# Progres bersama dan titik lanjut

Dokumen ini digunakan semua agen/alat pada repo lokal yang sama. Update saat mulai/selesai task, sebelum sesi berganti atau kapasitas sesi habis. Status completion tetap di [todo](todo.md); dependency di [plan](plan.md); prosedur pada [alur implementasi](../docs/development/implementation-workflow.md).

## Snapshot terakhir

- Tanggal: 2026-10-02 (Asia/Jakarta). HEAD diverifikasi dengan `git log`; jangan anggap hash di sini sebagai HEAD.
- Tahap: T08-T13 selesai. T12 dan T13 browser manual pengguna lulus pada 2026-10-02. T13 unit/komponen, build/lint/typecheck dan visual lulus; batas suite otomatis dicatat. T14 A selesai dengan browser manual pengguna lulus; T14 B menjadi pekerjaan berikutnya. T09c tetap menjadi acuan tema.
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
- Database lokal (Docker MySQL 127.0.0.1:3307): migration sampai `20261002190000_employee_profile_email_changes` DITERAPKAN ke attendance_dev dan attendance_test. Akun `attendance_employee`/`attendance_employee_test` dibuat via `pnpm db:grants`; kredensial ada di `.env.database` (ignored).
- Host memory sering CRITICAL (1-2 GB). Jalankan suite berat satu per satu; Playwright 1 worker terbukti stabil.
- Pemeriksaan handoff 2026-10-02: hanya MySQL 127.0.0.1:3307 (PID 6672) ditemukan; tidak ada listener pada 3000/3001/3002/3003/3004/5173/5174. Tidak ada proses aplikasi yang dihentikan oleh agen. Port proyek: MySQL 3307, Gateway 3000, Auth 3001, Employee 3002, Attendance 5173, HR 5174.

## Satu pekerjaan aktif

| Task/subtask | Pemilik/sesi | Scope file | Dependensi | Proses/port | Status |
| --- | --- | --- | --- | --- | --- |
| T14 B — lifecycle/history/revokasi | Agen berikut, belum mulai | docs/sdd/employee-lifecycle.md lalu schema/Auth/Employee/Gateway/HR dan test terkait sesuai kontrak | T14 A selesai dan manual pengguna lulus | MySQL 3307 aktif; tidak ada service/frontend listener pada pemeriksaan handoff | Handoff pengguna; tulis kontrak B dari baseline/source, lalu satu putaran API+UI+test |

Isi satu baris saat mulai increment. Hanya satu agen aktif dan satu task/increment berjalan. Sebelum pindah, catat diff, proses/port dan langkah berikut; agen penerus memeriksa Git/source terlebih dahulu.

## Perubahan yang belum di-commit

Baca git status/diff sebagai sumber fakta. Folder .agents/, .claude/, .kiro/, .windsurf/ dan skills-lock.json adalah berkas lokal; jangan di-stage, dihapus atau diubah tanpa scope jelas. Rahasia dan data pribadi tetap ignored.

## Bukti pemeriksaan

- T14 A: edit profil dan email terpisah, history/audit profil atomik, email durable + receipt/revokasi/recovery diimplementasikan. Migration dev/test/grants dan diff schema exit 0; typecheck/lint/build package terdampak lulus. Auth 3 unit, Employee 9 unit, Gateway 51 kontrak, HR 14 komponen lulus. MySQL: 5 skenario lulus awal + 1 lulus rerun setelah perbaikan fixture port; visual 4/4 lulus dan screenshot ditinjau. Rincian/batas bukti dan checklist browser ada di [module spec T14](../docs/sdd/employee-lifecycle.md). Pengguna melaporkan checklist browser API nyata lulus pada 2026-10-02; A ditutup, B dan T14 keseluruhan tetap terbuka.

- Pelaksanaan per putaran disetujui pengguna (2026-10-02): fitur lengkap API+UI+test/dokumentasi dalam satu putaran, reuse T10–T13, polesan tambahan pada T28, baca konteks terkait saja, checklist browser sekali sesudah putaran lengkap, dan service seperlunya. T14 dibagi A edit profil/email, B lifecycle/history/revokasi. Perubahan dokumentasi diperiksa isi, tautan dan diff; test aplikasi tidak diulang.

- Revisi percepatan setelah T13 (2026-10-02): pengguna menyetujui E2E browser manual per fitur selama development, regresi browser otomatis sebelum rilis saat resource tersedia, test perilaku terfokus, visual hanya halaman berubah, suite repo hanya checkpoint relevan/rilis, satu commit per perubahan logis, serta dokumentasi ringkas/reuse tanpa refactor dini. Test lama dan bukti bisnis/keamanan/data nyata tetap wajib. Perubahan hanya dokumentasi; periksa isi/tautan/diff, tanpa mengulang test aplikasi.

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

1. **Lanjut T14 B lifecycle/history/revokasi.** A selesai dan pengguna melaporkan checklist manual lulus. Baca AGENTS, tier plan, todo T14, baseline lifecycle dan [module spec](../docs/sdd/employee-lifecycle.md). Tulis kontrak B sebelum coding: aktif/nonaktif/arsip/restore INACTIVE, history, NIK/email tetap dicadangkan, revokasi/login dan pemulihan lintas service; tentukan interaksi dengan email PENDING. Reuse implementasi A/T12, satu agen aktif, test terfokus; browser nyata manual sekali sesudah putaran lengkap.
2. Limit 429 E2E Auth tetap menunggu keputusan pengguna: refresh limit sendiri atau run per spec. Jangan longgarkan limit login. Run T11 per spec terpisah lulus; konfigurasi Auth tidak diubah.
3. T09c selesai dan menjadi acuan wajib semua halaman berikutnya: gunakan token/komponen packages/ui, HeroUI, zinc–emerald, Geist, Phosphor dan mode terang/gelap. Kontrak mencakup E01–E09/H01–H14, seluruh state/dialog/mobile; jangan kembali ke T09b monokrom.
4. Polesan H11 selesai bersama H12: (a) shared MasterDataPage menampilkan skeleton selama refetch sehingga baris lama tidak tampil bersama pesan sukses; test komponen dan E2E desktop/mobile menunggu baris hilang sesudah aktifkan pada filter Nonaktif. (b) pager tidak lagi memakai kelas monospace, diverifikasi computed font pada test visual. (c) status memakai satu ToggleButtonGroup berbatas dan separator HeroUI, screenshot terang/gelap ditinjau.

Catatan: E2E memakai service dari `dist`; jalankan `pnpm --dir apps/<service> run build` setelah mengubah backend. employee-service bind 127.0.0.1; hanya Gateway publik.
## Kendala dan kebutuhan eksternal

- Remote GitHub sudah tersedia; akses Vercel/VPS/Cloudflare dan tahap deployment masih menyusul.
- Tool resource_status tidak tersedia pada sesi ini; RAM OS sekitar 1,9 GB tersedia saat pemeriksaan T12. Suite berat tetap serial, Playwright 1 worker. Pengguna memilih verifikasi browser nyata secara manual karena batas RAM.
- Build HR lulus dengan warning ukuran chunk JS sekitar 679 kB; tidak menurunkan batas warning atau menambah tooling.
- Akses Vercel/VPS/Cloudflare dan instruksi promosi main belum tersedia pada snapshot; siapkan artefak independen dahulu.
- Detail teknis terbuka seperti threshold capture, batas foto/lokasi, presisi waktu dan outbox harus dituntaskan melalui spike/spec/test terkait.
- Suite visual HR lama masih memiliki assertion placeholder Attendance sebelum T13; belum dijalankan pada putaran A yang hanya memeriksa halaman terdampak. Selaraskan saat checkpoint regresi sebelum rilis.
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

## Handoff pengguna — 2026-10-02

- Pengguna meminta pindah agen karena token hampir habis; kapasitas token aktual tidak dibaca/diarang. T14 B belum diimplementasikan.
- Implementasi A: a7eec12, sudah dipush ke origin/dev. Penutupan manual A dicatat pada commit docs setelah ini; gunakan git log sebagai sumber HEAD.
- Diff sebelum handoff hanya dokumentasi penutupan A; setelah commit tidak ada perubahan proyek tertunda. Tooling lokal untracked tetap dibiarkan dan tidak di-stage.
- Backend dist/database generated current untuk A; rebuild backend yang berubah sebelum test integrasi B. Migration A dev/test dan grants telah diterapkan.
- Kebijakan percepatan tetap berlaku; jangan mengulang pemeriksaan A tanpa perubahan terkait. Limit refresh 429 tetap menunggu keputusan pengguna, jangan longgarkan login. Assertion placeholder Attendance pada suite visual HR lama perlu diselaraskan pada checkpoint regresi.
- Kendala alat sesi ini: exec normal gagal sandbox helper dan apply_patch menolak reparse point. File ditulis lewat PowerShell UTF-8 tanpa BOM; perintah scoped require_escalated lolos automatic review. Jangan mengklaim kendala pasti berlaku pada sesi baru.
