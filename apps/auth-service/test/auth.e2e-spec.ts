import { AuthService } from '../src/auth/auth.service';
import { configureApp } from '../src/configure-app';
import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import { createDatabaseClient } from '@attendance/database';
import { hash } from 'bcrypt';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthConfig } from '../src/config/auth.config';

describe('Auth API with isolated MySQL', () => {
  let app: INestApplication;
  let migration: ReturnType<typeof createDatabaseClient>;
  let previousUrl: string | undefined;
  let accountIds: string[];
  let adminEmail: string;
  let employeeEmail: string;
  const password = 'Test-Password-123456';
  let passwordHash: string;

  beforeAll(async () => {
    new AuthConfig();
    previousUrl = process.env.AUTH_DATABASE_URL;
    const testUrl = process.env.AUTH_TEST_DATABASE_URL!;
    const migrationUrl = process.env.TEST_DATABASE_URL!;
    for (const value of [testUrl, migrationUrl]) {
      const url = new URL(value);
      if (url.hostname !== '127.0.0.1' || url.pathname !== '/attendance_test')
        throw new Error('Auth tests must use the local test database.');
    }
    process.env.AUTH_DATABASE_URL = testUrl;
    migration = createDatabaseClient(migrationUrl);
    passwordHash = await hash(password, 12);
  });
  beforeEach(async () => {
    accountIds = [randomUUID(), randomUUID()];
    adminEmail = randomUUID() + '@example.invalid';
    employeeEmail = randomUUID() + '@example.invalid';
    await migration.authAccount.createMany({
      data: [
        {
          id: accountIds[0],
          email: adminEmail,
          passwordHash,
          role: 'ADMIN_HRD',
          status: 'ACTIVE',
        },
        {
          id: accountIds[1],
          email: employeeEmail,
          passwordHash,
          role: 'EMPLOYEE',
          status: 'ACTIVE',
        },
      ],
    });
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);

    await app.init();
  });
  afterEach(async () => {
    await app?.close();
    await migration.authAuditLog.deleteMany({
      where: { targetAccountId: { in: accountIds } },
    });
    await migration.authSession.deleteMany({
      where: { accountId: { in: accountIds } },
    });
    await migration.authAccount.deleteMany({
      where: { id: { in: accountIds } },
    });
  });
  afterAll(async () => {
    await migration?.$disconnect();
    if (previousUrl) process.env.AUTH_DATABASE_URL = previousUrl;
    else delete process.env.AUTH_DATABASE_URL;
  });
  const login = (email: string, panel = 'admin', pw = password) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/' + panel + '/login')
      .send({ email, password: pw });

  it('issues safe JWT/session and allows restricted /me', async () => {
    const response = await login('  ' + adminEmail.toUpperCase() + '  ').expect(
      200,
    );
    expect(response.body.user.mustChangePassword).toBe(true);
    expect(response.body).not.toHaveProperty('refreshToken');
    expect(JSON.stringify(response.body)).not.toContain(passwordHash);
    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies[0]).toContain('HttpOnly');
    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth(response.body.accessToken, { type: 'bearer' })
      .expect(200);
    expect(me.body.email).toBe(adminEmail);
  });
  it('lets services verify /me per request while login stays rate-limited', async () => {
    const response = await login(adminEmail).expect(200);
    for (let i = 0; i < 15; i++)
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .auth(response.body.accessToken, { type: 'bearer' })
        .expect(200);
    let status = 200;
    for (let i = 0; i < 12 && status !== 429; i++)
      status = (await login(adminEmail, 'admin', 'Wrong-Password-123456')).status;
    expect(status).toBe(429);
  });
  it('rejects wrong passwords and wrong panels with the same response', async () => {
    const wrongPassword = await login(
      adminEmail,
      'admin',
      'Wrong-Password-123',
    ).expect(401);
    const wrongPanel = await login(adminEmail, 'employee').expect(401);
    expect(wrongPassword.body.message).toEqual(wrongPanel.body.message);
    await login(employeeEmail, 'admin').expect(401);
    await login(employeeEmail, 'employee').expect(200);
  });
  it('rejects nonactive and archived accounts', async () => {
    for (const status of ['INACTIVE', 'ARCHIVED'] as const) {
      await migration.authAccount.update({
        where: { id: accountIds[0] },
        data: { status },
      });
      await login(adminEmail).expect(401);
    }
  });
  it('validates input and rejects JWT tampering', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/admin/login')
      .send({ email: 'not-email', password })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/auth/admin/login')
      .send({ email: adminEmail, password, role: 'ADMIN_HRD' })
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth('invalid', { type: 'bearer' })
      .expect(401);
  });
  it('logout invalidates already issued access tokens', async () => {
    const response = await login(adminEmail).expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .auth(response.body.accessToken, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth(response.body.accessToken, { type: 'bearer' })
      .expect(401);
  });
  it('rate limits login attempts', async () => {
    for (let i = 0; i < 10; i++)
      await login(adminEmail, 'admin', 'wrong-password').expect(401);
    await login(adminEmail, 'admin', 'wrong-password').expect(429);
  });

  it('changes initial password, revokes all sessions and requires a new login', async () => {
    const first = await login(adminEmail).expect(200);
    const second = await login(adminEmail).expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .auth(first.body.accessToken, { type: 'bearer' })
      .send({ currentPassword: password, newPassword: 'New-Password-234567' })
      .expect(200);
    for (const token of [first.body.accessToken, second.body.accessToken]) {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .auth(token, { type: 'bearer' })
        .expect(401);
    }
    await login(adminEmail).expect(401);
    const fresh = await login(
      adminEmail,
      'admin',
      'New-Password-234567',
    ).expect(200);
    expect(fresh.body.user.mustChangePassword).toBe(false);
  });
  it('rejects wrong current password, password reuse and bcrypt byte truncation', async () => {
    const response = await login(adminEmail).expect(200);
    const change = (currentPassword: string, newPassword: string) =>
      request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .auth(response.body.accessToken, { type: 'bearer' })
        .send({ currentPassword, newPassword });
    await change('wrong-password', 'New-Password-123456').expect(401);
    await change(password, password).expect(400);
    await change(password, '😀'.repeat(30)).expect(400);
  });
  it('rotates refresh atomically and rejects origins outside the allowlist', async () => {
    const response = await login(adminEmail).expect(200);
    const cookie = (
      response.headers['set-cookie'] as unknown as string[]
    )[0].split(';')[0];
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie)
      .set('Origin', 'https://untrusted.example.test')
      .send({ panel: 'admin' })
      .expect(403);
    const refresh = () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookie)
        .set('Origin', 'http://localhost:5174')
        .send({ panel: 'admin' });
    const results = await Promise.all([refresh(), refresh()]);
    expect(
      results.map((result) => result.status).sort((a, b) => a - b),
    ).toEqual([200, 401]);
    await refresh().expect(401);
  });
  it('blocks business access until password change and rejects disabled or expired sessions', async () => {
    const response = await login(adminEmail).expect(200);
    await expect(
      app.get(AuthService).authenticate(response.body.accessToken, false),
    ).rejects.toThrow('Ganti password');
    await migration.authAccount.update({
      where: { id: accountIds[0] },
      data: { status: 'INACTIVE' },
    });
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth(response.body.accessToken, { type: 'bearer' })
      .expect(401);
    await migration.authAccount.update({
      where: { id: accountIds[0] },
      data: { status: 'ACTIVE' },
    });
    await migration.authSession.updateMany({
      where: { accountId: accountIds[0] },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth(response.body.accessToken, { type: 'bearer' })
      .expect(401);
  });
  it('limits each client behind the trusted local Gateway independently', async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/admin/login')
        .set('X-Forwarded-For', '192.0.2.10')
        .send({})
        .expect(400);
    }
    await request(app.getHttpServer())
      .post('/api/v1/auth/admin/login')
      .set('X-Forwarded-For', '192.0.2.10')
      .send({})
      .expect(429);
    await request(app.getHttpServer())
      .post('/api/v1/auth/admin/login')
      .set('X-Forwarded-For', '192.0.2.11')
      .send({})
      .expect(400);
  });
});
