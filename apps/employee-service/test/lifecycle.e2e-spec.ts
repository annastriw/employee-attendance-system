import { EmployeeLifecycleService } from '../src/employees/lifecycle.service';
import { EmployeeEmailChangesService } from '../src/employees/email-changes.service';
import { type INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createDatabaseClient } from '@attendance/database';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmployeeConfig } from '../src/config/employee.config';
import { ProvisioningAuthClient } from '../src/employees/provisioning-auth.client';
import { DatabaseService } from '../src/database/database.module';
import { configureApp } from '../src/configure-app';
import { AppModule as AuthAppModule } from '../../auth-service/dist/app.module';
import { AuthConfig } from '../../auth-service/dist/config/auth.config';
import { AuthService } from '../../auth-service/dist/auth/auth.service';
import { configureApp as configureAuth } from '../../auth-service/dist/configure-app';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const { hash } = createRequire(resolve(__dirname, '../../auth-service/package.json'))('bcrypt') as {
  hash: (password: string, cost: number) => Promise<string>;
};

describe('T14 B real lifecycle + Auth + MySQL', () => {
  let app: INestApplication;
  let authApp: INestApplication;
  let db: ReturnType<typeof createDatabaseClient>;
  let client: ProvisioningAuthClient;
  let token: string;
  let departmentId: string;
  let positionId: string;

  const actorId = randomUUID();
  const otherActorId = randomUUID();
  const employeeActorId = randomUUID();
  const prefix = 'LIFE' + randomUUID().slice(0, 8).toUpperCase();
  const password = 'Integration-Admin-Test-123';

  const api = () => request(app.getHttpServer());
  const as = () => ({ Authorization: 'Bearer ' + token });
  const input = (suffix: string) => ({
    nik: prefix + '-' + suffix,
    name: prefix + ' Employee ' + suffix,
    email: prefix.toLowerCase() + '-' + suffix.toLowerCase() + '@example.invalid',
    departmentId,
    positionId,
    startDate: '2026-10-02',
    status: 'ACTIVE',
  });

  const create = async (suffix: string) => {
    const id = randomUUID();
    const result = await api()
      .post('/api/v1/employees')
      .set(as())
      .set('Idempotency-Key', id)
      .send(input(suffix));
    return { id, result };
  };

  const detail = async (employeeId: string) =>
    (await api().get('/api/v1/employees/' + employeeId).set(as()).expect(200)).body;

  const changeLifecycle = (
    employeeId: string,
    expectedStatus: string,
    targetStatus: string,
    key = randomUUID(),
  ) =>
    api()
      .post('/api/v1/employees/' + employeeId + '/lifecycle')
      .set(as())
      .set('Idempotency-Key', key)
      .send({ expectedStatus, targetStatus });

  beforeAll(async () => {
    const authConfig = new AuthConfig();
    const employeeConfig = new EmployeeConfig();
    for (const url of [
      process.env.TEST_DATABASE_URL!,
      process.env.AUTH_TEST_DATABASE_URL!,
      process.env.EMPLOYEE_TEST_DATABASE_URL!,
    ]) {
      if (
        new URL(url).pathname !== '/attendance_test' ||
        new URL(url).hostname !== '127.0.0.1'
      )
        throw new Error('Use isolated local test DB only.');
    }

    db = createDatabaseClient(process.env.TEST_DATABASE_URL!);
    const passwordHash = await hash(password, 12);
    await db.authAccount.createMany({
      data: [actorId, otherActorId, employeeActorId].map((id, index) => ({
        id,
        email: prefix.toLowerCase() + '-actor' + index + '@example.invalid',
        passwordHash,
        role: index === 2 ? 'EMPLOYEE' : 'ADMIN_HRD',
        status: 'ACTIVE',
        mustChangePassword: false,
      })),
    });

    departmentId = (
      await db.empDepartment.create({
        data: { name: prefix + ' Department', code: prefix + '-D' },
      })
    ).id;
    positionId = (
      await db.empPosition.create({
        data: { name: prefix + ' Position', code: prefix + '-P' },
      })
    ).id;

    const authModule = await Test.createTestingModule({ imports: [AuthAppModule] })
      .overrideProvider(AuthConfig)
      .useValue(
        Object.assign({}, authConfig, {
          databaseUrl: process.env.AUTH_TEST_DATABASE_URL,
        }),
      )
      .compile();
    authApp = authModule.createNestApplication({ logger: false });
    configureAuth(authApp);
    await authApp.listen(0, '127.0.0.1');

    token = (
      await authApp
        .get(AuthService)
        .login(prefix.toLowerCase() + '-actor0@example.invalid', password, 'ADMIN_HRD')
    ).body.accessToken;

    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmployeeConfig)
      .useValue(
        Object.assign({}, employeeConfig, {
          databaseUrl: process.env.EMPLOYEE_TEST_DATABASE_URL,
          authUrl: await authApp.getUrl(),
          workerEnabled: false,
        }),
      )
      .compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
    client = app.get(ProvisioningAuthClient);
  });

  afterAll(async () => {
    await app?.close();
    await authApp?.close();
    if (!db) return;
    const ops = await db.empProvisioning.findMany({ where: { actorAccountId: actorId } });
    const employeeIds = ops.map((row) => row.employeeId);
    const accounts = await db.authAccount.findMany({
      where: {
        OR: [
          { id: { in: [actorId, otherActorId, employeeActorId] } },
          { employeeId: { in: employeeIds } },
        ],
      },
    });
    const ids = accounts.map((row) => row.id);
    await db.authEmailChange.deleteMany({ where: { accountId: { in: ids } } });
    await db.authProvisioning.deleteMany({ where: { accountId: { in: ids } } });
    await db.authSession.deleteMany({ where: { accountId: { in: ids } } });
    await db.authAuditLog.deleteMany({
      where: { OR: [{ actorAccountId: { in: ids } }, { targetAccountId: { in: ids } }] },
    });
    await db.authAccount.deleteMany({ where: { id: { in: ids } } });
    await db.empEmployeeHistory.deleteMany({ where: { employeeId: { in: employeeIds } } });
    await db.empLifecycleChange.deleteMany({ where: { employeeId: { in: employeeIds } } });
    await db.empEmailChange.deleteMany({ where: { employeeId: { in: employeeIds } } });
    await db.empAuditLog.deleteMany({ where: { actorAccountId: actorId } });
    await db.empProvisioning.deleteMany({ where: { actorAccountId: actorId } });
    await db.empEmployee.deleteMany({ where: { id: { in: employeeIds } } });
    await db.empDepartment.delete({ where: { id: departmentId } });
    await db.empPosition.delete({ where: { id: positionId } });
    await db.$disconnect();
  });

  it('handles valid lifecycle transitions, revokes sessions on non-ACTIVE, allows reactivation and records history atomically', async () => {
    const { id, result } = await create('CYCLE');
    const employeeId = result.body.employeeId as string;
    const employeeEmail = input('CYCLE').email;
    const secret = (
      await api()
        .post('/api/v1/employee-provisioning/' + id + '/credentials')
        .set(as())
        .send({})
        .expect(200)
    ).body.temporaryPassword as string;

    // 1. Initial login succeeds and session is valid.
    const login1 = await authApp.get(AuthService).login(employeeEmail, secret, 'EMPLOYEE');
    const sessionToken1 = login1.body.accessToken;
    await expect(authApp.get(AuthService).authenticate(sessionToken1, true)).resolves.toBeDefined();

    // 2. ACTIVE -> INACTIVE (Deactivate)
    const deactRes = await changeLifecycle(employeeId, 'ACTIVE', 'INACTIVE').expect(200);
    expect(deactRes.body.status).toBe('COMPLETED');
    expect(deactRes.body.targetStatus).toBe('INACTIVE');

    const detailAfterDeact = await detail(employeeId);
    expect(detailAfterDeact.status).toBe('INACTIVE');
    expect(detailAfterDeact.hasPendingOperation).toBe(false);

    // Live session must be revoked immediately!
    await expect(authApp.get(AuthService).authenticate(sessionToken1, true)).rejects.toThrow();

    // Login while INACTIVE must be rejected!
    await expect(authApp.get(AuthService).login(employeeEmail, secret, 'EMPLOYEE')).rejects.toThrow();

    // 3. INACTIVE -> ACTIVE (Activate)
    const actRes = await changeLifecycle(employeeId, 'INACTIVE', 'ACTIVE').expect(200);
    expect(actRes.body.status).toBe('COMPLETED');
    expect(actRes.body.targetStatus).toBe('ACTIVE');

    const detailAfterAct = await detail(employeeId);
    expect(detailAfterAct.status).toBe('ACTIVE');

    // Old revoked session is STILL dead!
    await expect(authApp.get(AuthService).authenticate(sessionToken1, true)).rejects.toThrow();

    // New login succeeds now that the account is active again!
    const login2 = await authApp.get(AuthService).login(employeeEmail, secret, 'EMPLOYEE');
    const sessionToken2 = login2.body.accessToken;
    await expect(authApp.get(AuthService).authenticate(sessionToken2, true)).resolves.toBeDefined();

    // 4. ACTIVE -> ARCHIVED (Archive)
    const archRes = await changeLifecycle(employeeId, 'ACTIVE', 'ARCHIVED').expect(200);
    expect(archRes.body.status).toBe('COMPLETED');
    expect(archRes.body.targetStatus).toBe('ARCHIVED');

    const detailAfterArch = await detail(employeeId);
    expect(detailAfterArch.status).toBe('ARCHIVED');
    expect(detailAfterArch.archivedAt).toBeTruthy();

    // Session 2 is revoked
    await expect(authApp.get(AuthService).authenticate(sessionToken2, true)).rejects.toThrow();
    // Cannot login
    await expect(authApp.get(AuthService).login(employeeEmail, secret, 'EMPLOYEE')).rejects.toThrow();

    // 5. ARCHIVED -> INACTIVE (Restore to INACTIVE, never directly to ACTIVE)
    const restRes = await changeLifecycle(employeeId, 'ARCHIVED', 'INACTIVE').expect(200);
    expect(restRes.body.status).toBe('COMPLETED');
    expect(restRes.body.targetStatus).toBe('INACTIVE');

    const detailAfterRest = await detail(employeeId);
    expect(detailAfterRest.status).toBe('INACTIVE');
    expect(detailAfterRest.archivedAt).toBeNull();
    // Still cannot login because account is INACTIVE
    await expect(authApp.get(AuthService).login(employeeEmail, secret, 'EMPLOYEE')).rejects.toThrow();

    // Check history timeline
    const historyRes = await api()
      .get('/api/v1/employees/' + employeeId + '/history?page=1&pageSize=10')
      .set(as())
      .expect(200);
    expect(historyRes.body.total).toBe(4);
    expect(historyRes.body.items).toHaveLength(4);
    const actions = historyRes.body.items.map((i: { action: string }) => i.action);
    expect(actions).toEqual([
      'EMPLOYEE_LIFECYCLE_INACTIVE',
      'EMPLOYEE_LIFECYCLE_ARCHIVED',
      'EMPLOYEE_LIFECYCLE_ACTIVE',
      'EMPLOYEE_LIFECYCLE_INACTIVE',
    ]);
  });

  it('rejects invalid transitions, expectedStatus mismatch with 409, and illegal direct ARCHIVED->ACTIVE', async () => {
    const { result } = await create('REJECTS');
    const employeeId = result.body.employeeId as string;

    // Same status: ACTIVE -> ACTIVE -> 400
    await changeLifecycle(employeeId, 'ACTIVE', 'ACTIVE').expect(400);

    // Stale expectedStatus: employee is ACTIVE, but expected is INACTIVE -> 409
    await changeLifecycle(employeeId, 'INACTIVE', 'ACTIVE').expect(409);

    // Illegal direct transition: ARCHIVED -> ACTIVE -> 400
    await changeLifecycle(employeeId, 'ARCHIVED', 'ACTIVE').expect(400);

    // Status is untouched
    const cur = await detail(employeeId);
    expect(cur.status).toBe('ACTIVE');

    // History has no records
    expect(await db.empEmployeeHistory.count({ where: { employeeId } })).toBe(0);
  });

  it('enforces idempotency on lifecycle changes and rejects altered payload on same key', async () => {
    const { result } = await create('IDEMP');
    const employeeId = result.body.employeeId as string;
    const key = randomUUID();

    // Concurrent identical requests both succeed with 200
    const results = await Promise.all([
      changeLifecycle(employeeId, 'ACTIVE', 'INACTIVE', key),
      changeLifecycle(employeeId, 'ACTIVE', 'INACTIVE', key),
    ]);
    expect(results.every((r) => r.status === 200)).toBe(true);

    // Finish any in-flight execution and check operation is COMPLETED
    await app.get(EmployeeLifecycleService).retry(key, { accountId: actorId });
    const op = await api().get('/api/v1/employee-lifecycle/' + key).set(as()).expect(200);
    expect(op.body.status).toBe('COMPLETED');

    // Sequential replay with same key and same payload returns same result
    const replay = await changeLifecycle(employeeId, 'ACTIVE', 'INACTIVE', key).expect(200);
    expect(replay.body.status).toBe('COMPLETED');

    // Replay with same key but altered payload -> 409
    await changeLifecycle(employeeId, 'ACTIVE', 'ARCHIVED', key).expect(409);

    // Verify exactly one history entry was created
    expect(await db.empEmployeeHistory.count({ where: { employeeId } })).toBe(1);
  });

  it('enforces bidirectional mutual exclusion between pending lifecycle and email operations', async () => {
    const { result } = await create('EXCLUSION');
    const employeeId = result.body.employeeId as string;
    const currentEmail = input('EXCLUSION').email;

    // 1. Start a lifecycle change that stays PENDING by mocking client.call
    const fault = jest
      .spyOn(client, 'call')
      .mockRejectedValueOnce(new ServiceUnavailableException());
    const pendingLifecycleKey = randomUUID();
    const pendingLife = await changeLifecycle(
      employeeId,
      'ACTIVE',
      'INACTIVE',
      pendingLifecycleKey,
    ).expect(200);
    fault.mockRestore();
    expect(pendingLife.body.status).toBe('PENDING');

    // While lifecycle is PENDING, email change must be rejected 409
    const emailKey1 = randomUUID();
    const blockedEmail = await api()
      .post('/api/v1/employees/' + employeeId + '/email')
      .set(as())
      .set('Idempotency-Key', emailKey1)
      .send({ expectedEmail: currentEmail, email: prefix.toLowerCase() + '-excl1@example.invalid' })
      .expect(409);
    expect(blockedEmail.body.message).toContain('perubahan status');

    // Complete the lifecycle change
    await app.get(EmployeeLifecycleService).retry(pendingLifecycleKey, { accountId: actorId });
    expect((await detail(employeeId)).status).toBe('INACTIVE');

    // 2. Now start an email change that stays PENDING
    const fault2 = jest
      .spyOn(client, 'call')
      .mockRejectedValueOnce(new ServiceUnavailableException());
    const pendingEmailKey = randomUUID();
    const pendingEmail = await api()
      .post('/api/v1/employees/' + employeeId + '/email')
      .set(as())
      .set('Idempotency-Key', pendingEmailKey)
      .send({ expectedEmail: currentEmail, email: prefix.toLowerCase() + '-excl2@example.invalid' })
      .expect(200);
    fault2.mockRestore();
    expect(pendingEmail.body.status).toBe('PENDING');

    // While email change is PENDING, lifecycle change must be rejected 409
    const lifeKey2 = randomUUID();
    const blockedLife = await changeLifecycle(
      employeeId,
      'INACTIVE',
      'ACTIVE',
      lifeKey2,
    ).expect(409);
    expect(blockedLife.body.message).toContain('perubahan email');

    // Complete the email change
    await app.get(EmployeeEmailChangesService).retry(pendingEmailKey, { accountId: actorId });
  });

  it('recovers a committed Auth response loss after worker restart', async () => {
    const { id, result } = await create('RECOVERY');
    const employeeId = result.body.employeeId as string;
    const employeeEmail = input('RECOVERY').email;
    const secret = (
      await api()
        .post('/api/v1/employee-provisioning/' + id + '/credentials')
        .set(as())
        .send({})
        .expect(200)
    ).body.temporaryPassword as string;

    const login = await authApp.get(AuthService).login(employeeEmail, secret, 'EMPLOYEE');
    const userSessionToken = login.body.accessToken;

    const key = randomUUID();
    const original = client.call.bind(client);
    const fault = jest
      .spyOn(client, 'call')
      .mockImplementationOnce(async (...args: Parameters<typeof client.call>) => {
        // Execute real Auth call first so Auth commits
        await original(...args);
        // Then throw to simulate response drop / network crash before Employee receives receipt
        throw new ServiceUnavailableException();
      });

    const pending = await changeLifecycle(employeeId, 'ACTIVE', 'INACTIVE', key).expect(200);
    fault.mockRestore();

    expect(pending.body.status).toBe('PENDING');
    // In Employee, status is still ACTIVE because receipt was not processed yet
    expect((await detail(employeeId)).status).toBe('ACTIVE');
    expect((await detail(employeeId)).hasPendingOperation).toBe(true);

    // In Auth, transaction committed, session was already revoked
    await expect(authApp.get(AuthService).authenticate(userSessionToken, true)).rejects.toThrow();

    // Simulate worker restart / retry
    await db.empLifecycleChange.update({
      where: { id: key },
      data: { nextAttemptAt: new Date(0), leaseUntil: new Date(0), leaseToken: randomUUID() },
    });
    const restarted = new EmployeeLifecycleService(
      app.get(DatabaseService),
      client,
      { workerEnabled: false } as EmployeeConfig,
    );
    await restarted.runOne(key);

    // Operation is now COMPLETED, Employee status is INACTIVE
    const op = await api().get('/api/v1/employee-lifecycle/' + key).set(as()).expect(200);
    expect(op.body.status).toBe('COMPLETED');
    expect((await detail(employeeId)).status).toBe('INACTIVE');
    expect((await detail(employeeId)).hasPendingOperation).toBe(false);

    // Auth audit log has only 1 entry for this transition (idempotent replay did not duplicate)
    const targetAccount = await db.authAccount.findUniqueOrThrow({ where: { employeeId } });
    expect(
      await db.authAuditLog.count({
        where: { targetAccountId: targetAccount.id, action: 'EMPLOYEE_LIFECYCLE_INACTIVE' },
      }),
    ).toBe(1);
  });
});
