import type { ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Briefcase,
  Buildings,
  CalendarBlank,
  Clock,
  Trash,
  SquaresFour,
  Users,
} from "@phosphor-icons/react";
import { Brand } from "../atoms/Brand";
import { AccountMenu } from "../molecules/AccountMenu";
import { Notice, WorkspaceShell } from "@attendance/ui";

import { useAuth } from "../../routes/auth-context";
import { viewPath, type View } from "../../routes/routes";
import { isWorkspacePath } from "../../lib/workspace-preferences";

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

/** Shared shell; navigation and titles follow the active route. */
export function WorkspaceLayout() {
  const { user, busy, error, logout, client, sessionExpired } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const active = NAV.find((item) => isWorkspacePath(location.pathname, viewPath(item.view)))?.view;
  const title = location.pathname === "/profil" ? "Profil" : TITLES[active ?? "ringkasan"];

  return <WorkspaceShell title={title} pathname={location.pathname} storageKey="hr-sidebar-collapsed"
      brand={<Link to="/ringkasan" aria-label="HR Portal · Ringkasan"><Brand /></Link>}
      navigation={close => <NavLinks onNavigate={close} />}
      account={<AccountMenu placement="top start" client={client} onSessionExpired={sessionExpired} email={user?.email ?? ""} busy={busy} onLogout={logout} onProfile={() => navigate("/profil")} />}
      >
      {error && <Notice message={error} />}<Outlet />
    </WorkspaceShell>;
}
