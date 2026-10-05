# Progres dan titik lanjut

## CI overlay filter - tindak lanjut fokus (2026-10-05)

- Run [37276394119](https://github.com/annastriw/employee-attendance-system/actions/runs/37276394119)
  pada 4c4e2f4 masih gagal pada penutupan panel induk. Menunggu dropdown anak
  unmount belum menjamin pemulihan fokus keyboard selesai; Escape di jsdom CI
  tidak mencapai panel. Unit lain/lint/build tetap lulus pada run tersebut.
- Test kategori/query kini menutup parent melalui tombol dismiss accessible
  bawaan React Aria setelah dropdown anak unmount, lalu membuktikan parent
  terlepas dari DOM. Kontrol penutup parent ditangkap sebelum dropdown anak
  dibuka agar tidak tertukar dengan kontrol dismiss overlay anak.
  Tetap memakai overlay asli dan semua assertion kategori,
  kombinasi status/search, pagination, clear dan reset; tidak menyembunyikan
  kegagalan dengan delay, mock, skip, hidden query atau menambah timeout.
- File/task aktif tetap EmployeeFilters.test dan catatan ini; verifikasi
  terfokus CI=true 9/9 lulus, lint file dan tsc -b HR lulus.
  Berikutnya push dev dan pantau CI SHA terbaru.
  Tidak mengubah aplikasi, workflow, schema atau membuat server permanen.

## Perbaikan CI fase D - overlay filter (2026-10-05)

- Pengguna meminta membaca dan memperbaiki CI hingga lulus. Run
  [37275831556](https://github.com/annastriw/employee-attendance-system/actions/runs/37275831556)
  pada SHA 1fb79d1: lint, Prisma, typecheck DB dan build lulus; unit HR gagal satu
  EmployeeFilters.test. HR lain 124 unit dan Karyawan 106 unit lulus pada CI itu.
- Penyebab: setelah memilih dropdown kategori, test langsung mengirim Escape
  saat dropdown anak belum selesai unmount. Escape tidak menutup panel induk;
  tombol Buka filter masih tertutup secara aksesibilitas. Tidak ada bukti query
  filter aplikasi rusak dari kegagalan ini.
- Fix hanya test: tangkap node menu/panel, tunggu menu anak dilepas dari DOM,
  kirim Escape lalu tunggu panel induk dilepas sebelum interaksi selanjutnya.
  Tidak menggunakan delay tetap, hidden query, mock overlay atau timeout lebih besar.
- Task aktif: verifikasi terfokus dan push fix ke dev, kemudian pantau CI PR
  yang sudah ada. Source aplikasi/workflow/aturan bisnis tidak diubah.
- File: apps/hr-web/src/pages/EmployeeFilters.test.tsx dan tasks/progress.md.
  Verifikasi kedua file filter/EmployeesPage 9/9 lulus, termasuk run CI=true.
  Lint file dan tsc -b HR lulus. Build tidak diulang karena hanya test/docs
  berubah dan build CI sebelumnya lulus. Tidak ada server permanen baru.
  Hasil CI setelah push harus dinilai pada SHA baru, bukan run gagal sebelumnya.

## Instruksi terbaru - commit/push dev (2026-10-05)

Pengguna meminta push ke dev setelah selesai. Menggantikan batas local-only
fase D. Verifikasi teknis T22-T31 lulus; commit dipisah perbaikan UUID/filter
API dan revisi UI/logout. PR/merge/main/deployment tidak diminta; acceptance
manual tetap pending. Tidak ada perubahan schema/migration.
Commit UUID/filter `1f15d96` telah dipush ke origin/dev. Revisi UI/logout dan
catatan fase D disimpan pada commit berikutnya bersama entri ini.

## Fase D - T29-T31 tambahan selesai teknis lokal (2026-10-05)

- Permintaan lanjutan pengguna: satu akses Keluar di popup akun kedua portal,
  scan seluruh UUID dan perbaiki bug/issue terkonfirmasi. Total fase D 10 task
  T22-T31 selesai teknis; acceptance visual tetap pending.
- Logout di profil/form/command palette dihapus. Layar wajib ganti password
  mendapatkan popup akun tanpa navigasi Profil; busy memblokir aksi.
- Audit UUID memperbaiki pipe master Employee, reset password Auth, bind Media,
  referensi foto/daily Attendance dan parser record/event Karyawan. UUID v1/v5
  diterima, malformed tetap ditolak, aturan v4 Idempotency-Key dipertahankan.
  Filter monitoring/detail riwayat case-insensitive; tanggal mustahil ditolak.
  Fixture storage Media yang gagal typecheck kini memuat workerEnabled:false.
- Bukti tambahan: 109 unit terfokus lulus (sebagian tumpang tindih checkpoint
  sebelumnya); lint dua frontend + empat backend, noEmit empat backend dan
  build/typecheck dua frontend lulus. Rincian/batas: [fase D](frontend-revision-phase-d.md).
- File terkait: shared ChangePasswordForm/AuthShell/WorkspaceAccountMenu/styles;
  profil/layout/route/App/tests kedua portal; DTO/pipe/service serta regresi
  Employee/Auth/Media/Attendance; parser attendance-client/history dan tests;
  design-system serta tasks. Tidak ada migration atau data tersimpan diubah.
- Tidak ada server permanen baru. Test deadline storage menutup server loopback
  sementara. Proses verifikasi selesai; tidak ada pemeriksaan live/DB/browser.
- Semua unstaged/lokal di dev, **tanpa commit/push/PR/merge/deploy**. Kelima service
  dan kedua frontend perlu rilis terpisah agar perbaikan tersedia di production.
- Lanjut: pengguna cek [acceptance manual](frontend-revision-phase-d.md) termasuk
  popup logout dan UUID; checklist tidak dicentang sebelum pengguna menyatakan oke.

## Fase D - T22-T28 selesai teknis lokal (2026-10-05)

- Seluruh task revisi selesai teknis; [audit, plan, bukti dan checklist](frontend-revision-phase-d.md). UI/alur manual belum diterima pengguna dan checkbox acceptance tetap kosong.
- Perbaikan: UUID v1 filter Ringkasan; Gateway kategori daftar karyawan; toolbar search/filter/tab/Tambah sejajar dengan chips terpisah; kalender fixed sebulan utuh tanpa scroll dengan tombol bulan; danger/warning/success aksi dan konfirmasi; brand tetap di header; tema via menu; nama profil + email akun terlihat; shared shell kedua role mobile/tablet/desktop.
- Verifikasi terfokus: HR 75 unit, Karyawan 30, backend 30 = 135 unit lulus. Lint HR/Karyawan/Gateway/Attendance, tsc kedua frontend dan noEmit dua backend lulus. Build kedua portal lulus (warning ukuran chunk masih ada); Vite rebuild sesudah perubahan CSS drawer akhir lulus. Review diff/whitespace dan tautan dokumen lulus. Tidak ada test integrasi DB/live atau browser harness dijalankan.
- **Perlu rilis terpisah:** Attendance Service GET /api/v1/monitoring/employees menerima UUID sah, API Gateway GET /api/v1/employees meneruskan departmentId/positionId. Dua frontend perlu rilis bersama. Tanpa migration; production belum berubah.
- Semua perubahan tetap unstaged di branch dev, tanpa commit/push/PR/merge/deploy sesuai instruksi terbaru. Hasil build ignored. Tidak menjalankan server baru; seluruh proses verifikasi selesai.
- File terkait: kedua backend DTO/proxy + regresi; shared UI calendar/theme/account/shell/confirm/styles; HR list/detail/layout/tests, Karyawan App/workspace/test; design-system dan tasks. Tidak menimpa pekerjaan pengguna (tree awal bersih).
- **Lanjut pengguna:** jalankan kedua portal lokal sesuai tooling yang ada; cek seluruh matriks filter, bulan 28/29/30/31 hari termasuk 6 minggu, toolbar/warna/header/akun/tema, drawer/rail dan capture pada 320/375/768/1024/1440px + landscape, dua tema. Catat scope yang oke sebelum centang acceptance. Tidak memerlukan task coding baru otomatis.


## Fase D — implementasi/verifikasi T23–T28 (2026-10-05)

- Klarifikasi pengguna diterima: kalender fixed satu bulan utuh tanpa geser, tombol pindah bulan; brand tetap di header walaupun sidebar terbuka. Pengguna meminta terus sampai seluruh task selesai teknis.
- Filter API diperbaiki lokal (Attendance DTO UUID sah dan Gateway departemen/jabatan khusus list employees). Unit Attendance monitoring 14/14 dan Gateway 11/11 lulus. Tanpa migration.
- Toolbar/shared kalender, warna konfirmasi/aksi, shell header tetap, menu tema dan identitas nama/email telah diimplementasikan. HR 7 halaman 68/68; filter karyawan interaksi 1/1; kontrol workspace 3/3; Karyawan History/Login/Capture 20/20 dan App ulang 10/10 lulus. Lint empat package dan typecheck dua frontend/dua backend lulus pada checkpoint ini.
- Review menemukan callback expiry yang berubah memicu fetch identitas berulang; kini menggunakan ref, lookup berdasarkan client/email/role. Fixture App absensi diperbaiki berbasis endpoint agar request identitas tidak memakan respons absensi berdasarkan urutan effect.
- Task aktif T28: unit tambahan master/holiday dan build frontend sedang berjalan, kemudian final lint/diff/docs/checklist. Tidak ada server baru; tidak commit/push. Acceptance visual tetap pending.

## Fase D — T22 audit selesai, klarifikasi awal (2026-10-05)

- Instruksi terbaru: T terdahulu dianggap selesai oleh pengguna. Revisi baru T22–T28 serial, lokal **tanpa commit/push**, PR/merge/deploy. Ini menggantikan instruksi push pada entri sebelumnya untuk scope revisi ini.
- Tree awal bersih, branch dev. Audit sumber dua portal/shared UI/Gateway/service mencatat D01–D12 dan matriks seluruh filter di [fase D](frontend-revision-phase-d.md). Tidak menjalankan browser, unit atau build untuk tahap audit/dokumentasi ini.
- Dua akar masalah terkonfirmasi: Monitoring DTO hanya UUID v4, menolak UUID v1 laporan; Gateway direktori employees menolak departmentId/positionId walau DTO/query Employee sudah mendukungnya.
- Task aktif: T22 penyelesaian audit/klarifikasi. Pertanyaan dikirim tentang target scroll kalender dan lokasi brand tetap. Plan T23–T28 siap; belum mengubah kode aplikasi.
- File sesi: tasks/frontend-revision-phase-d.md, plan.md, todo.md, redesign-sprint.md, progress.md dan docs/sdd/frontend-design-system.md. Proses/port: tidak menjalankan server baru; 5173/5174/3000–3004 tidak ditemukan listening saat audit awal.
- **Lanjut:** jawaban klarifikasi lalu T23 filter API (Attendance/Gateway, tanpa migration), T24 toolbar/kalender, T25 warna, T26 shell/tema/akun, T27 semua layar kedua role, T28 verifikasi/handoff. Acceptance visual belum dicentang; gunakan checklist fase D.

## Perbaikan CI setelah T21 (2026-10-05)

- CI run [37268278818](https://github.com/annastriw/employee-attendance-system/actions/runs/37268278818), SHA 9ea86b6: lint, Prisma validate/generate, typecheck database dan build seluruh aplikasi lulus; unit Karyawan gagal pada App.test.tsx, test deep link riwayat. API mock belum dipanggil saat assertion setelah heading.
- Root cause: heading PageHeader tersedia sebelum effect data-loading; test menganggap heading menandakan request telah dimulai. Lokal fokus lulus tetapi CI membuktikan race pada penjadwalan React.
- Fix hanya test: tunggu request dengan waitFor dan buktikan error fixture tampil sebelum unmount. Bagian profil juga menunggu request dan hasil fallback. Tidak menambah delay tetap, mengurangi assertion, atau mengubah aplikasi/workflow CI/backend.
- File: apps/attendance-web/src/App.test.tsx dan tasks/progress.md. Pengguna meminta commit/push dev; tidak membuat PR/main/deployment. Tidak ada server baru.
- Verifikasi lokal: App.test 10/10, lint attendance-web dan tsc -b lulus. Build tidak diulang: hanya test/dokumentasi berubah dan build CI SHA sebelumnya lulus; RAM bebas OS 1,74 GiB, resource_status tidak tersedia.
- **Lanjut:** commit/push dev, lalu pantau CI PR yang sudah ada. Acceptance visual revisi tetap mengikuti checklist T21.

## T21 selesai teknis; pengguna meminta commit/push dev (2026-10-05)

- T12-T21 selesai teknis setelah audit A01-A15. Sidebar/shell kedua role, kontrol hover/focus inset, grouped filter/chips/reset, Table HeroUI/cards mobile, detail/form fullwidth/breadcrumb, chart dan master data telah diperbaiki. Acceptance visual/kamera belum dicentang.
- Verifikasi: HR 7 file 53/53; Karyawan App/History/Login/Capture 30/30 (App terakhir 10/10 termasuk drawer/focus/rail). Attendance lifecycle 3/3; Gateway attendance proxy 13/13. Total 99 test terdampak lulus. Lint HR/Karyawan/Attendance/Gateway, typecheck kedua frontend dan noEmit kedua backend lulus. Tautan Markdown dan diff diperiksa.
- Build tidak dijalankan: resource_status tidak tersedia; free RAM OS terakhir 2,61 GiB. Tidak menjalankan dev server baru atau browser harness. Proses test/typecheck selesai.
- **Perlu PR+deploy:** Attendance Service + API Gateway, GET /api/v1/attendance optional departmentId/positionId; filter snapshot historis sebelum pagination/count, UUID seeded diterima. Tanpa migration. Rilis bersama HR frontend.
- Instruksi terbaru pengguna menggantikan local-only: commit dan push ke dev di repository origin proyek. PR/merge/main/deployment tetap oleh pengguna; tanpa force push. Stage hanya file revisi/test/spec/progress, bukan tooling/env/dist/generated.
- File: shared controls/workspace/filter/date/header/chart/account; kedua portal/layout/pages/styles/tests; Attendance lifecycle DTO/service/test; Gateway proxy/test; sprint/audit/spec/checklist.
- **Lanjut:** setelah push berhasil, pengguna PR dev ke main; build CI dan deploy, lalu [checklist manual](frontend-revision-manual-checklist.md) 320/768/1024/1440px, dua tema, keyboard/zoom dan alur kamera. Untuk runtime kirim URL/method/status/Response request gagal dan Console stack pertama, tanpa cookie/token.

## T20 selesai lokal; T21 aktif (2026-10-05)

- Portal Karyawan memakai WorkspaceShell/sidebar/account yang sama dengan HR. Hari ini/Profil/Riwayat memakai PageHeader dan breadcrumb; detail bukti dua kolom desktop dan fullwidth; daftar riwayat grid responsif, status/filter shared. Stylesheet shell lama dihapus; capture fullscreen dipertahankan.
- Lint/typecheck Karyawan lulus; App/Login/History/Capture 29/29. Perbaikan review tambahan: drawer tidak terbuka kembali ketika kembali ke route lama; fokus menu hanya dipulihkan bila drawer terbuka; breadcrumb ubah karyawan lengkap. Regression drawer/rail sedang diuji T21.
- File: App/test, EmployeeWorkspace, Home/History/Profile, History test, CSS home/history, shared PageHeader/WorkspaceShell.
- Semua lokal tanpa commit/push. **Lanjut:** T21 review diff, lint/typecheck/regresi terdampak, spec dan checklist handoff. Build hanya bila resource lega, visual/kamera oleh pengguna.

## T19 selesai lokal; T20 aktif (2026-10-05)

- Master Departemen/Jabatan/Hari Libur memakai PageHeader/breadcrumb, aksi tambah di header, toolbar/reset sejajar dan sel berlabel untuk mobile cards. Periode Hari Libur dikelompokkan dalam FilterPanel; tab mengikuti kontrol shared. Header list Absensi/Ringkasan ditambahkan.
- Unit HolidaysPage 9/9 dan typecheck HR lulus. Tidak ada file MasterDataPage.test; perubahan layout master tidak mengubah aturan bisnis. Final lint/regresi kontrak pada T21.
- File: MasterDataPage/HolidaysPage/AttendancePage/MonitoringPage dan HR workspace.css. Semua lokal; tidak commit/push/dev/build.
- **Lanjut:** T20 keseragaman halaman Karyawan dan T21 pemeriksaan/handoff. Acceptance visual pending.

## T18 selesai lokal; T19 aktif (2026-10-05)

- Ringkasan chart satu kolom <1200px, tinggi mobile 210px, date range tidak menekan chart, ruang sumbu tidak negatif, legend/donut terbatas sesuai konten. Metrik mobile dua kolom dan badge kompak. Data/query tidak berubah.
- File: MonitoringPage, HR workspace.css dan shared ChartContainer. Lint/typecheck HR lulus; unit MonitoringPage 9/9 pada T16, grafik tidak mengubah logika. Render belum diverifikasi pengguna.
- Tidak commit/push/build/dev. **Lanjut:** T19 master data seragam, lalu T20 portal Karyawan.

## T17 selesai lokal; T18 aktif (2026-10-05)

- Detail absensi/karyawan dan form tambah/ubah memenuhi lebar workspace. Form tambah dua panel pada desktop, satu kolom mobile; evidence dua kolom tablet/desktop tanpa panel bersarang. Breadcrumb tambah/ubah dan asal absensi terhapus sesuai konteks; Back tetap mempertahankan query.
- Unit AttendancePage/EmployeesPage/EmployeeDetailPage 28/28; typecheck HR lulus. File: tiga halaman HR, EmployeeForm, workspace.css. Visual pending pengguna.
- Tidak commit/push, build/dev server belum dijalankan.
- **Lanjut:** T18 Ringkasan/chart responsif, lalu master data T19.

## T16 selesai lokal; T17 aktif (2026-10-05)

- FilterPanel HeroUI, chip aktif/removable dan reset shared di Absensi, direktori, Ringkasan. Preset tanggal di kalender. Tabel monitoring beralih HeroUI, Space tetap membuka detail dan link anak tetap terpisah. Semua tabel utama mengikuti ukuran kompak; daftar absensi/karyawan mobile cards berlabel.
- Unit AttendancePage 10/10, EmployeesPage 8/8, MonitoringPage 9/9. Typecheck HR lulus sebelum perbaikan capture Space; final lint/typecheck kembali pada T21. File: shared FilterPanel/lists/DateRangeField, tiga halaman HR beserta regression test.
- Semua lokal; tidak commit/push/dev server/build. Visual tidak diklaim telah diperiksa.
- **Lanjut:** T17 fullwidth detail/form dan breadcrumb, kemudian T18 chart responsif.

## T14 dan T15 selesai lokal; T16 aktif (2026-10-05)

- T14: shell/sidebar dan menu akun shared kedua role, brand link, route title berbatas segmen. Lint/typecheck dua portal lulus; unit HR preference 3/3 dan Employee App 9/9.
- T15: filter departemen/jabatan menggantikan picker nama; konteks employeeId tetap dipertahankan ketika membuka detail. Snapshot historis difilter sebelum pagination/count. Frontend AttendancePage 10/10, service 3/3, Gateway 13/13; lint backend dan typecheck HR lulus.
- **Perlu PR+deploy:** Attendance Service + API Gateway, GET /api/v1/attendance menerima departmentId/positionId; employeeId menerima seeded UUID. Tanpa migration. Semua masih lokal, tidak commit/push.
- File: shared workspace/controls/account, EmployeeWorkspace/App, HR WorkspaceLayout/preferences/AttendanceFilters/AttendancePage, attendance-lifecycle DTO/service/test, Gateway attendance-admin proxy/test. Tidak ada dev server baru. Build ditunda RAM.
- **Lanjut:** T16 grouped toolbar/filter dan tabel kompak. Acceptance visual tetap menunggu pengguna.

## T13 selesai lokal; T14 aktif (2026-10-05)

- Pengguna mengonfirmasi garis offside saat hover dan fokus. Kontrol shared kini memakai ring inset tunggal, input anak/suffix kompak, tabs/status/badge proporsional.
- File: packages/ui/src/styles/controls.css dan theme.css. Lint dan typecheck kedua portal lulus. Tidak ada logika bisnis berubah pada T13. Acceptance visual belum diperiksa pengguna.
- T14: WorkspaceShell/SidebarShell bersama, brand link, drawer/rail kedua role, account menu shared; unit route segment HR 3/3 lulus. Regresi employee App sedang diverifikasi.
- Proses: tidak menjalankan dev server/build; RAM bebas 2,83 GiB saat cek. resource_status tidak tersedia. Semua perubahan lokal, tanpa commit/push.
- **Lanjut:** tuntaskan regresi T14 lalu T15 filter kategori Absensi.

## T12 selesai lokal — audit revisi; T13 menunggu klarifikasi reproduksi (2026-10-05)

- HEAD awal `18edf0b`, branch dev sinkron origin/dev, tree bersih. Audit sumber kedua
  frontend, shared UI dan kontrak filter menemukan A01–A15; lihat
  [frontend-revision-audit.md](frontend-revision-audit.md).
- Root cause sidebar/chart mobile: aturan base sesudah media menimpa aturan
  responsif. Detail/form masih dibatasi 48rem. Tab status 40px menimpa token 32px.
  Focus input native bersaing dengan group HeroUI; trigger laporan pengguna perlu
  dibedakan antara hover dan fokus.
- Backlog T12–T21 ditambahkan serial. Instruksi terbaru: seluruh revisi lokal,
  tanpa commit/push otomatis; pengguna mengurus push dev/PR/main/deploy.
- API Absensi belum menerima departemen/jabatan; T15 membutuhkan Attendance Service
  + API Gateway, GET /api/v1/attendance dengan departmentId/positionId optional.
  Snapshot ID sudah ada, tanpa migration. Perlu PR+deploy setelah fase lokal.
- Belum mengubah implementasi aplikasi atau menjalankan build/dev server/tests.
  Perubahan audit hanya dokumentasi; isi, tautan lokal dan diff diperiksa.
- **Lanjut:** klarifikasi state garis hijau offside, lalu T13 kontrol/focus/hover
  bersama (packages/ui, Login/Search/DateRange). Task kode belum dimulai.

## T11 selesai - dokumentasi dan perapian (2026-10-05)

- Design system dan UX spec kini mencatat pola rail/drawer HR, navigasi responsif
  Karyawan, chart/rentang tanggal, profil read-only, tabel kartu mobile, serta D11/D12.
- `docs/features.md` mencatat fitur UI dan daftar backend yang perlu PR ke `main` lalu
  deploy: Employee Service + API Gateway `GET /api/v1/employees` (filter optional),
  Attendance Service + API Gateway `GET /api/v1/monitoring/trend`, Employee Service +
  API Gateway `GET /api/v1/me/profile`; ketiganya tanpa migration.
- Verifikasi dokumentasi: `git diff --check`, isi, dan tautan relatif diperiksa; tidak
  menjalankan test aplikasi untuk perubahan dokumentasi saja.
- **Lanjut:** acceptance visual T10 tetap menunggu pemeriksaan pengguna di 320/768/
  1024/1440px, dua tema, dan kontrol zoom. Checkbox acceptance tidak dicentang.

## T10 teknis selesai - sweep responsif, a11y, dan skala kompak (2026-10-05)

- T10 kode selesai: tabel Monitoring HR menjadi kartu berlabel di bawah 768px tanpa
  scroll horizontal; sel tabel dan metrik memakai token D12; baris membuka detail
  dengan Enter/Space. Riwayat karyawan memakai ukuran waktu metrik bersama.
- Lint + typecheck HR dan Karyawan lulus; unit `MonitoringPage.test.tsx` lulus 9/9.
  Build/dev server tidak dijalankan karena `resource_status` tidak tersedia (catatan
  RAM bebas terakhir ~2.1 GiB). Zoom lock D11 sebelumnya sudah punya unit test.
- Acceptance visual T10 masih menunggu pengguna; checklist tetap tidak dicentang.
- **Lanjut:** T11 dokumentasi selesai; tunggu acceptance visual manual dari pengguna.

## T9 teknis selesai - Portal Karyawan responsif (2026-10-05)

- Migrasi hash ke React Router DOM 7.18.4; rute `/masuk`, `/ganti-password`, `/`,
  `/absen/masuk`, `/absen/pulang`, `/riwayat`, `/riwayat/:id`, `/profil`, dan
  halaman 404 ber-guard. Filter riwayat tetap di query URL, detail membuka pathname
  dan tombol browser Back/list mempertahankan filter.
- Shell baru: topbar brand/theme/avatar dan nav desktop/tablet, bottom nav mobile,
  area konten fixed dengan scroller tunggal, lebar konten terkendali tanpa ruang
  kosong. Beranda menggunakan dua kolom pada desktop cukup lebar, status/jadwal/
  tombol utama, jam server WIB, dan aktivitas tujuh hari; pada mobile panel tersusun
  satu kolom. Detail riwayat tetap memuat foto/lokasi; kartu riwayat seluruhnya
  clickable dengan fokus keyboard. Profil dan ganti password tetap dari shell.
- Verifikasi: 29 unit di App, HistoryPage, LoginPage, dan CapturePanel lulus; lint
  dan TypeScript attendance-web lulus. Build tidak dijalankan (resource_status tidak
  tersedia; catatan RAM bebas terakhir sekitar 2.1 GiB). Tidak ada perubahan backend.
- UI desktop/tablet/mobile, tema terang/gelap, kamera, dan acceptance manual menunggu
  pemeriksaan pengguna. PR+deploy hanya frontend setelah acceptance.
- Lanjut: T10 sweep responsif/a11y/polish untuk kedua portal. T9 akan di-commit/push
  ke `dev`; checklist acceptance visual tetap belum dicentang.

## T8 teknis selesai - Profil dan keamanan dua role (2026-10-05)

- Endpoint diri `GET /api/v1/me/profile` memverifikasi sesi lewat Auth Service,
  hanya mengambil profil berdasarkan `employeeId` dari sesi, mengembalikan `data:null`
  bagi HR tanpa employeeId, dan tidak mengizinkan data profil diubah sendiri.
- HR mendapat `/profil` dari menu akun; Karyawan mendapat Profil dari layar Hari ini.
  Keduanya menampilkan data diri read-only, status profil, tab Profil/Keamanan,
  fallback email+role saat endpoint 404, serta satu form password bersama. Sukses
  ganti password menghapus sesi dan meminta login ulang.
- Perlu PR+deploy sebelum profil karyawan aktif di production: Employee Service +
  API Gateway, endpoint di atas, tanpa migration. Aksi ganti password memakai Auth
  Service yang sudah ada. PR ke main dibuat pengguna.
- Verifikasi: HR unit 7/7, lint/typecheck lulus; Karyawan unit 8/8, lint/typecheck
  lulus; Employee Service unit 10/10, lint/typecheck lulus; API Gateway unit 3/3,
  lint/typecheck lulus. Build dilewati karena resource_status tidak tersedia dan
  RAM bebas terakhir sekitar 2.1 GiB. Acceptance UI manual masih pending.
- Lanjut: T9 overhaul responsif portal Karyawan, termasuk layar desktop/tablet
  proporsional, bukan hanya tampilan mobile. T8 akan di-commit/push ke `dev`.

## T7 teknis selesai - Ringkasan HR dengan tren dan detail inline (2026-10-05)

- Ringkasan HR kini memakai DateRangeField default 7 hari, grafik tren responsif
  dan berwarna token tema, donut ringkasan tanggal terpilih, tooltip/legenda Bahasa
  Indonesia, state skeleton/kosong/error, serta fallback 404 "Grafik tren tersedia
  setelah rilis backend". Klik baris membuka Drawer detail; desktop panel kanan,
  mobile sheet bawah, fokus kembali ke baris, dan ada tautan ke bukti absensi/profil.
- Backend Attendance Service + API Gateway menyediakan
  `GET /api/v1/monitoring/trend?startDate&endDate`, rentang inklusif maks. 92 hari,
  data historis per hari dan penanda jadwal/libur. Tidak ada migration.
- Perlu PR+deploy sebelum endpoint grafik aktif di production: Attendance Service,
  API Gateway, endpoint di atas, tanpa migration. Frontend aman saat endpoint belum
  live. PR ke main dibuat pengguna sesuai alur.
- Verifikasi: HR unit 8/8, lint dan typecheck lulus; Attendance Service unit
  terfokus 11/11, lint dan typecheck lulus; API Gateway unit 7/7, lint dan typecheck
  lulus. Build dilewati karena resource_status tidak tersedia; catatan RAM terakhir
  sekitar 2.1 GiB bebas. UI visual menunggu acceptance manual pengguna.
- Lanjut: T8 profil read-only dan ganti password tiap role. T7 sudah di-commit/push
  ke `dev`; acceptance visual tetap belum dicentang.

## T6 aktif - halaman detail HR dan aksi baris (2026-10-05)

- Detail Absensi memakai PageHeader + breadcrumb Absensi/tanggal/nama, status dan
  aksi lifecycle di header, serta tab Bukti/Riwayat perubahan. Peta memiliki loading
  skeleton, tampilan koordinat dan tautan OpenStreetMap jika tile gagal/timeout,
  dan filter tile untuk tema gelap; peta tetap mengizinkan zoom gestur di kanvas.
- Seluruh baris daftar HR membuka target: Absensi/Dihapus ke detail, Karyawan ke
  detail profil, Master ke dialog ubah, Hari Libur ke edit atau tampilan baca-saja
  untuk tanggal lampau, Ringkasan ke detail absensi atau karyawan. Tombol aksi di
  dalam baris tetap terpisah dan tabel tetap dapat dinavigasi dengan keyboard.
- Verifikasi: 57/57 unit lintas 8 file, lint HR dan typecheck HR lulus. Build tidak
  dijalankan; resource_status tidak tersedia dan catatan terakhir RAM bebas ~2.1
  GiB (<3 GiB). UI visual dan peta menunggu acceptance manual pengguna.
- Tidak ada perubahan endpoint, service, atau migration. PR+deploy frontend setelah
  acceptance.
- Lanjut: T7 tren Ringkasan (endpoint backend + chart + detail inline).

## T5 diimplementasikan - shell HR responsif (2026-10-05)

- Task aktif: T5, shell HR pada semua halaman. `SidebarShell` kini shared di
  `packages/ui`: rail desktop bisa ciut/perluas (state disimpan), grup navigasi,
  header sticky, dan Drawer HeroUI untuk tablet/mobile. Footer drawer memuat tema
  dan akun; navigasi menutup drawer. Shortcut `[` tidak mengambil alih input,
  textarea, select atau contenteditable; Ctrl/Cmd-K tetap tersedia.
- Verifikasi: test shell/auth 6/6, lint HR lulus, typecheck HR lulus. Build tidak
  dijalankan; resource_status tidak tersedia dan catatan terakhir RAM bebas ~2.1
  GiB (<3 GiB). Manual UI belum diperiksa pengguna.
- T5 mengubah shell responsive, tidak mengubah backend/endpoint/database. PR+deploy
  frontend dibutuhkan setelah acceptance.
- Lanjut: T6 diimplementasikan di atas commit/push T5 `f8e8527`.

## T4 diimplementasikan — kontrol dan filter seragam (2026-10-05)

- Task aktif: T4, seri satu per satu. Scope: shared CalendarField/FilterSelect,
  default/preset/date query utilities, semua filter Absensi/Ringkasan/Hari Libur/
  Karyawan HR dan Riwayat Karyawan; Employee Service list filter; test dan docs.
- Semua tanggal native diganti DateRangeField/CalendarField HeroUI; pencarian
  memakai SearchInput debounce 300 ms tanpa tombol Cari/Terapkan. Rentang list
  30 hari default WIB, dapat pilih preset, rentang khusus, atau Semua tanggal.
  Query tanggal/page/detail tetap terjaga saat navigasi.
- Filter master memuat semua page (pageSize 100), urut nama Indonesia dan memberi
  label Nonaktif. Form penugasan tetap hanya menawarkan master ACTIVE sesuai
  aturan bisnis. Pilihan Semua menjadi default. Daftar karyawan mendapat filter
  departemen/jabatan di Employee Service; API list memakai predicates yang sama
  untuk hasil dan total.
- Perubahan backend: Employee Service `GET /api/v1/employees` menerima optional
  `departmentId`/`positionId`; tidak ada migration. Push dev lalu pengguna PR+
  deploy sebelum filter backend aktif production.
- Verifikasi: unit logika baru 12/12, Riwayat Karyawan 7/7, Employee Service
  filter murni 2/2; HR fokus 61/61 lintas 8 file. Lint HR/Employee Service dan
  typecheck kedua portal lulus. Build kedua portal menunggu CI.
- Build tidak dijalankan: RAM bebas ~2.1 GiB (<3 GiB). UI acceptance tetap manual
  pengguna setelah merge/deploy, termasuk date picker/preset, pencarian, filter
  master, desktop/tablet/mobile serta tema terang/gelap.
- Lanjut: `e34e06d` sudah commit/push ke dev; visual acceptance pengguna masih tertunda. T5 shell HR aktif.

## T3 implementasi selesai — fondasi UI bersama (2026-10-05)

- Notice, PasswordField, ConfirmDialog, StatusBadge/Pill dipindahkan ke UI bersama;
  FormField, DateRangeField, SearchInput, dan DataList ditambahkan.
- D11/D12 diterapkan lintas kedua portal. Lint/typecheck kedua portal lulus; unit
  HR 90/90, Karyawan 40/40. Fixture capture lama tetap dijalankan di test/legacy.
- Build dan dev server tidak dijalankan karena RAM bebas <3 GiB. UI manual desktop,
  tablet, mobile dan zoom peta masih menunggu pengguna setelah rilis.
- Perlu PR+deploy: frontend dua portal; tidak ada backend/migration.
- Lanjut: T4 kontrol/filter. Commit/push `c4b8e66`.

## T2 aktif — validator riwayat Karyawan menolak UUID demo v5 (2026-10-05)

- [x] Pengguna mengonfirmasi detail HR dari Absensi dan Ringkasan sudah berfungsi.
  Tidak mengasumsikan Back/filter diterima dari laporan detail saja.
- Bukti runtime pengguna: `GET /api/v1/me/attendance?page=1&pageSize=20` = 200,
  payload memiliki UUID v5 untuk record/checkIn/checkOut, metadata WIB valid.
  Frontend `attendance-history.ts` sebelumnya menerima UUID v4 saja sehingga
  melempar AuthError 503 lokal meskipun request HTTP berhasil.
- Backend controller history sudah memakai ParseUUIDPipe tanpa batas v4;
  tidak membutuhkan perubahan service/endpoint/migration.
- File terkait: `apps/attendance-web/src/lib/attendance-history.ts` dan `.test.ts`,
  sprint dan progress ini. Validator hanya diperluas untuk UUID v4/v5, sesuai
  ID normal dan seed demo. Tetap menolak format/variant invalid, bukti lokasi
  invalid dan detail milik ID berbeda; validasi metadata/tanggal/foto tetap.
- Verifikasi: 2 unit regresi list/detail v5 gagal sebelum fix. Setelah fix,
  unit util 8/8 + HistoryPage 7/7 lulus (15 total); lint attendance-web lulus.
  Build lokal tidak dijalankan karena RAM bebas ~1,63 GiB, mengikuti keputusan
  pengguna push dev lalu build CI PR main. Tidak memulai dev server 5173/5174.
- [ ] Pengguna setelah PR/deploy: Riwayat Karyawan menampilkan daftar, pagination
  dan filter; klik detail, lihat foto, kembali ke daftar dengan filter tetap.
  Jika list berhasil tetapi detail gagal, kirim URL/status/Response endpoint
  `me/attendance/<id>` dan pesan Console; jangan kirim Cookie/token.
- Perlu PR+deploy: frontend Attendance saja; tidak ada perubahan backend.
- Lanjut: push T2 fix ke dev, pengguna PR main dan cek riwayat/detail/foto.
  Setelah acceptance T2, centang sprint lalu **T3** fondasi bersama + D11/D12.
  T1 logout→refresh masih menunggu konfirmasi; proxy localhost hanya terbukti unit.

## Acceptance refresh production — kedua role aman (2026-10-05)

- Pengguna menyatakan: "sudah aman semua ketika refresh, semua role" setelah
  deployment fix Vercel `4db848c`. Acceptance ini mencakup refresh production HR
  dan Karyawan, termasuk penghalang NOT_FOUND HR yang dilaporkan sebelumnya.
- [x] Refresh production aman pada kedua role, diterima pengguna.
- [ ] Logout lalu refresh kembali ke login pada kedua role: belum dikonfirmasi.
- [ ] Rewrite cookie proxy localhost: tidak diuji production; tidak diklaim lulus
  runtime lokal. Unit 6/6 dan build/lint sudah terbukti CI; implementasi di dev.
- Klarifikasi status: T1 implementasi dan refresh production selesai; checkbox
  task penuh tetap terbuka karena logout dan verifikasi proxy lokal belum dilaporkan.
  Tidak menandai detail/foto/filter sebagai diterima dari laporan refresh saja.
- File dokumentasi terkait: `tasks/redesign-sprint.md`, progress ini. Tidak ada
  kode atau backend berubah; verifikasi dokumentasi/diff saja, tanpa dev server.
- Perlu PR+deploy: tidak ada perubahan backend.
- Lanjut: **T2 diagnosis** — bukti runtime diminta untuk detail HR dari Absensi/
  Ringkasan dan riwayat/detail/foto Karyawan; minta URL/status/Response Network
  dan error Console tanpa Cookie/token bila gagal. Konfirmasi logout T1 juga
  diminta. Jangan memperbaiki validator berdasarkan hipotesis tanpa bukti.

## Bug aktif — refresh path HR 404 Vercel (2026-10-05)

- Pengguna melaporkan refresh `https://hr.annastriwidagdo.me/absensi`
  menghasilkan Vercel NOT_FOUND; Karyawan aman. Reproduksi read-only HTTP:
  root HR `/` = 200, `/absensi` = 404.
- Akar masalah: HR sudah memakai BrowserRouter tetapi tidak memiliki fallback
  SPA pada Vercel; server mencari resource `/absensi` sebelum React dimuat.
  Karyawan masih hash routing, fragmen tidak dikirim ke server.
- File terkait: `apps/hr-web/vercel.json`, `docs/deployment.md`, progress ini.
  Tambahkan rewrite `/(.*)` → `/index.html` mengikuti panduan resmi Vercel Vite,
  pada root project HR (`apps/hr-web`). React route guard tetap menangani auth.
- Verifikasi: parse JSON konfigurasi, review pola rewrite terhadap dokumentasi
  resmi, tautan lokal dokumentasi dan diff. Tidak ada logika aplikasi berubah;
  tidak menambah unit yang hanya mencerminkan config. Build/lint aplikasi sudah
  lulus CI 37233478898 untuk source sebelumnya; tidak diulang lokal pada RAM
  CRITICAL. Config routing baru baru terbukti runtime sesudah deploy Vercel.
- [ ] Pengguna: setelah PR main + deploy frontend HR, buka langsung `/absensi`,
  refresh 3×, coba `/ringkasan` dan `/absensi?id=<id-valid>`; periksa halaman,
  query dan aset termuat, tanpa error NOT_FOUND Vercel.
- Perlu PR+deploy: frontend HR saja; tidak ada service/endpoint/migration backend.
  Tidak menjalankan dev server 5173/5174.
- Lanjut: push fix ke dev, pengguna PR ke main; verifikasi refresh path HR live.
  T1 acceptance localhost tetap tertunda; lanjut diagnosis T2 dari bukti runtime
  detail absensi HR/riwayat Karyawan setelah penghalang routing ini teratasi.

## Perbaikan CI PR #9 — setup tema pada test Karyawan (2026-10-05)

- Log [CI 37233159248](https://github.com/annastriw/employee-attendance-system/actions/runs/37233159248)
  dibaca langsung melalui GitHub CLI. Lint, typecheck database dan build seluruh
  aplikasi lulus pada commit T1 `98f5c12`; unit rewrite cookie 6/6 juga lulus CI.
  Build T1 kini terbukti di CI, tanpa build lokal pada RAM CRITICAL.
- CI gagal pada 18 test di `attendance-web`: `window.matchMedia is not a function`
  dari shared theme hook. Setup jsdom Karyawan belum menyediakan stub API ini,
  sedangkan setup HR sudah memilikinya.
- File berubah: `apps/attendance-web/src/test/setup.ts`, progress ini.
  Menambahkan stub matchMedia dengan metode listener, mengikuti setup HR;
  tidak mengubah kode aplikasi/theme atau perilaku production.
- Verifikasi terfokus lokal: `HistoryPage.test.tsx` + `LoginPage.test.tsx`
  10/10 lulus; `App.test.tsx` 8/8 lulus. Semua 18 test yang gagal CI kini lulus;
  lint attendance-web dan pemeriksaan diff lulus.
  Build ulang lokal tidak dijalankan (RAM bebas ~0,93 GiB); tidak ada dev server
  yang dimulai. CI PR memverifikasi ulang setelah push perbaikan.
- Perlu PR+deploy: tidak ada perubahan backend.
- Lanjut: pantau CI baru PR #9 setelah push ke dev. T1 acceptance refresh/logout
  localhost tetap belum dikonfirmasi; T2 menunggu bukti Network/console pengguna
  untuk detail HR dan riwayat Karyawan. T1–T11 belum dianggap selesai penuh.

## T1 aktif — rewrite cookie proxy lokal (2026-10-05)

- Mulai dari `dev` HEAD `f5719b5`, tree bersih; fetch origin berhasil. Tidak ada
  dev server listening pada 5173/5174 saat pemeriksaan.
- File terkait: `apps/{hr-web,attendance-web}/vite.config.ts`,
  `scripts/dev-proxy-cookies.{mjs,d.mts,test.mjs}`, `package.json`, progress ini.
  Modul murni bersama memulihkan nama `__Host-auth_refresh_admin/employee` pada
  Cookie request; response login/logout menghapus prefix hanya dari nama refresh
  cookie, menghapus Secure/Domain, mempertahankan Path, SameSite dan expiry.
- Verifikasi: reproduksi awal 4 test gagal; setelah implementasi 6/6 unit lulus
  (`node --test scripts/dev-proxy-cookies.test.mjs`), lint kedua portal lulus.
  Unit script ditambahkan ke `test:unit` agar tercakup CI; suite penuh tidak diulang.
- Build belum dijalankan: `resource_status` tidak tersedia dalam tool sesi;
  pengganti baca memori Windows (`Get-CimInstance Win32_OperatingSystem`)
  menunjukkan RAM bebas 1,42–1,47 GiB, di bawah batas aman ~3 GB sprint.
  Tidak memulai build/dev server. Pengguna mengizinkan commit/push ke dev tanpa
  build pada 2026-10-05 karena RAM sulit mencapai batas tersebut; build tetap
  belum terbukti, dapat diverifikasi CI PR main.
- [ ] Manual pengguna: restart satu portal pada satu waktu, login → refresh 3×
  tetap masuk; logout → refresh kembali ke login; ulang untuk role satunya.
  Jika gagal, kirim status/response body `/api/v1/auth/refresh` dan pesan console,
  tanpa nilai Cookie/token. Pengguna memilih cek production setelah PR main;
  sudah dijelaskan bahwa T1 hanya proxy Vite lokal sehingga cek production tidak
  membuktikan rewrite ini. Acceptance localhost tetap belum dikonfirmasi.
- Perlu PR+deploy: tidak ada perubahan backend (T1 hanya proxy development).
- Lanjut: **T1** — verifikasi build melalui CI PR main atau lokal saat RAM aman.
  Setelah pengguna mengonfirmasi DoD refresh/logout localhost, centang T1 di sprint dan
  lanjut **T2**: minta Network/console error detail absensi HR dan riwayat karyawan.

## Pivot — overhaul penuh frontend + rewrite sprint (2026-10-05)

Pengguna memperluas scope dari lanjutan R06 menjadi **overhaul penuh dua portal +
perbaikan bug fungsional + boleh ubah backend**, metode **task tanpa iterasi** (tiap
task DONE lalu lanjut), testing manual oleh pengguna, push semua ke `dev` (PR `main`
oleh pengguna). `tasks/redesign-sprint.md` ditulis ulang: fase A (R00–R05 selesai)
dilipat; fase B (X1–X10) baru.

Audit codebase (baca-saja, memori CRITICAL — tanpa build/dev server):
- **Dua bug "tidak berfungsi" belum di-root-cause-kan secara runtime** (butuh dev
  server + memori lega). Hipotesis dari source:
  - *Logout saat refresh*: `restore()` → `/auth/refresh` bergantung cookie
    `__Host-auth_refresh_*` (Secure, path `/`). Lewat proxy localhost HTTP, cookie
    harus di-rewrite (`__Host-`/`Secure`/`Domain` dilucuti) **pada response refresh**.
    Perlu verifikasi apakah rewrite berlaku untuk endpoint refresh / SameSite menolak.
  - *HR detail absensi*: `AttendancePage` me-render `AttendanceDetailPage` saat
    `?id=` ada (bukan route terpisah) — perlu reproduksi apakah link/param hilang
    di bawah path routing R01, atau validasi data melempar.
  - *Karyawan riwayat*: `HistoryPage` ada & terwire via hash route `#riwayat`;
    attendance-web MASIH hash routing. Perlu reproduksi error aktual (validasi
    `attendance-history.ts` ketat — bisa melempar `invalid()` bila bentuk data beda).
- Struktur aktual: hr-web sudah React Router + Atomic Design sebagian; attendance-web
  masih hash routing + ada `spikes/` dan `WelcomePage` (dead code kandidat hapus).
- HeroUI v3.2.6: punya `DatePicker/DateRangePicker/SearchField/Drawer/Select` —
  cukup untuk date-range, search-saat-ketik, sidebar hideable, dropdown departemen.
  **Tidak punya chart** → keputusan chart (Recharts vs SVG/Meter) ditandai di X7.

Revisi gabungan (2026-10-05, setelah tanya-jawab): keputusan D1–D10 dikunci di
`tasks/redesign-sprint.md` (chart shadcn/Recharts, sidebar rail+drawer, profil
lihat+edit dengan batas field default, date range preset, search debounce 300 ms,
backend → push dev + kabari pengguna). Backlog X-series diganti **T1–T11** dengan
file, langkah, dan DoD per task agar bisa dilanjutkan agen lain (kiro CLI).
Temuan backend: `auth/me` sudah diproksikan; `monitoring/summary` ada; **belum ada**
`monitoring/trend` (T7) dan `me/profile` (T8). Tailwind v4 ada di kedua portal;
`recharts` belum terpasang.

Perlu PR+deploy: (belum ada perubahan backend).

Revisi 2026-10-05 (lanjutan): D4 → profil read-only + ganti password (tanpa edit data
diri, baseline tetap); D11 → layar fixed `100dvh` + **zoom diblokir di semua layar**
(termasuk shortcut/wheel zoom desktop, kecuali kanvas peta); D12 → skala kompak
proporsional (kontrol 32 px desktop / 36–40 px mobile, baris tabel 36–40 px, teks 13–14 px).
T1 root cause terkonfirmasi dari source + bukti Network pengguna (refresh 401 di 5173/5174):
proxy melucuti prefix `__Host-` dari Set-Cookie, padahal Auth production membaca
`__Host-auth_refresh_<role>`; perbaikan = proxy menambahkan kembali prefix pada header
`Cookie` request.

Lanjut: **T1** — implementasi rewrite Cookie request di kedua `vite.config.ts` (modul
bersama + unit), lalu minta pengguna restart dev server dan cek refresh 3×.

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
