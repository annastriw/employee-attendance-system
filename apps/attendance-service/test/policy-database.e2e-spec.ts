import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { WorkPolicyService } from '../src/policy/work-policy.service';
import { DatabaseService } from '../src/database/database.module';

describe('T16 Attendance Policy & Real MySQL Database Integration', () => {
  let app: INestApplication;
  let policyService: WorkPolicyService;
  let dbService: DatabaseService;

  const testId = randomUUID().slice(0, 8);
  const employeeId = randomUUID();

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    policyService = app.get(WorkPolicyService);
    dbService = app.get(DatabaseService);
  }, 30000);

  afterAll(async () => {
    // Cleanup created test records
    try {
      await dbService.client.attEvent.deleteMany({
        where: { dailyRecord: { employeeId } },
      });
      await dbService.client.attDailyRecord.deleteMany({
        where: { employeeId },
      });
      await dbService.client.attHoliday.deleteMany({
        where: { holidayDate: new Date('2026-12-25T00:00:00.000Z') },
      });
    } catch {
      // Ignore cleanup error if already removed
    }

    await app.close();
  }, 30000);

  describe('Work Policy Persistence', () => {
    it('creates or fetches the standard default policy in MySQL with 08:00 and 17:00 WIB', async () => {
      const policy = await policyService.ensureDefaultPolicy();

      expect(policy.name).toBe('Standard WIB 08:00-17:00');
      expect(policy.checkInTime).toBe('08:00:00');
      expect(policy.checkOutTime).toBe('17:00:00');
      expect(policy.cutoffTime).toBe('23:59:59');
      expect(policy.timezone).toBe('Asia/Jakarta');
      expect(policy.isActive).toBe(true);

      const fetched = await policyService.getActivePolicy();
      expect(fetched.id).toBe(policy.id);
      expect(fetched.checkInTime).toBe('08:00:00');
    });

    it('exposes current policy via GET /api/v1/policies/current', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/policies/current')
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.timezone).toBe('Asia/Jakarta');
      expect(res.body.data.checkInTime).toBe('08:00:00');
      expect(res.body.data.checkOutTime).toBe('17:00:00');
    });

    it('exposes schedule classification via GET /api/v1/policies/schedule', async () => {
      const targetDate = '2026-10-07'; // Wednesday
      await dbService.client.attHoliday.deleteMany({
        where: { holidayDate: new Date(`${targetDate}T00:00:00.000Z`) },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/policies/schedule')
        .query({ date: targetDate })
        .expect(200);

      expect(res.body.data.date).toBe(targetDate);
      expect(res.body.data.scheduleType).toBe('REGULAR_WORKDAY');
      expect(res.body.data.isWorkday).toBe(true);
    });
  });

  describe('Holiday Persistence & Evaluation', () => {
    const holidayDate = new Date('2026-12-25T00:00:00.000Z');
    const holidayDesc = `Libur Uji ${testId}`;

    it('creates a holiday record and reflects it in schedule queries', async () => {
      await dbService.client.attHoliday.deleteMany({
        where: { holidayDate },
      });

      const holiday = await dbService.client.attHoliday.create({
        data: {
          holidayDate,
          description: holidayDesc,
        },
      });

      expect(holiday.description).toBe(holidayDesc);

      const holidays = await policyService.getHolidays();
      const found = holidays.find((h) => h.description === holidayDesc);
      expect(found).toBeDefined();

      const scheduleRes = await request(app.getHttpServer())
        .get('/api/v1/policies/schedule')
        .query({ date: '2026-12-25' })
        .expect(200);

      expect(scheduleRes.body.data.scheduleType).toBe('HOLIDAY');
      expect(scheduleRes.body.data.isWorkday).toBe(false);
      expect(scheduleRes.body.data.holidayDescription).toBe(holidayDesc);
    });
  });

  describe('Database Constraints (UNIQUE employee_id + attendance_date)', () => {
    it('enforces UNIQUE(employee_id, attendance_date) in att_daily_records even when soft-deleted', async () => {
      const attDate = new Date('2026-10-15T00:00:00.000Z');

      // 1. First record succeeds
      const record1 = await dbService.client.attDailyRecord.create({
        data: {
          employeeId,
          attendanceDate: attDate,
          departmentIdSnapshot: randomUUID(),
          departmentNameSnapshot: 'Dept Test',
          positionIdSnapshot: randomUUID(),
          positionNameSnapshot: 'Pos Test',
        },
      });

      expect(record1.id).toBeDefined();

      // 2. Inserting duplicate (same employee, same attendanceDate) throws P2002 unique constraint violation
      await expect(
        dbService.client.attDailyRecord.create({
          data: {
            employeeId,
            attendanceDate: attDate,
            departmentIdSnapshot: randomUUID(),
            departmentNameSnapshot: 'Dept Test 2',
            positionIdSnapshot: randomUUID(),
            positionNameSnapshot: 'Pos Test 2',
          },
        }),
      ).rejects.toThrow();

      // 3. Even after soft deleting record1, creating another record for same date must still be rejected
      await dbService.client.attDailyRecord.update({
        where: { id: record1.id },
        data: {
          deletedAt: new Date(),
          deleteReason: 'Dihapus untuk uji soft delete',
          deletedByAccountId: randomUUID(),
        },
      });

      await expect(
        dbService.client.attDailyRecord.create({
          data: {
            employeeId,
            attendanceDate: attDate,
            departmentIdSnapshot: randomUUID(),
            departmentNameSnapshot: 'Dept Test 3',
            positionIdSnapshot: randomUUID(),
            positionNameSnapshot: 'Pos Test 3',
          },
        }),
      ).rejects.toThrow();
    });

    it('enforces UNIQUE(daily_record_id, event_type) in att_events', async () => {
      const attDate = new Date('2026-10-16T00:00:00.000Z');

      const dailyRecord = await dbService.client.attDailyRecord.create({
        data: {
          employeeId,
          attendanceDate: attDate,
          departmentIdSnapshot: randomUUID(),
          departmentNameSnapshot: 'Dept Test',
          positionIdSnapshot: randomUUID(),
          positionNameSnapshot: 'Pos Test',
        },
      });

      const eventData = {
        dailyRecordId: dailyRecord.id,
        eventType: 'CHECK_IN' as const,
        eventTime: new Date(),
        clientCapturedAt: new Date(),
        isOutsideSchedule: false,
        isLate: false,
        isEarlyDeparture: false,
        photoObjectId: randomUUID(),
        captureMethod: 'AUTO' as const,
        latitude: -6.2088,
        longitude: 106.8456,
        accuracyMeters: 10.5,
        locationCapturedAt: new Date(),
        policySnapshot: { policy: 'standard' },
      };

      // First check-in event succeeds
      const event1 = await dbService.client.attEvent.create({ data: eventData });
      expect(event1.id).toBeDefined();

      // Second check-in event for same daily record fails with unique constraint
      await expect(
        dbService.client.attEvent.create({ data: eventData }),
      ).rejects.toThrow();
    });
  });

  describe('Least-Privilege Database Account Isolation', () => {
    it('restricts attendance runtime from directly querying or modifying auth or employee tables', async () => {
      // The attendance runtime account (attendance_attendance) should NOT have access to auth_accounts
      await expect(
        dbService.client.$queryRawUnsafe('SELECT COUNT(*) FROM auth_accounts'),
      ).rejects.toThrow();

      // Nor should it have access to emp_employees
      await expect(
        dbService.client.$queryRawUnsafe('SELECT COUNT(*) FROM emp_employees'),
      ).rejects.toThrow();
    });
  });
});
