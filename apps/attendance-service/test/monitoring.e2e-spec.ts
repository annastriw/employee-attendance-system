import {
  type INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { AuthClient, type SessionProfile } from '../src/auth/admin.guard';
import { AttendanceConfig } from '../src/config/attendance.config';
import { DatabaseService } from '../src/database/database.module';
import { AttendanceUpstreamClient, type EmployeeRosterItem } from '../src/checkin/attendance-upstream.client';

const ADMIN_ID = randomUUID();
const profiles: Record<string, SessionProfile> = {
  'Bearer admin': { id: ADMIN_ID, role: 'ADMIN_HRD', mustChangePassword: false },
  'Bearer employee': { id: randomUUID(), role: 'EMPLOYEE', mustChangePassword: false },
  'Bearer restricted': { id: randomUUID(), role: 'ADMIN_HRD', mustChangePassword: true },
};

const fakeAuth = {
  profile: (authorization: string) => {
    const profile = profiles[authorization];
    if (!profile) throw new UnauthorizedException('Sesi tidak valid. Silakan login kembali.');
    return Promise.resolve(profile);
  },
};

describe('T25 Monitoring API & Real MySQL Database Integration', () => {
  let app: INestApplication;
  let dbService: DatabaseService;

  const dept1Id = randomUUID();
  const dept2Id = randomUUID();
  const pos1Id = randomUUID();
  const pos2Id = randomUUID();

  const emp1Id = randomUUID();
  const emp2Id = randomUUID();
  const emp3Id = randomUUID();
  const emp4Id = randomUUID();

  // Test date on a past Monday to ensure deterministic workday evaluation
  const testDate = '2026-09-28'; // Monday 28 Sep 2026
  const testHolidayDate = '2026-09-29'; // Tuesday 29 Sep 2026

  const testRoster: EmployeeRosterItem[] = [
    {
      id: emp1Id,
      nik: 'EMP-M01',
      name: 'Aditya Pratama',
      startDate: '2026-09-01',
      status: 'ACTIVE',
      ready: true,
      departmentId: dept1Id,
      departmentName: 'Teknologi Informasi',
      positionId: pos1Id,
      positionName: 'Software Engineer',
      history: [],
    },
    {
      id: emp2Id,
      nik: 'EMP-M02',
      name: 'Budi Santoso',
      startDate: '2026-09-01',
      status: 'ACTIVE',
      ready: true,
      departmentId: dept1Id,
      departmentName: 'Teknologi Informasi',
      positionId: pos1Id,
      positionName: 'Frontend Engineer',
      history: [],
    },
    {
      id: emp3Id,
      nik: 'EMP-M03',
      name: 'Citra Dewi',
      startDate: '2026-09-01',
      status: 'ACTIVE',
      ready: true,
      departmentId: dept2Id,
      departmentName: 'Sumber Daya Manusia',
      positionId: pos2Id,
      positionName: 'HR Specialist',
      history: [],
    },
    {
      id: emp4Id,
      nik: 'EMP-M04',
      name: 'Doni Firmansyah',
      startDate: '2026-09-01',
      status: 'ACTIVE',
      ready: true,
      departmentId: dept2Id,
      departmentName: 'Sumber Daya Manusia',
      positionId: pos2Id,
      positionName: 'Recruiter',
      history: [],
    },
  ];

  const fakeUpstream = {
    roster: () => Promise.resolve(testRoster),
    employee: (id: string) => {
      const found = testRoster.find((r) => r.id === id);
      if (!found) throw new Error('Not found');
      return Promise.resolve({
        id: found.id,
        name: found.name,
        status: found.status,
        ready: found.ready,
        startDate: found.startDate,
        department: { id: found.departmentId, name: found.departmentName },
        position: { id: found.positionId, name: found.positionName },
      });
    },
  };

  const api = () => request(app.getHttpServer());
  const asAdmin = () => ({ Authorization: 'Bearer admin' });
  const asEmployee = () => ({ Authorization: 'Bearer employee' });
  const asRestricted = () => ({ Authorization: 'Bearer restricted' });

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    new AttendanceConfig();
    const testUrl = process.env.ATTENDANCE_TEST_DATABASE_URL!;
    process.env.ATTENDANCE_DATABASE_URL = testUrl;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthClient)
      .useValue(fakeAuth)
      .overrideProvider(AttendanceUpstreamClient)
      .useValue(fakeUpstream)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    dbService = app.get(DatabaseService);

    // Clean up any existing holiday for test date
    await dbService.client.attHoliday.deleteMany({
      where: {
        holidayDate: {
          in: [
            new Date(`${testHolidayDate}T00:00:00.000Z`),
          ],
        },
      },
    });

    // Seed test holiday
    await dbService.client.attHoliday.create({
      data: {
        holidayDate: new Date(`${testHolidayDate}T00:00:00.000Z`),
        description: 'Hari Libur Uji Coba',
      },
    });

    // Seed test attendance records on testDate (2026-09-28):
    // emp1: completed, late check-in, normal check-out
    await dbService.client.attDailyRecord.create({
      data: {
        employeeId: emp1Id,
        attendanceDate: new Date(`${testDate}T00:00:00.000Z`),
        departmentIdSnapshot: dept1Id,
        departmentNameSnapshot: 'Teknologi Informasi',
        positionIdSnapshot: pos1Id,
        positionNameSnapshot: 'Software Engineer',
        events: {
          create: [
            {
              eventType: 'CHECK_IN',
              eventTime: new Date(`${testDate}T01:15:00.000Z`), // 08:15 WIB
              clientCapturedAt: new Date(`${testDate}T01:15:00.000Z`),
              isLate: true,
              isEarlyDeparture: false,
              photoObjectId: randomUUID(),
              captureMethod: 'AUTO',
              latitude: -6.2088,
              longitude: 106.8456,
              accuracyMeters: 10.5,
              locationCapturedAt: new Date(`${testDate}T01:15:00.000Z`),
              policySnapshot: {},
            },
            {
              eventType: 'CHECK_OUT',
              eventTime: new Date(`${testDate}T10:00:00.000Z`), // 17:00 WIB
              clientCapturedAt: new Date(`${testDate}T10:00:00.000Z`),
              isLate: false,
              isEarlyDeparture: false,
              photoObjectId: randomUUID(),
              captureMethod: 'AUTO',
              latitude: -6.2088,
              longitude: 106.8456,
              accuracyMeters: 10.5,
              locationCapturedAt: new Date(`${testDate}T10:00:00.000Z`),
              policySnapshot: {},
            },
          ],
        },
      },
    });

    // emp2: checked in, on time, pending checkout
    await dbService.client.attDailyRecord.create({
      data: {
        employeeId: emp2Id,
        attendanceDate: new Date(`${testDate}T00:00:00.000Z`),
        departmentIdSnapshot: dept1Id,
        departmentNameSnapshot: 'Teknologi Informasi',
        positionIdSnapshot: pos1Id,
        positionNameSnapshot: 'Frontend Engineer',
        events: {
          create: [
            {
              eventType: 'CHECK_IN',
              eventTime: new Date(`${testDate}T00:55:00.000Z`), // 07:55 WIB
              clientCapturedAt: new Date(`${testDate}T00:55:00.000Z`),
              isLate: false,
              isEarlyDeparture: false,
              photoObjectId: randomUUID(),
              captureMethod: 'AUTO',
              latitude: -6.2088,
              longitude: 106.8456,
              accuracyMeters: 10.5,
              locationCapturedAt: new Date(`${testDate}T00:55:00.000Z`),
              policySnapshot: {},
            },
          ],
        },
      },
    });

    // emp3: soft-deleted record (NOT missing per baseline)
    await dbService.client.attDailyRecord.create({
      data: {
        employeeId: emp3Id,
        attendanceDate: new Date(`${testDate}T00:00:00.000Z`),
        departmentIdSnapshot: dept2Id,
        departmentNameSnapshot: 'Sumber Daya Manusia',
        positionIdSnapshot: pos2Id,
        positionNameSnapshot: 'HR Specialist',
        deletedAt: new Date(`${testDate}T05:00:00.000Z`),
        deleteReason: 'Penghapusan administratif untuk pengujian',
        deletedByAccountId: ADMIN_ID,
      },
    });

    // emp4: no record on past workday testDate -> will be calculated as MISSING
  }, 30000);

  afterAll(async () => {
    try {
      await dbService.client.attHoliday.deleteMany({
        where: {
          holidayDate: {
            in: [
              new Date(`${testHolidayDate}T00:00:00.000Z`),
            ],
          },
        },
      });
    } finally {
      await app.close();
    }
  });

  describe('Authorization on Monitoring Endpoints', () => {
    it('rejects unauthenticated request to /monitoring/summary with 401', async () => {
      const res = await api().get('/api/v1/monitoring/summary');
      expect(res.status).toBe(401);
    });

    it('rejects EMPLOYEE role request to /monitoring/summary with 403', async () => {
      const res = await api().get('/api/v1/monitoring/summary').set(asEmployee());
      expect(res.status).toBe(403);
    });

    it('rejects mustChangePassword = true request with 403', async () => {
      const res = await api().get('/api/v1/monitoring/summary').set(asRestricted());
      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated request to /monitoring/employees with 401', async () => {
      const res = await api().get('/api/v1/monitoring/employees');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/monitoring/summary with Real MySQL', () => {
    it('returns exact summary metrics on a workday with late, early, missing and deleted records', async () => {
      const res = await api()
        .get(`/api/v1/monitoring/summary?date=${testDate}`)
        .set(asAdmin());

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.date).toBe(testDate);
      expect(res.body.data.isWorkday).toBe(true);
      expect(res.body.data.scheduleType).toBe('REGULAR_WORKDAY');
      expect(res.body.data.activeEmployees).toBe(4);
      expect(res.body.data.checkedIn).toBe(2); // emp1 and emp2
      expect(res.body.data.late).toBe(1); // emp1
      expect(res.body.data.earlyDeparture).toBe(0);
      expect(res.body.data.pendingCheckout).toBe(1); // emp2
      expect(res.body.data.completed).toBe(1); // emp1
      expect(res.body.data.missingAttendance).toBe(1); // emp4 (past date, no record)
      expect(res.body.data.deletedCount).toBe(1); // emp3 (soft deleted)
      expect(res.body.meta.requestId).toBeDefined();
      expect(res.body.meta.serverTime).toBeDefined();
    });

    it('evaluates holiday with 0 missing attendance', async () => {
      const res = await api()
        .get(`/api/v1/monitoring/summary?date=${testHolidayDate}`)
        .set(asAdmin());

      expect(res.status).toBe(200);
      expect(res.body.data.isWorkday).toBe(false);
      expect(res.body.data.scheduleType).toBe('HOLIDAY');
      expect(res.body.data.missingAttendance).toBe(0);
    });
  });

  describe('GET /api/v1/monitoring/employees with Real MySQL', () => {
    it('returns list of all employees and their evaluated statuses', async () => {
      const res = await api()
        .get(`/api/v1/monitoring/employees?date=${testDate}`)
        .set(asAdmin());

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(4);
      expect(res.body.meta.total).toBe(4);

      const emp1 = res.body.data.find((e: any) => e.employeeId === emp1Id);
      expect(emp1.status).toBe('COMPLETED');
      expect(emp1.isLate).toBe(true);
      expect(emp1.recordId).toBeDefined();

      const emp2 = res.body.data.find((e: any) => e.employeeId === emp2Id);
      expect(emp2.status).toBe('CHECKED_IN');
      expect(emp2.isLate).toBe(false);
      expect(emp2.checkOutTime).toBeNull();

      const emp3 = res.body.data.find((e: any) => e.employeeId === emp3Id);
      expect(emp3.status).toBe('DELETED');
      expect(emp3.deletedAt).toBeDefined();

      const emp4 = res.body.data.find((e: any) => e.employeeId === emp4Id);
      expect(emp4.status).toBe('MISSING');
      expect(emp4.recordId).toBeNull();
    });

    it('filters by departmentId', async () => {
      const res = await api()
        .get(`/api/v1/monitoring/employees?date=${testDate}&departmentId=${dept2Id}`)
        .set(asAdmin());

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((e: any) => e.departmentId === dept2Id)).toBe(true);
    });

    it('filters by status MISSING', async () => {
      const res = await api()
        .get(`/api/v1/monitoring/employees?date=${testDate}&status=MISSING`)
        .set(asAdmin());

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].employeeId).toBe(emp4Id);
      expect(res.body.data[0].status).toBe('MISSING');
    });

    it('filters by status DELETED', async () => {
      const res = await api()
        .get(`/api/v1/monitoring/employees?date=${testDate}&status=DELETED`)
        .set(asAdmin());

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].employeeId).toBe(emp3Id);
      expect(res.body.data[0].status).toBe('DELETED');
    });

    it('filters by search keyword for name or NIK', async () => {
      const res = await api()
        .get(`/api/v1/monitoring/employees?date=${testDate}&search=Aditya`)
        .set(asAdmin());

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].employeeId).toBe(emp1Id);
    });

    it('rejects invalid date format with 400', async () => {
      const res = await api()
        .get('/api/v1/monitoring/employees?date=invalid-date')
        .set(asAdmin());

      expect(res.status).toBe(400);
    });
  });
});
