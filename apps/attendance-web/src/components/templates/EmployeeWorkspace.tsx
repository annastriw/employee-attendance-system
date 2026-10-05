import type { ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { CalendarCheck, ClockCounterClockwise, UserCircle } from "@phosphor-icons/react";
import { PortalBrand, WorkspaceAccountMenu, WorkspaceShell } from "@attendance/ui";
import type { EmployeeUser, AuthClient } from "../../lib/auth-client";

const destinations = [
  { to: "/", label: "Hari ini", Icon: CalendarCheck, end: true },
  { to: "/riwayat", label: "Riwayat", Icon: ClockCounterClockwise, end: false },
  { to: "/profil", label: "Profil", Icon: UserCircle, end: false },
];

export function EmployeeWorkspace({ user, busy, onLogout, children, client, onSessionExpired }: {
  client: AuthClient; onSessionExpired: () => void; user: EmployeeUser; busy: boolean; onLogout: () => Promise<void>; children: ReactNode;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const title = pathname.startsWith("/riwayat") ? "Riwayat" : pathname === "/profil" ? "Profil" : "Hari ini";
  return <WorkspaceShell title={title} pathname={pathname} storageKey="employee-sidebar-collapsed"
    brand={<Link to="/" aria-label="Attendance Portal · Hari ini"><PortalBrand name="Attendance Portal" icon={<CalendarCheck size={16} weight="bold" />} /></Link>}
    navigation={close => <div className="nav-group"><p className="nav-group-label">Ruang kerja</p><div className="nav-group-links">
      {destinations.map(({ to, label, Icon, end }) => <NavLink key={to} to={to} end={end} onClick={close} className="nav-link" aria-label={label} title={label}>
        <Icon size={18} aria-hidden="true" /><span>{label}</span>
      </NavLink>)}
    </div></div>}
    account={<WorkspaceAccountMenu client={client} onSessionExpired={onSessionExpired} email={user.email} roleLabel="Karyawan" busy={busy} onLogout={onLogout} onProfile={() => navigate("/profil")} />}>
    {children}
  </WorkspaceShell>;
}
