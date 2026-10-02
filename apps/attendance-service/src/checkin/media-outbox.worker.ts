import {
  Injectable,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AttendanceConfig } from '../config/attendance.config';
import { DatabaseService } from '../database/database.module';
import { AttendanceUpstreamClient } from './attendance-upstream.client';
@Injectable()
export class MediaOutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaOutboxWorker.name);
  private timer?: ReturnType<typeof setTimeout>;
  private running: Promise<void> | null = null;
  private stopped = false;
  constructor(
    private readonly db: DatabaseService,
    private readonly client: AttendanceUpstreamClient,
    private readonly config: AttendanceConfig,
  ) {}
  onModuleInit() {
    if (!this.config.workerEnabled) return;
    const tick = async () => {
      if (this.stopped) return;
      await this.drain();
      if (!this.stopped)
        this.timer = setTimeout(() => {
          void tick();
        }, 2000);
    };
    this.timer = setTimeout(() => {
      void tick();
    }, 1000);
  }
  async onModuleDestroy() {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.running;
  }
  drain(): Promise<void> {
    if (this.running) return this.running;
    this.running = this.runBatch()
      .catch(() => {
        this.logger.warn(
          'Media outbox temporarily unavailable; queued entries remain durable.',
        );
      })
      .finally(() => {
        this.running = null;
      });
    return this.running;
  }
  private async runBatch() {
    const now = new Date();
    const eligible = {
      OR: [
        { state: 'PENDING' as const, nextAttemptAt: { lte: now } },
        { state: 'PROCESSING' as const, leaseUntil: { lte: now } },
      ],
    };
    const rows = await this.db.client.attOutbox.findMany({
      where: eligible,
      orderBy: { nextAttemptAt: 'asc' },
      take: 10,
    });
    for (const row of rows) {
      if (this.stopped) break;
      const claimToken = randomUUID();
      const claimed = await this.db.client.attOutbox.updateMany({
        where: { id: row.id, ...eligible },
        data: {
          state: 'PROCESSING',
          claimToken,
          leaseUntil: new Date(Date.now() + 30000),
          attempts: { increment: 1 },
        },
      });
      if (!claimed.count) continue;
      try {
        await this.client.bind(
          row.photoObjectId,
          row.ownerEmployeeId,
          row.eventId,
          row.purpose,
          row.actorAccountId,
          row.requestId,
        );
        await this.db.client.attOutbox.updateMany({
          where: { id: row.id, state: 'PROCESSING', claimToken },
          data: {
            state: 'DELIVERED',
            deliveredAt: new Date(),
            claimToken: null,
            leaseUntil: null,
          },
        });
      } catch {
        await this.db.client.attOutbox
          .updateMany({
            where: { id: row.id, state: 'PROCESSING', claimToken },
            data: {
              state: 'PENDING',
              claimToken: null,
              leaseUntil: null,
              nextAttemptAt: new Date(
                Date.now() +
                  Math.min(60000, 1000 * 2 ** Math.min(row.attempts, 6)),
              ),
            },
          })
          .catch(() => undefined);
        this.logger.warn('Media binding queued for retry: ' + row.id);
      }
    }
  }
}
