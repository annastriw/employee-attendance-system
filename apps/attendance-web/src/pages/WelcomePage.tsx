import { AuthShell } from "@attendance/ui";
const steps = [
  { title: "Gunakan akun karyawan", description: "Email dan password diberikan oleh administrator HRD." },
  { title: "Aktifkan kamera dan lokasi", description: "Keduanya diperlukan saat mengirim check-in dan checkout." },
  { title: "Ikuti jadwal kerja", description: "Senin–Jumat, 08.00–17.00 WIB. Check-in lebih awal maupun terlambat tetap dapat dicatat." },
];
export function WelcomePage() {
  return (
    <AuthShell name="Attendance Portal" caption="Kehadiran karyawan"
      title="Mulai hari. Catat kehadiran."
      description="Check-in saat mulai bekerja dan checkout setelah selesai. Foto dan lokasi menyertai setiap catatan kehadiran.">
      <p className="eyebrow">PORTAL KARYAWAN</p>
      <h1>Kehadiran, lebih sederhana.</h1>
      <p className="page-intro">Siapkan akun, kamera, dan lokasi untuk mencatat kehadiran kerja Anda.</p>
      <span className="status-tag">Portal sedang disiapkan</span>
      <ol className="guide-list">
        {steps.map((step, index) => (
          <li key={step.title}>
            <span className="step-number" aria-hidden="true">0{index + 1}</span>
            <div><h2>{step.title}</h2><p>{step.description}</p></div>
          </li>
        ))}
      </ol>
      <p className="login-help">Login dan pencatatan absensi belum tersedia. Hubungi HRD jika membutuhkan informasi akun.</p>
    </AuthShell>
  );
}
