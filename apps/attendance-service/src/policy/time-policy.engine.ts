export interface WorkPolicyConfig {
  id: string;
  name: string;
  workDays: string; // e.g. "1,2,3,4,5"
  checkInTime: string; // e.g. "08:00:00"
  checkOutTime: string; // e.g. "17:00:00"
  cutoffTime: string; // e.g. "23:59:59"
  timezone: string; // e.g. "Asia/Jakarta"
  isActive?: boolean;
}

export interface HolidayItem {
  holidayDate: Date | string; // Date or "YYYY-MM-DD"
  description: string;
}

export type ScheduleType = 'REGULAR_WORKDAY' | 'WEEKEND' | 'HOLIDAY';

export interface WibTimeComponents {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hours: number;
  minutes: number;
  seconds: number;
  millis: number;
  isoWeekday: number; // 1 = Monday ... 7 = Sunday
  dateString: string; // YYYY-MM-DD
  timeString: string; // HH:mm:ss.SSS
  totalMillisOfDay: number;
}

export interface CheckInEvaluation {
  scheduleType: ScheduleType;
  isOutsideSchedule: boolean;
  isLate: boolean;
  reasonRequired: boolean;
  attendanceDate: string; // YYYY-MM-DD WIB
  policySnapshot: Record<string, unknown>;
}

export interface CheckOutEvaluation {
  scheduleType: ScheduleType;
  isOutsideSchedule: boolean;
  isEarlyDeparture: boolean;
  reasonRequired: boolean;
  isCutoffPassed: boolean;
  attendanceDate: string; // YYYY-MM-DD WIB
  policySnapshot: Record<string, unknown>;
}

export const DEFAULT_WORK_POLICY: WorkPolicyConfig = {
  id: 'standard-wib-default',
  name: 'Standard WIB 08:00-17:00',
  workDays: '1,2,3,4,5',
  checkInTime: '08:00:00',
  checkOutTime: '17:00:00',
  cutoffTime: '23:59:59',
  timezone: 'Asia/Jakarta',
  isActive: true,
};

export class TimePolicyEngine {
  /**
   * Converts a given Date to WIB (Asia/Jakarta = UTC+7) components with millisecond precision.
   */
  static getWibComponents(date: Date): WibTimeComponents {
    // WIB is strictly UTC+7 without Daylight Saving Time.
    const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
    const wibDate = new Date(date.getTime() + WIB_OFFSET_MS);

    const year = wibDate.getUTCFullYear();
    const month = wibDate.getUTCMonth() + 1;
    const day = wibDate.getUTCDate();
    const hours = wibDate.getUTCHours();
    const minutes = wibDate.getUTCMinutes();
    const seconds = wibDate.getUTCSeconds();
    const millis = wibDate.getUTCMilliseconds();

    // In JS getUTCDay(): 0 = Sun, 1 = Mon ... 6 = Sat
    // ISO weekday: 1 = Mon, ..., 7 = Sun
    const utcDay = wibDate.getUTCDay();
    const isoWeekday = utcDay === 0 ? 7 : utcDay;

    const pad = (n: number, width = 2) => String(n).padStart(width, '0');
    const dateString = `${year}-${pad(month)}-${pad(day)}`;
    const timeString = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
    const totalMillisOfDay = ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;

    return {
      year,
      month,
      day,
      hours,
      minutes,
      seconds,
      millis,
      isoWeekday,
      dateString,
      timeString,
      totalMillisOfDay,
    };
  }

  /**
   * Parse "HH:mm:ss" or "HH:mm:ss.SSS" into total milliseconds of day.
   */
  static parseTimeToMillis(timeStr: string): number {
    const [hms, msStr] = timeStr.split('.');
    const [h, m, s] = hms.split(':').map(Number);
    const ms = msStr ? Number(msStr.padEnd(3, '0').slice(0, 3)) : 0;
    return ((h * 60 + m) * 60 + s) * 1000 + ms;
  }

  /**
   * Evaluates the schedule classification for a given date.
   */
  static classifySchedule(
    wib: WibTimeComponents,
    policy: WorkPolicyConfig,
    holidays: HolidayItem[] = [],
  ): { scheduleType: ScheduleType; holiday?: HolidayItem } {
    // 1. Check holiday list
    const foundHoliday = holidays.find((h) => {
      const hDateStr = typeof h.holidayDate === 'string'
        ? h.holidayDate.slice(0, 10)
        : TimePolicyEngine.getWibComponents(h.holidayDate).dateString;
      return hDateStr === wib.dateString;
    });

    if (foundHoliday) {
      return { scheduleType: 'HOLIDAY', holiday: foundHoliday };
    }

    // 2. Check work days
    const allowedDays = policy.workDays.split(',').map((s) => Number(s.trim()));
    if (!allowedDays.includes(wib.isoWeekday)) {
      return { scheduleType: 'WEEKEND' };
    }

    return { scheduleType: 'REGULAR_WORKDAY' };
  }

  /**
   * Evaluates check-in time against policy.
   *
   * Threshold rule:
   * - <= 08:00:00.000 WIB -> On-time (isLate: false, reasonRequired: false)
   * - > 08:00:00.000 WIB (e.g. 08:00:00.001) -> Late (isLate: true, reasonRequired: true)
   * - Weekend / Holiday -> Outside schedule (isOutsideSchedule: true, isLate: false, reasonRequired: false)
   */
  static evaluateCheckIn(
    serverTime: Date,
    policy: WorkPolicyConfig = DEFAULT_WORK_POLICY,
    holidays: HolidayItem[] = [],
  ): CheckInEvaluation {
    const wib = this.getWibComponents(serverTime);
    const { scheduleType, holiday } = this.classifySchedule(wib, policy, holidays);
    const isOutsideSchedule = scheduleType !== 'REGULAR_WORKDAY';

    let isLate = false;
    let reasonRequired = false;

    if (!isOutsideSchedule) {
      const checkInCutoffMillis = this.parseTimeToMillis(policy.checkInTime); // e.g. 08:00:00 -> 28,800,000 ms
      // Up to 08:00:00.000 is on time; > 08:00:00.000 is late
      if (wib.totalMillisOfDay > checkInCutoffMillis) {
        isLate = true;
        reasonRequired = true;
      }
    }

    const policySnapshot = {
      policyId: policy.id,
      policyName: policy.name,
      timezone: policy.timezone,
      workDays: policy.workDays,
      checkInTime: policy.checkInTime,
      checkOutTime: policy.checkOutTime,
      cutoffTime: policy.cutoffTime,
      scheduleType,
      isOutsideSchedule,
      holidayDescription: holiday?.description ?? null,
    };

    return {
      scheduleType,
      isOutsideSchedule,
      isLate,
      reasonRequired,
      attendanceDate: wib.dateString,
      policySnapshot,
    };
  }

  /**
   * Evaluates checkout time against policy and check-in date.
   *
   * Threshold rule:
   * - Must be on same attendance date up to 23:59:59.999 WIB.
   * - If server checkout time is on a later date than attendanceDate, or after 23:59:59.999 WIB -> isCutoffPassed: true
   * - Before 17:00:00.000 WIB (up to 16:59:59.999 WIB) -> Early departure (isEarlyDeparture: true, reasonRequired: true)
   * - Starting at 17:00:00.000 WIB up to 23:59:59.999 WIB -> Normal departure (isEarlyDeparture: false, reasonRequired: false)
   * - Weekend / Holiday -> Outside schedule (isOutsideSchedule: true, isEarlyDeparture: false, reasonRequired: false)
   */
  static evaluateCheckOut(
    serverTime: Date,
    attendanceDateStr: string, // YYYY-MM-DD
    policy: WorkPolicyConfig = DEFAULT_WORK_POLICY,
    holidays: HolidayItem[] = [],
  ): CheckOutEvaluation {
    const wib = this.getWibComponents(serverTime);
    const { scheduleType, holiday } = this.classifySchedule(wib, policy, holidays);
    const isOutsideSchedule = scheduleType !== 'REGULAR_WORKDAY';

    // Verify same day cutoff
    const isCutoffPassed = wib.dateString !== attendanceDateStr;

    let isEarlyDeparture = false;
    let reasonRequired = false;

    if (!isOutsideSchedule && !isCutoffPassed) {
      const departureThresholdMillis = this.parseTimeToMillis(policy.checkOutTime); // e.g. 17:00:00 -> 61,200,000 ms
      // Before 17:00:00.000 is early departure
      if (wib.totalMillisOfDay < departureThresholdMillis) {
        isEarlyDeparture = true;
        reasonRequired = true;
      }
    }

    const policySnapshot = {
      policyId: policy.id,
      policyName: policy.name,
      timezone: policy.timezone,
      workDays: policy.workDays,
      checkInTime: policy.checkInTime,
      checkOutTime: policy.checkOutTime,
      cutoffTime: policy.cutoffTime,
      scheduleType,
      isOutsideSchedule,
      holidayDescription: holiday?.description ?? null,
    };

    return {
      scheduleType,
      isOutsideSchedule,
      isEarlyDeparture,
      reasonRequired,
      isCutoffPassed,
      attendanceDate: attendanceDateStr,
      policySnapshot,
    };
  }
}
