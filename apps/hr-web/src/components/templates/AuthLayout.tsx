import type { ReactNode } from "react";
import { AuthShell } from "@attendance/ui";
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthShell name="HR Portal" caption="Administrasi karyawan"
      title="Tim terhubung. Administrasi teratur."
      description="Ruang kerja HRD untuk mengelola data karyawan dan memantau kehadiran dalam satu tempat.">
      {children}
    </AuthShell>
  );
}
