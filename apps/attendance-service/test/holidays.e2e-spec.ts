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
import { TimePolicyEngine } from '../src/policy/time-policy.engine';

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

describe('T17 Holidays API & Real MySQL Database Integration', () => {
  let app: INestApplication;
  let dbService: DatabaseService;

  const testId = randomUUID().slice(0, 8);
  const employeeId = randomUUID();

  // Helper for requests
  const api = () => request(app.getHttpServer());
  const asAdmin = () => ({ Authorization: 'Bearer admin' });
  const asEmployee = () => ({ Authorization: 'Bearer employee' });
  const asRestricted = () => ({ Authorization: 'Bearer restricted' });

  // Deterministic dates
  const todayWIB = TimePolicyEngine.getWibComponents(new Date()).dateString;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowWIB = TimePolicyEngine.getWibComponents(tomorrow).dateString;

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekWIB = TimePolicyEngine.getWibComponents(nextWeek).dateString;

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 10);
  const pastDateWIB = TimePolicyEngine.getWibComponents(pastDate).dateString;

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
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    dbService = app.get(DatabaseService);

    // Clean any leftover holidays for test dates
    await dbService.client.attHoliday.deleteMany({
      where: {
        holidayDate: {
          in: [
            new Date(`${todayWIB}T00:00:00.000Z`),
            new Date(`${tomorrowWIB}T00:00:00.000Z`),
            new Date(`${nextWeekWIB}T00:00:00.000Z`),
            new Date(`${pastDateWIB}T00:00:00.000Z`),
          ],
        },
      },
    });
  }, 30000);

  afterAll(async () => {
    try {
      // Clean up test events, daily records, holidays, and audit logs
      await dbService.client.attEvent.deleteMany({
        where: { dailyRecord: { employeeId } },
      });
      await dbService.client.attDailyRecord.deleteMany({
        where: { employeeId },
      });
      await dbService.client.attHoliday.deleteMany({
        where: {
          holidayDate: {
            in: [
              new Date(`${todayWIB}T00:00:00.000Z`),
              new Date(`${tomorrowWIB}T00:00:00.000Z`),
              new Date(`${nextWeekWIB}T00:00:00.000Z`),
              new Date(`${pastDateWIB}T00:00:00.000Z`),
            ],
          },
        },
      });
      await dbService.client.attAuditLog.deleteMany({
        where: {
          actorAccountId: ADMIN_ID,
        },
      });
    } catch {
      // Ignore
    }

    await app.close();
  }, 30000);

  describe('Authorization & Access Controls', () => {
    it('rejects POST /api/v1/holidays without Authorization header (401)', async () => {
      await api()
        .post('/api/v1/holidays')
        .send({ holidayDate: tomorrowWIB, description: 'Libur Baru' })
        .expect(401);
    });

    it('rejects POST /api/v1/holidays with employee token (403)', async () => {
      await api()
        .post('/api/v1/holidays')
        .set(asEmployee())
        .send({ holidayDate: tomorrowWIB, description: 'Libur Baru' })
        .expect(403);
    });

    it('rejects POST /api/v1/holidays with restricted admin token (403 must change password)', async () => {
      await api()
        .post('/api/v1/holidays')
        .set(asRestricted())
        .send({ holidayDate: tomorrowWIB, description: 'Libur Baru' })
        .expect(403);
    });
  });

  describe('POST /api/v1/holidays (Create Holiday)', () => {
    it('rejects creating holiday for past date (400 Bad Request)', async () => {
      const res = await api()
        .post('/api/v1/holidays')
        .set(asAdmin())
        .send({
          holidayDate: pastDateWIB,
          description: `Libur Lampau ${testId}`,
        })
        .expect(400);

      expect(res.body.message).toContain('Tanggal libur tidak boleh berupa tanggal lampau.');
    });

    it('successfully creates holiday for tomorrow and records audit log in MySQL', async () => {
      const desc = `Libur Besok ${testId}`;
      const res = await api()
        .post('/api/v1/holidays')
        .set(asAdmin())
        .send({
          holidayDate: tomorrowWIB,
          description: desc,
        })
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.holidayDate).toBe(tomorrowWIB);
      expect(res.body.data.description).toBe(desc);
      expect(res.body.data.isPast).toBe(false);

      // Verify persistence in MySQL att_holidays
      const inDb = await dbService.client.attHoliday.findUnique({
        where: { id: res.body.data.id },
      });
      expect(inDb).not.toBeNull();
      expect(inDb!.description).toBe(desc);

      // Verify audit log in MySQL att_audit_logs
      const audit = await dbService.client.attAuditLog.findFirst({
        where: {
          action: 'HOLIDAY_CREATED',
          entityId: res.body.data.id,
        },
      });
      expect(audit).not.toBeNull();
      expect(audit!.actorAccountId).toBe(ADMIN_ID);
      expect(audit!.entityType).toBe('HOLIDAY');
    });

    it('rejects creating holiday on duplicate date (409 Conflict)', async () => {
      const res = await api()
        .post('/api/v1/holidays')
        .set(asAdmin())
        .send({
          holidayDate: tomorrowWIB,
          description: `Libur Duplikat ${testId}`,
        })
        .expect(409);

      expect(res.body.message).toContain('Hari libur untuk tanggal tersebut sudah terdaftar.');
    });
  });

  describe('GET /api/v1/holidays (List & Filter)', () => {
    it('returns holidays list with pagination and isPast flag', async () => {
      const res = await api()
        .get('/api/v1/holidays')
        .set(asAdmin())
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);

      const found = res.body.data.find((h: any) => h.holidayDate === tomorrowWIB);
      expect(found).toBeDefined();
      expect(found.isPast).toBe(false);
    });

    it('supports search query parameter', async () => {
      const res = await api()
        .get('/api/v1/holidays')
        .set(asAdmin())
        .query({ search: `Libur Besok ${testId}` })
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].description).toContain(testId);
    });
  });

  describe('PATCH /api/v1/holidays/:id (Update Holiday)', () => {
    let createdHolidayId: string;

    beforeAll(async () => {
      const created = await api()
        .post('/api/v1/holidays')
        .set(asAdmin())
        .send({
          holidayDate: nextWeekWIB,
          description: `Libur Minggu Depan ${testId}`,
        })
        .expect(201);
      createdHolidayId = created.body.data.id;
    });

    it('rejects updating date to a past date (400 Bad Request)', async () => {
      const res = await api()
        .patch(`/api/v1/holidays/${createdHolidayId}`)
        .set(asAdmin())
        .send({
          holidayDate: pastDateWIB,
        })
        .expect(400);

      expect(res.body.message).toContain('Tanggal libur tidak boleh berupa tanggal lampau.');
    });

    it('rejects updating date to an already registered date (409 Conflict)', async () => {
      const res = await api()
        .patch(`/api/v1/holidays/${createdHolidayId}`)
        .set(asAdmin())
        .send({
          holidayDate: tomorrowWIB, // already used by previous test
        })
        .expect(409);

      expect(res.body.message).toContain('Hari libur untuk tanggal tersebut sudah terdaftar.');
    });

    it('successfully updates description and records audit log in MySQL', async () => {
      const updatedDesc = `Libur Diperbarui ${testId}`;
      const res = await api()
        .patch(`/api/v1/holidays/${createdHolidayId}`)
        .set(asAdmin())
        .send({
          description: updatedDesc,
        })
        .expect(200);

      expect(res.body.data.description).toBe(updatedDesc);

      const inDb = await dbService.client.attHoliday.findUnique({
        where: { id: createdHolidayId },
      });
      expect(inDb!.description).toBe(updatedDesc);

      const audit = await dbService.client.attAuditLog.findFirst({
        where: {
          action: 'HOLIDAY_UPDATED',
          entityId: createdHolidayId,
        },
      });
      expect(audit).not.toBeNull();
      expect(audit!.actorAccountId).toBe(ADMIN_ID);
    });

    it('rejects editing a past holiday directly seeded in database (400 Bad Request)', async () => {
      // Seed a past holiday directly in DB
      const pastHoliday = await dbService.client.attHoliday.create({
        data: {
          holidayDate: new Date(`${pastDateWIB}T00:00:00.000Z`),
          description: `Past Seeded ${testId}`,
        },
      });

      const res = await api()
        .patch(`/api/v1/holidays/${pastHoliday.id}`)
        .set(asAdmin())
        .send({
          description: 'Coba Edit Lampau',
        })
        .expect(400);

      expect(res.body.message).toContain('Hari libur tanggal lampau tidak dapat diubah.');
    });
  });

  describe('DELETE /api/v1/holidays/:id (Delete Holiday)', () => {
    it('rejects deleting a past holiday (400 Bad Request)', async () => {
      const pastHoliday = await dbService.client.attHoliday.findFirst({
        where: { holidayDate: new Date(`${pastDateWIB}T00:00:00.000Z`) },
      });

      const res = await api()
        .delete(`/api/v1/holidays/${pastHoliday!.id}`)
        .set(asAdmin())
        .expect(400);

      expect(res.body.message).toContain('Hari libur tanggal lampau tidak dapat dihapus.');
    });

    it('successfully deletes a future holiday, removes it from MySQL, and records audit log', async () => {
      const toDelete = await dbService.client.attHoliday.findFirst({
        where: { holidayDate: new Date(`${nextWeekWIB}T00:00:00.000Z`) },
      });

      const res = await api()
        .delete(`/api/v1/holidays/${toDelete!.id}`)
        .set(asAdmin())
        .expect(200);

      expect(res.body.data.message).toBe('Hari libur berhasil dihapus.');

      const inDb = await dbService.client.attHoliday.findUnique({
        where: { id: toDelete!.id },
      });
      expect(inDb).toBeNull();

      const audit = await dbService.client.attAuditLog.findFirst({
        where: {
          action: 'HOLIDAY_DELETED',
          entityId: toDelete!.id,
        },
      });
      expect(audit).not.toBeNull();
      expect(audit!.actorAccountId).toBe(ADMIN_ID);
    });
  });

  describe('Same-Day Holiday Creation & Snapshot Immutability', () => {
    it('preserves morning check-in event policy snapshot when holiday is created later in the day', async () => {
      const attDate = new Date(`${todayWIB}T00:00:00.000Z`);

      // 1. Employee checked in this morning before holiday was created
      const dailyRecord = await dbService.client.attDailyRecord.create({
        data: {
          employeeId,
          attendanceDate: attDate,
          departmentIdSnapshot: randomUUID(),
          departmentNameSnapshot: 'Dept Snapshot',
          positionIdSnapshot: randomUUID(),
          positionNameSnapshot: 'Pos Snapshot',
        },
      });

      const morningEventTime = new Date(`${todayWIB}T01:05:00.000Z`); // 08:05 WIB
      const initialPolicySnapshot = {
        scheduleType: 'REGULAR_WORKDAY',
        isWorkday: true,
        checkInTime: '08:00:00',
        checkOutTime: '17:00:00',
      };

      const event = await dbService.client.attEvent.create({
        data: {
          dailyRecordId: dailyRecord.id,
          eventType: 'CHECK_IN',
          eventTime: morningEventTime,
          clientCapturedAt: morningEventTime,
          isOutsideSchedule: false,
          isLate: true,
          reason: 'Terlambat karena macet pagi hari',
          photoObjectId: randomUUID(),
          captureMethod: 'AUTO',
          latitude: -6.2088,
          longitude: 106.8456,
          accuracyMeters: 10.5,
          locationCapturedAt: morningEventTime,
          policySnapshot: initialPolicySnapshot,
        },
      });

      // 2. HRD creates holiday for today in the afternoon
      const holidayRes = await api()
        .post('/api/v1/holidays')
        .set(asAdmin())
        .send({
          holidayDate: todayWIB,
          description: `Libur Spesial Hari Ini ${testId}`,
        })
        .expect(201);

      expect(holidayRes.body.data.holidayDate).toBe(todayWIB);

      // 3. Verify event's policySnapshot remains completely untouched (immutable snapshot)
      const fetchedEvent = await dbService.client.attEvent.findUnique({
        where: { id: event.id },
      });

      expect(fetchedEvent).not.toBeNull();
      expect(fetchedEvent!.isLate).toBe(true);
      expect(fetchedEvent!.reason).toBe('Terlambat karena macet pagi hari');
      expect((fetchedEvent!.policySnapshot as any).scheduleType).toBe('REGULAR_WORKDAY');
      expect((fetchedEvent!.policySnapshot as any).isWorkday).toBe(true);

      // 4. Verify schedule classification now reflects HOLIDAY
      const scheduleRes = await api()
        .get('/api/v1/policies/schedule')
        .query({ date: todayWIB })
        .expect(200);

      expect(scheduleRes.body.data.scheduleType).toBe('HOLIDAY');
      expect(scheduleRes.body.data.isWorkday).toBe(false);
      expect(scheduleRes.body.data.holidayDescription).toContain(`Libur Spesial Hari Ini ${testId}`);
    });
  });
});
