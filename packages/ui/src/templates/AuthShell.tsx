import type { ReactNode } from "react";
import { PortalBrand } from "../atoms/PortalBrand";
interface AuthShellProps {
  name: string;
  caption: string;
  title: string;
  description: string;
  children: ReactNode;
}
export function AuthShell({ name, caption, title, description, children }: AuthShellProps) {
  return (
    <div className="auth-layout">
      <aside className="auth-aside">
        <PortalBrand name={name} caption={caption} />
        <div className="aside-copy">
          <p className="eyebrow">KERJA DARI MANA SAJA</p>
          <h2>{title}</h2>
          <p>{description}</p>
          <div className="schedule-panel">
            <span className="schedule-label">JADWAL KERJA</span>
            <strong>08.00<span>—</span>17.00 <small>WIB</small></strong>
            <div className="schedule-days">
              {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map(day => <span key={day}>{day}</span>)}
            </div>
            <p>Waktu Indonesia Barat · UTC+7</p>
          </div>
        </div>
        <p className="aside-footer">Satu ruang kerja. Kehadiran yang tercatat.</p>
      </aside>
      <main className="auth-main">
        <div className="mobile-brand"><PortalBrand name={name} caption={caption} /></div>
        <div className="auth-content">{children}</div>
        <footer className="auth-footer">Gunakan akun Anda sendiri. Jaga kerahasiaan password.</footer>
      </main>
    </div>
  );
}
