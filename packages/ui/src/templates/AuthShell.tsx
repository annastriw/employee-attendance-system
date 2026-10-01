import type { ReactNode } from "react";
import { PortalBrand } from "../atoms/PortalBrand";
export function AuthShell({ name, children }: { name: string; children: ReactNode }) {
  return (
    <main className="auth-main">
      <div className="auth-content">
        <PortalBrand name={name} />
        {children}
      </div>
    </main>
  );
}
