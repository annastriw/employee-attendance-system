import { Button, Spinner } from "@heroui/react";
import { Clock, CheckCircle, SignOut, ArrowRight } from "@phosphor-icons/react";
import { AuthShell, Notice } from "@attendance/ui";

import type { AuthClient, EmployeeUser } from "../lib/auth-client";
import { clockLabel, type AttendancePurpose } from "../lib/attendance-client";
import { useToday } from "../features/checkin/use-today";
import {
  hasPendingCheckIn,
  pendingAttendancePurpose,
} from "../features/checkin/use-check-in";
import "../styles/home-page.css";
interface Props {
  client: AuthClient;
  user: EmployeeUser;
  busy: boolean;
  error: string;
  onLogout: () => Promise<void>;
  onCapture: (purpose: AttendancePurpose) => void;
  onSessionExpired: () => void;
  onHistory: () => void;
  onProfile: () => void;
}
export function HomePage({
  client,
  user,
  busy,
  error,
  onLogout,
  onCapture,
  onSessionExpired,
  onHistory,
  onProfile,
}: Props) {
  const today = useToday(client, onSessionExpired);
  const d = today.data,
    pending = hasPendingCheckIn(client);
  const checked = d?.status === "CHECKED_IN" || d?.status === "CHECKED_OUT";
  const completed = d?.status === "CHECKED_OUT";
  const nextPurpose =
    pendingAttendancePurpose(client) ?? (checked ? "CHECK_OUT" : "CHECK_IN");
  return (
    <AuthShell
      name="Attendance Portal"
      brandIcon={<Clock size={16} weight="bold" />}
    >
      <h1>Hari ini</h1>
      <p className="page-intro">{d?.employeeName ?? user.email}</p>
      {today.loading ? (
        <p role="status">
          <Spinner size="sm" /> Memuat absensi…
        </p>
      ) : (
        d && (
          <>
            <div className="today-date">
              {new Intl.DateTimeFormat("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Asia/Jakarta",
              }).format(new Date(d.attendanceDate + "T00:00:00+07:00"))}
            </div>
            <section className="today-card" aria-label="Absensi hari ini">
              <div className="today-card-top">
                <span>
                  {d.schedule.type === "REGULAR_WORKDAY"
                    ? "Jam kerja"
                    : d.schedule.type === "HOLIDAY"
                      ? "Hari libur"
                      : "Akhir pekan"}
                </span>
                <span>
                  {d.schedule.start.slice(0, 5)}–{d.schedule.end.slice(0, 5)}{" "}
                  WIB
                </span>
              </div>
              <div className="today-checkin">
                <span>Check-in</span>
                <strong>
                  {d.record?.checkIn
                    ? clockLabel(d.record.checkIn.eventTime)
                    : "—"}
                </strong>
              </div>
              {d.record?.checkIn && (
                <div className="today-checkin">
                  <span>Checkout</span>
                  <strong>
                    {d.record.checkOut
                      ? clockLabel(d.record.checkOut.eventTime)
                      : "—"}
                  </strong>
                </div>
              )}
              <p
                className={checked ? "today-status recorded" : "today-status"}
                role="status"
              >
                {checked && <CheckCircle size={16} aria-hidden="true" />}
                {d.status === "DELETED"
                  ? "Absensi dihapus HRD"
                  : completed
                    ? d.record?.checkOut?.isOutsideSchedule
                      ? "Selesai · Di luar jadwal"
                      : d.record?.checkOut?.isEarlyDeparture
                        ? "Selesai · Pulang lebih awal"
                        : "Absensi selesai"
                    : checked
                      ? d.record?.checkIn.isOutsideSchedule
                        ? "Di luar jadwal"
                        : d.record?.checkIn.isLate
                          ? "Terlambat"
                          : "Tepat waktu"
                      : "Belum check-in"}
              </p>
            </section>
            {d.status === "DELETED" && (
              <p className="page-intro">
                Tanggal ini sudah memiliki catatan. Hubungi HRD untuk
                pemeriksaan.
              </p>
            )}
            {!d.eligible && (
              <Notice
                message={
                  d.ineligibilityMessage ??
                  "Akun belum memenuhi syarat absensi."
                }
              />
            )}
          </>
        )
      )}
      {pending && (
        <Notice message="Pengiriman absensi sebelumnya belum dapat dipastikan. Periksa hasilnya." />
      )}
      {(today.error || error) && <Notice message={today.error || error} />}
      {today.error && (
        <Button variant="outline" fullWidth onPress={today.reload}>
          Muat ulang
        </Button>
      )}
      <Button
        variant="primary"
        className="today-action"
        fullWidth
        isDisabled={
          busy ||
          (!pending &&
            (today.loading ||
              !d?.eligible ||
              !["NOT_CHECKED_IN", "CHECKED_IN"].includes(d.status)))
        }
        onPress={() => onCapture(nextPurpose)}
      >
        {pending
          ? nextPurpose === "CHECK_OUT"
            ? "Cek hasil checkout"
            : "Cek hasil check-in"
          : completed
            ? "Absensi selesai"
            : checked
              ? "Checkout"
              : "Check-in"}
        {(!completed || pending) && <ArrowRight size={16} aria-hidden="true" />}
      </Button>
      <Button
        variant="secondary"
        className="today-action"
        fullWidth
        onPress={onHistory}
      >
        Riwayat absensi
      </Button>
      <Button variant="ghost" className="today-action" onPress={onProfile}>Profil &amp; keamanan akun</Button>
      <Button
        variant="ghost"
        className="primary-button today-action"
        isDisabled={busy}
        onPress={() => {
          void onLogout();
        }}
      >
        <SignOut size={16} aria-hidden="true" />
        {busy ? "Keluar…" : "Keluar"}
      </Button>
    </AuthShell>
  );
}
