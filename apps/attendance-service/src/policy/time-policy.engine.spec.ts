import {
  TimePolicyEngine,
  type WorkPolicyConfig,
  type HolidayItem,
} from './time-policy.engine';

describe('TimePolicyEngine (T16 TDD Boundary & Schedule Tests)', () => {
  const customPolicy: WorkPolicyConfig = {
    id: 'test-policy-1',
    name: 'Standard WIB Test',
    workDays: '1,2,3,4,5',
    checkInTime: '08:00:00',
    checkOutTime: '17:00:00',
    cutoffTime: '23:59:59',
    timezone: 'Asia/Jakarta',
  };

  const holidays: HolidayItem[] = [
    {
      holidayDate: '2026-10-07',
      description: 'Hari Libur Nasional Dexa',
    },
  ];

  describe('WIB Time Conversion and Precision', () => {
    it('converts UTC Date correctly to WIB (UTC+7) components', () => {
      // 2026-10-02T01:00:00.000Z is 2026-10-02 08:00:00.000 WIB
      const utcDate = new Date('2026-10-02T01:00:00.000Z');
      const wib = TimePolicyEngine.getWibComponents(utcDate);

      expect(wib.year).toBe(2026);
      expect(wib.month).toBe(10);
      expect(wib.day).toBe(2);
      expect(wib.hours).toBe(8);
      expect(wib.minutes).toBe(0);
      expect(wib.seconds).toBe(0);
      expect(wib.millis).toBe(0);
      expect(wib.isoWeekday).toBe(5); // Friday
      expect(wib.dateString).toBe('2026-10-02');
      expect(wib.totalMillisOfDay).toBe(8 * 3600 * 1000);
    });

    it('handles millisecond precision across boundary', () => {
      // 2026-10-02T01:00:00.001Z is 2026-10-02 08:00:00.001 WIB
      const utcPlus1ms = new Date('2026-10-02T01:00:00.001Z');
      const wib = TimePolicyEngine.getWibComponents(utcPlus1ms);

      expect(wib.hours).toBe(8);
      expect(wib.millis).toBe(1);
      expect(wib.totalMillisOfDay).toBe(8 * 3600 * 1000 + 1);
    });
  });

  describe('Check-In Boundary Tests (08:00 WIB)', () => {
    it('evaluates check-in at 07:59:59.999 WIB as ON TIME (not late)', () => {
      // Friday 07:59:59.999 WIB = 00:59:59.999 UTC
      const time = new Date('2026-10-02T00:59:59.999Z');
      const result = TimePolicyEngine.evaluateCheckIn(time, customPolicy, holidays);

      expect(result.scheduleType).toBe('REGULAR_WORKDAY');
      expect(result.isOutsideSchedule).toBe(false);
      expect(result.isLate).toBe(false);
      expect(result.reasonRequired).toBe(false);
      expect(result.attendanceDate).toBe('2026-10-02');
    });

    it('evaluates check-in at EXACTLY 08:00:00.000 WIB as ON TIME (boundary threshold)', () => {
      // Friday 08:00:00.000 WIB = 01:00:00.000 UTC
      const time = new Date('2026-10-02T01:00:00.000Z');
      const result = TimePolicyEngine.evaluateCheckIn(time, customPolicy, holidays);

      expect(result.isLate).toBe(false);
      expect(result.reasonRequired).toBe(false);
    });

    it('evaluates check-in at 08:00:00.001 WIB as LATE (boundary +1ms)', () => {
      // Friday 08:00:00.001 WIB = 01:00:00.001 UTC
      const time = new Date('2026-10-02T01:00:00.001Z');
      const result = TimePolicyEngine.evaluateCheckIn(time, customPolicy, holidays);

      expect(result.isLate).toBe(true);
      expect(result.reasonRequired).toBe(true);
    });

    it('evaluates check-in at 08:30:00.000 WIB as LATE', () => {
      // Friday 08:30:00.000 WIB = 01:30:00.000 UTC
      const time = new Date('2026-10-02T01:30:00.000Z');
      const result = TimePolicyEngine.evaluateCheckIn(time, customPolicy, holidays);

      expect(result.isLate).toBe(true);
      expect(result.reasonRequired).toBe(true);
    });
  });

  describe('Check-Out Boundary Tests (17:00 WIB & 23:59:59 WIB Cutoff)', () => {
    it('evaluates checkout at 16:59:59.999 WIB as EARLY DEPARTURE (pulang lebih awal)', () => {
      // Friday 16:59:59.999 WIB = 09:59:59.999 UTC
      const time = new Date('2026-10-02T09:59:59.999Z');
      const result = TimePolicyEngine.evaluateCheckOut(time, '2026-10-02', customPolicy, holidays);

      expect(result.scheduleType).toBe('REGULAR_WORKDAY');
      expect(result.isOutsideSchedule).toBe(false);
      expect(result.isEarlyDeparture).toBe(true);
      expect(result.reasonRequired).toBe(true);
      expect(result.isCutoffPassed).toBe(false);
    });

    it('evaluates checkout at EXACTLY 17:00:00.000 WIB as NORMAL DEPARTURE (not early)', () => {
      // Friday 17:00:00.000 WIB = 10:00:00.000 UTC
      const time = new Date('2026-10-02T10:00:00.000Z');
      const result = TimePolicyEngine.evaluateCheckOut(time, '2026-10-02', customPolicy, holidays);

      expect(result.isEarlyDeparture).toBe(false);
      expect(result.reasonRequired).toBe(false);
      expect(result.isCutoffPassed).toBe(false);
    });

    it('evaluates checkout at 18:30:00.000 WIB as NORMAL DEPARTURE (not early, not auto-overtime)', () => {
      // Friday 18:30:00.000 WIB = 11:30:00.000 UTC
      const time = new Date('2026-10-02T11:30:00.000Z');
      const result = TimePolicyEngine.evaluateCheckOut(time, '2026-10-02', customPolicy, holidays);

      expect(result.isEarlyDeparture).toBe(false);
      expect(result.reasonRequired).toBe(false);
      expect(result.isCutoffPassed).toBe(false);
    });

    it('evaluates checkout at 23:59:59.999 WIB on attendance date as VALID (within daily cutoff)', () => {
      // Friday 23:59:59.999 WIB = 16:59:59.999 UTC
      const time = new Date('2026-10-02T16:59:59.999Z');
      const result = TimePolicyEngine.evaluateCheckOut(time, '2026-10-02', customPolicy, holidays);

      expect(result.isCutoffPassed).toBe(false);
      expect(result.isEarlyDeparture).toBe(false);
    });

    it('evaluates checkout at 00:00:00.000 WIB next day as CUTOFF PASSED (rejected)', () => {
      // Saturday 00:00:00.000 WIB = 17:00:00.000 UTC on 2026-10-02
      const nextDayMidnight = new Date('2026-10-02T17:00:00.000Z');
      const result = TimePolicyEngine.evaluateCheckOut(nextDayMidnight, '2026-10-02', customPolicy, holidays);

      expect(result.isCutoffPassed).toBe(true);
    });
  });

  describe('Weekend and Holiday Rules', () => {
    it('evaluates Saturday check-in as OUTSIDE_WORK_SCHEDULE without late penalty', () => {
      // Saturday 2026-10-03 at 09:30:00 WIB
      const saturday = new Date('2026-10-03T02:30:00.000Z');
      const result = TimePolicyEngine.evaluateCheckIn(saturday, customPolicy, holidays);

      expect(result.scheduleType).toBe('WEEKEND');
      expect(result.isOutsideSchedule).toBe(true);
      expect(result.isLate).toBe(false);
      expect(result.reasonRequired).toBe(false);
    });

    it('evaluates Saturday checkout as OUTSIDE_WORK_SCHEDULE without early penalty', () => {
      // Saturday 2026-10-03 at 14:00:00 WIB
      const saturdayCheckout = new Date('2026-10-03T07:00:00.000Z');
      const result = TimePolicyEngine.evaluateCheckOut(saturdayCheckout, '2026-10-03', customPolicy, holidays);

      expect(result.scheduleType).toBe('WEEKEND');
      expect(result.isOutsideSchedule).toBe(true);
      expect(result.isEarlyDeparture).toBe(false);
      expect(result.reasonRequired).toBe(false);
    });

    it('evaluates Holiday check-in as HOLIDAY without late penalty', () => {
      // Wednesday 2026-10-07 at 10:00:00 WIB
      const holiday = new Date('2026-10-07T03:00:00.000Z');
      const result = TimePolicyEngine.evaluateCheckIn(holiday, customPolicy, holidays);

      expect(result.scheduleType).toBe('HOLIDAY');
      expect(result.isOutsideSchedule).toBe(true);
      expect(result.isLate).toBe(false);
      expect(result.reasonRequired).toBe(false);
      expect(result.policySnapshot.holidayDescription).toBe('Hari Libur Nasional Dexa');
    });
  });

  describe('Snapshot Immutability under Mixed Calendar Changes', () => {
    it('preserves historical snapshot when policy/holidays are later changed', () => {
      // Check-in on a regular day at 08:30:00 WIB
      const morningTime = new Date('2026-10-05T01:30:00.000Z'); // Monday 08:30 WIB
      const morningResult = TimePolicyEngine.evaluateCheckIn(morningTime, customPolicy, []);

      expect(morningResult.isLate).toBe(true);
      expect(morningResult.policySnapshot.isOutsideSchedule).toBe(false);

      // Later that day, HRD adds 2026-10-05 as a company emergency holiday
      const updatedHolidays: HolidayItem[] = [
        ...holidays,
        { holidayDate: '2026-10-05', description: 'Libur Darurat Perusahaan' },
      ];

      // Checkout in the afternoon at 14:00:00 WIB
      const afternoonTime = new Date('2026-10-05T07:00:00.000Z'); // Monday 14:00 WIB
      const afternoonResult = TimePolicyEngine.evaluateCheckOut(afternoonTime, '2026-10-05', customPolicy, updatedHolidays);

      // Morning snapshot is unchanged
      expect(morningResult.isLate).toBe(true);
      expect(morningResult.policySnapshot.scheduleType).toBe('REGULAR_WORKDAY');

      // Afternoon event reflects the newly added holiday (outside schedule, no early penalty)
      expect(afternoonResult.scheduleType).toBe('HOLIDAY');
      expect(afternoonResult.isOutsideSchedule).toBe(true);
      expect(afternoonResult.isEarlyDeparture).toBe(false);
      expect(afternoonResult.policySnapshot.holidayDescription).toBe('Libur Darurat Perusahaan');
    });
  });
});
