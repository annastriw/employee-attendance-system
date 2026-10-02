# T20 — Capture portal karyawan

## Lingkup

E04/E05 memakai mesin T18 yang dipromosikan ke features/capture, bukan salinan. Halaman lazy #foto-checkin hanya untuk sesi karyawan yang telah mengganti password awal. Model/kamera/lokasi dimulai oleh tombol Buka kamera, bukan saat login atau membuka halaman.

T20 menyiapkan bukti foto+lokasi dan upload JPEG melalui Gateway T19. Tidak membuat record absensi atau menampilkan waktu resmi/status hadir; T21 menghubungkan prepared evidence ke API check-in. Checkout memakai panel yang sama melalui purpose CHECK_OUT saat T22 siap. Entry T20 bernama Siapkan foto check-in; tombol preview Simpan foto, status akhir Foto siap / Absensi belum dikirim. Lokasi disertakan dalam prepared evidence untuk API Attendance T21; endpoint upload Media hanya menerima foto+purpose.

## Desain dan states

Satu kolom maksimal 560 px: kembali dan brand → Foto check-in → kamera/panduan → satu petunjuk prioritas → lokasi → tindakan. Zinc/emerald, Geist, Phosphor, token packages/ui; HeroUI v3 Button/Spinner/Alert diperiksa melalui MCP. Tidak ada detail confidence/angka landmark, statistik, peta dekoratif atau upload galeri pada layar produksi.

State idle, memuat model, membuka kamera, running, denied/model-error, preview, uploading, uncertain/retry, ready dan lokasi expired. Preview menyediakan Ambil ulang. Kamera tanpa crop; foto dicerminkan pada tampilan saja. Minimum target tombol 44 px, fokus terlihat, status live tidak diumumkan tiap frame. Layout satu kolom pada 320–1440 px tanpa breakpoint baru.

## Aturan capture dan bukti

Pertahankan parameter T18: detector 0.3 untuk menghitung wajah; confidence capture 0.8, tepat satu wajah/landmark, posisi valid, stabil 800 ms, frame <=400 ms; open–closed–open kedua mata memicu capture. Manual hanya setelah gate sama valid; detector/model gagal tidak membuka bypass. Main thread tetap dipakai sementara sesuai bukti spike; worker hanya jika perangkat menunjukkan masalah.

Lokasi wajib, finite/in-range, accuracy >=0, maximumAge=0, timeout 15 detik, fresh <=60 detik, future tolerance 5 detik. Lokasi denied/tidak aktif/timeout/stale memblokir capture/pengiriman; retry meminta lokasi nyata. Recheck freshness saat submit dan setelah upload/sebelum konsumsi prepared evidence; metadata READY dapat dipakai setelah lokasi diperbarui tanpa mengunggah ulang foto sama.

JPEG quality .85, longest edge <=1280; validator backend T19 tetap menentukan penerimaan. Prepared evidence: photoObjectId, purpose, captureMethod AUTO/MANUAL, clientCapturedAt ber-offset +07:00, location{latitude,longitude,accuracyMeters,capturedAt ber-offset +07:00}. Waktu perangkat hanya bukti capture; waktu resmi tetap backend T21.

## Pengiriman dan privasi

Auth client menerima FormData tanpa Content-Type JSON, menjaga Bearer di memori, credentials include, timeout upload 25 detik (Gateway 15 detik + validasi Auth). Upload key UUID v4 terikat blob+purpose; retry network/503/409 memakai key dan byte sama. Lokasi refresh tidak mengganti key foto. Response harus READY/id/purpose/checksum/dimensi valid. Tidak melakukan retry mutasi otomatis.

Submit guard ref mencegah klik paralel. Busy menonaktifkan retake/kembali; route/tab/unmount tetap melepas kamera dan membatalkan request client. Callback lama tidak boleh memasang metadata ke draft baru. Jika hasil upload belum pasti, UI menyatakan belum dipastikan dan menyediakan Coba lagi; jangan mengaku foto gagal tersimpan. Foto/koordinat/metadata/key hanya memori; URL blob dicabut saat retake/unmount/logout. Upload yang ditinggalkan dapat menjadi orphan; pemulihan/binding/retensi ditangani Attendance sesuai T19/T21.

401 membersihkan sesi dan draft serta kembali ke Masuk. Tidak ada foto/koordinat/token pada storage browser/URL/log. Tidak ada face recognition, geofence atau absensi offline.

## Acceptance dan verifikasi

- [x] Mesin capture bersama + regresi 21 test T18; izin ditolak/retry/satu wajah/blink/manual/lifecycle tetap lulus.
- [x] Client multipart: auth/headers, READY validation, key replay, sesi revoked, error ambigu.
- [x] Komponen produksi: preview/retake, lokasi denied/stale, submit lock/retry, lokasi refresh tanpa reupload, callback lama/unmount.
- [x] Typecheck/lint/build portal; login tidak membawa chunk MediaPipe.
- [x] Visual halaman berubah 320/1440 terang/gelap, fokus dan overflow.
- [ ] Checklist pengguna dengan kamera/lokasi nyata dan backend T19; hasil sintetis dipisahkan dari penerimaan perangkat.

## Checklist manual pengguna

1. Login akun karyawan siap, pilih Siapkan foto check-in; kamera belum diminta sebelum Buka kamera.
2. Izinkan kamera/lokasi. Nol/dua wajah memblokir Ambil foto; satu wajah jelas dan stabil memungkinkan manual. Kedipan open–closed–open mengambil satu foto.
3. Preview: kamera berhenti; Ambil ulang mencabut foto lama dan memulai flow baru.
4. Tolak/timeout/nonaktifkan lokasi: capture/pengiriman terblokir. Tombol Perbarui memulihkan tanpa input koordinat.
5. Simpan foto: request multipart melalui backend nyata menjadi READY; belum ada klaim absensi tersimpan. Setelah >60 detik perbarui lokasi; foto sama tidak diupload ulang.
6. Putus koneksi saat upload: hasil belum dipastikan; retry memakai key sama. Navigasi/logout/tab ditinggalkan melepas kamera dan tidak memasang hasil sesi lama.
7. Uji desktop/ponsel pada HTTPS/localhost, terang/gelap; kontrol bisa dibaca/ditekan pada 320 px, tanpa geser horizontal.

Acuan: [UI/UX](frontend-ui-ux.md), [tema](frontend-design-system.md), [spike](../architecture/camera-location-spike.md), [Media](media-photos.md).

## Bukti increment 2026-10-02

Mesin shared features/capture menggantikan file mesin di spikes/capture, dengan entry spike tetap tersedia. CapturePanel menggunakan HeroUI v3 dari MCP, PortalBrand/tokens packages/ui dan Phosphor; route dilindungi login serta forced password change. Tidak ada persist draft pada storage browser.

54 tes terfokus lulus dalam beberapa suite: regresi T18 21, photo-upload 10, use-photo-upload 5, CapturePanel 4, Auth client 8, App 6. Test menemukan missing alert role; perbaikan diverifikasi lewat komponen dan accessibility tree Chrome. Typecheck/lint/build portal lulus. Build menghasilkan chunk CapturePage terpisah; FaceLandmarker ada pada chunk capture dan tidak pada main login. Model WASM/task baru diminta setelah Buka kamera.

Delapan visual Playwright memakai sesi tiruan pada beranda/capture idle, 320/1440 terang/gelap, satu worker, lulus. MCP Chrome DevTools meninjau capture idle terang/gelap, target tombol minimal 44 px, tanpa overflow; juga memverifikasi error model saat jaringan Offline dan role alert. Bukti ini tidak menggantikan tes kamera/GPS/upload dengan akun nyata. Checklist manual tujuh langkah masih menunggu pengguna; T20 belum ditutup penuh. Integrasi MySQL/AIStor T19 tidak diulang karena backend tidak berubah.

Auth 3001, Gateway 3000, Media 3004 dijalankan dari dist T19 terbaru; health ketiganya 200, database/storage up. Vite 5173 yang sudah berjalan digunakan ulang. Hanya frontend dan dokumentasi berubah; tidak menjalankan seluruh monorepo atau deployment.