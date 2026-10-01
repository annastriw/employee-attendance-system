import type { ReactNode } from "react";
import { PortalBrand } from "../atoms/PortalBrand";

interface AuthShellProps {
  name: string;
  children: ReactNode;
  /**
   * Optional role sentence. When provided, the shell renders the split-screen
   * layout: a charcoal aside (portal name + this sentence) beside a form card.
   * Omit it to keep the single-column centered layout (Attendance Portal).
   */
  aside?: string;
}

export function AuthShell({ name, children, aside }: AuthShellProps) {
  if (aside) {
    return (
      <main className="auth-main auth-split">
        <aside className="auth-aside">
          <PortalBrand name={name} />
          <p className="auth-aside-lead">{aside}</p>
        </aside>
        <div className="auth-panel">
          <div className="auth-card">
            <div className="auth-content auth-content-card">
              {children}
            </div>
          </div>
        </div>
      </main>
    );
  }
  return (
    <main className="auth-main">
      <div className="auth-content">
        <PortalBrand name={name} />
        {children}
      </div>
    </main>
  );
}
