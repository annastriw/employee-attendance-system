export interface AttendanceEvent {
  id: string;
  eventTime: string;
  reason: string | null;
  isLate: boolean;
  isEarlyDeparture: boolean;
  isOutsideSchedule: boolean;
}
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  attendanceDate: string;
  version: string;
  employee: {
    id: string;
    name: string;
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  };
  department: string;
  position: string;
  deletedAt: string | null;
  deleteReason: string | null;
  deletedByAccountId: string | null;
  checkIn: AttendanceEvent | null;
  checkOut: AttendanceEvent | null;
  history?: {
    id: string;
    action: string;
    actorAccountId: string;
    occurredAt: string;
    reason: string | null;
  }[];
}
export interface AttendancePageResult {
  data: AttendanceRecord[];
  meta: { total: number; page: number; pageSize: number };
}
export const attendanceDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value.length === 10 ? value + "T00:00:00+07:00" : value));
export const attendanceTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(new Date(value))
    : "—";
export const attendanceStatus = (row: AttendanceRecord) =>
  row.deletedAt ? "Dihapus HRD" : row.checkOut ? "Selesai" : "Belum checkout";
