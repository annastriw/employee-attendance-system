# Progres dan titik lanjut

## R05 — HR list pages: pill konsisten + fix link routing (2026-10-05)

Selesai dan diterima pengguna lewat cek manual. Halaman list HR disamakan ke pola GitHub list dengan pill status konsisten dan link yang benar di bawah path routing.

- Baru: `apps/hr-web/src/components/molecules/StatusPill.tsx` (komponen pill dot+label) + `status-pill.ts` (tipe `PillTone`, `PILL_TONE_CLASS`, mapping `monitoringTone`/`attendanceTone` — logika murni, dipisah agar fast-refresh/lint bersih).
- Ringkasan (`MonitoringPage`): fix link mati `#absensi?id=` → router `Link` ke `/absensi?id=` (regresi R01); pill status baris + badge tipe jadwal pakai `StatusPill`. Test diperbarui: href `/absensi?id=rec-1` + bungkus `MemoryRouter`.
- Absensi (`AttendancePage`): kolom status pakai `StatusPill` (tone via `attendanceTone`), menggantikan span inline.
- Hari Libur (`HolidaysPage`): pill Lampau/Hari Ini/Mendatang pakai `StatusPill`.
- Karyawan (`EmployeesPage`) & MasterData Dept/Jabatan (`MasterDataPage`): sudah memakai HeroUI `Table` + `StatusBadge` konsisten; tidak diubah.
- Verifikasi: hr-web build/typecheck OK, lint bersih, 86/86 unit test lulus. `StatusBadge` (ACTIVE/INACTIVE/ARCHIVED) tetap dipakai untuk entitas master/karyawan; `StatusPill` untuk status attendance/jadwal/holiday. Penyatuan StatusBadge/ConfirmDialog/Notice/PasswordField ke `packages/ui` masih ditunda (R07).
- Lanjut: R06 — HR detail pages (AttendanceDetail + MasterData detail): breadcrumb + tabs; item khusus peta Leaflet (loading/empty/fallback, token tema, z-index) didesain tersendiri.

## R04 — Shell HR: command palette + shortcuts (2026-10-05)

Selesai dan diterima pengguna lewat cek manual. Shell HR dapat command palette (⌘-K/Ctrl-K) + shortcut.

- Baru: `apps/hr-web/src/components/organisms/command-palette.ts` (tipe `Command`, `fuzzyMatch`, `filterCommands` — logika murni) dan `CommandPalette.tsx` (gate `open` + body: overlay modal, input combobox autofocus via rAF, listbox options, navigasi keyboard ↑/↓/Enter/Esc, clamp active saat render, `scrollIntoView` di-guard untuk jsdom) + `CommandPalette.test.tsx` (7 test).
- `WorkspaceLayout.tsx`: shortcut global Cmd/Ctrl-K toggle; tombol header "Cari…" dengan hint `⌘K`/`Ctrl K`; membangun daftar perintah (7 navigasi via `useNavigate`, 3 tema via `setThemePreference`, Keluar via `logout`); fokus kembali ke trigger saat ditutup.
- `index.css`: style `cmdk-*` (overlay, panel, input, list, group, option aktif, trigger, kbd) memakai token yang ada; `prefers-reduced-motion` + sembunyikan label trigger di layar sempit.
- Keputusan: "breadcrumb" shell mengikuti pola `PageHeader` R03 (dipasang per-halaman di R05/R06); tidak menambah breadcrumb shell yang redundan.
- Verifikasi: hr-web build/typecheck OK, lint bersih, 86/86 unit test lulus (7 baru). `StatusBadge/ConfirmDialog/Notice/PasswordField` masih di hr-web (penyatuan ditunda R05/R07).
- Lanjut: R05 — HR list pages (Ringkasan, Karyawan, Absensi, Absensi-dihapus, MasterData Dept/Jabatan, Hari Libur) pola GitHub list, memakai PageHeader/breadcrumb + pill + rows padat.

## R03 — Patokan EmployeeDetail HR (2026-10-05)

Selesai dan diterima pengguna lewat cek manual. EmployeeDetail HR menjadi patokan bahasa visual (GitHub/Primer): breadcrumb + underline tabs + pill status + aksi lifecycle via ConfirmDialog.

- Primitives R02 dipakai ulang: `PageHeader` + `Breadcrumb` (`Karyawan / <Nama>`), `UnderlineTabs` (Detail/Riwayat/Sesi). `Breadcrumb`/`PageHeader` diberi opsi `onNavigate(href)` agar crumb bernavigasi dalam SPA (bukan reload); backward compatible (href-only tetap jalan).
- Header: judul = nama + pill status; aksi = Kembali, Lihat absensi (navigate `/absensi?employeeId=`), dan tombol lifecycle (Reset/Nonaktifkan/Aktifkan/Arsipkan/Restore) via `ConfirmDialog`.
- `StatusBadge` hr-web diperluas ke ACTIVE/INACTIVE/ARCHIVED (pill `.status-archived`), menggantikan hack inline "Arsip".
- Tabs: Detail = `EmployeeForm` (aria 'Edit profil karyawan') + bagian Akun/email; Riwayat = timeline (kini `role=tabpanel`, aria 'Riwayat perubahan karyawan') + badge jumlah; Sesi = penjelasan sesi/akun yang merujuk aksi Reset di header. Default tab = Detail.
- Logika, copy ConfirmDialog, label tombol, notice, alur API, idempotency, dan polling pending TIDAK berubah. Banner pending (lifecycle/email) tetap di luar tab agar selalu terlihat.
- Dihapus: link hash lama `#absensi?employeeId=` + CSS orphan `.attendance-history-link`. Halaman kini memakai `useNavigate` (butuh Router) — test membungkus render dengan `MemoryRouter`.
- Test: `displays history timeline` dan reset-password kini membuka tab Riwayat lalu query `tabpanel`; assertion perilaku lain tetap. Verifikasi: hr-web build/typecheck OK, lint bersih, 79/79 unit test lulus.
- File: `packages/ui/src/molecules/Breadcrumb.tsx`, `packages/ui/src/organisms/PageHeader.tsx`, `apps/hr-web/src/components/molecules/StatusBadge.tsx`, `apps/hr-web/src/pages/EmployeeDetailPage.tsx`, `apps/hr-web/src/pages/EmployeeDetailPage.test.tsx`, `apps/hr-web/src/index.css`.
- Catatan: `ConfirmDialog`/`StatusBadge`/`Notice`/`PasswordField` masih di hr-web (penyatuan ke `packages/ui` ditunda R05/R07).
- Lanjut: R04 — Shell HR (sidebar + header + breadcrumb + command palette ⌘-K + shortcuts).

## R01 — Fondasi routing HR (2026-10-05)

Selesai dan diterima pengguna lewat cek manual dev server (route lancar). HR portal pindah dari hash routing ke React Router path routing.

- Dependency: `react-router-dom@7.18.4` (pinned) di `apps/hr-web`.
- Path per view: `/ringkasan` `/karyawan` `/absensi` `/absensi-dihapus` `/departemen` `/jabatan` `/hari-libur`; `/` redirect ke `/ringkasan`; `*` → halaman 404.
- Filter/slug URL dipertahankan: pages tetap memakai kontrak `{ params: URLSearchParams, onParamsChange }` lewat adapter `useSearchParams` (navigasi `replace`, setara `history.replaceState` lama). Detail-dalam-view (`?employee=`, `?id=`) tak berubah — siap jadi sumber breadcrumb di R03/R05/R06.
- 404 memakai primitive bersama R02 `EmptyState` (tidak membuat primitive baru).
- Guard auth `RequireAuth`: redirect ke `/masuk` saat sesi hilang / `restore()` gagal; gate `mustChangePassword` ke `/ganti-password`. Login + ganti password identik perilaku dengan `App.tsx` lama (state diangkat ke `AuthProvider` + `auth-context`).
- `WorkspaceLayout` kini shell router (NavLink + Outlet; judul/active diturunkan dari path; Notice error bersama di atas Outlet). IA/label nav tidak diubah.
- Vite SPA fallback default (`appType: spa`, tanpa override) → refresh di sub-path tidak 404. Proxy VPS di `vite.config.ts` tidak disentuh.
- Dihapus (dead): `src/lib/use-hash-route.ts`, `src/pages/DashboardPage.tsx`.
- Test: tambah polyfill `window.matchMedia` di `src/test/setup.ts` (jsdom tak punya; `ThemeToggle` bersama memakainya) dan helper `src/test/router.tsx` (`memoryRouter`). `App.test.tsx` memakai `memoryRouter(["/"])`.
- Verifikasi: `pnpm --filter hr-web build` (tsc+vite) OK, `lint` bersih, 79/79 unit test lulus. attendance-web tidak disentuh. StatusBadge/ConfirmDialog/Notice/PasswordField belum dipindah (ditunda R05/R07).
- File: `apps/hr-web/package.json`, `pnpm-lock.yaml`, `apps/hr-web/src/App.tsx`, `apps/hr-web/src/App.test.tsx`, `apps/hr-web/src/components/templates/WorkspaceLayout.tsx`, `apps/hr-web/src/routes/*` (routes.ts, auth-context.ts, AuthProvider.tsx, RequireAuth.tsx, LoginRoute.tsx, ChangePasswordRoute.tsx, NotFoundRoute.tsx, ViewRoutes.tsx), `apps/hr-web/src/test/{setup.ts,router.tsx}`.
- Lanjut: R03 — patokan EmployeeDetail HR (breadcrumb dari path + underline tabs Detail/Riwayat/Sesi + list rows + pill status + aksi lifecycle via ConfirmDialog), mengunci bahasa visual.

## Handoff — 2026-10-05

Website/live diterima pengguna. Folder docs/temporary diminta dihapus dari checkout lokal serta dev/main GitHub; semua rujukan dipindahkan ke file ini. Dokumentasi analisis kebutuhan, PRD dan siklus SDD lengkap tetap dipertahankan. Sinkronisasi main menggunakan PR dev → main dengan CI, tanpa force push atau perubahan ruleset.

Tidak ada fitur baru yang sedang dikerjakan dan tidak ada service/proses baru yang dijalankan sesi dokumentasi ini. Agen berikut membaca AGENTS.md, status/diff/ref Git aktual, baseline dan file ini; bekerja serial tanpa subagen. Backup/mapping history ada di `.local/repository-cleanup/`, ignored dan privat; jangan dihapus atau dipush. Jangan menggabungkan checkout berhistory lama kembali; simpan pekerjaan lalu clone ulang jika perlu.

Calon pembahasan berikut (belum merupakan instruksi implementasi): verifikasi panduan setup dari clone bersih; keputusan lisensi repository sebelum menambah LICENSE; audit konsistensi docs/konfigurasi dan file yang benar-benar tidak digunakan. Jangan mengulang rewrite history atau menambah suite testing/deployment berat. Restore drill/load test/hardening tetap ditunda pengguna.

Saat PR penghapusan temporary, CI menemukan tiga ekspektasi MonitoringPage yang bergantung tanggal runner: fixture 2026-10-05 menjadi hari ini, sehingga filter sengaja menghilangkan parameter date. Unit diperbaiki dengan clock Date tetap untuk tanggal historis dan satu kasus hari ini WIB; kode aplikasi tetap. Verifikasi lokal: 10 file/79 unit HR lulus dan lint file monitoring lulus. Command unit file terfokus di panduan diperbaiki agar filter diteruskan langsung ke Vitest. PR #8 memuat penghapusan temporary, dokumentasi SDD sebelumnya dan perbaikan test ini.

## Increment dokumentasi SDD — 2026-10-05

Arahan pengguna: SDD mulai analisis kebutuhan dan PRD hingga auto-deployment. Ditambahkan analisis/PRD ringkas berdasarkan baseline serta lifecycle yang menghubungkan desain, spesifikasi domain, Kanban, implementasi, verifikasi, PR main, Vercel/GHCR/VPS dan feedback. Dokumentasi ini bertanggal aktual; tidak mengubah aturan bisnis/source atau mengarang bukti acceptance. Verifikasi increment: isi/source acuan, tautan relatif dan diff; tidak menjalankan test aplikasi untuk perubahan dokumentasi saja. Coding/push tetap dev; promosi main kembali lewat PR.

## Selesai — perapian repository

Keputusan pengguna 2026-10-04–05: README Inggris, SDD/panduan Indonesia, docs/ERD/fitur/local setup, GitHub About, audit secret, hapus duplikasi/artefak tidak penting dan kurasi history dev/main. Kerja serial tanpa subagen; catatan sementara sudah digabung ke file ini dan folder temporary dihapus sesuai arahan berikutnya.

## Bukti live terakhir

- Pengguna menerima kedua portal/live dan login layout seragam.
- Seed demo: lima profil ACTIVE/ready, provisioning COMPLETED; 195 daily records, 390 event/photo dan satu batch audit menurut output pengguna. Akun publik/password README ditentukan pengguna.
- API health yang dikirim pengguna: status ok, service api-gateway, auth ready, release f581f31aa11d757e36aeab7b06936d40bc6f547f, sama SHA merge main. Membuktikan auto-deploy backend, bukan hanya build image.
- Health/storage sebelumnya HTTP 200 dan permission bucket privat/admin denied diterima dari output pengguna. Tidak menjalankan pemeriksaan live baru pada perapian.

## Bukti increment health release

Sebelum cleanup, perubahan 2bac3b4 menambah RELEASE_SHA Docker/Actions dan field release pada Gateway health. Dua suite/3 unit, lint dan build Gateway lulus. Pengguna merge lalu mengirim hasil live di atas. Tidak perlu mengulang tes yang sama tanpa perubahan baru.

## Kondisi perapian

Backup Git lengkap dan metadata tanggal disimpan di .local/repository-cleanup, ignored. Audit awal 1.196 blob branch dev/main tidak menemukan pola token/private key atau match secret lokal aktif; batas pemeriksaan ada di [security](../docs/security.md).

Source bisnis, tests, migration, scripts operasional dan asset model runtime dipertahankan. Dokumen lama digabung, tujuh scaffold README dan enam asset React/Vite tanpa referensi dihapus. Semua untracked tooling pengguna tetap tidak disentuh. Tidak menjalankan/stop service lokal/VPS pada tahap dokumentasi.

Perapian selesai. Main lama 145 commit dikurasi menjadi 26 milestone bertanggal sumber asli, lalu satu commit penutupan aktual. Pada penutupan kurasi, dev/main lokal dan remote sama; GitHub About dan default main sesuai, ruleset main-production asli aktif kembali. Workflow kurasi sukses dan melewati build/deploy VPS karena business source/migration tidak berubah. Relative links, kedua build frontend dan tujuh unit detector lulus. Audit sesudah kurasi mencakup 898 blob tanpa match/path sensitif tracked; lihat batas audit. Handoff di file ini memuat bukti dan cara melanjutkan tanpa force push.

## Batas dan izin

Satu kali rewrite history + force-with-lease dev/main diizinkan pengguna, dengan tanggal sumber dan backup pemulihan. Aturan berikutnya tetap dev→PR→main tanpa force push. Nilai public demo hanya boleh di README/panduan, bukan alasan menaruh secret infra di Git.

Restore drill/load test/hardening tambahan ditunda pengguna. Jangan mengklaim lulus atau mengaktifkan task itu dari catatan lama. Lanjut berdasarkan status/diff aktual, bukan transkrip sesi yang usang.
