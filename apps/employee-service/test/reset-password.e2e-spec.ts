import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createDatabaseClient } from '@attendance/database';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmployeeConfig } from '../src/config/employee.config';
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

describe('T15 real reset password + Auth + MySQL', () => {
  let app: INestApplication;
  let authApp: INestApplication;
  let db: ReturnType<typeof createDatabaseClient>;
  let token: string;
  let departmentId: string;
  let positionId: string;

  const actorId = randomUUID();
  const otherActorId = randomUUID();
  const prefix = 'RESET' + randomUUID().slice(0, 8).toUpperCase();
  const adminPassword = 'Integration-Admin-Test-123';

  const api = () => request(app.getHttpServer());
  const as = (overrideToken?: string) => ({ Authorization: 'Bearer ' + (overrideToken ?? token) });

  const input = (suffix: string) => ({
    nik: prefix + '-' + suffix,
    name: prefix + ' Employee ' + suffix,
    email: prefix.toLowerCase() + '-' + suffix.toLowerCase() + '@example.invalid',
    departmentId,
    positionId,
    startDate: '2026-10-02',
    status: 'ACTIVE',
  });

  const provisionEmployee = async (suffix: string) => {
    const opId = randomUUID();
    const createRes = await api()
      .post('/api/v1/employees')
      .set(as())
      .set('Idempotency-Key', opId)
      .send(input(suffix))
      .expect(201);

    const employeeId = createRes.body.employeeId as string;

    const credentialRes = await api()
      .post('/api/v1/employee-provisioning/' + opId + '/credentials')
      .set(as())
      .send({})
      .expect(200);

    const employee = (await api().get('/api/v1/employees/' + employeeId).set(as()).expect(200)).body;
    return { id: employeeId, opId, employee, initialPassword: credentialRes.body.temporaryPassword as string };
  };

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
    const passwordHash = await hash(adminPassword, 12);
    await db.authAccount.createMany({
      data: [actorId, otherActorId].map((id, index) => ({
        id,
        email: prefix.toLowerCase() + '-actor' + index + '@example.invalid',
        passwordHash,
        role: 'ADMIN_HRD',
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
        .login(prefix.toLowerCase() + '-actor0@example.invalid', adminPassword, 'ADMIN_HRD')
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
          { id: { in: [actorId, otherActorId] } },
          { employeeId: { in: employeeIds } },
        ],
      },
    });
    const ids = accounts.map((row) => row.id);
    await db.authPasswordReset.deleteMany({ where: { accountId: { in: ids } } });
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

  it('1. resets password for active employee, revokes active sessions immediately, forces mustChangePassword, and allows login with new temporary password', async () => {
    const { id, employee, initialPassword } = await provisionEmployee('01');

    // Karyawan login awal dengan temporary password
    const authService = authApp.get(AuthService);
    const initialLogin = await authService.login(employee.email, initialPassword, 'EMPLOYEE');
    const initialSession = await authService.authenticate(initialLogin.body.accessToken, true);

    // Karyawan ganti password permanen
    const permanentPassword = 'Employee-Perm-Test-123456';
    await authService.changePassword(initialSession, initialPassword, permanentPassword);

    // Karyawan login dengan password permanen dan memiliki sesi aktif
    const activeLogin = await authService.login(employee.email, permanentPassword, 'EMPLOYEE');
    const activeToken = activeLogin.body.accessToken;
    const activeSession = await authService.authenticate(activeToken, false);
    expect(activeSession.account.mustChangePassword).toBe(false);

    // HRD reset password karyawan
    const resetKey = randomUUID();
    const resetRes = await api()
      .post('/api/v1/employees/' + id + '/reset-password')
      .set(as())
      .set('Idempotency-Key', resetKey)
      .send({})
      .expect(200);

    const newTempPassword = resetRes.body.temporaryPassword as string;
    expect(newTempPassword).toBeDefined();
    expect(newTempPassword).not.toBe(initialPassword);
    expect(newTempPassword).not.toBe(permanentPassword);
    expect(resetRes.body.email).toBe(employee.email);

    // Sesi aktif lama milik karyawan seketika dicabut
    await expect(authService.authenticate(activeToken, false)).rejects.toThrow('Sesi tidak valid.');
    await expect(authService.refresh(activeLogin.refreshToken, 'EMPLOYEE')).rejects.toThrow('Sesi tidak valid.');

    // Login dengan password permanen lama ditolak
    await expect(authService.login(employee.email, permanentPassword, 'EMPLOYEE')).rejects.toThrow('Email atau password tidak valid.');

    // Login dengan new temporary password berhasil
    const tempLogin = await authService.login(employee.email, newTempPassword, 'EMPLOYEE');
    expect(tempLogin.body.user.mustChangePassword).toBe(true);

    // Akses endpoint bisnis non-restricted ditolak karena mustChangePassword
    await expect(authService.authenticate(tempLogin.body.accessToken, false)).rejects.toThrow('Ganti password awal sebelum mengakses fitur aplikasi.');

    // Akses dengan allowRestricted: true berhasil
    const restrictedSession = await authService.authenticate(tempLogin.body.accessToken, true);
    expect(restrictedSession.account.mustChangePassword).toBe(true);

    // Karyawan mengganti password ke password baru
    const finalPassword = 'Employee-Final-Test-654321';
    await authService.changePassword(restrictedSession, newTempPassword, finalPassword);

    // Login dengan final password berhasil tanpa restriction
    const finalLogin = await authService.login(employee.email, finalPassword, 'EMPLOYEE');
    expect(finalLogin.body.user.mustChangePassword).toBe(false);
  });

  it('2. rejects replay with the same Idempotency-Key once claimed (Password sudah ditampilkan)', async () => {
    const { id } = await provisionEmployee('02');
    const resetKey = randomUUID();

    // First request succeeds
    await api()
      .post('/api/v1/employees/' + id + '/reset-password')
      .set(as())
      .set('Idempotency-Key', resetKey)
      .send({})
      .expect(200);

    // Replay with same key is rejected with 409
    const replayRes = await api()
      .post('/api/v1/employees/' + id + '/reset-password')
      .set(as())
      .set('Idempotency-Key', resetKey)
      .send({})
      .expect(409);

    expect(replayRes.body.message).toContain('Password sudah ditampilkan.');

    // A request with a new key succeeds
    const newKey = randomUUID();
    const newRes = await api()
      .post('/api/v1/employees/' + id + '/reset-password')
      .set(as())
      .set('Idempotency-Key', newKey)
      .send({})
      .expect(200);

    expect(newRes.body.temporaryPassword).toBeDefined();
  });

  it('3. rejects reset password if in-flight email change or lifecycle change is pending (mutual exclusion)', async () => {
    const { id, employee } = await provisionEmployee('03');

    // Create a pending email change on the employee
    const emailKey = randomUUID();
    await db.empEmailChange.create({
      data: {
        id: emailKey,
        employeeId: id,
        actorAccountId: actorId,
        expectedEmail: employee.email,
        email: prefix.toLowerCase() + '-03-new@example.invalid',
        payloadHash: 'test-hash-pending',
        status: 'PENDING',
      },
    });

    const resetRes = await api()
      .post('/api/v1/employees/' + id + '/reset-password')
      .set(as())
      .set('Idempotency-Key', randomUUID())
      .send({})
      .expect(409);

    expect(resetRes.body.message).toContain('Selesaikan atau pulihkan perubahan email');

    // Resolve email change
    await db.empEmailChange.update({ where: { id: emailKey }, data: { status: 'COMPLETED' } });

    // Create a pending lifecycle change
    const lifecycleKey = randomUUID();
    await db.empLifecycleChange.create({
      data: {
        id: lifecycleKey,
        employeeId: id,
        actorAccountId: actorId,
        expectedStatus: 'ACTIVE',
        targetStatus: 'INACTIVE',
        payloadHash: 'test-hash-lifecycle',
        status: 'PENDING',
      },
    });

    const resetRes2 = await api()
      .post('/api/v1/employees/' + id + '/reset-password')
      .set(as())
      .set('Idempotency-Key', randomUUID())
      .send({})
      .expect(409);

    expect(resetRes2.body.message).toContain('Perubahan status sebelumnya masih diproses');

    // Clean up
    await db.empLifecycleChange.delete({ where: { id: lifecycleKey } });
  });

  it('4. rejects reset password if employee is ARCHIVED', async () => {
    const { id } = await provisionEmployee('04');

    // Archive employee
    await db.empEmployee.update({ where: { id }, data: { status: 'ARCHIVED' } });

    const res = await api()
      .post('/api/v1/employees/' + id + '/reset-password')
      .set(as())
      .set('Idempotency-Key', randomUUID())
      .send({})
      .expect(409);

    expect(res.body.message).toContain('Karyawan arsip tidak dapat di-reset password.');
  });

  it('5. does not store or log temporary password secret in database history or audit logs', async () => {
    const { id } = await provisionEmployee('05');
    const resetKey = randomUUID();

    const resetRes = await api()
      .post('/api/v1/employees/' + id + '/reset-password')
      .set(as())
      .set('Idempotency-Key', resetKey)
      .send({})
      .expect(200);

    const secret = resetRes.body.temporaryPassword as string;

    // Check emp_employee_history
    const history = await db.empEmployeeHistory.findMany({
      where: { employeeId: id, action: 'EMPLOYEE_PASSWORD_RESET' },
    });
    expect(history).toHaveLength(1);
    expect(JSON.stringify(history[0])).not.toContain(secret);

    // Check emp_audit_logs
    const empAudit = await db.empAuditLog.findMany({
      where: { entityId: id, action: 'EMPLOYEE_PASSWORD_RESET' },
    });
    expect(empAudit).toHaveLength(1);
    expect(JSON.stringify(empAudit[0])).not.toContain(secret);

    // Check auth_audit_logs
    const targetAccount = await db.authAccount.findUniqueOrThrow({ where: { employeeId: id } });
    const authAudit = await db.authAuditLog.findMany({
      where: { targetAccountId: targetAccount.id, action: 'EMPLOYEE_PASSWORD_RESET' },
    });
    expect(authAudit).toHaveLength(1);
    expect(JSON.stringify(authAudit[0])).not.toContain(secret);

    // Check auth_password_resets
    const resetRecord = await db.authPasswordReset.findUniqueOrThrow({ where: { id: resetKey } });
    expect(JSON.stringify(resetRecord)).not.toContain(secret);
  });
});
