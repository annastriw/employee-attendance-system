# Spesifikasi UI/UX seluruh portal

Status: arah desain hasil diskusi disetujui untuk ditulis sebagai acuan implementasi oleh pengguna pada 2026-10-01. Dokumen ini adalah spesifikasi target, bukan laporan fitur yang telah selesai.

## Acuan dan batas keputusan

- [Baseline kebutuhan](../requirements/baseline.md) mengatur aturan bisnis, akses, waktu, foto, lokasi, dan penghapusan.
- [Design system](frontend-design-system.md) mengatur token visual dan kontrol bersama.
- [Rencana](../../tasks/plan.md) dan [tugas](../../tasks/todo.md) mengatur dependensi implementasi dan bukti verifikasi.
- [Alur implementasi](../development/implementation-workflow.md) mengatur cara meneruskan pekerjaan dari keadaan repo saat ini.
- Spesifikasi ini merinci pengalaman pengguna; tidak mengubah kontrak bisnis/API. Jika ditemukan benturan, selesaikan spesifikasi tanpa melonggarkan kebutuhan yang disetujui.

## Konsep produk

Ruang kerja yang tenang dan terstruktur. Karyawan segera memahami tindakan absensi berikutnya; HR segera menemukan dan memeriksa catatan. Benang merahnya: setiap hari memiliki catatan yang mudah dibuat, ditemukan, dan diperiksa. Kalimat konsep tidak ditampilkan sebagai slogan aplikasi.

Konsistensi datang dari bahasa visual, istilah, navigasi, pola formulir, daftar, detail, dan umpan balik. Susunan halaman mengikuti tugas: absensi memberi ruang pada tindakan dan kamera; HR memberi ruang pada pencarian serta perbandingan data.

| Alternatif | Manfaat | Pertimbangan |
| --- | --- | --- |
| Ruang kerja terstruktur — dipilih | Menyatukan tindakan, formulir, daftar, dan detail | Memerlukan hierarki dan pembagian ruang yang jelas |
| Jurnal harian | Urutan kejadian mudah dipahami karyawan | Kurang efisien sebagai kerangka perbandingan banyak karyawan |
| Panel operasional | Status dan pengecualian cepat ditemukan HR | Ringkasan dipakai seperlunya agar tidak mendominasi daftar |

## Bahasa visual bersama

| Elemen | Kontrak implementasi |
| --- | --- |
| Warna | Background/surface putih; panel #fafafa; foreground #242424; primary charcoal #292929; muted #6b6b6b; border #e4e4e4. Gunakan token packages/ui/src/theme.css, bukan palet per halaman. |
| Status | Warna semantik terbatas untuk berhasil, gagal dan peringatan. Sertai teks/ikon; jangan mengandalkan warna saja. |
| Tipografi | Segoe UI/system sans-serif yang sudah digunakan. Judul auth 24 px, workspace 18 px, isi 14 px; label/metadata 12–13 px jika tetap terbaca. Angka waktu/tabel memakai tabular numerals. |
| Spacing | Kelipatan 4 px. Jarak antarkelompok lebih besar dari jarak elemen dalam kelompok. Form lapang; tabel cukup padat untuk perbandingan. |
| Bentuk | Radius field/panel 8 px; bentuk tombol mengikuti HeroUI yang disepakati. Bayangan hanya membantu mengenali lapisan seperti menu/dialog. |
| Tindakan | Satu primary per konteks; secondary untuk alternatif; tertiary untuk Batal/Kembali. Danger hanya saat konsekuensi memerlukan penekanan. |
| Teks | Judul menyebut tugas/objek, label selalu terlihat. Bantuan menjelaskan format, langkah atau konsekuensi saat diperlukan. Hindari slogan, sambutan panjang, paragraf dekoratif dan statistik pengisi ruang. |
| Ikon/gerakan | Satu gaya ikon dengan label pada tindakan penting. Transisi singkat; hormati reduced motion. |

Gunakan section, alignment dan separator. Jangan membungkus setiap field/baris dalam kartu atau menumpuk kartu di dalam kartu. Foto dan peta asli menjadi bukti pada detail.

## Navigasi dan keluarga layar

- Attendance Portal: Hari ini, Riwayat, Akun. Ponsel memakai navigasi ringkas yang mudah dicapai tanpa menutupi form/tombol; layar lebar memakai header ringkas dan konten terpusat.
- HR Portal: Monitoring, Absensi, Karyawan, Data master (Departemen/Jabatan), Hari libur; Akun pada dropdown header. Desktop memakai sidebar ramping yang ada; mobile memakai tombol Menu.
- Tampilkan navigasi yang benar-benar dapat digunakan pada increment berjalan. Jangan memakai tautan mati/data contoh sebagai hasil API.
- Kembali dari detail mempertahankan filter, pagination dan konteks pilihan. Halaman/filter penting dapat dibuka ulang melalui URL tanpa kredensial/foto dalam URL.
- Restore/reset adalah tindakan kontekstual. Arsip karyawan dan absensi dihapus merupakan tab/filter daftar terkait, bukan dashboard baru.

| Keluarga | Struktur konsisten |
| --- | --- |
| Akses | Identitas portal kecil → judul tugas → form → hasil/bantuan terkait |
| Tindakan absensi | Tanggal/status → bukti hari ini → tindakan berikutnya |
| Capture | Judul tindakan → kamera/petunjuk → kesiapan lokasi → preview/alasan → kirim |
| Daftar | Judul → toolbar pencarian/filter/tindakan → daftar/tabel → pagination |
| Detail | Kembali → identitas/status → informasi/bukti → tindakan kontekstual |
| Form | Judul tugas → kelompok field → error terkait → Simpan dan Batal |

Dialog untuk konfirmasi/tindakan pendek. Form karyawan panjang dan detail absensi lengkap memakai halaman khusus. Panel cepat opsional tetap menyediakan akses detail lengkap pada URL tersendiri.

## Attendance Portal: seluruh halaman

ID layar untuk keterlacakan, bukan ketentuan nama file atau endpoint baru.

| ID | Halaman/alur | Informasi dan tindakan |
| --- | --- | --- |
| E01 | Masuk | Form maksimal 368 px di tengah; Attendance Portal, Masuk, email, password, toggle password, tombol Masuk. Bantuan akses mengarahkan ke HR jika diperlukan; tidak membuat reset mandiri/email otomatis. |
| E02 | Password awal | Password sementara/current, password baru, konfirmasi; aturan dekat input. Setelah berhasil jelaskan login ulang sesuai kontrak sesi. |
| E03 | Hari ini | Tanggal WIB, jadwal 08.00–17.00 pada hari kerja, status, waktu check-in/checkout dan tindakan berikutnya. Link detail/riwayat tidak mendominasi. |
| E04 | Capture | Satu flow check-in/checkout dengan judul sesuai tindakan. Izin kamera/lokasi, panduan wajah, kedipan auto capture, manual fallback sesuai validitas wajah. |
| E05 | Preview/pengiriman | Foto, kesiapan lokasi, alasan jika wajib, Ambil ulang dan Kirim check-in/checkout. Draft dipertahankan saat retry jika masih valid. |
| E06 | Hasil | Konfirmasi waktu resmi/status setelah backend sukses. Memperbarui Hari ini; tidak memerlukan halaman perayaan. |
| E07 | Riwayat | Filter periode, daftar berdasarkan tanggal, waktu check-in/checkout, status dan pagination. Satu item membuka detail hari. |
| E08 | Detail riwayat | Bukti kedua event dengan urutan sama: waktu, foto, lokasi, alasan. Terhapus menampilkan waktu/alasan penghapusan dan menyembunyikan foto. |
| E09 | Akun | Identitas/profil read-only seperlunya, ganti password dan Keluar. Tidak ada self-edit data master. |

### Keadaan Hari ini

| Keadaan | Tampilan dan tindakan |
| --- | --- |
| Belum check-in | Status dan tombol Check-in; check-in awal diperbolehkan. |
| Check-in setelah 08.00 hari kerja | Capture tersedia; alasan terlambat wajib sebelum backend menerima. |
| Sudah check-in, belum checkout | Waktu check-in dan tombol Checkout; sebelum 17.00 alasan pulang awal wajib. |
| Sudah checkout | Kedua waktu/status; tindakan absensi selesai, akses detail tersedia. |
| Setelah 17.00 tanpa check-in | Tidak ada absensi sesuai API; check-in terlambat tetap boleh pada tanggal tersebut sesuai cutoff backend. Label status tidak otomatis memblokir tindakan. |
| Lewat batas checkout hari check-in | Tidak menawarkan checkout tanggal lampau; catatan tetap Belum checkout. |
| Akhir pekan/libur | Di luar hari kerja; absensi tetap boleh, tanpa penilaian late/early/lembur. |
| Dihapus HRD | Label Dihapus HRD dan akses detail; tidak membuka absensi ulang tanggal sama. |

Waktu resmi/status berasal dari API. Jam perangkat tidak menentukan keputusan final. Jika API meminta alasan karena ambang waktu terlewati saat pengiriman, kembalikan ke field alasan, pertahankan draft yang valid dan jelaskan singkat.

### Capture, lokasi dan pengiriman

1. Klik Check-in/Checkout memberi konteks singkat bahwa foto dan lokasi wajib. Izin dipicu tindakan pengguna, bukan saat membuka login/Hari ini.
2. Bedakan memuat model, membuka kamera, mencari lokasi, izin ditolak, perangkat tidak tersedia, model gagal dan lokasi timeout.
3. Tampilkan satu petunjuk sesuai masalah terpenting: Posisikan wajah → Pastikan hanya satu wajah jika perlu → Kedipkan mata → Foto diambil. Confidence/landmark tidak menjadi teks UI normal.
4. Manual fallback hanya setelah tepat satu wajah valid. Detector/model gagal tidak membuka bypass. Threshold confidence/posisi/kesegaran lokasi ditetapkan dan diuji pada T18.
5. Preview menyediakan Ambil ulang. Lokasi tampil siap/gagal dan akurasi jika tersedia. Koordinat tidak dapat diketik sebagai pengganti; izin ditolak/lokasi tidak aktif/gagal memblokir kirim. Sediakan Coba lagi dan panduan izin sesuai browser.
6. Foto+lokasi+data dikirim dengan Idempotency-Key. Tombol Mengirim… mencegah submit paralel. Retry mengikuti kontrak idempotensi, bukan retry mutasi umum tanpa kontrol.
7. Koneksi putus setelah submit: jelaskan hasil belum dapat dipastikan, lalu rekonsiliasi lewat API/idempotency. Jangan menyatakan gagal tersimpan atau membuat key baru untuk tindakan sama tanpa kepastian.
8. Sukses hanya setelah foto READY, lokasi dan record tersimpan; hasil memakai waktu backend. Lepaskan kamera saat flow ditinggalkan.

Kedipan memicu auto capture, bukan pencocokan wajah/verifikasi identitas. Tidak ada geofence, absensi offline atau absen atas nama pengguna lain.

## HR Portal: seluruh halaman

| ID | Halaman/alur | Informasi dan tindakan |
| --- | --- | --- |
| H01 | Masuk/password awal | Pola E01/E02 dengan identitas HR Portal; mengikuti auth HR yang sudah ada. |
| H02 | Monitoring | Tanggal, ringkasan aktif/check-in/terlambat/pulang awal/belum checkout/tidak ada absensi dari API, lalu daftar karyawan. Status terkait dapat menyaring daftar. |
| H03 | Absensi/rekap | Periode, karyawan, departemen, status; tabel harian dan pagination. Rekap dalam aplikasi. |
| H04 | Detail absensi | Nama/NIK/tanggal/status; bukti check-in/checkout, waktu, foto privat, alasan, Leaflet, accuracy/waktu lokasi; Hapus/Pulihkan sesuai keadaan. |
| H05 | Absensi dihapus | View dalam Absensi; identitas/tanggal, pelaku/waktu/alasan penghapusan, detail dan Pulihkan. HR dapat melihat foto sesuai otorisasi. |
| H06 | Direktori karyawan | Pencarian, departemen/status, pagination; NIK, nama, email, departemen, jabatan, status; Tambah dan detail. |
| H07 | Tambah/edit karyawan | Kelompok Data karyawan: NIK/nama/telepon opsional/departemen/jabatan/mulai bekerja/status sesuai kontrak. Kelompok Akun: email/provisioning. Konflik NIK/email dekat field; sukses setelah profil+akun konsisten. |
| H08 | Detail karyawan | Identitas/status; Profil dan Absensi; edit, aktif/nonaktif, arsip/restore dan reset sesuai akses. Riwayat karyawan arsip tetap tersedia. |
| H09 | Karyawan arsip | View direktori; restore menjadi Nonaktif, aktivasi terpisah setelah sukses. |
| H10 | Reset/password sementara | Konfirmasi identitas dan pencabutan sesi. Password sementara setelah create/reset tampil sekali: Salin dan Selesai; tanpa URL/storage/log. Disampaikan manual. |
| H11 | Departemen | Pencarian/status, tambah/edit, aktif/nonaktif. Form pendek boleh dialog; data dipakai tidak dihapus permanen. |
| H12 | Jabatan | Sama dengan H11. Selector penugasan baru hanya master aktif; edit menjelaskan nilai lama nonaktif. |
| H13 | Hari libur | Daftar tanggal per bulan/keterangan, Tambah/Edit/Hapus. Date picker membantu; tanggal lampau read-only, hari ini/mendatang sesuai backend. |
| H14 | Akun | Identitas admin, ganti password dan Keluar; tanpa pengelolaan admin tambahan. |

### Daftar, rekap dan detail

- Monitoring menjawab keadaan tanggal tertentu; Absensi mencari catatan lintas periode. Gunakan kerangka daftar bersama.
- Status dapat beririsan: terlambat dan pulang awal dapat terjadi pada hari sama. Jangan menjumlahkan semua metrik menjadi total hadir atau memaksakan satu status yang kehilangan informasi.
- Monitoring: karyawan, departemen jika relevan, check-in, checkout, status, detail. Absensi menambah tanggal; Direktori memakai data profil.
- Toolbar dekat tabel; filter aktif terlihat dan dapat dibersihkan. Perubahan filter kembali ke page pertama; filter kosong berbeda dari data awal kosong.
- Foto/peta dimuat pada detail, bukan setiap baris. Bukti kedua event berdampingan pada layar lebar dan bertumpuk pada ponsel dengan urutan sama.
- Dua lokasi berlabel terpisah. Leaflet: marker, lingkaran akurasi, attribution penyedia tile, serta koordinat/akurasi/waktu dalam teks. Kegagalan peta tidak menghilangkan data tekstual.
- Foto memakai signed URL sementara setelah otorisasi. URL kedaluwarsa menyediakan Muat ulang; jangan mencatatnya atau membuat link permanen.
- Missing dihitung backend dari eligibility historis. Terhapus bukan missing dan bukan rekap aktif; UI tidak mengarang baris/statistik dari profil aktif saat ini.

### Lifecycle dan konfirmasi

- Arsip karyawan menyebut nama/NIK dan dampak akses. Nonaktif/arsip membatalkan sesi; riwayat tetap tersedia.
- Restore karyawan menjelaskan status Nonaktif; aktivasi tidak otomatis.
- Hapus absensi seluruh hari: nama, tanggal WIB, alasan wajib, penjelasan pemulihan oleh HR. Tidak menyatakan tidak dapat dibatalkan.
- Detail terhapus: pelaku/waktu/alasan. Restore data asli; konflik tidak menimpa record. Tidak ada edit waktu/foto, hard delete atau absen ulang.
- Form gagal mempertahankan input aman. Form belum tersimpan meminta konfirmasi ketika pengguna sengaja meninggalkan halaman; navigasi daftar biasa tidak perlu konfirmasi.

## Keadaan lintas halaman dan aksesibilitas

| Keadaan | Kontrak pengalaman |
| --- | --- |
| Memuat | Skeleton untuk struktur diketahui; progress kamera/lokasi. Jangan tampilkan nol seolah hasil query selesai. |
| Kosong | Satu kalimat dan tindakan tambah hanya jika relevan/diperbolehkan. |
| Filter tanpa hasil | Jelaskan tidak ditemukan; Bersihkan filter. Error jaringan mempertahankan filter. |
| Gagal | Pesan dekat field/tindakan menyebut masalah dan pemulihan. Detail teknis cukup request ID bila dibutuhkan. |
| Menyimpan | Label busy, cegah duplikasi, pertahankan form/fokus. |
| Berhasil | Hasil backend dan pembaruan data terkait; toast bukan satu-satunya bukti absensi. |
| Sesi berakhir | Bersihkan sesi, arahkan masuk; jangan simpan password/foto draft untuk pemulihan. Gangguan jaringan bukan kredensial salah. |
| Ditolak/tidak ditemukan | Jelaskan tanpa membocorkan data role/pengguna lain; Kembali/Masuk sesuai keadaan. |

- Viewport: 320, 375/390, 768, 1024, 1440 px. Tidak ada overflow halaman; tabel boleh scroll dalam region berlabel. Mobile memprioritaskan kolom inti/daftar ringkas dengan detail lengkap.
- Kontrol penting mobile ditargetkan minimum 44×44 px; tindakan tidak bergantung hover atau ikon tanpa nama.
- Keyboard, Escape, urutan/pengembalian fokus, label screen reader; menu mobile aria-expanded/aria-controls.
- Kontras teks normal minimum 4.5:1, besar 3:1; kontrol/fokus penting terlihat. Uji zoom 200% dan reduced motion.
- Error dihubungkan ke input; status penting diumumkan melalui live region yang sesuai. Jangan mengumumkan setiap frame deteksi.
- Tanggal/waktu konsisten WIB; nama/email panjang membungkus; placeholder bukan pengganti label.

## Struktur implementasi

- packages/ui: token, atoms/molecules netral dan template bersama seperti AuthShell/PortalShell/PageHeader yang benar-benar digunakan kedua portal.
- apps/*-web/src/components/{atoms,molecules,organisms,templates}: komponen domain. pages merangkai layar; lib/modul API untuk client dan mapping, bukan JSX monolitik.
- HeroUI: Button, Input/InputGroup, Label, SearchField, Dropdown, Table, Alert/FieldError dan progress/skeleton sesuai versi terpasang. Periksa docs/API/source/styles melalui MCP; jangan menebak API v2 untuk v3.
- Custom: ringkasan Hari ini, panduan kamera, kesiapan lokasi, pasangan bukti event, peta lokasi, identitas karyawan, hasil password sementara, konfirmasi lifecycle. Buat saat diperlukan, tidak semua di awal.
- Leaflet pada detail; MediaPipe ketika capture dibutuhkan. Halaman masuk tidak membawa beban kamera/peta.
- Props bertipe, state async eksplisit, role/access jelas. Token/password tidak masuk browser storage/URL/log.
- Fixture hanya untuk test/prototipe dengan konteks jelas. Hasil akhir memakai API nyata, MySQL dan AIStor Free; tidak memakai array lokal pengganti backend.

## Kriteria selesai

- [ ] E01–E09/H01–H14 tersedia sesuai akses; tidak ada placeholder bisnis yang diklaim selesai.
- [ ] Seluruh keluarga layar memakai token/komponen bersama dan Bahasa Indonesia konsisten.
- [ ] Auth/master/provisioning/lifecycle/reset/capture/check-in/out/riwayat/monitoring/detail/restore memenuhi baseline.
- [ ] Loading/empty/filter-empty/error/busy/success/expired/denied teruji pada halaman terkait.
- [ ] Screenshot semua keluarga layar pada viewport sasaran ditinjau; mobile/keyboard terverifikasi.
- [ ] Vitest/RTL memeriksa interaksi bermakna; Playwright core journeys memakai API nyata; test backend menguji bisnis/otorisasi/idempotensi.
- [ ] Kamera/blink/fallback/lokasi diuji perangkat nyata; hasil dibedakan dari simulasi.
- [ ] Build/lint/test relevan lulus; task hanya dicentang dengan bukti/batasan jujur.
- [ ] Runbook selaras; live hanya selesai setelah akses dan verifikasi nyata tersedia.

## Dasar riset

Riset 2026-10-01 berupa dokumentasi resmi dan evaluasi kebutuhan proyek, bukan pengujian pengguna aplikasi ini. Penerapan pola adalah keputusan desain yang ditinjau melalui prototipe/browser.

- [HeroUI Design Principles](https://heroui.com/en/docs/react/getting-started/design-principles): hierarki, progressive disclosure, konsistensi/customization. Komponen diperiksa melalui MCP.
- [Carbon Data Table Guidelines](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines): toolbar dan pengungkapan detail; pola diadaptasi dengan HeroUI.
- [web.dev Permissions](https://web.dev/articles/permissions-best-practices): izin kontekstual/pemulihan blocked state; lokasi manual tidak diterapkan karena lokasi perangkat wajib.
- [W3C Form Notifications](https://www.w3.org/WAI/tutorials/forms/notifications/): error yang dapat diperbaiki dan hasil.
- [GOV.UK Button](https://design-system.service.gov.uk/components/button/): label dan penekanan tindakan/konsekuensi.
