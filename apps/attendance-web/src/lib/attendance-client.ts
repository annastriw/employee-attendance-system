import { AuthError, type AuthClient } from "./auth-client";
export type AttendancePurpose = "CHECK_IN" | "CHECK_OUT";
export interface CheckInRecord {
  id: string;
  attendanceDate: string;
  deletedAt: string | null;
  checkOut?: CheckoutEvent | null;
  checkIn: {
    id: string;
    eventTime: string;
    isLate: boolean;
    isOutsideSchedule: boolean;
    reason: string | null;
  };
}
export interface CheckoutEvent {
  id: string;
  eventTime: string;
  isEarlyDeparture: boolean;
  isOutsideSchedule: boolean;
  reason: string | null;
}
export interface Today {
  employeeName: string;
  attendanceDate: string;
  eligible: boolean;
  ineligibilityMessage: string | null;
  schedule: {
    type: "REGULAR_WORKDAY" | "WEEKEND" | "HOLIDAY";
    start: string;
    end: string;
  };
  reasonRequired: boolean;
  checkoutReasonRequired: boolean;
  status: "NOT_CHECKED_IN" | "CHECKED_IN" | "CHECKED_OUT" | "DELETED";
  record: CheckInRecord | null;
}
export interface CheckInPayload {
  dailyRecordId?: string;
  photoObjectId: string;
  clientCapturedAt: string;
  captureMethod: "AUTO" | "MANUAL";
  location: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    capturedAt: string;
  };
  reason?: string;
}
interface Envelope<T> {
  data: T;
  meta: { requestId: string; serverTime: string };
}
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const calendarDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const zoned = (s: unknown): s is string =>
  typeof s === "string" &&
  /[+]07:00$/.test(s) &&
  Number.isFinite(Date.parse(s));
export function readRecord(value: unknown): CheckInRecord {
  const row = value as CheckInRecord | null;
  if (
    !row ||
    !uuid.test(row.id) ||
    !calendarDate(row.attendanceDate) ||
    row.deletedAt !== null ||
    !row.checkIn ||
    !uuid.test(row.checkIn.id) ||
    !zoned(row.checkIn.eventTime) ||
    typeof row.checkIn.isLate !== "boolean" ||
    typeof row.checkIn.isOutsideSchedule !== "boolean"
  )
    throw new AuthError(503, "Hasil check-in belum dapat diverifikasi.");
  if (
    row.checkOut &&
    (!uuid.test(row.checkOut.id) ||
      !zoned(row.checkOut.eventTime) ||
      typeof row.checkOut.isEarlyDeparture !== "boolean" ||
      typeof row.checkOut.isOutsideSchedule !== "boolean" ||
      Date.parse(row.checkOut.eventTime) < Date.parse(row.checkIn.eventTime))
  )
    throw new AuthError(503, "Hasil checkout belum dapat diverifikasi.");
  return row;
}
export function readOperationRecord(
  value: unknown,
  purpose: AttendancePurpose,
) {
  const row = readRecord(value);
  if (purpose === "CHECK_OUT" && !row.checkOut)
    throw new AuthError(503, "Hasil checkout belum dapat diverifikasi.");
  return row;
}
export async function getToday(client: AuthClient, signal?: AbortSignal) {
  const value = await client.api<Envelope<Today>>("me/attendance/today", {
    signal,
  });
  const d = value?.data;
  if (
    !d ||
    !zoned(value.meta?.serverTime) ||
    typeof d.employeeName !== "string" ||
    !calendarDate(d.attendanceDate) ||
    typeof d.eligible !== "boolean" ||
    typeof d.reasonRequired !== "boolean" ||
    typeof d.checkoutReasonRequired !== "boolean" ||
    !["NOT_CHECKED_IN", "CHECKED_IN", "CHECKED_OUT", "DELETED"].includes(
      d.status,
    ) ||
    !["REGULAR_WORKDAY", "WEEKEND", "HOLIDAY"].includes(d.schedule?.type) ||
    !/^\d{2}:\d{2}:\d{2}$/.test(d.schedule.start) ||
    !/^\d{2}:\d{2}:\d{2}$/.test(d.schedule.end) ||
    (d.status === "NOT_CHECKED_IN" ? d.record !== null : !d.record)
  )
    throw new AuthError(503, "Data hari ini belum dapat diverifikasi.");

  if (d.record) {
    if (
      (d.status === "CHECKED_OUT" && !d.record.checkOut) ||
      (d.status === "CHECKED_IN" && !!d.record.checkOut) ||
      d.record.attendanceDate !== d.attendanceDate ||
      (d.status === "DELETED" && !zoned(d.record.deletedAt))
    )
      throw new AuthError(503, "Data hari ini belum dapat diverifikasi.");
    readRecord(
      d.status === "DELETED" ? { ...d.record, deletedAt: null } : d.record,
    );
  }

  return value;
}
export async function postCheckIn(
  client: AuthClient,
  payload: CheckInPayload,
  key: string,
  signal: AbortSignal,
  purpose: AttendancePurpose = "CHECK_IN",
) {
  const value = await client.api<Envelope<CheckInRecord>>(
    purpose === "CHECK_IN"
      ? "me/attendance/check-in"
      : "me/attendance/check-out",
    {
      method: "POST",
      body: payload,
      idempotencyKey: key,
      signal,
      timeoutMs: 35000,
    },
  );
  return readOperationRecord(value?.data, purpose);
}
export async function getCheckInStatus(
  client: AuthClient,
  key: string,
  signal: AbortSignal,
) {
  const value = await client.api<
    Envelope<{
      state: "PENDING" | "SUCCEEDED" | "REJECTED" | "RETRYABLE";
      responseStatus: number;
      response: {
        data?: unknown;
        error?: { code?: string; message?: string };
      } | null;
    }>
  >("me/attendance/requests/" + encodeURIComponent(key), { signal });
  const data = value?.data;
  if (
    !data ||
    !["PENDING", "SUCCEEDED", "REJECTED", "RETRYABLE"].includes(data.state) ||
    !Number.isInteger(data.responseStatus) ||
    (data.state === "PENDING"
      ? data.responseStatus !== 0 || data.response !== null
      : !data.response) ||
    (data.state === "SUCCEEDED" && data.responseStatus !== 201) ||
    (data.state === "REJECTED" &&
      (data.responseStatus < 400 || data.responseStatus >= 500)) ||
    (data.state === "RETRYABLE" &&
      (data.responseStatus < 500 || data.responseStatus > 599)) ||
    (["REJECTED", "RETRYABLE"].includes(data.state) &&
      (typeof data.response?.error?.code !== "string" ||
        typeof data.response?.error?.message !== "string"))
  )
    throw new AuthError(503, "Status absensi belum dapat diverifikasi.");
  if (data.state === "SUCCEEDED") readRecord(data.response?.data);
  return data;
}
export function clockLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}
