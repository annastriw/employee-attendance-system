import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import { Prisma, createDatabaseClient } from '@attendance/database';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import { Client } from 'minio';
import sharp from 'sharp';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { MediaConfig } from '../src/config/media.config';
import { DatabaseService } from '../src/database/database.service';
import { PhotoStorage } from '../src/storage/photo-storage.service';
import { sha256 } from '../src/photos/photo-normalizer';
import { AppModule as AuthAppModule } from '../../auth-service/dist/app.module';
import { AuthConfig } from '../../auth-service/dist/config/auth.config';
import { AuthService } from '../../auth-service/dist/auth/auth.service';
import { configureApp as configureAuth } from '../../auth-service/dist/configure-app';
import { AppModule as GatewayAppModule } from '../../api-gateway/dist/app.module';
import { GatewayConfig } from '../../api-gateway/dist/gateway.config';
import { configureApp as configureGateway } from '../../api-gateway/dist/configure-app';

const { hash } = createRequire(
  resolve(__dirname, '../../auth-service/package.json'),
)('bcrypt') as {
  hash: (password: string, cost: number) => Promise<string>;
};

describe('T19 real Gateway–Media–Auth–MySQL–AIStor', () => {
  let app: INestApplication;
  let authApp: INestApplication;
  let gateway: INestApplication;
  let db: ReturnType<typeof createDatabaseClient>;
  let storage: PhotoStorage;
  let config: MediaConfig;
  let rootStorage: Client;
  let jpeg: Buffer;
  const accountIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const employeeIds = [randomUUID(), randomUUID(), randomUUID()];
  const tokens: string[] = [];
  const prefix = randomUUID();
  const uploadPath = '/api/v1/media/attendance-photos';
  const password = 'Media-Integration-Test-123';
  let readyId: string;
  let readyKey: string;

  const upload = (
    key: string = randomUUID(),
    token = tokens[0],
    purpose = 'CHECK_IN',
    bytes = jpeg,
    target = gateway,
  ) =>
    request(target.getHttpServer())
      .post(uploadPath)
      .set('Authorization', 'Bearer ' + token)
      .set('Idempotency-Key', key)
      .field('purpose', purpose)
      .attach('photo', bytes, {
        filename: 'untrusted.jpg',
        contentType: 'image/jpeg',
      });
  const internal = (
    id: string,
    operation: string,
    ownerEmployeeId = employeeIds[0],
    purpose = 'CHECK_IN',
    token = tokens[0],
  ) =>
    request(app.getHttpServer())
      .post('/api/v1/internal/media/attendance-photos/' + id + '/' + operation)
      .set('X-Media-Service-Key', config.internalSecret)
      .set('Authorization', 'Bearer ' + token)
      .send({ ownerEmployeeId, purpose });

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    config = new MediaConfig();
    const authConfig = new AuthConfig();
    const migrationUrl = new URL(process.env.TEST_DATABASE_URL!);
    if (
      migrationUrl.hostname !== '127.0.0.1' ||
      migrationUrl.pathname !== '/attendance_test'
    )
      throw new Error('Isolated test database required.');
    db = createDatabaseClient(migrationUrl.toString());
    const passwordHash = await hash(password, 12);
    await db.authAccount.createMany({
      data: accountIds.map((id, index) => ({
        id,
        email: prefix + '-' + index + '@example.invalid',
        passwordHash,
        employeeId: index < 3 ? employeeIds[index] : null,
        role: index < 3 ? 'EMPLOYEE' : 'ADMIN_HRD',
        status: 'ACTIVE',
        mustChangePassword: index === 2,
      })),
    });
    const authModule = await Test.createTestingModule({
      imports: [AuthAppModule],
    })
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
    for (let i = 0; i < accountIds.length; i++) {
      tokens[i] = (
        await authApp
          .get(AuthService)
          .login(
            prefix + '-' + i + '@example.invalid',
            password,
            i === 3 ? 'ADMIN_HRD' : 'EMPLOYEE',
          )
      ).body.accessToken;
    }
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MediaConfig)
      .useValue(Object.assign({}, config, { authUrl: await authApp.getUrl() }))
      .compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    storage = app.get(PhotoStorage);
    const gatewayConfig = new GatewayConfig();
    const gatewayModule = await Test.createTestingModule({
      imports: [GatewayAppModule],
    })
      .overrideProvider(GatewayConfig)
      .useValue(
        Object.assign({}, gatewayConfig, {
          authUrl: await authApp.getUrl(),
          mediaUrl: await app.getUrl(),
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
    const rootEnv = parse(
      readFileSync(resolve(__dirname, '../../../.env.aistor')),
    );
    rootStorage = new Client({
      endPoint: '127.0.0.1',
      port: 9000,
      useSSL: false,
      region: 'us-east-1',
      accessKey: rootEnv.AISTOR_ROOT_USER,
      secretKey: rootEnv.AISTOR_ROOT_PASSWORD,
    });
  }, 30000);

  afterAll(async () => {
    jest.restoreAllMocks();
    await gateway?.close();
    await app?.close();
    await authApp?.close();
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
      where: { entityId: { in: rows.map((row) => row.id) } },
    });
    await db.mediaObject.deleteMany({
      where: { ownerEmployeeId: { in: employeeIds } },
    });
    await db.authAuditLog.deleteMany({
      where: { targetAccountId: { in: accountIds } },
    });
    await db.authSession.deleteMany({
      where: { accountId: { in: accountIds } },
    });
    await db.authAccount.deleteMany({ where: { id: { in: accountIds } } });
    await db.$disconnect();
  }, 30000);

  it('reports readiness against MySQL and the restricted storage bucket', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({
        status: 'ok',
        service: 'media-service',
        database: 'up',
        storage: 'up',
      });
  });

  it('uploads through the real Gateway and verifies normalized bytes before READY', async () => {
    const result = await upload().expect(201);
    readyId = result.body.id;
    expect(result.body.status).toBe('READY');
    expect(result.body.purpose).toBe('CHECK_IN');
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.body).not.toHaveProperty('objectKey');
    expect(result.body).not.toHaveProperty('url');
    const row = await db.mediaObject.findUniqueOrThrow({
      where: { id: readyId },
    });
    readyKey = row.objectKey;
    expect(row.ownerEmployeeId).toBe(employeeIds[0]);
    expect(
      await storage.matches(row.objectKey, result.body.checksumSha256),
    ).toBe(true);
    const stream = await storage.client.getObject(row.bucket, row.objectKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream)
      chunks.push(Buffer.from(chunk as Uint8Array));
    expect(sha256(Buffer.concat(chunks))).toBe(result.body.checksumSha256);
  });

  it('keeps anonymous access private and gives owner/HR temporary URLs', async () => {
    const anonymous = await fetch(
      config.publicEndpoint.origin + '/' + config.bucket + '/' + readyKey,
    );
    expect(anonymous.status).toBe(403);
    for (const token of [tokens[0], tokens[3]]) {
      const result = await internal(
        readyId,
        'photo-url',
        employeeIds[0],
        'CHECK_IN',
        token,
      ).expect(201);
      expect(result.body.expiresInSeconds).toBe(60);
      expect(new URL(result.body.url).searchParams.get('X-Amz-Expires')).toBe(
        '60',
      );
      expect((await fetch(result.body.url)).status).toBe(200);
    }
    await internal(
      readyId,
      'photo-url',
      employeeIds[0],
      'CHECK_IN',
      tokens[1],
    ).expect(403);
    const expired = await storage.client.presignedGetObject(
      config.bucket,
      readyKey,
      60,
      {},
      new Date(Date.now() - 120_000),
    );
    expect((await fetch(expired)).status).toBe(403);
  });

  it('requires internal secret and matching owner/purpose; internal routes stay outside Gateway', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/internal/media/attendance-photos/' + readyId + '/inspect')
      .send({ ownerEmployeeId: employeeIds[0], purpose: 'CHECK_IN' })
      .expect(401);
    await internal(readyId, 'inspect', employeeIds[1]).expect(404);
    await internal(readyId, 'inspect', employeeIds[0], 'CHECK_OUT').expect(404);
    await internal(readyId, 'inspect').expect(201);
    await request(gateway.getHttpServer())
      .post('/api/v1/internal/media/attendance-photos/' + readyId + '/inspect')
      .set('X-Media-Service-Key', config.internalSecret)
      .send({})
      .expect(404);
    await request(gateway.getHttpServer())
      .get(uploadPath + '/' + readyId + '/photo-url')
      .expect(404);
  });

  it('rejects missing sessions, HR uploads and mandatory password changes before file processing', async () => {
    for (const target of [app, gateway]) {
      await request(target.getHttpServer())
        .post(uploadPath)
        .set('Idempotency-Key', randomUUID())
        .expect(401);
      await upload(randomUUID(), tokens[3], 'CHECK_IN', jpeg, target).expect(
        403,
      );
      await upload(randomUUID(), tokens[2], 'CHECK_IN', jpeg, target).expect(
        403,
      );
    }
  });

  it('rejects invalid JPEG, purpose, oversize, extra fields/files and query parameters', async () => {
    await upload(
      randomUUID(),
      tokens[0],
      'CHECK_IN',
      Buffer.from([255, 216, 255, 0]),
    ).expect(400);
    await upload(randomUUID(), tokens[0], 'OTHER').expect(400);
    await upload(
      randomUUID(),
      tokens[0],
      'CHECK_IN',
      Buffer.alloc(2 * 1024 * 1024 + 1),
    ).expect(413);
    await upload().field('ownerEmployeeId', employeeIds[1]).expect(400);
    await upload()
      .attach('photo', jpeg, {
        filename: 'second.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);
    await request(gateway.getHttpServer())
      .post(uploadPath + '?owner=x')
      .set('Authorization', 'Bearer ' + tokens[0])
      .set('Idempotency-Key', randomUUID())
      .expect(400);
    await upload('invalid').expect(400);
    await request(app.getHttpServer())
      .post(uploadPath)
      .set('Authorization', 'Bearer ' + tokens[0])
      .set('Idempotency-Key', randomUUID())
      .field('purpose', 'CHECK_IN')
      .attach('photo', jpeg, { filename: 'fake.png', contentType: 'image/png' })
      .expect(400);
  });

  it('replays the same ID and rejects conflicting intent without duplicate audit', async () => {
    const key = randomUUID();
    const first = await upload(key).expect(201);
    const replay = await upload(key).expect(201);
    expect(replay.body).toEqual(first.body);
    await upload(key, tokens[0], 'CHECK_OUT').expect(409);
    const changed = await sharp(jpeg).negate().jpeg().toBuffer();
    await upload(key, tokens[0], 'CHECK_IN', changed).expect(409);
    expect(
      await db.mediaAuditLog.count({
        where: { entityId: first.body.id, action: 'UPLOAD_READY' },
      }),
    ).toBe(1);
  });

  it('isolates the same idempotency key between employees', async () => {
    const key = randomUUID();
    const first = await upload(key).expect(201);
    const second = await upload(key, tokens[1]).expect(201);
    expect(second.body.id).not.toBe(first.body.id);
  });

  it('serializes concurrent identical submissions into one object', async () => {
    const key = randomUUID();
    const results = await Promise.all([upload(key), upload(key)]);
    expect(results.some((result) => result.status === 201)).toBe(true);
    expect(results.every((result) => [201, 409].includes(result.status))).toBe(
      true,
    );
    expect(
      await db.mediaObject.count({
        where: { ownerEmployeeId: employeeIds[0], idempotencyKey: key },
      }),
    ).toBe(1);
  });

  it('marks failed PUT as FAILED and retries the same record', async () => {
    const key = randomUUID();
    const fault = jest
      .spyOn(storage, 'put')
      .mockRejectedValueOnce(new Error('simulated outage'));
    await upload(key).expect(503);
    fault.mockRestore();
    const failed = await db.mediaObject.findUniqueOrThrow({
      where: {
        ownerEmployeeId_idempotencyKey: {
          ownerEmployeeId: employeeIds[0],
          idempotencyKey: key,
        },
      },
    });
    expect(failed.status).toBe('FAILED');
    await internal(failed.id, 'inspect').expect(404);
    expect((await upload(key).expect(201)).body.id).toBe(failed.id);
  });

  it('recovers an ambiguous PUT that stored the object before its response was lost', async () => {
    const key = randomUUID();
    const realPut = storage.put.bind(storage);
    const fault = jest
      .spyOn(storage, 'put')
      .mockImplementationOnce(async (objectKey, bytes) => {
        await realPut(objectKey, bytes);
        throw new Error('response lost');
      });
    await upload(key).expect(503);
    fault.mockRestore();
    const retry = jest.spyOn(storage, 'put');
    await upload(key).expect(201);
    expect(retry).not.toHaveBeenCalled();
    retry.mockRestore();
  });

  it('recovers an expired PENDING lease with an existing object without another PUT', async () => {
    const key = randomUUID();
    const initial = await upload(key).expect(201);
    await db.mediaObject.update({
      where: { id: initial.body.id },
      data: {
        status: 'PENDING',
        readyAt: null,
        claimToken: randomUUID(),
        leaseUntil: new Date(Date.now() - 1000),
      },
    });
    const retry = jest.spyOn(storage, 'put');
    expect((await upload(key).expect(201)).body.id).toBe(initial.body.id);
    expect(retry).not.toHaveBeenCalled();
    retry.mockRestore();
  });

  it('rejects a live lease and mismatched stored checksum without overwriting the object', async () => {
    const key = randomUUID();
    const initial = await upload(key).expect(201);
    const row = await db.mediaObject.update({
      where: { id: initial.body.id },
      data: {
        status: 'PENDING',
        readyAt: null,
        claimToken: randomUUID(),
        leaseUntil: new Date(Date.now() + 30000),
      },
    });
    await upload(key).expect(409);
    await db.mediaObject.update({
      where: { id: row.id },
      data: { leaseUntil: new Date(Date.now() - 1000) },
    });
    await rootStorage.putObject(
      config.bucket,
      row.objectKey,
      Buffer.from('corrupted test fixture'),
    );
    const retry = jest.spyOn(storage, 'put');
    await upload(key).expect(503);
    expect(retry).not.toHaveBeenCalled();
    retry.mockRestore();
  });

  it('restricts runtime DB tables, append-only audit and storage bucket/admin/delete permissions', async () => {
    const runtime = app.get(DatabaseService).client;
    await expect(runtime.authAccount.count()).rejects.toBeDefined();
    await expect(runtime.empEmployee.count()).rejects.toBeDefined();
    await expect(
      runtime.mediaObject.deleteMany({ where: { id: randomUUID() } }),
    ).rejects.toBeDefined();
    await expect(
      runtime.mediaAuditLog.deleteMany({ where: { id: randomUUID() } }),
    ).rejects.toBeDefined();
    // AIStor filters ListBuckets to buckets allowed by this user's ListBucket policy.
    expect(
      (await storage.client.listBuckets()).map((bucket) => bucket.name),
    ).toEqual([config.bucket]);
    await expect(
      storage.client.putObject(
        'attendance-photos',
        'attendance/test-' + randomUUID(),
        jpeg,
      ),
    ).rejects.toMatchObject({ code: 'AccessDenied' });
    await expect(
      storage.client.removeObject(config.bucket, readyKey),
    ).rejects.toMatchObject({ code: 'AccessDenied' });
    const audit = JSON.stringify(
      await db.mediaAuditLog.findMany({
        where: { actorAccountId: { in: accountIds } },
      }),
    );
    expect(audit).not.toContain('X-Amz');
    expect(audit).not.toContain(config.internalSecret);
    for (const token of tokens) expect(audit).not.toContain(token);
  });

  it('rolls back READY and its audit together when finalization fails, then recovers stored bytes', async () => {
    const key = randomUUID();
    const runtime = app.get(DatabaseService).client;
    const original = runtime.$transaction.bind(runtime);
    let calls = 0;
    const fault = jest
      .spyOn(runtime, '$transaction')
      .mockImplementation((async (
        callback: (tx: Prisma.TransactionClient) => Promise<unknown>,
      ) => {
        calls++;
        if (calls === 2)
          return original(async (tx) => {
            await callback(tx);
            throw new Error('simulated transaction rollback before commit');
          });
        return original(callback);
      }) as typeof runtime.$transaction);
    try {
      await upload(key).expect(503);
    } finally {
      fault.mockRestore();
    }
    const row = await db.mediaObject.findUniqueOrThrow({
      where: {
        ownerEmployeeId_idempotencyKey: {
          ownerEmployeeId: employeeIds[0],
          idempotencyKey: key,
        },
      },
    });
    expect(row.status).toBe('FAILED');
    expect(
      await db.mediaAuditLog.count({
        where: { entityId: row.id, action: 'UPLOAD_READY' },
      }),
    ).toBe(0);
    expect(await storage.matches(row.objectKey, row.checksumSha256)).toBe(true);
    const retry = jest.spyOn(storage, 'put');
    try {
      expect((await upload(key).expect(201)).body.id).toBe(row.id);
      expect(retry).not.toHaveBeenCalled();
    } finally {
      retry.mockRestore();
    }
  });

  it('prevents a stale worker from finalizing or failing the next lease owner', async () => {
    const key = randomUUID();
    const nextClaim = randomUUID();
    const originalPut = storage.put.bind(storage);
    const fault = jest
      .spyOn(storage, 'put')
      .mockImplementationOnce(async (objectKey, bytes) => {
        await originalPut(objectKey, bytes);
        await db.mediaObject.updateMany({
          where: { ownerEmployeeId: employeeIds[0], idempotencyKey: key },
          data: {
            claimToken: nextClaim,
            leaseUntil: new Date(Date.now() + 30000),
          },
        });
      });
    try {
      await upload(key).expect(409);
    } finally {
      fault.mockRestore();
    }
    const row = await db.mediaObject.findUniqueOrThrow({
      where: {
        ownerEmployeeId_idempotencyKey: {
          ownerEmployeeId: employeeIds[0],
          idempotencyKey: key,
        },
      },
    });
    expect(row.status).toBe('PENDING');
    expect(row.claimToken).toBe(nextClaim);
    expect(
      await db.mediaAuditLog.count({
        where: { entityId: row.id, action: 'UPLOAD_FAILED' },
      }),
    ).toBe(0);
    await db.mediaObject.update({
      where: { id: row.id },
      data: { leaseUntil: new Date(Date.now() - 1000) },
    });
    expect((await upload(key).expect(201)).body.id).toBe(row.id);
  });

  it('denies a revoked real Auth session on upload and URL issuance immediately', async () => {
    await db.authSession.updateMany({
      where: { accountId: accountIds[0], revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await upload().expect(401);
    await upload(randomUUID(), tokens[0], 'CHECK_IN', jpeg, app).expect(401);
    await internal(readyId, 'photo-url').expect(401);
  });
});
