import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GatewayConfig } from '../src/gateway.config';
import { configureApp } from '../src/configure-app';

describe('Auth Gateway HTTP contract', () => {
  let app: INestApplication;
  let upstream: Server;
  let received: {
    method?: string;
    url?: string;
    headers: Record<string, unknown>;
    body: string;
  };
  let mode: 'ok' | 'unauthorized' | 'redirect' | 'slow' = 'ok';
  beforeAll(async () => {
    upstream = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        received = {
          method: req.method,
          url: req.url,
          headers: req.headers,
          body,
        };
        if (mode === 'slow') return;
        if (mode === 'redirect') {
          res.writeHead(302, { Location: 'http://example.test' });
          res.end();
          return;
        }
        res.writeHead(mode === 'unauthorized' ? 401 : 200, {
          'Content-Type': 'application/json',
          'Set-Cookie': [
            'auth_refresh_admin=opaque; HttpOnly; Path=/api/v1/auth; SameSite=Lax',
            'other=value; HttpOnly',
          ],
          'Retry-After': '60',
          'X-Internal-Secret': 'must-not-escape',
        });
        res.end(
          JSON.stringify(
            mode === 'unauthorized'
              ? { message: 'Email atau password salah.' }
              : { ok: true },
          ),
        );
      });
    });
    await new Promise<void>((resolve) =>
      upstream.listen(0, '127.0.0.1', resolve),
    );
    const config = {
      authUrl: `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`,
      employeeUrl: `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`,
      origins: ['http://localhost:5174'],
      timeoutMs: 100,
      port: 3000,
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GatewayConfig)
      .useValue(config)
      .compile();
    app = module.createNestApplication({ bodyParser: false });
    configureApp(app);
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    upstream?.closeAllConnections();
    await new Promise<void>((resolve) => upstream?.close(() => resolve()));
  });
  beforeEach(() => {
    mode = 'ok';
  });
  describe.each(['departments', 'positions'])('%s routes', (resource) => {
    const id = '0b7c2f4e-3d1a-4c8b-9e6f-2a5d7c9e1b3f';
    it.each([
      ['get', `/api/v1/${resource}?search=fin&status=ACTIVE&page=2&pageSize=10`, 'GET'],
      ['post', `/api/v1/${resource}`, 'POST'],
      ['get', `/api/v1/${resource}/${id}`, 'GET'],
      ['patch', `/api/v1/${resource}/${id}`, 'PATCH'],
      ['post', `/api/v1/${resource}/${id}/activate`, 'POST'],
      ['post', `/api/v1/${resource}/${id}/deactivate`, 'POST'],
    ] as const)('forwards %s %s to Employee Service', async (verb, path, method) => {
      const call = request(app.getHttpServer())[verb](path)
        .set('Authorization', 'Bearer token')
        .set('Cookie', 'auth_refresh_admin=secret')
        .set('X-Forwarded-For', '203.0.113.9');
      await (method === 'GET' ? call : call.send({ name: 'Keuangan' })).expect(200);
      expect(received.method).toBe(method);
      expect(received.url).toBe(path);
      expect(received.headers.authorization).toBe('Bearer token');
      expect(received.headers.cookie).toBeUndefined();
      expect(received.headers['x-forwarded-for']).toBeUndefined();
      if (method !== 'GET') expect(JSON.parse(received.body)).toEqual({ name: 'Keuangan' });
    });
    it.each([
      `/api/v1/${resource}/not-a-uuid`,
      `/api/v1/${resource}?admin=true`,
      `/api/v1/${resource}?page=1&page=2`,
    ])('refuses %s without calling the upstream', async (path) => {
      received = { headers: {}, body: '' };
      await request(app.getHttpServer()).get(path).expect(400);
      expect(received.url).toBeUndefined();
    });
    it('reports an Employee outage with its own message', async () => {
      mode = 'slow';
      const result = await request(app.getHttpServer()).get(`/api/v1/${resource}`).expect(503);
      expect(result.body.message).toBe('Layanan data karyawan sementara tidak tersedia.');
    });
  });
  describe('Employee provisioning allowlist', () => {
    const id = '0b7c2f4e-3d1a-4c8b-9e6f-2a5d7c9e1b3f';
    it('forwards only authorization, request ID and creation idempotency key', async () => {
      await request(app.getHttpServer()).post('/api/v1/employees').set('Authorization', 'Bearer admin').set('Idempotency-Key', id).set('Cookie', 'secret=value').set('X-Service-Signature', 'forged').send({ name: 'Test Employee' }).expect(200);
      expect(received.headers['idempotency-key']).toBe(id); expect(received.headers.authorization).toBe('Bearer admin'); expect(received.headers.cookie).toBeUndefined(); expect(received.headers['x-service-signature']).toBeUndefined();
    });
    it.each([['get', '/api/v1/employees?search=test&page=1'], ['get', '/api/v1/employee-provisioning/' + id], ['post', '/api/v1/employee-provisioning/' + id + '/retry'], ['post', '/api/v1/employee-provisioning/' + id + '/credentials']] as const)('forwards approved %s %s', async (method, path) => {
      await request(app.getHttpServer())[method](path).send(method === 'post' ? {} : undefined).expect(200); expect(received.url).toBe(path);
    });
    it.each(['/api/v1/employee-provisioning/' + id + '/prepare', '/api/v1/employee-provisioning/' + id + '/finalize', '/api/v1/employee-provisioning/not-a-uuid/credentials'])('rejects internal or invalid action %s', async path => { received = { headers: {}, body: '' }; await request(app.getHttpServer()).post(path).send({}).expect(400); expect(received.url).toBeUndefined(); });
    it('rejects absent idempotency key, duplicate/unknown query and internal Auth path', async () => {
      await request(app.getHttpServer()).post('/api/v1/employees').send({}).expect(400);
      await request(app.getHttpServer()).get('/api/v1/employees?page=1&page=2').expect(400);
      await request(app.getHttpServer()).get('/api/v1/employees?secret=true').expect(400);
      await request(app.getHttpServer()).post('/api/v1/internal/provisioning/' + id + '/prepare').send({}).expect(404);
    });
  });
  it.each([
    'admin/login',
    'employee/login',
    'refresh',
    'change-password',
    'logout',
  ])('forwards POST %s to a fixed route', async (path) => {
    await request(app.getHttpServer())
      .post(`/api/v1/auth/${path}`)
      .send({ panel: 'admin' })
      .expect(200);
    expect(received.url).toBe(`/api/v1/auth/${path}`);
    expect(received.method).toBe('POST');
    expect(JSON.parse(received.body)).toEqual({ panel: 'admin' });
  });

  describe('T14 profile/email allowlist', () => {
    const id = '0b7c2f4e-3d1a-4c8b-9e6f-2a5d7c9e1b3f';
    it.each([['get', '/api/v1/employees/' + id, 'GET'], ['patch', '/api/v1/employees/' + id, 'PATCH'], ['get', '/api/v1/employee-email-changes/' + id, 'GET'], ['post', '/api/v1/employee-email-changes/' + id + '/retry', 'POST']] as const)('forwards approved %s %s', async (verb, path, method) => {
      await request(app.getHttpServer())[verb](path).set('Authorization', 'Bearer admin').send(verb === 'get' ? undefined : { name: 'Updated' }).expect(200);
      expect(received.url).toBe(path); expect(received.method).toBe(method);
    });
    it('forwards an email idempotency key and drops cookies/signatures and spoofed actor headers', async () => {
      const path = '/api/v1/employees/' + id + '/email';
      const body = { expectedEmail: 'old@example.test', email: 'new@example.test' };
      await request(app.getHttpServer()).post(path).set('Authorization', 'Bearer admin').set('Idempotency-Key', id).set('Cookie', 'secret=value').set('X-Service-Signature', 'forged').set('X-Actor-Id', 'forged').send(body).expect(200);
      expect(received.headers['idempotency-key']).toBe(id); expect(received.headers.cookie).toBeUndefined(); expect(received.headers['x-service-signature']).toBeUndefined(); expect(received.headers['x-actor-id']).toBeUndefined();
      expect(JSON.parse(received.body)).toEqual(body);
    });
    it('rejects missing key, non-list queries, invalid IDs, and internal Auth paths', async () => {
      await request(app.getHttpServer()).post('/api/v1/employees/' + id + '/email').send({}).expect(400);
      await request(app.getHttpServer()).get('/api/v1/employees/' + id + '?status=ACTIVE').expect(400);
      await request(app.getHttpServer()).get('/api/v1/employee-email-changes/' + id + '?secret=true').expect(400);
      await request(app.getHttpServer()).patch('/api/v1/employees/not-a-uuid').send({}).expect(400);
      await request(app.getHttpServer()).post('/api/v1/internal/employee-email-changes/' + id).send({}).expect(404);
    });
  });

  describe('T14 B lifecycle/history allowlist', () => {
    const id = '0b7c2f4e-3d1a-4c8b-9e6f-2a5d7c9e1b3f';
    it.each([
      ['get', `/api/v1/employees/${id}/history?page=2&pageSize=10`, 'GET'],
      ['get', `/api/v1/employee-lifecycle/${id}`, 'GET'],
      ['post', `/api/v1/employee-lifecycle/${id}/retry`, 'POST'],
    ] as const)('forwards approved %s %s', async (verb, path, method) => {
      await request(app.getHttpServer())[verb](path).set('Authorization', 'Bearer admin').send(verb === 'post' ? {} : undefined).expect(200);
      expect(received.url).toBe(path);
      expect(received.method).toBe(method);
    });
    it('forwards a lifecycle idempotency key and drops cookies/signatures and spoofed actor headers', async () => {
      const path = `/api/v1/employees/${id}/lifecycle`;
      const body = { expectedStatus: 'ACTIVE', targetStatus: 'INACTIVE' };
      await request(app.getHttpServer())
        .post(path)
        .set('Authorization', 'Bearer admin')
        .set('Idempotency-Key', id)
        .set('Cookie', 'secret=value')
        .set('X-Service-Signature', 'forged')
        .set('X-Actor-Id', 'forged')
        .send(body)
        .expect(200);
      expect(received.headers['idempotency-key']).toBe(id);
      expect(received.headers.cookie).toBeUndefined();
      expect(received.headers['x-service-signature']).toBeUndefined();
      expect(received.headers['x-actor-id']).toBeUndefined();
      expect(JSON.parse(received.body)).toEqual(body);
    });
    it('rejects missing key, invalid queries, invalid IDs, and internal Auth paths', async () => {
      await request(app.getHttpServer()).post(`/api/v1/employees/${id}/lifecycle`).send({}).expect(400);
      await request(app.getHttpServer()).get(`/api/v1/employees/${id}/history?secret=true`).expect(400);
      await request(app.getHttpServer()).get(`/api/v1/employee-lifecycle/${id}?secret=true`).expect(400);
      await request(app.getHttpServer()).post(`/api/v1/employees/not-a-uuid/lifecycle`).send({}).expect(400);
      await request(app.getHttpServer()).post(`/api/v1/internal/employee-lifecycle/${id}`).send({}).expect(404);
    });
  });
  it('preserves tokens/cookies and request ID, discards forged proxy/internal headers', async () => {
    const id = '61d286de-dfb1-4b19-9d7d-a4d477b3808e';
    const result = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer test-token')
      .set('Cookie', 'auth_refresh_admin=test-cookie')
      .set('Origin', 'http://localhost:5174')
      .set('X-Request-ID', id)
      .set('X-Forwarded-For', '203.0.113.55')
      .set('X-Internal-Secret', 'forged')
      .expect(200);
    expect(received.headers.authorization).toBe('Bearer test-token');
    expect(received.headers.cookie).toBe('auth_refresh_admin=test-cookie');
    expect(received.headers.origin).toBe('http://localhost:5174');
    expect(received.headers['x-request-id']).toBe(id);
    expect(received.headers['x-forwarded-for']).not.toContain('203.0.113.55');
    expect(received.headers['x-internal-secret']).toBeUndefined();
    expect(result.headers['set-cookie']).toHaveLength(2);
    expect(result.headers['x-internal-secret']).toBeUndefined();
    expect(result.headers['retry-after']).toBe('60');
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.headers['x-request-id']).toBe(id);
    expect(result.headers['access-control-allow-origin']).toBe(
      'http://localhost:5174',
    );
    expect(result.headers['access-control-allow-credentials']).toBe('true');
  });
  it('preserves upstream 401 validation response', async () => {
    mode = 'unauthorized';
    const result = await request(app.getHttpServer())
      .post('/api/v1/auth/admin/login')
      .send({})
      .expect(401);
    expect(result.body.message).toBe('Email atau password salah.');
  });
  it('does not allow unknown paths or methods', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/arbitrary')
      .send({})
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/auth/admin/login')
      .expect(404);
  });
  it('rejects an origin outside the allowlist', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Origin', 'https://evil.test')
      .send({})
      .expect(403);
  });
  it('handles preflight for the HR portal', async () => {
    await request(app.getHttpServer())
      .options('/api/v1/auth/admin/login')
      .set('Origin', 'http://localhost:5174')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);
  });
  it('rejects a large JSON body', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/admin/login')
      .send({ password: 'a'.repeat(17000) })
      .expect(413);
  });
  it('rejects malformed JSON with a safe message', async () => {
    const result = await request(app.getHttpServer())
      .post('/api/v1/auth/admin/login')
      .set('Content-Type', 'application/json')
      .send('{bad-secret')
      .expect(400);
    expect(JSON.stringify(result.body)).not.toContain('bad-secret');
  });
  it('does not follow redirects or expose connection details', async () => {
    mode = 'redirect';
    const result = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(503);
    expect(JSON.stringify(result.body)).not.toContain('example.test');
    expect(result.body.message).toBe(
      'Layanan autentikasi sementara tidak tersedia.',
    );
  });
  it('returns a sanitized timeout', async () => {
    mode = 'slow';
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(503);
  });
  it('separates process health from Auth readiness', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200);
    await request(app.getHttpServer()).get('/health').expect(200);
    expect(received.url).toBe('/health');
    mode = 'unauthorized';
    await request(app.getHttpServer()).get('/health').expect(503);
    await request(app.getHttpServer()).get('/health/live').expect(200);
  });
  it('returns 503 after the upstream closes', async () => {
    upstream.closeAllConnections();
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(503);
  });
});
