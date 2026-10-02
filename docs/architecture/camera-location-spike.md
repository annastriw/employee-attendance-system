# T18 — Spike kamera dan lokasi

Status: diterima pengguna pada 2026-10-02 setelah laporan uji semua alur berjalan.
Acuan: [baseline](../requirements/baseline.md), [UI/UX](../sdd/frontend-ui-ux.md),
[task](../../tasks/todo.md#t18--spike-kamera-dan-lokasi).

## Lingkup dan kontrak
Entry development terisolasi `apps/attendance-web/spikes/capture.html`; tidak diimpor
oleh portal, tidak masuk build produksi default. Tidak ada API/upload/penyimpanan
foto atau koordinat. Foto JPEG dan lokasi hanya di memori, hilang saat berhenti,
retake atau menutup halaman. Tidak ada pencocokan identitas atau geofence.
Model/WASM diunduh dari sumber Google/jsDelivr; frame diproses di browser.

Klik Mulai memuat model, meminta kamera depan tanpa audio, lalu mencari lokasi.
Tampilkan loading model, kamera, lokasi, error dan retry secara terpisah. Tepat
satu wajah harus valid untuk auto maupun manual. Model/detector gagal tidak
membuka capture manual. Kedip open → closed → open memicu satu preview.
Lokasi gagal/ditolak/kedaluwarsa memblokir capture dalam spike dan kelayakan
draft; tidak ada pengganti koordinat ketikan. Preview dan retake tersedia.
Kamera berhenti saat preview, Stop, unmount, pagehide atau tab tersembunyi.
Callback async sesi lama tidak boleh menghidupkan kamera/mengganti hasil sesi baru.

## Parameter awal untuk kalibrasi (belum tervalidasi perangkat nyata)
- @mediapipe/tasks-vision 1.0.1 (rilis stabil 2026-07-31, kebijakan usia paket tetap).
- Face Detector short-range float16 v1; deteksi awal score >= 0.3 agar wajah
  kedua berconfidence rendah tetap dihitung; capture score >= 0.8.
- Face Landmarker float16 v1, VIDEO, numFaces=2, blendshapes aktif, CPU.
- Wajah: bbox berada pada 5–95% frame, pusat x 30–70%, y 25–70%;
  tinggi 20–75% frame. Video tampil tanpa crop; preview dicerminkan saja.
- Stabil 800 ms, frame terakhir <= 400 ms; jeda > 400 ms reset kedipan.
- Kedip kedua mata: terbuka <= 0.25, tertutup >= 0.55,
  durasi tertutup 80–1000 ms; harus mulai dari mata terbuka.
- Inference ditarget tiap 100 ms pada frame video baru; tampilkan waktu
  inference di detail diagnostik. Main thread untuk spike; keputusan worker
  T20 berdasarkan bukti latency perangkat, bukan diasumsikan lancar.
- Lokasi maximumAge=0, enableHighAccuracy=true, timeout=15 detik;
  freshness <= 60 detik, toleransi timestamp masa depan 5 detik.
  Accuracy wajib finite >= 0, ditampilkan tanpa geofence/ambang akurasi.
  Ini parameter frontend awal; validasi backend diputuskan saat T21.
- JPEG quality 0.85, sisi terpanjang <= 1280 px; bukan batas upload final T19.

## Acceptance dan bukti
- [x] Model/WASM aktual dimuat dan inference dijalankan (kamera sintetis).
- [x] Unit: count/confidence/posisi, blink/reset/gap, location fresh/invalid.
- [x] Komponen: izin ditolak, retry, preview/retake dan manual gate.
- [x] Visual 320/1440 px terang/gelap, fokus dan overflow (idle/running sintetis).
- [x] Uji perangkat nyata diterima berdasarkan konfirmasi pengguna: "saya sudah uji jalan semua" (2026-10-02). Detail model perangkat/OS/browser dan angka benchmark tidak diberikan; tidak diklaim sebagai matriks Android/iOS spesifik.
- [ ] Nol/dua wajah, pencahayaan rendah, kacamata, blink dan manual.
- [ ] Lokasi denied/timeout/stale, kamera denied/unavailable dan model gagal.
- [ ] Stop/background/retake melepas tracks; callback lama diabaikan.

Bukti otomatis/simulasi tidak membuktikan kamera, kedip manusia atau GPS nyata.
T18 ditutup berdasarkan penerimaan uji pengguna; T19 dapat dikerjakan
serial saat menunggu perangkat karena tidak bergantung pada T18.

## Menjalankan
Dari root: `pnpm --dir apps/attendance-web run dev --host 127.0.0.1 --port 5173 --strictPort`.
Buka `http://localhost:5173/spikes/capture.html`. Localhost adalah secure context;
alamat IP LAN lewat HTTP bukan secure context. Tidak perlu login untuk spike.

Untuk ponsel gunakan HTTPS lokal dengan sertifikat yang dipercaya ponsel
(SAN mencakup IP/nama host PC). Sertifikat/key hanya di `.local/`, jangan commit.
Set env `CAPTURE_HTTPS_CERT` dan `CAPTURE_HTTPS_KEY` ke path sertifikat/key,
lalu `pnpm --dir apps/attendance-web exec vite --config vite.capture.config.ts --host 0.0.0.0 --port 5173 --strictPort`.
Satu konfigurasi ini khusus spike dan hanya untuk jaringan development tepercaya;
jangan publish Vite server ke internet. Buka HTTPS host PC dari Wi-Fi yang sama.
Tanpa sertifikat tepercaya, uji ponsel belum dapat dinyatakan lulus.
PowerShell stop server dengan Ctrl+C; variabel env dapat dihapus setelahnya.

Catat device/OS/browser, HTTPS, confidence/posisi, blink berhasil/percobaan,
latency inference, accuracy (tanpa koordinat), denied/retry, track cleanup dan
hasil. Jangan memasukkan foto pribadi atau koordinat ke Git.

## Sumber
- [Google Face Detector Web](https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector/web_js)
- [Google Face Landmarker Web](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js)
- [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition)
- HeroUI MCP v3.2.6: quick-start, list_components, Button berhasil diakses 2026-10-02.

## Bukti increment 2026-10-02
- 21 test terfokus lulus: policy 7, boundary browser 2, komponen 12.
  Perangkat/model pada unit dan komponen disimulasikan; mencakup model/camera
  failure, location retry/stale, blink satu preview, retake, kehilangan kamera,
  pagehide/unmount dan model/kamera async dari sesi yang sudah ditinggalkan.
- `pnpm --dir apps/attendance-web run build` (termasuk typecheck konfigurasi
  HTTPS) dan `pnpm --dir apps/attendance-web run lint` lulus.
  Build default tetap hanya entry portal, tanpa spike dan bundle MediaPipe.
- MCP Chrome DevTools: idle 320/1440 terang/gelap, tanpa overflow/error/warning;
  Tab memfokuskan Mulai dengan outline. Runtime Chrome headless terisolasi:
  kedua model + WASM HTTP 200, inference aktual, kamera sintetis dan
  geolocation sintetis (0,0); capture ditolak saat face gate tidak valid.
  Pola sintetis menghasilkan 1–2 deteksi dengan confidence rendah
  (contoh 0.343–0.612), bukan bukti wajah manusia. Sampel inference 19–79 ms,
  bukan benchmark/p95 perangkat. Screenshot running 320/1440 terang/gelap
  ditinjau; tunggu transisi tema 150 ms selesai sebelum menilai warna.
- Foto, screenshot dan skrip smoke hanya di `.local/` (ignored), tidak di Git.
- Review menemukan kamera terputus dan blendshape hilang perlu gate/error
  eksplisit; diperbaiki dan regression tests lulus. API/login/DB tidak berubah.
- Pengguna mengonfirmasi semua alur uji berjalan pada 2026-10-02 dan meminta lanjut.
  T18 diterima; tidak mengarang platform perangkat, success rate atau akurasi GPS.

## Penerimaan pengguna
Pada 2026-10-02 pengguna menyampaikan: "sudah mantap, saya sudah uji jalan semua, sekarang lanjut saja".
Laporan ini menjadi bukti manual dari pengguna, terpisah dari bukti otomatis/sintetis.
Parameter awal dipertahankan untuk integrasi T20; evaluasi ulang jika ditemukan
kendala perangkat. Angka benchmark, model perangkat dan versi browser tidak diberikan.
Skenario kegagalan di checklist yang belum dicatat perangkat nyata tetap dibuktikan
oleh test/simulasi yang dijelaskan; tidak dinyatakan sebagai observasi perangkat pengguna.