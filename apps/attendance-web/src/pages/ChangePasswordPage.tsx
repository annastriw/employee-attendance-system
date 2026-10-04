import { Clock } from "@phosphor-icons/react";
import { AuthShell, ChangePasswordForm } from "@attendance/ui";
import type { EmployeeUser } from "../lib/auth-client";

interface Props {
  user: EmployeeUser;
  busy: boolean;
  error: string;
  onSubmit: (current: string, replacement: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

export function ChangePasswordPage({ user, busy, error, onSubmit, onLogout }: Props) {
  return (
    <AuthShell name="Attendance Portal" brandIcon={<Clock size={16} weight="bold" />}>
      <h1>Buat password baru</h1>
      <p className="page-intro">Ganti password awal untuk melanjutkan. Setelah tersimpan, masuk kembali.</p>
      <p className="signed-in-email">{user.email}</p>
      <ChangePasswordForm busy={busy} error={error} onSubmit={onSubmit} onLogout={onLogout} />
    </AuthShell>
  );
}
