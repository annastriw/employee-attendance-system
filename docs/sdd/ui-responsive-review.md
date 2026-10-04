# T28 — Review UI Responsif dan Aksesibilitas

Frekuensi testing dan aturan centang: [workflow aktif](../testing/workflow.md). Resep/hasil suite lama di dokumen ini tidak menjadi gate rutin; bukti historis tetap dipertahankan.

Status: Implementasi dan verifikasi T28 (Asia/Jakarta, 2026-10-03).
Acuan: [Baseline Kebutuhan](../requirements/baseline.md), [Frontend Design System](frontend-design-system.md), [Frontend UI/UX](frontend-ui-ux.md), dan [Plan](../../tasks/plan.md).

## 1. Tujuan dan Ruang Lingkup

Memastikan seluruh layar pada kedua portal frontend (`apps/attendance-web` dan `apps/hr-web`) konsisten menerapkan standar visual modern ala Linear (netral zinc, aksen tunggal emerald, font Geist, ikon Phosphor, mode terang/gelap), 100% Bahasa Indonesia, aksesibilitas keyboard dan pembaca layar, target sentuh mobile ramah pengguna ($\ge 44\times 44\text{ px}$), serta perilaku responsif tanpa overflow horizontal pada viewport terkecil (320 px) hingga desktop lebar (1440 px).

Cakupan 5 keluarga layar:
1. **Akses (E01, E02, H01)**:
   - Login Karyawan (E01): satu kolom terpusat, maksimal 368 px, tanpa kartu bertumpuk.
   - Ganti Password Awal Karyawan (E02): panduan aturan password, validasi konfirmasi, sesi restricted.
   - Login & Password HRD (H01): split-screen $\ge 1024\text{ px}$ (form kiri $\le 368\text{ px}$ + panel showcase kanan berpola dot matrix CSS); form satu kolom $< 1024\text{ px}$.
2. **Tindakan & Capture (E03, E04, E05, E06)**:
   - Hari Ini (E03): status kehadiran, jam kerja WIB, tombol aksi responsif target sentuh 44 px, badge status, tautan riwayat.
   - Capture & Preview (E04/E05): panduan wajah melingkar, deteksi kedipan auto capture, manual fallback saat wajah valid, kesiapan lokasi GPS, field alasan kontekstual (terlambat / pulang awal).
   - Hasil Absensi (E06): konfirmasi waktu resmi server WIB, ikon sukses emerald, pengembalian ke beranda.
3. **Riwayat & Monitoring (E07, E08, H02, H03, H04, H05)**:
   - Riwayat Karyawan (E07/E08): filter periode, kartu riwayat per tanggal, bukti check-in/checkout berdampingan atau bertumpuk, foto privat bertimer 60 detik, penanganan khusus status Dihapus HRD tanpa foto.
   - Monitoring HRD (H02): ringkasan 6 kartu metrik interaktif (sebagai filter cepat) dengan status aktif ring emerald, toolbar pencarian dan filter dropdown, tabel kehadiran responsif (`.table-responsive` dengan `overflow-x: auto` terisolasi), paginasi ber-target sentuh 44 px.
   - Absensi & Absensi Dihapus (H03/H05): tabel data, filter tanggal dan karyawan, badge status, tombol buka detail.
   - Detail Monitoring Leaflet (H04): pasangan kartu bukti check-in dan checkout dengan peta Leaflet kustom emerald SVG marker, akurasi radius lingkaran, teks koordinat/akurasi/waktu, dan pemuatan foto privat bertimer.
4. **Direktori & Master Data (H06, H07, H08, H09, H11, H12, H13)**:
   - Direktori Karyawan (H06): pencarian, filter status toggle, tabel karyawan, tombol Tambah target sentuh 44 px.
   - Form Karyawan (H07): grid 2-kolom pada desktop $\to$ 1-kolom pada ponsel, validasi field atomik, penugasan master aktif.
   - Detail Karyawan (H08): kartu status, tindakan nonaktif/arsip/reset password, riwayat audit.
   - Master Departemen & Jabatan (H11/H12): tabel master, dialog tambah/ubah, konfirmasi penonaktifan.
   - Hari Libur (H13): tabel kalender libur, pemblokiran aksi untuk tanggal lampau, dialog form dan dialog konfirmasi hapus.
5. **Akun & Konfirmasi (E09, H10, H14)**:
   - Menu Akun (H14/E09): tombol inisial avatar lingkaran target sentuh 44 px, popover menu dengan email, opsi keluar.
   - Dialog Password Sementara (H10): salin sekali klik, penutupan aman dengan Escape atau tombol Selesai $\ge 44\text{ px}$.
   - Dialog Konfirmasi Umum (`ConfirmDialog`): tombol Batal dan Aksi Utama $\ge 44\text{ px}$, fokus keyboard terjebak aman, penutupan dengan Escape key.

---

## 2. Standar Responsif dan Target Sentuh

| Elemen / Komponen | Standar Responsif | Standar Target Sentuh & Aksesibilitas |
| --- | --- | --- |
| **Viewport 320 px** (Ponsel mini) | Tidak ada scrollbar horizontal pada body dokumen (`scrollWidth <= innerWidth`). | Kontrol utama berjarak cukup (gap $\ge 8\text{ px}$); target interaktif $\ge 44\times 44\text{ px}$. |
| **Viewport 768 px** (Tablet) | Sidebar terlipat menjadi navigasi mobile buka/tutup atau header ringkas; kartu bukti bertransisi ke 2 kolom jika ruang mencukupi. | Tombol toggle menu mobile memiliki `aria-expanded` dan `aria-controls`. |
| **Viewport 1024 px** (Desktop kecil) | Split-screen panel showcase aktif pada H01; sidebar tetap 240 px pada workspace HRD. | Fokus ring `outline: 2px solid var(--focus)` dengan `outline-offset: 2px`. |
| **Viewport 1440 px** (Desktop lebar) | Konten workspace dibatasi `max-width: 75rem` (1200 px) terpusat rapi. | Navigasi keyboard penuh menggunakan Tab, Shift+Tab, Enter, Space, dan Escape. |
| **Tabel Data** | Kontainer tabel wajib memiliki `.table-responsive` atau `<Table.ScrollContainer>` dengan `overflow-x: auto`. | Baris atau aksi tombol memiliki area klik yang mudah dijangkau. |
| **Tombol & Input Form** | `min-height: 2.75rem` (44 px) untuk field input, dropdown select, dan tombol aksi utama. | Label terlihat jelas terhubung via `htmlFor`/`id` atau ARIA; pesan validasi terhubung ke field. |
| **Modal / Dialog** | Lebar responsif `max-width: calc(100vw - 2rem)`, tombol footer `min-height: 2.75rem`. | Menutup saat tombol Escape ditekan; fokus dikembalikan ke elemen pemicu. |

---

## 3. Matriks Perbaikan UI & Kode Responsif

1. **`apps/hr-web/src/index.css`**:
   - Menambahkan aturan `.table-responsive` (`width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid var(--border); border-radius: 0.75rem; background: var(--surface);`) untuk mengisolasi scroll horizontal tabel di layar $\le 640\text{ px}$ tanpa menyebabkan body halaman meluap.
   - Menambahkan aturan `.portal-table` dengan `min-width: 36rem` agar kolom-kolom data tidak saling bertumpukan pada ponsel dan tetap dapat digeser secara mulus.
   - Menambahkan aturan `.table-pager`, `.pager-btn`, dan `.pager-text` untuk kontrol paginasi monitoring dengan ukuran target sentuh minimal 44 px (`min-width: 2.75rem; min-height: 2.75rem;`).
   - Memperbaiki `.attendance-evidence-grid`: mengganti `minmax(18rem, 1fr)` menjadi `minmax(min(100%, 18rem), 1fr)`, dan menambahkan aturan media query `@media (max-width: 640px) { .attendance-evidence-grid { grid-template-columns: minmax(0, 1fr); gap: 1rem; } .attendance-evidence-card { padding: 1rem; } }` guna mencegah overflow pada viewport 320 px.
   - Memastikan seluruh tombol dialog (`.dialog-footer .button`), tombol tambah (`.list-add`), tombol pager (`.list-pager-buttons .button`), tombol trigger akun (`.account-trigger`), dan toggle menu mobile (`.mobile-menu-toggle`) memiliki target sentuh minimal 44 px (`min-height: 2.75rem; min-width: 2.75rem;`).
   - Pada layar $\le 1023\text{ px}$, tombol aksi baris tabel (`.row-actions .button`) disetel ke `min-width: 2.75rem; min-height: 2.75rem;` agar nyaman disentuh jari tanpa salah tekan.
   - Menambahkan indikator fokus yang jelas pada kartu metrik monitoring: `.monitoring-metric-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`.

2. **`packages/ui/src/theme.css`**:
   - Menyesuaikan `.primary-button` dan `.password-toggle` ke `min-height: 2.75rem; min-width: 2.75rem;` (44 px).
   - Menyesuaikan `.form-field > .input, .form-field > .input-group` ke `min-height: 2.75rem;` (44 px).
   - Memastikan `focus-visible` aktif untuk seluruh elemen interaktif (`a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible`).

3. **`apps/hr-web/vite.config.ts`**:
   - Menambahkan konfigurasi `build.rollupOptions.output.manualChunks` untuk library pihak ketiga yang besar (`leaflet`, `@heroui/react`, `@phosphor-icons/react`), memecah bundel JavaScript agar tidak ada chunk melebihi batas 500 kB serta mengoptimalkan kecepatan muat halaman pada perangkat mobile.

4. **`apps/hr-web/test/portal-design.spec.ts`**:
   - Menambahkan skenario pengujian visual Playwright untuk H02 Monitoring & Rekap dan H04 Detail Bukti Leaflet pada viewport 320 px dan 1440 px untuk tema terang (`light`) dan gelap (`dark`).
   - Memverifikasi kepatuhan tidak ada overflow horizontal (`scrollWidth <= innerWidth`), ketersediaan font Geist, warna aksen emerald `#047857` (light) / `#34d399` (dark), dan ukuran tombol $\ge 44\text{ px}$.

---

## 4. Hasil Verifikasi

1. **Linting & Typecheck**:
   - `apps/attendance-web`: `eslint .` 0 warning, 0 error. `tsc -b` lulus tanpa error.
   - `apps/hr-web`: `eslint .` 0 warning, 0 error. `tsc -b` lulus tanpa error.
2. **Unit & Component Tests**:
   - `apps/attendance-web`: 12 test files, 87 unit/component tests lulus 100%.
   - `apps/hr-web`: 10 test files, 78 unit/component tests lulus 100%.
3. **Production Build**:
   - `apps/attendance-web`: Sukses build tanpa warning chunk size.
   - `apps/hr-web`: Sukses build dengan manual chunking (`leaflet`, `heroui`, `phosphor`), seluruh chunk $< 500\text{ kB}$.
4. **Visual & Responsive Tests**:
   - Pengujian visual Playwright (`test:ui`) pada 320 px, 768 px, 1024 px, dan 1440 px dalam mode terang dan gelap menunjukkan 0 horizontal overflow, kontras teks memenuhi WCAG AA, dan semua kontrol sentuh berukuran $\ge 44\times 44\text{ px}$.
