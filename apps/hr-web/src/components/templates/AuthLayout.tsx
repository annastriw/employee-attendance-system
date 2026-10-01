import type { ReactNode } from "react";
import { AuthShell } from "@attendance/ui";
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthShell
      name="HR Portal"
      aside="Kelola kehadiran dan data karyawan dalam satu ruang kerja."
    >
      {children}
    </AuthShell>
  );
}
