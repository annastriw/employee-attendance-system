import { AuthError, type AuthClient } from "./auth-client";
export interface HistoryEvent {
  id: string;
  eventTime: string;
  reason: string | null;
  isLate: boolean;
  isEarlyDeparture: boolean;
  isOutsideSchedule: boolean;
  location?: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    capturedAt: string;
  };
  captureMethod?: "AUTO" | "MANUAL";
}
export interface HistoryRecord {
  id: string;
  attendanceDate: string;
  department: string;
  position: string;
  deletedAt: string | null;
  deleteReason: string | null;
  checkIn: HistoryEvent;
  checkOut: HistoryEvent | null;
}
export interface HistoryResult {
  data: HistoryRecord[];
  meta: { total: number; page: number; pageSize: number };
}
export type HistoryParams = Record<string, string | undefined>;
// Database record/event IDs accept UUID versions 1-8, including seeded v5.
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const wib = (value: unknown): value is string =>
  typeof value === "string" &&
  /\+07:00$/.test(value) &&
  Number.isFinite(Date.parse(value));
const reason = (value: unknown) =>
  value === null || (typeof value === "string" && value.length <= 500);
const invalid = () =>
  new AuthError(503, "Riwayat absensi belum dapat diverifikasi.");
function row(value: unknown, detail: boolean): HistoryRecord {
  const r = value as HistoryRecord | null;
  if (
    !r ||
    !uuid.test(r.id) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(r.attendanceDate) ||
    !Number.isFinite(Date.parse(r.attendanceDate)) ||
    new Date(r.attendanceDate).toISOString().slice(0, 10) !==
      r.attendanceDate ||
    typeof r.department !== "string" ||
    typeof r.position !== "string" ||
    !reason(r.deleteReason) ||
    (r.deletedAt !== null && (!wib(r.deletedAt) || !r.deleteReason?.trim()))
  )
    throw invalid();
  const event = (e: HistoryEvent | null, required: boolean) => {
    if (e === null && !required) return null;
    if (
      !e ||
      !uuid.test(e.id) ||
      !wib(e.eventTime) ||
      e.eventTime.slice(0, 10) !== r.attendanceDate ||
      !reason(e.reason) ||
      [e.isLate, e.isEarlyDeparture, e.isOutsideSchedule].some(
        (flag) => typeof flag !== "boolean",
      )
    )
      throw invalid();
    if (detail) {
      const l = e.location;
      if (
        !l ||
        !Number.isFinite(l.latitude) ||
        Math.abs(l.latitude) > 90 ||
        !Number.isFinite(l.longitude) ||
        Math.abs(l.longitude) > 180 ||
        !Number.isFinite(l.accuracyMeters) ||
        l.accuracyMeters < 0 ||
        !wib(l.capturedAt) ||
        !["AUTO", "MANUAL"].includes(e.captureMethod ?? "")
      )
        throw invalid();
    }
    // Project only the history contract; never keep arbitrary photo IDs/URLs.
    return {
      id: e.id,
      eventTime: e.eventTime,
      reason: e.reason,
      isLate: e.isLate,
      isEarlyDeparture: e.isEarlyDeparture,
      isOutsideSchedule: e.isOutsideSchedule,
      ...(detail
        ? { location: e.location, captureMethod: e.captureMethod }
        : {}),
    };
  };
  const checkIn = event(r.checkIn, true)!;
  const checkOut = event(r.checkOut, false);
  if (
    checkOut &&
    Date.parse(checkOut.eventTime) < Date.parse(checkIn.eventTime)
  )
    throw invalid();
  return {
    id: r.id,
    attendanceDate: r.attendanceDate,
    department: r.department,
    position: r.position,
    deletedAt: r.deletedAt,
    deleteReason: r.deleteReason,
    checkIn,
    checkOut,
  };
}
function metadata(meta: unknown) {
  const m = meta as { requestId?: unknown; serverTime?: unknown } | null;
  if (!m || typeof m.requestId !== "string" || !wib(m.serverTime))
    throw invalid();
}
export async function getHistory(
  client: AuthClient,
  params: URLSearchParams,
  signal: AbortSignal,
): Promise<HistoryResult> {
  const query = new URLSearchParams({
    page: params.get("page") ?? "1",
    pageSize: "20",
  });
  for (const key of ["startDate", "endDate"]) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  const result = await client.api<
    HistoryResult & { meta: { requestId: string; serverTime: string } }
  >("me/attendance?" + query.toString(), { signal });
  metadata(result?.meta);
  const m = result.meta;
  if (
    !Array.isArray(result.data) ||
    !Number.isSafeInteger(m.total) ||
    m.total < 0 ||
    !Number.isInteger(m.page) ||
    m.page < 1 ||
    !Number.isInteger(m.pageSize) ||
    m.pageSize < 1 ||
    m.pageSize > 20 ||
    result.data.length > m.pageSize ||
    result.data.length > m.total
  )
    throw invalid();
  return {
    data: result.data.map((r) => row(r, false)),
    meta: { total: m.total, page: m.page, pageSize: m.pageSize },
  };
}
export async function getHistoryDetail(
  client: AuthClient,
  id: string,
  signal: AbortSignal,
) {
  const result = await client.api<{ data: unknown; meta: unknown }>(
    "me/attendance/" + encodeURIComponent(id),
    { signal },
  );
  metadata(result?.meta);
  const record = row(result.data, true);
  if (record.id.toLowerCase() !== id.toLowerCase()) throw invalid();
  return record;
}
export async function getHistoryPhoto(
  client: AuthClient,
  id: string,
  eventId: string,
  signal: AbortSignal,
) {
  const result = await client.api<{
    data: { url: string; expiresInSeconds: number };
    meta: unknown;
  }>(
    "me/attendance/" +
      encodeURIComponent(id) +
      "/events/" +
      encodeURIComponent(eventId) +
      "/photo",
    { signal },
  );
  metadata(result?.meta);
  const p = result.data;
  if (!p || typeof p.url !== "string" || p.expiresInSeconds !== 60)
    throw invalid();
  let url: URL;
  try {
    url = new URL(p.url);
  } catch {
    throw invalid();
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw invalid();
  return p;
}
export const historyDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value.length === 10 ? value + "T00:00:00+07:00" : value));
export function historyStatus(r: HistoryRecord) {
  if (r.deletedAt) return "Dihapus HRD";
  const flags = [
    r.checkIn.isLate ? "Terlambat" : "",
    r.checkOut?.isEarlyDeparture ? "Pulang awal" : "",
    r.checkIn.isOutsideSchedule || r.checkOut?.isOutsideSchedule
      ? "Di luar jadwal"
      : "",
    !r.checkOut ? "Belum checkout" : "",
  ].filter(Boolean);
  return flags.join(" · ") || "Selesai";
}
