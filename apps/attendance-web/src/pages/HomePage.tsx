import { Button, Spinner } from "@heroui/react";
import { Clock, CheckCircle, SignOut, ArrowRight } from "@phosphor-icons/react";
import { AuthShell } from "@attendance/ui";
import { Notice } from "../components/molecules/Notice";
import type { AuthClient, EmployeeUser } from "../lib/auth-client";
import { clockLabel } from "../lib/attendance-client";
import { useToday } from "../features/checkin/use-today";
import { hasPendingCheckIn } from "../features/checkin/use-check-in";
import "./home-page.css";
interface Props {
  client: AuthClient;
  user: EmployeeUser;
  busy: boolean;
  error: string;
  onLogout: () => Promise<void>;
  onCapture: () => void;
  onSessionExpired: () => void;
}
export function HomePage({
  client,
  user,
  busy,
  error,
  onLogout,
  onCapture,
  onSessionExpired,
}: Props) {
  const today = useToday(client, onSessionExpired);
  const d = today.data,
    pending = hasPendingCheckIn(client);
  const checked = d?.status === "CHECKED_IN";
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
              <p
                className={checked ? "today-status recorded" : "today-status"}
                role="status"
              >
                {checked && <CheckCircle size={16} aria-hidden="true" />}
                {d.status === "DELETED"
                  ? "Absensi dihapus HRD"
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
        <Notice message="Check-in sebelumnya belum dapat dipastikan. Periksa hasilnya." />
      )}
      {(today.error || error) && <Notice message={today.error || error} />}
      {today.error && (
        <Button variant="outline" fullWidth onPress={today.reload}>
          Muat ulang
        </Button>
      )}
      <Button
        variant="primary"
        fullWidth
        isDisabled={
          busy ||
          (!pending &&
            (today.loading || !d?.eligible || d.status !== "NOT_CHECKED_IN"))
        }
        onPress={onCapture}
      >
        {pending
          ? "Cek hasil check-in"
          : checked
            ? "Check-in tercatat"
            : "Check-in"}
        {(!checked || pending) && <ArrowRight size={16} aria-hidden="true" />}
      </Button>
      <Button
        variant="ghost"
        className="primary-button"
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
