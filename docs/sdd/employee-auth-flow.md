# Login karyawan (T13, layar E01/E02) — DRAF

> Status: draf disiapkan sambil menunggu verifikasi E2E T12. Belum diimplementasikan; belum ada bukti acceptance. Jangan centang T13 sampai bukti nyata ada.

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

> Yang perlu dicek saat implementasi: apakah `employee/login` sudah menerbitkan cookie refresh ber-nama/panel `employee` yang berbeda dari admin. Jika Auth belum memisahkan nama cookie admin vs employee, itu satu-satunya kemungkinan perubahan backend kecil pada T13 (bukan schema).

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

## Verifikasi (rencana, tier test plan.md)
- Tier 1: `tsc`/lint `apps/attendance-web`.
- Tier 2: Vitest/RTL `auth-client` employee (login, accept menolak non-EMPLOYEE, restore, 401 clear, forced-change) dan komponen E01/E02 (validasi, toggle, forced-change, no secret di DOM).
- Tier 3: `test:ui` E01/E02/home terang+gelap 320/768/1024/1440 px bila layout/CSS berubah.
- Tier 4 (checkpoint): Playwright E2E nyata (Gateway+Auth+MySQL test) — login → forced change → login ulang → home → logout; desktop/mobile/keyboard; cookie employee ≠ admin. Build dist Auth/Gateway sebelum E2E; satu worker; data uji dibersihkan.

## Dependencies
T12 (provisioning akun karyawan) harus hijau: tanpa akun karyawan + `mustChangePassword`, E2E login karyawan tidak punya subjek nyata. Draf ini disiapkan paralel; implementasi mulai setelah T12 terverifikasi.
