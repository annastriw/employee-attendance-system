import { PhotoOrphanWorker } from './photo-orphan.worker';
import type { PhotosService } from './photos.service';
import type { MediaConfig } from '../config/media.config';

describe('PhotoOrphanWorker', () => {
  let worker: PhotoOrphanWorker;
  let photos: { cleanupOrphans: jest.Mock };
  let config: { workerEnabled: boolean };

  beforeEach(() => {
    jest.useFakeTimers();
    photos = {
      cleanupOrphans: jest.fn().mockResolvedValue({ cleanedCount: 2, candidatesFound: 2 }),
    };
    config = { workerEnabled: true };
    worker = new PhotoOrphanWorker(
      photos as unknown as PhotosService,
      config as unknown as MediaConfig,
    );
  });

  afterEach(() => {
    worker.onModuleDestroy();
    jest.useRealTimers();
  });

  it('does not start timer when workerEnabled is false', () => {
    config.workerEnabled = false;
    worker.onModuleInit();
    jest.advanceTimersByTime(3600000 * 2);
    expect(photos.cleanupOrphans).not.toHaveBeenCalled();
  });

  it('starts periodic timer and calls tick when workerEnabled is true', async () => {
    worker.onModuleInit();
    expect(photos.cleanupOrphans).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(3600000);
    expect(photos.cleanupOrphans).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(3600000);
    expect(photos.cleanupOrphans).toHaveBeenCalledTimes(2);
  });

  it('cleans up interval on onModuleDestroy', () => {
    worker.onModuleInit();
    worker.onModuleDestroy();
    jest.advanceTimersByTime(3600000 * 5);
    expect(photos.cleanupOrphans).not.toHaveBeenCalled();
  });

  it('prevents overlapping runs during tick', async () => {
    let resolveCleanup: (val: { cleanedCount: number; candidatesFound: number }) => void;
    const pendingPromise = new Promise<{ cleanedCount: number; candidatesFound: number }>(
      (resolve) => {
        resolveCleanup = resolve;
      },
    );
    photos.cleanupOrphans.mockReturnValueOnce(pendingPromise);

    const run1 = worker.tick();
    const run2 = worker.tick();

    expect(await run2).toEqual({ cleanedCount: 0, candidatesFound: 0 });
    resolveCleanup!({ cleanedCount: 3, candidatesFound: 3 });
    expect(await run1).toEqual({ cleanedCount: 3, candidatesFound: 3 });
  });

  it('handles tick errors gracefully and returns zero counts without throwing', async () => {
    photos.cleanupOrphans.mockRejectedValueOnce(new Error('Database unavailable'));
    const result = await worker.tick();
    expect(result).toEqual({ cleanedCount: 0, candidatesFound: 0 });
  });
});
