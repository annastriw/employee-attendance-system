import { useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { Notice } from "../molecules/Notice";
import { AuthError, type AuthClient } from "../../lib/auth-client";
import {
  getHistoryPhoto,
  historyDate,
  type HistoryEvent,
} from "../../lib/attendance-history";
import { clockLabel } from "../../lib/attendance-client";

function PrivatePhoto({
  client,
  recordId,
  eventId,
  label,
  date,
  onSessionExpired,
  onReload,
}: {
  client: AuthClient;
  recordId: string;
  eventId: string;
  label: string;
  date: string;
  onSessionExpired: () => void;
  onReload: () => void;
}) {
  const [photo, setPhoto] = useState<{ src: string; expiresAt: number } | null>(
    null,
  );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [changed, setChanged] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (!photo) return;
    const timer = setTimeout(
      () => setPhoto(null),
      Math.max(0, photo.expiresAt - Date.now()),
    );
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
      const result = await getHistoryPhoto(client, recordId, eventId, c.signal);
      if (!c.signal.aborted)
        setPhoto({
          src: result.url,
          expiresAt: Date.now() + result.expiresInSeconds * 1000,
        });
    } catch (e) {
      if (c.signal.aborted) return;
      if (e instanceof AuthError && e.status === 401) onSessionExpired();
      else {
        setError(e instanceof Error ? e.message : "Foto belum dapat dimuat.");
        setChanged(e instanceof AuthError && e.status === 409);
      }
    } finally {
      if (request.current === c) {
        request.current = null;
        if (!c.signal.aborted) setBusy(false);
      }
    }
  }
  return (
    <div className="history-photo">
      {photo && (
        <img
          src={photo.src}
          alt={"Foto " + label + " " + historyDate(date)}
          referrerPolicy="no-referrer"
          onError={() => {
            setPhoto(null);
            setError("Foto belum dapat dimuat. Muat ulang foto.");
          }}
        />
      )}
      {error && <Notice message={error} />}
      {changed ? (
        <Button variant="secondary" onPress={onReload}>
          Muat detail terbaru
        </Button>
      ) : (
        <Button
          variant="secondary"
          isDisabled={busy}
          onPress={() => void load()}
        >
          {busy
            ? "Memuat foto…"
            : photo
              ? "Muat ulang foto " + label
              : "Lihat foto " + label}
        </Button>
      )}
    </div>
  );
}
export function HistoryEvidence({
  client,
  recordId,
  event,
  label,
  date,
  deleted,
  onSessionExpired,
  onReload,
}: {
  client: AuthClient;
  recordId: string;
  event: HistoryEvent | null;
  label: string;
  date: string;
  deleted: boolean;
  onSessionExpired: () => void;
  onReload: () => void;
}) {
  return (
    <section className="history-evidence">
      <h2>{label === "check-in" ? "Check-in" : "Checkout"}</h2>
      <p className="history-event-time">
        {event ? clockLabel(event.eventTime) : "—"} <span>WIB</span>
      </p>
      {!event && <p className="history-muted">Belum tercatat</p>}
      {event?.isLate && <p className="history-muted">Terlambat</p>}
      {event?.isEarlyDeparture && <p className="history-muted">Pulang awal</p>}
      {event?.isOutsideSchedule && (
        <p className="history-muted">Di luar jadwal</p>
      )}
      {event && !deleted && (
        <PrivatePhoto
          client={client}
          recordId={recordId}
          eventId={event.id}
          label={label}
          date={date}
          onSessionExpired={onSessionExpired}
          onReload={onReload}
        />
      )}
      {event?.location && (
        <dl className="history-location">
          <div>
            <dt>Koordinat</dt>
            <dd>
              {event.location.latitude.toFixed(6)},{" "}
              {event.location.longitude.toFixed(6)}
            </dd>
          </div>
          <div>
            <dt>Akurasi</dt>
            <dd>{event.location.accuracyMeters} m</dd>
          </div>
          <div>
            <dt>Lokasi direkam</dt>
            <dd>
              {historyDate(event.location.capturedAt)}{" "}
              {clockLabel(event.location.capturedAt)} WIB
            </dd>
          </div>
        </dl>
      )}

      {event?.reason && <p className="history-reason">{event.reason}</p>}
    </section>
  );
}
