import {
  TimePolicyEngine,
  type WorkPolicyConfig,
  type HolidayItem,
  DEFAULT_WORK_POLICY,
} from '../policy/time-policy.engine';

export type EmployeeLifecycleStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface EmployeeProfileSnapshot {
  id: string;
  nik: string;
  name: string;
  startDate: Date | string; // Date or "YYYY-MM-DD"
  status: EmployeeLifecycleStatus;
  ready: boolean;
  departmentId: string;
  departmentName: string;
  positionId: string;
  positionName: string;
}

export interface LifecycleHistoryEntry {
  action: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  createdAt: Date;
}

export type DayAttendanceStatus =
  | 'PRESENT' // Active attendance record exists
  | 'RECORD_DELETED' // Soft deleted record exists; per baseline: NOT missing
  | 'PENDING_CHECK_IN' // Today, during work hours (before 17:00 WIB), no check-in yet
  | 'MISSING' // Workday passed (or today >= 17:00 WIB) with no attendance record
  | 'NOT_ELIGIBLE' // Before startDate or inactive/archived on date
  | 'NON_WORKING_DAY'; // Weekend or holiday

export interface DayEligibilityEvaluation {
  employeeId: string;
  dateString: string;
  isWorkday: boolean;
  isEmployeeEligible: boolean;
  activeStatusOnDate: EmployeeLifecycleStatus;
  dayAttendanceStatus: DayAttendanceStatus;
  isMissingAttendance: boolean;
  reason?: string;
}

export class EligibilityEngine {
  /**
   * Verifies real-time eligibility for check-in / attendance submission.
   */
  static verifyRealTimeEligibility(
    employee: EmployeeProfileSnapshot,
    attendanceDateStr: string,
  ): { eligible: boolean; code?: string; message?: string } {
    if (!employee.ready) {
      return {
        eligible: false,
        code: 'EMPLOYEE_NOT_READY',
        message: 'Data profil karyawan belum siap.',
      };
    }

    if (employee.status !== 'ACTIVE') {
      return {
        eligible: false,
        code: 'EMPLOYEE_INACTIVE',
        message: 'Akun karyawan tidak aktif atau telah diarsipkan.',
      };
    }

    const employeeStartDateStr = typeof employee.startDate === 'string'
      ? employee.startDate.slice(0, 10)
      : TimePolicyEngine.getWibComponents(employee.startDate).dateString;

    if (attendanceDateStr < employeeStartDateStr) {
      return {
        eligible: false,
        code: 'BEFORE_START_DATE',
        message: 'Tanggal absensi mendahului tanggal mulai bekerja karyawan.',
      };
    }

    return { eligible: true };
  }

  /**
   * Reconstructs an employee's lifecycle status on a specific historical date (at 23:59:59 WIB).
   */
  static reconstructStatusOnDate(
    currentStatus: EmployeeLifecycleStatus,
    historyEntries: LifecycleHistoryEntry[],
    targetDateStr: string,
  ): EmployeeLifecycleStatus {
    // If no history exists, employee always had their current status.
    if (!historyEntries || historyEntries.length === 0) {
      return currentStatus;
    }

    // Sort entries chronologically ascending
    const sorted = [...historyEntries].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    // Filter relevant status transition actions
    const statusActions = [
      'EMPLOYEE_ACTIVATED',
      'EMPLOYEE_DEACTIVATED',
      'EMPLOYEE_ARCHIVED',
      'EMPLOYEE_RESTORED',
      'EMPLOYEE_PROVISIONED',
    ];

    const relevant = sorted.filter((e) => statusActions.includes(e.action) || e.after?.status !== undefined);

    if (relevant.length === 0) {
      return currentStatus;
    }

    // Target boundary: end of target date in WIB
    // targetDateStr: YYYY-MM-DD
    // If an action happened on or before targetDateStr (in WIB date), it applies.
    let statusAtDate: EmployeeLifecycleStatus | null = null;

    for (const entry of relevant) {
      const entryWibDate = TimePolicyEngine.getWibComponents(new Date(entry.createdAt)).dateString;
      if (entryWibDate <= targetDateStr) {
        if (entry.after?.status) {
          statusAtDate = entry.after.status as EmployeeLifecycleStatus;
        } else if (entry.action === 'EMPLOYEE_ACTIVATED') {
          statusAtDate = 'ACTIVE';
        } else if (entry.action === 'EMPLOYEE_DEACTIVATED') {
          statusAtDate = 'INACTIVE';
        } else if (entry.action === 'EMPLOYEE_ARCHIVED') {
          statusAtDate = 'ARCHIVED';
        } else if (entry.action === 'EMPLOYEE_RESTORED') {
          statusAtDate = 'INACTIVE';
        }
      }
    }

    // If no action was on or before target date, look at the "before" of the earliest action
    if (!statusAtDate) {
      const earliest = relevant[0];
      if (earliest.before?.status) {
        statusAtDate = earliest.before.status as EmployeeLifecycleStatus;
      } else {
        statusAtDate = currentStatus;
      }
    }

    return statusAtDate;
  }

  /**
   * Evaluates employee attendance status and missing attendance for a given calendar date.
   */
  static evaluateDayAttendance(params: {
    employee: EmployeeProfileSnapshot;
    historyEntries?: LifecycleHistoryEntry[];
    targetDateStr: string; // YYYY-MM-DD WIB
    currentTime: Date;
    dailyRecord?: { id: string; deletedAt: Date | null } | null;
    policy?: WorkPolicyConfig;
    holidays?: HolidayItem[];
  }): DayEligibilityEvaluation {
    const {
      employee,
      historyEntries = [],
      targetDateStr,
      currentTime,
      dailyRecord,
      policy = DEFAULT_WORK_POLICY,
      holidays = [],
    } = params;

    const currentWib = TimePolicyEngine.getWibComponents(currentTime);
    const targetDateWib = TimePolicyEngine.getWibComponents(
      new Date(`${targetDateStr}T12:00:00+07:00`),
    );

    // 1. Is target date a workday?
    const { scheduleType } = TimePolicyEngine.classifySchedule(targetDateWib, policy, holidays);
    const isWorkday = scheduleType === 'REGULAR_WORKDAY';

    if (!isWorkday) {
      return {
        employeeId: employee.id,
        dateString: targetDateStr,
        isWorkday: false,
        isEmployeeEligible: false,
        activeStatusOnDate: 'ACTIVE',
        dayAttendanceStatus: 'NON_WORKING_DAY',
        isMissingAttendance: false,
        reason: scheduleType === 'HOLIDAY' ? 'Hari libur' : 'Akhir pekan',
      };
    }

    // 2. Check employment start date
    const employeeStartDateStr = typeof employee.startDate === 'string'
      ? employee.startDate.slice(0, 10)
      : TimePolicyEngine.getWibComponents(employee.startDate).dateString;

    if (targetDateStr < employeeStartDateStr) {
      return {
        employeeId: employee.id,
        dateString: targetDateStr,
        isWorkday: true,
        isEmployeeEligible: false,
        activeStatusOnDate: 'INACTIVE',
        dayAttendanceStatus: 'NOT_ELIGIBLE',
        isMissingAttendance: false,
        reason: 'Belum mulai bekerja pada tanggal ini',
      };
    }

    // 3. Reconstruct historical status on target date
    const statusOnDate = this.reconstructStatusOnDate(
      employee.status,
      historyEntries,
      targetDateStr,
    );

    if (statusOnDate !== 'ACTIVE') {
      return {
        employeeId: employee.id,
        dateString: targetDateStr,
        isWorkday: true,
        isEmployeeEligible: false,
        activeStatusOnDate: statusOnDate,
        dayAttendanceStatus: 'NOT_ELIGIBLE',
        isMissingAttendance: false,
        reason: `Status karyawan ${statusOnDate} pada tanggal ini`,
      };
    }

    // 4. Employee is eligible and was obligated to work. Check daily record.
    if (dailyRecord) {
      if (dailyRecord.deletedAt !== null) {
        // Soft-deleted record -> baseline: "Missing attendance dihitung, bukan baris palsu. Absensi terhapus bukan missing."
        return {
          employeeId: employee.id,
          dateString: targetDateStr,
          isWorkday: true,
          isEmployeeEligible: true,
          activeStatusOnDate: statusOnDate,
          dayAttendanceStatus: 'RECORD_DELETED',
          isMissingAttendance: false,
          reason: 'Catatan absensi dihapus oleh HRD',
        };
      }

      // Active record present
      return {
        employeeId: employee.id,
        dateString: targetDateStr,
        isWorkday: true,
        isEmployeeEligible: true,
        activeStatusOnDate: statusOnDate,
        dayAttendanceStatus: 'PRESENT',
        isMissingAttendance: false,
      };
    }

    // 5. No daily record exists.
    // Baseline: "Hari kerja tanpa check-in: belum check-in selama jam kerja, tidak ada absensi setelah 17.00."
    if (targetDateStr < currentWib.dateString) {
      // Past day with no record -> Missing Attendance
      return {
        employeeId: employee.id,
        dateString: targetDateStr,
        isWorkday: true,
        isEmployeeEligible: true,
        activeStatusOnDate: statusOnDate,
        dayAttendanceStatus: 'MISSING',
        isMissingAttendance: true,
        reason: 'Tidak ada absensi pada hari kerja',
      };
    }

    if (targetDateStr === currentWib.dateString) {
      // Today: check whether work hours have ended (17:00 WIB)
      const workEndTimeMillis = TimePolicyEngine.parseTimeToMillis(policy.checkOutTime); // 17:00:00 -> 61,200,000 ms
      if (currentWib.totalMillisOfDay < workEndTimeMillis) {
        return {
          employeeId: employee.id,
          dateString: targetDateStr,
          isWorkday: true,
          isEmployeeEligible: true,
          activeStatusOnDate: statusOnDate,
          dayAttendanceStatus: 'PENDING_CHECK_IN',
          isMissingAttendance: false,
          reason: 'Belum check-in selama jam kerja',
        };
      }

      // Today after 17:00 WIB -> Missing Attendance
      return {
        employeeId: employee.id,
        dateString: targetDateStr,
        isWorkday: true,
        isEmployeeEligible: true,
        activeStatusOnDate: statusOnDate,
        dayAttendanceStatus: 'MISSING',
        isMissingAttendance: true,
        reason: 'Tidak ada absensi setelah jam 17:00 WIB',
      };
    }

    // Future date
    return {
      employeeId: employee.id,
      dateString: targetDateStr,
      isWorkday: true,
      isEmployeeEligible: true,
      activeStatusOnDate: statusOnDate,
      dayAttendanceStatus: 'NOT_ELIGIBLE',
      isMissingAttendance: false,
      reason: 'Tanggal mendatang',
    };
  }
}
