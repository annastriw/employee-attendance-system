import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { createDatabaseClient } from '@attendance/database';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.module';
import { configureApp } from '../src/configure-app';
import { AttendanceConfig } from '../src/config/attendance.config';
import {
  ServerClock,
  wib,
  payloadHash,
  type CheckInInput,
} from '../src/checkin/checkin-policy';
import { AppModule as AuthModule } from '../../auth-service/dist/app.module';
import { AuthConfig } from '../../auth-service/dist/config/auth.config';
import { AuthService } from '../../auth-service/dist/auth/auth.service';
import { configureApp as configureAuth } from '../../auth-service/dist/configure-app';
import { AppModule as EmployeeModule } from '../../employee-service/dist/app.module';
import { EmployeeConfig } from '../../employee-service/dist/config/employee.config';
import { configureApp as configureEmployee } from '../../employee-service/dist/configure-app';
import { AppModule as MediaModule } from '../../media-service/dist/app.module';
import { MediaConfig } from '../../media-service/dist/config/media.config';
import { PhotoStorage } from '../../media-service/dist/storage/photo-storage.service';
import { configureApp as configureMedia } from '../../media-service/dist/configure-app';
import { AppModule as GatewayModule } from '../../api-gateway/dist/app.module';
import { GatewayConfig } from '../../api-gateway/dist/gateway.config';
import { configureApp as configureGateway } from '../../api-gateway/dist/configure-app';

import { AttendanceUpstreamClient } from '../src/checkin/attendance-upstream.client';
import { MediaOutboxWorker } from '../src/checkin/media-outbox.worker';
const authRequire = createRequire(
  resolve(__dirname, '../../auth-service/package.json'),
);
const { hash } = authRequire('bcrypt') as {
  hash: (s: string, rounds: number) => Promise<string>;
};
const mediaRequire = createRequire(
  resolve(__dirname, '../../media-service/package.json'),
);
const sharp = mediaRequire('sharp') as (input: unknown) => {
  jpeg(): { toBuffer(): Promise<Buffer> };
};
const { Client } = mediaRequire('minio') as {
  Client: new (options: unknown) => {
    removeObject(bucket: string, key: string): Promise<void>;
  };
};

describe('T21 real Gateway–Attendance–Employee–Media–Auth–MySQL–AIStor', () => {
  let attendance: INestApplication,
    auth: INestApplication,
    employee: INestApplication,
    media: INestApplication,
    gateway: INestApplication;
  let db: ReturnType<typeof createDatabaseClient>,
    rootStorage: InstanceType<typeof Client>;
  let storage: PhotoStorage, jpeg: Buffer;
  let time = new Date('2026-11-02T01:00:00.000Z');
  const accountIds = Array.from({ length: 4 }, () => randomUUID());
  const employeeIds = Array.from({ length: 3 }, () => randomUUID());
  const departmentId = randomUUID(),
    positionId = randomUUID(),
    prefix = randomUUID(),
    password = 'CheckIn-Test-Password-123';
  const tokens: string[] = [];
  const path = '/api/v1/me/attendance/check-in';
  const payload = (photoObjectId: string, reason?: string) => ({
    photoObjectId,
    clientCapturedAt: wib(time),
    captureMethod: 'AUTO',
    location: {
      latitude: -6,
      longitude: 106,
      accuracyMeters: 25,
      capturedAt: wib(time),
    },
    ...(reason ? { reason } : {}),
  });
  const checkIn = (
    body: object,
    key: string = randomUUID(),
    token = tokens[0],
    target = attendance,
  ) =>
    request(target.getHttpServer())
      .post(path)
      .set('Authorization', 'Bearer ' + token)
      .set('Idempotency-Key', key)
      .send(body);
  const upload = async (owner = 0, purpose = 'CHECK_IN') => {
    const res = await request(gateway.getHttpServer())
      .post('/api/v1/media/attendance-photos')
      .set('Authorization', 'Bearer ' + tokens[owner])
      .set('Idempotency-Key', randomUUID())
      .field('purpose', purpose)
      .attach('photo', jpeg, {
        filename: 'synthetic.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    return res.body.id as string;
  };
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const attendanceConfig = new AttendanceConfig(),
      authConfig = new AuthConfig(),
      employeeConfig = new EmployeeConfig(),
      mediaConfig = new MediaConfig();
    const url = new URL(process.env.TEST_DATABASE_URL!);
    if (
      url.hostname !== '127.0.0.1' ||
      url.port !== '3307' ||
      url.pathname !== '/attendance_test' ||
      mediaConfig.bucket !== 'attendance-photos-test'
    )
      throw new Error('Isolated test database and bucket required.');
    db = createDatabaseClient(url.toString());
    if (
      await db.attOutbox.count({
        where: { state: { in: ['PENDING', 'PROCESSING'] } },
      })
    )
      throw new Error(
        'Existing test outbox work must be resolved before the isolated recovery test.',
      );
    await db.empDepartment.create({
      data: {
        id: departmentId,
        name: 'CheckIn Dept ' + prefix,
        code: prefix.slice(0, 30),
      },
    });
    await db.empPosition.create({
      data: {
        id: positionId,
        name: 'CheckIn Role ' + prefix,
        code: prefix.slice(0, 30),
      },
    });
    await db.empEmployee.createMany({
      data: employeeIds.map((id, i) => ({
        id,
        nik: prefix.slice(0, 30) + '-' + i,
        name: 'Synthetic Employee ' + i,
        departmentId,
        positionId,
        status: 'ACTIVE',
        ready: true,
        startDate: new Date('2020-01-01'),
      })),
    });
    const passwordHash = await hash(password, 12);
    await db.authAccount.createMany({
      data: accountIds.map((id, i) => ({
        id,
        email: prefix + '-' + i + '@example.invalid',
        passwordHash,
        employeeId: i < 3 ? employeeIds[i] : null,
        role: i === 3 ? 'ADMIN_HRD' : 'EMPLOYEE',
        status: 'ACTIVE',
        mustChangePassword: i === 2,
      })),
    });
    const authModule = await Test.createTestingModule({ imports: [AuthModule] })
      .overrideProvider(AuthConfig)
      .useValue(
        Object.assign(authConfig, {
          databaseUrl: process.env.AUTH_TEST_DATABASE_URL,
        }),
      )
      .compile();
    auth = authModule.createNestApplication({ logger: false });
    configureAuth(auth);
    await auth.listen(0, '127.0.0.1');
    for (let i = 0; i < 4; i++)
      tokens[i] = (
        await auth
          .get(AuthService)
          .login(
            prefix + '-' + i + '@example.invalid',
            password,
            i === 3 ? 'ADMIN_HRD' : 'EMPLOYEE',
          )
      ).body.accessToken;
    const employeeModule = await Test.createTestingModule({
      imports: [EmployeeModule],
    })
      .overrideProvider(EmployeeConfig)
      .useValue(
        Object.assign(employeeConfig, {
          databaseUrl: process.env.EMPLOYEE_TEST_DATABASE_URL,
          authUrl: await auth.getUrl(),
          workerEnabled: false,
        }),
      )
      .compile();
    employee = employeeModule.createNestApplication({ logger: false });
    configureEmployee(employee);
    await employee.listen(0, '127.0.0.1');
    const mediaModule = await Test.createTestingModule({
      imports: [MediaModule],
    })
      .overrideProvider(MediaConfig)
      .useValue(Object.assign(mediaConfig, { authUrl: await auth.getUrl() }))
      .compile();
    media = mediaModule.createNestApplication({ logger: false });
    configureMedia(media);
    await media.listen(0, '127.0.0.1');
    storage = media.get(PhotoStorage);
    const attendanceModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AttendanceConfig)
      .useValue(
        Object.assign(attendanceConfig, {
          authUrl: await auth.getUrl(),
          employeeUrl: await employee.getUrl(),
          mediaUrl: await media.getUrl(),
          workerEnabled: false,
        }),
      )
      .overrideProvider(ServerClock)
      .useValue({ now: () => new Date(time) })
      .compile();
    attendance = attendanceModule.createNestApplication({ logger: false });
    configureApp(attendance);
    await attendance.listen(0, '127.0.0.1');
    const gatewayModule = await Test.createTestingModule({
      imports: [GatewayModule],
    })
      .overrideProvider(GatewayConfig)
      .useValue(
        Object.assign(new GatewayConfig(), {
          authUrl: await auth.getUrl(),
          attendanceUrl: await attendance.getUrl(),
          mediaUrl: await media.getUrl(),
        }),
      )
      .compile();
    gateway = gatewayModule.createNestApplication({
      logger: false,
      bodyParser: false,
    });
    configureGateway(gateway);
    await gateway.init();
    jpeg = await sharp({
      create: { width: 640, height: 480, channels: 3, background: '#999' },
    })
      .jpeg()
      .toBuffer();
    const root = parse(
      readFileSync(resolve(__dirname, '../../../.env.aistor')),
    );
    rootStorage = new Client({
      endPoint: '127.0.0.1',
      port: 9000,
      useSSL: false,
      region: 'us-east-1',
      accessKey: root.AISTOR_ROOT_USER,
      secretKey: root.AISTOR_ROOT_PASSWORD,
    });
  }, 60000);
  afterAll(async () => {
    jest.restoreAllMocks();
    for (const app of [gateway, attendance, media, employee, auth])
      await app?.close();
    if (!db) return;
    const rows = await db.mediaObject.findMany({
      where: { ownerEmployeeId: { in: employeeIds } },
    });
    for (const row of rows) {
      if (
        row.bucket !== 'attendance-photos-test' ||
        !row.objectKey.startsWith('attendance/' + row.ownerEmployeeId + '/')
      )
        throw new Error('Unsafe fixture cleanup.');
      await rootStorage?.removeObject(row.bucket, row.objectKey);
    }
    await db.mediaAuditLog.deleteMany({
      where: { entityId: { in: rows.map((r) => r.id) } },
    });
    await db.mediaObject.deleteMany({
      where: { ownerEmployeeId: { in: employeeIds } },
    });
    await db.attOutbox.deleteMany({
      where: { ownerEmployeeId: { in: employeeIds } },
    });
    await db.attAuditLog.deleteMany({
      where: { actorAccountId: { in: accountIds } },
    });
    await db.attIdempotencyRequest.deleteMany({
      where: { employeeId: { in: employeeIds } },
    });
    await db.attEvent.deleteMany({
      where: { dailyRecord: { employeeId: { in: employeeIds } } },
    });
    await db.attDailyRecord.deleteMany({
      where: { employeeId: { in: employeeIds } },
    });
    await db.authAuditLog.deleteMany({
      where: { targetAccountId: { in: accountIds } },
    });
    await db.authSession.deleteMany({
      where: { accountId: { in: accountIds } },
    });
    await db.authAccount.deleteMany({ where: { id: { in: accountIds } } });
    await db.empEmployee.deleteMany({ where: { id: { in: employeeIds } } });
    await db.empDepartment.deleteMany({ where: { id: departmentId } });
    await db.empPosition.deleteMany({ where: { id: positionId } });
    await db.$disconnect();
  }, 60000);
  it('stores a READY photo, location, server time, snapshot, audit and outbox atomically', async () => {
    const id = await upload();
    const row = await db.mediaObject.findUniqueOrThrow({ where: { id } });
    expect(await storage.matches(row.objectKey, row.checksumSha256)).toBe(true);
    const result = await checkIn(payload(id)).expect(201);
    expect(result.body.data.checkIn.eventTime).toBe(wib(time));
    expect(result.body.data.checkIn.isLate).toBe(false);
    expect(result.body.data.checkIn.location.latitude).toBe(-6);
    expect(await db.attEvent.count({ where: { photoObjectId: id } })).toBe(1);
    expect(await db.attOutbox.count({ where: { photoObjectId: id } })).toBe(1);
  });

  it('returns today without inventing a record and rejects non-employee/forced-change sessions', async () => {
    time = new Date('2026-11-03T00:00:00Z');
    const res = await request(gateway.getHttpServer())
      .get('/api/v1/me/attendance/today')
      .set('Authorization', 'Bearer ' + tokens[0])
      .expect(200);
    expect(res.body.data).toMatchObject({
      status: 'NOT_CHECKED_IN',
      record: null,
      eligible: true,
      reasonRequired: false,
    });
    await checkIn(
      payload(randomUUID()),
      randomUUID(),
      tokens[3],
      gateway,
    ).expect(403);
    await checkIn(
      payload(randomUUID()),
      randomUUID(),
      tokens[2],
      gateway,
    ).expect(403);
    await request(gateway.getHttpServer())
      .get('/api/v1/me/attendance/today')
      .expect(401);
  });
  it('requires a late reason at the server boundary, reuses READY evidence with a new corrected intent, and snapshots the profile', async () => {
    time = new Date('2026-11-03T01:00:00.001Z');
    const id = await upload();
    const key = randomUUID(),
      input = payload(id);
    const rejected = await checkIn(input, key, tokens[0], gateway).expect(422);
    expect(rejected.body.error.code).toBe('REASON_REQUIRED');
    expect(await db.attEvent.count({ where: { photoObjectId: id } })).toBe(0);
    const result = await checkIn(
      payload(id, '  Kendala jaringan  '),
      randomUUID(),
      tokens[0],
      gateway,
    ).expect(201);
    expect(result.body.data.checkIn).toMatchObject({
      isLate: true,
      reason: 'Kendala jaringan',
      eventTime: wib(time),
    });
    const record = await db.attDailyRecord.findUniqueOrThrow({
      where: { id: result.body.data.id },
    });
    expect(record.departmentNameSnapshot).toBe('CheckIn Dept ' + prefix);
    await db.empDepartment.update({
      where: { id: departmentId },
      data: { name: 'Changed ' + prefix },
    });
    expect(
      (await db.attDailyRecord.findUniqueOrThrow({ where: { id: record.id } }))
        .departmentNameSnapshot,
    ).toBe(record.departmentNameSnapshot);
  });
  it('replays the original successful result despite stale GPS and a later day, rejects a changed payload, and scopes reconciliation to its owner', async () => {
    time = new Date('2026-11-04T00:00:00Z');
    const id = await upload(),
      key = randomUUID(),
      input = payload(id);
    const first = await checkIn(input, key, tokens[0], gateway).expect(201);
    time = new Date('2026-11-05T00:00:00Z');
    expect(
      (await checkIn(input, key, tokens[0], gateway).expect(201)).body,
    ).toEqual(first.body);
    const conflict = await checkIn(
      { ...input, reason: 'changed' },
      key,
      tokens[0],
      gateway,
    ).expect(409);
    expect(conflict.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
    const status = await request(gateway.getHttpServer())
      .get('/api/v1/me/attendance/requests/' + key)
      .set('Authorization', 'Bearer ' + tokens[0])
      .expect(200);
    expect(status.body.data).toMatchObject({
      state: 'SUCCEEDED',
      response: first.body,
    });
    await request(gateway.getHttpServer())
      .get('/api/v1/me/attendance/requests/' + key)
      .set('Authorization', 'Bearer ' + tokens[1])
      .expect(404);
  });
  it('rejects stale GPS, wrong photo scope, unknown fields and unzoned timestamps without creating attendance', async () => {
    time = new Date('2026-11-05T00:00:00Z');
    const id = await upload(),
      input = payload(id);
    input.location.capturedAt = wib(new Date(time.getTime() - 60001));
    expect(
      (await checkIn(input, randomUUID(), tokens[0], gateway).expect(422)).body
        .error.code,
    ).toBe('LOCATION_STALE');
    await checkIn(
      payload(await upload(1)),
      randomUUID(),
      tokens[0],
      gateway,
    ).expect(422);
    await checkIn(
      payload(await upload(0, 'CHECK_OUT')),
      randomUUID(),
      tokens[0],
      gateway,
    ).expect(422);
    await checkIn(
      { ...payload(id), employeeId: employeeIds[1] },
      randomUUID(),
      tokens[0],
      gateway,
    ).expect(400);
    await checkIn(
      { ...payload(id), clientCapturedAt: '2026-11-05T07:00:00' },
      randomUUID(),
      tokens[0],
      gateway,
    ).expect(400);
    await checkIn(
      { ...payload(id), location: { ...payload(id).location, latitude: 91 } },
      randomUUID(),
      tokens[0],
      gateway,
    ).expect(400);
    await checkIn(payload(id), 'invalid-key', tokens[0], gateway).expect(400);
    await request(gateway.getHttpServer())
      .get('/api/v1/me/attendance/today?employeeId=other')
      .set('Authorization', 'Bearer ' + tokens[0])
      .expect(400);
    expect(
      await db.attDailyRecord.count({
        where: {
          employeeId: employeeIds[0],
          attendanceDate: new Date('2026-11-05'),
        },
      }),
    ).toBe(0);
    await checkIn(payload(id), randomUUID(), tokens[0], gateway).expect(201);
  });
  it('rejects inactive/not-ready/future-start profiles even with a valid Auth session', async () => {
    time = new Date('2026-11-06T00:00:00Z');
    const id = await upload();
    for (const patch of [
      { status: 'INACTIVE' as const },
      { status: 'ACTIVE' as const, ready: false },
      { ready: true, startDate: new Date('2030-01-01') },
    ]) {
      await db.empEmployee.update({
        where: { id: employeeIds[0] },
        data: patch,
      });
      expect(
        (
          await checkIn(payload(id), randomUUID(), tokens[0], gateway).expect(
            403,
          )
        ).body.error.code,
      ).toBe('EMPLOYEE_INELIGIBLE');
    }
    await db.empEmployee.update({
      where: { id: employeeIds[0] },
      data: {
        status: 'ACTIVE',
        ready: true,
        startDate: new Date('2020-01-01'),
      },
    });
    await checkIn(payload(id), randomUUID(), tokens[0], gateway).expect(201);
  });
  it('allows one event under same-key concurrent delivery and restores its durable result', async () => {
    time = new Date('2026-11-07T03:00:00Z');
    const id = await upload(),
      input = payload(id),
      key = randomUUID();
    const results = await Promise.all([
      checkIn(input, key, tokens[0], gateway),
      checkIn(input, key, tokens[0], gateway),
    ]);
    expect(results.map((r) => r.status)).toContain(201);
    expect(results.every((r) => [201, 409].includes(r.status))).toBe(true);
    expect(
      (await checkIn(input, key, tokens[0], gateway).expect(201)).body.data
        .checkIn.isOutsideSchedule,
    ).toBe(true);
    expect(await db.attEvent.count({ where: { photoObjectId: id } })).toBe(1);
  });
  it('keeps the daily unique constraint under different keys and after HRD deletion', async () => {
    time = new Date('2026-11-08T03:00:00Z');
    const a = await upload(),
      b = await upload();
    const results = await Promise.all([
      checkIn(payload(a), randomUUID(), tokens[0], gateway),
      checkIn(payload(b), randomUUID(), tokens[0], gateway),
    ]);
    expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      201, 409,
    ]);
    const row = await db.attDailyRecord.findFirstOrThrow({
      where: {
        employeeId: employeeIds[0],
        attendanceDate: new Date('2026-11-08'),
      },
    });
    await db.attDailyRecord.update({
      where: { id: row.id },
      data: {
        deletedAt: new Date(),
        deletedByAccountId: accountIds[3],
        deleteReason: 'Synthetic test',
      },
    });
    const today = await request(gateway.getHttpServer())
      .get('/api/v1/me/attendance/today')
      .set('Authorization', 'Bearer ' + tokens[0])
      .expect(200);
    expect(today.body.data.status).toBe('DELETED');
    expect(today.body.data.record.checkIn.photoObjectId).toBeUndefined();
    await checkIn(
      payload(await upload()),
      randomUUID(),
      tokens[0],
      gateway,
    ).expect(409);
    expect(await db.attEvent.count({ where: { dailyRecordId: row.id } })).toBe(
      1,
    );
  });
  it('takes over an expired pending claim without duplicating attendance', async () => {
    time = new Date('2026-11-09T00:00:00Z');
    const id = await upload(),
      input = payload(id),
      key = randomUUID();
    await db.attIdempotencyRequest.create({
      data: {
        id: key,
        employeeId: employeeIds[0],
        payloadHash: payloadHash(input as CheckInInput),
        state: 'PENDING',
        claimToken: randomUUID(),
        leaseUntil: new Date(time.getTime() - 1),
      },
    });
    await checkIn(input, key, tokens[0], gateway).expect(201);
    expect(
      (await db.attIdempotencyRequest.findUniqueOrThrow({ where: { id: key } }))
        .state,
    ).toBe('SUCCEEDED');
  });
  it('prevents a stale request worker from committing after another claim replaces it', async () => {
    time = new Date('2026-11-10T00:00:00Z');
    const id = await upload(),
      key = randomUUID(),
      input = payload(id),
      client = attendance.get(AttendanceUpstreamClient);
    const original = client.inspect.bind(client);
    const spy = jest
      .spyOn(client, 'inspect')
      .mockImplementationOnce(async (...args) => {
        await original(...args);
        await db.attIdempotencyRequest.update({
          where: { id: key },
          data: {
            claimToken: randomUUID(),
            leaseUntil: new Date(time.getTime() + 30000),
          },
        });
      });
    await checkIn(input, key, tokens[0], gateway).expect(503);
    spy.mockRestore();
    expect(await db.attEvent.count({ where: { photoObjectId: id } })).toBe(0);
    expect(
      (await db.attIdempotencyRequest.findUniqueOrThrow({ where: { id: key } }))
        .state,
    ).toBe('PENDING');
    await db.attIdempotencyRequest.update({
      where: { id: key },
      data: { leaseUntil: new Date(time.getTime() - 1) },
    });
    await checkIn(input, key, tokens[0], gateway).expect(201);
  });

  it('reads a durable success when the transaction committed but its response was lost', async () => {
    time = new Date('2026-11-12T00:00:00Z');
    const id = await upload(1),
      key = randomUUID();
    const runtime = attendance.get(DatabaseService).client;
    const original = runtime.$transaction.bind(runtime);
    const spy = jest
      .spyOn(runtime, '$transaction')
      .mockImplementationOnce(
        async (...args: Parameters<typeof runtime.$transaction>) => {
          await original(...args);
          throw new Error('Synthetic response lost after commit');
        },
      );
    try {
      await checkIn(payload(id), key, tokens[1], gateway).expect(201);
      expect(await db.attEvent.count({ where: { photoObjectId: id } })).toBe(1);
      expect(
        (
          await db.attIdempotencyRequest.findUniqueOrThrow({
            where: { id: key },
          })
        ).state,
      ).toBe('SUCCEEDED');
    } finally {
      spy.mockRestore();
    }
  });

  it('recovers binding after a lost Media response and records exactly one binding audit', async () => {
    const client = attendance.get(AttendanceUpstreamClient),
      original = client.bind.bind(client);
    const spy = jest
      .spyOn(client, 'bind')
      .mockImplementation(async (...args) => {
        await original(...args);
        throw new Error('Synthetic lost response');
      });
    await attendance.get(MediaOutboxWorker).drain();
    spy.mockRestore();
    const owned = await db.attOutbox.findMany({
      where: { ownerEmployeeId: { in: employeeIds } },
    });
    expect(owned.length).toBeGreaterThan(0);
    expect(owned.every((r) => r.state === 'PENDING')).toBe(true);
    await db.attOutbox.updateMany({
      where: { ownerEmployeeId: { in: employeeIds } },
      data: { nextAttemptAt: new Date(0) },
    });
    await attendance.get(MediaOutboxWorker).drain();
    await attendance.get(MediaOutboxWorker).drain();
    for (const row of owned) {
      expect(
        (await db.attOutbox.findUniqueOrThrow({ where: { id: row.id } })).state,
      ).toBe('DELIVERED');
      expect(
        (
          await db.mediaObject.findUniqueOrThrow({
            where: { id: row.photoObjectId },
          })
        ).boundEventId,
      ).toBe(row.eventId);
      expect(
        await db.mediaAuditLog.count({
          where: { entityId: row.photoObjectId, action: 'ATTENDANCE_BOUND' },
        }),
      ).toBe(1);
    }
  });

  it('prevents a stale outbox claim from acknowledging another worker and safely redelivers an expired claim', async () => {
    time = new Date('2026-11-13T00:00:00Z');
    const id = await upload(1);
    await checkIn(payload(id), randomUUID(), tokens[1], gateway).expect(201);
    const row = await db.attOutbox.findFirstOrThrow({
      where: { photoObjectId: id },
    });
    const client = attendance.get(AttendanceUpstreamClient),
      original = client.bind.bind(client),
      replacement = randomUUID();
    const spy = jest
      .spyOn(client, 'bind')
      .mockImplementationOnce(async (...args) => {
        await original(...args);
        await db.attOutbox.update({
          where: { id: row.id },
          data: {
            claimToken: replacement,
            leaseUntil: new Date(Date.now() + 30000),
          },
        });
      });
    await attendance.get(MediaOutboxWorker).drain();
    spy.mockRestore();
    expect(
      await db.attOutbox.findUniqueOrThrow({ where: { id: row.id } }),
    ).toMatchObject({
      state: 'PROCESSING',
      claimToken: replacement,
      deliveredAt: null,
    });
    await db.attOutbox.update({
      where: { id: row.id },
      data: { leaseUntil: new Date(0) },
    });
    await attendance.get(MediaOutboxWorker).drain();
    expect(
      (await db.attOutbox.findUniqueOrThrow({ where: { id: row.id } })).state,
    ).toBe('DELIVERED');
    expect(
      await db.mediaAuditLog.count({
        where: { entityId: id, action: 'ATTENDANCE_BOUND' },
      }),
    ).toBe(1);
  });

  const checkout = (body: object, key = randomUUID(), token = tokens[0]) =>
    request(gateway.getHttpServer())
      .post('/api/v1/me/attendance/check-out')
      .set('Authorization', 'Bearer ' + token)
      .set('Idempotency-Key', key)
      .send(body);
  const startDay = async (day: string) => {
    time = new Date(day + 'T00:00:00Z');
    const photo = await upload();
    return (
      await checkIn(payload(photo), randomUUID(), tokens[0], gateway).expect(
        201,
      )
    ).body.data;
  };
  it('T22 requires owned active check-in, checkout evidence and fresh GPS', async () => {
    const row = await startDay('2026-12-07');
    time = new Date('2026-12-07T10:00:00Z');
    const photo = await upload(0, 'CHECK_OUT');
    const body = { ...payload(photo), dailyRecordId: row.id };
    await checkout(payload(photo)).expect(400);
    await checkout({ ...body, dailyRecordId: randomUUID() }).expect(404);
    const ownPhoto = await upload(1, 'CHECK_OUT');
    await checkout(
      { ...body, photoObjectId: ownPhoto },
      randomUUID(),
      tokens[1],
    ).expect(404);
    await checkout(body, randomUUID(), tokens[3]).expect(403);
    await checkout(body, randomUUID(), tokens[2]).expect(403);
    await checkout({
      ...body,
      photoObjectId: row.checkIn.photoObjectId,
    }).expect(422);
    const stale = {
      ...body,
      location: {
        ...body.location,
        capturedAt: wib(new Date(time.getTime() - 60001)),
      },
    };
    expect((await checkout(stale).expect(422)).body.error.code).toBe(
      'LOCATION_STALE',
    );
    await db.attDailyRecord.update({
      where: { id: row.id },
      data: { deletedAt: new Date() },
    });
    expect((await checkout(body).expect(409)).body.error.code).toBe(
      'ATTENDANCE_DELETED',
    );
    expect(
      await db.attEvent.count({
        where: { dailyRecordId: row.id, eventType: 'CHECK_OUT' },
      }),
    ).toBe(0);
  });
  it('T22 enforces early boundary, preserves replay past midnight and separates operations', async () => {
    const row = await startDay('2026-12-08');
    time = new Date('2026-12-08T09:59:59.999Z');
    const photo = await upload(0, 'CHECK_OUT');
    const body = { ...payload(photo), dailyRecordId: row.id };
    expect((await checkout(body).expect(422)).body.error.code).toBe(
      'REASON_REQUIRED',
    );
    time = new Date('2026-12-08T10:00:00.000Z');
    const key = randomUUID(),
      accepted = { ...payload(photo), dailyRecordId: row.id };
    const result = await checkout(accepted, key).expect(201);
    expect(result.body.data.checkOut).toMatchObject({
      eventTime: wib(time),
      isEarlyDeparture: false,
      isOutsideSchedule: false,
    });
    const today = await request(gateway.getHttpServer())
      .get('/api/v1/me/attendance/today')
      .set('Authorization', 'Bearer ' + tokens[0])
      .expect(200);
    expect(today.body.data.status).toBe('CHECKED_OUT');
    expect(today.body.data.record.checkIn.eventTime).toBe(
      row.checkIn.eventTime,
    );
    expect(
      (await checkIn(payload(photo), key, tokens[0], gateway).expect(409)).body
        .error.code,
    ).toBe('IDEMPOTENCY_CONFLICT');
    time = new Date('2026-12-08T17:00:00.000Z');
    expect((await checkout(accepted, key).expect(201)).body).toEqual(
      result.body,
    );
    const otherPhoto = await upload(0, 'CHECK_OUT');
    expect(
      (
        await checkout({
          ...payload(otherPhoto),
          dailyRecordId: row.id,
        }).expect(422)
      ).body.error.code,
    ).toBe('CHECKOUT_CUTOFF');
  });
  it('T22 records trimmed early reason and one checkout under competing requests with private binding', async () => {
    const row = await startDay('2026-12-09');
    time = new Date('2026-12-09T09:59:59.999Z');
    const photo = await upload(0, 'CHECK_OUT'),
      other = await upload(0, 'CHECK_OUT');
    const body = {
        ...payload(photo, '  Urusan keluarga  '),
        dailyRecordId: row.id,
      },
      key = randomUUID();
    const res = await Promise.all([
      checkout(body, key),
      checkout({ ...payload(other, 'Urusan keluarga'), dailyRecordId: row.id }),
    ]);
    expect(res.map((r) => r.status).sort((a, b) => a - b)).toEqual([201, 409]);
    const stored = await db.attEvent.findFirstOrThrow({
      where: { dailyRecordId: row.id, eventType: 'CHECK_OUT' },
    });
    expect(stored.isEarlyDeparture).toBe(true);
    expect(stored.reason).toBe('Urusan keluarga');
    expect(
      await db.attEvent.count({
        where: { dailyRecordId: row.id, eventType: 'CHECK_OUT' },
      }),
    ).toBe(1);
    expect(
      await db.attOutbox.count({
        where: { eventId: stored.id, purpose: 'CHECK_OUT' },
      }),
    ).toBe(1);
    await attendance.get(MediaOutboxWorker).drain();
    expect(
      (
        await db.mediaObject.findUniqueOrThrow({
          where: { id: stored.photoObjectId },
        })
      ).boundEventId,
    ).toBe(stored.id);
    const successful = res.find((r) => r.status === 201)!;
    const winnerKey = successful === res[0] ? key : null;
    if (winnerKey)
      expect((await checkout(body, winnerKey).expect(201)).body).toEqual(
        successful.body,
      );
  });
  it('T22 uses a newly declared holiday for checkout without changing check-in snapshot', async () => {
    const row = await startDay('2026-12-10');
    const holidayId = randomUUID();
    await db.attHoliday.create({
      data: {
        id: holidayId,
        holidayDate: new Date('2026-12-10'),
        description: 'T22 ' + prefix,
      },
    });
    try {
      time = new Date('2026-12-10T03:00:00Z');
      const photo = await upload(0, 'CHECK_OUT');
      const result = await checkout({
        ...payload(photo),
        dailyRecordId: row.id,
      }).expect(201);
      expect(result.body.data.checkIn.policySnapshot.scheduleType).toBe(
        'REGULAR_WORKDAY',
      );
      expect(result.body.data.checkOut).toMatchObject({
        isOutsideSchedule: true,
        isEarlyDeparture: false,
        reason: null,
      });
      expect(result.body.data.checkOut.policySnapshot.scheduleType).toBe(
        'HOLIDAY',
      );
    } finally {
      await db.attHoliday.delete({ where: { id: holidayId } });
    }
  });
  it('T22 accepts weekend and the last millisecond of the same-day cutoff without overtime', async () => {
    const row = await startDay('2026-12-12');
    time = new Date('2026-12-12T16:59:59.999Z');
    const photo = await upload(0, 'CHECK_OUT');
    const result = await checkout({
      ...payload(photo),
      dailyRecordId: row.id,
    }).expect(201);
    expect(result.body.data.checkOut).toMatchObject({
      isOutsideSchedule: true,
      isEarlyDeparture: false,
      eventTime: wib(time),
    });
    expect(result.body.data.checkOut.policySnapshot.scheduleType).toBe(
      'WEEKEND',
    );
  });

  it('T22 recovers a committed checkout with a lost response and rejects changed target or new key', async () => {
    const row = await startDay('2026-12-14');
    time = new Date('2026-12-14T10:00:00Z');
    const photo = await upload(0, 'CHECK_OUT'),
      key = randomUUID(),
      body = { ...payload(photo), dailyRecordId: row.id };
    const runtime = attendance.get(DatabaseService).client,
      original = runtime.$transaction.bind(runtime);
    const spy = jest
      .spyOn(runtime, '$transaction')
      .mockImplementationOnce(
        async (...args: Parameters<typeof runtime.$transaction>) => {
          await original(...args);
          throw new Error('Synthetic checkout response lost after commit');
        },
      );
    let result;
    try {
      result = await checkout(body, key).expect(201);
    } finally {
      spy.mockRestore();
    }
    expect((await checkout(body, key).expect(201)).body).toEqual(result.body);
    expect(
      (
        await checkout({ ...body, dailyRecordId: randomUUID() }, key).expect(
          409,
        )
      ).body.error.code,
    ).toBe('IDEMPOTENCY_CONFLICT');
    const other = await upload(0, 'CHECK_OUT');
    expect(
      (await checkout({ ...payload(other), dailyRecordId: row.id }).expect(409))
        .body.error.code,
    ).toBe('CHECKOUT_EXISTS');
    expect(
      await db.attAuditLog.count({
        where: { entityId: row.id, action: 'CHECK_OUT_CREATED' },
      }),
    ).toBe(1);
    const ownerStatus = await request(gateway.getHttpServer())
      .get('/api/v1/me/attendance/requests/' + key)
      .set('Authorization', 'Bearer ' + tokens[0])
      .expect(200);
    expect(ownerStatus.body.data.response).toEqual(result.body);
    const upstream = attendance.get(AttendanceUpstreamClient),
      bind = upstream.bind.bind(upstream);
    let loseCheckoutBinding = true;
    const lost = jest
      .spyOn(upstream, 'bind')
      .mockImplementation(async (...args) => {
        await bind(...args);
        if (args[0] === photo && loseCheckoutBinding) {
          loseCheckoutBinding = false;
          throw new Error('Lost checkout binding response');
        }
      });
    await attendance.get(MediaOutboxWorker).drain();
    lost.mockRestore();
    expect(
      (await db.attOutbox.findFirstOrThrow({ where: { photoObjectId: photo } }))
        .state,
    ).toBe('PENDING');
    await db.attOutbox.updateMany({
      where: { photoObjectId: photo },
      data: { nextAttemptAt: new Date(0) },
    });
    await attendance.get(MediaOutboxWorker).drain();
    expect(
      (await db.attOutbox.findFirstOrThrow({ where: { photoObjectId: photo } }))
        .state,
    ).toBe('DELIVERED');
    expect(
      await db.mediaAuditLog.count({
        where: { entityId: photo, action: 'ATTENDANCE_BOUND' },
      }),
    ).toBe(1);
  });
  it('T22 checks cutoff again after upstream delay and never creates an event on the next day', async () => {
    const row = await startDay('2026-12-15');
    time = new Date('2026-12-15T16:59:59.999Z');
    const photo = await upload(0, 'CHECK_OUT'),
      body = { ...payload(photo), dailyRecordId: row.id };
    const upstream = attendance.get(AttendanceUpstreamClient),
      inspect = upstream.inspect.bind(upstream);
    const spy = jest
      .spyOn(upstream, 'inspect')
      .mockImplementationOnce(async (...args) => {
        await inspect(...args);
        time = new Date('2026-12-15T17:00:00.000Z');
      });
    try {
      expect((await checkout(body).expect(422)).body.error.code).toBe(
        'CHECKOUT_CUTOFF',
      );
    } finally {
      spy.mockRestore();
    }
    expect(
      await db.attEvent.count({
        where: { dailyRecordId: row.id, eventType: 'CHECK_OUT' },
      }),
    ).toBe(0);
    const nextToday = await request(gateway.getHttpServer())
      .get('/api/v1/me/attendance/today')
      .set('Authorization', 'Bearer ' + tokens[0])
      .expect(200);
    expect(nextToday.body.data).toMatchObject({
      record: null,
      status: 'NOT_CHECKED_IN',
    });
  });

  const adminGet = (path: string, token = tokens[3]) =>
    request(gateway.getHttpServer())
      .get('/api/v1/attendance' + path)
      .set('Authorization', 'Bearer ' + token);
  const adminChange = (
    id: string,
    version: string,
    reason?: string,
    token = tokens[3],
  ) =>
    (reason === undefined
      ? request(gateway.getHttpServer()).post(
          '/api/v1/attendance/' + id + '/restore',
        )
      : request(gateway.getHttpServer()).delete('/api/v1/attendance/' + id)
    )
      .set('Authorization', 'Bearer ' + token)
      .send({ version, ...(reason !== undefined ? { reason } : {}) });

  it('T23 protects all HRD reads/mutations, validates reasons, dates and versions', async () => {
    const row = await startDay('2026-12-16');
    const detail = (await adminGet('/' + row.id).expect(200)).body.data;
    for (const token of [tokens[0], tokens[2]]) {
      await adminGet('', token).expect(403);
      await adminGet('/' + row.id, token).expect(403);
      await adminChange(row.id, detail.version, 'Koreksi', token).expect(403);
      await adminChange(row.id, detail.version, undefined, token).expect(403);
    }
    await request(gateway.getHttpServer())
      .get('/api/v1/attendance')
      .expect(401);
    await db.authAccount.update({
      where: { id: accountIds[3] },
      data: { mustChangePassword: true },
    });
    try {
      await adminGet('').expect(403);
      await adminChange(row.id, detail.version, 'Koreksi').expect(403);
    } finally {
      await db.authAccount.update({
        where: { id: accountIds[3] },
        data: { mustChangePassword: false },
      });
    }
    await adminChange(row.id, detail.version, '   ').expect(400);
    await adminChange(row.id, detail.version, 'a'.repeat(501)).expect(400);
    await adminChange(row.id, 'not-a-version', 'Koreksi').expect(400);
    await adminGet('?startDate=2026-02-30').expect(400);
    await adminGet('?startDate=2026-12-31&endDate=2026-12-01').expect(400);
    await adminGet('?pageSize=21').expect(400);
    await adminGet('?internal=true').expect(400);
    await adminGet('/' + row.id + '?status=DELETED').expect(400);
    await adminGet('/' + randomUUID()).expect(404);
    await adminChange(row.id, detail.version).expect(409);
    expect(
      await db.attAuditLog.count({
        where: { entityId: row.id, action: { startsWith: 'ATTENDANCE_' } },
      }),
    ).toBe(0);
  });

  it('T23 deletes the whole day, keeps unique reservations and restores the exact original evidence once', async () => {
    const row = await startDay('2026-12-17');
    time = new Date('2026-12-17T10:00:00Z');
    const photo = await upload(0, 'CHECK_OUT');
    await checkout({ ...payload(photo), dailyRecordId: row.id }).expect(201);
    const before = await db.attDailyRecord.findUniqueOrThrow({
      where: { id: row.id },
      include: { events: { orderBy: { id: 'asc' } } },
    });
    const original = (await adminGet('/' + row.id).expect(200)).body.data;
    const removed = (
      await adminChange(
        row.id,
        original.version,
        '  Bukti perlu diperiksa  ',
      ).expect(200)
    ).body.data;
    expect(removed.deletedAt).toMatch(/\+07:00$/);
    expect(removed.deleteReason).toBe('Bukti perlu diperiksa');
    expect(removed.deletedByAccountId).toBe(accountIds[3]);
    expect(removed.checkIn.photoObjectId).toBeUndefined();
    expect(removed.checkOut.photoObjectId).toBeUndefined();
    await adminChange(row.id, original.version, 'Bukti perlu diperiksa').expect(
      409,
    );
    const activeList = (
      await adminGet(
        '?employeeId=' +
          employeeIds[0] +
          '&startDate=2026-12-17&endDate=2026-12-17',
      ).expect(200)
    ).body;
    expect(activeList.data).toEqual([]);
    const trash = (
      await adminGet('?status=DELETED&employeeId=' + employeeIds[0]).expect(200)
    ).body;
    expect(trash.data.map((d: { id: string }) => d.id)).toContain(row.id);
    expect(trash.meta.total).toBeGreaterThan(0);
    const today = await request(gateway.getHttpServer())
      .get('/api/v1/me/attendance/today')
      .set('Authorization', 'Bearer ' + tokens[0])
      .expect(200);
    expect(today.body.data.status).toBe('DELETED');
    const freshIn = await upload();
    await checkIn(
      payload(freshIn, 'Koreksi'),
      randomUUID(),
      tokens[0],
      gateway,
    ).expect(409);
    const freshOut = await upload(0, 'CHECK_OUT');
    await checkout({ ...payload(freshOut), dailyRecordId: row.id }).expect(409);
    const restored = (await adminChange(row.id, removed.version).expect(200))
      .body.data;
    expect(restored.deletedAt).toBeNull();
    expect(restored.checkIn.photoObjectId).toBe(original.checkIn.photoObjectId);
    expect(restored.checkOut.photoObjectId).toBe(photo);
    const after = await db.attDailyRecord.findUniqueOrThrow({
      where: { id: row.id },
      include: { events: { orderBy: { id: 'asc' } } },
    });
    expect(after.events).toEqual(before.events);
    expect(after.departmentNameSnapshot).toBe(before.departmentNameSnapshot);
    expect(after.positionNameSnapshot).toBe(before.positionNameSnapshot);
    const objects = await db.mediaObject.findMany({
      where: { id: { in: before.events.map((e) => e.photoObjectId) } },
    });
    expect(objects).toHaveLength(2);
    for (const object of objects)
      expect(
        await storage.matches(object.objectKey, object.checksumSha256),
      ).toBe(true);
    await adminChange(row.id, removed.version).expect(409);
    await adminChange(row.id, original.version, 'Konfirmasi lama').expect(409);
    const audit = await db.attAuditLog.findMany({
      where: { entityId: row.id, action: { startsWith: 'ATTENDANCE_' } },
      orderBy: { createdAt: 'asc' },
    });
    expect(audit.map((a) => a.action)).toEqual([
      'ATTENDANCE_DELETED',
      'ATTENDANCE_RESTORED',
    ]);
    expect(
      audit.every((a) => a.actorAccountId === accountIds[3] && a.requestId),
    ).toBe(true);
    expect(audit[0].reason).toBe('Bukti perlu diperiksa');
  });

  it('T23 serializes competing deletion, restoration and checkout without losing evidence', async () => {
    const row = await startDay('2026-12-18');
    time = new Date('2026-12-18T10:00:00Z');
    const original = (await adminGet('/' + row.id).expect(200)).body.data;
    const photo = await upload(0, 'CHECK_OUT');
    const results = await Promise.all([
      adminChange(row.id, original.version, 'Periksa bukti'),
      adminChange(row.id, original.version, 'Periksa ulang'),
      checkout({ ...payload(photo), dailyRecordId: row.id }),
    ]);
    const deletions = results.slice(0, 2);
    // If checkout wins the lock, both stale confirmations fail; reload then delete.
    expect(
      deletions.filter((r) => r.status === 200).length,
    ).toBeLessThanOrEqual(1);
    expect(results[2].status === 201 || results[2].status === 409).toBe(true);
    for (const result of deletions) expect([200, 409]).toContain(result.status);
    let latest = (await adminGet('/' + row.id).expect(200)).body.data;
    if (!latest.deletedAt)
      latest = (
        await adminChange(row.id, latest.version, 'Periksa bukti').expect(200)
      ).body.data;
    const restored = await Promise.all([
      adminChange(row.id, latest.version),
      adminChange(row.id, latest.version),
    ]);
    expect(restored.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      200, 409,
    ]);
    const events = await db.attEvent.findMany({
      where: { dailyRecordId: row.id },
    });
    expect(events.filter((e) => e.eventType === 'CHECK_IN')).toHaveLength(1);
    expect(events.filter((e) => e.eventType === 'CHECK_OUT')).toHaveLength(
      results[2].status === 201 ? 1 : 0,
    );
    expect(
      await db.attAuditLog.count({
        where: { entityId: row.id, action: { startsWith: 'ATTENDANCE_' } },
      }),
    ).toBe(2);
  });

  it('T23 rolls back deletion when the audit insert fails', async () => {
    const row = await startDay('2026-12-22');
    const before = (await adminGet('/' + row.id).expect(200)).body.data;
    const runtime = attendance.get(DatabaseService).client;
    const transaction = runtime.$transaction.bind(runtime);
    const spy = jest
      .spyOn(runtime, '$transaction')
      .mockImplementationOnce(async (callback: unknown, options: unknown) =>
        transaction(async (tx: unknown) => {
          const proxy = new Proxy(tx as object, {
            get(target, key) {
              if (key === 'attAuditLog')
                return {
                  create: async () => {
                    throw new Error('Synthetic audit insert failure');
                  },
                };
              return Reflect.get(target, key);
            },
          });
          return (callback as (client: unknown) => Promise<unknown>)(proxy);
        }, options as never),
      );
    try {
      await adminChange(row.id, before.version, 'Audit unavailable').expect(
        503,
      );
    } finally {
      spy.mockRestore();
    }
    const after = (await adminGet('/' + row.id).expect(200)).body.data;
    expect(after.version).toBe(before.version);
    expect(after.deletedAt).toBeNull();
    expect(after.checkIn).toEqual(before.checkIn);
    expect(after.history).toEqual([]);
  });

  it('T23 reconciles a lost mutation response and reads archived employee history without restoring the employee', async () => {
    const row = await startDay('2026-12-21');
    const before = (await adminGet('/' + row.id).expect(200)).body.data;
    const runtime = attendance.get(DatabaseService).client;
    const transaction = runtime.$transaction.bind(runtime);
    const spy = jest
      .spyOn(runtime, '$transaction')
      .mockImplementationOnce(
        async (...args: Parameters<typeof runtime.$transaction>) => {
          const result = await transaction(...args);
          throw new Error(
            'Synthetic lifecycle response lost after commit: ' +
              Boolean(result),
          );
        },
      );
    try {
      await adminChange(row.id, before.version, 'Respons hilang').expect(503);
    } finally {
      spy.mockRestore();
    }
    const latest = (await adminGet('/' + row.id).expect(200)).body.data;
    expect(latest.deleteReason).toBe('Respons hilang');
    await adminChange(row.id, before.version, 'Respons hilang').expect(409);
    const current = await db.empEmployee.findUniqueOrThrow({
      where: { id: employeeIds[0] },
    });
    try {
      await db.empEmployee.update({
        where: { id: employeeIds[0] },
        data: { status: 'ARCHIVED' },
      });
      expect(
        (await adminGet('/' + row.id).expect(200)).body.data.employee.status,
      ).toBe('ARCHIVED');
      await adminChange(row.id, latest.version).expect(200);
      expect(
        (
          await db.empEmployee.findUniqueOrThrow({
            where: { id: employeeIds[0] },
          })
        ).status,
      ).toBe('ARCHIVED');
    } finally {
      await db.empEmployee.update({
        where: { id: employeeIds[0] },
        data: { status: current.status },
      });
    }
    await db.authSession.updateMany({
      where: { accountId: accountIds[3] },
      data: { revokedAt: new Date() },
    });
    await adminGet('').expect(401);
    await adminChange(row.id, latest.version, 'Sesi dicabut').expect(401);
  });

  it('rejects a used photo on a later day and revalidates session revocation for successful retries', async () => {
    time = new Date('2026-11-11T00:00:00Z');
    const successful = await db.attIdempotencyRequest.findFirstOrThrow({
      where: { employeeId: employeeIds[0], state: 'SUCCEEDED' },
    });
    const event = await db.attEvent.findFirstOrThrow({
      where: { dailyRecord: { employeeId: employeeIds[0] } },
    });
    expect(
      (
        await checkIn(
          payload(event.photoObjectId),
          randomUUID(),
          tokens[0],
          gateway,
        ).expect(409)
      ).body.error.code,
    ).toBe('PHOTO_ALREADY_USED');
    await db.authSession.updateMany({
      where: { accountId: accountIds[0] },
      data: { revokedAt: new Date() },
    });
    await checkout({
      ...payload(randomUUID()),
      dailyRecordId: randomUUID(),
    }).expect(401);
    await request(gateway.getHttpServer())
      .get('/api/v1/me/attendance/requests/' + successful.id)
      .set('Authorization', 'Bearer ' + tokens[0])
      .expect(401);
  });
});
