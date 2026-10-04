import { useEffect, useState } from "react";
import { Button, Skeleton } from "@heroui/react";
import { ArrowRight, CalendarCheck, CheckCircle, Clock, ClockCounterClockwise, WarningCircle } from "@phosphor-icons/react";
import { Notice, StatusPill } from "@attendance/ui";
import type { AuthClient, EmployeeUser } from "../lib/auth-client";
import { clockLabel, type AttendancePurpose } from "../lib/attendance-client";
import { getHistory, historyDate, historyStatus, type HistoryResult } from "../lib/attendance-history";
import { useToday } from "../features/checkin/use-today";
import { hasPendingCheckIn, pendingAttendancePurpose } from "../features/checkin/use-check-in";
import "../styles/home-page.css";

interface Props {
  client: AuthClient; user: EmployeeUser; busy: boolean; error: string;
  onCapture: (purpose: AttendancePurpose) => void; onSessionExpired: () => void;
  onHistory: () => void;
}

function dateStep(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00+07:00`);
  date.setDate(date.getDate() + amount);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function HomePage({ client, user, busy, error, onCapture, onSessionExpired, onHistory }: Props) {
  const today = useToday(client, onSessionExpired);
  const pending = hasPendingCheckIn(client);
  const checked = today.data?.status === "CHECKED_IN" || today.data?.status === "CHECKED_OUT";
  const completed = today.data?.status === "CHECKED_OUT";
  const nextPurpose = pendingAttendancePurpose(client) ?? (checked ? "CHECK_OUT" : "CHECK_IN");
  const [recent, setRecent] = useState<HistoryResult | null>(null);
  const [recentError, setRecentError] = useState("");
  const [clockNow, setClockNow] = useState(() => Date.now());

  useEffect(() => {
    if (!today.data?.attendanceDate) return;
    const controller = new AbortController();
    const endDate = today.data.attendanceDate;
    const query = new URLSearchParams({ startDate: dateStep(endDate, -6), endDate, page: "1" });
    getHistory(client, query, controller.signal).then(result => {
      if (!controller.signal.aborted) { setRecent(result); setRecentError(""); }
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) {
        if (reason instanceof Error && "status" in reason && reason.status === 401) onSessionExpired();
        setRecentError(reason instanceof Error ? reason.message : "Ringkasan belum dapat dimuat.");
      }
    });
    return () => controller.abort();
  }, [client, today.data?.attendanceDate, onSessionExpired]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const serverClock = today.serverTime
    ? new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .format(new Date(Date.parse(today.serverTime) + Math.max(0, clockNow - today.serverTimeReceivedAt)))
    : "--:--:--";
  const status = today.data?.status;
  const statusLabel = status === "DELETED" ? "Absensi perlu ditinjau HR" : completed ? "Absensi hari ini selesai" : checked ? today.data?.record?.checkIn.isLate ? "Check-in terlambat" : "Sudah check-in" : "Belum check-in";

  return <div className="employee-home-page">
    <header className="employee-page-heading">
      <div><p className="employee-eyebrow">Ruang kerja karyawan</p><h1>Hari ini</h1><p>{today.data?.employeeName ?? user.email}</p></div>
      <div className="employee-server-clock"><span>Waktu server · WIB</span><strong>{serverClock}</strong></div>
    </header>
    {pending && <Notice message="Pengiriman absensi sebelumnya belum dapat dipastikan. Periksa hasilnya sebelum mengirim lagi." />}
    {(today.error || error) && <Notice message={today.error || error} />}
    {today.error && <Button variant="secondary" size="sm" onPress={today.reload}>Muat ulang</Button>}
    <div className="employee-home-grid">
      <section className="employee-today-panel" aria-label="Status absensi hari ini">
        <div className="employee-panel-heading"><div><h2>Status hari ini</h2><p>{today.data ? new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${today.data.attendanceDate}T00:00:00+07:00`)) : "Jadwal dan catatan kehadiran"}</p></div>
          {today.data && <StatusPill tone={today.data.schedule.type === "REGULAR_WORKDAY" ? "active" : "inactive"} label={today.data.schedule.type === "REGULAR_WORKDAY" ? "Hari kerja" : today.data.schedule.type === "HOLIDAY" ? "Hari libur" : "Akhir pekan"} />}
        </div>
        {today.loading ? <div className="employee-today-loading" aria-busy="true"><Skeleton /><Skeleton /><Skeleton /></div> : today.data ? <>
          <div className={`employee-today-status${checked ? " is-recorded" : ""}`}><span>{checked ? <CheckCircle size={18} /> : <CalendarCheck size={18} />}</span><div><strong>{statusLabel}</strong><p>{today.data.schedule.start.slice(0, 5)}–{today.data.schedule.end.slice(0, 5)} WIB · Jam kerja</p></div></div>
          <div className="employee-punches">
            <div><span>Check-in</span><strong>{today.data.record?.checkIn ? clockLabel(today.data.record.checkIn.eventTime) : "—"}</strong></div>
            <div><span>Checkout</span><strong>{today.data.record?.checkOut ? clockLabel(today.data.record.checkOut.eventTime) : "—"}</strong></div>
          </div>
          {!today.data.eligible && <Notice message={today.data.ineligibilityMessage ?? "Akun belum memenuhi syarat absensi."} />}
          {status === "DELETED" && <Notice message="Catatan hari ini telah dihapus HR. Hubungi HR untuk pemeriksaan." />}
          <Button variant="primary" className="employee-primary-action" isDisabled={busy || (!pending && (today.loading || !today.data.eligible || !["NOT_CHECKED_IN", "CHECKED_IN"].includes(today.data.status)))} onPress={() => onCapture(nextPurpose)}>
            {pending ? nextPurpose === "CHECK_OUT" ? "Cek hasil checkout" : "Cek hasil check-in" : completed ? "Absensi selesai" : checked ? "Checkout" : "Check-in"}{(!completed || pending) && <ArrowRight size={16} />}
          </Button>
        </> : <div className="employee-empty-panel"><WarningCircle size={20} /><span>Data hari ini belum tersedia.</span></div>}
      </section>
      <section className="employee-week-panel" aria-label="Ringkasan tujuh hari">
        <div className="employee-panel-heading"><div><h2>Aktivitas 7 hari</h2><p>{recent ? `${recent.data.length} catatan kehadiran` : "Riwayat terbaru"}</p></div><Button variant="ghost" size="sm" onPress={onHistory}>Lihat semua <ArrowRight size={14} /></Button></div>
        {recentError ? <Notice message={recentError} /> : !today.data || (!recent && !recentError) ? <div className="employee-week-loading" aria-busy="true"><Skeleton /><Skeleton /><Skeleton /></div> : recent?.data.length ? <ul className="employee-recent-list">{recent.data.slice(0, 7).map(record => <li key={record.id}>
          <div className="employee-recent-date"><span>{historyDate(record.attendanceDate)}</span><small>{record.department}</small></div><StatusPill tone={record.checkIn.isLate ? "inactive" : "active"} label={historyStatus(record)} />
        </li>)}</ul> : <div className="employee-empty-panel"><ClockCounterClockwise size={20} /><span>Belum ada catatan dalam tujuh hari terakhir.</span></div>}
        <div className="employee-week-footnote"><Clock size={14} /> Pembaruan data mengikuti waktu server.</div>
      </section>
    </div>
  </div>;
}
