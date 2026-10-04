# SDD — Design system frontend

Tema zinc dengan satu aksen emerald, font Geist, ikon Phosphor dan HeroUI. Light/dark mengikuti sistem; merah/kuning hanya untuk status bermakna. Bahasa UI Indonesia, kalimat singkat, tanpa statistik/slogan yang tidak berasal dari data.

## Sumber implementasi

[Token CSS](../../packages/ui/src/theme.css), [shared UI](../../packages/ui/src/), [Attendance](../../apps/attendance-web/src/), [HR](../../apps/hr-web/src/). Nilai token aktual menjadi acuan; aplikasi tidak membuat palet terpisah.

Atomic Design diterapkan berdasarkan tanggung jawab/reuse nyata: brand atom dan AuthShell template bersama, komponen domain pada masing-masing portal. Jangan memecah setiap elemen HTML menjadi abstraksi baru atau menyalin shell ke aplikasi lain.

## Layout dan aksesibilitas

- Login kedua portal split-screen pada desktop: form kiri, panel kemampuan nyata kanan. Mobile satu kolom. Tidak memakai artwork scaffold React/Vite.
- HR workspace memakai sidebar dan menu akun; mobile navigasi dapat dibuka/ditutup dengan state aksesibel.
- Attendance berfokus tindakan Hari ini, capture dan riwayat; state tindakan menentukan tombol yang tersedia.
- Form mempunyai label, validasi/error dan busy state. Fokus keyboard terlihat, tombol aksi dapat disentuh, tabel overflow terkendali dan evidence grid bertumpuk di layar kecil.
- Motion singkat dan mengikuti prefers-reduced-motion. Foto dan kamera dibersihkan saat halaman ditutup; tidak ada penyimpanan foto permanen di browser.

Perubahan UI diuji manual pengguna pada state terkait; unit tetap untuk logika, bukan test screenshot rutin. [Workflow testing](../testing/workflow.md), [pemetaan layar](frontend-ui-ux.md).
