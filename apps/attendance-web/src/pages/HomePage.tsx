import { Button } from "@heroui/react";
import { Clock, Hourglass } from "@phosphor-icons/react";
import { AuthShell } from "@attendance/ui";
import { Notice } from "../components/molecules/Notice";
import type { EmployeeUser } from "../lib/auth-client";

interface Props {
  user: EmployeeUser;
  busy: boolean;
  error: string;
  onLogout: () => Promise<void>;
}

export function HomePage({ user, busy, error, onLogout }: Props) {
  return (
    <AuthShell name="Attendance Portal" brandIcon={<Clock size={16} weight="bold" />}>
      <h1>Beranda</h1>
      <p className="page-intro">Anda masuk sebagai karyawan.</p>
      <p className="signed-in-email">{user.email}</p>
      <div className="status-card" role="status">
        <span className="showcase-icon" aria-hidden="true"><Hourglass size={18} /></span>
        <div>
          <strong>Absensi segera tersedia</strong>
          <p className="unavailable-message">
            Fitur check-in dan checkout sedang disiapkan.
          </p>
        </div>
      </div>
      {error && <Notice message={error} />}
      <Button
        type="button"
        variant="ghost"
        className="primary-button"
        isDisabled={busy}
        onPress={() => { void onLogout(); }}
      >
        {busy ? "Keluar…" : "Keluar"}
      </Button>
    </AuthShell>
  );
}