import {
  Injectable,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { createDatabaseClient } from '@attendance/database';
import { MediaConfig } from '../config/media.config';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly client;
  constructor(config: MediaConfig) {
    this.client = createDatabaseClient(config.databaseUrl, {
      caCertificate: config.caCertificate,
      poolSize: 3,
    });
  }
  async onModuleInit() {
    try {
      await this.client.$connect();
    } catch {
      throw new Error(
        'Media database is unavailable. Check runtime configuration.',
      );
    }
  }
  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
