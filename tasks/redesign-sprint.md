# Sprint Redesain Frontend — "Refine Linear × GitHub" (Overhaul penuh)

> Sumber kebenaran untuk redesain UI/UX dua portal. Mendampingi [plan.md](plan.md)
> dan [todo.md](todo.md). Ikuti [frontend-design-system.md](../docs/sdd/frontend-design-system.md)
> dan [frontend-ui-ux.md](../docs/sdd/frontend-ui-ux.md); dokumen ini mengevolusikan
> keduanya. **Revisi besar 2026-10-05**: scope diperluas jadi overhaul penuh frontend
> dua portal + perbaikan bug fungsional + boleh ubah backend; progres R00–R05 lama
> dilipat ke fase B di bawah.

## Arah terkunci (keputusan pengguna)

- **Basis**: Refine Linear (evolusi tema yang ada) + referensi **GitHub / Primer** —
  netral tegas, aksen tunggal **emerald**, density pro, breadcrumb kuat, underline tabs,
  list rows padat, pill status. **Dials**: VARIANCE 4 / MOTION 4 / DENSITY 5.
- **Dua karakter, satu bahasa**: HR = padat ala GitHub repo view; Attendance =
  lapang/mobile-first. Berbagi token/aksen/tipografi lewat `packages/ui`.
- **Atomic Design** di kedua portal dan `packages/ui`; struktur folder & kode rapi.
- **Satu design system**: HeroUI v3 + token `packages/ui/theme.css`. Jangan campur
  library komponen lain (lihat keputusan chart di bawah).

## Mandat overhaul (keputusan pengguna 2026-10-05)

Goal: **UI/UX rapi, berfungsi semua, cepat pengembangannya**. Metode:
**task tanpa iterasi** — tiap task harus DONE lalu lanjut, tidak bolak-balik.

1. **Rombak semua frontend**; **boleh ubah backend** bila perlu agar frontend keren/berfungsi.
2. **Testing manual saja** oleh pengguna (desktop/tablet/mobile). Agent menjaga mutu
   dengan **typecheck + lint + build** dan unit test untuk logika yang berubah
   (lihat "Strategi unit test cepat"). TIDAK menambah Playwright/screenshot rutin.
3. **Push semua ke `dev`** (termasuk perubahan backend). **PR `dev` → `main` oleh pengguna**.
   Pengguna verifikasi manual di production. Ini website technical test.
4. **Commit per task** yang DONE; rapikan/squash commit ditunda ke fase akhir (X2).
5. Memori host sering CRITICAL — build/dev server/suite berat hanya saat memori lega
   (`resource_status`, available ≥ ~3 GB). Edit file aman kapan saja.

## Daftar permintaan konkret pengguna → task

| # | Permintaan | Task |
| --- | --- | --- |
| 1 | HR: baris list bisa diklik → tampil detail di Ringkasan | X3, X7 |
| 2 | Seragamkan ukuran button semua role + input | X4 (sistem form/aksi) |
| 3 | Date picker pakai HeroUI (bukan native `<input type=date>`) | X4 (DateRange) |
| 4 | Banyak UI offset — rapikan semua | X4, X9 |
| 5 | Search bar: trigger langsung saat ketik (debounce), tanpa tombol Cari | X4 |
| 6 | Dropdown departemen: tampilkan semua departemen + list | X4, X6 |
| 7 | Grafik di Ringkasan — rapi, sesuai tema, dari komponen UI | X7 + keputusan chart |
| 8 | Boleh ubah backend | semua, sesuai kebutuhan |
| 9 | Semua role jangan mudah logout saat refresh | **X1 (bug kritis)** |
| 10 | Rentang waktu (date range), bukan satu tanggal | X4 (DateRange) |
| 11 | HR: "lihat detail absensi" tidak berfungsi | **X1 (bug kritis)** |
| 12 | Semua halaman full desktop/tablet/mobile, tanpa space kosong | X9 |
| 13 | Sidebar: konsep lain, bisa di-hide | X5 |
| 14 | Atomic design, folder/file/kode rapi | X2 + konvensi |
| 15 | Tata letak tombol jelas, tidak membingungkan | X4, X9 |
| 16 | UX naluriah: yang terlihat bisa diklik, memang bisa diklik | X3, X7, X9 |
| 17 | Tiap role punya halaman Profil + Ganti Password | X8 |
| 18 | Karyawan: riwayat absensi tidak berfungsi | **X1 (bug kritis)** |
| 19 | UI/UX terbaik, tidak membingungkan | seluruh sprint |

## Keputusan yang masih terbuka (diputus saat task-nya tiba)

- **Chart (permintaan #7)**: HeroUI v3 TIDAK punya komponen chart. Pilihan:
  (a) **Recharts** langsung (library yang di-wrap shadcn chart), ditema dengan token
  kita — tidak melanggar "satu design system" karena chart bukan komponen form/UI;
  (b) SVG/`Meter`/`ProgressBar` HeroUI untuk visual ringkas tanpa dependency baru.
  **Default rencana: (a) Recharts** (pinned), kalau memori/kompleksitas jadi masalah
  turun ke (b). Keputusan final di X7 — tandai dependency baru di commit.
- **Backend untuk Profil (#17)**: cek apakah endpoint `me`/profil sudah ada; jika
  belum, tambah endpoint read-only di service terkait (X8). Tandai perubahan backend.

## Breadcrumb — di mana

- **HR**: semua halaman detail/berjenjang (EmployeeDetail, AttendanceDetail,
  MasterData → Dept/Jabatan, Profil). List top-level cukup satu segmen/ tanpa breadcrumb.
- **Attendance (mobile)**: TIDAK pakai breadcrumb — tombol kembali + judul.

## Konvensi struktur (tiap portal)

```
src/
  components/{atoms,molecules,organisms,templates}/   # Atomic Design
  pages/                                              # satu file per halaman
  routes/                                             # definisi route + guard
  lib/                                                # client, hooks, util murni
  styles/                                             # css per-area (hindari global tercecer)
```
- Komponen lintas-portal (Breadcrumb, Tabs, PageHeader, ThemeToggle, StatusPill,
  DateRange, SearchField wrapper, SidebarShell, Chart wrapper) → `packages/ui`.
- Logika murni dipisah dari komponen (fast-refresh & test bersih), pola `*.ts` + `*.tsx`.
- A11y: focus ring, kontras WCAG AA, keyboard nav — jangan regresi.

## Strategi unit test cepat (permintaan #19 "saran cara cepat")

Agar cepat tanpa mengorbankan keamanan:
- **Hanya untuk logika murni yang berubah** — fungsi di `lib/`/`*.ts` (filter, mapping
  tone, parsing range tanggal, guard). Komponen visual TIDAK diunit-test.
- **Jangan tulis test render berat baru**; perbaiki test lama yang pecah karena
  perubahan kontrak saja.
- **Verifikasi tiap task** = `pnpm --filter <app> build` + `lint` + `vitest run`
  (file terdampak). UI dicek pengguna manual. Jalankan hanya saat memori lega.
- Tidak ada Playwright/E2E/screenshot rutin.

## Git & keamanan

- Coding/commit/push ke `dev`. **Jangan ke `main`** (PR oleh pengguna). Jangan force push.
- Jangan stage: tooling dirs (`.agents/ .claude/ .kiro/ .windsurf/`), `skills-lock.json`,
  `.env*` (termasuk `.env.local` proxy VPS), `dist`, generated client.
- Frontend lokal → API VPS production via Vite proxy (origin ditulis-ulang). Jangan
  rusak `vite.config.ts` proxy kedua portal.

---

## Fase A — SELESAI (R-series lama, terkunci di Git)

| ID | Judul | Status | Commit |
| --- | --- | --- | --- |
| R00 | Fitur tema per portal (terang/gelap/sistem) | [x] | 1822f62 |
| R01 | Fondasi routing HR (React Router 7, 404, guard) | [x] | 3952fa3 |
| R02 | Primitives bersama (Breadcrumb/UnderlineTabs/PageHeader/EmptyState/Skeleton) | [x] | 89a7a3c |
| R03 | Patokan EmployeeDetail HR (bahasa visual GitHub) | [x] | 49e1e89 |
| R04 | Shell HR + command palette ⌘-K | [x] | d12e283 |
| R05 | HR list pages (pola GitHub list + StatusPill) | [x] | 8f4538f |

> Catatan carry-over: `StatusBadge/ConfirmDialog/Notice/PasswordField` masih di
> `apps/hr-web`; `Notice/PasswordField` duplikat di attendance-web. Penyatuan ke
> `packages/ui` dijadwalkan di **X2**. attendance-web MASIH hash routing
> (`use-hash-route.ts`) — dimigrasi di **X1/X6**.

## Fase B — Overhaul (X-series). Serial, satu task ujung-ke-ujung, DONE lalu lanjut.

| ID | Judul | Cakupan | Status |
| --- | --- | --- | --- |
| **X1** | **Perbaikan bug kritis fungsional** | (a) **Logout saat refresh** semua role — root-cause cookie refresh lewat proxy (Set-Cookie rewrite `__Host-`/`Secure`/`Domain`, SameSite, path) + verifikasi `restore()` kedua portal. (b) **HR "lihat detail absensi" tidak berfungsi** — reproduksi & perbaiki (route/param/validasi data). (c) **Karyawan riwayat absensi tidak berfungsi** — reproduksi & perbaiki. Backend boleh diubah bila root-cause di API/CORS/cookie. | [ ] |
| **X2** | **Fondasi bersama & rapikan struktur** | Angkat `StatusBadge/ConfirmDialog/Notice/PasswordField` + tambah `FormField`, `DateRange` (HeroUI DateRangePicker), `SearchField` (debounce, no-button), `SidebarShell` (hideable), `Chart` wrapper ke `packages/ui`. Rapikan folder Atomic Design kedua portal; hapus dead code (`spikes/`, `WelcomePage`, css tercecer). | [ ] |
| **X3** | **Sistem navigasi & "semua bisa diklik"** | Baris list HR benar-benar clickable (row → detail), affordance jelas (hover, cursor, fokus). Attendance: migrasi ke React Router + tombol kembali konsisten. Tata letak tombol seragam. | [ ] |
| **X4** | **Sistem form, filter & input seragam** | Ukuran button/input seragam semua role; date range picker HeroUI gantikan native date; search trigger-saat-ketik (debounce) tanpa tombol; dropdown departemen tampilkan semua + list; rapikan offset. | [ ] |
| **X5** | **Shell HR: sidebar konsep baru + hideable** | Sidebar collapsible/hideable (Drawer di mobile, rail di desktop), persist state, aksen GitHub. Header + breadcrumb + command palette tetap. | [ ] |
| **X6** | **Attendance portal overhaul** | Login, Home "Hari ini", Capture (item khusus kamera), History (lapang mobile), ChangePassword. Date range di History. Pola bersama X2/X4. | [ ] |
| **X7** | **HR Ringkasan: grafik + detail inline** | Chart ringkas sesuai tema (keputusan chart di atas); baris Ringkasan klik → detail tampil di konteks Ringkasan. | [ ] |
| **X8** | **Profil + Ganti Password tiap role** | Halaman Profil (read detail akun) + Ganti Password untuk HR dan Karyawan. Backend `me`/profil bila belum ada (tandai). Breadcrumb HR. | [ ] |
| **X9** | **Responsif + a11y + anti space-kosong sweep** | 320/768/1024/1440 terang+gelap; tiap halaman full tanpa space kosong; kontras & keyboard; motion `prefers-reduced-motion`. Pengguna verifikasi manual. | [ ] |
| **X10 / X2-akhir** | **Rapikan commit & docs** | Update design-system/ui-ux + progress; opsi squash saat seluruh website clear (pengguna putuskan). | [ ] |

### Urutan & alasan
X1 lebih dulu — **bug fungsional memblokir uji visual** (tak bisa menilai halaman kalau
logout terus / detail tak muncul). X2 menyiapkan bahan baku bersama agar X3–X8 cepat
tanpa duplikasi. X3–X8 fitur per area. X9 sweep akhir. X10 rapikan.

## Ketentuan pindah agen

- Satu agen aktif, tanpa subagen/paralel. Kerja serial X1 → X10.
- Catat task aktif + file + proses/port di [progress.md](progress.md) sebelum berganti.
- Sebelum ganti: cek `git status`/diff + proses berjalan; jangan menimpa kerja sesi lain.
- HEAD/branch/status Git aktual = sumber kebenaran, bukan transkrip usang.
- Verifikasi berat (build/dev server) hanya saat memori lega; edit file aman kapan saja.
