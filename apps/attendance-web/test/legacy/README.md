# Bukti spike kamera

Fixture dan test spike kamera T18 dipertahankan di sini setelah entry browser
spike dihapus pada redesign T3. Vitest tetap menjalankan `capture/CaptureSpike.test.tsx`
melalui include `test/legacy/**/*.test.tsx`; test tidak dihapus atau dilewati.

Kode production memakai `src/components/organisms/CapturePanel.tsx` dan
`src/features/capture/`. Fixture ini hanya mempertahankan skenario pengujian
perangkat lama, bukan halaman yang dapat diakses pengguna.
