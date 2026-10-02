# Login karyawan (T13, layar E01/E02)

> Status: T13 selesai. Frontend lolos pemeriksaan komponen, build, lint, serta visual. Pengguna melaporkan langkah manual 1–5 melalui Gateway/Auth/MySQL nyata lulus pada 2026-10-02.

Acuan: [baseline](../requirements/baseline.md), [Auth Service](auth-service.md), [Auth database](auth-database.md), [HRD auth flow](hr-auth-flow.md) sebagai pola, [UI/UX E01](frontend-ui-ux.md), [design system](frontend-design-system.md).

## Scope
Panel login karyawan sendiri di **Attendance Portal** (`apps/attendance-web`): login email/password peran `EMPLOYEE` melalui Gateway, wajib ganti password awal sebelum masuk home, dan sesi dibatasi peran. CRUD absensi, kamera dan lokasi **bukan** bagian T13 (menyusul T16+). Home karyawan pada fase ini adalah layar jujur: belum ada data absensi, hanya identitas + Keluar.

## Database — tidak ada schema baru
`accounts` dan `sessions` sudah mendukung peran `EMPLOYEE` (lihat [auth-database](auth-database.md)): `role ENUM(ADMIN_HRD, EMPLOYEE)`, `must_change_password`, `employee_id` logis lintas service. Endpoint backend `POST /api/v1/auth/employee/login`, `/me`, `/change-password`, `/logout`, `/refresh` **sudah ada** sejak T08c/T08d. T13 **tidak menambah tabel/migration**; akun karyawan diterbitkan oleh provisioning T12 dengan `must_change_password = true`.

## Kontrak backend (sudah ada, dipakai ulang)
- `POST /auth/employee/login` body email/password tervalidasi; email trim/lowercase, password tidak di-trim. 401 generik untuk password salah, salah panel (akun HRD coba login karyawan), nonaktif/arsip.
- Response hanya `accessToken`, `expiresIn`, dan profil aman (`id`, `email`, `employeeId`, `role: "EMPLOYEE"`, `mustChangePassword`). Tidak ada hash/token.
- Refresh cookie HttpOnly **terpisah dari admin** (panel `employee`); `/refresh` body `{ panel: "employee" }`. Rotasi atomik; login/refresh rate limit 10/menit/IP.
- `/me`, `/change-password`, `/logout` tetap tersedia saat `mustChangePassword=true`. Guard bisnis menolak restricted session sampai password diganti.
- Ganti password: wajib password lama, baru 12–72 byte, berbeda dari lama; mencabut seluruh sesi dan meminta login ulang.

> Terverifikasi di source (`apps/auth-service/src/auth/auth.controller.ts`): cookie refresh **sudah terpisah per peran** — `cookieName(role)` menghasilkan `auth_refresh_admin` vs `auth_refresh_employee` (prefiks `__Host-` pada production; path `/api/v1/auth` pada dev). `employee/login` mengembalikan HTTP 200, dan `RefreshDto` memvalidasi `panel: 'admin' | 'employee'`. **Kesimpulan: T13 tidak perlu perubahan backend sama sekali** — murni frontend `apps/attendance-web`.

## Frontend — yang dibangun vs dipakai ulang
Dipakai ulang dari `packages/ui`: `theme.css` (token zinc/emerald, terang/gelap), `AuthShell`, `PortalBrand`, komponen HeroUI. Pola klien disalin dari `apps/hr-web/src/lib/auth-client.ts`.

Baru di `apps/attendance-web`:
- `src/lib/auth-client.ts` — varian employee: `login` → `employee/login`, `restore`/`refresh` → `{ panel: "employee" }`, tipe `EmployeeUser` dengan `role: "EMPLOYEE"`, `accept()` menolak selain `EMPLOYEE` (403 "Akun ini tidak memiliki akses ke portal karyawan."). Satu promise `restoring` bersama (anti rotasi ganda React StrictMode). Access token hanya di memori; tanpa localStorage/sessionStorage/URL/log.
- `src/pages/LoginPage.tsx` (E01) — form satu kolom terpusat maks 368 px, **tanpa panel samping/kartu** (beda dari HR split-screen): Attendance Portal, Masuk, email, password, toggle password dapat diakses keyboard, tombol Masuk. Bantuan akses mengarahkan ke HR; tidak ada reset mandiri/email otomatis.
- `src/pages/ChangePasswordPage.tsx` (E02) — wajib saat `mustChangePassword`; menjelaskan login ulang, konfirmasi harus sama, pesan sukses.
- `src/pages/HomePage.tsx` — home jujur: identitas karyawan + Keluar; belum ada data absensi (bukan angka nol palsu).
- Routing hash (`use-hash-route`) + guard: restore saat buka halaman; `mustChangePassword` → paksa E02; 401 pada endpoint terlindungi → hapus token lokal + minta login; gangguan jaringan ≠ password salah; tanpa retry otomatis mutasi.

## Design contract (E01)
Satu tindakan utama, label terlihat, toggle password keyboard-accessible, busy/error/success terbaca screen reader. Tema netral zinc aksen emerald, mode terang/gelap. **Satu kolom terpusat di semua lebar** (Attendance dipakai utama di ponsel; tidak split-screen — keputusan 2026-10-02). Mengikuti [design system](frontend-design-system.md) dan [UI/UX](frontend-ui-ux.md).

## Acceptance
- Karyawan login via Gateway; akun `mustChangePassword` wajib E02 sebelum home; setelah ganti password sesi dicabut dan login ulang.
- Akun HRD yang login di panel karyawan ditolak (403/401 generik, pesan sama tak membocorkan sebab).
- Sesi dibatasi peran `EMPLOYEE`; cookie refresh karyawan terpisah dari admin (login HRD di tab lain tidak saling mencabut).
- Tidak ada token/password di storage, URL, atau log.

## Verifikasi (tier test plan.md)
- Tier 1: Typecheck, lint, dan build `apps/attendance-web` lulus.
- Tier 2: Enam test unit `auth-client`, tiga test komponen `LoginPage`, dan tiga test alur `App` lulus. Alur mencakup wajib ganti password, validasi konfirmasi, login ulang, guard tautan langsung, pemulihan sesi, 401, dan logout.
- Tier 3: Dua belas test Playwright visual E01/E02/home pada 320/1440 px, terang/gelap, lulus dengan satu worker dan respons sesi tiruan. Screenshot E01, E02 mobile, dan home desktop ditinjau. Pemeriksaan visual ini tidak membuktikan API nyata.
- Tier 4 (checkpoint): pengguna melaporkan seluruh langkah 1–5 dalam [panduan Attendance lokal](../deployment/attendance-local.md) lulus pada 2026-10-02: desktop/mobile, login akun hasil T12, guard wajib E02, konfirmasi password, login ulang dengan password baru, penolakan password lama, home, reload, logout, penolakan akun HRD, serta pemisahan sesi HRD/karyawan. Suite E2E otomatis tidak dijalankan karena RAM host terbatas; hasil manual tidak diklaim sebagai hasil Playwright.

## Dependencies
T12 (provisioning akun karyawan) sudah ditutup berdasarkan integrasi MySQL dan pemeriksaan browser manual pengguna. Akun hasil T12 dengan `mustChangePassword` dipakai untuk checkpoint T13.
