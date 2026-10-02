import { MediaOutboxWorker } from './media-outbox.worker';
import type { DatabaseService } from '../database/database.module';
import type { AttendanceUpstreamClient } from './attendance-upstream.client';
import type { AttendanceConfig } from '../config/attendance.config';

describe('MediaOutboxWorker', () => {
  let worker: MediaOutboxWorker;
  let db: {
    client: {
      attOutbox: {
        findMany: jest.Mock;
        updateMany: jest.Mock;
      };
    };
  };
  let client: {
    bind: jest.Mock;
  };
  let config: {
    workerEnabled: boolean;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    db = {
      client: {
        attOutbox: {
          findMany: jest.fn().mockResolvedValue([]),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      },
    };
    client = {
      bind: jest.fn().mockResolvedValue({ id: 'photo-1', status: 'BOUND' }),
    };
    config = {
      workerEnabled: true,
    };
    worker = new MediaOutboxWorker(
      db as unknown as DatabaseService,
      client as unknown as AttendanceUpstreamClient,
      config as unknown as AttendanceConfig,
    );
  });

  afterEach(async () => {
    await worker.onModuleDestroy();
    jest.useRealTimers();
  });

  it('does not start timer when workerEnabled is false', () => {
    config.workerEnabled = false;
    worker.onModuleInit();
    jest.advanceTimersByTime(5000);
    expect(db.client.attOutbox.findMany).not.toHaveBeenCalled();
  });

  it('starts periodic drain when workerEnabled is true and cleans up on destroy', async () => {
    worker.onModuleInit();
    expect(db.client.attOutbox.findMany).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1000);
    expect(db.client.attOutbox.findMany).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(2000);
    expect(db.client.attOutbox.findMany).toHaveBeenCalledTimes(2);

    await worker.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(10000);
    expect(db.client.attOutbox.findMany).toHaveBeenCalledTimes(2);
  });

  it('successfully claims and delivers eligible outbox rows', async () => {
    const row = {
      id: 'outbox-1',
      photoObjectId: 'photo-1',
      ownerEmployeeId: 'emp-1',
      eventId: 'event-1',
      purpose: 'CHECK_IN' as const,
      actorAccountId: 'acc-1',
      requestId: 'req-1',
      attempts: 0,
      state: 'PENDING' as const,
    };
    db.client.attOutbox.findMany.mockResolvedValueOnce([row]);
    db.client.attOutbox.updateMany
      .mockResolvedValueOnce({ count: 1 }) // claimed
      .mockResolvedValueOnce({ count: 1 }); // delivered

    await worker.drain();

    expect(db.client.attOutbox.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ id: 'outbox-1' }),
        data: expect.objectContaining({
          state: 'PROCESSING',
          attempts: { increment: 1 },
        }),
      }),
    );

    expect(client.bind).toHaveBeenCalledWith(
      'photo-1',
      'emp-1',
      'event-1',
      'CHECK_IN',
      'acc-1',
      'req-1',
    );

    expect(db.client.attOutbox.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ id: 'outbox-1', state: 'PROCESSING' }),
        data: expect.objectContaining({
          state: 'DELIVERED',
          claimToken: null,
          leaseUntil: null,
        }),
      }),
    );
  });

  it('fault injection: applies exponential backoff and returns to PENDING when Media service fails', async () => {
    const row = {
      id: 'outbox-fail',
      photoObjectId: 'photo-fail',
      ownerEmployeeId: 'emp-1',
      eventId: 'event-1',
      purpose: 'CHECK_OUT' as const,
      actorAccountId: 'acc-1',
      requestId: 'req-fail',
      attempts: 2,
      state: 'PENDING' as const,
    };
    db.client.attOutbox.findMany.mockResolvedValueOnce([row]);
    db.client.attOutbox.updateMany
      .mockResolvedValueOnce({ count: 1 }) // claimed
      .mockResolvedValueOnce({ count: 1 }); // reset to pending

    client.bind.mockRejectedValueOnce(new Error('Media Service 503 Unavailable'));

    const before = Date.now();
    await worker.drain();

    expect(client.bind).toHaveBeenCalledTimes(1);

    expect(db.client.attOutbox.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ id: 'outbox-fail', state: 'PROCESSING' }),
        data: expect.objectContaining({
          state: 'PENDING',
          claimToken: null,
          leaseUntil: null,
        }),
      }),
    );

    const callArgs = db.client.attOutbox.updateMany.mock.calls[1][0];
    const nextAttemptAt = callArgs.data.nextAttemptAt as Date;
    // For attempts = 2, delay is 1000 * 2^2 = 4000 ms
    expect(nextAttemptAt.getTime()).toBeGreaterThanOrEqual(before + 3900);
    expect(nextAttemptAt.getTime()).toBeLessThanOrEqual(before + 4200);
  });

  it('skips rows that were already claimed by another concurrent worker', async () => {
    const row = {
      id: 'outbox-competing',
      photoObjectId: 'photo-c',
      ownerEmployeeId: 'emp-1',
      eventId: 'event-1',
      purpose: 'CHECK_IN' as const,
      actorAccountId: 'acc-1',
      requestId: 'req-c',
      attempts: 0,
      state: 'PENDING' as const,
    };
    db.client.attOutbox.findMany.mockResolvedValueOnce([row]);
    // updateMany count 0 means CAS failed (another worker won)
    db.client.attOutbox.updateMany.mockResolvedValueOnce({ count: 0 });

    await worker.drain();

    expect(client.bind).not.toHaveBeenCalled();
  });
});
