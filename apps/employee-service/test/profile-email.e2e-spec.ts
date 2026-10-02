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
import { internalSignature } from '../../auth-service/dist/provisioning/provisioning-security';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const { hash } = createRequire(resolve(__dirname, '../../auth-service/package.json'))('bcrypt') as { hash: (password: string, cost: number) => Promise<string> };

describe('T14 A real profile/email + Auth + MySQL', () => {
  let app: INestApplication, authApp: INestApplication, db: ReturnType<typeof createDatabaseClient>, client: ProvisioningAuthClient;
  let token: string, departmentId: string, positionId: string;
  const actorId = randomUUID(), otherActorId = randomUUID(), employeeActorId = randomUUID();
  const prefix = 'EDIT' + randomUUID().slice(0,8).toUpperCase(); const password = 'Integration-Admin-Test-123';
  const api = () => request(app.getHttpServer()); const as = () => ({ Authorization: 'Bearer ' + token });
  const input = (suffix: string) => ({ nik: prefix + '-' + suffix, name: prefix + ' Employee ' + suffix, email: prefix.toLowerCase() + '-' + suffix.toLowerCase() + '@example.invalid', departmentId, positionId, startDate: '2026-10-02', status: 'ACTIVE' });
  const create = async (suffix: string) => { const id = randomUUID(); const result = await api().post('/api/v1/employees').set(as()).set('Idempotency-Key', id).send(input(suffix)); return { id, result }; };
  beforeAll(async () => {
    const authConfig = new AuthConfig(); const employeeConfig = new EmployeeConfig();
    for (const url of [process.env.TEST_DATABASE_URL!, process.env.AUTH_TEST_DATABASE_URL!, process.env.EMPLOYEE_TEST_DATABASE_URL!]) if (new URL(url).pathname !== '/attendance_test' || new URL(url).hostname !== '127.0.0.1') throw new Error('Use isolated local test DB only.');
    db = createDatabaseClient(process.env.TEST_DATABASE_URL!);
    const passwordHash = await hash(password, 12);
    await db.authAccount.createMany({ data: [actorId, otherActorId, employeeActorId].map((id,index) => ({ id, email: prefix.toLowerCase() + '-actor' + index + '@example.invalid', passwordHash, role: index === 2 ? 'EMPLOYEE' : 'ADMIN_HRD', status: 'ACTIVE', mustChangePassword: false })) });
    departmentId = (await db.empDepartment.create({ data: { name: prefix + ' Department', code: prefix + '-D' } })).id;
    positionId = (await db.empPosition.create({ data: { name: prefix + ' Position', code: prefix + '-P' } })).id;
    const authModule = await Test.createTestingModule({ imports: [AuthAppModule] }).overrideProvider(AuthConfig).useValue(Object.assign({}, authConfig, { databaseUrl: process.env.AUTH_TEST_DATABASE_URL })).compile();
    authApp = authModule.createNestApplication({ logger: false }); configureAuth(authApp); await authApp.listen(0,'127.0.0.1');
    token = (await authApp.get(AuthService).login(prefix.toLowerCase() + '-actor0@example.invalid', password, 'ADMIN_HRD')).body.accessToken;
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(EmployeeConfig).useValue(Object.assign({}, employeeConfig, { databaseUrl: process.env.EMPLOYEE_TEST_DATABASE_URL, authUrl: await authApp.getUrl(), workerEnabled: false })).compile();
    app = module.createNestApplication({ logger: false }); configureApp(app); await app.init(); client = app.get(ProvisioningAuthClient);
  });
  afterAll(async () => {
    await app?.close(); await authApp?.close();
    if (!db) return;
    const ops = await db.empProvisioning.findMany({ where: { actorAccountId: actorId } }); const employeeIds = ops.map(row => row.employeeId);
    const accounts = await db.authAccount.findMany({ where: { OR: [{ id: { in: [actorId, otherActorId, employeeActorId] } }, { employeeId: { in: employeeIds } }] } }); const ids = accounts.map(row => row.id);
    await db.authEmailChange.deleteMany({ where: { accountId: { in: ids } } });
    await db.authProvisioning.deleteMany({ where: { accountId: { in: ids } } });
    await db.authSession.deleteMany({ where: { accountId: { in: ids } } });
    await db.authAuditLog.deleteMany({ where: { OR: [{ actorAccountId: { in: ids } }, { targetAccountId: { in: ids } }] } });
    await db.authAccount.deleteMany({ where: { id: { in: ids } } });
    await db.empEmployeeHistory.deleteMany({ where: { employeeId: { in: employeeIds } } });
    await db.empEmailChange.deleteMany({ where: { employeeId: { in: employeeIds } } });
    await db.empAuditLog.deleteMany({ where: { actorAccountId: actorId } }); await db.empProvisioning.deleteMany({ where: { actorAccountId: actorId } }); await db.empEmployee.deleteMany({ where: { id: { in: employeeIds } } });
    await db.empDepartment.delete({ where: { id: departmentId } }); await db.empPosition.delete({ where: { id: positionId } }); await db.$disconnect();
  });

  const detail = async (employeeId: string) => (await api().get('/api/v1/employees/' + employeeId).set(as()).expect(200)).body;
  const profile = (value: Record<string, unknown>) => ({ nik: value.nik, name: value.name, phone: value.phone ?? '', departmentId: value.departmentId, positionId: value.positionId, startDate: value.startDate, expectedUpdatedAt: value.updatedAt });
  const change = (employeeId: string, email: string, expectedEmail: string, key = randomUUID()) => api().post('/api/v1/employees/' + employeeId + '/email').set(as()).set('Idempotency-Key', key).send({ email, expectedEmail });

  it('guards profile mutations, rejects stale writes, preserves inactive old masters, and appends history atomically', async () => {
    const { result } = await create('PROFILE'); const employeeId = result.body.employeeId as string;
    const before = await detail(employeeId);
    await api().patch('/api/v1/employees/' + employeeId).send({ ...profile(before), name: 'Unauthorized' }).expect(401);
    const employeeToken = (await authApp.get(AuthService).login(prefix.toLowerCase() + '-actor2@example.invalid', password, 'EMPLOYEE')).body.accessToken;
    await api().patch('/api/v1/employees/' + employeeId).set('Authorization', 'Bearer ' + employeeToken).send(profile(before)).expect(403);
    await db.authAccount.update({ where: { id: actorId }, data: { mustChangePassword: true } });
    await api().patch('/api/v1/employees/' + employeeId).set(as()).send(profile(before)).expect(403);
    await db.authAccount.update({ where: { id: actorId }, data: { mustChangePassword: false } });
    await api().patch('/api/v1/employees/' + employeeId).set(as()).send({ ...profile(before), email: 'spoof@example.invalid' }).expect(400);
    await api().patch('/api/v1/employees/' + employeeId).set(as()).send({ ...profile(before), status: 'ARCHIVED' }).expect(400);
    await db.empDepartment.update({ where: { id: departmentId }, data: { status: 'INACTIVE' } });
    const updated = await api().patch('/api/v1/employees/' + employeeId).set(as()).send({ ...profile(before), name: '  Updated   Employee  ', phone: '+62 81234567' }).expect(200);
    expect(updated.body.name).toBe('Updated Employee'); expect(updated.body.department.status).toBe('INACTIVE');
    await api().patch('/api/v1/employees/' + employeeId).set(as()).send({ ...profile(before), name: 'Stale' }).expect(409);
    const history = await db.empEmployeeHistory.findMany({ where: { employeeId } });
    expect(history).toHaveLength(1); expect(history[0].before).toMatchObject({ name: before.name }); expect(history[0].after).toMatchObject({ name: 'Updated Employee', phone: '+62 81234567' });
    await api().patch('/api/v1/employees/' + employeeId).set(as()).send(profile(updated.body)).expect(200);
    expect(await db.empEmployeeHistory.count({ where: { employeeId } })).toBe(1);
    const cleared = await api().patch('/api/v1/employees/' + employeeId).set(as()).send({ ...profile(updated.body), phone: '' }).expect(200);
    expect(cleared.body.phone).toBeNull();
    await db.empDepartment.update({ where: { id: departmentId }, data: { status: 'ACTIVE' } });
  });

  it('keeps NIK reserved for archived records and rejects inactive new assignments and archived edits', async () => {
    const source = await create('UNIQUE'), reserved = await create('RESERVED');
    const employeeId = source.result.body.employeeId as string, archivedId = reserved.result.body.employeeId as string;
    await db.empEmployee.update({ where: { id: archivedId }, data: { status: 'ARCHIVED' } });
    const current = await detail(employeeId);
    await api().patch('/api/v1/employees/' + employeeId).set(as()).send({ ...profile(current), nik: input('RESERVED').nik.toLowerCase() }).expect(409);
    expect((await detail(employeeId)).nik).toBe(current.nik);
    expect(await db.empEmployeeHistory.count({ where: { employeeId } })).toBe(0);
    expect(await db.empAuditLog.count({ where: { entityId: employeeId, action: 'EMPLOYEE_PROFILE_UPDATED' } })).toBe(0);
    const archived = await detail(archivedId);
    await api().patch('/api/v1/employees/' + archivedId).set(as()).send(profile(archived)).expect(409);
    await api().patch('/api/v1/employees/' + employeeId).set(as()).send({ ...profile(current), startDate: '2026-02-30' }).expect(400);
    const inactive = await db.empPosition.create({ data: { name: prefix + ' Inactive', code: prefix + '-I', status: 'INACTIVE' } });
    try { await api().patch('/api/v1/employees/' + employeeId).set(as()).send({ ...profile(current), positionId: inactive.id }).expect(400); }
    finally { await db.empPosition.delete({ where: { id: inactive.id } }); }
  });

  it('changes email once, revokes all sessions, retains T12 idempotency and keeps receipt views safe', async () => {
    const { id, result } = await create('EMAIL'); const employeeId = result.body.employeeId as string;
    const oldEmail = input('EMAIL').email, email = prefix.toLowerCase() + '-new@example.invalid';
    const secret = (await api().post('/api/v1/employee-provisioning/' + id + '/credentials').set(as()).send({}).expect(200)).body.temporaryPassword as string;
    const firstLogin = await authApp.get(AuthService).login(oldEmail, secret, 'EMPLOYEE');
    const secondLogin = await authApp.get(AuthService).login(oldEmail, secret, 'EMPLOYEE');
    const key = randomUUID();
    const results = await Promise.all([change(employeeId, email.toUpperCase(), oldEmail, key), change(employeeId, email, oldEmail, key)]);
    expect(results.every(value => value.status === 200)).toBe(true);
    await app.get(EmployeeEmailChangesService).retry(key, { accountId: actorId });
    const operation = await api().get('/api/v1/employee-email-changes/' + key).set(as()).expect(200);
    expect(operation.body.status).toBe('COMPLETED'); expect(operation.body.email).toBe(email);
    expect((await detail(employeeId)).email).toBe(email);
    const list = await api().get('/api/v1/employees?search=' + input('EMAIL').nik).set(as()).expect(200); expect(list.body.items[0].email).toBe(email);
    await expect(authApp.get(AuthService).authenticate(firstLogin.body.accessToken, true)).rejects.toThrow();
    await expect(authApp.get(AuthService).authenticate(secondLogin.body.accessToken, true)).rejects.toThrow();
    await expect(authApp.get(AuthService).login(oldEmail, secret, 'EMPLOYEE')).rejects.toThrow();
    const fresh = await authApp.get(AuthService).login(email, secret, 'EMPLOYEE');
    await change(employeeId, email, oldEmail, key).expect(200);
    await expect(authApp.get(AuthService).authenticate(fresh.body.accessToken, true)).resolves.toBeDefined();
    await api().post('/api/v1/employees').set(as()).set('Idempotency-Key', id).send(input('EMAIL')).expect(201);
    expect((await detail(employeeId)).email).toBe(email);
    expect(await db.authEmailChange.count({ where: { id: key } })).toBe(1);
    expect(await db.authAuditLog.count({ where: { targetAccountId: fresh.body.user.id, action: 'EMPLOYEE_EMAIL_CHANGED' } })).toBe(1);
    expect(JSON.stringify(operation.body)).not.toMatch(/payloadHash|lease|password|accessToken/);
    expect((await db.empProvisioning.findUniqueOrThrow({ where: { id } })).email).toBe(oldEmail);
  });

  it('reports archived-email conflicts without changing profile and blocks overlapping/altered operations', async () => {
    const target = await create('CONFLICT'), reserved = await create('EMAILRESERVE');
    const employeeId = target.result.body.employeeId as string;
    await db.authAccount.update({ where: { employeeId: reserved.result.body.employeeId }, data: { status: 'ARCHIVED' } });
    const before = await detail(employeeId);
    const conflict = await change(employeeId, input('EMAILRESERVE').email.toUpperCase(), before.email).expect(200);
    expect(conflict.body.status).toBe('FAILED'); expect(conflict.body.errorCode).toBe('EMAIL_CONFLICT');
    expect((await detail(employeeId)).email).toBe(before.email); expect((await detail(employeeId)).name).toBe(before.name);
    await change(employeeId, prefix.toLowerCase() + '-stale@example.invalid', 'stale@example.invalid').expect(409);
    const key = randomUUID(), email = prefix.toLowerCase() + '-pending@example.invalid';
    const fault = jest.spyOn(client, 'call').mockRejectedValueOnce(new ServiceUnavailableException());
    const pending = await change(employeeId, email, before.email, key).expect(200); fault.mockRestore(); expect(pending.body.status).toBe('PENDING');
    await change(employeeId, prefix.toLowerCase() + '-overlap@example.invalid', before.email).expect(409);
    await change(employeeId, prefix.toLowerCase() + '-altered@example.invalid', before.email, key).expect(409);
    await api().post('/api/v1/employee-email-changes/' + key + '/retry').set(as()).send({}).expect(200);
    const other = (await authApp.get(AuthService).login(prefix.toLowerCase() + '-actor1@example.invalid', password, 'ADMIN_HRD')).body.accessToken;
    await api().get('/api/v1/employee-email-changes/' + key).set('Authorization', 'Bearer ' + other).expect(404);
  });

  it('recovers a committed Auth response loss after restart without revoking a later login again', async () => {
    const { id, result } = await create('RECOVER'); const employeeId = result.body.employeeId as string;
    const oldEmail = input('RECOVER').email, email = prefix.toLowerCase() + '-recovered@example.invalid', key = randomUUID();
    const secret = (await api().post('/api/v1/employee-provisioning/' + id + '/credentials').set(as()).send({}).expect(200)).body.temporaryPassword as string;
    const original = client.call.bind(client);
    const fault = jest.spyOn(client, 'call').mockImplementationOnce(async (...args: Parameters<typeof client.call>) => { await original(...args); throw new ServiceUnavailableException(); });
    const pending = await change(employeeId, email, oldEmail, key).expect(200); fault.mockRestore();
    expect(pending.body.status).toBe('PENDING'); expect((await detail(employeeId)).email).toBe(oldEmail);
    const fresh = await authApp.get(AuthService).login(email, secret, 'EMPLOYEE');
    await db.empEmailChange.update({ where: { id: key }, data: { nextAttemptAt: new Date(0), leaseUntil: new Date(0), leaseToken: randomUUID() } });
    const restarted = new EmployeeEmailChangesService(app.get(DatabaseService), client, { workerEnabled: false } as EmployeeConfig);
    await restarted.runOne(key);
    expect((await detail(employeeId)).email).toBe(email);
    expect((await db.empEmailChange.findUniqueOrThrow({ where: { id: key } })).status).toBe('COMPLETED');
    await expect(authApp.get(AuthService).authenticate(fresh.body.accessToken, true)).resolves.toBeDefined();
    expect(await db.authAuditLog.count({ where: { targetAccountId: fresh.body.user.id, action: 'EMPLOYEE_EMAIL_CHANGED' } })).toBe(1);
  });

  it('requires service signatures and keeps new tables restricted to their owning services', async () => {
    const source = await create('SIGNATURE'); const employeeId = source.result.body.employeeId as string;
    const id = randomUUID(), path = '/api/v1/internal/employee-email-changes/' + id;
    const body = { employeeId, actorAccountId: actorId, email: prefix.toLowerCase() + '-signed@example.invalid', expectedEmail: input('SIGNATURE').email };
    await request(authApp.getHttpServer()).post(path).send(body).expect(401);
    const timestamp = String(Date.now());
    await request(authApp.getHttpServer()).post(path).set('X-Service-Timestamp', timestamp).set('X-Service-Signature', internalSignature(process.env.PROVISIONING_SERVICE_SECRET!, timestamp, path, body)).send({ ...body, email: 'tampered@example.invalid' }).expect(401);
    const employeeRuntime = createDatabaseClient(process.env.EMPLOYEE_TEST_DATABASE_URL!), authRuntime = createDatabaseClient(process.env.AUTH_TEST_DATABASE_URL!);
    try {
      await expect(employeeRuntime.authEmailChange.count()).rejects.toThrow();
      await expect(authRuntime.empEmailChange.count()).rejects.toThrow();
      await expect(employeeRuntime.empEmployeeHistory.updateMany({ where: { employeeId }, data: { action: 'FORGED' } })).rejects.toThrow();
    } finally { await employeeRuntime.$disconnect(); await authRuntime.$disconnect(); }
  });
});