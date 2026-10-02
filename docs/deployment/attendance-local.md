# Attendance Portal lokal (T13)

## Menjalankan

Dari root proyek di PowerShell, pastikan Docker Desktop aktif. Jika MySQL belum hidup:

```powershell
docker compose --env-file .env.mysql -f infra/compose.mysql.local.yml up -d mysql
```

Gunakan akun karyawan yang sudah dibuat melalui T12. MySQL development dan konfigurasi Auth/Gateway lokal harus sudah siap sesuai [panduan Auth](auth-local.md) dan [Gateway](gateway-local.md). Jalankan pada tiga terminal terpisah, dan biarkan terbuka:

```powershell
pnpm --dir apps/auth-service start:dev
```

```powershell
pnpm --dir apps/api-gateway start:dev
```

```powershell
pnpm --dir apps/attendance-web dev --port 5173 --strictPort
```

Buka http://localhost:5173. Login karyawan memakai Gateway di `http://localhost:3000/api/v1`; frontend tidak mengakses Auth 3001 langsung. Employee Service 3002 diperlukan untuk membuat akun melalui HR, tetapi tidak diperlukan saat hanya mencoba login akun yang sudah ada. Origin `http://localhost:5173` ada dalam template allowlist Auth dan Gateway. Pakai hostname `localhost` secara konsisten untuk browser dan Gateway agar cookie sesuai.

## Checklist manual T13

1. Buka `http://localhost:5173` pada desktop dan lebar ponsel 320 px. Halaman Masuk satu kolom, email/password terlihat, tombol tampilkan password dapat dipakai, tanpa geser horizontal.
2. Masuk memakai email karyawan hasil T12 dan password sementara yang ditampilkan sekali. Halaman **Buat password baru** harus muncul; tautan `#beranda` tidak boleh melewati langkah ini.
3. Isi password lama, password baru minimal 12 karakter (maksimal 72 byte UTF-8), dan konfirmasi berbeda. Muncul pesan validasi; password tidak berubah. Ulangi dengan konfirmasi sama dan password baru berbeda dari yang lama.
4. Setelah tersimpan, portal meminta login ulang. Password sementara tidak berlaku; masuk dengan password baru, lalu **Beranda** menampilkan email akun dan pesan bahwa fitur absensi sedang disiapkan.
5. Muat ulang halaman: sesi karyawan pulih. Klik **Keluar**, lalu muat ulang lagi: halaman Masuk tetap tampil. Akun HRD tidak dapat masuk di panel karyawan. Bila HR Portal juga terbuka, sesi HRD dan karyawan tidak saling menggantikan.

Jangan masukkan password atau token ke laporan hasil pengujian. Catat hanya nomor langkah yang lulus/gagal dan pesan kesalahannya bila gagal.

## Pemeriksaan frontend yang sudah lulus

Typecheck, lint, build, enam test unit Auth client, tiga test komponen login, tiga test alur App, dan 12 test visual Playwright satu worker (E01/E02/home, terang/gelap, 320/1440 px) lulus. Test visual memakai respons sesi tiruan. Pengguna melaporkan checklist manual langkah 1–5 dengan API nyata lulus pada 2026-10-02; T13 ditutup. E2E otomatis belum dijalankan karena RAM terbatas. Spesifikasi: [login karyawan](../sdd/employee-auth-flow.md).

## Capture T20

Untuk Siapkan foto check-in pada beranda, jalankan Media Service juga (terminal terpisah, atau proses dist lokal yang sudah aktif):

~~~powershell
pnpm --dir apps/media-service start:dev
~~~

AIStor dan .env.media runtime harus siap menurut [panduan Media](media-local.md). Portal tetap memakai http://localhost:5173 dan Gateway 3000; Auth 3001, Media 3004. Gunakan akun karyawan hasil T12/T13 yang telah mengganti password awal. Periksa kesehatan http://localhost:3004/health sebelum uji upload.

Ikuti [checklist manual capture](../sdd/attendance-capture.md#checklist-manual-pengguna). T20 menyiapkan foto+lokasi dan menyimpan foto privat; belum mencatat absensi. T21 mengirim prepared evidence ke Attendance dan menetapkan waktu resmi server. Gunakan HTTPS atau localhost untuk kamera/lokasi; akses http lewat IP LAN biasa akan diblokir browser. Untuk ponsel, buka origin HTTPS yang telah dimasukkan allowlist Auth/Gateway; konfigurasi deployment/tunnel tidak dibuat pada increment ini.

Spesifikasi dan bukti pengujian T20 ada di [capture portal karyawan](../sdd/attendance-capture.md). Tes otomatis memakai perangkat/sesi sintetis; hasil kamera/GPS/upload nyata dicatat terpisah, tanpa foto/koordinat/password/token di repo.