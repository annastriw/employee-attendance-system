import { Button } from "@heroui/react";
import { Brand, PageTitle } from "../components/atoms/Brand";
import { Notice } from "../components/molecules/Notice";
import type { AdminUser } from "../lib/auth-client";
export function DashboardPage({
  user,
  busy,
  error,
  onLogout,
}: {
  user: AdminUser;
  busy: boolean;
  error: string;
  onLogout: () => Promise<void>;
}) {
  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <Brand />
        <nav aria-label="Navigasi utama">
          <p className="nav-label">RUANG KERJA</p>
          <a href="#ringkasan" aria-current="page">
            Ringkasan<span aria-hidden="true">↗</span>
          </a>
        </nav>
        <p className="sidebar-footnote">Akses administrator HRD<br />Waktu Indonesia Barat</p>
      </aside>
      <main id="ringkasan" className="dashboard-main">
        <header className="dashboard-header">
          <span>Ruang kerja / Ringkasan</span>
          <Button
            variant="secondary"
            isDisabled={busy}
            onPress={() => {
              void onLogout();
            }}
          >
            {busy ? "Keluar…" : "Keluar"}
          </Button>
        </header>
        <section className="dashboard-content">
          <div className="overview-intro">
            <p className="eyebrow">RUANG KERJA HRD</p>
            <span className="status-tag">Sesi aktif</span>
          </div>
          <PageTitle>Ringkasan</PageTitle>
          <p className="page-intro">
            Anda masuk sebagai{" "}
            <strong className="account-email">{user.email}</strong>.
          </p>
          {error && <Notice message={error} />}
          <div className="overview-section">
            <div className="section-heading">
              <h2>Karyawan &amp; kehadiran</h2>
              <span>Area administrasi</span>
            </div>
            <div className="empty-state">
              <span className="empty-mark" aria-hidden="true">≡</span>
              <h3>Belum ada data yang ditampilkan</h3>
              <p>
                Data karyawan dan rekap kehadiran akan tampil di area ini
                setelah tersedia.
              </p>
            </div>
          </div>
          <p className="dashboard-note">
            <span>Senin–Jumat</span>
            <span>08.00–17.00 WIB · Jadwal kerja</span>
          </p>
        </section>
      </main>
    </div>
  );
}
