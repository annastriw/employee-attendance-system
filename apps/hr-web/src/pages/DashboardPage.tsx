import { useRef, useState } from "react";
import { Button } from "@heroui/react";
import { ChartBar, List, SquaresFour } from "@phosphor-icons/react";
import { Brand, PageTitle } from "../components/atoms/Brand";
import { Notice } from "../components/molecules/Notice";
import { AccountMenu } from "../components/molecules/AccountMenu";
import type { AdminUser } from "../lib/auth-client";

// Only destinations that exist in this increment are listed (spec: no dead links).
function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <a href="#ringkasan" aria-current="page" className="nav-link" onClick={onNavigate}>
      <SquaresFour size={18} aria-hidden="true" />
      Ringkasan
    </a>
  );
}

export function DashboardPage({ user, busy, error, onLogout }: {
  user: AdminUser;
  busy: boolean;
  error: string;
  onLogout: () => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <Brand />
        <nav aria-label="Navigasi utama" className="nav-list"><NavLinks /></nav>
      </aside>
      <main id="ringkasan" className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-title">
            <Button ref={menuToggle} variant="ghost" isIconOnly className="mobile-menu-toggle" aria-label="Menu navigasi"
              aria-expanded={menuOpen} aria-controls="mobile-navigation" onPress={() => setMenuOpen(!menuOpen)}>
              <List size={20} aria-hidden="true" />
            </Button>
            <PageTitle>Ringkasan</PageTitle>
          </div>
          <AccountMenu email={user.email} busy={busy} onLogout={onLogout} />
        </header>
        <nav id="mobile-navigation" className="mobile-navigation nav-list" aria-label="Navigasi mobile" hidden={!menuOpen}
          onKeyDown={event => { if (event.key === "Escape") { setMenuOpen(false); menuToggle.current?.focus(); } }}>
          <NavLinks onNavigate={() => setMenuOpen(false)} />
        </nav>
        <section className="dashboard-content" aria-label="Data ringkasan">
          {error && <Notice message={error} />}
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true"><ChartBar size={22} /></span>
            <p className="empty-title">Belum ada data yang ditampilkan</p>
            <p className="empty-body">Ringkasan kehadiran muncul setelah karyawan mulai melakukan absensi.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
