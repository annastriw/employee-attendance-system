# SDD — Design system frontend

Tema zinc dengan satu aksen emerald, font Geist, ikon Phosphor dan HeroUI. Light/dark mengikuti sistem; merah/kuning hanya untuk status bermakna. Bahasa UI Indonesia, kalimat singkat, tanpa statistik/slogan yang tidak berasal dari data.

## Sumber implementasi

[Token CSS](../../packages/ui/src/theme.css), [shared UI](../../packages/ui/src/), [Attendance](../../apps/attendance-web/src/), [HR](../../apps/hr-web/src/). Nilai token aktual menjadi acuan; aplikasi tidak membuat palet terpisah.

Atomic Design diterapkan berdasarkan tanggung jawab/reuse nyata: brand atom dan AuthShell template bersama, komponen domain pada masing-masing portal. Jangan memecah setiap elemen HTML menjadi abstraksi baru atau menyalin shell ke aplikasi lain.

## Layout dan aksesibilitas

- Login kedua portal split-screen pada desktop: form kiri, panel kemampuan nyata kanan. Mobile satu kolom. Tidak memakai artwork scaffold React/Vite.
- Kedua role memakai WorkspaceShell/SidebarShell bersama: sidebar/rail pada desktop ≥1024px, drawer pada tablet/mobile. Status rail disimpan lokal per portal. Brand di sidebar dan header mobile menuju beranda role; theme/menu akun seragam.
- Attendance mempertahankan komposisi desktop dua kolom ketika ruang cukup; konten memenuhi lebar workspace. Kamera memakai mode fokus fullscreen.
- Shell kedua portal fixed setinggi viewport; konten utama menjadi scroller. Zoom web dikunci sesuai keputusan D11, kecuali kanvas peta Leaflet yang memang membutuhkan zoom.
- Form memakai HeroUI dan komponen bersama, dengan label, validasi/error dan busy state. Fokus keyboard terlihat. Gunakan ukuran, jarak, radius, baris dan tipografi dari token D12 di `packages/ui/src/styles/compact.css`; jangan menambah skala ad-hoc.
- Semua daftar HR memakai Table HeroUI dan berubah menjadi kartu berlabel di bawah 768px. Tinggi kartu mengikuti isi, tanpa baris desktop yang membatasi tinggi. Form/detail memenuhi lebar konten; evidence dua kolom jika cukup dan bertumpuk di layar kecil.
- Ringkasan HR memakai komponen chart bersama berbasis Recharts dengan token tema; pilihan rentang memakai DateRangeField dan preset. Fitur data yang endpoint-nya belum rilis harus menampilkan fallback yang jelas.
- Profil tiap role read-only untuk data diri dan berbagi form ganti password. Jangan menyediakan edit data diri mandiri.
- PageHeader/breadcrumb dipakai pada list, tambah/detail/ubah dan halaman Karyawan. Filter kategori memakai FilterPanel HeroUI dengan chip aktif/removable dan reset; search tetap terpisah. Preset tanggal berada dalam kalender.
- Hover/focus compound input dikelola group dengan ring inset tunggal; input anak dan suffix mengikuti tinggi kontrol. Tabs/segmented/status/badge mengikuti D12, tanpa stretch di sel tabel.
- Motion singkat dan mengikuti prefers-reduced-motion. Foto dan kamera dibersihkan saat halaman ditutup; tidak ada penyimpanan foto permanen di browser.

Perubahan UI diuji manual pengguna pada state terkait; unit tetap untuk logika, bukan test screenshot rutin. [Workflow testing](../testing/workflow.md), [pemetaan layar](frontend-ui-ux.md).
