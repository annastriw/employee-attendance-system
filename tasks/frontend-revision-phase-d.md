# Revisi fase D — audit dan rencana (2026-10-05)

Arahan pengguna terbaru: T sebelumnya dianggap selesai; lanjut T22–T28 serial,
audit dahulu dan tanyakan ketidakjelasan sebelum implementasi. Semua perubahan
lokal **tanpa commit/push**, PR, merge atau deployment. Backend boleh diubah.
Acuan: [plan](plan.md), [todo](todo.md), [progress](progress.md),
[baseline](../docs/requirements/baseline.md), [testing](../docs/testing/workflow.md).

## Batas audit

Audit source dilakukan pada tree bersih branch dev: kedua portal, shared UI,
Gateway, DTO dan query service. Bukti runtime awal berasal dari request/error
pengguna. Tidak menjalankan browser/harness atau mengklaim acceptance visual.
Belum ada service baru dijalankan; port 5173/5174/3000–3004 tidak ditemukan
listening pada pemeriksaan awal. Verifikasi runtime produksi setelah perbaikan
backend memerlukan rilis terpisah oleh pengguna.

## Temuan

| ID | Scope | Bukti/temuan | Tindak lanjut |
| --- | --- | --- | --- |
| D01 | Ringkasan/departemen | `attendance-monitoring.dto.ts` memakai `IsUUID('4')`; ID laporan `3b81c559-bfef-11f1-85c7-76e03cd5f3d3` adalah v1. Menjelaskan 400 yang dikirim pengguna. | Terima UUID sah seperti DTO direktori/absensi; tetap tolak input invalid. |
| D02 | Direktori karyawan | `employee-provisioning-proxy.controller.ts` whitelist hanya search/status/page/pageSize; UI mengirim departmentId/positionId. Employee DTO/query sudah mendukung keduanya. | Whitelist kategori khusus endpoint list karyawan; jangan perluas endpoint history/detail. |
| D03 | Search/alignment | `SearchInput` menampilkan label; toolbar mencampur field berlabel dan kontrol tanpa label. HR CSS memakai center, shared lists/compact memakai end. | Satu baseline tinggi kontrol, label search accessible, chips di baris sendiri. |
| D04 | Departemen/jabatan/hari libur | Tombol Tambah ada di PageHeader terpisah dari toolbar. | Pindahkan aksi tambah ke toolbar daftar; pertahankan header judul/breadcrumb. Hari libur tidak memiliki tab status di source; jangan mengarang filter baru. |
| D05 | Filter shared | Dropdown kategori berada di Popover FilterPanel, ID opsi semua adalah string kosong; perlu unit interaksi overlay, pilih/clear/combine/pagination. | Buktikan pilihan sampai request; jangan menyebut overlay rusak sebelum reproduksi. |
| D06 | Kalender | DatePicker/RangePicker di shared UI; range juga di dalam FilterPanel dengan overflow-y:auto. Single Calendar memakai pemilih tahun. Target scroll laporan dikonfirmasi pengguna: grid harus muat satu bulan tanpa scroll. | Popup fixed di tengah viewport, override ukuran sel dan padding tabel global; pindah bulan lewat tombol. |
| D07 | Hapus/pulihkan absensi | AttendanceDetail memakai secondary untuk keduanya; ConfirmDialog selalu primary. | Merah untuk hapus termasuk konfirmasi; emerald/hijau untuk pulihkan. |
| D08 | Aksi lain | Master edit/deactivate sama-sama ghost; karyawan deactivate/reset sama secondary; delete holiday ghost. | Netral edit/navigasi, warning nonaktif/reset konsekuensial, danger hapus/arsip, emerald aktif/pulih/simpan. Label/ikon tetap menjelaskan aksi. |
| D09 | Tema | ThemeToggle selalu menampilkan tiga pilihan; collapsed rail masih menumpuk pilihan. | Trigger ringkas membuka menu Terang/Gelap/Sistem; persist dan keyboard tetap bekerja. |
| D10 | Akun | WorkspaceAccountMenu hanya avatar, role+email muncul setelah dibuka; login user tidak memiliki name. me/profile sudah menyediakan nama bila employeeId terhubung. | Muat identitas profil untuk kedua shell, tampilkan nama+email di trigger; HR tanpa profil memakai Admin HRD, jangan menebak nama dari email. |
| D11 | Brand/sidebar | Collapsed mengubah header menjadi column, menyembunyikan brand-label; drawer menggandakan brand yang ada di mobile header. | Brand tetap di header lebar penuh; drawer/rail hanya navigasi. |
| D12 | Mobile/tablet | Shared shell breakpoint drawer <1024; tabel cards <768; account text/chips/popup berpotensi melebihi ruang. | Audit ukuran 320/375/768/1024/1440, kedua tema/role; acceptance manual pengguna. |

## Matriks filter wajib

| Layar | Filter/query yang diperiksa | Status audit source |
| --- | --- | --- |
| HR Ringkasan | Tanggal, departemen, status hadir, nama/NIK, page; rentang grafik terpisah | D01; service menyaring sebelum pagination, query Gateway monitoring mengizinkan departemen |
| HR Karyawan | Nama/NIK, ACTIVE/INACTIVE, departemen, jabatan, page | D02; DTO/query Employee sudah menyaring kedua kategori |
| HR Absensi aktif/dihapus | Rentang/preset, departemen, jabatan, employeeId konteks, page | Kontrak kategori sudah ada dari T15; perlu regresi kombinasi/reset |
| HR Departemen/Jabatan | Nama/kode, ACTIVE/INACTIVE, page | Whitelist Gateway sesuai kontrak; buktikan search/tab/reset |
| HR Hari libur | Search, rentang/preset, legacy tahun/bulan, page | Whitelist Gateway mencakup seluruh query; buktikan reset/legacy |
| Karyawan Riwayat | Rentang/preset, page, kembali dari detail | Query source memuat rentang; buktikan reset/page dan isolasi akun tetap |

Tidak menambah filter HR ke role karyawan yang tidak punya kewenangan tersebut.
Keseragaman berlaku bahasa visual, shell, kontrol, kalender, detail dan state.

## Backlog serial

- [x] **T22 Audit dan spesifikasi revisi.** Temuan, matriks, rencana dan pertanyaan dicatat. Audit source selesai; ini bukan acceptance runtime.
- [x] **T23 Filter API ujung ke ujung.** Attendance DTO UUID + unit v1/v4/invalid; Gateway kategori khusus list employees + unit forwarding/rejection; unit service filter sebelum count/pagination; regresi request UI seluruh matriks. Tidak ada migration direncanakan.
- [x] **T24 Toolbar dan kalender.** Shared search/filter/chips; daftar HR karyawan/master/holiday; target scroll sesuai jawaban. Desktop satu baseline; mobile/tablet wrap teratur. Unit hanya perilaku/query berubah, lint/typecheck terkait.
- [x] **T25 Warna aksi.** Tone shared konfirmasi dan tombol kedua role: danger hapus/arsip, warning nonaktif/reset, emerald aktif/pulih/simpan, netral edit/navigasi/batal. Verifikasi konfirmasi dan disabled/busy.
- [x] **T26 Shell, brand, tema, identitas.** Shared theme dropdown, nama/email visible, data profil asli + fallback HR; brand tetap sesuai jawaban; rail/drawer keyboard/focus/persistence. Kedua role memakai komponen sama.
- [x] **T27 Sweep dua role.** HR ringkasan/list/detail/form/profil/login dan Karyawan hari ini/riwayat/detail/profil/login/ganti password/capture. Mobile/tablet/desktop, dua tema, loading/error/empty; capture tetap fullscreen.
- [x] **T28 Review dan handoff.** Diff, unit terdampak, lint/typecheck/build bila perlu; catat hasil aktual dan checklist manual terpisah. Tidak commit/push. Tandai service/endpoint perlu rilis; manual pending sampai pengguna menyatakan oke.

Dependency: T22 → T23 → T24 → T25 → T26 → T27 → T28.
Klarifikasi diterima: kalender popup fixed menampilkan seluruh hari dalam satu
bulan tanpa geser/scroll; pindah bulan dengan tombol. Logo/nama portal tetap di
header walaupun sidebar terbuka. Tidak ada klarifikasi tertunda.
Tidak ada pertanyaan aturan bisnis baru; keputusan role/akses/data tetap baseline.

## Hasil verifikasi teknis

T22-T28 selesai teknis lokal. Checklist task di atas menyatakan pekerjaan agen
selesai; acceptance UI/alur pengguna tetap terpisah dan belum dicentang.

- HR: 75 unit pada halaman/filter/control terkait (71 halaman, 1 kombinasi filter
  karyawan, 3 tema/identitas). Meliputi query/preset/clear/reset/pagination dan
  alur konfirmasi. Department/Position masing-masing mendapat regresi status +
  search; Hari Libur mendapat regresi rentang/search/page + preset.
- Karyawan: 30 unit App/History/Login/Capture. Dua fixture App sekarang membedakan
  endpoint identitas dan absensi sehingga tidak bergantung urutan effect.
- Backend: 14 monitoring Attendance (termasuk UUID v1/v4/invalid), 11 Gateway
  (filter list/penolakan history/duplicate/unknown dan monitoring), 2 filter
  Employee, 3 lifecycle Attendance. Total **135 unit terfokus lulus**; bukan suite
  penuh dan bukan bukti integrasi DB/live.
- Lint HR/Karyawan/Gateway/Attendance lulus; typecheck kedua frontend dan noEmit
  kedua backend lulus; build kedua portal lulus. Rebuild Vite dilakukan setelah
  koreksi akhir lebar dialog drawer. Warning chunk >500 kB masih ada, build sukses.
- Review source/diff, whitespace dan tautan relatif dokumen lulus. Tidak ada
  migration, server baru, commit/push, PR/merge atau deployment.
- Sweep source memakai shared shell/theme/calendar/controls kedua role. Header
  dua baris <768px, drawer <1024px, cards list <768px; lebar drawer dialog mengikuti
  container agar tidak overflow. Visual nyata/keyboard/landscape masih manual.

**Perlu rilis terpisah oleh pengguna:** Attendance Service
`GET /api/v1/monitoring/employees` dan API Gateway `GET /api/v1/employees`,
serta kedua frontend. Tidak mengklaim error production sudah hilang sebelum
backend baru dirilis.

## Acceptance manual (belum dijalankan)

- [ ] Semua filter pada matriks, sendiri dan kombinasi, menghasilkan data sesuai; clear/chip/reset dan pagination konsisten; tidak ada 400 untuk ID database sah.
- [ ] Search/tab/filter/Tambah sejajar; chips tidak menggeser kontrol; popup kalender utuh dan scroll sesuai keputusan.
- [ ] Hapus merah dan pulih hijau pada trigger serta konfirmasi; aksi lain bisa dibedakan.
- [ ] Tema via menu, nama+email visible, brand stabil, drawer/rail bekerja di kedua role.
- [ ] Ukuran 320/375/768/1024/1440px, terang/gelap; form/detail/capture tetap dapat dipakai.


## Tambahan pengguna: keluar akun dan audit UUID

Scope diperluas setelah T28: satu akses keluar melalui popup akun pada kedua
portal, scan semua validasi UUID dan perbaiki bug terkonfirmasi. Tetap serial,
lokal tanpa commit/push/PR/deploy. Total fase ini menjadi 10 task (T22-T31).

- [x] **T29 Satu akses keluar.** Hapus tombol keluar dari profil/form password
  dan command palette. Popup akun tersedia juga pada layar wajib ganti password,
  tanpa tautan Profil yang melewati gate. Menu/aksi disabled saat busy.
- [x] **T30 Audit UUID dan bug tambahan.** Scan DTO, parameter pipe, guard,
  regex proxy/client, idempotensi, generator Prisma/seed dan alur referensi ID.
  Perbaiki pembatasan versi ID data, perbandingan case dan tanggal invalid;
  pertahankan aturan UUID v4 pada Idempotency-Key.
- [x] **T31 Verifikasi dan review tambahan.** Unit terfokus, lint, typecheck,
  build kedua portal dan catatan handoff. Acceptance manual tetap pending.

### Temuan dan perbaikan tambahan

| ID | Temuan | Perbaikan |
| --- | --- | --- |
| D13 | Keluar tersebar pada profil/form dan command palette | Satu menuitem Keluar di popup akun; tersedia saat password wajib diganti |
| D14 | Pipe Departemen/Jabatan membatasi path ID v4 | Terima UUID data sah untuk detail/ubah/aktif/nonaktif; malformed tetap ditolak |
| D15 | DTO reset password internal membatasi employeeId/actorAccountId v4 | Selaraskan dengan DTO provisioning/lifecycle tanpa versi khusus |
| D16 | Bind foto dan check-in/out membatasi event/account/photo/daily ID v4 | Terima UUID sah tanpa mengubah ownership, idempotensi atau transaksi |
| D17 | Beranda/status karyawan menolak record/event seed v5; riwayat hanya v4/v5 | Validasi ID data v1-v8 dengan variant sah pada kedua client |
| D18 | Filter monitoring dan detail riwayat membandingkan UUID case-sensitive | UUID dengan huruf kapital tetap cocok; record berbeda tetap ditolak |
| D19 | Respons beranda/record menerima tanggal berbentuk YYYY-MM-DD yang mustahil | Validasi tanggal melalui round-trip UTC, tolak 30 Februari/bulan 13 |
| D20 | Fixture storage Media tidak memenuhi MediaConfig | Tambahkan workerEnabled:false; typecheck dan unit deadline lulus |

UUID baru dari randomUUID/Prisma tetap v4; seed deterministik tetap v5. Tidak
mengubah generator atau data tersimpan dan tidak memerlukan migration. Validasi
v4 pada kunci idempotensi tetap merupakan kontrak mutasi/upload yang disengaja.
Receipt upload foto baru tetap v4 sesuai generator PhotosService; referensi ID
foto yang sudah tersimpan tidak dibatasi versi pada DTO absensi/bind.

### Bukti verifikasi tambahan

- HR App + kontrol workspace: 8 unit lulus. Karyawan App: 11 unit lulus.
- Karyawan attendance-client/history/use-check-in: 31 unit lulus (history 10
  setelah tambahan case UUID). Bukan suite penuh.
- Employee pipe master: 32; Auth DTO + reset service: 7; Media DTO: 4;
  Attendance check-in/out DTO: 4; monitoring service: 10; storage deadline: 2.
  Seluruhnya lulus. Total checkpoint tambahan **109 unit terfokus**; sebagian
  regresi sudah tercakup checkpoint 135 sebelumnya, jangan menjumlahkan keduanya.
- Lint kedua frontend serta Employee/Auth/Media/Attendance lulus. noEmit keempat
  backend lulus setelah fixture Media diperbaiki; build kedua portal termasuk
  typecheck lulus. Warning chunk >500 kB tetap ada.
- Tidak menjalankan DB/storage produksi, suite integrasi penuh atau browser
  harness. Test deadline memakai HTTP loopback sementara dan ditutup oleh test.
  Audit source/test tidak membuktikan aplikasi bebas semua bug di runtime.

**Scope rilis setelah perubahan lokal ini:** kelima service (Gateway,
Attendance, Employee, Auth, Media) dan kedua frontend. Tidak ada rilis dilakukan.

- [ ] Popup akun merupakan satu-satunya akses Keluar pada profil, workspace dan
  wajib ganti password kedua role; menu busy tidak menjalankan aksi berulang.
- [ ] UUID database v1/v5 dapat dipakai pada master, reset password, monitoring,
  beranda, check-out dan riwayat setelah backend/frontend baru dirilis.


Keputusan terbaru pengguna 2026-10-05 setelah verifikasi: commit dan push
perubahan terverifikasi ke dev diizinkan dan diminta. Menggantikan batas
local-only sebelumnya. PR/merge/main/deployment belum diminta; acceptance
manual tetap pending.
