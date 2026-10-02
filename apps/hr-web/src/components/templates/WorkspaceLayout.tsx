import { useRef, useState, type ReactNode } from "react";
import { Button } from "@heroui/react";
import { Briefcase, Buildings, CalendarBlank, List, SquaresFour, Users } from "@phosphor-icons/react";
import { Brand, PageTitle } from "../atoms/Brand";
import { AccountMenu } from "../molecules/AccountMenu";
import type { View } from "../../lib/use-hash-route";

// Only destinations that exist in this increment are listed (spec: no dead links).
const NAV: { view: View; label: string; icon: ReactNode }[] = [
  { view: "ringkasan", label: "Ringkasan", icon: <SquaresFour size={18} aria-hidden="true" /> },
  { view: "karyawan", label: "Karyawan", icon: <Users size={18} aria-hidden="true" /> },
  { view: "departemen", label: "Departemen", icon: <Buildings size={18} aria-hidden="true" /> },
  { view: "jabatan", label: "Jabatan", icon: <Briefcase size={18} aria-hidden="true" /> },
  { view: "hari-libur", label: "Hari Libur", icon: <CalendarBlank size={18} aria-hidden="true" /> },
];

function NavLinks({ active, onNavigate }: { active: View; onNavigate?: () => void }) {
  return NAV.map((item) => (
    <a key={item.view} href={`#${item.view}`} className="nav-link" onClick={onNavigate}
      aria-current={item.view === active ? "page" : undefined}>
      {item.icon}
      {item.label}
    </a>
  ));
}

export function WorkspaceLayout({ view, title, email, busy, onLogout, children }: {
  view: View;
  title: string;
  email: string;
  busy: boolean;
  onLogout: () => Promise<void>;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <Brand />
        <nav aria-label="Navigasi utama" className="nav-list"><NavLinks active={view} /></nav>
      </aside>
      <main id="konten" className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-title">
            <Button ref={menuToggle} variant="ghost" isIconOnly className="mobile-menu-toggle" aria-label="Menu navigasi"
              aria-expanded={menuOpen} aria-controls="mobile-navigation" onPress={() => setMenuOpen(!menuOpen)}>
              <List size={20} aria-hidden="true" />
            </Button>
            <PageTitle key={view}>{title}</PageTitle>
          </div>
          <AccountMenu email={email} busy={busy} onLogout={onLogout} />
        </header>
        <nav id="mobile-navigation" className="mobile-navigation nav-list" aria-label="Navigasi mobile" hidden={!menuOpen}
          onKeyDown={event => { if (event.key === "Escape") { setMenuOpen(false); menuToggle.current?.focus(); } }}>
          <NavLinks active={view} onNavigate={() => setMenuOpen(false)} />
        </nav>
        <section className="dashboard-content" aria-label={title}>{children}</section>
      </main>
    </div>
  );
}
