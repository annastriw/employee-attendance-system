import { AttendanceMonitoringService } from './attendance-monitoring.service';
import { type EmployeeRosterItem } from '../checkin/attendance-upstream.client';
import { DEFAULT_WORK_POLICY } from '../policy/time-policy.engine';

describe('AttendanceMonitoringService (T25)', () => {
  let service: AttendanceMonitoringService;
  let mockDb: any;
  let mockUpstream: any;
  let mockPolicyService: any;
  let mockClock: any;

  const mockRoster: EmployeeRosterItem[] = [
    {
      id: 'emp-1',
      nik: 'NIK-001',
      name: 'Aditya Pratama',
      startDate: '2026-10-01',
      status: 'ACTIVE',
      ready: true,
      departmentId: 'dept-1',
      departmentName: 'Teknologi Informasi',
      positionId: 'pos-1',
      positionName: 'Software Engineer',
      history: [
        {
          action: 'EMPLOYEE_ACTIVATED',
          before: { status: 'INACTIVE' },
          after: { status: 'ACTIVE' },
          createdAt: '2026-10-01T08:00:00.000Z',
        },
      ],
    },
    {
      id: 'emp-2',
      nik: 'NIK-002',
      name: 'Budi Santoso',
      startDate: '2026-10-01',
      status: 'ACTIVE',
      ready: true,
      departmentId: 'dept-1',
      departmentName: 'Teknologi Informasi',
      positionId: 'pos-1',
      positionName: 'Frontend Engineer',
      history: [],
    },
    {
      id: 'emp-3',
      nik: 'NIK-003',
      name: 'Citra Dewi',
      startDate: '2026-10-01',
      status: 'INACTIVE', // currently inactive, but deactivated on Oct 06
      ready: true,
      departmentId: 'dept-2',
      departmentName: 'Sumber Daya Manusia',
      positionId: 'pos-2',
      positionName: 'HR Specialist',
      history: [
        {
          action: 'EMPLOYEE_ACTIVATED',
          before: { status: 'INACTIVE' },
          after: { status: 'ACTIVE' },
          createdAt: '2026-10-01T08:00:00.000Z',
        },
        {
          action: 'EMPLOYEE_DEACTIVATED',
          before: { status: 'ACTIVE' },
          after: { status: 'INACTIVE' },
          createdAt: '2026-10-06T09:00:00.000Z',
        },
      ],
    },
    {
      id: 'emp-4',
      nik: 'NIK-004',
      name: 'Doni Firmansyah',
      startDate: '2026-10-01',
      status: 'ACTIVE',
      ready: true,
      departmentId: 'dept-1',
      departmentName: 'Teknologi Informasi',
      positionId: 'pos-1',
      positionName: 'QA Engineer',
      history: [],
    },
  ];

  beforeEach(() => {
    // Current time is Monday 2026-10-05 18:00:00 WIB (after work hours)
    mockClock = {
      now: jest.fn().mockReturnValue(new Date('2026-10-05T11:00:00.000Z')),
    };

    mockPolicyService = {
      getActivePolicy: jest.fn().mockResolvedValue({
        ...DEFAULT_WORK_POLICY,
      }),
    };

    mockUpstream = {
      roster: jest.fn().mockResolvedValue(mockRoster),
    };

    mockDb = {
      client: {
        attHoliday: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        attDailyRecord: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      },
    };

    service = new AttendanceMonitoringService(
      mockDb,
      mockUpstream,
      mockPolicyService,
      mockClock,
    );
  });

  describe('getSummary', () => {
    it('calculates metrics accurately on a regular workday with late, early departure, and missing attendance', async () => {
      // emp-1: completed, late check-in, normal check-out
      // emp-2: checked in, on time, pending checkout
      // emp-3: soft-deleted record (not missing!)
      // emp-4: no record, target is Monday 2026-10-05 after 17:00 -> missing!
      const targetDate = '2026-10-05';

      mockDb.client.attDailyRecord.findMany.mockResolvedValue([
        {
          id: 'rec-1',
          employeeId: 'emp-1',
          attendanceDate: new Date('2026-10-05T00:00:00Z'),
          departmentIdSnapshot: 'dept-1',
          departmentNameSnapshot: 'Teknologi Informasi',
          positionIdSnapshot: 'pos-1',
          positionNameSnapshot: 'Software Engineer',
          deletedAt: null,
          events: [
            {
              id: 'ev-1',
              eventType: 'CHECK_IN',
              eventTime: new Date('2026-10-05T01:15:00.000Z'), // 08:15 WIB
              isLate: true,
              isEarlyDeparture: false,
            },
            {
              id: 'ev-2',
              eventType: 'CHECK_OUT',
              eventTime: new Date('2026-10-05T10:00:00.000Z'), // 17:00 WIB
              isLate: false,
              isEarlyDeparture: false,
            },
          ],
        },
        {
          id: 'rec-2',
          employeeId: 'emp-2',
          attendanceDate: new Date('2026-10-05T00:00:00Z'),
          departmentIdSnapshot: 'dept-1',
          departmentNameSnapshot: 'Teknologi Informasi',
          positionIdSnapshot: 'pos-1',
          positionNameSnapshot: 'Frontend Engineer',
          deletedAt: null,
          events: [
            {
              id: 'ev-3',
              eventType: 'CHECK_IN',
              eventTime: new Date('2026-10-05T00:55:00.000Z'), // 07:55 WIB
              isLate: false,
              isEarlyDeparture: false,
            },
          ],
        },
        {
          id: 'rec-3',
          employeeId: 'emp-3',
          attendanceDate: new Date('2026-10-05T00:00:00Z'),
          departmentIdSnapshot: 'dept-2',
          departmentNameSnapshot: 'Sumber Daya Manusia',
          positionIdSnapshot: 'pos-2',
          positionNameSnapshot: 'HR Specialist',
          deletedAt: new Date('2026-10-05T05:00:00.000Z'),
          events: [],
        },
      ]);

      const result = await service.getSummary({ date: targetDate }, 'req-123');

      expect(result.data.date).toBe('2026-10-05');
      expect(result.data.isWorkday).toBe(true);
      expect(result.data.scheduleType).toBe('REGULAR_WORKDAY');
      expect(result.data.activeEmployees).toBe(4); // all 4 were ACTIVE on 2026-10-05
      expect(result.data.checkedIn).toBe(2); // emp-1 and emp-2
      expect(result.data.late).toBe(1); // emp-1
      expect(result.data.earlyDeparture).toBe(0);
      expect(result.data.pendingCheckout).toBe(1); // emp-2
      expect(result.data.completed).toBe(1); // emp-1
      expect(result.data.missingAttendance).toBe(1); // emp-4 (past 17:00, no record)
      expect(result.data.deletedCount).toBe(1); // emp-3
      expect(result.meta.requestId).toBe('req-123');
    });

    it('returns 0 missing attendance on weekends and holidays', async () => {
      // Saturday 2026-10-03
      const targetDate = '2026-10-03';

      const result = await service.getSummary({ date: targetDate }, 'req-123');

      expect(result.data.date).toBe('2026-10-03');
      expect(result.data.isWorkday).toBe(false);
      expect(result.data.scheduleType).toBe('WEEKEND');
      expect(result.data.missingAttendance).toBe(0);
    });

    it('returns 0 missing attendance on national holidays', async () => {
      const targetDate = '2026-10-07';
      mockDb.client.attHoliday.findMany.mockResolvedValue([
        {
          holidayDate: new Date('2026-10-07T00:00:00Z'),
          description: 'Hari Libur Nasional',
        },
      ]);

      const result = await service.getSummary({ date: targetDate }, 'req-123');

      expect(result.data.date).toBe('2026-10-07');
      expect(result.data.isWorkday).toBe(false);
      expect(result.data.scheduleType).toBe('HOLIDAY');
      expect(result.data.missingAttendance).toBe(0);
    });
  });

  describe('getTrend', () => {
    it('counts historical check-ins and absences, and marks non-working dates', async () => {
      mockDb.client.attHoliday.findMany.mockResolvedValue([
        { holidayDate: new Date('2026-10-04T00:00:00.000Z'), description: 'Hari Libur Uji' },
      ]);
      mockDb.client.attDailyRecord.findMany.mockResolvedValue([
        {
          id: 'fri-late', employeeId: 'emp-1', attendanceDate: new Date('2026-10-02T00:00:00.000Z'), deletedAt: null,
          events: [{ eventType: 'CHECK_IN', isLate: true, isEarlyDeparture: false }],
        },
        {
          id: 'fri-present', employeeId: 'emp-2', attendanceDate: new Date('2026-10-02T00:00:00.000Z'), deletedAt: null,
          events: [{ eventType: 'CHECK_IN', isLate: false, isEarlyDeparture: false }],
        },
        {
          id: 'mon-present', employeeId: 'emp-1', attendanceDate: new Date('2026-10-05T00:00:00.000Z'), deletedAt: null,
          events: [{ eventType: 'CHECK_IN', isLate: false, isEarlyDeparture: false }],
        },
      ]);

      const result = await service.getTrend({
        startDate: '2026-10-02', endDate: '2026-10-05',
      } as any, 'request-trend');

      expect(result.data).toEqual([
        { date: '2026-10-02', present: 2, late: 1, absent: 2, scheduleType: 'REGULAR_WORKDAY', holiday: null },
        { date: '2026-10-03', present: 0, late: 0, absent: 0, scheduleType: 'WEEKEND', holiday: null },
        { date: '2026-10-04', present: 0, late: 0, absent: 0, scheduleType: 'HOLIDAY', holiday: 'Hari Libur Uji' },
        { date: '2026-10-05', present: 1, late: 0, absent: 3, scheduleType: 'REGULAR_WORKDAY', holiday: null },
      ]);
      expect(result.meta).toMatchObject({ requestId: 'request-trend', startDate: '2026-10-02', endDate: '2026-10-05' });
      expect(mockUpstream.roster).toHaveBeenCalledTimes(1);
      expect(mockDb.client.attDailyRecord.findMany).toHaveBeenCalledTimes(1);
    });

    it('rejects ranges longer than 92 days', async () => {
      await expect(service.getTrend({ startDate: '2026-01-01', endDate: '2026-04-03' } as any, 'request-trend'))
        .rejects.toThrow('maksimal 92 hari');
      expect(mockUpstream.roster).not.toHaveBeenCalled();
    });
  });

  describe('getEmployees', () => {
    it('matches department UUIDs regardless of letter case', async () => {
      const departmentId = '3b81c559-bfef-11f1-85c7-76e03cd5f3d3';
      mockUpstream.roster.mockResolvedValue([
        { ...mockRoster[0], departmentId },
        mockRoster[1],
      ]);
      const result = await service.getEmployees(
        { date: '2026-10-05', departmentId: departmentId.toUpperCase(), status: 'ALL', page: 1, pageSize: 20 },
        'req-case',
      );
      expect(result.data.map((item) => item.employeeId)).toEqual(['emp-1']);
    });
    it('returns all employees with accurate statuses, snapshots and pagination', async () => {
      const targetDate = '2026-10-05';
      mockDb.client.attDailyRecord.findMany.mockResolvedValue([
        {
          id: 'rec-1',
          employeeId: 'emp-1',
          attendanceDate: new Date('2026-10-05T00:00:00Z'),
          departmentIdSnapshot: 'dept-1',
          departmentNameSnapshot: 'Teknologi Informasi',
          positionIdSnapshot: 'pos-1',
          positionNameSnapshot: 'Software Engineer',
          deletedAt: null,
          events: [
            {
              id: 'ev-1',
              eventType: 'CHECK_IN',
              eventTime: new Date('2026-10-05T01:15:00.000Z'),
              isLate: true,
              isEarlyDeparture: false,
            },
            {
              id: 'ev-2',
              eventType: 'CHECK_OUT',
              eventTime: new Date('2026-10-05T10:00:00.000Z'),
              isLate: false,
              isEarlyDeparture: false,
            },
          ],
        },
      ]);

      const result = await service.getEmployees(
        { date: targetDate, page: 1, pageSize: 20, status: 'ALL' },
        'req-123',
      );

      expect(result.data.length).toBe(4);
      expect(result.meta.total).toBe(4);

      const emp1 = result.data.find((e) => e.employeeId === 'emp-1');
      expect(emp1?.status).toBe('COMPLETED');
      expect(emp1?.isLate).toBe(true);
      expect(emp1?.recordId).toBe('rec-1');

      const emp4 = result.data.find((e) => e.employeeId === 'emp-4');
      expect(emp4?.status).toBe('MISSING');
      expect(emp4?.recordId).toBeNull();
    });

    it('filters by departmentId', async () => {
      const targetDate = '2026-10-05';
      const result = await service.getEmployees(
        { date: targetDate, departmentId: 'dept-2', status: 'ALL', page: 1, pageSize: 20 },
        'req-123',
      );

      expect(result.data.length).toBe(1);
      expect(result.data[0].employeeId).toBe('emp-3');
      expect(result.data[0].departmentId).toBe('dept-2');
    });

    it('filters by search keyword for name or NIK', async () => {
      const targetDate = '2026-10-05';
      const result = await service.getEmployees(
        { date: targetDate, search: 'budi', status: 'ALL', page: 1, pageSize: 20 },
        'req-123',
      );

      expect(result.data.length).toBe(1);
      expect(result.data[0].name).toBe('Budi Santoso');
    });

    it('filters by status MISSING', async () => {
      const targetDate = '2026-10-05';
      const result = await service.getEmployees(
        { date: targetDate, status: 'MISSING', page: 1, pageSize: 20 },
        'req-123',
      );

      // emp-4 has no record and target date has ended -> MISSING
      expect(result.data.some((e) => e.employeeId === 'emp-4')).toBe(true);
      expect(result.data.every((e) => e.status === 'MISSING')).toBe(true);
    });
  });
});
