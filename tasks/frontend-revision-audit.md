# Audit revisi frontend — 2026-10-05

## Status dan batas pemeriksaan

Audit sumber kedua frontend dan packages/ui dari HEAD `18edf0b` di branch `dev`.
Working tree bersih sebelum audit. Belum ada perubahan implementasi, build, dev
server, atau pemeriksaan visual browser pada fase audit ini. Temuan visual dari
pengguna menjadi acceptance yang harus diperbaiki; analisis sumber di bawah tidak
diklaim sebagai bukti hasil render.

Instruksi terbaru pengguna: kerjakan seluruh revisi lokal dahulu. Push dev, PR,
merge, dan rilis dilakukan pengguna. Fase implementasi revisi tidak melakukan commit/push
otomatis. Jangan mengubah pipeline untuk mengabaikan lint/build/unit atau memakai
commit kosong untuk memicu Vercel. Rate limit Vercel ditangani lewat batas layanan
dan pengaturan deployment, bukan perubahan aplikasi.

## Temuan

| ID | Scope | Bukti sumber / penyebab | Perbaikan |
| --- | --- | --- | --- |
| A01 | Sidebar mobile/tablet HR | `workspace.css`: media max-width 1023 menyembunyikan `.dashboard-sidebar`, tetapi deklarasi dasar `display:flex` berada sesudahnya dengan specificity sama | Susun base sebelum media; pindahkan shell ke shared UI agar kedua role memakai aturan yang sama |
| A02 | Ringkasan mobile/tablet | Media satu kolom `.monitoring-analytics-grid` mendahului deklarasi dasar dua kolom sehingga tertimpa; header grafik masih menampung date range dan empat preset tanpa pembagian ruang | Satu kolom sampai ruang dua grafik benar-benar cukup; toolbar rentang terpisah, tinggi chart dan sumbu responsif |
| A03 | Hover/focus field dari login | `theme.css` memberi outline ke semua input; HeroUI SearchField/InputGroup sudah mengelola focus pada group. Token hanya merampingkan group, sedangkan input anak masih memakai padding library | Satu focus ring pada batas luar group, ukuran anak/suffix/clear button seragam; tetap beri fokus keyboard yang jelas. State tepat yang dilihat pengguna perlu dikonfirmasi |
| A04 | Brand/sidebar | HR Brand berupa div tanpa link; brand dicenter dan tombol collapse di baris terpisah. Drawer ID `hr-navigation-drawer` hardcoded dalam shared shell | Satu baris brand + collapse; brand menjadi link ke Ringkasan/Hari ini; ID/label shell reusable, menu akun/footer rapi |
| A05 | Judul navigasi HR | `WorkspaceLayout` memakai startsWith; `/absensi-dihapus` bisa terpilih sebagai `/absensi` dalam pencarian title | Resolusi route berdasarkan batas segmen/exact matching, selaras dengan active navigation |
| A06 | Tab status terlalu besar | `.status-filter .toggle-button {min-height:2.5rem}` lebih spesifik dari token shared 32px desktop; grup serta underline tabs punya pola berbeda | Satu ukuran segmented control/tab/button berdasarkan D12; active indicator tetap di dalam batas kontrol |
| A07 | Badge/status | StatusPill, warning badge, dan teks late/early memakai tiga pola; min-height badge tidak membatasi stretch di grid cell mobile | Satu pola status kecil 20px, font 12px, fit-content, dot/label konsisten, tidak mengisi lebar sel |
| A08 | Reset filter tidak sejajar | Search/Select punya label satu baris, DateRange punya tambahan baris preset; reset berada dalam parent/flex yang berbeda. Hari Libur bahkan merender rentang dan Semua tanggal langsung sebagai sibling tanpa toolbar khusus | Toolbar bersama: search terpisah, filter kategori dikelompokkan, rentang/preset tertata, chips aktif dan reset satu baris aksi |
| A09 | Filter Absensi tidak logis | `AttendanceFilters` mencari nama/NIK lalu menampilkan dropdown karyawan. `AttendanceListDto` dan allowlist Gateway hanya mendukung status lifecycle, periode, employeeId, pagination | Filter utama periode/departemen/jabatan; karyawan tertentu tetap sebagai konteks deep link dari profil. Filter server sebelum pagination dan count, bukan menyaring 20 hasil frontend |
| A10 | Backend filter | Schema AttDailyRecord sudah punya departmentIdSnapshot/positionIdSnapshot; endpoint list belum memakainya | Tambah optional departmentId/positionId di Attendance Service + Gateway, filter snapshot historis; tanpa migration. Validasi UUID selaras data demo v4/v5 |
| A11 | Tabel terlalu tinggi | Tabel Absensi menumpuk nama/tanggal/departemen di satu sel; tabel Karyawan tiga baris identitas; pola tabel monitoring native dan tabel HeroUI berbeda. Tinggi tr tidak dapat memampatkan isi multiline | Pola Table HeroUI kompak, hierarki sel ringkas, status kecil dan aksi ringkas; mobile cards berlabel untuk semua daftar yang padat |
| A12 | Form/detail membuang ruang | `.employee-form`, `.employee-detail`, `.attendance-detail` membatasi 48rem; halaman employee memberi max width 76rem; evidence dibungkus panel berpadding lalu kartu berpadding | Konten full width di dalam shell, grid informasi/evidence menyesuaikan layar, kurangi panel bersarang. Full width tidak berarti memperbesar font/kontrol |
| A13 | Breadcrumb/header | Tambah Karyawan menggunakan state lokal dan heading h2, tanpa PageHeader/breadcrumb; master pages/header/filter tidak memakai pola seragam | Breadcrumb list → tambah/detail/ubah; judul, deskripsi dan aksi satu PageHeader bersama; konteks Back/filter dipertahankan |
| A14 | Master data | Departemen/Jabatan memakai toolbar flex label+grup+Tambah; Hari Libur memakai susunan berbeda dan `.holidays-page` tidak memiliki layout area sendiri | Seragamkan PageHeader, grouped filter, Table, pagination, empty/error/loading dan dialog form/status |
| A15 | Portal Karyawan berbeda | EmployeeWorkspace punya top nav/bottom nav dan stylesheet sendiri, tidak memakai SidebarShell; header/akun/jarak konten berbeda | Satu workspace/sidebar kedua role; menu berbeda sesuai role. Home/Riwayat/Profil mengikuti header/filter/detail/status bersama; capture tetap mode fokus full-screen sesuai alur kamera |

## Kontrak revisi

- Gunakan HeroUI yang sudah terpasang untuk kontrol, Table, Drawer, Popover/Dropdown,
  Chip dan Tabs; komponennya disusun di packages/ui. Recharts tetap pengecualian
  chart yang sudah disetujui. Tidak perlu library UI tambahan.
- HR dan Karyawan menggunakan shell yang sama: sidebar desktop dengan rail,
  drawer tablet/mobile, brand menuju beranda role, theme/account seragam.
- Full layar berarti memenuhi lebar area konten setelah sidebar/header, dengan
  grid yang mengikuti ukuran layar. Zoom lock/fixed viewport D11 tetap berlaku.
- D12 tetap: kontrol desktop 32px, mobile 36–40px, badge 20px, judul 18–20px,
  radius kontrol 6px/kartu 8px. Tinggi konten tabel mengikuti isi yang terbaca,
  bukan pemotongan teks penting demi tinggi paksa.
- Absensi: periode + departemen/jabatan snapshot historis; pemilihan nama bukan
  filter utama. Nama/NIK tetap pencarian pada direktori karyawan dan monitoring.
- Filter banyak dikelompokkan dalam popover/drawer dengan indikator filter aktif,
  chips yang dapat dilepas, dan reset yang sejajar. URL tetap sumber state.
- Unit untuk logika query, route/sidebar dan filter server yang berubah;
  lint/typecheck kedua portal, build bila memori tidak critical. Visual manual
  oleh pengguna, tanpa Playwright atau screenshot harness rutin.

## Urutan kerja

Backlog serial T12–T21 ada di [redesign-sprint.md](redesign-sprint.md), fase C.
Jangan menandai penerimaan visual sebagai lulus sebelum pengguna menyatakan oke.

## Klarifikasi reproduksi

Pengguna mengonfirmasi bahwa garis hijau/hover offside terlihat pada hover dan
fokus. T13 menangani kedua state pada compound group serta input anak.


## Penutupan teknis lokal T21

| Temuan | Implementasi lokal | Acceptance visual |
| --- | --- | --- |
| A01/A04/A05/A15 | WorkspaceShell/SidebarShell bersama, brand link desktop/mobile, media setelah base, route segment, drawer/focus/rail | Pending pengguna |
| A03/A06/A07 | controls.css: hover/focus inset tunggal, child/suffix, segmented/tab dan badge kompak | Pending pengguna |
| A08/A09/A10 | FilterPanel/chip/reset, preset dalam kalender, kategori Absensi via snapshot service/Gateway sebelum pagination | Pending pengguna/deploy |
| A11 | Table HeroUI seluruh daftar HR, mobile cards berlabel dan tinggi mengikuti isi | Pending pengguna |
| A12/A13 | Detail/form full width, evidence tanpa panel bersarang, PageHeader/breadcrumb tambah/ubah dan Karyawan | Pending pengguna |
| A02 | Chart satu kolom tablet/mobile, tinggi mobile dan sumbu/legend kompak | Pending pengguna |
| A14 | Master data PageHeader/toolbar/cards/reset, periode Hari Libur dalam grouped filter | Pending pengguna |

Implementasi selesai lokal sebelum pengguna meminta commit/push dev. PR/deployment
main tetap oleh pengguna. Build ditunda karena RAM bebas 2,61 GiB pada cek terakhir; tool resource_status tidak tersedia. Tidak ada bukti
render browser atau acceptance manual yang diklaim. Daftar langkah cek ada pada
[frontend-revision-manual-checklist.md](frontend-revision-manual-checklist.md).
