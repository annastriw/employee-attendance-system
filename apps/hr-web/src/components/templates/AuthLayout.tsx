import type { ReactNode } from "react";
import { AuthShell, type AuthShowcase } from "@attendance/ui";
import { CalendarCheck, IdentificationCard, MapPinArea } from "@phosphor-icons/react";

// Capabilities listed here are real baseline scope, not marketing claims.
const showcase: AuthShowcase = {
  title: "Kehadiran dan data karyawan dalam satu ruang kerja.",
  items: [
    {
      icon: <CalendarCheck size={18} />,
      title: "Monitoring harian",
      description: "Lihat siapa yang sudah check-in, terlambat, atau belum checkout.",
    },
    {
      icon: <MapPinArea size={18} />,
      title: "Bukti foto dan lokasi",
      description: "Setiap absensi menyimpan foto dan titik lokasi perangkat.",
    },
    {
      icon: <IdentificationCard size={18} />,
      title: "Data karyawan",
      description: "Kelola profil, departemen, jabatan, dan akses akun.",
    },
  ],
};

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthShell name="HR Portal" showcase={showcase}>
      {children}
    </AuthShell>
  );
}
