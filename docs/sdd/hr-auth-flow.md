# HRD authentication flow (T09)

## Acceptance
Login email/password HRD melalui Gateway. Akun dengan mustChangePassword wajib melihat form ganti password, belum dashboard. Password baru minimal 12 karakter dan maksimal 72 byte UTF-8; konfirmasi harus sama; password lama tidak boleh dipakai kembali. Setelah perubahan berhasil, sesi dicabut backend dan pengguna login ulang. Dashboard awal hanya ringkasan kosong dan logout; data domain belum dibuat.

## Session
Access token hanya dalam memori. Refresh cookie HttpOnly dipakai dengan credentials include. Refresh saat membuka kembali halaman dan menjelang expiry access token; satu promise bersama mencegah rotasi ganda pada React StrictMode. Tidak ada token/password pada localStorage, sessionStorage, URL, atau log. Tidak ada retry otomatis mutasi. Error 401 pada endpoint terlindungi menghapus token lokal dan meminta login kembali; gangguan jaringan tidak diperlakukan sebagai password salah.

## Design contract
Halaman masuk: satu tindakan utama, label terlihat, toggle password dapat diakses keyboard, busy/error/success terbaca screen reader. Warna off-white/ink/hijau tua, border ringan, tanpa ilustrasi stok/gradient/grid kartu metrik palsu. Layout dua kolom pada desktop; satu kolom pada ponsel. Halaman password menjelaskan login ulang dan memberi konfirmasi. Dashboard memakai sidebar ringkas dan satu area kosong yang jujur: belum ada data yang ditampilkan, bukan hasil query jumlah nol.

Referensi struktur: pola login dan TextField pada [HeroUI](https://heroui.com/en/docs/react/components/text-field) serta [React Aria](https://react-spectrum.adobe.com/react-aria/TextField.html). MCP HeroUI dicoba tetapi kedua request timeout; dokumentasi resmi dan source package dipakai sebagai fallback. HeroUI Button/TextField/Input/Label/Description dikomposisi dengan komponen custom. Atomic Design di components/{atoms,molecules,organisms,templates}, pages untuk komposisi, lib untuk API.

## Increments
1. Konfigurasi HeroUI/Tailwind + client sesi dan unit test.
2. Form/panel HRD dan component test.
3. Playwright dengan Gateway/Auth/MySQL test terisolasi; desktop/mobile/keyboard, reload, forced change, login ulang, logout; dokumentasi manual.

## Scope
CRUD karyawan dan monitoring belum tersedia pada T09. Deployment, kamera dan lokasi dikerjakan pada task berikutnya. Akun seed development tidak diubah oleh pengujian browser.
