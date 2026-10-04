import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@heroui/react";
import {
  Briefcase,
  Buildings,
  CalendarBlank,
  Clock,
  Trash,
  List,
  MagnifyingGlass,
  Monitor,
  MoonStars,
  SignOut,
  SquaresFour,
  Sun,
  Users,
} from "@phosphor-icons/react";
import { Brand, PageTitle } from "../atoms/Brand";
import { AccountMenu } from "../molecules/AccountMenu";
import { Notice, ThemeToggle, setThemePreference } from "@attendance/ui";

import { useAuth } from "../../routes/auth-context";
import { viewPath, type View } from "../../routes/routes";
import { CommandPalette, type Command } from "../organisms/CommandPalette";

// Only destinations that exist in this increment are listed (spec: no dead links).
const NAV: { view: View; label: string; icon: ReactNode; keywords?: string }[] = [
  {
    view: "ringkasan",
    label: "Ringkasan",
    icon: <SquaresFour size={18} aria-hidden="true" />,
    keywords: "dashboard monitoring beranda",
  },
  {
    view: "karyawan",
    label: "Karyawan",
    icon: <Users size={18} aria-hidden="true" />,
    keywords: "employee pegawai staf",
  },
  {
    view: "absensi",
    label: "Absensi",
    icon: <Clock size={18} aria-hidden="true" />,
    keywords: "attendance kehadiran presensi",
  },
  {
    view: "absensi-dihapus",
    label: "Absensi dihapus",
    icon: <Trash size={18} aria-hidden="true" />,
    keywords: "deleted terhapus restore",
  },
  {
    view: "departemen",
    label: "Departemen",
    icon: <Buildings size={18} aria-hidden="true" />,
    keywords: "department divisi",
  },
  {
    view: "jabatan",
    label: "Jabatan",
    icon: <Briefcase size={18} aria-hidden="true" />,
    keywords: "position role",
  },
  {
    view: "hari-libur",
    label: "Hari Libur",
    icon: <CalendarBlank size={18} aria-hidden="true" />,
    keywords: "holiday kalender libur",
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

const isMac =
  typeof navigator !== "undefined" && /mac/i.test(navigator.userAgent);
const shortcutHint = isMac ? "⌘K" : "Ctrl K";

/**
 * Persistent workspace shell. Rendered once for every authenticated page via
 * the router Outlet; the sidebar, header and theme/account controls stay
 * mounted while only the content changes. The active destination and title
 * derive from the current path, so deep links and browser back/forward keep
 * the navigation state correct. A command palette (Cmd/Ctrl-K) offers fast
 * navigation plus theme and logout actions.
 */
export function WorkspaceLayout() {
  const { user, busy, error, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const paletteTrigger = useRef<HTMLButtonElement>(null);

  const active =
    NAV.find((item) => location.pathname.startsWith(viewPath(item.view)))
      ?.view ?? "ringkasan";
  const title = TITLES[active];

  // Global Cmd/Ctrl-K toggles the palette from anywhere in the shell.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commands = useMemo<Command[]>(() => {
    const navigation: Command[] = NAV.map((item) => ({
      id: `nav-${item.view}`,
      label: item.label,
      group: "Navigasi",
      keywords: item.keywords,
      icon: item.icon,
      run: () => navigate(viewPath(item.view)),
    }));
    const theme: Command[] = [
      {
        id: "theme-light",
        label: "Tema terang",
        group: "Tema",
        keywords: "light terang",
        icon: <Sun size={18} aria-hidden="true" />,
        run: () => setThemePreference("light"),
      },
      {
        id: "theme-dark",
        label: "Tema gelap",
        group: "Tema",
        keywords: "dark gelap",
        icon: <MoonStars size={18} aria-hidden="true" />,
        run: () => setThemePreference("dark"),
      },
      {
        id: "theme-system",
        label: "Tema sistem",
        group: "Tema",
        keywords: "system sistem auto otomatis",
        icon: <Monitor size={18} aria-hidden="true" />,
        run: () => setThemePreference("system"),
      },
    ];
    const account: Command[] = [
      {
        id: "logout",
        label: "Keluar",
        group: "Akun",
        keywords: "logout sign out keluar",
        icon: <SignOut size={18} aria-hidden="true" />,
        run: () => void logout(),
      },
    ];
    return [...navigation, ...theme, ...account];
  }, [navigate, logout]);

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
            <button
              ref={paletteTrigger}
              type="button"
              className="cmdk-trigger"
              onClick={() => setPaletteOpen(true)}
              aria-haspopup="dialog"
            >
              <MagnifyingGlass size={16} aria-hidden="true" />
              <span className="cmdk-trigger-label">Cari…</span>
              <kbd className="cmdk-trigger-kbd">{shortcutHint}</kbd>
            </button>
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
      <CommandPalette
        open={paletteOpen}
        commands={commands}
        onClose={() => {
          setPaletteOpen(false);
          paletteTrigger.current?.focus();
        }}
      />
    </div>
  );
}
