# Modul SDD — Validasi Integrasi dan CI (T29)

Dokumen ini mendefinisikan spesifikasi arsitektur pengujian integrasi, isolasi lingkungan uji, dan otomasi quality gate CI (Continuous Integration) untuk monorepo sistem absensi karyawan.

## 1. Tujuan dan Ruang Lingkup

Memastikan tidak ada kode yang masuk ke branch `dev` maupun `main` tanpa melewati verifikasi statis, pengujian unit, integritas skema database, integrasi layanan nyata terhadap database/storage terisolasi, serta pengujian visual/E2E antarmuka.

Ruang lingkup mencakup:
1. **Quality Gate Statis**: Linting (oxlint pada NestJS, eslint pada React), typechecking TypeScript (`tsc`), validasi skema Prisma (`prisma validate`).
2. **Build Verifikasi**: Kompilasi distribusi TypeScript pada 5 backend NestJS (`api-gateway`, `auth-service`, `employee-service`, `attendance-service`, `media-service`) dan production build bundling pada 2 frontend React (`attendance-web`, `hr-web`).
3. **Pengujian Unit & Komponen**: 344+ unit/komponen tests lintas `@attendance/database`, web apps, dan backend services.
4. **Isolasi Integrasi Backend (MySQL & MinIO)**:
   - Database terisolasi `attendance_test` pada port `127.0.0.1:3307`.
   - Object storage privat terisolasi `attendance-photos-test` pada port `127.0.0.1:9000`.
   - Penerapan migrasi otomatis (`prisma migrate deploy --config prisma.test.config.ts`).
   - Penegakan hak akses least-privilege per-service (`scripts/ci/setup-ci-environment.mjs --grants`).
   - Verifikasi runtime, UTC, constraint, foreign keys, dan rollback (`scripts/database/verify.ts`).
5. **Otomasi CI (GitHub Actions)**: Revisi 2026-10-03: push semua branch, PR fitur ke dev dan PR dev repository sendiri ke main. Job branch-policy menegakkan alur; hasil `CI result` wajib sukses seluruh gate. CI tidak deploy. Satu production main tanpa deployment dev/preview mengikuti [workflow CI/CD](../development/ci-cd-workflow.md); CD T30 belum aktif.

---

## 2. Arsitektur Pipeline CI

```
Push semua branch / PR (fitur → dev, dev → main)
       │
       ▼ Branch policy → quality → integration → visual-e2e → CI result
       │
       ├───► Job: quality (Ubuntu 24.04, Node 24, pnpm 10.28)
       │     ├─ pnpm run lint (oxlint 5 services + eslint 2 frontends)
       │     ├─ pnpm run db:validate (Prisma schema check)
       │     ├─ pnpm run db:generate (Prisma client dan paket database)
       │     ├─ pnpm run db:typecheck (TypeScript verify check)
       │     ├─ pnpm run build (Semua dist backend & bundling frontend)
       │     └─ pnpm run test (Unit tests seluruh monorepo)
       │
       ├───► Job: integration (MySQL 8.4.11 :3307 + AIStor Free :9000)
       │     ├─ pnpm run db:generate
       │     ├─ pnpm run build
       │     ├─ pnpm run ci:setup (Database, users & bucket init)
       │     ├─ pnpm run storage:setup (Akun Media terbatas dev/test)
       │     ├─ pnpm run db:migrate + db:migrate:test (Schema dev/test)
       │     ├─ pnpm run ci:grants (Table privileges to runtime users)
       │     ├─ pnpm run db:verify (Constraints, audit protection & UTC)
       │     ├─ auth-service test:e2e (14 tests)
       │     ├─ employee-service test:e2e (35 tests)
       │     ├─ media-service test:e2e (20 tests)
       │     ├─ attendance-service test:e2e (64 tests)
       │     └─ api-gateway test:e2e (76 tests)
       │
       └───► Job: visual-e2e (Playwright Chromium)
             ├─ hr-web test:ui (Layout & design 320/1440px light/dark)
             └─ attendance-web test:ui (Layout & design 320/1440px light/dark)
```

---

## 3. Isolasi Lingkungan Uji

Revisi konfigurasi 2026-10-03: storage CI menggunakan Compose AIStor Free yang dipin proyek, bukan MinIO Community. Repository secret `AISTOR_CI_LICENSE` wajib tersedia dan valid untuk lingkungan uji; job gagal eksplisit jika tidak ada. Migrations diterapkan ke database disposable dev dan test sebelum grants/verify. Diagram job di atas menjelaskan isi job; job berat berjalan serial. Hasil lokal T29 tidak membuktikan Actions terbaru sudah lulus.

### 3.1. Database Testing Terisolasi (`attendance_test`)
- Koneksi pengujian menggunakan port standar `127.0.0.1:3307`.
- Skema terpisah `attendance_test` dijamin tidak bercampur dengan `attendance_dev` atau `attendance_shadow`.
- Skrip migrasi test dikunci oleh assertion keamanan di `prisma.test.config.ts`:
  ```typescript
  if (url.hostname !== "127.0.0.1" || url.port !== "3307" || url.pathname !== "/attendance_test") {
    throw new Error("Test migrations must target the isolated local attendance_test database.");
  }
  ```
- Akun runtime least-privilege:
  - `attendance_auth_test`: Akses hanya tabel auth (`auth_accounts`, `auth_sessions`, `auth_provisioning`, `auth_email_changes`, `auth_password_resets`, append-only `auth_audit_logs`).
  - `attendance_employee_test`: Akses hanya tabel master & profil karyawan (`emp_departments`, `emp_positions`, `emp_employees`, `emp_provisioning`, `emp_email_changes`, `emp_lifecycle_changes`, `emp_audit_logs`, `emp_employee_history`).
  - `attendance_media_test`: Akses hanya tabel metadata foto (`media_objects`, append-only `media_audit_logs`).
  - `attendance_attendance_test`: Akses hanya tabel absensi (`att_work_policies`, `att_daily_records`, `att_events`, `att_idempotency_requests`, `att_outbox`, `att_holidays`, `att_audit_logs`).
  - `attendance_migrator`: Akses penuh DDL untuk eksekusi migrasi skema.

### 3.2. Object Storage Testing Terisolasi (`attendance-photos-test`)
- Bucket `attendance-photos-test` terisolasi pada `127.0.0.1:9000`.
- Akun pengujian `attendance-media-test` dibatasi oleh kebijakan IAM eksplisit hanya dapat menulis dan membaca objek dengan prefiks `arn:aws:s3:::attendance-photos-test/attendance/*`.

---

## 4. Skrip Eksekusi Lokal & CI

Tersedia perintah berikut pada root `package.json`:
- `pnpm run validate`: Menjalankan rantai validasi statis lokal (lint -> db:validate -> db:typecheck -> build -> unit test).
- `pnpm run ci:setup`: Mempersiapkan database, users, dan MinIO bucket secara deterministik.
- `pnpm run ci:grants`: Menerapkan hak akses least-privilege pada tabel-tabel di `attendance_test`.
- `pnpm run db:verify`: Menguji koneksi Prisma, zona waktu UTC, constraint email/token unik, reservasi akun arsip, dan proteksi append-only audit log.

---

## 5. Kriteria Penerimaan (Acceptance Criteria)

1. Pipeline CI terdefinisi pada `.github/workflows/ci.yml` dan tervalidasi sintaksnya.
2. Seluruh quality gates (lint, typecheck, prisma schema validation, production build) lulus 100% tanpa error.
3. Seluruh unit tests (344 tests) lulus 100%.
4. Seluruh suite integrasi backend (209 tests lintas 5 service) lulus 100% terhadap MySQL dan MinIO.
5. Konfigurasi Playwright mendukung eksekusi headless di lingkungan CI (`channel: process.env.CI ? undefined : "chrome"`).
6. Lingkungan pengujian terisolasi penuh dari database dev/produksi.
