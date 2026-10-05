import { useEffect, useRef, useState } from "react";
import { Button, Label, TextArea } from "@heroui/react";
import { Trash, ArrowCounterClockwise } from "@phosphor-icons/react";
import { Notice, ConfirmDialog, PageHeader, StatusPill, UnderlineTabs } from "@attendance/ui";

import { AttendanceEvidence } from "../components/organisms/AttendanceEvidence";
import { AuthError, type AuthClient } from "../lib/auth-client";
import {
  attendanceDate,
  attendanceTime,
  attendanceStatus,
  type AttendanceRecord,
} from "../lib/attendance";
type Client = Pick<AuthClient, "api">;
export function AttendanceDetailPage({
  client,
  id,
  onBack,
  handle,
  onSessionExpired = () => {},
  deleted = false,
}: {
  client: Client;
  id: string;
  onBack: () => void;
  handle: (e: unknown) => string;
  onSessionExpired?: () => void;
  deleted?: boolean;
}) {
  const [data, setData] = useState<AttendanceRecord | null>(null);
  const [reload, setReload] = useState(0);
  const [loaded, setLoaded] = useState(-1);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<AttendanceRecord | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mustRefresh, setMustRefresh] = useState(false);
  const [activeTab, setActiveTab] = useState("evidence");
  const submitting = useRef(false);
  const loading = loaded !== reload;
  useEffect(() => {
    let active = true;
    client
      .api<{ data: AttendanceRecord }>("attendance/" + id)
      .then((result) => {
        if (active) {
          setData(result.data);
          setLoadError("");
          setMustRefresh(false);
          setActionError("");
        }
      })
      .catch((e: unknown) => {
        if (active) setLoadError(handle(e));
      })
      .finally(() => {
        if (active) setLoaded(reload);
      });
    return () => {
      active = false;
    };
  }, [client, id, reload, handle]);
  function refresh() {
    setConfirm(null);
    setReload((r) => r + 1);
  }
  async function change() {
    if (!confirm || submitting.current || mustRefresh) return;
    const restoring = !!confirm.deletedAt;
    if (!restoring && !reason.trim()) {
      setReasonError("Masukkan alasan penghapusan.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      await client.api("attendance/" + id + (restoring ? "/restore" : ""), {
        method: restoring ? "POST" : "DELETE",
        body: {
          version: confirm.version,
          ...(!restoring ? { reason: reason.trim() } : {}),
        },
      });
      setConfirm(null);
      setNotice(
        restoring
          ? "Absensi dipulihkan."
          : "Absensi dipindahkan ke daftar terhapus.",
      );
      setReload((r) => r + 1);
    } catch (e) {
      const message = handle(e);
      const uncertain =
        !(e instanceof AuthError) || e.status === 0 || e.status >= 500;
      setActionError(
        uncertain
          ? "Hasil belum dapat dipastikan. Muat data terbaru sebelum melanjutkan."
          : message,
      );
      // No automatic mutation retry. A new confirmation requires a successful read.
      setMustRefresh(true);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="attendance-detail">
      <PageHeader
        breadcrumb={[{ label: deleted ? "Absensi dihapus" : "Absensi", href: deleted ? "/absensi-dihapus" : "/absensi" },
          { label: data ? attendanceDate(data.attendanceDate) : "Tanggal" },
          { label: data?.employee.name ?? "Detail" }]}
        onNavigate={() => onBack()}
        title={data?.employee.name ?? "Detail absensi"}
        description={data ? `${attendanceDate(data.attendanceDate)} · ${data.department} · ${data.position}` : undefined}
        actions={data && <>
          <StatusPill tone={data.deletedAt ? "archived" : data.checkOut ? "active" : "inactive"} label={attendanceStatus(data)} />
          <Button variant="secondary" isDisabled={busy || mustRefresh} onPress={() => {
            setConfirm(data); setReason(""); setReasonError(""); setActionError("");
          }}>
            {data.deletedAt ? <ArrowCounterClockwise size={16} aria-hidden="true" /> : <Trash size={16} aria-hidden="true" />}
            {data.deletedAt ? "Pulihkan absensi" : "Hapus absensi"}
          </Button>
        </>}
      />
      {notice && <Notice message={notice} success />}
      {actionError && !confirm && <Notice message={actionError} />}
      {mustRefresh && !confirm && (
        <Button variant="secondary" onPress={refresh} isDisabled={busy}>
          Muat data terbaru
        </Button>
      )}
      {loading ? (
        <p role="status">Memuat absensi…</p>
      ) : loadError ? (
        <div className="load-error">
          <Notice message={loadError} />
          <Button variant="secondary" onPress={refresh}>
            Muat ulang
          </Button>
        </div>
      ) : (
        data && (
          <>
            <UnderlineTabs items={[
              { id: "evidence", label: "Bukti" },
              { id: "history", label: "Riwayat perubahan", count: data.history?.length ?? 0 },
            ]} active={activeTab} onSelect={setActiveTab} />
            {activeTab === "evidence" ? <>
            <section className="attendance-evidence-section">
              {data.employee.status === "ARCHIVED" && <p className="employee-secondary">Karyawan arsip</p>}
              <div className="attendance-evidence-grid">
                <AttendanceEvidence
                  client={client}
                  recordId={data.id}
                  event={data.checkIn}
                  label="check-in"
                  date={data.attendanceDate}
                  isDeleted={!!data.deletedAt}
                  onSessionExpired={onSessionExpired}
                />
                <AttendanceEvidence
                  client={client}
                  recordId={data.id}
                  event={data.checkOut}
                  label="checkout"
                  date={data.attendanceDate}
                  isDeleted={!!data.deletedAt}
                  onSessionExpired={onSessionExpired}
                />
              </div>
              {data.deletedAt && (
                <div className="attendance-deletion">
                  <p className="employee-secondary">
                    Dihapus HRD · {attendanceDate(data.deletedAt)}{" "}
                    {attendanceTime(data.deletedAt)} WIB
                  </p>
                  <p className="attendance-reason">{data.deleteReason}</p>
                </div>
              )}
            </section>
            </> : (
              <section className="form-section">
                <h2>Riwayat perubahan</h2>
                {data.history?.length ? <ol className="history-list">
                  {data.history.map((item) => (
                    <li key={item.id} className="history-item">
                      <p className="cell-strong">
                        {item.action === "ATTENDANCE_DELETED"
                          ? "Dihapus HRD"
                          : "Dipulihkan HRD"}
                      </p>
                      <p className="history-date">
                        {attendanceDate(item.occurredAt)}{" "}
                        {attendanceTime(item.occurredAt)} WIB
                      </p>
                      {item.reason && (
                        <p className="attendance-reason">{item.reason}</p>
                      )}
                    </li>
                  ))}
                </ol> : <p className="evidence-muted">Belum ada perubahan untuk absensi ini.</p>}
              </section>
            )}
          </>
        )
      )}
      <ConfirmDialog
        className="attendance-lifecycle-dialog"
        open={!!confirm}
        title={
          confirm?.deletedAt ? "Pulihkan absensi?" : "Hapus absensi satu hari?"
        }
        confirmLabel={confirm?.deletedAt ? "Pulihkan" : "Hapus satu hari"}
        busy={busy}
        confirmDisabled={mustRefresh}
        error={actionError}
        onClose={() => setConfirm(null)}
        onConfirm={() => void change()}
      >
        <p className="dialog-text">
          <strong>{confirm?.employee.name}</strong>
          <br />
          {confirm && attendanceDate(confirm.attendanceDate)}
          <br />
          {confirm?.deletedAt
            ? "Kembalikan check-in dan checkout asli ke daftar absensi."
            : "Check-in dan checkout dipindahkan ke daftar terhapus. Karyawan tidak dapat absen ulang."}
        </p>
        {!confirm?.deletedAt && (
          <div>
            <Label htmlFor="attendance-delete-reason">Alasan penghapusan</Label>
            <TextArea
              id="attendance-delete-reason"
              fullWidth
              rows={3}
              maxLength={500}
              required
              disabled={busy || mustRefresh}
              value={reason}
              aria-invalid={!!reasonError}
              aria-describedby={
                reasonError ? "attendance-reason-error" : undefined
              }
              onChange={(e) => {
                setReason(e.target.value);
                setReasonError("");
              }}
            />
            {reasonError && (
              <p className="field-validation" id="attendance-reason-error">
                {reasonError}
              </p>
            )}
          </div>
        )}
        {mustRefresh && (
          <Button variant="secondary" onPress={refresh} isDisabled={busy}>
            Muat data terbaru
          </Button>
        )}
      </ConfirmDialog>
    </div>
  );
}
