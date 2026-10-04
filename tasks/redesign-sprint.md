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
| D4 | Profil | Tiap role bisa **lihat dan edit profil** + ganti password (lihat batas field D10). |
| D5 | Rentang tanggal | HeroUI `DateRangePicker` + preset Hari ini / 7 hari / 30 hari / Bulan ini; default **30 hari terakhir** (list). Ringkasan default hari ini. |
| D6 | Search | Trigger saat ketik, debounce **300 ms**, tanpa tombol Cari; kosong = semua. |
| D7 | Backend | Boleh diubah. **Langsung push `dev` + beri tahu pengguna** (sebut service, endpoint, migration bila ada). Pengguna PR ke `main` lalu cek di production. |
| D8 | "Tanpa iterasi" | Tiap task diserahkan utuh (build/lint/test hijau). Penyesuaian rasa dari pengguna = finishing normal, bukan task gagal. |
| D9 | Testing | Manual oleh pengguna. Agen: typecheck/build + lint + unit untuk logika murni berubah (bagian 5). Tanpa Playwright/E2E/screenshot. |
| D10 | Field profil yang bisa diedit | Lihat bagian 3 — **default dipakai sampai pengguna mengubah**. |

## 3. Batas edit profil (D10) — default

Baseline: data profil karyawan dimiliki HR (`docs/requirements/baseline.md` §profil).
Self-edit adalah perubahan baseline → **perbarui baseline dulu** (commit docs terpisah)
sebelum kode X8.
- **Karyawan**: boleh edit **telepon** (opsional). Lihat-saja: nama, NIK, email,
  departemen, jabatan, tanggal mulai, status. Alasan: nama/NIK/penugasan memengaruhi
  snapshot absensi & audit; email punya alur outbox milik HR.
- **HR (akun ADMIN_HRD, `employeeId` bisa null)**: lihat email/role; bila punya
  `employeeId`, telepon boleh diedit seperti karyawan. Email lihat-saja.
- Bila pengguna ingin nama juga bisa diedit: ubah tabel ini + baseline, lalu ikuti.

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
- **Ukuran kontrol seragam**: semua Button/Input/Select/DateRange/SearchField
  `size="md"` (tinggi 36px) di HR dan Karyawan; aksi utama halaman di kanan
  `PageHeader`; aksi destruktif selalu lewat `ConfirmDialog`; urutan tombol dialog
  `Batal` (kiri, secondary) → aksi (kanan, primary/danger).
- **Spacing**: grid 4px; gap section 24px, gap field 16px; container halaman
  `max-width: none` (isi penuh lebar area konten — tidak ada space kosong kiri/kanan),
  padding 16/24/32 px untuk mobile/tablet/desktop.
- **Clickable = terlihat clickable**: baris list seluruhnya klik-able (bukan hanya nama),
  `cursor:pointer`, hover background, focus ring, Enter/Space membuka. Elemen non-klik
  tidak boleh punya hover seperti tombol.
- **States** tiap data view: Skeleton berbentuk, EmptyState dengan aksi, error Notice + "Muat ulang".

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

### T1 `[ ]` Bug: sesi hilang saat refresh (semua role)
- **Gejala**: refresh halaman → kembali ke login.
- **File**: `apps/*/vite.config.ts` (proxy `configure`), `apps/*/src/lib/auth-client.ts`
  (`restore`), `apps/auth-service/src/auth/auth.controller.ts` (cookie options, baris ~32–44).
- **Langkah**: (1) minta pengguna: DevTools → Network → request `auth/refresh` setelah
  refresh: status, request header `Cookie`, dan response `Set-Cookie` saat login;
  Application → Cookies `localhost`. (2) Hipotesis urut: cookie tidak tersimpan (rewrite
  tidak melucuti semua atribut / `Path` / SameSite); cookie tersimpan tapi nama
  `__Host-` dilucuti sehingga server tidak mengenali nama saat dikirim balik
  (proxy harus **menambahkan kembali** prefix `__Host-` di header `Cookie` request);
  dua panel memakai nama cookie berbeda (`auth_refresh_{role}`) — cek panel benar.
  (3) Perbaiki di proxy (frontend-only) bila memungkinkan; ubah backend hanya bila perlu.
- **DoD**: login → refresh 3× → tetap masuk, di kedua portal; logout tetap berfungsi.
  Unit untuk fungsi rewrite cookie (ekstrak ke `apps/*/proxy-cookie.ts` atau satu file
  bersama di root `scripts/`/`packages/ui`-node bila dipakai dua config).

### T2 `[ ]` Bug: HR "lihat detail absensi" & Karyawan "riwayat" tidak berfungsi
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
- **Angkat** dari hr-web/attendance-web ke `packages/ui`: `Notice`, `PasswordField`,
  `ConfirmDialog`, `StatusBadge`, `StatusPill` (+ `status-pill.ts`). Hapus duplikat,
  update import kedua portal, CSS-nya pindah ke `packages/ui/src/theme.css` atau
  `packages/ui/src/styles/*.css`.
- **Baru**: `FormField` (Label+kontrol+error+hint), `DateRangeField` (HeroUI
  `DateRangePicker` + preset D5; nilai `{startDate,endDate}` string `YYYY-MM-DD`),
  `SearchInput` (HeroUI `SearchField` + hook `useDebouncedValue` 300 ms),
  `DataList` row clickable (pola bagian 4), `SidebarShell` (rail+drawer D3) bisa
  menunggu T5 bila lebih rapi.
- **Bersihkan**: `apps/attendance-web/src/spikes/` (+ entry Vite bila ada),
  `pages/WelcomePage.tsx`, css per-halaman pindah ke `styles/`. Pastikan tidak ada
  import yatim (grep) sebelum hapus.
- **DoD**: kedua portal build/lint/test hijau; tidak ada komponen duplikat lintas portal;
  unit: `useDebouncedValue`, util range tanggal/preset.

### T4 `[ ]` Sistem kontrol & filter seragam (semua halaman)
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

### T8 `[ ]` Profil + ganti password tiap role  *(backend)*
- **Docs dulu**: perbarui baseline/PRD sesuai bagian 3 (commit `docs:` terpisah).
- **Backend** (employee-service + gateway): `GET /api/v1/me/profile` (gabung data
  employee + email dari token/Auth `auth/me`), `PATCH /api/v1/me/profile` body `{ phone, version }`
  dengan validasi, optimistic version, audit history (actor = diri sendiri). Guard:
  karyawan hanya profil sendiri; ADMIN_HRD tanpa `employeeId` → profil akun saja.
  Unit service. Push dev, beri tahu pengguna.
- **Frontend HR**: route `/profil` (breadcrumb `Profil`), tabs Profil · Keamanan;
  Keamanan = ganti password (pakai `client.changePassword`, lalu login ulang).
- **Frontend Karyawan**: halaman Profil dari Home (avatar/menu), sama isinya, layout mobile.
- Fallback bila endpoint belum live: tampilkan data dari `auth/me` (email/role) read-only
  + pesan "Edit profil tersedia setelah rilis backend"; ganti password tetap jalan.
- **DoD**: lihat & edit telepon berhasil (setelah deploy), ganti password berhasil di
  kedua portal; unit backend service + validator frontend.

### T9 `[ ]` Portal Karyawan overhaul (eks-R07)
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
naluriah klik: T6 · profil + ganti password tiap role: T8 · riwayat karyawan rusak: T2 ·
saran unit test cepat: bagian 5.

## 8. Ketentuan pindah agen

- Satu agen aktif, serial, tanpa subagen. Catat task aktif/file/port di progress.
- Sebelum mulai: cek git & proses dev server yang masih jalan (jangan jalankan dua).
- Setiap perubahan backend: push `dev` dan tulis di progress bagian "Perlu PR+deploy"
  agar pengguna tahu apa yang menunggu rilis.
