# Tema bersama Attendance Portal dan HR Portal
Status: disetujui pengguna; revisi monokrom 2026-10-01. Berlaku untuk semua frontend sekarang dan berikutnya.

## Kontrak desain
Modern, elegan, minimalis dan mudah dipahami. Tema putih/abu-abu netral, teks charcoal, tombol utama charcoal #292929. Warna hijau/merah/kuning hanya untuk status bermakna. Hilangkan slogan, jadwal berulang, panel promosi, status dekoratif dan bantuan yang tidak diperlukan.

## Komponen dan layout
- HeroUI v3 + Tailwind v4: TextField, Input, InputGroup, Label, Button dan Dropdown. Ikuti dokumentasi MCP HeroUI dan pola compound components. Custom component hanya untuk kebutuhan aplikasi dan layout bersama.
- packages/ui menyimpan token dan AuthShell. Kedua aplikasi mengimpor tema yang sama setelah styles HeroUI. Gunakan tema melalui CSS variables, bukan menggambar ulang tampilan kontrol bawaan.
- Login berupa form satu kolom di tengah, maksimal 368 px: nama portal, judul Masuk, email, password, tombol Masuk. Tanpa panel samping, slogan, footer atau jadwal. Ganti password hanya memuat petunjuk yang diperlukan.
- HR: sidebar ramping berisi nama portal dan menu yang tersedia, header judul halaman serta dropdown akun. Email ada pada menu akun, bukan paragraf sambutan. Kondisi kosong cukup satu kalimat. Filter/tindakan kelak ditempatkan dekat kontennya.
- Mobile: sidebar menjadi navigasi buka/tutup dengan tombol Menu, aria-expanded dan aria-controls; dropdown akun tetap dapat dipakai.
- Karyawan mengikuti tema sama, berfokus pada check-in/checkout saat fitur tersedia. Sekarang hanya menampilkan status singkat login belum tersedia. Jangan membuat kontrol atau statistik palsu.
- Font lokal Segoe UI/system sans-serif; judul auth 24 px, judul workspace 18 px, isi 14 px. Spacing kelipatan 4 px; radius field 8 px, tombol mengikuti bentuk bawaan HeroUI; shadow ringan bawaan HeroUI. Label terlihat, fokus keyboard terlihat, notifikasi error/success dan busy tetap berfungsi. Hormati prefers-reduced-motion.
- Halaman berikutnya wajib memakai token dan komponen bersama, tanpa palet baru atau menyalin tema ke aplikasi.

## Verifikasi
Build/lint kedua frontend, test komponen auth/menu akun, E2E autentikasi dengan API/MySQL test nyata; layout dua portal pada 320/768/1024/1440 px. Periksa navigasi mobile, keyboard, menu akun, overflow dan screenshot.
- pnpm --dir apps/hr-web run test:ui: layout tanpa database (sesi HR dimock sebagai belum login).
- pnpm --dir apps/hr-web run test:e2e: alur API nyata.
- MCP Chrome DevTools untuk screenshot/accessibility tree; ukuran 320 px diuji melalui Playwright.

## Sumber
MCP HeroUI: Button, Dropdown, InputGroup, Input dan Label. [Theming](https://heroui.com/docs/react/getting-started/theming), [Dropdown](https://heroui.com/docs/react/components/dropdown), [InputGroup](https://heroui.com/docs/react/components/input-group).

## Konsep dan penerapan seluruh halaman
Kontrak visual ini dipakai bersama [spesifikasi UI/UX](frontend-ui-ux.md). Spesifikasi tersebut memetakan E01–E09 dan H01–H14, navigasi, keluarga layar, capture, lifecycle, states, responsivitas dan acceptance. Tema yang sama tidak mewajibkan susunan kartu yang sama: halaman karyawan berpusat pada tindakan, HR berpusat pada daftar/detail.

Susunan daftar: judul → toolbar → tabel/daftar → pagination. Detail: identitas/status → bukti check-in/checkout → tindakan kontekstual. Form: kelompok field → validasi → satu tindakan utama. Seluruh halaman memakai token packages/ui; tidak menambah palet/teks dekoratif.

Kelanjutan implementasi mengikuti [alur implementasi](../development/implementation-workflow.md), [plan](../../tasks/plan.md), dan checklist UX dalam [todo](../../tasks/todo.md).
