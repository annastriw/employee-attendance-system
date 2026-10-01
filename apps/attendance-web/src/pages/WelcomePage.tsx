import { AuthShell } from "@attendance/ui";
export function WelcomePage() {
  return (
    <AuthShell name="Attendance Portal">
      <h1>Absensi</h1>
      <p className="unavailable-message">Login karyawan belum tersedia.</p>
    </AuthShell>
  );
}
