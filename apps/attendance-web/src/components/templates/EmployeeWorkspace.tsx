import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { CalendarCheck, ClockCounterClockwise, UserCircle } from "@phosphor-icons/react";
import { PortalBrand, ThemeToggle } from "@attendance/ui";
import type { EmployeeUser } from "../../lib/auth-client";
import "../../styles/employee-workspace.css";

const destinations = [
  { to: "/", label: "Hari ini", Icon: CalendarCheck, end: true },
  { to: "/riwayat", label: "Riwayat", Icon: ClockCounterClockwise, end: false },
  { to: "/profil", label: "Profil", Icon: UserCircle, end: false },
];

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return <nav aria-label="Navigasi utama" className="employee-nav">
    {destinations.map(({ to, label, Icon, end }) => <NavLink key={to} to={to} end={end} onClick={onNavigate} className={({ isActive }) => `employee-nav-link${isActive ? " is-active" : ""}`}>
      <Icon size={18} aria-hidden="true" /><span>{label}</span>
    </NavLink>)}
  </nav>;
}

export function EmployeeWorkspace({ user, children }: { user: EmployeeUser; children: ReactNode }) {
  const initials = user.email.split("@")[0].split(/[._-]+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "K";
  return <div className="employee-workspace">
    <header className="employee-topbar">
      <Link to="/" className="employee-brand" aria-label="Attendance Portal · Hari ini"><PortalBrand name="Attendance" icon={<CalendarCheck size={16} weight="bold" />} /></Link>
      <Navigation />
      <div className="employee-topbar-actions"><ThemeToggle /><Link to="/profil" className="employee-avatar" aria-label="Profil akun"><span aria-hidden="true">{initials}</span></Link></div>
    </header>
    <main className="employee-main"><div className="employee-main-inner">{children}</div></main>
    <div className="employee-bottom-nav"><Navigation /></div>
  </div>;
}
