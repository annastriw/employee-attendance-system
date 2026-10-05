import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@heroui/react";
import {
  Briefcase,
  Buildings,
  CalendarBlank,
  Clock,
  Trash,
  MagnifyingGlass,
  Monitor,
  MoonStars,
  SquaresFour,
  Sun,
  Users,
} from "@phosphor-icons/react";
import { Brand } from "../atoms/Brand";
import { AccountMenu } from "../molecules/AccountMenu";
import { Notice, WorkspaceShell, setThemePreference } from "@attendance/ui";

import { useAuth } from "../../routes/auth-context";
import { viewPath, type View } from "../../routes/routes";
import { CommandPalette, type Command } from "../organisms/CommandPalette";
import { isWorkspacePath } from "../../lib/workspace-preferences";

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

const NAV_GROUPS: { label: string; views: View[] }[] = [
  { label: "Utama", views: ["ringkasan"] },
  { label: "Kehadiran", views: ["absensi", "absensi-dihapus"] },
  { label: "Tim", views: ["karyawan"] },
  { label: "Master data", views: ["departemen", "jabatan", "hari-libur"] },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return NAV_GROUPS.map(group => <div className="nav-group" key={group.label}>
    <p className="nav-group-label">{group.label}</p>
    <div className="nav-group-links">{group.views.map(view => {
      const item = NAV.find(candidate => candidate.view === view)!;
      return <NavLink key={item.view} to={viewPath(item.view)} className="nav-link"
        aria-label={item.label} title={item.label} onClick={onNavigate}>
        {item.icon}<span>{item.label}</span>
      </NavLink>;
    })}</div>
  </div>);
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
 * navigation actions. Account actions live in the account menu.
 */
export function WorkspaceLayout() {
  const { user, busy, error, logout, client, sessionExpired } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteTrigger = useRef<HTMLButtonElement>(null);

  const active = NAV.find((item) => isWorkspacePath(location.pathname, viewPath(item.view)))?.view;
  const title = location.pathname === "/profil" ? "Profil" : TITLES[active ?? "ringkasan"];

  // Global Cmd/Ctrl-K toggles the palette from anywhere in the shell.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
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
    return [...navigation, ...theme];
  }, [navigate]);

  return <>
    <WorkspaceShell title={title} pathname={location.pathname} storageKey="hr-sidebar-collapsed"
      brand={<Link to="/ringkasan" aria-label="HR Portal · Ringkasan"><Brand /></Link>}
      navigation={close => <NavLinks onNavigate={close} />}
      account={<AccountMenu client={client} onSessionExpired={sessionExpired} email={user?.email ?? ""} busy={busy} onLogout={logout} onProfile={() => navigate("/profil")} />}
      actions={<Button ref={paletteTrigger} variant="secondary" className="cmdk-trigger" onPress={() => setPaletteOpen(true)} aria-haspopup="dialog">
        <MagnifyingGlass size={16} aria-hidden="true" /><span className="cmdk-trigger-label">Cari…</span><kbd className="cmdk-trigger-kbd">{shortcutHint}</kbd>
      </Button>}>
      {error && <Notice message={error} />}<Outlet />
    </WorkspaceShell>
      <CommandPalette
        open={paletteOpen}
        commands={commands}
        onClose={() => {
          setPaletteOpen(false);
          paletteTrigger.current?.focus();
        }}
      />
  </>;
}
