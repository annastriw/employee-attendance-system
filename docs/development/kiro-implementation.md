# Panduan melanjutkan implementasi dengan Kiro CLI

Tanggal: 2026-10-01. Pengguna memilih Kiro CLI sebagai pelaksana implementasi setelah desain UI/UX dicatat. Panduan dapat dibaca langsung dari repo, tanpa riwayat chat atau konfigurasi agent tertentu.

## Tujuan dan urutan membaca

Implementasikan seluruh pengalaman Attendance Portal dan HR Portal sampai acceptance terpenuhi, terhubung API nyata, dan dapat dijalankan/diuji lokal. Teruskan backend yang diperlukan sesuai rencana proyek. Siapkan artefak deployment; live mengikuti ketersediaan akses dan instruksi rilis.

1. [AGENTS.md](../../AGENTS.md): instruksi proyek, Git, data dan sumber keputusan.
2. [Baseline](../requirements/baseline.md): aturan bisnis/platform.
3. [UI/UX](../sdd/frontend-ui-ux.md) dan [design system](../sdd/frontend-design-system.md): konsep, ID layar, states, responsivitas/acceptance.
4. [Plan](../../tasks/plan.md), [todo](../../tasks/todo.md), lalu module specs/ADR terkait task.
5. Source/test/runbook: [HR lokal](../deployment/hr-local.md), [Auth](../sdd/auth-service.md), [tooling](../architecture/adr-002-project-tooling.md), [deployment](../architecture/adr-003-repository-and-deployment.md), [storage](../architecture/adr-001-object-storage.md).

Gunakan context engineering: sesudah inventaris, muat bagian spesifikasi/source terkait increment. Dokumentasikan keputusan sebelum mengubah perilaku bisnis.

## Keadaan awal: periksa ulang

- Auth/Gateway, seed HR, forced password, sesi/revokasi dan login HR sudah tersedia dengan pengujian sebelumnya. Pertahankan alur yang bekerja.
- HR memiliki ringkasan kosong/menu akun; master/karyawan/monitoring belum memiliki UI/API lengkap.
- Attendance masih placeholder; login/capture/halaman bisnis belum tersedia.
- Tema/token/AuthShell bersama di packages/ui; pnpm workspace dan Atomic Design.
- MySQL dev/test memakai schema terpisah pada satu instance lokal; container test khusus belum tersedia. AIStor Free Compose ada; jangan menganggap layanan sedang hidup.
- T08/T09 selesai; beberapa induk fondasi belum ditutup. Audit source/test dan lengkapi yang kurang, jangan membangun ulang atau mencentang tanpa bukti.
- Branch dev. Saat penulisan belum ada remote; pengguna menentukan GitHub nanti. Jangan membuat/memilih remote sendiri.

## Urutan pelaksanaan

| Increment | Lingkup | Bukti |
| --- | --- | --- |
| UX01 | Audit status/runtime/spec; lengkapi fondasi terkait | Task aktual, dependensi dan kendala tercatat |
| UX02 | Wireframe lima keluarga layar; shared shell/toolbar/form/detail/states | Konsistensi desktop/mobile; teruskan ke implementasi |
| UX03 | T10–T15 master, profil+akun, login, lifecycle/reset | HR membuat akun → karyawan ganti password/masuk; restore Nonaktif; token lama ditolak |
| UX04 | T16–T22 jadwal/libur, spike, media, capture, check-in/out | Foto+lokasi wajib, waktu resmi, alasan, idempotensi; perangkat nyata dicatat |
| UX05 | T23–T26 delete/restore, riwayat, monitoring, Leaflet | Data nyata, foto sesuai role, dua lokasi, deleted/missing berbeda |
| UX06 | T27–T29 pemulihan service, review seluruh layar, E2E/CI | Failure/retry, build/lint/test, screenshot dan acceptance lengkap |
| UX07 | T30–T31 paket deploy/runbook/live saat akses tersedia | Dua Vercel, VPS Ubuntu, Cloudflare, MySQL/AIStor, backup/rollback |

UX01–UX07 merupakan koordinasi UI/UX dalam todo, bukan pengganti dependensi T01–T31. Kerjakan backend bersama layar sebagai vertical slice. Pecah increment menjadi perubahan kecil; jangan menyatakan seluruh layar dummy sebagai fitur selesai.

## Cara bekerja sampai selesai

- Pengguna mengarahkan desain dan implementasi; keputusan rutin dalam scope tidak perlu persetujuan ulang setiap task.
- Skills relevan jika tersedia: SDD, context engineering, incremental implementation, frontend UI, source-driven development, TDD bisnis, browser testing, review dan Git. Jangan mengklaim skill/MCP dipakai bila tidak tersedia/berhasil.
- MCP HeroUI untuk docs/API/source/styles versi terpasang; MCP browser jika tersedia. Jika gagal, catat kendala dan gunakan docs resmi/source package serta Playwright; lanjutkan pekerjaan independen.
- Wireframe mengikuti spec dan menjadi bahan review visual, bukan gate persetujuan otomatis. Tinjau screenshot/browser dan perbaiki pelanggaran desain.
- API/MySQL/AIStor nyata untuk hasil akhir. Mock untuk component test/prototipe saja dengan konteks jelas.
- Selesaikan detail teknis terbuka melalui spike/docs/test: threshold wajah, batas foto/lokasi, presisi waktu, TTL, retry/outbox. Catat hasil. Tanyakan secara spesifik hanya untuk perubahan kebutuhan atau akses yang belum tersedia, sambil melanjutkan pekerjaan independen.
- Jangan menambah export, cuti/izin, geofence, face matching, hard delete, admin tambahan atau edit fakta absensi.
- Perubahan logis: verifikasi → review diff/stage file terkait → commit berprefix pada dev. Push hanya ke remote pilihan pengguna; tanpa remote, commit lokal tetap berjalan dan push dilaporkan tertunda.
- Update todo/spec/runbook/bukti bersama increment. Jangan menghapus failing tests untuk meluluskan pemeriksaan atau menganggap mock sebagai integrasi.
- Lanjutkan task berikut sampai acceptance terpenuhi. Jika sesi/context habis, tulis checkpoint todo: terakhir selesai, berikutnya, perintah/bukti, kendala.

## Perintah verifikasi

Dari root repo; scripts benar saat penulisan, periksa package.json sebelum menjalankan. Pastikan env test/layanan siap tanpa menampilkan kredensial.

~~~powershell
pnpm --dir apps/hr-web run build
pnpm --dir apps/hr-web run lint
pnpm --dir apps/hr-web run test
pnpm --dir apps/hr-web run test:ui
pnpm --dir apps/attendance-web run build
pnpm --dir apps/attendance-web run lint
~~~

HR E2E dengan API/MySQL test nyata sesuai runbook:

~~~powershell
pnpm db:generate
pnpm db:migrate:test
pnpm --dir apps/auth-service run build
pnpm --dir apps/api-gateway run build
pnpm --dir apps/hr-web run test:e2e
~~~

- Attendance belum punya test/test:e2e; lengkapi Vitest + RTL + Playwright saat implementasi domain, lalu catat perintah.
- Backend Jest + @nestjs/testing + Supertest; scripts service terkait. Integration memakai MySQL/AIStor testing, bukan data pribadi development/production.
- Core journeys: login/password; master/provisioning; lifecycle/reset; capture/check-in/out; riwayat; monitoring/detail foto/peta; delete/restore; expired session; izin ditolak/retry.
- Playwright: interaksi, keyboard, filter/pagination, viewport 320/375–390/768/1024/1440. Screenshot/trace pada folder ignored; ringkasan aman boleh di docs.
- Simulasi kamera/lokasi bukan bukti blink/perangkat nyata. Catat manual test yang benar-benar dilakukan dan yang masih menunggu.

## Definisi selesai

Selesai lokal: seluruh E01–E09/H01–H14 sesuai spec/baseline, API terintegrasi, pemeriksaan relevan lulus, runbook selaras dan tidak ada placeholder/dummy pengganti fitur. Laporkan fitur, bukti test, commit dan kendala nyata.

Live hanya selesai setelah DNS/HTTPS, kedua frontend, service, MySQL/storage, kamera/lokasi dan core journeys diuji live. Tanpa akses Vercel/VPS/Cloudflare atau instruksi promosi, siapkan artefak yang dapat dikerjakan dan jelaskan kebutuhan tersisa. Branch main mengikuti tahap rilis pengguna.
