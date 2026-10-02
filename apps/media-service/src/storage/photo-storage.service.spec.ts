import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { PhotoStorage } from './photo-storage.service';
import { MediaConfig } from '../config/media.config';

describe('Storage deadlines', () => {
  let server: Server;
  let storage: PhotoStorage;
  let partial = false;
  beforeAll(async () => {
    server = createServer((_request, response) => {
      if (partial) {
        response.writeHead(200, { 'Content-Type': 'image/jpeg' });
        response.write('partial body');
      }
      // Keep the response unfinished to exercise header and body deadlines.
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const endpoint = new URL(
      'http://127.0.0.1:' + (server.address() as AddressInfo).port,
    );
    storage = new PhotoStorage({
      databaseUrl: '',
      authUrl: endpoint.origin,
      endpoint,
      publicEndpoint: endpoint,
      bucket: 'attendance-photos-test',
      accessKey: 'test-user',
      secretKey: 'x'.repeat(64),
      internalSecret: 'a'.repeat(64),
      port: 3004,
      timeoutMs: 150,
    } satisfies MediaConfig);
  });
  afterAll(async () => {
    storage.onModuleDestroy();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  it('aborts a request when storage never sends headers', async () => {
    partial = false;
    const start = Date.now();
    await expect(
      storage.matches('attendance/test.jpg', '0'.repeat(64)),
    ).rejects.toThrow('deadline');
    expect(Date.now() - start).toBeLessThan(2000);
  });
  it('also aborts an unfinished response body', async () => {
    partial = true;
    const start = Date.now();
    await expect(
      storage.matches('attendance/test.jpg', '0'.repeat(64)),
    ).rejects.toBeDefined();
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
