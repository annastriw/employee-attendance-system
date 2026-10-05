# SDD — Design system frontend

Tema zinc dengan satu aksen emerald, font Geist, ikon Phosphor dan HeroUI. Light/dark mengikuti sistem; merah/kuning untuk status dan aksi bermakna. Bahasa UI Indonesia, kalimat singkat, tanpa statistik/slogan yang tidak berasal dari data.

## Sumber implementasi

[Token CSS](../../packages/ui/src/theme.css), [shared UI](../../packages/ui/src/), [Attendance](../../apps/attendance-web/src/), [HR](../../apps/hr-web/src/). Nilai token aktual menjadi acuan; aplikasi tidak membuat palet terpisah.

Atomic Design diterapkan berdasarkan tanggung jawab/reuse nyata: brand atom dan AuthShell template bersama, komponen domain pada masing-masing portal. Jangan memecah setiap elemen HTML menjadi abstraksi baru atau menyalin shell ke aplikasi lain.

## Layout dan aksesibilitas

- Login kedua portal split-screen pada desktop: form kiri, panel kemampuan nyata kanan. Mobile satu kolom. Tidak memakai artwork scaffold React/Vite.
- Kedua role memakai WorkspaceShell/SidebarShell bersama: sidebar/rail pada desktop ≥1024px, drawer pada tablet/mobile. Status rail disimpan lokal per portal. Revisi S02: logo/nama portal menjadi bagian header sidebar desktop dan drawer, menuju beranda role; boleh mengikuti sidebar dan disembunyikan pada rail. Header konten desktop terpisah tanpa brand ganda. Drawer setinggi viewport dari tepi atas sampai bawah; area menu scroll tanpa memotong kontrol bawah.
- Revisi 2026-10-05: tombol buka/tutup/ciut berada di kiri, diikuti brand. Header mobile/tablet menampilkan tombol menu kiri lalu logo/nama portal. Drawer membuka dari kiri; tombol tutup tidak memakai posisi absolut kanan bawaan HeroUI. Pencarian global Ctrl+K dihapus; pencarian/filter data halaman tetap tersedia. Tema dan akun berada di bawah sidebar/drawer. Nama profil dan email terlihat pada sidebar terbuka; rail menampilkan avatar dengan identitas lengkap di popup. HR tanpa profil memakai Admin HRD. Tema Terang/Gelap/Sistem melalui satu menu; popup bawah membuka ke atas. Mobile/tablet memakai drawer, menutup sesudah navigasi (konfirmasi pengguna 2026-10-05).
- Toolbar daftar menyatukan pencarian, filter/tab dan Tambah pada baseline tinggi kontrol yang sama. Label pencarian tetap accessible; chip filter berada di baris terpisah. Kontrol wrap teratur di mobile/tablet.
- Kalender popup fixed di tengah viewport, satu bulan penuh tanpa scroll/geser grid, pindah bulan lewat tombol. Ukuran sel tidak mengikuti padding tabel daftar; tinggi menyesuaikan viewport, termasuk landscape. Preset rentang tetap tersedia.
- Warna aksi: hapus/arsip merah (trigger dan konfirmasi), pulih/aktif/simpan emerald, nonaktif/reset konsekuensial amber, edit/navigasi/batal netral. Label dan ikon tetap menjadi penjelas aksi, bukan warna saja.
- Attendance mempertahankan komposisi desktop dua kolom ketika ruang cukup; konten memenuhi lebar workspace. Kamera memakai mode fokus fullscreen.
- Shell kedua portal fixed setinggi viewport; konten utama menjadi scroller. Zoom web dikunci sesuai keputusan D11, kecuali kanvas peta Leaflet yang memang membutuhkan zoom.
- Form memakai HeroUI dan komponen bersama, dengan label, validasi/error dan busy state. Fokus keyboard terlihat. Gunakan ukuran, jarak, radius, baris dan tipografi dari token D12 di `packages/ui/src/styles/compact.css`; jangan menambah skala ad-hoc.
- Semua daftar HR memakai Table HeroUI dan berubah menjadi kartu berlabel di bawah 768px. Tinggi kartu mengikuti isi, tanpa baris desktop yang membatasi tinggi. Form/detail memenuhi lebar konten; evidence dua kolom jika cukup dan bertumpuk di layar kecil.
- Ringkasan HR memakai komponen chart bersama berbasis Recharts dengan token tema; pilihan rentang memakai DateRangeField dan preset. Fitur data yang endpoint-nya belum rilis harus menampilkan fallback yang jelas.
- Akses Keluar hanya satu, di popup akun kedua portal, termasuk layar wajib ganti password. Profil/form/command palette tidak menggandakan aksi. Popup pada password wajib tidak menyediakan navigasi Profil; busy memblokir aksi.
- Profil tiap role read-only untuk data diri dan berbagi form ganti password. Jangan menyediakan edit data diri mandiri.
- PageHeader/breadcrumb dipakai pada list, tambah/detail/ubah dan halaman Karyawan. Filter kategori memakai FilterPanel HeroUI dengan chip aktif/removable dan reset; search tetap terpisah. Preset tanggal berada dalam kalender.
- Hover/focus compound input dikelola group dengan ring inset tunggal; input anak dan suffix mengikuti tinggi kontrol. Tabs/segmented/status/badge mengikuti D12, tanpa stretch di sel tabel.
- Motion ringan: transisi lebar sidebar desktop, masuk/keluar drawer, hover kontrol/menu, serta fade konten halaman; durasi 120-220 ms, tanpa animasi kamera/foto/chart berulang. Ikuti prefers-reduced-motion. Foto dan kamera dibersihkan saat halaman ditutup; tidak ada penyimpanan foto permanen di browser.

Perubahan UI diuji manual pengguna pada state terkait; unit tetap untuk logika, bukan test screenshot rutin. [Workflow testing](../testing/workflow.md), [pemetaan layar](frontend-ui-ux.md).
