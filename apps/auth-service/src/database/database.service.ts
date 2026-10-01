import { Injectable, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { createDatabaseClient } from '@attendance/database';
import { AuthConfig } from '../config/auth.config';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly client;
  constructor(config: AuthConfig) {
    this.client = createDatabaseClient(config.databaseUrl, { caCertificate: config.caCertificate });
  }
  async onModuleInit() {
    try { await this.client.$connect(); } catch { throw new Error('Auth database connection is unavailable. Check runtime configuration.'); }
  }
  async onModuleDestroy() { await this.client.$disconnect(); }
}
