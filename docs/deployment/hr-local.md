# Portal HRD lokal

## Prasyarat
MySQL development/test aktif dan migration telah diterapkan. Package database, Auth, Employee dan Gateway telah dibuild. Jalankan `pnpm provisioning:setup` setelah konfigurasi Auth lokal tersedia; script membuat key provisioning hanya dalam file ignored. Migration dev/test dan `pnpm db:grants` harus terbaru. Admin HRD sudah di-seed sesuai [panduan Auth](auth-local.md).

## Menjalankan aplikasi
Buka empat terminal PowerShell pada root proyek:

Terminal 1 — Auth:
```powershell
pnpm --dir apps/auth-service start:dev
```

Terminal 2 — Employee:
```powershell
pnpm --dir apps/employee-service start:dev
```

Terminal 3 — Gateway:
```powershell
pnpm --dir apps/api-gateway start:dev
```

Terminal 4 — HR Portal:
```powershell
pnpm --dir apps/hr-web dev --port 5174 --strictPort
```

Buka http://localhost:5174. Keempat terminal perlu tetap berjalan selama development. Docker Desktop menjalankan MySQL/AIStor secara terpisah.

Email/password awal berada dalam `.env.auth` lokal, pada ADMIN_SEED_EMAIL dan ADMIN_SEED_PASSWORD. Jangan menyalin rahasia ke dokumen/Git. Login awal wajib mengganti password; setelah berhasil, masuk kembali dengan password baru. Variabel ADMIN_SEED_PASSWORD tidak memperbarui akun yang sudah di-seed dan tidak berubah otomatis saat pengguna mengganti password.

Base URL default frontend: `http://localhost:3000/api/v1`. Untuk override, salin `.env.example` dalam apps/hr-web ke `.env.local` pada folder yang sama, lalu ubah VITE_API_BASE_URL. Hanya URL publik yang boleh berada dalam variabel VITE_; jangan memasukkan JWT secret atau kredensial database. Origin frontend harus ada pada allowlist Auth dan Gateway. Hindari mencampur localhost dengan 127.0.0.1 pada URL browser/API karena cookie mengikuti hostname.

## Yang tersedia
- Form login HRD, tampil/sembunyikan password, loading, pesan kesalahan.
- Wajib ganti password awal dan login ulang setelah seluruh sesi dicabut.
- Pemulihan sesi saat reload, pembaruan menjelang expiry, logout.
- Ringkasan awal tanpa metrik/data contoh; rekap kehadiran menyusul.
- Master departemen/jabatan (H11/H12), filter URL dan status aktif/nonaktif.
- Karyawan: direktori minimal, H07 pembuatan profil+akun, H10 password sekali tampil; retry dan koreksi konflik email pada operasi yang sama. Edit/lifecycle/reset umum menyusul T14.
- HeroUI 3.2.6 dan komponen custom dengan Atomic Design.

## Pengujian
Unit/component:
```powershell
pnpm --dir apps/hr-web test
pnpm --dir apps/hr-web build
pnpm --dir apps/hr-web lint
```

Browser terintegrasi (Chrome terpasang):
```powershell
pnpm db:generate
pnpm db:migrate:test
pnpm --dir apps/auth-service build
pnpm --dir apps/employee-service build
pnpm --dir apps/api-gateway build
pnpm --dir apps/hr-web test:e2e hr-employees.spec.ts --workers=1
```

Jalankan spec Auth/departemen/jabatan/karyawan terpisah agar limit Auth tidak terkena gabungan suite. Ikuti [tier test](../../tasks/plan.md#tier-test-biaya-vs-nilai--disetujui-2026-10-02) untuk pemeriksaan terfokus tiap perubahan. Harness membuat akun/master/operasi sementara pada attendance_test, menjalankan Auth/Employee/Gateway pada 15301/15302/15300 dan frontend 15174, lalu membersihkan hanya profil/receipt/akun/sesi/audit/master milik fixture. Kredensial fixture berada sementara pada `.local/hr-e2e*.json` yang di-ignore; password tersebut khusus test. Trace/screenshot berada di apps/hr-web/test-results (di-ignore). Jika pengujian terputus, jalankan ulang teardown setelah memastikan service test dihentikan:
```powershell
pnpm --dir apps/hr-web exec node -e "import('./test/global-teardown.mjs').then(m => m.default())"
```

Database test memakai schema terpisah pada instance MySQL lokal yang sama; container test khusus belum dibuat. Akun seed development tidak diganti oleh test browser. Harness mensyaratkan loopback dan nama attendance_test sebelum membuat/menghapus fixture.

## Hasil verifikasi T09
- 11 test client/component: refresh bersamaan, token hanya memori, role, jaringan, expiry, revokasi, alur form dan batas Unicode/UTF-8.
- 2 Playwright journeys desktop/mobile melalui API nyata: login awal, reload sebelum ganti, konfirmasi salah, ganti password, login ulang, reload dashboard, logout, reload signed-out.
- Keyboard focus, nama kontrol, toggle password dan tidak ada horizontal overflow pada 320/768/1024/1440 px.
- Screenshot desktop/mobile telah ditinjau; tidak ada JavaScript page error pada browser journeys. Accessibility audit otomatis dan perangkat ponsel fisik belum diuji pada tahap ini.
- MCP HeroUI timeout; komponen dibuat berdasarkan [dokumentasi resmi HeroUI](https://heroui.com/en/docs/react/getting-started/quick-start) dan API package terpasang. Review browser memakai Playwright; Chrome DevTools MCP juga tidak merespons.

Spesifikasi: [alur HRD](../sdd/hr-auth-flow.md). Login karyawan T13 selesai dengan browser manual API nyata; lihat [panduan Attendance](attendance-local.md). Spesifikasi pembuatan akun: [Employee provisioning](../sdd/employee-provisioning.md).
