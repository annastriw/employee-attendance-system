import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { Notice } from "@attendance/ui";
import { AttendanceMap } from "./AttendanceMap";
import { AuthError, type AuthClient } from "../../lib/auth-client";
import {
  attendanceDate,
  attendanceTime,
  getAttendancePhoto,
  type AttendanceEvent,
} from "../../lib/attendance";

type Client = Pick<AuthClient, "api">;

function PrivatePhoto({
  client,
  recordId,
  eventId,
  label,
  date,
  isDeleted,
  onSessionExpired,
}: {
  client: Client;
  recordId: string;
  eventId: string;
  label: string;
  date: string;
  isDeleted: boolean;
  onSessionExpired: () => void;
}) {
  const [photo, setPhoto] = useState<{ src: string; expiresAt: number } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      request.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!photo) return;
    const remainingMs = Math.max(0, photo.expiresAt - Date.now());
    const timer = setTimeout(() => {
      setPhoto(null);
    }, remainingMs);
    return () => clearTimeout(timer);
  }, [photo]);

  async function load() {
    if (request.current) return;
    const c = new AbortController();
    request.current = c;
    setBusy(true);
    setError("");
    setPhoto(null);

    try {
      const result = await getAttendancePhoto(client, recordId, eventId);
      if (!c.signal.aborted) {
        setPhoto({
          src: result.url,
          expiresAt: Date.now() + result.expiresInSeconds * 1000,
        });
      }
    } catch (e) {
      if (c.signal.aborted) return;
      if (e instanceof AuthError && e.status === 401) {
        onSessionExpired();
      } else {
        setError(e instanceof Error ? e.message : "Foto belum dapat dimuat.");
      }
    } finally {
      if (request.current === c) {
        request.current = null;
        if (!c.signal.aborted) setBusy(false);
      }
    }
  }

  return (
    <div className="attendance-evidence-photo">
      {isDeleted && (
        <span className="badge-warning text-xs mb-1 inline-block">
          Foto absensi (Dihapus HRD)
        </span>
      )}
      {photo && (
        <div className="attendance-photo-frame">
          <img
            src={photo.src}
            alt={`Foto ${label} ${attendanceDate(date)}`}
            referrerPolicy="no-referrer"
            className="attendance-photo-img"
            onError={() => {
              setPhoto(null);
              setError("Foto belum dapat dimuat. Muat ulang foto.");
            }}
          />
        </div>
      )}
      {error && <Notice message={error} />}
      <Button
        variant="secondary"
        isDisabled={busy}
        onPress={() => void load()}
        className="btn-load-photo"
      >
        {busy
          ? "Memuat foto…"
          : photo
            ? `Muat ulang foto ${label}`
            : `Lihat foto ${label}`}
      </Button>
    </div>
  );
}

export function AttendanceEvidence({
  client,
  recordId,
  event,
  label,
  date,
  isDeleted,
  onSessionExpired,
}: {
  client: Client;
  recordId: string;
  event: AttendanceEvent | null;
  label: "check-in" | "checkout";
  date: string;
  isDeleted: boolean;
  onSessionExpired: () => void;
}) {
  const title = label === "check-in" ? "Check-in" : "Checkout";

  return (
    <section className="attendance-evidence-card">
      <div className="evidence-header">
        <h3 className="evidence-title">{title}</h3>
        <p className="evidence-time">
          {event ? attendanceTime(event.eventTime) : "—"} <span>WIB</span>
        </p>
      </div>

      {!event ? (
        <p className="evidence-muted">Belum tercatat</p>
      ) : (
        <>
          <div className="evidence-badges">
            {event.isLate && <span className="badge-warning">Terlambat</span>}
            {event.isEarlyDeparture && (
              <span className="badge-warning">Pulang awal</span>
            )}
            {event.isOutsideSchedule && (
              <span className="status-badge status-inactive">Di luar jadwal</span>
            )}
          </div>

          {event.reason && (
            <p className="attendance-reason">
              <span className="font-medium text-foreground">Alasan: </span>
              {event.reason}
            </p>
          )}

          {/* Private Photo with 60-second validity */}
          <PrivatePhoto
            client={client}
            recordId={recordId}
            eventId={event.id}
            label={label}
            date={date}
            isDeleted={isDeleted}
            onSessionExpired={onSessionExpired}
          />

          {/* Dual Location & Interactive Leaflet Map */}
          {event.location ? (
            <div className="attendance-evidence-location">
              <h4 className="location-heading">Lokasi {title}</h4>
              <AttendanceMap
                latitude={event.location.latitude}
                longitude={event.location.longitude}
                accuracyMeters={event.location.accuracyMeters}
                label={title}
              />
              <dl className="attendance-location-specs">
                <div className="location-spec-item">
                  <dt>Koordinat</dt>
                  <dd>
                    {event.location.latitude.toFixed(6)},{" "}
                    {event.location.longitude.toFixed(6)}
                  </dd>
                </div>
                <div className="location-spec-item">
                  <dt>Akurasi</dt>
                  <dd>{event.location.accuracyMeters.toFixed(1)} m</dd>
                </div>
                <div className="location-spec-item">
                  <dt>Waktu direkam</dt>
                  <dd>
                    {attendanceDate(event.location.capturedAt)}{" "}
                    {attendanceTime(event.location.capturedAt)} WIB
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="evidence-muted">Lokasi tidak tersedia</p>
          )}
        </>
      )}
    </section>
  );
}
