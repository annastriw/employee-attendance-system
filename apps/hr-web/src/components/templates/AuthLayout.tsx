import type { ReactNode } from "react";
import { Brand } from "../atoms/Brand";
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-layout">
      <aside className="auth-aside">
        <Brand />
        <div className="aside-copy">
          <p className="eyebrow">RUANG KERJA HRD</p>
          <h2>
            Administrasi rapi.
            <br />
            Tim tetap terhubung.
          </h2>
          <p>
            Satu tempat untuk mengelola data karyawan dan memantau kehadiran
            kerja.
          </p>
          <div className="work-schedule">
            <span>Jadwal kerja</span>
            <strong>Senin–Jumat</strong>
            <span>08.00–17.00 WIB</span>
          </div>
        </div>
        <p className="aside-footer">HR Portal · Akses administrator</p>
      </aside>
      <main className="auth-main">
        <div className="mobile-brand">
          <Brand />
        </div>
        <div className="auth-content">{children}</div>
        <footer className="auth-footer">
          Gunakan akun Anda sendiri. Jaga kerahasiaan password.
        </footer>
      </main>
    </div>
  );
}
