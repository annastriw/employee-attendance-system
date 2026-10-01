import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import type { DatabaseService } from '../database/database.service';

describe('Auth health readiness', () => {
  const query = jest.fn();
  const controller = new HealthController({ client: { $queryRaw: query } } as unknown as DatabaseService);
  afterEach(() => query.mockReset());
  it('reports readiness after a database query', async () => {
    query.mockResolvedValue([{ ready: 1 }]);
    await expect(controller.ready()).resolves.toEqual({ status: 'ok', service: 'auth-service', database: 'up' });
  });
  it('returns a sanitized 503 when the database is unavailable', async () => {
    query.mockRejectedValue(new Error('private connection details'));
    await expect(controller.ready()).rejects.toThrow(ServiceUnavailableException);
    try { await controller.ready(); } catch (error) {
      expect((error as Error).message).not.toContain('private');
    }
  });
});
