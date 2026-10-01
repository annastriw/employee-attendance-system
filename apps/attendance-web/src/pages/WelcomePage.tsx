import { AuthShell } from "@attendance/ui";
import { Clock, Hourglass } from "@phosphor-icons/react";

export function WelcomePage() {
  return (
    <AuthShell name="Attendance Portal" brandIcon={<Clock size={16} weight="bold" />}>
      <h1>Absensi</h1>
      <p className="page-intro">Check-in dan checkout harian dengan foto dan lokasi.</p>
      <div className="status-card" role="status">
        <span className="showcase-icon" aria-hidden="true"><Hourglass size={18} /></span>
        <div>
          <strong>Segera tersedia</strong>
          <p className="unavailable-message">Login karyawan belum tersedia.</p>
        </div>
      </div>
    </AuthShell>
  );
}
