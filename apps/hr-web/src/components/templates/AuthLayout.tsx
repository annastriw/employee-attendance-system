import type { ReactNode } from "react";
import { AuthShell } from "@attendance/ui";
export function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell name="HR Portal">{children}</AuthShell>;
}
