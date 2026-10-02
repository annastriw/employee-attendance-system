import {
  Injectable,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { MediaConfig } from '../config/media.config';
import { PhotosService } from './photos.service';

@Injectable()
export class PhotoOrphanWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PhotoOrphanWorker.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    private readonly photos: PhotosService,
    private readonly config: MediaConfig,
  ) {}

  onModuleInit() {
    if (!this.config.workerEnabled) return;
    // Run periodically every 1 hour (3600000 ms) in runtime
    this.timer = setInterval(() => {
      void this.tick();
    }, 60 * 60 * 1000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async tick(options?: {
    gracePeriodMs?: number;
    limit?: number;
  }): Promise<{ cleanedCount: number; candidatesFound: number }> {
    if (this.running) return { cleanedCount: 0, candidatesFound: 0 };
    this.running = true;
    try {
      const result = await this.photos.cleanupOrphans(options);
      if (result.cleanedCount > 0) {
        this.logger.log(`Cleaned ${result.cleanedCount} orphan media objects.`);
      }
      return result;
    } catch {
      this.logger.warn('Media orphan cleanup tick temporarily failed.');
      return { cleanedCount: 0, candidatesFound: 0 };
    } finally {
      this.running = false;
    }
  }
}
