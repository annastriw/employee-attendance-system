# Tema bersama Attendance Portal dan HR Portal
Status: disetujui pengguna, 2026-10-01. Berlaku untuk seluruh frontend sekarang dan berikutnya.

## Tujuan dan kontrak desain
Modern, elegan, minimalis, mudah dipahami. Pengguna karyawan memerlukan tindakan absensi yang jelas; HRD memerlukan navigasi dan informasi administrasi yang efisien. Jangan menambah statistik contoh, tombol tanpa fungsi, atau halaman bisnis yang belum diimplementasikan.

## Fondasi
- HeroUI v3 dan Tailwind v4. Komponen custom mengikuti Atomic Design.
- Token warna, tipografi, kontrol, spacing, status, dan shell autentikasi berada di packages/ui. Kedua aplikasi mengimpor @attendance/ui/theme.css setelah CSS HeroUI.
- Warna netral terang dengan satu aksen hijau gelap #245b49. Warna status hanya untuk informasi semantik dan selalu disertai teks.
- Font Segoe UI/system sans-serif, tersedia lokal tanpa permintaan font pihak ketiga. Judul 28–34 px, isi 14–15 px, label 13 px.
- Spacing kelipatan 4 px; radius kontrol 8 px, section 12 px, panel autentikasi 16 px. Border tipis, tanpa gradient dekoratif atau shadow besar.
- Form dengan label terlihat, satu tindakan utama, bantuan singkat. Fokus keyboard terlihat, target kontrol minimal 44 px. Busy/error/success tetap terbaca.
- Login desktop menggunakan panel konteks jadwal dan form. Mobile menampilkan identitas serta form dahulu. Dashboard memakai navigasi putih dan area kerja netral.
- Hormati prefers-reduced-motion. Tema terang eksplisit; dark mode belum disediakan.

## Scope increment
HR: login, ganti password awal, loading/success/error, ringkasan kosong, logout. Attendance: ganti scaffold Vite dengan halaman pengenalan dan status belum tersedia; integrasi login/absensi tetap mengikuti T13 dan task berikutnya.

## Aturan perubahan selanjutnya
Semua halaman baru menggunakan token dan komponen shared. Jangan menyalin stylesheet tema ke aplikasi atau membuat palet baru. Tambahkan komponen shared ketika dipakai kedua portal. Catat perubahan token di dokumen ini. Tabel, filter dan dialog kelak mengikuti bahasa visual yang sama dengan kepadatan sesuai tugas.

## Verifikasi
Build/lint kedua frontend, test komponen auth, alur E2E auth nyata, dan pemeriksaan browser pada 320/768/1024/1440 px. Periksa overflow, fokus keyboard, console, status, dan kesamaan tema. Halaman attendance harus menyatakan fitur belum tersedia.

## Sumber
MCP HeroUI: quick-start, theming, Button, Input dan Label; dokumentasi resmi [theming](https://heroui.com/docs/react/getting-started/theming). Referensi visual eksternal tidak digunakan; arah ditentukan dari brief pengguna dan sistem komponen terpasang.

## Perintah pemeriksaan
- pnpm --dir apps/hr-web run test:ui: pemeriksaan layout kedua portal tanpa database; respons sesi HR dimock sebagai belum login.
- pnpm --dir apps/hr-web run test:e2e: alur autentikasi dengan Gateway/Auth/MySQL test nyata.
- Pemeriksaan MCP Chrome DevTools melengkapi screenshot dan accessibility tree. Ukuran jendela MCP terbatasi minimum 504 px; Playwright memverifikasi viewport 320 px sebenarnya.
