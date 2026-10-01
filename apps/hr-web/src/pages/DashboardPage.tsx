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
          <a href="#ringkasan" aria-current="page">
            Ringkasan<span aria-hidden="true">↗</span>
          </a>
        </nav>
        <p className="sidebar-footnote">Portal administrator HRD</p>
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
          <p className="eyebrow">SELAMAT DATANG</p>
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
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="10"
                  y="7"
                  width="28"
                  height="34"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M17 17h14M17 24h14M17 31h8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <h3>Belum ada data yang ditampilkan</h3>
              <p>
                Data karyawan dan rekap kehadiran akan tampil di area ini
                setelah tersedia.
              </p>
            </div>
          </div>
          <p className="dashboard-note">
            Jadwal kerja: Senin–Jumat, 08.00–17.00 WIB.
          </p>
        </section>
      </main>
    </div>
  );
}
