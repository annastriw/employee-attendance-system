import { useRef, useState } from "react";
import { Button } from "@heroui/react";
import { Brand, PageTitle } from "../components/atoms/Brand";
import { Notice } from "../components/molecules/Notice";
import { AccountMenu } from "../components/molecules/AccountMenu";
import type { AdminUser } from "../lib/auth-client";
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
        <nav aria-label="Navigasi utama"><a href="#ringkasan" aria-current="page">Ringkasan</a></nav>
      </aside>
      <main id="ringkasan" className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-title">
            <Button ref={menuToggle} variant="ghost" className="mobile-menu-toggle" aria-label="Menu navigasi"
              aria-expanded={menuOpen} aria-controls="mobile-navigation" onPress={() => setMenuOpen(!menuOpen)}>Menu</Button>
            <PageTitle>Ringkasan</PageTitle>
          </div>
          <AccountMenu email={user.email} busy={busy} onLogout={onLogout} />
        </header>
        <nav id="mobile-navigation" className="mobile-navigation" aria-label="Navigasi mobile" hidden={!menuOpen}
          onKeyDown={event => { if (event.key === "Escape") { setMenuOpen(false); menuToggle.current?.focus(); } }}>
          <a href="#ringkasan" aria-current="page" onClick={() => setMenuOpen(false)}>Ringkasan</a>
        </nav>
        <section className="dashboard-content" aria-label="Data ringkasan">
          {error && <Notice message={error} />}
          <div className="empty-state"><p>Belum ada data yang ditampilkan</p></div>
        </section>
      </main>
    </div>
  );
}
