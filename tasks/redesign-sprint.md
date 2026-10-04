# Sprint Redesain Frontend — "Refine Linear × GitHub"

> Dokumen sprint untuk redesain UI/UX dua portal. Sumber kebenaran untuk pekerjaan
> redesain; mendampingi [plan.md](plan.md) dan [todo.md](todo.md). Ikuti
> [frontend-design-system.md](../docs/sdd/frontend-design-system.md) dan
> [frontend-ui-ux.md](../docs/sdd/frontend-ui-ux.md); dokumen ini mengevolusikan
> keduanya, bukan menggantikan.

## Arah terkunci (keputusan pengguna 2026-10-05)

- **Basis**: Refine Linear (evolusi tema yang ada), bukan overhaul.
- **Referensi visual**: GitHub / Primer — netral tegas, aksen tunggal, density pro,
  breadcrumb kuat, underline tabs, list rows padat, pill status.
- **Aksen**: emerald dipertahankan (satu aksen, dikunci seluruh halaman).
- **Dua karakter, satu bahasa**: HR = padat ala GitHub repo view; Attendance =
  lapang/mobile-first. Berbagi token/aksen/tipografi lewat `packages/ui`.
- **Dials**: VARIANCE 4 / MOTION 4 / DENSITY 5 (produk, bukan landing page).
- **Atomic Design**: atoms → molecules → organisms → templates → pages, konsisten
  di kedua portal dan `packages/ui`.

## Keputusan yang mengubah scope

1. **Routing**: ganti dari hash routing (`use-hash-route.ts`) ke **route beneran**
   (React Router / path-based). Breadcrumb & deep link dibangun dari path.
2. **Backend boleh diubah** bila UX menuntut (mis. field baru untuk breadcrumb/riwayat).
   Commit dulu per perubahan logis; rapikan/squash commit nanti saat seluruh website
   sudah clear dan rapi (keputusan pengguna).
3. **Motion ditambah** (tetap terukur): transisi halus, skeleton berbentuk, reveal
   ringan. Hormati `prefers-reduced-motion`. Bukan animasi mencolok.
4. **UX non-generik**: breadcrumb, underline tabs, command palette (Ctrl/⌘-K),
   keyboard shortcuts, empty/loading/error yang membimbing, toast aksi.

## Breadcrumb — di mana

- **HR**: semua halaman detail/berjenjang — EmployeeDetail (`Karyawan / Nama / Riwayat`),
  AttendanceDetail (`Absensi / Tanggal / Nama`), MasterData → Departemen/Jabatan.
  Halaman list top-level (Ringkasan, Karyawan) cukup satu segmen atau tanpa breadcrumb.
- **Attendance (mobile)**: TIDAK pakai breadcrumb (layar sempit) — tombol kembali + judul.

## Konvensi

- **Struktur folder** (tiap portal), rapi dan konsisten:
  ```
  src/
    components/{atoms,molecules,organisms,templates}/
    pages/
    routes/            # definisi route + loader (portal HR)
    lib/               # auth-client, hooks, util
    styles/            # css per-area bila perlu (hindari css global tercecer)
  ```
  Komponen lintas-portal (Breadcrumb, Tabs, ThemeToggle, StatusPill, dsb) → `packages/ui`.
- **Satu design system**: HeroUI + token `packages/ui/theme.css`. Jangan campur library lain.
- **Lock**: satu aksen (emerald), satu skala radius, satu tema per halaman (terang/gelap konsisten).
- **A11y**: pertahankan focus ring, kontras WCAG AA, keyboard nav. Jangan regresi.
- **Testing**: ikut [workflow testing](../docs/testing/workflow.md) — unit untuk logika berubah;
  UI/visual diperiksa MANUAL oleh pengguna; TIDAK menambah Playwright/screenshot rutin.
  Checkbox acceptance dicentang hanya setelah pengguna menyatakan oke.
- **Git**: coding/commit/push ke `dev`; `main` lewat PR rilis. Jangan stage tooling dirs
  (`.agents/ .claude/ .kiro/ .windsurf/`), `skills-lock.json`, `.env*`, `dist`, generated client.
  `.env.local` kedua portal (menunjuk proxy VPS) di-ignore — jangan commit.
- **Backend/VPS**: frontend lokal menunjuk API VPS production via Vite proxy
  (origin ditulis-ulang ke origin production). Lihat `vite.config.ts` kedua portal.

## Backlog redesain (R-series)

Serial, satu increment ujung ke ujung. Centang hanya setelah pengguna oke manual.

| ID | Judul | Cakupan | Status |
| --- | --- | --- | --- |
| R00 | Fitur tema per portal | Toggle terang/gelap/sistem + persistensi (SELESAI, commit 1822f62) | [x] |
| R01 | Fondasi routing | Pasang React Router di HR, migrasi dari hash, pertahankan slug/filter di URL; tambah halaman 404 route tak dikenal + guard auth (redirect ke login bila sesi hilang) | [x] |
| R02 | Primitives bersama | Breadcrumb, UnderlineTabs, StatusPill, PageHeader, EmptyState, Skeleton, ConfirmDialog, FormField di `packages/ui` (Atomic) | [ ] |
| R03 | Patokan: EmployeeDetail HR | Breadcrumb + underline tabs (Detail/Riwayat/Sesi) + list rows + pill status + aksi lifecycle via ConfirmDialog — KUNCI bahasa visual | [ ] |
| R04 | Shell HR | Sidebar + header + breadcrumb + command palette (⌘-K) + shortcuts | [ ] |
| R05 | HR list pages | Ringkasan, Karyawan, Absensi, Absensi-dihapus, MasterData (Dept/Jabatan), Hari Libur — pola GitHub list | [ ] |
| R06 | HR detail pages | AttendanceDetail + MasterData detail — breadcrumb + tabs. ITEM KHUSUS: peta Leaflet (loading/empty/fallback, token tema, z-index) didesain tersendiri, bukan sekadar styling | [ ] |
| R07 | Attendance portal | Login, Home "Hari ini", Capture, History, ChangePassword — lapang/mobile, motion halus. ITEM KHUSUS: alur kamera full-screen (states: deteksi/gagal/ragu/fallback manual) didesain tersendiri | [ ] |
| R08 | Motion & polish | Transisi, skeleton, toast, empty/error di kedua portal; audit `prefers-reduced-motion` | [ ] |
| R09 | Responsif + a11y sweep | 320/768/1024/1440 terang+gelap; kontras & keyboard; pengguna verifikasi manual | [ ] |
| R10 | Rapikan commit & docs | Squash/retata commit saat website clear; update design-system/ui-ux + progress | [ ] |

## Ketentuan pindah agen

- Satu agen aktif, tanpa subagen/paralel. Kerja serial sesuai urutan R-series.
- Catat increment aktif + file + proses/port di [progress.md](progress.md) sebelum berganti.
- Sebelum ganti: cek `git status`/diff + proses berjalan; jangan menimpa kerja sesi lain.
- Memori host sering CRITICAL — jalankan dev server/suite berat hanya saat memori lega
  (resource_status; available ≥ ~3 GB & bukan CRITICAL). Verifikasi visual = pengguna manual.
- HEAD, branch dan status Git aktual adalah sumber kebenaran, bukan transkrip usang.
