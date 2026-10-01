# Progres bersama dan titik lanjut

Dokumen ini digunakan semua agen/alat pada repo lokal yang sama. Update saat mulai/selesai task, sebelum sesi berganti atau kapasitas sesi habis. Status completion tetap di [todo](todo.md); dependency di [plan](plan.md); prosedur pada [alur implementasi](../docs/development/implementation-workflow.md).

## Snapshot terakhir

- Tanggal: 2026-10-01 (Asia/Jakarta).
- Tahap: fondasi/Auth/HR login selesai; login HR didesain ulang (split-screen) sesuai revisi spec yang disetujui; T10 (master departemen) lapisan schema/migration selesai & terverifikasi offline, lapisan API/UI/test belum.
- Commit terbaru pada dev (sesi ini, berurutan):
  - 93488ae docs: record approved simplification, keep 5-service + 2-frontend structure
  - f423e47 feat: add employee department master schema and migration (T10)
  - aa34d48 docs: checkpoint T10 schema done, API/UI pending under memory constraint
  - 1b7b05d feat(hr-web): add access-help note to HR login per E01/H01 spec
  - e4a6782 docs: revise login spec - HR split-screen with form card, Attendance single-column
  - 83537f1 feat(hr-web): split-screen HR login with charcoal aside and form card
  - 112d7fa docs: define test cost/value tiers to speed the dev loop (plan + AGENTS)
  - HEAD awal sesi 94e386c. Verifikasi dengan git log; jangan anggap hash lama sebagai HEAD.
- Branch kerja: dev. Remote belum tersedia; push menunggu repository pilihan pengguna.
- KENDALA LINGKUNGAN AKTIF: host memory CRITICAL (~1 GB free, dispatch paused). Build Nest, prisma generate/client build, migrate apply dan E2E DITUNDA agar tidak OOM atau meninggalkan DB setengah ter-migrasi. Langkah ringan dijalankan sesi ini: edit file, `tsc --noEmit` (lulus), prisma validate/migrate diff offline, dan Playwright design suite `test:ui` (12/12 passed — satu run terbukti aman walau posture CRITICAL).
- Migration `20261001160000_employee_master_departments` BELUM diterapkan ke MySQL dev/test. `prisma migrate diff --from-migrations ... --to-schema ... --exit-code` = 0 (No difference) → SQL cocok dengan schema; aman diterapkan saat memory lega.
- Layanan/port aktif tidak diperiksa; verifikasi sebelum menjalankan stack.

## Satu pekerjaan aktif

| Task/subtask | Pemilik/sesi | Scope file | Dependensi | Proses/port | Status |
| --- | --- | --- | --- | --- | --- |
| T10 master departemen | sesi aktif (dev) | prisma/schema.prisma, prisma/migrations/20261001160000_employee_master_departments/, berikutnya apps/employee-service/, apps/api-gateway/, apps/hr-web/ | T09 (selesai) | employee-service port target 3002 (belum jalan) | Schema+migration selesai & commit (f423e47); migrate apply + API + UI + test TERTUNDA (memory CRITICAL) |

Isi satu baris saat mulai increment. Hanya satu agen aktif dan satu task/increment berjalan. Sebelum pindah, catat diff, proses/port dan langkah berikut; agen penerus memeriksa Git/source terlebih dahulu.

## Perubahan yang belum di-commit

Baca git status/diff sebagai sumber fakta. Commit revisi panduan dapat ditemukan melalui git log; agen berikut memeriksa Git, bukan menganggap semua perubahan lokal miliknya.

Folder .agents/, .claude/, .windsurf/ dan skills-lock.json merupakan berkas lokal yang sudah ada pada pemeriksaan; jangan men-stage, menghapus atau memodifikasinya tanpa scope yang jelas. Rahasia dan data pribadi tetap ignored.

## Bukti pemeriksaan

- Sebelumnya: Auth/Gateway/HR login memiliki hasil test pada task/runbook terkait; hasil tersebut bukan verifikasi ulang sesi ini.
- Sesi ini (2026-10-01): keputusan penyederhanaan diselaraskan ke AGENTS.md/plan.md/todo.md; aturan bisnis dan struktur 5-service+2-frontend dipertahankan; tautan dokumen diperiksa (semua resolve; packages/contracts & packages/config dicatat belum ada). Schema T10 ditambah (EmpDepartment, EmpAuditLog, enum EmpMasterStatus): `prisma validate` lulus (exit 0); migration SQL ditulis manual mengikuti konvensi auth; `prisma migrate diff --from-migrations --to-schema --exit-code` = 0 (No difference) → SQL cocok schema.
- Sesi ini — login HR redesign: atas keputusan pengguna, spec login direvisi (HR split-screen + kartu form; Attendance tetap satu kolom) di frontend-design-system.md, frontend-ui-ux.md (E01/H01), baseline.md, hr-auth-flow.md. Implementasi: AuthShell prop `aside` opsional (packages/ui), HR AuthLayout mengaktifkannya, CSS .auth-split/.auth-aside/.auth-card + responsif mobile, baris bantuan akses (E01/H01). `tsc --noEmit` lulus; Playwright design `test:ui` 12/12 passed (HR punya .auth-aside+.auth-card, Attendance tidak, no overflow 320/768/1024/1440). Screenshot HR 1440/320 ditinjau — split-screen desktop, satu kolom mobile.
- Sesi ini — kebijakan test tier: ditulis ke tasks/plan.md (tabel biaya vs nilai) dan AGENTS.md. Tier 1 statis wajib; Tier 3/4 (test:ui/test:e2e) hanya saat relevan/checkpoint. Bukti aturan bisnis tetap wajib. Nama script test:ui/test:e2e diverifikasi ada di apps/hr-web.
- TIDAK dijalankan sesi ini (memory CRITICAL): migrate apply ke MySQL, prisma generate/client build, Nest build, Vitest/RTL, Playwright E2E (test:e2e, API/MySQL nyata), layanan live, perangkat nyata. (Playwright design `test:ui` DIJALANKAN dan lulus 12/12.)

## Langkah berikut

Prasyarat: pastikan host memory sudah lega (jangan jalankan build/migrate saat posture CRITICAL). Lanjutkan T10 ujung ke ujung:

1. Terapkan migration: `pnpm db:generate` (prisma generate + build @attendance/database), lalu `pnpm db:migrate` (dev) dan `pnpm db:migrate:test` (schema test). Verifikasi tabel `emp_departments`/`emp_audit_logs` ada dan `pnpm db:verify` lulus. Pastikan akun runtime employee punya grant pada tabel emp_* (lihat scripts/database/setup-local.mjs; tambah grant bila belum ada).
2. employee-service (apps/employee-service/): tiru pola auth-service — EmployeeConfig (EMPLOYEE_DATABASE_URL, port 3002, origins), DatabaseModule/DatabaseService memakai createDatabaseClient, configureApp (ValidationPipe whitelist, Swagger /docs, request-id, SafeExceptionFilter), guard sesi/role ADMIN_HRD. Modul departments: controller GET/POST /departments, GET/PATCH /departments/:id, POST /departments/:id/activate dan /:id/deactivate; DTO validasi name/code; service dengan unik name/code (409), tidak hard-delete, audit ke emp_audit_logs. Pecah bila >5 file.
3. api-gateway (apps/api-gateway/): tambah EMPLOYEE_SERVICE_URL + proxy route /api/v1/departments* dan /api/v1/employees* (teruskan Authorization/JWT, tanpa menyimpan state). Tiru auth-proxy.service.ts/controller.ts.
4. hr-web (apps/hr-web/): halaman H11 Departemen — daftar (toolbar cari/status → tabel → pagination), form tambah/edit (dialog pendek), aksi aktif/nonaktif kontekstual, states loading/empty/error/busy/success. Pakai token+komponen packages/ui, HeroUI via MCP, Atomic Design, tema zinc + aksen emerald, Bahasa Indonesia. Selector penugasan baru hanya master aktif (relevan T11/T12).
5. Test terfokus: Jest/Supertest employee-service (unik name/code, otorisasi ADMIN_HRD, activate/deactivate, data dipakai tidak dihapus), Vitest/RTL hr-web (interaksi daftar/form), 1 Playwright journey HR kelola departemen dengan API/MySQL test nyata. Suite lengkap di checkpoint, bukan tiap langkah.
6. Review diff, stage file terkait saja, commit berprefix pada dev; update todo (centang T10 hanya dengan bukti) dan progress. Lalu lanjut T11 (jabatan) memakai pola yang sama.

Catatan: baseline peta API memakai /api/v1 base; employee-service bind 127.0.0.1 lokal, hanya Gateway yang publik. Jangan commit .env/rahasia/data pribadi. .agents/, .claude/, .kiro/, .windsurf/, skills-lock.json tetap untracked; jangan di-stage.

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
