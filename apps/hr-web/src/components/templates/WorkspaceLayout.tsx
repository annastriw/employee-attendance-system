import { useRef, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Button } from "@heroui/react";
import {
  Briefcase,
  Buildings,
  CalendarBlank,
  Clock,
  Trash,
  List,
  SquaresFour,
  Users,
} from "@phosphor-icons/react";
import { Brand, PageTitle } from "../atoms/Brand";
import { AccountMenu } from "../molecules/AccountMenu";
import { Notice } from "../molecules/Notice";
import { ThemeToggle } from "@attendance/ui";
import { useAuth } from "../../routes/auth-context";
import { viewPath, type View } from "../../routes/routes";

// Only destinations that exist in this increment are listed (spec: no dead links).
const NAV: { view: View; label: string; icon: ReactNode }[] = [
  {
    view: "ringkasan",
    label: "Ringkasan",
    icon: <SquaresFour size={18} aria-hidden="true" />,
  },
  {
    view: "karyawan",
    label: "Karyawan",
    icon: <Users size={18} aria-hidden="true" />,
  },
  {
    view: "absensi",
    label: "Absensi",
    icon: <Clock size={18} aria-hidden="true" />,
  },
  {
    view: "absensi-dihapus",
    label: "Absensi dihapus",
    icon: <Trash size={18} aria-hidden="true" />,
  },
  {
    view: "departemen",
    label: "Departemen",
    icon: <Buildings size={18} aria-hidden="true" />,
  },
  {
    view: "jabatan",
    label: "Jabatan",
    icon: <Briefcase size={18} aria-hidden="true" />,
  },
  {
    view: "hari-libur",
    label: "Hari Libur",
    icon: <CalendarBlank size={18} aria-hidden="true" />,
  },
];

// Page title per destination; shown in the header and used for the content label.
const TITLES: Record<View, string> = {
  ringkasan: "Ringkasan",
  departemen: "Departemen",
  jabatan: "Jabatan",
  karyawan: "Karyawan",
  "hari-libur": "Hari Libur",
  absensi: "Absensi",
  "absensi-dihapus": "Absensi dihapus",
};

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return NAV.map((item) => (
    <NavLink
      key={item.view}
      to={viewPath(item.view)}
      className="nav-link"
      onClick={onNavigate}
    >
      {item.icon}
      {item.label}
    </NavLink>
  ));
}

/**
 * Persistent workspace shell. Rendered once for every authenticated page via
 * the router Outlet; the sidebar, header and theme/account controls stay
 * mounted while only the content changes. The active destination and title
 * derive from the current path, so deep links and browser back/forward keep
 * the navigation state correct.
 */
export function WorkspaceLayout() {
  const { user, busy, error, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);

  const active =
    NAV.find((item) => location.pathname.startsWith(viewPath(item.view)))
      ?.view ?? "ringkasan";
  const title = TITLES[active];

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <Brand />
        <nav aria-label="Navigasi utama" className="nav-list">
          <NavLinks />
        </nav>
      </aside>
      <main id="konten" className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-title">
            <Button
              ref={menuToggle}
              variant="ghost"
              isIconOnly
              className="mobile-menu-toggle"
              aria-label="Menu navigasi"
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onPress={() => setMenuOpen(!menuOpen)}
            >
              <List size={20} aria-hidden="true" />
            </Button>
            <PageTitle key={active}>{title}</PageTitle>
          </div>
          <div className="header-actions">
            <ThemeToggle />
            <AccountMenu
              email={user?.email ?? ""}
              busy={busy}
              onLogout={logout}
            />
          </div>
        </header>
        <nav
          id="mobile-navigation"
          className="mobile-navigation nav-list"
          aria-label="Navigasi mobile"
          hidden={!menuOpen}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setMenuOpen(false);
              menuToggle.current?.focus();
            }
          }}
        >
          <NavLinks onNavigate={() => setMenuOpen(false)} />
        </nav>
        <section className="dashboard-content" aria-label={title}>
          {error && <Notice message={error} />}
          <Outlet />
        </section>
      </main>
    </div>
  );
}
