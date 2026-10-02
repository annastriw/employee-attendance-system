import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GatewayConfig } from '../src/gateway.config';
import { configureApp } from '../src/configure-app';

describe('Media Gateway multipart contract', () => {
  let app: INestApplication;
  let upstream: Server;
  let uploads = 0;
  let received: { headers: Record<string, unknown>; bytes: Buffer };
  let role = 'EMPLOYEE';
  let mustChangePassword = false;
  let authStatus = 200;
  let mediaMode: 'ok' | 'unauthorized' | 'redirect' | 'oversized' | 'html' =
    'ok';
  const employeeId = randomUUID();
  const path = '/api/v1/media/attendance-photos';
  const bytes = Buffer.from([255, 216, 255, 7, 8, 9]);
  const upload = (key: string = randomUUID()) =>
    request(app.getHttpServer())
      .post(path)
      .set('Authorization', 'Bearer test-session')
      .set('Idempotency-Key', key)
      .set('X-Media-Service-Key', 'must-not-forward')
      .set('Cookie', 'must-not-forward=1')
      .field('purpose', 'CHECK_IN')
      .attach('photo', bytes, {
        filename: 'untrusted-name.jpg',
        contentType: 'image/jpeg',
      });

  beforeAll(async () => {
    upstream = createServer((req, res) => {
      if (req.url === '/api/v1/auth/me') {
        res.writeHead(authStatus, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            id: randomUUID(),
            role,
            mustChangePassword,
            employeeId,
          }),
        );
        return;
      }
      uploads++;
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        received = { headers: req.headers, bytes: Buffer.concat(chunks) };
        if (mediaMode === 'redirect') {
          res.writeHead(302, { Location: 'http://example.invalid' }).end();
        } else if (mediaMode === 'html') {
          res.writeHead(200, { 'Content-Type': 'text/html' }).end('not JSON');
        } else {
          res.writeHead(mediaMode === 'unauthorized' ? 401 : 201, {
            'Content-Type': 'application/json',
          });
          res.end(
            mediaMode === 'oversized'
              ? JSON.stringify({ value: 'x'.repeat(270000) })
              : JSON.stringify(
                  mediaMode === 'unauthorized'
                    ? { message: 'Sesi tidak valid.' }
                    : { id: employeeId, status: 'READY' },
                ),
          );
        }
      });
    });
    await new Promise<void>((resolve) =>
      upstream.listen(0, '127.0.0.1', resolve),
    );
    const url = 'http://127.0.0.1:' + (upstream.address() as AddressInfo).port;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GatewayConfig)
      .useValue({
        authUrl: url,
        employeeUrl: url,
        attendanceUrl: url,
        mediaUrl: url,
        timeoutMs: 1000,
        origins: ['http://localhost:5173'],
        port: 3000,
      })
      .compile();
    app = module.createNestApplication({ bodyParser: false, logger: false });
    configureApp(app);
    await app.init();
  });
  beforeEach(() => {
    uploads = 0;
    role = 'EMPLOYEE';
    mustChangePassword = false;
    authStatus = 200;
    mediaMode = 'ok';
  });
  afterAll(async () => {
    await app?.close();
    upstream?.closeAllConnections();
    await new Promise<void>((resolve) => upstream?.close(() => resolve()));
  });

  it('forwards only intended binary/purpose/identity headers and a safe filename', async () => {
    const key = randomUUID();
    await upload(key).expect(201);
    expect(uploads).toBe(1);
    expect(received.headers['content-type']).toMatch(
      /^multipart\/form-data; boundary=/,
    );
    expect(received.bytes.includes(bytes)).toBe(true);
    expect(received.bytes.toString()).toContain('filename="photo.jpg"');
    expect(received.bytes.toString()).toContain('CHECK_IN');
    expect(received.headers['idempotency-key']).toBe(key);
    expect(received.headers.authorization).toBe('Bearer test-session');
    expect(received.headers['x-media-service-key']).toBeUndefined();
    expect(received.headers.cookie).toBeUndefined();
  });
  it('rejects query and invalid idempotency before forwarding uploads', async () => {
    await upload('invalid').expect(400);
    await request(app.getHttpServer())
      .post(path + '?x=1')
      .set('Idempotency-Key', randomUUID())
      .expect(400);
    expect(uploads).toBe(0);
  });
  it('requires a current employee session and completed password change', async () => {
    await request(app.getHttpServer())
      .post(path)
      .set('Idempotency-Key', randomUUID())
      .expect(401);
    authStatus = 401;
    await upload().expect(401);
    authStatus = 200;
    role = 'ADMIN_HRD';
    await upload().expect(403);
    role = 'EMPLOYEE';
    mustChangePassword = true;
    await upload().expect(403);
    expect(uploads).toBe(0);
  });
  it('fails closed on Auth outages and passes Media revocation response through', async () => {
    authStatus = 503;
    await upload().expect(503);
    expect(uploads).toBe(0);
    authStatus = 200;
    mediaMode = 'unauthorized';
    await upload().expect(401);
  });
  it.each(['redirect', 'html', 'oversized'] as const)(
    'rejects unsafe upstream %s responses',
    async (mode) => {
      mediaMode = mode;
      const result = await upload().expect(503);
      expect(result.body.message).toBe(
        'Layanan foto sementara tidak tersedia.',
      );
    },
  );
});
