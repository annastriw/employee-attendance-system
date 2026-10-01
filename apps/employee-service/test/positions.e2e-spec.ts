import { type INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createDatabaseClient } from '@attendance/database';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthClient, type SessionProfile } from '../src/auth/admin.guard';
import { EmployeeConfig } from '../src/config/employee.config';
import { configureApp } from '../src/configure-app';

// Tokens map to fixed profiles; Auth's own revocation is covered by Auth tests
// and by the AuthClient unit test (401 from /me is rejected here).
const ADMIN = randomUUID();
const profiles: Record<string, SessionProfile> = {
  'Bearer admin': { id: ADMIN, role: 'ADMIN_HRD', mustChangePassword: false },
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

describe('Positions API with isolated MySQL', () => {
  let app: INestApplication;
  let migration: ReturnType<typeof createDatabaseClient>;
  const prefix = 'T' + randomUUID().slice(0, 8).toUpperCase();
  const api = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: 'Bearer ' + token });

  beforeAll(async () => {
    new EmployeeConfig();
    const testUrl = process.env.EMPLOYEE_TEST_DATABASE_URL!;
    const migrationUrl = process.env.TEST_DATABASE_URL!;
    for (const value of [testUrl, migrationUrl]) {
      const url = new URL(value);
      if (url.hostname !== '127.0.0.1' || url.pathname !== '/attendance_test')
        throw new Error('Employee tests must use the local test database.');
    }
    process.env.EMPLOYEE_DATABASE_URL = testUrl;
    migration = createDatabaseClient(migrationUrl);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthClient).useValue(fakeAuth)
      .compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await migration.empAuditLog.deleteMany({ where: { actorAccountId: ADMIN } });
    await migration.empPosition.deleteMany({ where: { code: { startsWith: prefix } } });
    await migration.$disconnect();
  });

  it('rejects missing, unknown, non-admin and restricted sessions', async () => {
    await api().get('/api/v1/positions').expect(401);
    await api().get('/api/v1/positions').set(as('expired')).expect(401);
    await api().get('/api/v1/positions').set(as('employee')).expect(403);
    const restricted = await api().get('/api/v1/positions').set(as('restricted')).expect(403);
    expect(restricted.body.message).toContain('Ganti password');
  });

  it('creates, normalises and audits a position', async () => {
    const response = await api().post('/api/v1/positions').set(as('admin'))
      .send({ name: '  Analis   Pusat ', code: prefix.toLowerCase() + '-fin' }).expect(201);
    expect(response.body).toMatchObject({ name: 'Analis Pusat', code: prefix + '-FIN', status: 'ACTIVE' });
    const audit = await migration.empAuditLog.findMany({ where: { entityId: response.body.id } });
    expect(audit.map((row) => row.action)).toEqual(['POSITION_CREATED']);
    expect(audit[0]).toMatchObject({ actorAccountId: ADMIN, entityType: 'POSITION' });
  });

  it('rejects duplicate name or code case-insensitively with 409', async () => {
    await api().post('/api/v1/positions').set(as('admin'))
      .send({ name: prefix + ' Operasional', code: prefix + '-OPS' }).expect(201);
    const byCode = await api().post('/api/v1/positions').set(as('admin'))
      .send({ name: prefix + ' Lain', code: prefix.toLowerCase() + '-ops' }).expect(409);
    expect(byCode.body.message).toBe('Kode jabatan sudah digunakan.');
    const byName = await api().post('/api/v1/positions').set(as('admin'))
      .send({ name: (prefix + ' operasional').toUpperCase(), code: prefix + '-OPS2' }).expect(409);
    expect(byName.body.message).toBe('Nama jabatan sudah digunakan.');
  });

  it('validates input and rejects unknown fields', async () => {
    const response = await api().post('/api/v1/positions').set(as('admin'))
      .send({ name: 'A', code: 'bad code!', status: 'INACTIVE' }).expect(400);
    expect(JSON.stringify(response.body.message)).toContain('Nama minimal 2 karakter.');
    await api().get('/api/v1/positions/not-a-uuid').set(as('admin')).expect(400);
    await api().get('/api/v1/positions/' + randomUUID()).set(as('admin')).expect(404);
  });

  it('updates, deactivates and reactivates without deleting, auditing each change', async () => {
    const created = await api().post('/api/v1/positions').set(as('admin'))
      .send({ name: prefix + ' Gudang', code: prefix + '-WH' }).expect(201);
    const id = created.body.id as string;
    await api().patch('/api/v1/positions/' + id).set(as('admin')).send({ name: prefix + ' Gudang Utama' }).expect(200);
    const off = await api().post(`/api/v1/positions/${id}/deactivate`).set(as('admin')).expect(200);
    expect(off.body.status).toBe('INACTIVE');
    await api().post(`/api/v1/positions/${id}/deactivate`).set(as('admin')).expect(200);
    const on = await api().post(`/api/v1/positions/${id}/activate`).set(as('admin')).expect(200);
    expect(on.body).toMatchObject({ status: 'ACTIVE', name: prefix + ' Gudang Utama' });
    await api().delete('/api/v1/positions/' + id).set(as('admin')).expect(404);
    expect(await migration.empPosition.count({ where: { id } })).toBe(1);
    const actions = (await migration.empAuditLog.findMany({ where: { entityId: id }, orderBy: { createdAt: 'asc' } }))
      .map((row) => row.action);
    // The repeated deactivate is a no-op and is not audited twice.
    expect(actions).toEqual(['POSITION_CREATED', 'POSITION_UPDATED', 'POSITION_DEACTIVATED', 'POSITION_ACTIVATED']);
  });

  it('filters by search and status with pagination', async () => {
    const created = await api().post('/api/v1/positions').set(as('admin'))
      .send({ name: prefix + ' Riset', code: prefix + '-RND' }).expect(201);
    await api().post(`/api/v1/positions/${created.body.id}/deactivate`).set(as('admin')).expect(200);
    const inactive = await api().get('/api/v1/positions').query({ search: prefix, status: 'INACTIVE' }).set(as('admin')).expect(200);
    expect(inactive.body.items.map((item: { code: string }) => item.code)).toEqual([prefix + '-RND']);
    const page = await api().get('/api/v1/positions').query({ search: prefix, pageSize: 2, page: 1 }).set(as('admin')).expect(200);
    expect(page.body).toMatchObject({ page: 1, pageSize: 2 });
    expect(page.body.items).toHaveLength(2);
    expect(page.body.total).toBeGreaterThanOrEqual(4);
    await api().get('/api/v1/positions').query({ pageSize: 500 }).set(as('admin')).expect(400);
  });
});
