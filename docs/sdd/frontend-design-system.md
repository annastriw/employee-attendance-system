# Tema bersama Attendance Portal dan HR Portal
Status: disetujui pengguna; revisi visual 2026-10-01 (arah "produk modern ala Linear", menggantikan tema monokrom charcoal). Berlaku untuk semua frontend sekarang dan berikutnya. Persetujuan T09c ditegaskan pengguna pada 2026-10-02.

## Kontrak desain
Modern, tegas dan teknis, tetap mudah dipahami. Netral zinc dengan satu aksen emerald yang dipakai konsisten untuk tindakan utama, fokus, tautan dan penanda aktif. Mode terang dan gelap mengikuti prefers-color-scheme sistem. Warna merah/kuning hanya untuk status bermakna. Hindari slogan jualan, statistik palsu, gambar dekoratif buatan tangan, gradien ungu/glow dan em-dash pada teks tampilan.

## Token
| Token | Terang | Gelap |
| --- | --- | --- |
| background | #fafafa (zinc-50) | #09090b (zinc-950) |
| surface / panel | #fdfdfd / #f4f4f5 | #111113 / #18181b |
| foreground / muted | #18181b / #71717a | #fafafa / #a1a1aa |
| border / field-border | #e4e4e7 / #d4d4d8 | #27272a / #3f3f46 |
| accent / accent-foreground | #047857 / #fdfdfd (kontras 5,4:1) | #34d399 / #022c22 |
| focus ring | #059669 | #34d399 |

Token berada di packages/ui/src/theme.css dan menimpa variabel HeroUI v3 (--accent, --surface, --field-*, dst.). Aplikasi tidak menambah palet sendiri.

## Komponen dan layout
- HeroUI v3 + Tailwind v4: TextField, Input, InputGroup, Label, Button, Dropdown. Dokumentasi HeroUI v3 diperiksa melalui MCP (context7 bila MCP HeroUI tidak tersedia). Custom component hanya untuk kebutuhan aplikasi dan layout bersama.
- Font Geist Variable (self-hosted via @fontsource-variable/geist) untuk seluruh teks; Geist Mono untuk angka waktu/tabel. Ikon dari @phosphor-icons/react saja, weight regular, tanpa SVG buatan tangan.
- Bentuk: tombol dan field radius 8 px, panel/kartu 12 px, menu 10 px. Tombol HeroUI bawaan pill ditimpa agar mengikuti aturan ini. Tombol ditekan memberi umpan balik scale 0.98.
- Tipografi: judul auth 28 px semibold tracking rapat, judul workspace 20 px, isi 14 px, label 13 px medium. Spacing kelipatan 4 px.
- Login HR (H01): split-screen pada lebar >= 1024 px. Kolom kiri berisi penanda portal (ikon dalam kotak emerald + nama portal), judul Masuk, satu kalimat petunjuk, form dan baris bantuan akses; lebar form maksimal 368 px. Kolom kanan adalah panel surface berpola titik halus (CSS, bukan gambar) berisi satu judul dan tiga kemampuan nyata produk dengan ikon. Di bawah 1024 px panel kanan disembunyikan; form satu kolom.
- Login Attendance (E01): satu kolom terpusat, maksimal 368 px, penanda portal yang sama, tanpa panel samping. Fokus pada ponsel.
- HR workspace: sidebar 240 px berisi penanda portal dan menu dengan ikon; item aktif memakai latar default dan ikon emerald. Header 56 px berisi judul halaman dan tombol akun (inisial dalam lingkaran). Email tampil di menu akun. Kondisi kosong: ikon dalam kotak lembut, satu judul, satu kalimat.
- Mobile: sidebar menjadi navigasi buka/tutup dengan tombol ikon Menu, aria-expanded dan aria-controls; dropdown akun tetap dapat dipakai.
- Karyawan berfokus pada check-in/checkout saat fitur tersedia. Sekarang hanya status singkat login belum tersedia. Jangan membuat kontrol atau statistik palsu.
- Motion rendah dan bermakna: konten auth muncul fade-up 200 ms, transisi hover/fokus 150 ms. Semua dimatikan pada prefers-reduced-motion. Label terlihat, fokus keyboard terlihat, notifikasi error/success dan busy tetap berfungsi.
- Halaman berikutnya wajib memakai token dan komponen bersama, tanpa palet baru atau menyalin tema ke aplikasi.

## Verifikasi
Ikuti [tier test yang direvisi 2026-10-03](../../tasks/plan.md#tier-test-biaya-vs-nilai--disetujui-2026-10-02): unit test hanya untuk logika/interaksi yang berubah dan lint/typecheck terkait. UI/layout, navigasi, keyboard, menu, overflow, mobile/desktop serta terang/gelap diperiksa manual pada halaman terdampak. Tidak perlu test visual/Playwright otomatis setiap fitur atau rilis; suite lama disimpan sebagai alat diagnosis opsional.
- Opsional untuk diagnosis: pnpm --dir apps/hr-web run test:ui (fixture visual).
- Opsional untuk diagnosis: pnpm --dir apps/hr-web run test:e2e (alur API nyata, fixture terisolasi).
- Pemeriksaan manual browser/devtools untuk ukuran mobile/desktop, screenshot dan aksesibilitas; tidak perlu harness baru.

Bukti terakhir (T11, 2026-10-02): 36 pemeriksaan visual kedua portal serta H11/H12 terang/gelap pada 320/768/1024/1440 px lulus dan screenshot ditinjau; 38 test komponen HR, build HR/backend, serta E2E jabatan/departemen desktop/mobile lulus. Bukti rinci di [modul jabatan](employee-positions.md) dan [progress](../../tasks/progress.md).

## Sumber
MCP HeroUI: Button, Dropdown, InputGroup, Input dan Label. [Theming](https://heroui.com/docs/react/getting-started/theming), [Dropdown](https://heroui.com/docs/react/components/dropdown), [InputGroup](https://heroui.com/docs/react/components/input-group).

## Konsep dan penerapan seluruh halaman

T09c adalah tema wajib seluruh layar E01–E09/H01–H14, termasuk form, dialog, daftar, detail, capture, loading, empty/error state dan tampilan mobile. Halaman yang belum diimplementasikan menerapkan tema ini saat task terkait dikerjakan. T09b monokrom hanya catatan historis, bukan acuan implementasi aktif.
Kontrak visual ini dipakai bersama [spesifikasi UI/UX](frontend-ui-ux.md). Spesifikasi tersebut memetakan E01–E09 dan H01–H14, navigasi, keluarga layar, capture, lifecycle, states, responsivitas dan acceptance. Tema yang sama tidak mewajibkan susunan kartu yang sama: halaman karyawan berpusat pada tindakan, HR berpusat pada daftar/detail.

Susunan daftar: judul → toolbar → tabel/daftar → pagination. Detail: identitas/status → bukti check-in/checkout → tindakan kontekstual. Form: kelompok field → validasi → satu tindakan utama. Seluruh halaman memakai token packages/ui; tidak menambah palet/teks dekoratif.

Kelanjutan implementasi mengikuti [alur implementasi](../development/implementation-workflow.md), [plan](../../tasks/plan.md), dan checklist UX dalam [todo](../../tasks/todo.md).
