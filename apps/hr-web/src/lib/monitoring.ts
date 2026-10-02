export interface MonitoringSummary {
  date: string;
  isWorkday: boolean;
  scheduleType: 'REGULAR_WORKDAY' | 'WEEKEND' | 'HOLIDAY';
  workPolicy: {
    checkInTime: string;
    checkOutTime: string;
  };
  activeEmployees: number;
  checkedIn: number;
  late: number;
  earlyDeparture: number;
  pendingCheckout: number;
  completed: number;
  missingAttendance: number;
  deletedCount: number;
}

export interface MonitoringEmployeeItem {
  employeeId: string;
  nik: string;
  name: string;
  departmentId: string;
  department: string;
  positionId: string;
  position: string;
  attendanceDate: string;
  status:
    | 'CHECKED_IN'
    | 'COMPLETED'
    | 'MISSING'
    | 'PENDING_CHECK_IN'
    | 'DELETED'
    | 'NOT_ELIGIBLE'
    | 'NON_WORKING_DAY';
  isLate: boolean;
  isEarlyDeparture: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  recordId: string | null;
  deletedAt: string | null;
}

export interface MonitoringEmployeesResult {
  data: MonitoringEmployeeItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    date: string;
  };
}

export const monitoringDateFormatted = (value: string) =>
  new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(
    new Date(value.length === 10 ? value + 'T00:00:00+07:00' : value),
  );

export const monitoringTimeFormatted = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }).format(new Date(value))
    : '—';

export const monitoringStatusLabel = (status: MonitoringEmployeeItem['status']) => {
  switch (status) {
    case 'COMPLETED':
      return 'Selesai';
    case 'CHECKED_IN':
      return 'Hadir';
    case 'MISSING':
      return 'Tidak ada absensi';
    case 'PENDING_CHECK_IN':
      return 'Belum check-in';
    case 'DELETED':
      return 'Dihapus HRD';
    case 'NON_WORKING_DAY':
      return 'Hari libur';
    case 'NOT_ELIGIBLE':
      return 'Tidak wajib';
    default:
      return status;
  }
};
