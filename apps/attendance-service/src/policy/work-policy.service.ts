import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.module';
import {
  DEFAULT_WORK_POLICY,
  TimePolicyEngine,
  type WorkPolicyConfig,
  type HolidayItem,
  type CheckInEvaluation,
  type CheckOutEvaluation,
} from './time-policy.engine';

@Injectable()
export class WorkPolicyService {
  private readonly logger = new Logger(WorkPolicyService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Retrieves the active work policy from the database or returns DEFAULT_WORK_POLICY.
   */
  async getActivePolicy(): Promise<WorkPolicyConfig> {
    const policy = await this.db.client.attWorkPolicy.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!policy) {
      return DEFAULT_WORK_POLICY;
    }

    return {
      id: policy.id,
      name: policy.name,
      workDays: policy.workDays,
      checkInTime: policy.checkInTime,
      checkOutTime: policy.checkOutTime,
      cutoffTime: policy.cutoffTime,
      timezone: policy.timezone,
      isActive: policy.isActive,
    };
  }

  /**
   * Ensures standard default policy exists in database.
   */
  async ensureDefaultPolicy(): Promise<WorkPolicyConfig> {
    const existing = await this.db.client.attWorkPolicy.findFirst({
      where: { isActive: true },
    });

    if (existing) {
      return {
        id: existing.id,
        name: existing.name,
        workDays: existing.workDays,
        checkInTime: existing.checkInTime,
        checkOutTime: existing.checkOutTime,
        cutoffTime: existing.cutoffTime,
        timezone: existing.timezone,
        isActive: existing.isActive,
      };
    }

    const created = await this.db.client.attWorkPolicy.create({
      data: {
        name: DEFAULT_WORK_POLICY.name,
        workDays: DEFAULT_WORK_POLICY.workDays,
        checkInTime: DEFAULT_WORK_POLICY.checkInTime,
        checkOutTime: DEFAULT_WORK_POLICY.checkOutTime,
        cutoffTime: DEFAULT_WORK_POLICY.cutoffTime,
        timezone: DEFAULT_WORK_POLICY.timezone,
        isActive: true,
      },
    });

    return {
      id: created.id,
      name: created.name,
      workDays: created.workDays,
      checkInTime: created.checkInTime,
      checkOutTime: created.checkOutTime,
      cutoffTime: created.cutoffTime,
      timezone: created.timezone,
      isActive: created.isActive,
    };
  }

  /**
   * Retrieves list of holidays between optional date range.
   */
  async getHolidays(startDate?: Date, endDate?: Date): Promise<HolidayItem[]> {
    const where: Record<string, unknown> = {};
    if (startDate || endDate) {
      where.holidayDate = {};
      if (startDate) (where.holidayDate as Record<string, unknown>).gte = startDate;
      if (endDate) (where.holidayDate as Record<string, unknown>).lte = endDate;
    }

    const rows = await this.db.client.attHoliday.findMany({
      where,
      orderBy: { holidayDate: 'asc' },
    });

    return rows.map((r) => ({
      holidayDate: r.holidayDate,
      description: r.description,
    }));
  }

  /**
   * Evaluates check-in for the current server time or specified time.
   */
  async evaluateCheckIn(serverTime: Date = new Date()): Promise<CheckInEvaluation> {
    const [policy, holidays] = await Promise.all([
      this.getActivePolicy(),
      this.getHolidays(),
    ]);

    return TimePolicyEngine.evaluateCheckIn(serverTime, policy, holidays);
  }

  /**
   * Evaluates checkout for the current server time or specified time against check-in date.
   */
  async evaluateCheckOut(
    attendanceDateStr: string,
    serverTime: Date = new Date(),
  ): Promise<CheckOutEvaluation> {
    const [policy, holidays] = await Promise.all([
      this.getActivePolicy(),
      this.getHolidays(),
    ]);

    return TimePolicyEngine.evaluateCheckOut(serverTime, attendanceDateStr, policy, holidays);
  }
}
