import {
  EligibilityEngine,
  type EmployeeProfileSnapshot,
  type LifecycleHistoryEntry,
} from './eligibility.engine';
import { type HolidayItem, DEFAULT_WORK_POLICY } from '../policy/time-policy.engine';

describe('EligibilityEngine (T16 Real-time & Historical Eligibility)', () => {
  const activeEmployee: EmployeeProfileSnapshot = {
    id: 'emp-001',
    nik: 'NIK-001',
    name: 'Budi Santoso',
    startDate: '2026-10-01',
    status: 'ACTIVE',
    ready: true,
    departmentId: 'dept-001',
    departmentName: 'Teknologi Informasi',
    positionId: 'pos-001',
    positionName: 'Software Engineer',
  };

  const holidays: HolidayItem[] = [
    { holidayDate: '2026-10-07', description: 'Hari Libur Nasional' },
  ];

  describe('Real-time Eligibility Verification', () => {
    it('approves attendance submission for ready, active employee on or after start date', () => {
      const result = EligibilityEngine.verifyRealTimeEligibility(activeEmployee, '2026-10-02');
      expect(result.eligible).toBe(true);
    });

    it('rejects attendance submission if employee is not ready', () => {
      const unready = { ...activeEmployee, ready: false };
      const result = EligibilityEngine.verifyRealTimeEligibility(unready, '2026-10-02');

      expect(result.eligible).toBe(false);
      expect(result.code).toBe('EMPLOYEE_NOT_READY');
    });

    it('rejects attendance submission if employee is INACTIVE', () => {
      const inactive = { ...activeEmployee, status: 'INACTIVE' as const };
      const result = EligibilityEngine.verifyRealTimeEligibility(inactive, '2026-10-02');

      expect(result.eligible).toBe(false);
      expect(result.code).toBe('EMPLOYEE_INACTIVE');
    });

    it('rejects attendance submission if employee is ARCHIVED', () => {
      const archived = { ...activeEmployee, status: 'ARCHIVED' as const };
      const result = EligibilityEngine.verifyRealTimeEligibility(archived, '2026-10-02');

      expect(result.eligible).toBe(false);
      expect(result.code).toBe('EMPLOYEE_INACTIVE');
    });

    it('rejects attendance submission if attendance date is before employee start date', () => {
      // startDate is 2026-10-01; attendance date is 2026-09-30
      const result = EligibilityEngine.verifyRealTimeEligibility(activeEmployee, '2026-09-30');

      expect(result.eligible).toBe(false);
      expect(result.code).toBe('BEFORE_START_DATE');
    });
  });

  describe('Historical Status Reconstruction', () => {
    it('reconstructs status as ACTIVE if employee was active on target date despite later deactivation', () => {
      // Employee currently INACTIVE, deactivated on 2026-10-05
      const currentStatus = 'INACTIVE';
      const history: LifecycleHistoryEntry[] = [
        {
          action: 'EMPLOYEE_PROVISIONED',
          before: {},
          after: { status: 'ACTIVE' },
          createdAt: new Date('2026-10-01T08:00:00Z'),
        },
        {
          action: 'EMPLOYEE_DEACTIVATED',
          before: { status: 'ACTIVE' },
          after: { status: 'INACTIVE' },
          createdAt: new Date('2026-10-05T09:00:00Z'),
        },
      ];

      // On 2026-10-02, employee was ACTIVE
      const statusOnOct02 = EligibilityEngine.reconstructStatusOnDate(currentStatus, history, '2026-10-02');
      expect(statusOnOct02).toBe('ACTIVE');

      // On 2026-10-06, employee was INACTIVE
      const statusOnOct06 = EligibilityEngine.reconstructStatusOnDate(currentStatus, history, '2026-10-06');
      expect(statusOnOct06).toBe('INACTIVE');
    });

    it('reconstructs status correctly through restore and reactivation cycle', () => {
      // Created ACTIVE on Oct 1 -> ARCHIVED on Oct 3 -> RESTORED (INACTIVE) on Oct 4 -> ACTIVATED on Oct 5
      const history: LifecycleHistoryEntry[] = [
        {
          action: 'EMPLOYEE_PROVISIONED',
          before: {},
          after: { status: 'ACTIVE' },
          createdAt: new Date('2026-10-01T08:00:00Z'),
        },
        {
          action: 'EMPLOYEE_ARCHIVED',
          before: { status: 'ACTIVE' },
          after: { status: 'ARCHIVED' },
          createdAt: new Date('2026-10-03T10:00:00Z'),
        },
        {
          action: 'EMPLOYEE_RESTORED',
          before: { status: 'ARCHIVED' },
          after: { status: 'INACTIVE' },
          createdAt: new Date('2026-10-04T10:00:00Z'),
        },
        {
          action: 'EMPLOYEE_ACTIVATED',
          before: { status: 'INACTIVE' },
          after: { status: 'ACTIVE' },
          createdAt: new Date('2026-10-05T10:00:00Z'),
        },
      ];

      expect(EligibilityEngine.reconstructStatusOnDate('ACTIVE', history, '2026-10-02')).toBe('ACTIVE');
      expect(EligibilityEngine.reconstructStatusOnDate('ACTIVE', history, '2026-10-03')).toBe('ARCHIVED');
      expect(EligibilityEngine.reconstructStatusOnDate('ACTIVE', history, '2026-10-04')).toBe('INACTIVE');
      expect(EligibilityEngine.reconstructStatusOnDate('ACTIVE', history, '2026-10-05')).toBe('ACTIVE');
    });
  });

  describe('Day Attendance & Missing Attendance Evaluation', () => {
    // Current time is Monday 2026-10-05 at 14:00 WIB
    const mondayMidday = new Date('2026-10-05T07:00:00.000Z');

    it('classifies weekend as NON_WORKING_DAY without missing attendance', () => {
      // Saturday 2026-10-03
      const evaluation = EligibilityEngine.evaluateDayAttendance({
        employee: activeEmployee,
        targetDateStr: '2026-10-03',
        currentTime: mondayMidday,
        dailyRecord: null,
        policy: DEFAULT_WORK_POLICY,
        holidays,
      });

      expect(evaluation.isWorkday).toBe(false);
      expect(evaluation.dayAttendanceStatus).toBe('NON_WORKING_DAY');
      expect(evaluation.isMissingAttendance).toBe(false);
    });

    it('classifies holiday as NON_WORKING_DAY without missing attendance', () => {
      // Wednesday 2026-10-07 is registered holiday
      const evaluation = EligibilityEngine.evaluateDayAttendance({
        employee: activeEmployee,
        targetDateStr: '2026-10-07',
        currentTime: mondayMidday,
        dailyRecord: null,
        policy: DEFAULT_WORK_POLICY,
        holidays,
      });

      expect(evaluation.isWorkday).toBe(false);
      expect(evaluation.dayAttendanceStatus).toBe('NON_WORKING_DAY');
      expect(evaluation.isMissingAttendance).toBe(false);
    });

    it('classifies dates before employee startDate as NOT_ELIGIBLE without missing attendance', () => {
      // startDate is 2026-10-01; evaluate 2026-09-29 (Tuesday)
      const evaluation = EligibilityEngine.evaluateDayAttendance({
        employee: activeEmployee,
        targetDateStr: '2026-09-29',
        currentTime: mondayMidday,
        dailyRecord: null,
      });

      expect(evaluation.dayAttendanceStatus).toBe('NOT_ELIGIBLE');
      expect(evaluation.isMissingAttendance).toBe(false);
    });

    it('evaluates past workday with active daily record as PRESENT', () => {
      // Friday 2026-10-02 with active record
      const evaluation = EligibilityEngine.evaluateDayAttendance({
        employee: activeEmployee,
        targetDateStr: '2026-10-02',
        currentTime: mondayMidday,
        dailyRecord: { id: 'rec-001', deletedAt: null },
      });

      expect(evaluation.dayAttendanceStatus).toBe('PRESENT');
      expect(evaluation.isMissingAttendance).toBe(false);
    });

    it('evaluates soft-deleted record as RECORD_DELETED and NOT missing (per baseline requirement)', () => {
      // Baseline: "Missing attendance dihitung, bukan baris palsu. Absensi terhapus bukan missing."
      const evaluation = EligibilityEngine.evaluateDayAttendance({
        employee: activeEmployee,
        targetDateStr: '2026-10-02',
        currentTime: mondayMidday,
        dailyRecord: { id: 'rec-001', deletedAt: new Date('2026-10-02T15:00:00Z') },
      });

      expect(evaluation.dayAttendanceStatus).toBe('RECORD_DELETED');
      expect(evaluation.isMissingAttendance).toBe(false);
    });

    it('evaluates past workday without attendance record as MISSING (tidak ada absensi)', () => {
      // Friday 2026-10-02 had no record
      const evaluation = EligibilityEngine.evaluateDayAttendance({
        employee: activeEmployee,
        targetDateStr: '2026-10-02',
        currentTime: mondayMidday,
        dailyRecord: null,
      });

      expect(evaluation.dayAttendanceStatus).toBe('MISSING');
      expect(evaluation.isMissingAttendance).toBe(true);
    });

    it('evaluates today during work hours (< 17:00 WIB) as PENDING_CHECK_IN (belum check-in)', () => {
      // Monday 2026-10-05 at 10:00 WIB (before 17:00 WIB)
      const morningCurrent = new Date('2026-10-05T03:00:00.000Z');
      const evaluation = EligibilityEngine.evaluateDayAttendance({
        employee: activeEmployee,
        targetDateStr: '2026-10-05',
        currentTime: morningCurrent,
        dailyRecord: null,
      });

      expect(evaluation.dayAttendanceStatus).toBe('PENDING_CHECK_IN');
      expect(evaluation.isMissingAttendance).toBe(false);
    });

    it('evaluates today after work hours (>= 17:00 WIB) as MISSING (tidak ada absensi)', () => {
      // Monday 2026-10-05 at 17:05 WIB (after 17:00 WIB) = 10:05 UTC
      const eveningCurrent = new Date('2026-10-05T10:05:00.000Z');
      const evaluation = EligibilityEngine.evaluateDayAttendance({
        employee: activeEmployee,
        targetDateStr: '2026-10-05',
        currentTime: eveningCurrent,
        dailyRecord: null,
      });

      expect(evaluation.dayAttendanceStatus).toBe('MISSING');
      expect(evaluation.isMissingAttendance).toBe(true);
    });
  });
});
