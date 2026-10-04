# SDD — Design system frontend

Tema zinc dengan satu aksen emerald, font Geist, ikon Phosphor dan HeroUI. Light/dark mengikuti sistem; merah/kuning hanya untuk status bermakna. Bahasa UI Indonesia, kalimat singkat, tanpa statistik/slogan yang tidak berasal dari data.

## Sumber implementasi

[Token CSS](../../packages/ui/src/theme.css), [shared UI](../../packages/ui/src/), [Attendance](../../apps/attendance-web/src/), [HR](../../apps/hr-web/src/). Nilai token aktual menjadi acuan; aplikasi tidak membuat palet terpisah.

Atomic Design diterapkan berdasarkan tanggung jawab/reuse nyata: brand atom dan AuthShell template bersama, komponen domain pada masing-masing portal. Jangan memecah setiap elemen HTML menjadi abstraksi baru atau menyalin shell ke aplikasi lain.

## Layout dan aksesibilitas

- Login kedua portal split-screen pada desktop: form kiri, panel kemampuan nyata kanan. Mobile satu kolom. Tidak memakai artwork scaffold React/Vite.
- HR workspace memakai sidebar yang dapat diringkas menjadi rail ikon di desktop dan drawer di tablet/mobile; menu akun tetap tersedia. Status rail disimpan lokal.
- Attendance mempertahankan komposisi desktop dua kolom ketika ruang cukup. Navigasi desktop berada di header; layar kecil memakai bottom navigation dan konten satu kolom.
- Shell kedua portal fixed setinggi viewport; konten utama menjadi scroller. Zoom web dikunci sesuai keputusan D11, kecuali kanvas peta Leaflet yang memang membutuhkan zoom.
- Form memakai HeroUI dan komponen bersama, dengan label, validasi/error dan busy state. Fokus keyboard terlihat. Gunakan ukuran, jarak, radius, baris dan tipografi dari token D12 di `packages/ui/src/styles/compact.css`; jangan menambah skala ad-hoc.
- Tabel monitoring HR menjadi kartu dengan label per kolom di bawah 768px agar isi tetap terbaca tanpa scroll horizontal. Grid evidence bertumpuk di layar kecil.
- Ringkasan HR memakai komponen chart bersama berbasis Recharts dengan token tema; pilihan rentang memakai DateRangeField dan preset. Fitur data yang endpoint-nya belum rilis harus menampilkan fallback yang jelas.
- Profil tiap role read-only untuk data diri dan berbagi form ganti password. Jangan menyediakan edit data diri mandiri.
- Motion singkat dan mengikuti prefers-reduced-motion. Foto dan kamera dibersihkan saat halaman ditutup; tidak ada penyimpanan foto permanen di browser.

Perubahan UI diuji manual pengguna pada state terkait; unit tetap untuk logika, bukan test screenshot rutin. [Workflow testing](../testing/workflow.md), [pemetaan layar](frontend-ui-ux.md).
