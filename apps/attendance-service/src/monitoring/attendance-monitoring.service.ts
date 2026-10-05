import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.module';
import { AttendanceUpstreamClient } from '../checkin/attendance-upstream.client';
import { WorkPolicyService } from '../policy/work-policy.service';
import {
  ServerClock,
  wib,
} from '../checkin/checkin-policy';
import {
  TimePolicyEngine,
  type HolidayItem,
} from '../policy/time-policy.engine';
import {
  EligibilityEngine,
  type EmployeeProfileSnapshot,
  type LifecycleHistoryEntry,
} from '../eligibility/eligibility.engine';
import type {
  MonitoringEmployeesQueryDto,
  MonitoringSummaryQueryDto,
  MonitoringTrendQueryDto,
} from './attendance-monitoring.dto';
import type { Prisma } from '@attendance/database';
import { monitoringTrendRange } from './monitoring-trend-range';

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

export interface MonitoringTrendPoint {
  date: string;
  present: number;
  late: number;
  absent: number;
  scheduleType: 'REGULAR_WORKDAY' | 'WEEKEND' | 'HOLIDAY';
  holiday: string | null;
}

type DailyWithEvents = Prisma.AttDailyRecordGetPayload<{
  include: { events: true };
}>;

@Injectable()
export class AttendanceMonitoringService {
  constructor(
    private readonly db: DatabaseService,
    private readonly upstream: AttendanceUpstreamClient,
    private readonly policyService: WorkPolicyService,
    private readonly clock: ServerClock,
  ) {}

  private resolveDate(dateParam?: string): string {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return dateParam;
    }
    return TimePolicyEngine.getWibComponents(this.clock.now()).dateString;
  }

  private async getHolidays(): Promise<HolidayItem[]> {
    const list = await this.db.client.attHoliday.findMany({
      select: { holidayDate: true, description: true },
    });
    return list.map((h) => ({
      holidayDate: h.holidayDate.toISOString().slice(0, 10),
      description: h.description,
    }));
  }

  async getTrend(query: MonitoringTrendQueryDto, requestId: string) {
    const range = monitoringTrendRange(query.startDate, query.endDate);
    if (!range) {
      throw new BadRequestException('Rentang tren harus valid dan maksimal 92 hari.');
    }
    const now = this.clock.now();
    const [roster, policy, holidays, dailyRecords] = await Promise.all([
      this.upstream.roster(requestId),
      this.policyService.getActivePolicy(),
      this.getHolidays(),
      this.db.client.attDailyRecord.findMany({
        where: {
          attendanceDate: {
            gte: new Date(`${range.startDate}T00:00:00.000Z`),
            lt: new Date(Date.parse(`${range.endDate}T00:00:00.000Z`) + 86_400_000),
          },
        },
        include: { events: true },
      }),
    ]);
    const recordsByDate = new Map<string, Map<string, DailyWithEvents>>();
    for (const record of dailyRecords) {
      const date = record.attendanceDate.toISOString().slice(0, 10);
      const byEmployee = recordsByDate.get(date) ?? new Map<string, DailyWithEvents>();
      byEmployee.set(record.employeeId, record);
      recordsByDate.set(date, byEmployee);
    }

    const snapshots = roster.map((employee) => ({
      employee: {
        id: employee.id,
        nik: employee.nik,
        name: employee.name,
        startDate: employee.startDate,
        status: employee.status,
        ready: employee.ready,
        departmentId: employee.departmentId,
        departmentName: employee.departmentName,
        positionId: employee.positionId,
        positionName: employee.positionName,
      } satisfies EmployeeProfileSnapshot,
      historyEntries: (employee.history || []).map((entry) => ({
        action: entry.action,
        before: entry.before,
        after: entry.after,
        createdAt: new Date(entry.createdAt),
      } satisfies LifecycleHistoryEntry)),
    }));

    const data: MonitoringTrendPoint[] = range.dates.map((date) => {
      const targetDate = TimePolicyEngine.getWibComponents(new Date(`${date}T12:00:00+07:00`));
      const schedule = TimePolicyEngine.classifySchedule(targetDate, policy, holidays);
      let present = 0;
      let late = 0;
      let absent = 0;
      const recordByEmployee = recordsByDate.get(date);
      for (const snapshot of snapshots) {
        const dailyRecord = recordByEmployee?.get(snapshot.employee.id) ?? null;
        const evaluation = EligibilityEngine.evaluateDayAttendance({
          ...snapshot,
          targetDateStr: date,
          currentTime: now,
          dailyRecord,
          policy,
          holidays,
        });
        if (evaluation.isMissingAttendance) absent++;
        if (!dailyRecord || dailyRecord.deletedAt) continue;
        const checkIn = dailyRecord.events.find((event) => event.eventType === 'CHECK_IN');
        if (!checkIn) continue;
        present++;
        if (checkIn.isLate) late++;
      }
      return {
        date,
        present,
        late,
        absent,
        scheduleType: schedule.scheduleType,
        holiday: schedule.holiday?.description ?? null,
      };
    });

    return {
      data,
      meta: { requestId, serverTime: wib(now), startDate: range.startDate, endDate: range.endDate },
    };
  }

  async getSummary(query: MonitoringSummaryQueryDto, requestId: string) {
    const targetDateStr = this.resolveDate(query.date);
    const now = this.clock.now();
    const policy = await this.policyService.getActivePolicy();
    const holidays = await this.getHolidays();

    const targetDateWib = TimePolicyEngine.getWibComponents(
      new Date(`${targetDateStr}T12:00:00+07:00`),
    );
    const { scheduleType } = TimePolicyEngine.classifySchedule(
      targetDateWib,
      policy,
      holidays,
    );
    const isWorkday = scheduleType === 'REGULAR_WORKDAY';

    const [roster, dailyRecords] = await Promise.all([
      this.upstream.roster(requestId),
      this.db.client.attDailyRecord.findMany({
        where: {
          attendanceDate: new Date(`${targetDateStr}T00:00:00Z`),
        },
        include: { events: true },
      }),
    ]);

    const recordByEmpId = new Map<string, DailyWithEvents>();
    for (const rec of dailyRecords) {
      recordByEmpId.set(rec.employeeId, rec);
    }

    let activeEmployees = 0;
    let checkedIn = 0;
    let late = 0;
    let earlyDeparture = 0;
    let pendingCheckout = 0;
    let completed = 0;
    let missingAttendance = 0;
    let deletedCount = 0;

    for (const emp of roster) {
      const dailyRecord = recordByEmpId.get(emp.id) ?? null;
      const historyEntries: LifecycleHistoryEntry[] = (emp.history || []).map(
        (h) => ({
          action: h.action,
          before: h.before,
          after: h.after,
          createdAt: new Date(h.createdAt),
        }),
      );

      const empSnapshot: EmployeeProfileSnapshot = {
        id: emp.id,
        nik: emp.nik,
        name: emp.name,
        startDate: emp.startDate,
        status: emp.status,
        ready: emp.ready,
        departmentId: emp.departmentId,
        departmentName: emp.departmentName,
        positionId: emp.positionId,
        positionName: emp.positionName,
      };

      const evaluation = EligibilityEngine.evaluateDayAttendance({
        employee: empSnapshot,
        historyEntries,
        targetDateStr,
        currentTime: now,
        dailyRecord,
        policy,
        holidays,
      });

      if (dailyRecord) {
        if (dailyRecord.deletedAt !== null) {
          deletedCount++;
        } else {
          const checkIn = dailyRecord.events.find(
            (e) => e.eventType === 'CHECK_IN',
          );
          const checkOut = dailyRecord.events.find(
            (e) => e.eventType === 'CHECK_OUT',
          );

          if (checkIn) {
            checkedIn++;
            if (checkIn.isLate) late++;
          }
          if (checkOut) {
            if (checkOut.isEarlyDeparture) earlyDeparture++;
          }
          if (checkIn && !checkOut) {
            pendingCheckout++;
          }
          if (checkIn && checkOut) {
            completed++;
          }
        }
      }

      // Obligated / active on date
      if (evaluation.activeStatusOnDate === 'ACTIVE') {
        if (isWorkday) {
          if (evaluation.isEmployeeEligible) {
            activeEmployees++;
          }
        } else {
          // Weekend or holiday: all active employees
          activeEmployees++;
        }
      }

      if (evaluation.isMissingAttendance) {
        missingAttendance++;
      }
    }

    return {
      data: {
        date: targetDateStr,
        isWorkday,
        scheduleType,
        workPolicy: {
          checkInTime: policy.checkInTime,
          checkOutTime: policy.checkOutTime,
        },
        activeEmployees,
        checkedIn,
        late,
        earlyDeparture,
        pendingCheckout,
        completed,
        missingAttendance,
        deletedCount,
      },
      meta: {
        requestId,
        serverTime: wib(now),
      },
    };
  }

  async getEmployees(query: MonitoringEmployeesQueryDto, requestId: string) {
    const targetDateStr = this.resolveDate(query.date);
    const now = this.clock.now();
    const policy = await this.policyService.getActivePolicy();
    const holidays = await this.getHolidays();

    const [roster, dailyRecords] = await Promise.all([
      this.upstream.roster(requestId),
      this.db.client.attDailyRecord.findMany({
        where: {
          attendanceDate: new Date(`${targetDateStr}T00:00:00Z`),
        },
        include: { events: true },
      }),
    ]);

    const recordByEmpId = new Map<string, DailyWithEvents>();
    for (const rec of dailyRecords) {
      recordByEmpId.set(rec.employeeId, rec);
    }

    const items: MonitoringEmployeeItem[] = [];

    for (const emp of roster) {
      const dailyRecord = recordByEmpId.get(emp.id) ?? null;
      const historyEntries: LifecycleHistoryEntry[] = (emp.history || []).map(
        (h) => ({
          action: h.action,
          before: h.before,
          after: h.after,
          createdAt: new Date(h.createdAt),
        }),
      );

      const empSnapshot: EmployeeProfileSnapshot = {
        id: emp.id,
        nik: emp.nik,
        name: emp.name,
        startDate: emp.startDate,
        status: emp.status,
        ready: emp.ready,
        departmentId: emp.departmentId,
        departmentName: emp.departmentName,
        positionId: emp.positionId,
        positionName: emp.positionName,
      };

      const evaluation = EligibilityEngine.evaluateDayAttendance({
        employee: empSnapshot,
        historyEntries,
        targetDateStr,
        currentTime: now,
        dailyRecord,
        policy,
        holidays,
      });

      const checkIn = dailyRecord?.events.find(
        (e) => e.eventType === 'CHECK_IN',
      );
      const checkOut = dailyRecord?.events.find(
        (e) => e.eventType === 'CHECK_OUT',
      );

      let status: MonitoringEmployeeItem['status'];
      if (dailyRecord) {
        if (dailyRecord.deletedAt !== null) {
          status = 'DELETED';
        } else if (checkIn && checkOut) {
          status = 'COMPLETED';
        } else if (checkIn) {
          status = 'CHECKED_IN';
        } else {
          status = 'CHECKED_IN';
        }
      } else {
        if (evaluation.dayAttendanceStatus === 'MISSING') {
          status = 'MISSING';
        } else if (evaluation.dayAttendanceStatus === 'PENDING_CHECK_IN') {
          status = 'PENDING_CHECK_IN';
        } else if (evaluation.dayAttendanceStatus === 'NON_WORKING_DAY') {
          status = 'NON_WORKING_DAY';
        } else {
          status = 'NOT_ELIGIBLE';
        }
      }

      const departmentId =
        dailyRecord?.departmentIdSnapshot || emp.departmentId;
      const departmentName =
        dailyRecord?.departmentNameSnapshot || emp.departmentName;
      const positionId = dailyRecord?.positionIdSnapshot || emp.positionId;
      const positionName =
        dailyRecord?.positionNameSnapshot || emp.positionName;

      items.push({
        employeeId: emp.id,
        nik: emp.nik,
        name: emp.name,
        departmentId,
        department: departmentName,
        positionId,
        position: positionName,
        attendanceDate: targetDateStr,
        status,
        isLate: checkIn?.isLate ?? false,
        isEarlyDeparture: checkOut?.isEarlyDeparture ?? false,
        checkInTime: checkIn ? wib(checkIn.eventTime) : null,
        checkOutTime: checkOut ? wib(checkOut.eventTime) : null,
        recordId: dailyRecord?.id ?? null,
        deletedAt: dailyRecord?.deletedAt ? wib(dailyRecord.deletedAt) : null,
      });
    }

    // Filters
    let filtered = items;

    if (query.departmentId) {
      const departmentId = query.departmentId.toLowerCase();
      filtered = filtered.filter((i) => i.departmentId?.toLowerCase() === departmentId);
    }

    if (query.search && query.search.trim().length > 0) {
      const q = query.search.trim().toLowerCase();
      filtered = filtered.filter(
        (i) => i.name.toLowerCase().includes(q) || i.nik.toLowerCase().includes(q),
      );
    }

    if (query.status && query.status !== 'ALL') {
      switch (query.status) {
        case 'CHECKED_IN':
          filtered = filtered.filter(
            (i) => i.status === 'CHECKED_IN' || i.status === 'COMPLETED',
          );
          break;
        case 'LATE':
          filtered = filtered.filter((i) => i.isLate && i.status !== 'DELETED');
          break;
        case 'EARLY_DEPARTURE':
          filtered = filtered.filter(
            (i) => i.isEarlyDeparture && i.status !== 'DELETED',
          );
          break;
        case 'PENDING_CHECKOUT':
          filtered = filtered.filter(
            (i) => i.status === 'CHECKED_IN' && !i.checkOutTime,
          );
          break;
        case 'COMPLETED':
          filtered = filtered.filter((i) => i.status === 'COMPLETED');
          break;
        case 'MISSING':
          filtered = filtered.filter((i) => i.status === 'MISSING');
          break;
        case 'PENDING_CHECK_IN':
          filtered = filtered.filter((i) => i.status === 'PENDING_CHECK_IN');
          break;
        case 'DELETED':
          filtered = filtered.filter((i) => i.status === 'DELETED');
          break;
      }
    }

    // Sort: name ASC, NIK ASC
    filtered.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, 'id');
      if (cmp !== 0) return cmp;
      return a.nik.localeCompare(b.nik, 'id');
    });

    const total = filtered.length;
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize || 20));
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

    return {
      data: paged,
      meta: {
        total,
        page,
        pageSize,
        date: targetDateStr,
        requestId,
        serverTime: wib(now),
      },
    };
  }
}
