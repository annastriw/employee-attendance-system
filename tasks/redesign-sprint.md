# Sprint Redesain — Overhaul UI/UX dua portal (versi gabungan)

> **Sumber kebenaran** redesain. Ditulis agar agen mana pun (kiro CLI / sesi lain)
> bisa melanjutkan tanpa transkrip. Mendampingi [plan.md](plan.md), [todo.md](todo.md),
> [progress.md](progress.md); mengevolusikan
> [frontend-design-system.md](../docs/sdd/frontend-design-system.md) dan
> [frontend-ui-ux.md](../docs/sdd/frontend-ui-ux.md). Revisi 2026-10-05 (gabungan R + X).

## 0. Cara memakai dokumen ini (WAJIB dibaca agen baru)

1. `git fetch; git status -sb; git log --oneline -10` — HEAD/branch aktual adalah
   kebenaran. Harus di `dev`, tree bersih (abaikan `.agents/ .claude/ .kiro/ .windsurf/`).
2. Baca bagian 1–4 dokumen ini, lalu entri teratas [progress.md](progress.md).
3. Ambil **task pertama berstatus `[ ]`** di bagian 6, kerjakan sampai DoD terpenuhi.
4. Commit + push `dev`, centang task, tulis entri progress, lanjut task berikutnya.
5. Bila sesi/token hampir habis: selesaikan langkah aman terakhir, commit yang sudah
   hijau, catat `Lanjut:` di progress (task, langkah, file), berhenti. Jangan commit
   kode setengah jadi yang rusak build.

## 1. Arah terkunci

- **Gaya**: Refine Linear × GitHub/Primer — netral zinc tegas, aksen tunggal **emerald**,
  Geist, ikon Phosphor, terang/gelap/sistem (R00). Dials VARIANCE 4 / MOTION 4 / DENSITY 5.
- **Dua karakter satu bahasa**: HR = padat ala GitHub repo view; Karyawan = lapang
  mobile-first. Token/aksen/tipografi bersama di `packages/ui`.
- **Komponen**: HeroUI v3.2.6 untuk semua UI. **Pengecualian disetujui**: chart memakai
  pola **shadcn/ui chart** (Recharts + `ChartContainer`/tooltip/legend) yang disalin ke
  `packages/ui` dan diwarnai token kita. Selain chart, jangan menambah library UI lain.
- **Atomic Design** + struktur rapi (bagian 4). Motion terukur, hormati `prefers-reduced-motion`.

## 2. Keputusan pengguna (2026-10-05) — jangan ditanyakan ulang

| # | Topik | Keputusan |
| --- | --- | --- |
| D1 | Bug runtime | Pengguna mengirim console/Network error bila diminta; agen beri instruksi cek spesifik. |
| D2 | Chart | shadcn chart (Recharts). Dua chart di Ringkasan: **tren kehadiran harian** (rentang) + **donut hadir/terlambat/belum hadir hari ini**. Backend boleh ditambah. |
| D3 | Sidebar | Collapsible **rail ikon** di desktop + **Drawer** di mobile/tablet; state tersimpan `localStorage`. |
| D4 | Profil | Tiap role punya halaman Profil: **lihat data diri (read-only) + ganti password**. Tidak ada edit data profil oleh diri sendiri (revisi pengguna 2026-10-05: "cukup ubah password, itu yang penting"). |
| D5 | Rentang tanggal | HeroUI `DateRangePicker` + preset Hari ini / 7 hari / 30 hari / Bulan ini; default **30 hari terakhir** (list). Ringkasan default hari ini. |
| D6 | Search | Trigger saat ketik, debounce **300 ms**, tanpa tombol Cari; kosong = semua. |
| D7 | Backend | Boleh diubah. **Langsung push `dev` + beri tahu pengguna** (sebut service, endpoint, migration bila ada). Pengguna PR ke `main` lalu cek di production. |
| D8 | "Tanpa iterasi" | Tiap task diserahkan utuh (build/lint/test hijau). Penyesuaian rasa dari pengguna = finishing normal, bukan task gagal. |
| D9 | Testing | Manual oleh pengguna. Agen: typecheck/build + lint + unit untuk logika murni berubah (bagian 5). Tanpa Playwright/E2E/screenshot. |
| D10 | Edit profil | Tidak ada (lihat D4). Data profil tetap dikelola HR sesuai baseline — tidak perlu ubah baseline. |
| D11 | Layar fixed, tanpa zoom — SEMUA layar | App shell fixed (`100dvh`, header/sidebar/bottom-nav tetap, konten scroll di dalam area), responsif desktop/tablet/mobile. **Zoom diblokir di semua ukuran layar**: pinch/double-tap (mobile/tablet), auto-zoom input iOS, dan shortcut zoom desktop (Ctrl/⌘ `+` `-` `=` `0`, Ctrl/⌘+wheel, trackpad pinch). Detail di bagian 4 "Layar fixed". |
| D12 | Proporsional & kompak | Tombol, input, tabel, kartu, ikon, judul **tidak besar** — skala kompak ala GitHub/Linear. Token ukuran di bagian 4 "Skala kompak" wajib dipakai semua halaman kedua portal. |

## 3. Halaman Profil (D4/D10)

Data profil dimiliki HR (`docs/requirements/baseline.md` §profil) — tidak berubah.
- **Karyawan**: lihat nama, NIK, email, telepon, departemen, jabatan, tanggal mulai,
  status (read-only) + **Ganti password** (password lama + baru + konfirmasi, aturan
  kekuatan sama dengan ChangePasswordPage; sukses → logout & login ulang).
- **HR (ADMIN_HRD, `employeeId` bisa null)**: lihat email + role (dan data karyawan
  bila punya `employeeId`) + Ganti password, perilaku sama.
- Tidak ada form edit data diri; perubahan data minta ke HR (tulis satu baris petunjuk).

## 4. Konvensi

### Struktur per portal
```
src/
  components/{atoms,molecules,organisms,templates}/
  pages/            # satu file per halaman (+ .test.tsx bila ada logika)
  routes/           # route table, guard, wrapper route
  lib/              # client API, hooks, util murni (*.ts)
  styles/           # css per area; index.css hanya import + base
```
- Lintas-portal → `packages/ui/src/{atoms,molecules,organisms,templates,charts,theme}`.
- Logika murni di `*.ts` terpisah dari `*.tsx` (fast-refresh + test mudah).
- Satu komponen satu tanggung jawab; jangan bikin abstraksi generik tanpa reuse nyata.

### Sistem visual (dipakai semua task)
- **Ukuran kontrol seragam** (lihat "Skala kompak"): semua Button/Input/Select/
  DateRange/SearchField memakai ukuran yang sama di HR dan Karyawan; aksi utama halaman
  di kanan `PageHeader`; aksi destruktif selalu lewat `ConfirmDialog`; urutan tombol dialog
  `Batal` (kiri, secondary) → aksi (kanan, primary/danger).
- **Spacing**: grid 4px; gap section 24px, gap field 16px; container halaman
  `max-width: none` (isi penuh lebar area konten — tidak ada space kosong kiri/kanan),
  padding 16/24/32 px untuk mobile/tablet/desktop.
- **Clickable = terlihat clickable**: baris list seluruhnya klik-able (bukan hanya nama),
  `cursor:pointer`, hover background, focus ring, Enter/Space membuka. Elemen non-klik
  tidak boleh punya hover seperti tombol.
- **States** tiap data view: Skeleton berbentuk, EmptyState dengan aksi, error Notice + "Muat ulang".

### Skala kompak (D12) — proporsional, jangan besar
Definisikan sebagai CSS variable di `packages/ui/src/theme.css` dan pakai di semua komponen
(jangan angka ad-hoc per halaman). Override ukuran default HeroUI lewat `size="sm"` atau
class bersama bila default terlalu besar.

| Elemen | Desktop/tablet (≥ 768 px) | Mobile (< 768 px) |
| --- | --- | --- |
| Teks dasar / tabel | 13–14 px, line-height 1.45 | 14 px |
| Judul halaman (`PageHeader`) | 18–20 px semibold | 17–18 px |
| Judul section | 14–15 px semibold | 15 px |
| Tombol, input, select, date range, search | tinggi **32 px**, padding x 10–12 px, font 13 px | tinggi **36–40 px** (target sentuh), font 14 px |
| Tombol ikon | 28–32 px, ikon 16 px | 36 px, ikon 18 px |
| Baris tabel / list row | **36–40 px**, padding sel 8 × 12 px | kartu list padding 12 px |
| Pill/badge status | tinggi 20 px, font 12 px | sama |
| Kartu metrik Ringkasan | padding 12–16 px, angka 20–24 px | padding 12 px, angka 20 px |
| Ikon nav sidebar | 16–18 px, item 32 px | item drawer 40 px |
| Radius | 6 px kontrol, 8 px kartu/dialog | sama |
| Dialog | lebar maks 440 px (form) / 560 px (detail) | full-width sheet bawah |

Aturan: satu aksi primer per area; tombol lebarnya mengikuti isi (jangan full-width di
desktop, kecuali form login/mobile); ikon + label pendek; tabel padat tanpa border tebal.

### Layar fixed & tanpa zoom (D11) — semua ukuran layar
- `index.html` kedua portal: `<meta name="viewport" content="width=device-width,
  initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">`
  (maximum-scale=1 juga mencegah auto-zoom iOS saat fokus input).
- CSS global (`packages/ui/src/theme.css`): `html,body,#root{height:100dvh;overflow:hidden}`,
  `overscroll-behavior:none`, `touch-action:pan-x pan-y` (matikan pinch & double-tap zoom),
  `-webkit-text-size-adjust:100%`, `text-size-adjust:100%`; area konten utama
  `overflow-y:auto` (satu scroller per layar); safe-area inset untuk bottom-nav/notch.
- `packages/ui/src/theme/viewport.ts` — `lockViewportZoom()` dipanggil sekali dari
  `main.tsx` kedua portal, mendaftarkan (passive:false) dan mengembalikan fungsi cleanup:
  - `keydown`: Ctrl/⌘ + `+` `=` `-` `_` `0` (dan numpad add/subtract/0) → `preventDefault`.
  - `wheel` dengan `ctrlKey` (Ctrl+scroll & trackpad pinch di Chrome/Edge) → `preventDefault`.
  - `gesturestart`/`gesturechange`/`gestureend` (Safari iOS & macOS) → `preventDefault`.
  - `touchmove` dengan `touches.length > 1` → `preventDefault`, **kecuali** target di
    dalam elemen `[data-allow-zoom]` (dipakai peta Leaflet).
  - `dblclick` tidak di-preventDefault (dipakai seleksi teks); double-tap mobile sudah
    ditangani `touch-action`.
- Unit test `viewport.test.ts`: keydown Ctrl+`+`/`0` dan wheel ctrlKey ter-cancel; key
  biasa & wheel tanpa ctrl tidak; target `[data-allow-zoom]` dikecualikan.
- Batas yang tetap ada (diterima pengguna): menu zoom bawaan browser desktop dan
  pengaturan aksesibilitas OS tidak bisa diblokir oleh halaman. Layout tetap fixed &
  responsif bila itu terjadi.
- Peta Leaflet: container diberi `data-allow-zoom`, zoom peta via kontrol +/− & pinch di
  dalam kanvas peta saja.

### Git
- Commit per task: `feat(hr-web): …`, `feat(attendance-web): …`, `feat(ui): …`,
  `feat(<service>): …`, `fix(...)`, `docs: …`. Push `git push origin dev`.
- Jangan ke `main`, jangan force push. Jangan stage tooling dirs, `skills-lock.json`,
  `.env*` (termasuk `.env.local` proxy VPS), `dist`, generated Prisma client.

### Lingkungan
- Frontend lokal → API VPS production lewat Vite proxy (`vite.config.ts`, Origin
  ditulis-ulang, Set-Cookie dilucuti). Jangan rusak proxy. `.env.local` = `/api/v1`.
- Perubahan backend **baru aktif setelah pengguna merge ke main + deploy VPS**. Jadi
  urutkan: kerjakan frontend yang memakai endpoint live dulu; fitur yang butuh endpoint
  baru diberi fallback aman (sembunyikan/disable dengan pesan) sampai endpoint live.
- Memori host sering CRITICAL: build/dev server hanya bila `resource_status` tidak
  CRITICAL (≈ ≥3 GB). Edit file aman kapan saja. Dev server: satu portal saja.
  `pnpm --dir apps/hr-web dev --port 5174 --strictPort` /
  `pnpm --dir apps/attendance-web dev --port 5173 --strictPort`. Pakai `localhost`.
  Akun demo: HR `hr@testcompany.com`, Karyawan `john.doe@testcompany.com`, password
  `TestCompany123`.

## 5. Verifikasi per task (cepat)

- Frontend: `pnpm --filter <app> build` (tsc+vite) + `pnpm --filter <app> lint` +
  `pnpm --filter <app> exec vitest run <file terdampak>`.
- `packages/ui`: typecheck lewat build portal yang memakainya.
- Backend: `pnpm --filter <service> build` + lint + `exec jest <file terdampak>`
  (unit service/DTO yang diubah). Migration: hanya bila perlu, pakai `prisma migrate dev
  --create-only` di lokal, commit file migration.
- Unit hanya untuk logika murni berubah (parser range, debounce hook, mapping, guard,
  service backend). Komponen visual tidak diunit-test; test lama yang pecah karena
  kontrak berubah diperbaiki, bukan dihapus.
- UI: pengguna cek manual (desktop/tablet/mobile, terang/gelap). Jangan centang
  acceptance visual sebelum pengguna oke; DoD teknis boleh dicentang di progress.

## 6. Backlog (serial, urut dependensi)

Status `[x]` = selesai & di-push. Fase A (sudah selesai):

| ID | Judul | Commit |
| --- | --- | --- |
| R00 | Tema terang/gelap/sistem | 1822f62 |
| R01 | HR path routing (react-router-dom 7.18.4, 404, guard) | 3952fa3 |
| R02 | Primitives `packages/ui` (Breadcrumb, UnderlineTabs, PageHeader, EmptyState, Skeleton) | 89a7a3c |
| R03 | EmployeeDetail patokan visual | 49e1e89 |
| R04 | Shell HR + command palette ⌘-K | d12e283 |
| R05 | HR list pages + StatusPill | 8f4538f |

Fase B:

### T1 `[ ]` Bug: sesi hilang saat refresh (semua role) — AKAR MASALAH TERKONFIRMASI
- **Status 2026-10-05**: implementasi di-push (`98f5c12`), unit/lint/build terbukti
  CI; pengguna menyatakan refresh aman semua role di production setelah fix
  fallback Vercel (`4db848c`). Refresh production diterima. Logout → refresh dan
  rewrite proxy localhost belum dikonfirmasi; tidak disimpulkan dari cek production.
- **Bukti pengguna**: `POST /api/v1/auth/refresh` → **401** di 5173 dan 5174 setelah refresh.
- **Akar masalah** (source): production Auth membaca cookie `__Host-auth_refresh_<admin|employee>`
  (`apps/auth-service/src/auth/auth.controller.ts` `cookieName()` + baris ~162
  `request.cookies?.[this.cookieName(role)]`). Proxy Vite (`proxyRes`) **melucuti prefix
  `__Host-`** agar cookie bisa disimpan di `http://localhost`, sehingga browser menyimpan
  dan mengirim balik `auth_refresh_<role>` → server tidak menemukan nama `__Host-…` → 401.
- **Perbaikan (frontend-only, tanpa backend)**: di `proxyReq` kedua `vite.config.ts`,
  tulis-ulang header `Cookie` request: `auth_refresh_(admin|employee)=` →
  `__Host-auth_refresh_$1=` (hanya nama cookie refresh, jangan cookie lain). Ekstrak
  logika rewrite (Set-Cookie response + Cookie request) ke satu modul murni bersama
  (mis. `scripts/dev-proxy-cookies.ts` diimport kedua config) + unit test-nya.
  Pastikan `Path=/` tetap, `SameSite=Lax` aman untuk same-origin localhost.
- **DoD**: login → refresh 3× → tetap masuk di kedua portal; logout menghapus cookie
  (Set-Cookie clear juga direwrite) lalu refresh → ke halaman login; unit rewrite lulus.
  Pengguna cek manual (restart dev server — `vite.config.ts` tidak hot-reload).

### T2 `[ ]` Bug: HR "lihat detail absensi" & Karyawan "riwayat" tidak berfungsi
- **Status 2026-10-05**: pengguna mengonfirmasi detail HR dari Absensi dan Ringkasan
  berfungsi. Response list Karyawan 200 memakai UUID v5 (seed demo), ditolak
  validator frontend yang hanya menerima v4. Validator diperbaiki menerima v4/v5;
  unit regresi list/detail + test HistoryPage lulus. Acceptance riwayat/detail/foto
  Karyawan dan Back/filter HR tetap menunggu cek pengguna setelah rilis.
- **File HR**: `pages/AttendancePage.tsx` (detail via `?id=`),
  `pages/AttendanceDetailPage.tsx`, `pages/MonitoringPage.tsx` (link `/absensi?id=`),
  `routes/routes.ts` (`useRouteParams`).
- **File Karyawan**: `App.tsx`, `lib/use-hash-route.ts`, `pages/HistoryPage.tsx`,
  `lib/attendance-history.ts` (validasi ketat `row()`/`metadata()` → `invalid()` 503).
- **Langkah**: minta console/Network error dari pengguna (D1); cek status response
  (404/403/503) dan pesan. Kemungkinan Karyawan: validasi menolak bentuk data production
  (mis. `serverTime` bukan `+07:00`, `pageSize`, event tanpa `location`). Perbaiki
  validasi agar toleran pada field opsional, jangan sampai menerima data tidak aman.
  Kemungkinan HR: `onParamsChange` menghapus `id` / klik baris tidak memicu.
- **DoD**: HR: klik baris absensi (dari Absensi & Ringkasan) membuka detail, Back
  kembali ke list dengan filter utuh. Karyawan: daftar riwayat tampil, klik membuka
  detail + foto. Unit untuk validator yang diubah.

### T3 `[ ]` Fondasi bersama `packages/ui` + rapikan struktur
- Status 2026-10-05: implementasi selesai; lint/typecheck kedua portal dan unit
  terdampak HR 90/90 + Karyawan 40/40 lulus. Build CI PR dan acceptance manual
  pengguna masih menunggu; checkbox DoD tetap terbuka.
- **Angkat** dari hr-web/attendance-web ke `packages/ui`: `Notice`, `PasswordField`,
  `ConfirmDialog`, `StatusBadge`, `StatusPill` (+ `status-pill.ts`). Hapus duplikat,
  update import kedua portal, CSS-nya pindah ke `packages/ui/src/theme.css` atau
  `packages/ui/src/styles/*.css`.
- **Baru**: `FormField` (Label+kontrol+error+hint), `DateRangeField` (HeroUI
  `DateRangePicker` + preset D5; nilai `{startDate,endDate}` string `YYYY-MM-DD`),
  `SearchInput` (HeroUI `SearchField` + hook `useDebouncedValue` 300 ms),
  `DataList` row clickable (pola bagian 4), `SidebarShell` (rail+drawer D3) bisa
  menunggu T5 bila lebih rapi.
- **Layar fixed & tanpa zoom (D11)** + **skala kompak (D12)**: terapkan viewport meta,
  CSS app-shell `100dvh` satu scroller, `touch-action`, `lockViewportZoom()` (+ unit),
  dan token ukuran kompak di `theme.css`; komponen bersama memakai token itu. Halaman
  lama otomatis ikut lewat token; sisanya dirapikan di T4–T10.
- **Bersihkan**: `apps/attendance-web/src/spikes/` (+ entry Vite bila ada),
  `pages/WelcomePage.tsx`, css per-halaman pindah ke `styles/`. Pastikan tidak ada
  import yatim (grep) sebelum hapus.
- **DoD**: kedua portal build/lint/test hijau; tidak ada komponen duplikat lintas portal;
  unit: `useDebouncedValue`, util range tanggal/preset.

### T4 `[ ]` Sistem kontrol & filter seragam (semua halaman)
- Status 2026-10-05: implementasi teknis selesai; HR 61/61 test fokus, Riwayat
  Karyawan 7/7, helper filter Employee Service 2/2; lint kedua portal/Employee
  Service dan typecheck kedua portal/Employee Service lulus. Build menunggu CI;
  acceptance visual manual menunggu pengguna, jadi checkbox tetap terbuka.
- Backend: Employee Service `GET /api/v1/employees` menerima filter optional
  `departmentId`/`positionId`; tanpa migration. Perlu PR+deploy sebelum production.
- Ganti semua `<Input type="date">` → `DateRangeField` (HR: Absensi, Absensi-dihapus,
  Ringkasan bila relevan, Hari Libur filter; Karyawan: Riwayat). Query param tetap
  `startDate`/`endDate` (backend sudah menerima).
- Semua search (Karyawan HR, Departemen, Jabatan, filter karyawan di Absensi) →
  `SearchInput`, hapus tombol Cari/Terapkan untuk teks; filter non-teks berlaku
  langsung saat dipilih.
- Dropdown departemen (`AttendanceFilters`, `MasterAssignmentSelect`, filter Karyawan):
  opsi pertama **"Semua departemen"**, lalu daftar lengkap (ambil semua halaman /
  `pageSize` besar), urut nama, nonaktif ditandai. Sama untuk jabatan.
- Seragamkan ukuran Button/Input (bagian 4) dan rapikan offset (alignment label,
  baseline tombol vs input, tabel header).
- **DoD**: tidak ada lagi native date input & tombol Cari; ukuran kontrol seragam di
  semua halaman kedua portal; unit untuk perubahan builder query.

### T5 `[ ]` Shell HR baru: sidebar hideable + header
- `components/templates/WorkspaceLayout.tsx` → pakai `SidebarShell`: desktop rail
  ikon/expanded (toggle + shortcut `[`), tablet/mobile Drawer HeroUI dengan tombol menu.
  Grup nav: Ringkasan · Absensi (Absensi, Dihapus) · Karyawan · Master (Departemen,
  Jabatan, Hari Libur). Footer: akun → Profil (T8), tema, keluar.
- Konten mengisi penuh lebar sisa; header sticky (judul/breadcrumb, Cari ⌘-K, tema, akun).
- z-index tertata: header 30, drawer 50, command palette 60, toast 70; peta di bawah 10.
- **DoD**: collapse tersimpan; drawer menutup saat navigasi; keyboard & a11y (aria-expanded,
  focus trap drawer); tidak ada space kosong.

### T6 `[ ]` HR detail pages (eks-R06) + "semua bisa diklik"
- `AttendanceDetailPage`: `PageHeader` + breadcrumb `Absensi / <tanggal> / <nama>`,
  `UnderlineTabs` (Bukti · Riwayat perubahan), `StatusPill`, aksi hapus/pulihkan via
  `ConfirmDialog` di header. Pertimbangkan route detail `/absensi/:id` (lebih bersih
  dari `?id=`), dengan redirect kompatibel dari `?id=`.
- **Peta** `components/organisms/AttendanceMap.tsx`: state loading (Skeleton), empty
  (tanpa lokasi), fallback (tile gagal → koordinat + link buka peta), warna token
  terang/gelap (filter tile gelap), `z-index` di bawah overlay.
- Master Data: tidak ada layar detail Departemen/Jabatan — **tidak dibuat**; edit tetap
  via dialog. Baris list dibuat clickable membuka dialog edit.
- Semua list HR (Karyawan, Absensi, Dihapus, Departemen, Jabatan, Hari Libur, Ringkasan):
  seluruh baris clickable sesuai pola bagian 4.
- **DoD**: semua baris list membuka target yang benar; detail punya breadcrumb kembali.

### T7 `[ ]` Ringkasan HR: chart + detail inline  *(backend)*
- Status 2026-10-05: implementasi teknis selesai dan di-push pada commit T7; lint,
  typecheck, dan unit terfokus lulus (HR 8/8, Attendance Service 11/11, Gateway
  7/7). Checklist UI tetap terbuka sampai acceptance manual. Backend perlu PR+deploy:
  Attendance Service + API Gateway, `GET /api/v1/monitoring/trend?startDate&endDate`,
  tanpa migration.
- **Backend** (attendance-service + api-gateway): `GET /api/v1/monitoring/trend?startDate&endDate`
  → `[{ date, present, late, absent, onLeave? }]` per hari (WIB, maks 92 hari, hari libur
  ditandai). Admin guard sama dengan `monitoring/summary`. Unit service. Push dev,
  beri tahu pengguna (D7).
- **Frontend**: tambah `recharts` (pinned exact) di `packages/ui`; salin pola shadcn
  chart ke `packages/ui/src/charts/` (`ChartContainer`, `ChartTooltip`, `ChartLegend`,
  config warna dari token: emerald=hadir, amber=terlambat, zinc=belum hadir).
  Ringkasan: kartu metrik (dari `monitoring/summary`), **area/bar chart tren** dengan
  `DateRangeField` (default 7 hari), **donut hari ini**. Bila endpoint trend belum live
  (404) → tampilkan EmptyState "Grafik tren tersedia setelah rilis backend", donut tetap.
- Baris karyawan di Ringkasan klik → panel detail inline (Drawer kanan di desktop,
  sheet di mobile) berisi status hari ini + tautan "Buka detail absensi".
- **DoD**: chart responsif & ikut tema; tooltip berbahasa Indonesia; fallback aman.

### T8 `[ ]` Profil (lihat) + ganti password tiap role  *(backend kecil)*
- Status 2026-10-05: profil diri dan ganti password bersama sudah diimplementasikan;
  role tanpa `employeeId` menerima `data: null`, dan endpoint belum live ditangani
  fallback. Lint/typecheck/unit fokus lulus. UI visual masih menunggu acceptance
  manual pengguna. Backend perlu PR+deploy (Employee Service + API Gateway),
  `GET /api/v1/me/profile`, tanpa migration.
- **Backend** (employee-service + api-gateway): `GET /api/v1/me/profile` read-only —
  data karyawan milik akun (nama, NIK, telepon, departemen, jabatan, tanggal mulai,
  status) berdasarkan `employeeId` sesi; ADMIN_HRD tanpa `employeeId` → `data: null`.
  Tanpa PATCH. Unit service. Push dev, beri tahu pengguna (D7).
- **Frontend HR**: route `/profil` (breadcrumb `Profil`), tabs Profil · Keamanan;
  Keamanan = ganti password (`client.changePassword`, lalu login ulang).
- **Frontend Karyawan**: `/profil` dari avatar/bottom nav, isi sama, layout mobile;
  ganti password memakai form yang sama dengan `ChangePasswordPage` (komponen dipakai ulang).
- Fallback sebelum endpoint live (404): tampilkan email + role dari `auth/me`, sembunyikan
  bagian data karyawan dengan catatan singkat; ganti password tetap jalan.
- **DoD**: profil tampil read-only; ganti password berhasil di kedua portal lalu wajib
  login ulang; unit backend service + validator form password.

### T9 `[ ]` Portal Karyawan overhaul (eks-R07)
- Status 2026-10-05: rute React Router dan shell responsif sudah diimplementasikan;
  lint/typecheck lulus dan unit fokus 29/29 lulus. Build menunggu resource; manual
  visual pengguna belum diterima. Backend tidak berubah.
- Migrasi `use-hash-route.ts` → `react-router-dom@7.18.4` (pinned, sama dengan HR):
  `/masuk`, `/ganti-password`, `/` (Hari ini), `/absen/masuk`, `/absen/pulang`,
  `/riwayat`, `/riwayat/:id`, `/profil`, 404, guard auth. Hapus `use-hash-route.ts`.
- Template mobile: top bar (brand, tema, avatar→Profil) + bottom nav (Hari ini · Riwayat
  · Profil) di mobile; di tablet/desktop konten terpusat lebar wajar tanpa space kosong
  aneh (dua kolom: status hari ini + riwayat terbaru).
- Home "Hari ini": status besar, jam server, jadwal, satu CTA utama (Check-in/Check-out),
  ringkasan 7 hari.
- **Kamera** (`CapturePanel`): full-screen, state deteksi/gagal/ragu/izin ditolak/fallback
  manual jelas, tombol besar di bawah (thumb zone). Logika `features/capture/*` tidak
  diubah kecuali perlu.
- Riwayat: list kartu clickable + `DateRangeField`; detail dengan foto & lokasi.
- **DoD**: semua alur karyawan jalan (login, check-in/out, riwayat, profil, ganti
  password); unit test lama diperbarui untuk router.

### T10 `[ ]` Sweep responsif + a11y + polish
- Cek 320 / 768 / 1024 / 1440 px, terang & gelap, tiap halaman kedua portal: tidak ada
  overflow horizontal, tidak ada space kosong, tabel → list kartu di < 768 px.
- Kontras AA, focus ring, keyboard, `prefers-reduced-motion`, toast konsisten (HeroUI Toast)
  untuk hasil aksi.
- Audit proporsi (D12): tidak ada tombol/input/tabel/kartu yang melebihi skala kompak;
  ganti ukuran ad-hoc dengan token. Audit zoom (D11): pinch, double-tap, Ctrl +/−/0,
  Ctrl+scroll tidak mengubah skala di kedua portal; peta tetap bisa zoom di kanvasnya.
- Daftar temuan → perbaiki dalam task ini (bukan task baru), lalu minta pengguna cek.
- **DoD**: checklist halaman di progress tercentang setelah pengguna oke.

### T11 `[ ]` Dokumentasi & rapikan
- Update `frontend-design-system.md`, `frontend-ui-ux.md` (pola baru: sidebar, chart,
  date range, profil), `docs/features.md`, README bila perlu.
- Ringkasan perubahan backend untuk PR main (endpoint, migration).
- Squash commit hanya bila pengguna minta (tanpa force push ke main).

## 7. Peta permintaan pengguna → task

klik baris→detail Ringkasan: T6/T7 · ukuran tombol/input seragam: T4 · date picker
HeroUI: T3/T4 · rapikan offset: T4/T10 · search langsung: T3/T4 · dropdown semua
departemen: T4 · grafik Ringkasan: T7 · jangan mudah logout: T1 · rentang waktu: T3/T4 ·
detail absensi HR rusak: T2 · full layar tanpa space kosong: T5/T9/T10 · sidebar
hideable: T5 · Atomic/struktur rapi: T3 + konvensi · tata letak tombol: konvensi/T4 ·
naluriah klik: T6 · profil (lihat) + ganti password tiap role: T8 · riwayat karyawan rusak: T2 ·
layar fixed tanpa zoom: T3/T10 · ukuran proporsional/kompak: T3/T4/T10 · saran unit test cepat: bagian 5.

## 9. Pertanyaan terbuka

- Tidak ada. (Q1 zoom desktop dijawab pengguna 2026-10-05: blokir zoom di semua layar — D11.)

## 8. Ketentuan pindah agen

- Satu agen aktif, serial, tanpa subagen. Catat task aktif/file/port di progress.
- Sebelum mulai: cek git & proses dev server yang masih jalan (jangan jalankan dua).
- Setiap perubahan backend: push `dev` dan tulis di progress bagian "Perlu PR+deploy"
  agar pengguna tahu apa yang menunggu rilis.
