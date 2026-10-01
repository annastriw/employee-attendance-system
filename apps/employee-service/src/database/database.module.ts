import { Global, Injectable, Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { createDatabaseClient } from '@attendance/database';
import { EmployeeConfig } from '../config/employee.config';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly client;
  constructor(config: EmployeeConfig) {
    this.client = createDatabaseClient(config.databaseUrl, { caCertificate: config.caCertificate });
  }
  async onModuleInit() {
    try { await this.client.$connect(); } catch { throw new Error('Employee database connection is unavailable. Check runtime configuration.'); }
  }
  async onModuleDestroy() { await this.client.$disconnect(); }
}

@Global()
@Module({ providers: [EmployeeConfig, DatabaseService], exports: [EmployeeConfig, DatabaseService] })
export class DatabaseModule {}
